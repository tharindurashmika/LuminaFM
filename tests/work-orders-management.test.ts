import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  workOrdersService,
  CreateWorkOrderDto,
  CreateWorkOrderTaskInput,
  CreateWorkOrderLaborDto,
  CreateWorkOrderPartDto,
  CreateFromFaultReportDto,
  CreateFromInspectionDto,
  CreateFromAnpRecommendationDto,
} from '../src/modules/work-orders/work-orders.service';
import {
  validateStatusTransition,
  InvalidWorkOrderStatusTransitionError,
  WORK_ORDER_STATE_TRANSITIONS,
} from '../src/modules/work-orders/work-order.state-machine';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import tenantPrisma from '../src/tenant/tenant.client';
import prisma from '../src/lib/prisma';
import { PriorityLevel, WorkOrderStatus } from '@prisma/client';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = 'site-colombo-001';
const LOCATION_ID = 'loc-boiler-room-001';
const ASSET_ID = 'asset-boiler-001';
const USER_ID = 'user-engineer-001';
const TECH_ID = 'user-technician-001';

describe('LuminaFM Work Management Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. EXPLICIT WORK ORDER STATE MACHINE TRANSITIONS
  // ===========================================================================
  describe('1. Explicit State Machine & Valid/Invalid Transitions', () => {
    it('should validate standard lifecycle path: draft -> open -> approved -> assigned -> in_progress -> completed -> closed', () => {
      expect(() => validateStatusTransition('draft', 'open')).not.toThrow();
      expect(() => validateStatusTransition('open', 'approved')).not.toThrow();
      expect(() => validateStatusTransition('approved', 'assigned')).not.toThrow();
      expect(() => validateStatusTransition('assigned', 'in_progress')).not.toThrow();
      expect(() => validateStatusTransition('in_progress', 'completed')).not.toThrow();
      expect(() => validateStatusTransition('completed', 'closed')).not.toThrow();
    });

    it('should validate operational pause and resume: in_progress -> on_hold -> in_progress', () => {
      expect(() => validateStatusTransition('in_progress', 'on_hold')).not.toThrow();
      expect(() => validateStatusTransition('on_hold', 'in_progress')).not.toThrow();
    });

    it('should validate cancellation from non-terminal states', () => {
      expect(() => validateStatusTransition('draft', 'cancelled')).not.toThrow();
      expect(() => validateStatusTransition('open', 'cancelled')).not.toThrow();
      expect(() => validateStatusTransition('approved', 'cancelled')).not.toThrow();
      expect(() => validateStatusTransition('assigned', 'cancelled')).not.toThrow();
      expect(() => validateStatusTransition('in_progress', 'cancelled')).not.toThrow();
      expect(() => validateStatusTransition('on_hold', 'cancelled')).not.toThrow();
    });

    it('should REJECT illegal transition: draft directly to completed', () => {
      expect(() => validateStatusTransition('draft', 'completed')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });

    it('should REJECT illegal transition from closed terminal state', () => {
      expect(() => validateStatusTransition('closed', 'in_progress')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('closed', 'open')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });

    it('should REJECT illegal transition from cancelled terminal state', () => {
      expect(() => validateStatusTransition('cancelled', 'open')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
      expect(() => validateStatusTransition('cancelled', 'draft')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });

    it('should REJECT transitioning to the same status', () => {
      expect(() => validateStatusTransition('in_progress', 'in_progress')).toThrow(
        InvalidWorkOrderStatusTransitionError
      );
    });
  });

  // ===========================================================================
  // 2. SAFE WORK ORDER NUMBER GENERATION
  // ===========================================================================
  describe('2. Organization-Specific Work Order Number Generation', () => {
    it('should generate sequential number prefixed with current year (WO-YYYY-00001)', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(null);

        const currentYear = new Date().getUTCFullYear();
        const num = await workOrdersService.generateWorkOrderNumber(TENANT_ID);

        expect(num).toBe(`WO-${currentYear}-00001`);
      });
    });

    it('should increment existing sequence contiguously', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        const currentYear = new Date().getUTCFullYear();
        vi.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue({
          workOrderNumber: `WO-${currentYear}-00142`,
        } as any);

        const num = await workOrdersService.generateWorkOrderNumber(TENANT_ID);

        expect(num).toBe(`WO-${currentYear}-00143`);
      });
    });
  });

  // ===========================================================================
  // 3. WORK ORDER CREATION, TASKS, LABOR & PARTS
  // ===========================================================================
  describe('3. Work Order Creation, Tasks, Labor & Spare Parts', () => {
    it('should create a Work Order in draft status with tasks in atomic transaction', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValue({ id: SITE_ID } as any);
        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({ id: 'mt-pm' } as any);
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue({
          id: ASSET_ID,
          siteId: SITE_ID,
          locationId: LOCATION_ID,
        } as any);

        let createdWorkOrder: any = null;
        let createdTasks: any[] = [];
        let createdHistory: any = null;

        const mockTx: any = {
          workOrder: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async (args: any) => {
              createdWorkOrder = { id: 'wo-101', ...args.data };
              return createdWorkOrder;
            }),
            findUnique: vi.fn().mockImplementation(async () => ({
              ...createdWorkOrder,
              tasks: createdTasks,
            })),
          },
          workOrderTask: {
            create: vi.fn().mockImplementation(async (args: any) => {
              createdTasks.push({ id: `task-${createdTasks.length + 1}`, ...args.data });
              return createdTasks[createdTasks.length - 1];
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockImplementation(async (args: any) => {
              createdHistory = args.data;
              return { id: 'wosh-1', ...args.data };
            }),
          },
        };

        vi.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => {
          return cb(mockTx);
        });

        const dto: CreateWorkOrderDto = {
          siteId: SITE_ID,
          maintenanceTypeId: 'mt-pm',
          assetId: ASSET_ID,
          title: 'Quarterly Boiler Safety Inspection',
          description: 'Comprehensive pressure vessel inspection and relief valve testing',
          priority: PriorityLevel.high,
          estimatedCost: 1500.0,
          tasks: [
            { title: 'Check steam drum gauge glass', sequenceNo: 1 },
            { title: 'Lift safety relief valve test lever', sequenceNo: 2 },
          ],
        };

        const result = await workOrdersService.createWorkOrder(dto, USER_ID);

        expect(result.id).toBe('wo-101');
        expect(result.status).toBe('draft');
        expect(createdTasks).toHaveLength(2);
        expect(createdHistory.newStatus).toBe('draft');
        expect(createdHistory.oldStatus).toBeNull();
      });
    });

    it('should add labor and spare parts with positive value validations', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(workOrdersService, 'getWorkOrderById').mockResolvedValue({
          id: 'wo-101',
          laborRecords: [],
          parts: [],
        } as any);

        vi.spyOn(tenantPrisma.workOrderLabor, 'create').mockImplementation(async (args: any) => ({
          id: 'labor-01',
          ...args.data,
        }));

        vi.spyOn(tenantPrisma.workOrderPart, 'create').mockImplementation(async (args: any) => ({
          id: 'part-01',
          ...args.data,
        }));

        const labor = await workOrdersService.addWorkOrderLabor('wo-101', {
          userId: TECH_ID,
          technicianName: 'Saman Perera',
          hoursWorked: 4.5,
          hourlyCost: 50.0,
          notes: 'Dismantled water level float chamber',
        });

        const part = await workOrdersService.addWorkOrderPart('wo-101', {
          partCode: 'GSK-BLR-80',
          description: 'High-temperature steam gasket 80mm',
          quantity: 2,
          unitCost: 75.0,
        });

        expect(labor.hoursWorked).toBe(4.5);
        expect(labor.hourlyCost).toBe(50.0);
        expect(part.quantity).toBe(2);
        expect(part.unitCost).toBe(75.0);

        // Validation: reject negative hours or quantity
        await expect(
          workOrdersService.addWorkOrderLabor('wo-101', { hoursWorked: -1 })
        ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

        await expect(
          workOrdersService.addWorkOrderPart('wo-101', { description: 'Bolt', quantity: 0 })
        ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      });
    });
  });

  // ===========================================================================
  // 4. FINANCIALS & COST BREAKDOWN ROLLUP
  // ===========================================================================
  describe('4. Financials & Cost Breakdown Calculation', () => {
    it('should accurately compute labor, parts, total actual cost and variance', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(workOrdersService, 'getWorkOrderById').mockResolvedValue({
          id: 'wo-101',
          workOrderNumber: 'WO-2026-00010',
          estimatedCost: 500.0,
          laborRecords: [
            { id: 'l1', technicianName: 'Lead Tech', hoursWorked: 4, hourlyCost: 50.0 }, // 200
            { id: 'l2', technicianName: 'Assistant Tech', hoursWorked: 3.5, hourlyCost: 40.0 }, // 140
          ],
          parts: [
            { id: 'p1', partCode: 'SEAL-01', description: 'Gland packing', quantity: 2, unitCost: 45.0 }, // 90
            { id: 'p2', partCode: 'OIL-SYN', description: 'Synthetic lubricant', quantity: 1, unitCost: 35.0 }, // 35
          ],
        } as any);

        const costs = await workOrdersService.calculateWorkOrderCosts('wo-101');

        expect(costs.totalLaborCost).toBe(340.0);
        expect(costs.totalPartsCost).toBe(125.0);
        expect(costs.actualTotalCost).toBe(465.0);
        expect(costs.estimatedCost).toBe(500.0);
        expect(costs.variance).toBe(-35.0); // 35 under budget
      });
    });
  });

  // ===========================================================================
  // 5. LIFECYCLE ACTIONS & TASK COMPLETION ENFORCEMENT
  // ===========================================================================
  describe('5. Lifecycle Actions & Mandatory Task Verification', () => {
    it('should transition through approve, assign, start, and hold', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        let currentStatus: WorkOrderStatus = 'draft';

        vi.spyOn(workOrdersService, 'getWorkOrderById').mockImplementation(async () => ({
          id: 'wo-101',
          status: currentStatus,
          tasks: [],
          laborRecords: [],
          parts: [],
        } as any));

        vi.spyOn(workOrdersService, 'updateWorkOrder').mockResolvedValue({} as any);

        vi.spyOn(workOrdersService, 'transitionWorkOrderStatus').mockImplementation(
          async (_id, dto) => {
            currentStatus = dto.status;
            return { id: 'wo-101', status: currentStatus } as any;
          }
        );

        // Approve
        const approved = await workOrdersService.approveWorkOrder('wo-101', {}, USER_ID);
        expect(approved.status).toBe('approved');

        // Assign
        const assigned = await workOrdersService.assignWorkOrder(
          'wo-101',
          { assignedToUserId: TECH_ID },
          USER_ID
        );
        expect(assigned.status).toBe('assigned');

        // Start
        const started = await workOrdersService.startWorkOrder('wo-101', 'Commenced', TECH_ID);
        expect(started.status).toBe('in_progress');

        // Hold
        const held = await workOrdersService.holdWorkOrder(
          'wo-101',
          'Awaiting parts delivery',
          TECH_ID
        );
        expect(held.status).toBe('on_hold');

        // Resume
        const resumed = await workOrdersService.resumeWorkOrder('wo-101', 'Parts arrived', TECH_ID);
        expect(resumed.status).toBe('in_progress');
      });
    });

    it('should REJECT completeWorkOrder when mandatory tasks remain unfinished', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(workOrdersService, 'getWorkOrderById').mockResolvedValue({
          id: 'wo-101',
          status: 'in_progress',
          tasks: [
            { id: 't1', title: 'Task 1', status: 'completed' },
            { id: 't2', title: 'Task 2: Pressure Hydro-test', status: 'pending' },
          ],
        } as any);

        await expect(
          workOrdersService.completeWorkOrder('wo-101', {}, USER_ID)
        ).rejects.toMatchObject({
          status: 400,
          code: 'INCOMPLETE_TASKS',
        });
      });
    });

    it('should ALLOW completeWorkOrder when skipIncompleteTaskCheck is explicitly provided', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(workOrdersService, 'getWorkOrderById').mockResolvedValue({
          id: 'wo-101',
          status: 'in_progress',
          tasks: [{ id: 't2', title: 'Task 2', status: 'pending' }],
          laborRecords: [],
          parts: [],
        } as any);

        vi.spyOn(workOrdersService, 'calculateWorkOrderCosts').mockResolvedValue({
          actualTotalCost: 250.0,
        } as any);

        vi.spyOn(workOrdersService, 'transitionWorkOrderStatus').mockResolvedValue({
          id: 'wo-101',
          status: 'completed',
          actualCost: 250.0,
        } as any);

        const completed = await workOrdersService.completeWorkOrder(
          'wo-101',
          { skipIncompleteTaskCheck: true, completionNotes: 'Supervisor override waiver' },
          USER_ID
        );

        expect(completed.status).toBe('completed');
      });
    });
  });

  // ===========================================================================
  // 6. ORIGINATING SOURCES
  // ===========================================================================
  describe('6. Work Orders Originating Sources', () => {
    it('should create Work Order from Operator Fault Report and update fault log status', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.faultLog, 'findFirst').mockResolvedValue({
          id: 'fault-001',
          faultNumber: 'FLT-2026-0005',
          assetId: ASSET_ID,
          reportedBy: TECH_ID,
          severity: 'high',
          symptom: 'Boiler feedwater pump primary mechanical seal leaking steam',
          suspectedCause: 'Excessive thermal expansion',
          relatedWorkOrderId: null,
          asset: {
            id: ASSET_ID,
            assetCode: 'KHB-BLR-001',
            siteId: SITE_ID,
            locationId: LOCATION_ID,
          },
        } as any);

        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({
          id: 'mt-cm',
          code: 'CM',
        } as any);

        let updatedFaultStatus: string | null = null;
        let createdWorkOrder: any = null;

        const mockTx: any = {
          workOrder: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async (args: any) => {
              createdWorkOrder = { id: 'wo-flt-01', ...args.data };
              return createdWorkOrder;
            }),
          },
          faultLog: {
            update: vi.fn().mockImplementation(async (args: any) => {
              updatedFaultStatus = args.data.status;
              return { id: 'fault-001', ...args.data };
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({ id: 'wosh-flt' }),
          },
        };

        vi.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => {
          return cb(mockTx);
        });

        const dto: CreateFromFaultReportDto = {
          faultLogId: 'fault-001',
        };

        const wo = await workOrdersService.createFromFaultReport(dto, USER_ID);

        expect(wo.id).toBe('wo-flt-01');
        expect(wo.priority).toBe(PriorityLevel.high);
        expect(wo.title).toContain('[Fault Remediation]');
        expect(updatedFaultStatus).toBe('work_order_created');
      });
    });

    it('should create Work Order from Inspection deficiency and link inspection', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.inspection, 'findFirst').mockResolvedValue({
          id: 'insp-001',
          inspectionNumber: 'INSP-2026-0008',
          assetId: ASSET_ID,
          inspectorId: TECH_ID,
          overallResult: 'failed',
          notes: 'Main steam stop valve flange packing failed hydrostatic pressure test',
          checklistTemplate: { name: 'Quarterly Pressure Vessel Audit' },
          asset: {
            id: ASSET_ID,
            assetCode: 'KHB-BLR-001',
            siteId: SITE_ID,
            locationId: LOCATION_ID,
          },
        } as any);

        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({
          id: 'mt-cm',
          code: 'CM',
        } as any);

        let linkedInspectionWoId: string | null = null;
        const mockTx: any = {
          workOrder: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async (args: any) => ({
              id: 'wo-insp-01',
              ...args.data,
            })),
          },
          inspection: {
            update: vi.fn().mockImplementation(async (args: any) => {
              linkedInspectionWoId = args.data.workOrderId;
              return { id: 'insp-001', ...args.data };
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({ id: 'wosh-insp' }),
          },
        };

        vi.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => {
          return cb(mockTx);
        });

        const dto: CreateFromInspectionDto = {
          inspectionId: 'insp-001',
        };

        const wo = await workOrdersService.createFromInspection(dto, USER_ID);

        expect(wo.id).toBe('wo-insp-01');
        expect(wo.title).toContain('[Inspection Remediation]');
        expect(linkedInspectionWoId).toBe('wo-insp-01');
      });
    });

    it('should REJECT converting ANP recommendation without supervisor approval when auto-approval is disabled', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue({
          id: 'run-anp-01',
          resultSnapshot: { compositeRiskScore: 0.65 },
          decisionModel: { alternatives: [] },
          asset: { siteId: SITE_ID },
        } as any);

        vi.spyOn(prisma.organization, 'findUnique').mockResolvedValue({
          deploymentSettings: {
            anpApprovalRules: { autoApprovalEnabled: false },
          },
        } as any);

        // Attempting conversion without supervisor approval
        const dto: CreateFromAnpRecommendationDto = {
          decisionRunId: 'run-anp-01',
          supervisorApproval: false,
        };

        await expect(
          workOrdersService.createFromAnpRecommendation(dto, USER_ID)
        ).rejects.toMatchObject({
          status: 422,
          code: 'ANP_APPROVAL_REQUIRED',
        });
      });
    });

    it('should ALLOW converting ANP recommendation when supervisor explicitly approves', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue({
          id: 'run-anp-02',
          workOrderId: null,
          recommendedAction: 'Execute emergency fireside wash and safety valve test',
          resultSnapshot: {
            compositeRiskScore: 0.75,
            recommendedPriority: 'urgent',
            topAlternative: { code: 'IMMEDIATE_ACTION' },
          },
          decisionModel: {
            alternatives: [
              {
                code: 'IMMEDIATE_ACTION',
                name: 'Immediate Thermal Interlock Test',
                maintenanceTaskTemplate: {
                  id: 'task-01',
                  title: 'LWCO Calibration',
                  description: 'Calibrate water probe resistance',
                },
              },
            ],
          },
          asset: {
            id: ASSET_ID,
            assetCode: 'KHB-BLR-001',
            siteId: SITE_ID,
            locationId: LOCATION_ID,
          },
        } as any);

        vi.spyOn(prisma.organization, 'findUnique').mockResolvedValue({
          deploymentSettings: {},
        } as any);

        vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({
          id: 'mt-cbm',
          code: 'CBM_ANP',
        } as any);

        let createdWo: any = null;
        let linkedRunWoId: string | null = null;

        const mockTx: any = {
          workOrder: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async (args: any) => {
              createdWo = { id: 'wo-anp-02', ...args.data };
              return createdWo;
            }),
          },
          workOrderTask: {
            create: vi.fn().mockResolvedValue({ id: 'wot-1' }),
          },
          decisionRun: {
            update: vi.fn().mockImplementation(async (args: any) => {
              linkedRunWoId = args.data.workOrderId;
              return { id: 'run-anp-02', ...args.data };
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({ id: 'wosh-anp' }),
          },
        };

        vi.spyOn(prisma, '$transaction' as any).mockImplementation(async (cb: any) => {
          return cb(mockTx);
        });

        const dto: CreateFromAnpRecommendationDto = {
          decisionRunId: 'run-anp-02',
          supervisorApproval: true,
          approvalNotes: 'Approved by Chief Boiler Inspector',
        };

        const wo = await workOrdersService.createFromAnpRecommendation(dto, USER_ID);

        expect(wo.id).toBe('wo-anp-02');
        expect(wo.status).toBe('approved');
        expect(wo.title).toContain('[ANP Approved]');
        expect(linkedRunWoId).toBe('wo-anp-02');
      });
    });
  });
});
