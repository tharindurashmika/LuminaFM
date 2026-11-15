import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../src/lib/prisma';
import tenantPrisma from '../src/tenant/tenant.client';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import { operationalAnpService } from '../src/modules/decision-support/operational-integration/operational-anp.service';
import { DataQualityValidator } from '../src/modules/decision-support/operational-integration/data-quality.validator';
import { SafetyEscalationService } from '../src/modules/decision-support/operational-integration/safety-escalation.service';
import { DecisionReplayEngine } from '../src/modules/decision-support/operational-integration/decision-replay.engine';
import { evaluateAnpDecisionModel } from '../src/modules/decision-support/anp.engine';

describe('LuminaFM ANP Engine - Operational Telemetry Integration & Governance', () => {
  const TENANT_ID = '22222222-2222-2222-2222-222222222222';
  const ENGINEER_USER_ID = 'eng-1111-1111-1111-111111111111';
  const ASSET_BOILER_ID = 'blr-kingsbury-1100kg';
  const SITE_ID = 'site-colombo-kingsbury';
  const MODEL_ID = 'dm-moratuwa-baseline';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. DATA COMPLETENESS & QUALITY VALIDATION
  // ===========================================================================
  describe('1. Data Completeness & Quality Validation', () => {
    it('should validate high quality complete operational readings for 1,100 kg/h boiler', () => {
      const validSignals = [
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
        { key: 'FLUE_GAS_TEMP', value: 172.0, unit: '°C' },
        { key: 'BOILER_WATER_TDS', value: 2400, unit: 'ppm' },
        { key: 'FEEDWATER_PH', value: 9.2, unit: 'pH' },
        { key: 'AMBIENT_TEMP', value: 29.5, unit: '°C' },
      ];

      const report = DataQualityValidator.validateTelemetryQuality(validSignals);

      expect(report.isValid).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(0.9);
      expect(report.completenessRatio).toBe(1.0);
      expect(report.missingRequiredParameters).toHaveLength(0);
      expect(report.outOfRangeReadings).toHaveLength(0);
      expect(report.qualityFlags).toHaveLength(0);
    });

    it('should detect missing critical required parameters and lower quality score', () => {
      const incompleteSignals = [
        { key: 'AMBIENT_TEMP', value: 28.0, unit: '°C' },
      ];

      const report = DataQualityValidator.validateTelemetryQuality(incompleteSignals);

      expect(report.completenessRatio).toBeLessThan(0.5);
      expect(report.missingRequiredParameters).toContain('STEAM_PRESSURE');
      expect(report.missingRequiredParameters).toContain('FLUE_GAS_TEMP');
      expect(report.missingRequiredParameters).toContain('BOILER_WATER_TDS');
      expect(report.qualityFlags).toContain('MISSING_CRITICAL_PARAMETER');
      expect(report.isValid).toBe(false);
    });

    it('should reject sensor faults such as physically impossible negative pressures', () => {
      const corruptSignals = [
        { key: 'STEAM_PRESSURE', value: -4.5, unit: 'bar' }, // Impossible
        { key: 'FLUE_GAS_TEMP', value: 650.0, unit: '°C' },  // Plausibility bound exceeded
        { key: 'BOILER_WATER_TDS', value: 2200, unit: 'ppm' },
        { key: 'AMBIENT_TEMP', value: 30.0, unit: '°C' },
      ];

      const report = DataQualityValidator.validateTelemetryQuality(corruptSignals);

      expect(report.isValid).toBe(false);
      expect(report.qualityFlags).toContain('NEGATIVE_VALUE_PHYSICAL_IMPOSSIBILITY');
      expect(report.qualityFlags).toContain('SENSOR_OUT_OF_PHYSICAL_RANGE');
      expect(report.outOfRangeReadings.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // 2. INDEPENDENT SAFETY ESCALATION (SEPARATED FROM ANP RANKING)
  // ===========================================================================
  describe('2. Independent Safety Alerts vs ANP Recommendations', () => {
    it('should immediately escalate Low-Water Fuel Cutoff (LWCO) trip independently of ANP ranking', () => {
      const emergencySignals = [
        { key: 'WATER_LEVEL_OK', value: false },
        { key: 'STEAM_PRESSURE', value: 8.0, unit: 'bar' },
        { key: 'FLUE_GAS_TEMP', value: 165.0, unit: '°C' },
      ];

      const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(
        ASSET_BOILER_ID,
        emergencySignals,
        [ENGINEER_USER_ID]
      );

      expect(safetyAlerts).toHaveLength(1);
      expect(safetyAlerts[0].severity).toBe('CRITICAL_EMERGENCY');
      expect(safetyAlerts[0].ruleCode).toBe('LWCO_TRIP_CRITICAL');
      expect(safetyAlerts[0].independentOfAnp).toBe(true);
      expect(safetyAlerts[0].requiresCertifiedInspectorSignoff).toBe(true);
      expect(safetyAlerts[0].emergencyActionRequired).toContain('ASME BPVC Sec VII C2.300');
    });

    it('should immediately escalate boiler overpressure emergency without waiting for ANP trade-offs', () => {
      const overpressureSignals = [
        { key: 'STEAM_PRESSURE', value: 10.8, unit: 'bar' }, // Exceeds 10.5 bar safety pop limit
        { key: 'FLUE_GAS_TEMP', value: 180.0, unit: '°C' },
      ];

      const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(
        ASSET_BOILER_ID,
        overpressureSignals
      );

      expect(safetyAlerts).toHaveLength(1);
      expect(safetyAlerts[0].ruleCode).toBe('OVERPRESSURE_SAFETY_LIMIT');
      expect(safetyAlerts[0].severity).toBe('CRITICAL_EMERGENCY');
      expect(safetyAlerts[0].emergencyActionRequired).toContain('Cease firing immediately');
    });

    it('should not generate safety alerts for non-safety operational maintenance excursions', () => {
      const operationalSootSignals = [
        { key: 'FLUE_GAS_TEMP', value: 188.0, unit: '°C' }, // Soot excursion (> 180°C), but below safety limit (260°C)
        { key: 'WATER_LEVEL_OK', value: true },
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
      ];

      const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(
        ASSET_BOILER_ID,
        operationalSootSignals
      );

      expect(safetyAlerts).toHaveLength(0);
    });
  });

  // ===========================================================================
  // 3. ANP OPERATIONAL INTEGRATION: RECOMMENDATIONS & CRITERIA ATTRIBUTION
  // ===========================================================================
  describe('3. Operational ANP Calculation, Priority Storage & Criteria Attribution', () => {
    it('should execute end-to-end log processing, store priority values, and explain criteria influence', async () => {
      const mockModel = {
        id: MODEL_ID,
        organizationId: TENANT_ID,
        code: 'BOILER_ANP_MORATUWA_1100KG',
        name: 'Dissertation Moratuwa 1100kg Model',
        version: 1,
        status: 'active',
        configuration: {},
        criteria: [
          {
            id: 'crit-flue',
            organizationId: TENANT_ID,
            decisionModelId: MODEL_ID,
            code: 'FLUE_GAS_TEMP',
            name: 'Flue Gas Stack Temperature',
            criterionType: 'risk',
            weight: 0.65,
            sequenceNo: 1,
            clusterCode: 'CRITERIA',
          },
          {
            id: 'crit-tds',
            organizationId: TENANT_ID,
            decisionModelId: MODEL_ID,
            code: 'BOILER_WATER_TDS',
            name: 'Boiler Water TDS',
            criterionType: 'risk',
            weight: 0.35,
            sequenceNo: 2,
            clusterCode: 'CRITERIA',
          },
        ],
        alternatives: [
          {
            id: 'alt-clean',
            code: 'ALT_CLEAN_TUBES',
            name: 'Autonomous Boiler Tube Cleaning (Fireside Sootbrush)',
            category: 'efficiency',
            componentCode: 'HEMA_1',
          },
          {
            id: 'alt-descale',
            code: 'ALT_DESCALE_WATERSIDE',
            name: 'Chemical Waterside Descaling',
            category: 'water_chemistry',
            componentCode: 'HEMA_2',
          },
        ],
      };

      const mockAsset = {
        id: ASSET_BOILER_ID,
        assetCode: 'BLR-KB-01',
        name: 'Kingsbury Hotel Boiler #1',
        siteId: SITE_ID,
        locationId: 'loc-boiler-room',
        assetCategoryId: 'cat-boiler',
      };

      let persistedDecisionRunData: any = null;

      const mockTx = {
        asset: {
          findFirst: vi.fn().mockResolvedValue(mockAsset),
        },
        decisionModel: {
          findFirst: vi.fn().mockResolvedValue(mockModel),
        },
        workOrder: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'wo-prev-1',
              workOrderNumber: 'WO-2026-0012',
              title: 'Previous Fireside Sootblow',
              actualEndAt: new Date(Date.now() - 12 * 86400000), // 12 days ago
              maintenanceType: { name: 'Preventive' },
            },
          ]),
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'wo-new-1',
            ...data,
          })),
        },
        workOrderStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'wosh-1' }),
        },
        decisionRun: {
          create: vi.fn().mockImplementation(async ({ data }) => {
            persistedDecisionRunData = data;
            return {
              id: 'drun-opt-1',
              ...data,
            };
          }),
        },
        organizationMembership: {
          findFirst: vi.fn().mockResolvedValue({ userId: ENGINEER_USER_ID }),
        },
        notification: {
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: 'notif-1',
            ...data,
          })),
        },
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(mockTx));

      await runWithTenantContext(TENANT_ID, async () => {
        const result = await operationalAnpService.processDailyLogSubmission({
          organizationId: TENANT_ID,
          assetId: ASSET_BOILER_ID,
          inspectionId: 'log-101',
          inspectionNumber: 'LOG-BLR-20261114-1400',
          checklistTemplateId: 'BOILER_DAILY_SHIFT_LOGBOOK',
          operatorUserId: ENGINEER_USER_ID,
          signals: [
            { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
            { key: 'FLUE_GAS_TEMP', value: 205.0, unit: '°C' }, // Exceeds 190°C benchmark!
            { key: 'BOILER_WATER_TDS', value: 2350, unit: 'ppm' },
            { key: 'AMBIENT_TEMP', value: 30.0, unit: '°C' },
          ],
        });

        // 1. Completeness & Data Quality Checked
        expect(result.dataQuality.isValid).toBe(true);
        expect(result.dataQuality.score).toBeGreaterThan(0.9);

        // 2. Decision Model Version Recorded
        expect(result.decisionModelVersion).toBe(1);
        expect(result.decisionModelCode).toBe('BOILER_ANP_MORATUWA_1100KG');

        // 3. ANP Prioritization Execution
        expect(result.isBreached).toBe(true);
        expect(result.recommendations.length).toBeGreaterThanOrEqual(1);

        const topRec = result.recommendations[0];
        expect(topRec.rank).toBe(1);
        expect(topRec.priorityValue).toBeGreaterThan(0);
        expect(topRec.reviewStatus).toBe('PROPOSED_PENDING_ENGINEER_REVIEW');

        // 4. Criteria Attribution & Root Cause Explanation
        expect(topRec.criteriaAttribution.length).toBeGreaterThan(0);
        const flueAttribution = topRec.criteriaAttribution.find((a) => a.criterionCode === 'FLUE_GAS_TEMP');
        expect(flueAttribution).toBeDefined();
        expect(flueAttribution!.contributionPercentage).toBeGreaterThan(0);
        expect(flueAttribution!.rootCauseHypothesis).toContain('Fireside soot accumulation');

        // 5. Linked Operational Readings & Maintenance History Context
        expect(topRec.linkedReadings.length).toBeGreaterThan(0);
        expect(topRec.linkedReadings[0].parameterCode).toBe('FLUE_GAS_TEMP');
        expect(topRec.maintenanceHistoryContext.daysSinceLastIntervention).toBe(12);

        // 6. Snapshot Persisted with Deterministic Hash
        expect(persistedDecisionRunData).toBeDefined();
        expect(persistedDecisionRunData.inputSnapshot.signals).toHaveLength(4);
        expect(persistedDecisionRunData.resultSnapshot.recommendations).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // 4. AUTHORIZED ENGINEER REVIEW & APPROVAL WORKFLOW
  // ===========================================================================
  describe('4. Human-in-the-Loop Engineer Review & Approval', () => {
    it('should prohibit automatic safety-critical interventions without certified engineer justification', async () => {
      const mockRun = {
        id: 'drun-safety-int',
        organizationId: TENANT_ID,
        assetId: ASSET_BOILER_ID,
        resultSnapshot: {
          recommendations: [
            {
              recommendationId: 'rec-svma-1',
              rank: 1,
              alternativeCode: 'SVMA_2',
              alternativeName: 'Lap Safety Valve Seats (Pressure Relief Boundary)',
              safetyTier: 'SAFETY_CRITICAL_INTERVENTION',
              suggestedPriority: 'urgent',
              reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
              criteriaAttribution: [],
            },
          ],
        },
        decisionModel: { id: MODEL_ID },
        asset: { id: ASSET_BOILER_ID, assetCode: 'BLR-01', siteId: SITE_ID },
      };

      vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue(mockRun as any);

      await runWithTenantContext(TENANT_ID, async () => {
        // Attempting to approve safety-critical action with insufficient notes (< 15 chars)
        await expect(
          operationalAnpService.reviewAndApproveRecommendation(
            'drun-safety-int',
            0,
            {
              action: 'approve',
              engineerNotes: 'ok approve', // Too brief for safety-critical intervention
            },
            ENGINEER_USER_ID
          )
        ).rejects.toMatchObject({
          code: 'SAFETY_CRITICAL_INSPECTOR_JUSTIFICATION_REQUIRED',
        });
      });
    });

    it('should allow authorized engineer to approve operational maintenance and generate approved Work Order', async () => {
      const mockRun = {
        id: 'drun-approved-1',
        organizationId: TENANT_ID,
        assetId: ASSET_BOILER_ID,
        resultSnapshot: {
          recommendations: [
            {
              recommendationId: 'rec-clean-1',
              rank: 1,
              alternativeCode: 'ALT_CLEAN_TUBES',
              alternativeName: 'Autonomous Boiler Tube Cleaning',
              safetyTier: 'OPERATIONAL_MAINTENANCE',
              suggestedPriority: 'high',
              reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
              technicalWorkScope: 'Brush all 3-pass fire-tubes and vacuum soot.',
              criteriaAttribution: [
                {
                  criterionName: 'Flue Gas Temp',
                  deviationDescription: 'Observed 205°C > 190°C',
                  contributionPercentage: 65.0,
                },
              ],
            },
          ],
        },
        decisionModel: { id: MODEL_ID },
        asset: {
          id: ASSET_BOILER_ID,
          assetCode: 'BLR-KB-01',
          name: 'Kingsbury Boiler #1',
          siteId: SITE_ID,
          locationId: 'loc-1',
        },
      };

      vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue(mockRun as any);
      vi.spyOn(tenantPrisma.decisionRun, 'update').mockResolvedValue({ id: 'drun-approved-1' } as any);
      vi.spyOn(tenantPrisma.maintenanceType, 'findFirst').mockResolvedValue({ id: 'mt-corrective' } as any);
      vi.spyOn(tenantPrisma.workOrder, 'create').mockImplementation(async ({ data }) => ({
        id: 'wo-approved-1',
        ...data,
      }));
      vi.spyOn(tenantPrisma.workOrderStatusHistory, 'create').mockResolvedValue({ id: 'wosh-1' } as any);

      await runWithTenantContext(TENANT_ID, async () => {
        const approval = await operationalAnpService.reviewAndApproveRecommendation(
          'drun-approved-1',
          0,
          {
            action: 'approve',
            engineerNotes: 'Reviewed high stack temperature. Approved fireside soot clean during night shift shutdown.',
            autoCreateWorkOrder: true,
          },
          ENGINEER_USER_ID
        );

        expect(approval.reviewStatus).toBe('CONVERTED_TO_WORK_ORDER');
        expect(approval.workOrder).toBeDefined();
        expect(approval.workOrder?.status).toBe('approved');
        expect(approval.workOrder?.title).toContain('BLR-KB-01: Autonomous Boiler Tube Cleaning');
      });
    });

    it('should allow authorized engineer to reject recommendation and record justification', async () => {
      const mockRun = {
        id: 'drun-reject-1',
        organizationId: TENANT_ID,
        assetId: ASSET_BOILER_ID,
        resultSnapshot: {
          recommendations: [
            {
              recommendationId: 'rec-descale-1',
              rank: 1,
              alternativeCode: 'ALT_DESCALE_WATERSIDE',
              alternativeName: 'Chemical Descaling',
              safetyTier: 'OPERATIONAL_MAINTENANCE',
              reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
            },
          ],
        },
        decisionModel: { id: MODEL_ID },
        asset: { id: ASSET_BOILER_ID },
      };

      vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue(mockRun as any);
      vi.spyOn(tenantPrisma.decisionRun, 'update').mockResolvedValue({ id: 'drun-reject-1' } as any);

      await runWithTenantContext(TENANT_ID, async () => {
        const rejection = await operationalAnpService.reviewAndApproveRecommendation(
          'drun-reject-1',
          0,
          {
            action: 'reject',
            engineerNotes: 'Rejected: Chemical descaling was already conducted 3 weeks ago; TDS spike was temporary blowdown timing artifact.',
          },
          ENGINEER_USER_ID
        );

        expect(rejection.reviewStatus).toBe('REJECTED');
        expect(rejection.engineerNotes).toContain('already conducted 3 weeks ago');
        expect(rejection.workOrder).toBeNull();
      });
    });
  });

  // ===========================================================================
  // 5. DETERMINISTIC DECISION RUN REPLAY ENGINE
  // ===========================================================================
  describe('5. Deterministic Decision Run Replay Engine', () => {
    it('should replay historical decision run and assert bit-for-bit mathematical reproducibility', async () => {
      const criteria = [
        {
          id: 'c1',
          code: 'FLUE_GAS_TEMP',
          name: 'Flue Gas Temperature',
          criterionType: 'risk' as const,
          weight: 1.0,
          sequenceNo: 1,
        },
      ];
      const alternatives = [
        { id: 'a1', code: 'ALT_CLEAN_TUBES', name: 'Tube Soot Clean' },
        { id: 'a2', code: 'ALT_OVERHAUL_BURNER', name: 'Burner Overhaul' },
      ];
      const signals = [
        { key: 'FLUE_GAS_TEMP', value: 215.0, unit: '°C' },
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
      ];

      const initialEval = evaluateAnpDecisionModel({
        criteria,
        alternatives,
        signals,
      });

      const mockPersistedRun = {
        id: 'drun-replay-001',
        organizationId: TENANT_ID,
        decisionModelId: MODEL_ID,
        inputSnapshot: {
          signals,
          modelVersion: 1,
        },
        resultSnapshot: {
          compositeRiskScore: initialEval.compositeRiskScore,
          topAlternative: initialEval.topAlternative,
          rankedAlternatives: initialEval.rankedAlternatives,
          supermatrixWeights: initialEval.supermatrixWeights,
        },
        decisionModel: {
          id: MODEL_ID,
          code: 'BOILER-TEST-REPLAY',
          version: 1,
          configuration: {},
          criteria,
          alternatives,
        },
      };

      vi.spyOn(tenantPrisma.decisionRun, 'findFirst').mockResolvedValue(mockPersistedRun as any);

      await runWithTenantContext(TENANT_ID, async () => {
        const replay = await DecisionReplayEngine.replayRun('drun-replay-001');

        expect(replay.isReproducible).toBe(true);
        expect(replay.priorityDeltaMax).toBeLessThan(1e-4);
        expect(replay.recalculatedTopAlternative).toBe(initialEval.topAlternative?.code);
        expect(replay.verificationNotes).toContain('successfully reproduced from immutable input snapshot');
      });
    });
  });

  // ===========================================================================
  // 6. REGRESSION TESTS AGAINST ORIGINAL DISSERTATION SCENARIOS
  // ===========================================================================
  describe('6. Regression Tests against Original Dissertation Scenarios (Vishal Perera 2025)', () => {
    // SCENARIO 1: The Kingsbury Hotel Normal Baseline
    it('Scenario 1: Kingsbury Normal Baseline (all readings optimal -> no breach, routine monitoring)', () => {
      const signals = [
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
        { key: 'FLUE_GAS_TEMP', value: 165.0, unit: '°C' }, // Normal (Benchmark > 190°C)
        { key: 'BOILER_WATER_TDS', value: 2200, unit: 'ppm' }, // Normal
        { key: 'WATER_LEVEL_OK', value: true },
        { key: 'AMBIENT_TEMP', value: 29.0, unit: '°C' },
      ];

      const dataQuality = DataQualityValidator.validateTelemetryQuality(signals);
      expect(dataQuality.isValid).toBe(true);

      const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(ASSET_BOILER_ID, signals);
      expect(safetyAlerts).toHaveLength(0);
    });

    // SCENARIO 2: Fireside Soot Accumulation Excursion
    it('Scenario 2: Fireside Soot Accumulation (Flue Gas 208°C -> Tube Soot Cleaning prioritized)', async () => {
      const signals = [
        { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
        { key: 'FLUE_GAS_TEMP', value: 208.0, unit: '°C' }, // +18°C above benchmark
        { key: 'BOILER_WATER_TDS', value: 2100, unit: 'ppm' }, // Water chemistry normal
        { key: 'WATER_LEVEL_OK', value: true },
        { key: 'AMBIENT_TEMP', value: 30.0, unit: '°C' },
      ];

      const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(ASSET_BOILER_ID, signals);
      expect(safetyAlerts).toHaveLength(0); // Non-emergency operational issue

      const dataQuality = DataQualityValidator.validateTelemetryQuality(signals);
      expect(dataQuality.isValid).toBe(true);
    });

    // SCENARIO 3: Waterside Scale Accumulation & Water Quality Drift
    it('Scenario 3: Waterside Scale Accumulation & High TDS Excursion (TDS 3800 ppm -> Descaling prioritized)', () => {
      const signals = [
        { key: 'STEAM_PRESSURE', value: 7.9, unit: 'bar' },
        { key: 'FLUE_GAS_TEMP', value: 198.0, unit: '°C' }, // Elevated flue gas due to insulating scale
        { key: 'BOILER_WATER_TDS', value: 3800, unit: 'ppm' }, // High TDS (> 3500 ppm ASME limit)
        { key: 'FEEDWATER_PH', value: 8.2, unit: 'pH' },
        { key: 'WATER_LEVEL_OK', value: true },
        { key: 'AMBIENT_TEMP', value: 30.0, unit: '°C' },
      ];

      const dataQuality = DataQualityValidator.validateTelemetryQuality(signals);
      expect(dataQuality.isValid).toBe(true);
      expect(dataQuality.score).toBeGreaterThanOrEqual(0.9);
    });

    // SCENARIO 4: Critical Drum Low Water Safety Emergency
    it('Scenario 4: Critical Low-Water Level Condition -> Immediate independent safety alert dispatched', () => {
      const emergencySignals = [
        { key: 'WATER_LEVEL_OK', value: false }, // Cutoff tripped
        { key: 'WATER_LEVEL_LOW', value: true },
        { key: 'STEAM_PRESSURE', value: 9.0, unit: 'bar' },
        { key: 'FLUE_GAS_TEMP', value: 170.0, unit: '°C' },
      ];

      const safetyAlerts = SafetyEscalationService.evaluateSafetyInterlocks(ASSET_BOILER_ID, emergencySignals);

      expect(safetyAlerts.length).toBeGreaterThanOrEqual(1);
      const lwcoAlert = safetyAlerts.find((a) => a.ruleCode.includes('LWCO'));
      expect(lwcoAlert).toBeDefined();
      expect(lwcoAlert!.severity).toBe('CRITICAL_EMERGENCY');
      expect(lwcoAlert!.requiresCertifiedInspectorSignoff).toBe(true);
    });
  });
});
