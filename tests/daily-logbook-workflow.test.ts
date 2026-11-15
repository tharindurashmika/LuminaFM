import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boilerLogbookService } from '../src/modules/boiler/boiler-logbook.service';
import {
  BoilerAssetNotFoundError,
  BoilerParameterRangeViolationError,
  RequiredMeasurementMissingError,
  AmendmentReasonRequiredError,
  LogbookNotFoundError,
} from '../src/modules/boiler/boiler.errors';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import tenantPrisma from '../src/tenant/tenant.client';
import prisma from '../src/lib/prisma';
import { auditAndAttachmentsService } from '../src/modules/audit/audit.service';
import { decisionSupportEventBus } from '../src/modules/decision-support/decision-support.events';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT_ID = '22222222-2222-4222-8222-222222222222';
const BOILER_ASSET_ID = 'asset-boiler-001';
const OPERATOR_USER_ID = 'user-operator-001';

describe('LuminaFM Daily Logbook & Inspection Workflow', () => {
  const mockBoiler = {
    id: BOILER_ASSET_ID,
    organizationId: TENANT_ID,
    assetCode: 'BLR-001',
    name: 'Main Steam Boiler (1,100 kg/h Kingsbury Baseline)',
    status: 'in_service' as const,
    criticality: 'critical' as const,
    site: { id: 'site-colombo-001', name: 'Colombo Hotel' },
    location: { id: 'loc-boiler-room', name: 'Basement Boiler Room' },
    assetCategory: { id: 'cat-boilers', code: 'BOILERS', name: 'Steam Boilers' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. BOILER & SHIFT SELECTION
  // ===========================================================================
  describe('1. Boiler & Operating Period Selection', () => {
    it('should list assigned boilers with required operational measurement definitions', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findMany').mockResolvedValue([mockBoiler as any]);

        const boilers = await boilerLogbookService.listAssignedBoilers();

        expect(boilers).toHaveLength(1);
        expect(boilers[0].assetCode).toBe('BLR-001');
        expect(boilers[0].requiredMeasurements.length).toBeGreaterThan(0);

        const requiredCodes = boilers[0].requiredMeasurements.map((m) => m.code);
        expect(requiredCodes).toContain('operating_steam_pressure');
        expect(requiredCodes).toContain('flue_gas_temperature');
        expect(requiredCodes).toContain('feedwater_pressure');
        expect(requiredCodes).toContain('feedwater_temperature');
      });
    });

    it('should reject selection of a boiler belonging to another organization', async () => {
      await runWithTenantContext(OTHER_TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(null);

        await expect(
          boilerLogbookService.saveDailyLogbook({
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            operatingPeriod: '08:00',
            status: 'draft',
            readings: { operating_steam_pressure: 8.5 },
          })
        ).rejects.toThrow(BoilerAssetNotFoundError);
      });
    });
  });

  // ===========================================================================
  // 2. SAVING INCOMPLETE ENTRIES AS DRAFTS
  // ===========================================================================
  describe('2. Incomplete Entries as Drafts', () => {
    it('should allow saving incomplete entries as draft without failing on missing required measurements', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: {
              findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }),
            },
            inspection: {
              upsert: vi.fn().mockResolvedValue({
                id: 'insp-draft-001',
                inspectionNumber: 'DRAFT-BLR-20261115-0800',
                status: 'draft',
              }),
            },
            attachment: { create: vi.fn() },
          });
        });

        // Only 1 parameter entered out of the 5 required parameters
        const draft = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            operatingPeriod: '08:00',
            status: 'draft', // Draft mode
            readings: {
              operating_steam_pressure: 8.4,
            },
            operatorNotes: 'Partial draft saved during morning startup',
          },
          OPERATOR_USER_ID
        );

        expect(draft.status).toBe('draft');
        expect(draft.logNumber).toContain('DRAFT-BLR-');
        expect(draft.readings).toHaveLength(1);
        expect(draft.readings[0].parameterCode).toBe('operating_steam_pressure');
        expect(draft.readings[0].value).toBe(8.4);
        expect(draft.readings[0].source).toBe('manual');
        expect(draft.completedAt).toBeNull();
      });
    });

    it('should still reject physically impossible sensor values even when saving as draft', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);

        // Negative gauge pressure is physically impossible
        await expect(
          boilerLogbookService.saveDailyLogbook(
            {
              assetId: BOILER_ASSET_ID,
              logDate: '2026-11-15',
              shift: 'SHIFT_A',
              operatingPeriod: '08:00',
              status: 'draft',
              readings: {
                operating_steam_pressure: -5.0,
              },
            },
            OPERATOR_USER_ID
          )
        ).rejects.toThrow(BoilerParameterRangeViolationError);
      });
    });
  });

  // ===========================================================================
  // 3. SUBMITTING COMPLETED RECORDS & REQUIRED MEASUREMENTS VALIDATION
  // ===========================================================================
  describe('3. Required Measurements Validation Before Submission', () => {
    it('should strictly reject completed submission when required operational measurements are missing', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);

        // Submitting with missing required measurements: flue_gas_temperature, feedwater_pressure, etc.
        await expect(
          boilerLogbookService.saveDailyLogbook(
            {
              assetId: BOILER_ASSET_ID,
              logDate: '2026-11-15',
              shift: 'SHIFT_A',
              operatingPeriod: '08:00',
              status: 'completed', // Submitting as completed!
              readings: {
                operating_steam_pressure: 8.5,
                steam_temperature: 165.0,
                // Missing: flue_gas_temperature, feedwater_pressure, feedwater_temperature
              },
            },
            OPERATOR_USER_ID
          )
        ).rejects.toThrow(RequiredMeasurementMissingError);
      });
    });

    it('should successfully submit completed record when all required measurements are present and within range', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: {
              findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }),
            },
            inspection: {
              upsert: vi.fn().mockResolvedValue({
                id: 'insp-completed-001',
                inspectionNumber: 'LOG-BLR-20261115-0800',
                status: 'completed',
                overallResult: 'pass',
              }),
            },
            attachment: { create: vi.fn() },
          });
        });

        const anpEmitSpy = vi.spyOn(decisionSupportEventBus, 'emitDailyLogSubmitted').mockResolvedValue([]);

        const result = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            operatingPeriod: '08:00',
            status: 'completed',
            readings: {
              operating_steam_pressure: 8.5,
              steam_temperature: 166.0,
              flue_gas_temperature: 175.0,
              feedwater_pressure: 5.0,
              feedwater_temperature: 88.0,
              return_condensate_temperature: 88.0,
              pump_operating_hours: 8500,
              burner_operating_hours: 1200,
              exhaust_gas_o2: 4.0,
              exhaust_gas_co: 50,
            },
            checklists: {
              SIGHT_GLASS_LEVEL: 'NORMAL_CENTRELINE',
              BURNER_FLAME_APPEARANCE: 'BRIGHT_YELLOW_STABLE',
              STEAM_LEAKS_ACOUSTIC: 'NO_LEAKS',
              SAFETY_VALVE_CONDITION: 'SEATED_TIGHT_NO_LEAK',
              BOTTOM_BLOWDOWN_LINE: 'FREE_FLOW_CLEAN',
              WATER_SOFTENER_HARDNESS: 'ZERO_HARDNESS',
            },
            operatorNotes: 'All systems normal. Sight glass purged and verified.',
          },
          OPERATOR_USER_ID
        );

        expect(result.status).toBe('completed');
        expect(result.logNumber).toContain('LOG-BLR-');
        expect(result.overallResult).toBe('pass');
        expect(result.anomalies).toHaveLength(0);
        expect(result.readings.length).toBe(10);
        expect(result.checklists.length).toBe(6);
        expect(result.operatorUserId).toBe(OPERATOR_USER_ID);
        expect(result.completedAt).not.toBeNull();
      });
    });

    it('should promote an existing draft to completed status through submitDraftLogbook', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: {
              findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }),
            },
            inspection: {
              upsert: vi.fn().mockResolvedValue({
                id: 'insp-draft-promote-01',
                inspectionNumber: 'LOG-BLR-20261115-1000',
                status: 'completed',
                overallResult: 'pass',
              }),
            },
            attachment: { create: vi.fn() },
          });
        });

        // 1. Create a draft with all required values entered
        const draft = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            operatingPeriod: '10:00',
            status: 'draft',
            readings: {
              operating_steam_pressure: 8.6,
              steam_temperature: 165.0,
              flue_gas_temperature: 178.0,
              feedwater_pressure: 5.1,
              feedwater_temperature: 87.5,
            },
          },
          OPERATOR_USER_ID
        );

        expect(draft.status).toBe('draft');

        // 2. Submit the draft
        const submitted = await boilerLogbookService.submitDraftLogbook(
          draft.id,
          OPERATOR_USER_ID
        );

        expect(submitted.status).toBe('completed');
        expect(submitted.completedAt).not.toBeNull();
      });
    });
  });

  // ===========================================================================
  // 4. TRACEABLE AMENDMENTS RATHER THAN SILENT OVERWRITES
  // ===========================================================================
  describe('4. Traceable Amendments Rather than Silent Overwrites', () => {
    it('should strictly reject amendments if justification reason is empty with AmendmentReasonRequiredError', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }) },
            inspection: { upsert: vi.fn().mockResolvedValue({ id: 'insp-comp-01' }) },
            attachment: { create: vi.fn() },
          });
        });

        // Create completed logbook
        const logbook = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            operatingPeriod: '08:00',
            status: 'completed',
            readings: {
              operating_steam_pressure: 8.5,
              steam_temperature: 165.0,
              flue_gas_temperature: 175.0,
              feedwater_pressure: 5.0,
              feedwater_temperature: 88.0,
            },
          },
          OPERATOR_USER_ID
        );

        // Attempt amendment without a reason
        await expect(
          boilerLogbookService.amendLogbookReading(logbook.id, {
            parameterCode: 'operating_steam_pressure',
            amendedValue: 8.45,
            reason: '', // Empty reason!
          })
        ).rejects.toThrow(AmendmentReasonRequiredError);

        await expect(
          boilerLogbookService.amendLogbookReading(logbook.id, {
            parameterCode: 'operating_steam_pressure',
            amendedValue: 8.45,
            reason: '   ', // Whitespace only
          })
        ).rejects.toThrow(AmendmentReasonRequiredError);
      });
    });

    it('should create a traceable amendment preserving original reading and creating audit trail', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }) },
            inspection: { upsert: vi.fn().mockResolvedValue({ id: 'insp-amend-target-01' }) },
            attachment: { create: vi.fn() },
          });
        });

        const auditSpy = vi.spyOn(auditAndAttachmentsService, 'recordAuditLog').mockResolvedValue({} as any);

        // Initial completed submission with a typo: operator keyed 9.4 instead of 8.4 bar
        const logbook = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            operatingPeriod: '08:00',
            status: 'completed',
            readings: {
              operating_steam_pressure: 9.4, // Overpressure typo
              steam_temperature: 165.0,
              flue_gas_temperature: 175.0,
              feedwater_pressure: 5.0,
              feedwater_temperature: 88.0,
            },
          },
          OPERATOR_USER_ID
        );

        expect(logbook.readings.find((r) => r.parameterCode === 'operating_steam_pressure')?.value).toBe(9.4);
        expect(logbook.amendments).toHaveLength(0);

        // Operator performs traceable amendment with mandatory reason
        const amendedLogbook = await boilerLogbookService.amendLogbookReading(
          logbook.id,
          {
            parameterCode: 'operating_steam_pressure',
            amendedValue: 8.4,
            reason: 'Operator keyed 9.4 instead of 8.4 bar due to parallax on analog header gauge. Corrected after cross-verification with digital pressure transmitter.',
            evidenceUri: 's3://luminafm-evidence/calibration/pressure-check.jpg',
          },
          OPERATOR_USER_ID
        );

        // 1. Verify amendment record is captured
        expect(amendedLogbook.amendments).toHaveLength(1);
        const amendment = amendedLogbook.amendments[0];
        expect(amendment.originalValue).toBe(9.4);
        expect(amendment.amendedValue).toBe(8.4);
        expect(amendment.unit).toBe('bar');
        expect(amendment.reason).toContain('parallax on analog header gauge');
        expect(amendment.evidenceUri).toContain('pressure-check.jpg');

        // 2. Verify reading reflects amended value and notes
        const updatedReading = amendedLogbook.readings.find(
          (r) => r.parameterCode === 'operating_steam_pressure'
        );
        expect(updatedReading?.value).toBe(8.4);
        expect(updatedReading?.isAmended).toBe(true);
        expect(updatedReading?.amendmentCount).toBe(1);
        expect(updatedReading?.notes).toContain('AMENDED');
        expect(updatedReading?.notes).toContain('parallax on analog header gauge');

        // 3. Verify audit log was recorded
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AMEND_READING',
            entityType: 'meter_reading',
            oldValues: { value: 9.4, unit: 'bar' },
            newValues: expect.objectContaining({
              value: 8.4,
              reason: expect.stringContaining('parallax'),
            }),
          })
        );
      });
    });
  });

  // ===========================================================================
  // 5. REVIEW PREVIOUS ENTRIES (LIST & DETAIL MODAL)
  // ===========================================================================
  describe('5. Review Previous Entries & Historical Audit', () => {
    it('should retrieve detailed logbook record including readings, checklists, observations and amendments', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }) },
            inspection: { upsert: vi.fn().mockResolvedValue({ id: 'insp-rev-001' }) },
            attachment: { create: vi.fn() },
          });
        });

        const created = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_B',
            operatingPeriod: '14:00',
            status: 'completed',
            readings: {
              operating_steam_pressure: 8.5,
              steam_temperature: 165.0,
              flue_gas_temperature: 176.0,
              feedwater_pressure: 5.0,
              feedwater_temperature: 89.0,
            },
            observations: [
              {
                category: 'COMBUSTION',
                severity: 'INFO',
                observationText: 'Flame modulation smooth during afternoon laundry steam surge.',
              },
            ],
            attachments: [
              {
                fileName: 'burner-flame-1400.jpg',
                storageUri: 's3://uploads/burner.jpg',
                caption: 'Flame observation at 14:00',
              },
            ],
          },
          OPERATOR_USER_ID
        );

        const retrieved = await boilerLogbookService.getDailyLogbookById(created.id);

        expect(retrieved.id).toBe(created.id);
        expect(retrieved.shift).toBe('SHIFT_B');
        expect(retrieved.operatingPeriod).toBe('14:00');
        expect(retrieved.observations).toHaveLength(1);
        expect(retrieved.observations[0].observationText).toContain('laundry steam surge');
        expect(retrieved.attachments).toHaveLength(1);
        expect(retrieved.attachments[0].fileName).toBe('burner-flame-1400.jpg');
      });
    });

    it('should filter historical logbooks by shift, status, and asset', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        const list = await boilerLogbookService.listDailyLogbooks({
          assetId: BOILER_ASSET_ID,
          shift: 'SHIFT_A',
          status: 'completed',
        });

        expect(Array.isArray(list)).toBe(true);
      });
    });

    it('should throw LogbookNotFoundError when querying non-existent logbook', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.inspection, 'findFirst').mockResolvedValue(null);

        await expect(
          boilerLogbookService.getDailyLogbookById('non-existent-log-id')
        ).rejects.toThrow(LogbookNotFoundError);
      });
    });
  });

  // ===========================================================================
  // 6. PREPARATION OF DATA CONTRACTS FOR ANP ENGINE
  // ===========================================================================
  describe('6. Data Contracts for ANP Decision Support Engine', () => {
    it('should normalize telemetry signals and trigger ANP event bus on empirical breach', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoiler as any);
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          return callback({
            checklistTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 'tmpl-001' }) },
            inspection: { upsert: vi.fn().mockResolvedValue({ id: 'insp-anp-01' }) },
            attachment: { create: vi.fn() },
          });
        });

        const anpEmitSpy = vi.spyOn(decisionSupportEventBus, 'emitDailyLogSubmitted').mockResolvedValue([
          { recommendedAction: 'Clean fire-tubes' },
        ]);

        // Submit completed logbook with flue_gas_temperature = 205°C (> 190°C empirical benchmark)
        const result = await boilerLogbookService.saveDailyLogbook(
          {
            assetId: BOILER_ASSET_ID,
            logDate: '2026-11-15',
            shift: 'SHIFT_C',
            operatingPeriod: '22:00',
            status: 'completed',
            readings: {
              operating_steam_pressure: 8.5,
              steam_temperature: 165.0,
              flue_gas_temperature: 205.0, // Benchmark breach!
              feedwater_pressure: 5.0,
              feedwater_temperature: 88.0,
            },
          },
          OPERATOR_USER_ID
        );

        expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
        expect(result.anomalies[0].parameterCode).toBe('flue_gas_temperature');
        expect(result.anomalies[0].thresholdValue).toBe(190.0);

        // Verify ANP event contract
        expect(anpEmitSpy).toHaveBeenCalledTimes(1);
        const payload = anpEmitSpy.mock.calls[0][0];
        expect(payload.organizationId).toBe(TENANT_ID);
        expect(payload.assetId).toBe(BOILER_ASSET_ID);
        expect(payload.operatorUserId).toBe(OPERATOR_USER_ID);

        const flueGasSignal = payload.signals.find((s) => s.key === 'FLUE_GAS_TEMP');
        expect(flueGasSignal).toBeDefined();
        expect(flueGasSignal?.value).toBe(205.0);
      });
    });
  });
});
