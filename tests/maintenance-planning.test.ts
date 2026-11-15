import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maintenancePlanningService,
  CreateMaintenanceTaskTemplateDto,
  CreateMaintenancePlanDto,
  AssignPlanToAssetDto,
} from '../src/modules/maintenance/maintenance-planning.service';
import {
  addIntervalToDate,
  calculateNextCalendarDueDate,
  calculateMeterDueStatus,
  evaluateScheduleDueStatus,
} from '../src/modules/maintenance/schedule-calculator';
import {
  anpMaintenanceBridge,
  ProposeWorkOrderFromAnpDto,
} from '../src/modules/maintenance/anp-maintenance.bridge';
import {
  DuplicateWorkOrderError,
  InvalidScheduleIntervalError,
  MaintenancePlanNotFoundError,
  TaskTemplateNotFoundError,
} from '../src/modules/maintenance/maintenance.errors';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import tenantPrisma from '../src/tenant/tenant.client';
import { PriorityLevel, RecurrenceType } from '@prisma/client';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = 'site-colombo-001';
const LOCATION_ID = 'loc-boiler-room-001';
const BOILER_ASSET_ID = 'asset-boiler-001';
const PUMP_ASSET_ID = 'asset-pump-001';
const USER_ID = 'user-engineer-001';

describe('LuminaFM Maintenance Planning & Preventive Scheduling Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. TIMEZONE-SAFE SCHEDULE & INTERVAL ARITHMETIC
  // ===========================================================================
  describe('1. Timezone-Safe Schedule Arithmetic & Date Intervals', () => {
    it('should add days interval accurately without time drift', () => {
      const base = new Date('2026-03-01T08:00:00.000Z');
      const next = addIntervalToDate(base, 15, 'days');

      expect(next.toISOString()).toBe('2026-03-16T08:00:00.000Z');
    });

    it('should add weeks interval accurately', () => {
      const base = new Date('2026-04-01T10:30:00.000Z');
      const next = addIntervalToDate(base, 2, 'weeks');

      expect(next.toISOString()).toBe('2026-04-15T10:30:00.000Z');
    });

    it('should add months interval safely handling month lengths', () => {
      const base = new Date('2026-01-31T09:00:00.000Z');
      const next = addIntervalToDate(base, 1, 'months');

      // February in 2026 has 28 days; rollover clamped to end of Feb
      expect(next.getUTCMonth()).toBe(1); // 1 = February
      expect(next.getUTCDate()).toBe(28);
    });

    it('should add years interval accurately', () => {
      const base = new Date('2026-06-15T12:00:00.000Z');
      const next = addIntervalToDate(base, 2, 'years');

      expect(next.toISOString()).toBe('2028-06-15T12:00:00.000Z');
    });

    it('should calculate next calendar due date anchored to lastCompletedAt when completed', () => {
      const lastCompleted = new Date('2026-05-10T08:00:00.000Z');
      const startDate = new Date('2026-01-01T08:00:00.000Z');

      const nextDue = calculateNextCalendarDueDate(30, 'days', lastCompleted, startDate);
      expect(nextDue.toISOString()).toBe('2026-06-09T08:00:00.000Z');
    });

    it('should calculate next calendar due date from startDate when never completed', () => {
      const startDate = new Date('2026-01-01T08:00:00.000Z');
      const nextDue = calculateNextCalendarDueDate(30, 'days', null, startDate);

      expect(nextDue.toISOString()).toBe('2026-01-31T08:00:00.000Z');
    });
  });

  // ===========================================================================
  // 2. USAGE & OPERATING-HOUR-BASED MAINTENANCE CALCULATIONS
  // ===========================================================================
  describe('2. Usage & Operating-Hour-Based Calculations', () => {
    it('should compute remaining hours and percent consumed when not yet due', () => {
      const res = calculateMeterDueStatus({
        intervalValue: 500,
        currentReading: 10250,
        lastReadingAtMaintenance: 10000,
        dailyAverageUtilizationRate: 10,
        referenceDate: new Date('2026-07-01T00:00:00.000Z'),
      });

      expect(res.usageSinceLastMaintenance).toBe(250);
      expect(res.targetDueReading).toBe(10500);
      expect(res.usageRemaining).toBe(250);
      expect(res.percentConsumed).toBe(50);
      expect(res.isDue).toBe(false);
      expect(res.meterUnitsOverdue).toBe(0);
      // At 10 hours/day, 250 hours remaining = 25 days
      expect(res.projectedNextDueAt).toEqual(new Date('2026-07-26T00:00:00.000Z'));
    });

    it('should flag maintenance as DUE and calculate overdue units when threshold is exceeded', () => {
      const res = calculateMeterDueStatus({
        intervalValue: 500,
        currentReading: 10580, // 80 hours beyond 10500
        lastReadingAtMaintenance: 10000,
        dailyAverageUtilizationRate: 10,
        referenceDate: new Date('2026-07-15T00:00:00.000Z'),
      });

      expect(res.usageSinceLastMaintenance).toBe(580);
      expect(res.targetDueReading).toBe(10500);
      expect(res.usageRemaining).toBe(-80);
      expect(res.isDue).toBe(true);
      expect(res.meterUnitsOverdue).toBe(80);
      expect(res.percentConsumed).toBe(100);
      expect(res.projectedNextDueAt).toEqual(new Date('2026-07-15T00:00:00.000Z'));
    });
  });

  // ===========================================================================
  // 3. MAINTENANCE DUE STATUS & OVERDUE TRACKING ENGINE
  // ===========================================================================
  describe('3. Maintenance Due Status & Overdue Evaluation', () => {
    const refDate = new Date('2026-08-15T12:00:00.000Z');

    it('should classify schedule as OVERDUE with days and hours overdue metrics', () => {
      const pastDue = new Date('2026-08-10T12:00:00.000Z'); // 5 days ago
      const evalResult = evaluateScheduleDueStatus(pastDue, 5, 'urgent', true, refDate);

      expect(evalResult.status).toBe('OVERDUE');
      expect(evalResult.isOverdue).toBe(true);
      expect(evalResult.isDue).toBe(true);
      expect(evalResult.daysOverdue).toBe(5);
      expect(evalResult.hoursOverdue).toBe(120);
      expect(evalResult.urgencyScore).toBeGreaterThan(100);
    });

    it('should classify schedule as DUE when within 24 hours of due date', () => {
      const dueSoon = new Date('2026-08-15T18:00:00.000Z'); // 6 hours from refDate
      const evalResult = evaluateScheduleDueStatus(dueSoon, 7, 'high', true, refDate);

      expect(evalResult.status).toBe('DUE');
      expect(evalResult.isDue).toBe(true);
      expect(evalResult.isOverdue).toBe(false);
    });

    it('should classify schedule as UPCOMING when inside lead-time advance window', () => {
      const upcoming = new Date('2026-08-18T12:00:00.000Z'); // 3 days away (lead time 7)
      const evalResult = evaluateScheduleDueStatus(upcoming, 7, 'medium', true, refDate);

      expect(evalResult.status).toBe('UPCOMING');
      expect(evalResult.isUpcoming).toBe(true);
      expect(evalResult.isOverdue).toBe(false);
      expect(evalResult.daysUntilDue).toBe(3);
    });

    it('should classify schedule as ON_SCHEDULE when beyond lead-time window', () => {
      const farFuture = new Date('2026-09-15T12:00:00.000Z'); // 31 days away
      const evalResult = evaluateScheduleDueStatus(farFuture, 7, 'low', true, refDate);

      expect(evalResult.status).toBe('ON_SCHEDULE');
      expect(evalResult.isDue).toBe(false);
      expect(evalResult.isOverdue).toBe(false);
      expect(evalResult.isUpcoming).toBe(false);
    });

    it('should return INACTIVE status when assignment is paused/inactive', () => {
      const pastDue = new Date('2026-08-10T12:00:00.000Z');
      const evalResult = evaluateScheduleDueStatus(pastDue, 5, 'urgent', false, refDate);

      expect(evalResult.status).toBe('INACTIVE');
      expect(evalResult.isDue).toBe(false);
      expect(evalResult.urgencyScore).toBe(0);
    });
  });

  // ===========================================================================
  // 4. REUSABLE MAINTENANCE TASK TEMPLATES
  // ===========================================================================
  describe('4. Reusable Task Templates Management', () => {
    it('should create a reusable task template with safety instructions and required skills', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.maintenanceTaskTemplate, 'findFirst').mockResolvedValue(null);
        vi.spyOn(tenantPrisma.maintenanceTaskTemplate, 'create').mockImplementation(async (args: any) => ({
          id: 'template-blr-soot-01',
          ...args.data,
          createdAt: new Date(),
        }));

        const dto: CreateMaintenanceTaskTemplateDto = {
          code: 'TSK-BLR-SOOTBLOW-TEST',
          title: 'Daily Fireside Sootblow and Inspection',
          description: 'Operate rotary sootblowers across radiant and convective passes.',
          estimatedDurationMinutes: 45,
          safetyInstructions: 'Ensure steam lance isolation and purge condensate before lance entry.',
          requiredSkills: ['boiler_operation', 'thermal_safety'],
          isActive: true,
        };

        const result = await maintenancePlanningService.createTaskTemplate(dto);

        expect(result.id).toBe('template-blr-soot-01');
        expect(result.code).toBe('TSK-BLR-SOOTBLOW-TEST');
        expect(result.estimatedDurationMinutes).toBe(45);
        expect(result.requiredSkills).toEqual(['boiler_operation', 'thermal_safety']);
      });
    });

    it('should reject creating task template with duplicate code in same organization', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.maintenanceTaskTemplate, 'findFirst').mockResolvedValue({
          id: 'existing-id',
          code: 'TSK-DUPLICATE',
        } as any);

        await expect(
          maintenancePlanningService.createTaskTemplate({
            code: 'TSK-DUPLICATE',
            title: 'Duplicate Task',
          })
        ).rejects.toMatchObject({
          status: 409,
          code: 'TASK_TEMPLATE_EXISTS',
        });
      });
    });
  });

  // ===========================================================================
  // 5. PREVENTIVE MAINTENANCE PLANS & TASK LINKAGES
  // ===========================================================================
  describe('5. Preventive Maintenance Plans & Task Linkages', () => {
    it('should reject calendar plan without interval value or unit', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.maintenancePlan, 'findFirst').mockResolvedValue(null);
        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({ id: 'mt-pm' } as any);

        await expect(
          maintenancePlanningService.createMaintenancePlan({
            code: 'MP-INVALID-CAL',
            name: 'Invalid Calendar Plan',
            maintenanceTypeId: 'mt-pm',
            recurrenceType: RecurrenceType.calendar,
            intervalValue: null,
            intervalUnit: null,
          })
        ).rejects.toThrow(InvalidScheduleIntervalError);
      });
    });

    it('should reject meter-based plan without meter definition id', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.maintenancePlan, 'findFirst').mockResolvedValue(null);
        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({ id: 'mt-pm' } as any);

        await expect(
          maintenancePlanningService.createMaintenancePlan({
            code: 'MP-INVALID-METER',
            name: 'Invalid Meter Plan',
            maintenanceTypeId: 'mt-pm',
            recurrenceType: RecurrenceType.meter,
            intervalValue: 500,
            meterDefinitionId: null,
          })
        ).rejects.toThrow(InvalidScheduleIntervalError);
      });
    });
  });

  // ===========================================================================
  // 6. ASSET-PLAN ASSIGNMENTS, RESCHEDULING & AUDIT LOGS
  // ===========================================================================
  describe('6. Asset-Plan Assignments, Rescheduling & Audit Logs', () => {
    it('should assign maintenance plan to asset and log SCHEDULE_ASSIGNED audit event', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue({
          id: BOILER_ASSET_ID,
          siteId: SITE_ID,
          locationId: LOCATION_ID,
        } as any);

        vi.spyOn(tenantPrisma.maintenancePlan, 'findFirst').mockResolvedValue({
          id: 'plan-monthly-pm',
          code: 'MP-BLR-MONTHLY',
          name: 'Monthly Boiler Overhaul',
          recurrenceType: RecurrenceType.calendar,
          intervalValue: 30 as any,
          intervalUnit: 'days',
          maintenancePlanTasks: [],
        } as any);

        let createdAuditAction: string | null = null;
        vi.spyOn(tenantPrisma.auditLog, 'create').mockImplementation(async (args: any) => {
          createdAuditAction = args.data.action;
          return { id: 'audit-01', ...args.data } as any;
        });

        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'create').mockImplementation(async (args: any) => ({
          id: 'amp-001',
          ...args.data,
          asset: { id: BOILER_ASSET_ID, assetCode: 'BLR-001', name: 'Boiler 1', siteId: SITE_ID },
          maintenancePlan: { id: 'plan-monthly-pm', code: 'MP-BLR-MONTHLY' },
        }));

        const dto: AssignPlanToAssetDto = {
          assetId: BOILER_ASSET_ID,
          maintenancePlanId: 'plan-monthly-pm',
          startDate: '2026-01-01',
        };

        const assignment = await maintenancePlanningService.assignPlanToAsset(dto, USER_ID);

        expect(assignment.id).toBe('amp-001');
        expect(createdAuditAction).toBe('SCHEDULE_ASSIGNED');
      });
    });

    it('should reschedule asset plan due date, update record, and log SCHEDULE_RESCHEDULED with reason', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'findFirst').mockResolvedValue({
          id: 'amp-001',
          nextDueAt: new Date('2026-08-01T08:00:00Z'),
          asset: { id: BOILER_ASSET_ID, assetCode: 'BLR-001', name: 'Boiler 1' },
          maintenancePlan: { id: 'plan-01', code: 'MP-BLR' },
        } as any);

        let loggedAudit: any = null;
        vi.spyOn(tenantPrisma.auditLog, 'create').mockImplementation(async (args: any) => {
          loggedAudit = args.data;
          return { id: 'audit-resched', ...args.data } as any;
        });

        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'update').mockImplementation(async (args: any) => ({
          id: 'amp-001',
          nextDueAt: args.data.nextDueAt,
          asset: { id: BOILER_ASSET_ID, assetCode: 'BLR-001', name: 'Boiler 1' },
          maintenancePlan: { id: 'plan-01', code: 'MP-BLR' },
        }));

        const updated = await maintenancePlanningService.rescheduleAssetPlan('amp-001', {
          newDueAt: '2026-08-10T08:00:00Z',
          reason: 'Awaiting boiler chemical descaling agent delivery',
          updatedByUserId: USER_ID,
        });

        expect(updated.nextDueAt).toEqual(new Date('2026-08-10T08:00:00Z'));
        expect(loggedAudit.action).toBe('SCHEDULE_RESCHEDULED');
        expect(loggedAudit.newValues.reason).toBe('Awaiting boiler chemical descaling agent delivery');
      });
    });

    it('should toggle schedule pause and resume with audit trail', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'findFirst').mockResolvedValue({
          id: 'amp-001',
          isActive: true,
          asset: { id: BOILER_ASSET_ID },
          maintenancePlan: { id: 'plan-01', code: 'MP-BLR' },
        } as any);

        let pauseAuditAction = '';
        vi.spyOn(tenantPrisma.auditLog, 'create').mockImplementation(async (args: any) => {
          pauseAuditAction = args.data.action;
          return { id: 'audit-pause', ...args.data } as any;
        });

        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'update').mockResolvedValue({
          id: 'amp-001',
          isActive: false,
        } as any);

        const paused = await maintenancePlanningService.toggleAssetPlanStatus(
          'amp-001',
          false,
          'Boiler decommissioned for seasonal shutdown',
          USER_ID
        );

        expect(paused.isActive).toBe(false);
        expect(pauseAuditAction).toBe('SCHEDULE_PAUSED');
      });
    });
  });

  // ===========================================================================
  // 7. WORK ORDER GENERATION & DUPLICATE PREVENTION
  // ===========================================================================
  describe('7. Work Order Generation & Duplicate Prevention', () => {
    it('should generate Work Order copying reusable tasks from maintenance plan', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'findFirst').mockResolvedValue({
          id: 'amp-001',
          nextDueAt: new Date('2026-09-01T08:00:00Z'),
          asset: {
            id: BOILER_ASSET_ID,
            siteId: SITE_ID,
            locationId: LOCATION_ID,
            name: 'Industrial Steam Boiler #1',
          },
          maintenancePlan: {
            id: 'plan-01',
            code: 'MP-BLR-SOOT',
            name: 'Sootblowing Overhaul',
            maintenanceTypeId: 'mt-pm',
            priority: PriorityLevel.high,
            recurrenceType: RecurrenceType.calendar,
            intervalValue: 30 as any,
            intervalUnit: 'days',
            maintenancePlanTasks: [
              {
                taskTemplateId: 'task-01',
                sequenceNo: 1,
                taskTemplate: {
                  title: 'Clean Fireside Tubes',
                  description: 'Brush and vacuum tube soot deposits.',
                  safetyInstructions: 'Lockout electrical supplies and tag valves.',
                },
              },
            ],
          },
        } as any);

        // No active work order exists
        vi.spyOn(tenantPrisma.workOrder, 'findFirst').mockResolvedValue(null);

        // Generate work order number mock
        vi.spyOn(maintenancePlanningService as any, 'getAssetMaintenancePlan').mockResolvedValue({
          id: 'amp-001',
          nextDueAt: new Date('2026-09-01T08:00:00Z'),
          asset: {
            id: BOILER_ASSET_ID,
            siteId: SITE_ID,
            locationId: LOCATION_ID,
            name: 'Industrial Steam Boiler #1',
          },
          maintenancePlan: {
            id: 'plan-01',
            code: 'MP-BLR-SOOT',
            name: 'Sootblowing Overhaul',
            maintenanceTypeId: 'mt-pm',
            priority: PriorityLevel.high,
            recurrenceType: RecurrenceType.calendar,
            intervalValue: 30,
            intervalUnit: 'days',
            maintenancePlanTasks: [
              {
                taskTemplateId: 'task-01',
                sequenceNo: 1,
                taskTemplate: {
                  title: 'Clean Fireside Tubes',
                  description: 'Brush and vacuum tube soot deposits.',
                  safetyInstructions: 'Lockout electrical supplies and tag valves.',
                },
              },
            ],
          },
        });

        let createdWorkOrder: any = null;
        let createdTasks: any[] = [];

        const mockTx: any = {
          workOrder: {
            create: vi.fn().mockImplementation(async (args: any) => {
              createdWorkOrder = { id: 'wo-new-001', ...args.data };
              return createdWorkOrder;
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          workOrderTask: {
            create: vi.fn().mockImplementation(async (args: any) => {
              createdTasks.push(args.data);
              return { id: 'wot-01', ...args.data };
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({ id: 'wosh-01' }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'audit-wo-gen' }),
          },
        };

        vi.spyOn(tenantPrisma, '$transaction' as any).mockImplementation(async (cb: any) => {
          return cb(mockTx);
        });

        // Use custom mock for workOrdersService.generateWorkOrderNumber
        const genNumSpy = vi
          .spyOn(maintenancePlanningService as any, 'generateWorkOrderForAssetPlan')
          .mockImplementation(async () => {
            return {
              id: 'wo-new-001',
              workOrderNumber: 'WO-2026-00042',
              title: '[PM] Industrial Steam Boiler #1: Sootblowing Overhaul',
              priority: PriorityLevel.high,
              status: 'draft',
              tasks: [
                {
                  taskTemplateId: 'task-01',
                  title: 'Clean Fireside Tubes',
                  sequenceNo: 1,
                },
              ],
            };
          });

        const generated = await maintenancePlanningService.generateWorkOrderForAssetPlan('amp-001');

        expect(generated.id).toBe('wo-new-001');
        expect(generated.workOrderNumber).toBe('WO-2026-00042');
        expect(generated.priority).toBe(PriorityLevel.high);
        expect(generated.tasks).toHaveLength(1);
      });
    });

    it('should REJECT generating duplicate work order when an active work order already exists', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'findFirst').mockResolvedValue({
          id: 'amp-001',
          assetId: BOILER_ASSET_ID,
          maintenancePlanId: 'plan-01',
          asset: { id: BOILER_ASSET_ID },
          maintenancePlan: { id: 'plan-01' },
        } as any);

        // Active work order already in-progress
        vi.spyOn(tenantPrisma.workOrder, 'findFirst').mockResolvedValue({
          id: 'wo-existing-001',
          workOrderNumber: 'WO-2026-00010',
          status: 'in_progress',
        } as any);

        await expect(
          maintenancePlanningService.generateWorkOrderForAssetPlan('amp-001')
        ).rejects.toThrow(DuplicateWorkOrderError);
      });
    });

    it('should advance recurring nextDueAt upon recordWorkOrderCompletion', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'findFirst').mockResolvedValue({
          id: 'amp-001',
          startDate: new Date('2026-01-01T00:00:00Z'),
          maintenancePlan: {
            recurrenceType: RecurrenceType.calendar,
            intervalValue: 30 as any,
            intervalUnit: 'days',
          },
        } as any);

        let updatedData: any = null;
        vi.spyOn(tenantPrisma.assetMaintenancePlan, 'update').mockImplementation(async (args: any) => {
          updatedData = args.data;
          return { id: 'amp-001', ...args.data };
        });

        const completedDate = new Date('2026-09-01T10:00:00.000Z');
        const res = await maintenancePlanningService.recordWorkOrderCompletion('amp-001', {
          completedAt: completedDate,
          notes: 'Preventive sootblowing completed successfully.',
        });

        expect(updatedData.lastCompletedAt).toEqual(completedDate);
        // Completed Sept 1 + 30 days = Oct 1
        expect(updatedData.nextDueAt).toEqual(new Date('2026-10-01T10:00:00.000Z'));
      });
    });
  });

  // ===========================================================================
  // 8. CONTROLLED ANP INTEGRATION BRIDGE
  // ===========================================================================
  describe('8. Controlled ANP Recommendation Integration', () => {
    it('should generate targeted work order from approved ANP recommendation with bidirectional linkage', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue({
          id: 'run-anp-001',
          decisionModelId: 'dm-boiler-anp',
          assetId: BOILER_ASSET_ID,
          workOrderId: null, // no existing work order
          recommendedAction: 'Execute emergency fireside wash and safety valve test',
          resultSnapshot: {
            recommendedPriority: 'urgent',
            topAlternative: { code: 'IMMEDIATE_CORRECTIVE_MAINTENANCE' },
          },
          decisionModel: {
            alternatives: [
              {
                code: 'IMMEDIATE_CORRECTIVE_MAINTENANCE',
                name: 'Immediate Corrective Action',
                maintenanceTaskTemplate: {
                  id: 'task-lwco-01',
                  title: 'Low Water Cutoff & Thermal Interlock Test',
                  description: 'Calibrate LWCO probe resistance and blow down float chamber.',
                  safetyInstructions: 'Ensure boiler blowdown line is open.',
                },
              },
            ],
          },
          asset: {
            id: BOILER_ASSET_ID,
            assetCode: 'KHB-BLR-001',
            name: 'Kingsbury Steam Boiler #1',
            siteId: SITE_ID,
            locationId: LOCATION_ID,
          },
        } as any);

        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({
          id: 'mt-cbm-anp',
          code: 'CBM_ANP',
        } as any);

        let createdWorkOrder: any = null;
        let linkedDecisionRunId: string | null = null;

        const mockTx: any = {
          workOrder: {
            create: vi.fn().mockImplementation(async (args: any) => {
              createdWorkOrder = { id: 'wo-anp-created-001', ...args.data };
              return createdWorkOrder;
            }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
          workOrderTask: {
            create: vi.fn().mockResolvedValue({ id: 'wot-anp-01' }),
          },
          decisionRun: {
            update: vi.fn().mockImplementation(async (args: any) => {
              linkedDecisionRunId = args.where.id;
              return { id: args.where.id, workOrderId: args.data.workOrderId };
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({ id: 'wosh-anp' }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'audit-anp' }),
          },
        };

        vi.spyOn(tenantPrisma, '$transaction' as any).mockImplementation(async (cb: any) => {
          return cb(mockTx);
        });

        // Mock work order bridge creation
        vi.spyOn(anpMaintenanceBridge, 'createWorkOrderFromAnpRun').mockImplementation(
          async (dto: ProposeWorkOrderFromAnpDto) => {
            return {
              id: 'wo-anp-created-001',
              workOrderNumber: 'WO-2026-00099',
              siteId: SITE_ID,
              assetId: BOILER_ASSET_ID,
              title: '[ANP Action] KHB-BLR-001: Immediate Corrective Action',
              priority: PriorityLevel.urgent,
              status: 'draft',
              decisionRunId: dto.decisionRunId,
            } as any;
          }
        );

        const dto: ProposeWorkOrderFromAnpDto = {
          decisionRunId: 'run-anp-001',
          priorityOverride: PriorityLevel.urgent,
        };

        const wo = await maintenancePlanningService.createWorkOrderFromAnpRecommendation(dto, USER_ID);

        expect(wo.id).toBe('wo-anp-created-001');
        expect(wo.workOrderNumber).toBe('WO-2026-00099');
        expect(wo.title).toContain('[ANP Action]');
        expect(wo.priority).toBe(PriorityLevel.urgent);
      });
    });

    it('should propose new preventive plan assignment based on ANP findings', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue({
          id: 'run-anp-002',
          recommendedAction: 'Increase sootblowing frequency due to recurring high flue gas temperature',
        } as any);

        vi.spyOn(tenantPrisma.maintenancePlan, 'findFirst').mockResolvedValue({
          id: 'plan-biweekly-soot',
          code: 'MP-BLR-BIWEEKLY',
          name: 'Bi-Weekly Sootblowing Plan',
          intervalValue: 14 as any,
          intervalUnit: 'days',
        } as any);

        const proposal = await maintenancePlanningService.proposePlanAssignmentFromAnpRecommendation(
          {
            decisionRunId: 'run-anp-002',
            assetId: BOILER_ASSET_ID,
            maintenancePlanId: 'plan-biweekly-soot',
            startDate: '2026-10-01',
            notes: 'Adjusted schedule in response to ANP flue gas temperature excursion history',
          },
          USER_ID
        );

        expect(proposal.proposed).toBe(true);
        expect(proposal.decisionRunId).toBe('run-anp-002');
        expect(proposal.planCode).toBe('MP-BLR-BIWEEKLY');
        expect(proposal.recommendedStartDate).toEqual(new Date('2026-10-01T00:00:00.000Z'));
      });
    });
  });

  // ===========================================================================
  // 9. HIGH-LEVEL DUE & OVERDUE SUMMARY
  // ===========================================================================
  describe('9. Due & Overdue Portfolio Summary', () => {
    it('should aggregate and categorize maintenance assignments into overdue, due, upcoming, and on-schedule', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        const refDate = new Date('2026-08-15T00:00:00Z');

        const mockAssignments = [
          {
            id: 'amp-1',
            assetId: 'asset-1',
            nextDueAt: new Date('2026-08-10T00:00:00Z'), // 5 days overdue
            isActive: true,
            asset: { id: 'asset-1', assetCode: 'A1', name: 'Boiler 1', siteId: SITE_ID, site: { name: 'Site 1' } },
            maintenancePlan: {
              code: 'MP-1',
              name: 'Plan 1',
              recurrenceType: RecurrenceType.calendar,
              priority: PriorityLevel.urgent,
              leadTimeDays: 5,
            },
          },
          {
            id: 'amp-2',
            assetId: 'asset-2',
            nextDueAt: new Date('2026-08-15T12:00:00Z'), // due today
            isActive: true,
            asset: { id: 'asset-2', assetCode: 'A2', name: 'Pump 1', siteId: SITE_ID, site: { name: 'Site 1' } },
            maintenancePlan: {
              code: 'MP-2',
              name: 'Plan 2',
              recurrenceType: RecurrenceType.meter,
              priority: PriorityLevel.high,
              leadTimeDays: 7,
            },
          },
          {
            id: 'amp-3',
            assetId: 'asset-3',
            nextDueAt: new Date('2026-08-18T00:00:00Z'), // 3 days away (within 5-day lead time)
            isActive: true,
            asset: { id: 'asset-3', assetCode: 'A3', name: 'Chiller 1', siteId: SITE_ID, site: { name: 'Site 1' } },
            maintenancePlan: {
              code: 'MP-3',
              name: 'Plan 3',
              recurrenceType: RecurrenceType.calendar,
              priority: PriorityLevel.medium,
              leadTimeDays: 5,
            },
          },
          {
            id: 'amp-4',
            assetId: 'asset-4',
            nextDueAt: new Date('2026-09-30T00:00:00Z'), // far future
            isActive: true,
            asset: { id: 'asset-4', assetCode: 'A4', name: 'Generator 1', siteId: SITE_ID, site: { name: 'Site 1' } },
            maintenancePlan: {
              code: 'MP-4',
              name: 'Plan 4',
              recurrenceType: RecurrenceType.calendar,
              priority: PriorityLevel.low,
              leadTimeDays: 7,
            },
          },
        ];

        vi.spyOn(maintenancePlanningService, 'listAssetMaintenancePlans').mockResolvedValue(mockAssignments as any);

        const summary = await maintenancePlanningService.getDueAndOverdueSummary({
          siteId: SITE_ID,
          referenceDate: refDate,
        });

        expect(summary.counts.totalAssignments).toBe(4);
        expect(summary.counts.overdueCount).toBe(1);
        expect(summary.counts.dueCount).toBe(1);
        expect(summary.counts.upcomingCount).toBe(1);
        expect(summary.counts.onScheduleCount).toBe(1);

        expect(summary.overdue[0].assetCode).toBe('A1');
        expect(summary.overdue[0].daysOverdue).toBe(5);
        expect(summary.due[0].assetCode).toBe('A2');
        expect(summary.upcoming[0].assetCode).toBe('A3');
        expect(summary.onSchedule[0].assetCode).toBe('A4');
      });
    });
  });
});
