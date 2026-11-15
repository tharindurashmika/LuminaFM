import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../src/lib/prisma';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import {
  evaluateAnpDecisionModel,
  computeAnpSupermatrixWeights,
  CriterionInput,
} from '../src/modules/decision-support/anp.engine';
import { decisionSupportService } from '../src/modules/decision-support/decision-support.service';
import { operationsService } from '../src/modules/operations/operations.service';

describe('ANP Decision Support Engine & Automated Daily Log Breach Evaluation', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const ASSET_BOILER_ID = 'a1000000-0000-0000-0000-000000000001';
  const SITE_ID = 's1000000-0000-0000-0000-000000000001';
  const LOCATION_ID = 'l1000000-0000-0000-0000-000000000001';
  const MAINT_TYPE_ID = 'mt100000-0000-0000-0000-000000000001';
  const TEMPLATE_ID = 'c1000000-0000-0000-0000-000000000001';
  const MODEL_ID = 'dm100000-0000-0000-0000-000000000001';
  const CRIT_FLUE_ID = 'dc100000-0000-0000-0000-000000000001';
  const CRIT_PUMP_ID = 'dc100000-0000-0000-0000-000000000002';
  const currentYear = new Date().getUTCFullYear();

  beforeEach(() => {
    vi.restoreAllMocks();
    decisionSupportService.bindDailyLogListener();
  });

  describe('1. Decoupled Mathematical ANP Engine (Pure Unit Tests)', () => {
    const sampleCriteria: CriterionInput[] = [
      {
        id: CRIT_FLUE_ID,
        code: 'FLUE_GAS_TEMP',
        name: 'Flue Gas Stack Temperature',
        description: 'Benchmark: > 190 °C indicates soot fouling or damper drift',
        criterionType: 'risk',
        weight: 0.65,
      },
      {
        id: CRIT_PUMP_ID,
        code: 'PUMP_OPERATING_HOURS',
        name: 'Feedwater Pump Operating Hours',
        description: 'Benchmark: >= 12000 hrs requires mechanical seal & bearing overhaul',
        criterionType: 'cost',
        weight: 0.35,
      },
    ];

    it('should normalize criterion weights and apply ANP interdependence matrix when provided', () => {
      const weights = computeAnpSupermatrixWeights(sampleCriteria, {
        FLUE_GAS_TEMP: { PUMP_OPERATING_HOURS: 0.25 },
        PUMP_OPERATING_HOURS: { FLUE_GAS_TEMP: 0.1 },
      });

      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 4);
      expect(weights.FLUE_GAS_TEMP).toBeGreaterThan(weights.PUMP_OPERATING_HOURS);
    });

    it('should detect breach when Flue Gas Temp > 190°C and Pump Operating Hours >= 12000', () => {
      const result = evaluateAnpDecisionModel({
        criteria: sampleCriteria,
        signals: [
          { key: 'FLUE_GAS_TEMP', value: 218.5, unit: '°C' },
          { key: 'PUMP_OPERATING_HOURS', value: 12000, unit: 'hrs' },
        ],
      });

      expect(result.isBreached).toBe(true);
      expect(result.breachedCriteria).toHaveLength(2);
      expect(result.breachedCriteria[0].criterionCode).toBe('FLUE_GAS_TEMP');
      expect(result.breachedCriteria[0].observedValue).toBe(218.5);
      expect(result.breachedCriteria[0].threshold).toBe(190);
      expect(result.breachedCriteria[1].criterionCode).toBe('PUMP_OPERATING_HOURS');
      expect(result.breachedCriteria[1].observedValue).toBe(12000);
      expect(result.breachedCriteria[1].threshold).toBe(12000);
      expect(result.topAlternative).not.toBeNull();
      expect(result.recommendedAction).toContain('ANP Recommended Strategy');
      expect(result.confidenceScore).toBeGreaterThan(0.8);
    });

    it('should return isBreached=false when all readings are within benchmark tolerances', () => {
      const result = evaluateAnpDecisionModel({
        criteria: sampleCriteria,
        signals: [
          { key: 'FLUE_GAS_TEMP', value: 172.0, unit: '°C' },
          { key: 'PUMP_OPERATING_HOURS', value: 8400, unit: 'hrs' },
        ],
      });

      expect(result.isBreached).toBe(false);
      expect(result.breachedCriteria).toHaveLength(0);
      expect(result.topAlternative).toBeNull();
    });
  });

  describe('2. Event-Driven Daily Log Listener -> DecisionRun + Notification + Draft WorkOrder', () => {
    it('POST /api/operations/daily-log should automatically trigger ANP evaluation, create a decision_run, insert a high-priority notification, and draft a work_order when Flue Gas Temp > 190°C', async () => {
      // 1st Transaction: Daily Logbook submission (inspection_responses + meter_readings)
      const dailyLogTx = {
        asset: {
          findFirst: vi.fn().mockResolvedValue({
            id: ASSET_BOILER_ID,
            locationId: LOCATION_ID,
          }),
        },
        checklistTemplate: {
          findFirst: vi.fn().mockResolvedValue({ id: TEMPLATE_ID }),
        },
        inspection: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: 'insp-1',
            organizationId: TENANT_A_ID,
            inspectionNumber: `INSP-${currentYear}-00001`,
            checklistTemplateId: TEMPLATE_ID,
            assetId: ASSET_BOILER_ID,
            status: 'in_progress',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'insp-1',
            organizationId: TENANT_A_ID,
            inspectionNumber: `INSP-${currentYear}-00001`,
            checklistTemplateId: TEMPLATE_ID,
            assetId: ASSET_BOILER_ID,
            status: 'completed',
            overallResult: 'fail',
          }),
        },
        checklistItem: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'item-flue-1',
            organizationId: TENANT_A_ID,
            checklistTemplateId: TEMPLATE_ID,
            itemCode: 'FLUE_GAS_TEMP',
            question: 'Flue Gas Stack Temperature',
            responseType: 'number',
            minValue: 120,
            maxValue: 190,
            unitCode: '°C',
          }),
        },
        inspectionResponse: {
          upsert: vi.fn().mockImplementation(async ({ create }) => ({
            id: 'resp-flue-1',
            ...create,
          })),
        },
        assetMeter: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'mtr-pump-hrs',
            organizationId: TENANT_A_ID,
            assetId: ASSET_BOILER_ID,
            meterCode: 'PUMP_OPERATING_HOURS',
          }),
        },
        meterReading: {
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'mr-pump-1',
            ...data,
          })),
        },
      };

      // 2nd Transaction: ANP Decision Support Listener execution
      const anpDecisionTx = {
        asset: {
          findFirst: vi.fn().mockResolvedValue({
            id: ASSET_BOILER_ID,
            assetCode: 'BLR-001',
            name: 'Cleaver-Brooks Firetube Steam Boiler #1',
            siteId: SITE_ID,
            locationId: LOCATION_ID,
            assetCategoryId: 'cat-boiler',
          }),
        },
        decisionModel: {
          findFirst: vi.fn().mockResolvedValue({
            id: MODEL_ID,
            organizationId: TENANT_A_ID,
            code: 'BOILER-ANP-V1',
            name: 'Boiler Thermal & Mechanical ANP Model',
            modelMethod: 'ANP',
            status: 'active',
            configuration: {},
            criteria: [
              {
                id: CRIT_FLUE_ID,
                organizationId: TENANT_A_ID,
                decisionModelId: MODEL_ID,
                code: 'FLUE_GAS_TEMP',
                name: 'Flue Gas Temperature',
                description: 'Benchmark: > 190 °C',
                criterionType: 'risk',
                weight: 0.65,
                sequenceNo: 1,
              },
              {
                id: CRIT_PUMP_ID,
                organizationId: TENANT_A_ID,
                decisionModelId: MODEL_ID,
                code: 'PUMP_OPERATING_HOURS',
                name: 'Pump Operating Hours',
                description: 'Benchmark: >= 12000 hrs',
                criterionType: 'cost',
                weight: 0.35,
                sequenceNo: 2,
              },
            ],
            alternatives: [
              {
                id: 'alt-1',
                code: 'IMMEDIATE_SOOTBLOWING_AND_TUNING',
                name: 'Immediate Boiler Tube Sootblowing & Burner Tuning',
                description: 'Clean fireside tubes and recalibrate air/fuel ratio.',
              },
            ],
          }),
        },
        maintenanceType: {
          findFirst: vi.fn().mockResolvedValue({ id: MAINT_TYPE_ID }),
        },
        workOrder: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'wo-draft-anp-1',
            ...data,
          })),
        },
        workOrderStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'wosh-1' }),
        },
        decisionRun: {
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'drun-101',
            ...data,
          })),
        },
        organizationMembership: {
          findFirst: vi.fn().mockResolvedValue({ userId: USER_ID }),
        },
        notification: {
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'notif-101',
            ...data,
          })),
        },
      };

      vi.spyOn(prisma, '$transaction')
        .mockImplementationOnce(async (cb: any) => cb(dailyLogTx))
        .mockImplementationOnce(async (cb: any) => cb(anpDecisionTx));

      const logResult = await runWithTenantContext(TENANT_A_ID, async () => {
        return operationsService.submitDailyLog({
          assetId: ASSET_BOILER_ID,
          checklistTemplateId: TEMPLATE_ID,
          shiftName: 'Evening Shift B',
          responses: [
            {
              itemCode: 'FLUE_GAS_TEMP',
              value: 212.4, // Breaches > 190°C!
            },
            {
              meterCode: 'PUMP_OPERATING_HOURS',
              readingValue: 12150, // Breaches >= 12000 hrs!
            },
          ],
        });
      });

      expect(logResult).toBeDefined();

      const ds = logResult.decisionSupport;
      expect(ds).toBeDefined();
      expect(ds.isBreached).toBe(true);

      // Verify decision_run was executed and persisted
      expect(anpDecisionTx.decisionRun.create).toHaveBeenCalledTimes(1);
      expect(ds.decisionRun.id).toBe('drun-101');
      expect(ds.decisionRun.recommendedAction).toContain(
        'Immediate Boiler Tube Sootblowing & Burner Tuning'
      );

      // Verify high-priority notification alert was inserted into notifications table
      expect(anpDecisionTx.notification.create).toHaveBeenCalledTimes(1);
      expect(ds.notification.notificationType).toBe('HIGH_PRIORITY_ANP_ALERT');
      expect(ds.notification.title).toContain('ANP Benchmark Breach');

      // Verify draft work_order was automatically created
      expect(anpDecisionTx.workOrder.create).toHaveBeenCalledTimes(1);
      expect(ds.draftedWorkOrder.status).toBe('draft');
      expect(ds.draftedWorkOrder.workOrderNumber).toBe(`WO-${currentYear}-00001`);
    });
  });
});

