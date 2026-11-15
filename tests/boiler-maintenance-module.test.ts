import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boilerService } from '../src/modules/boiler/boiler.service';
import {
  BOILER_RESEARCH_SCOPE,
  BOILER_PHYSICAL_SUBSYSTEMS,
  BOILER_MEASUREMENT_POINTS,
  BOILER_WALKTHROUGH_CHECKPOINTS,
} from '../src/modules/boiler/boiler.constants';
import {
  BoilerCapacityOutOfRangeError,
  BoilerParameterRangeViolationError,
  BoilerAssetNotFoundError,
} from '../src/modules/boiler/boiler.errors';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import tenantPrisma from '../src/tenant/tenant.client';
import { workOrdersService } from '../src/modules/work-orders/work-orders.service';
import { auditAndAttachmentsService } from '../src/modules/audit/audit.service';
import { decisionSupportEventBus } from '../src/modules/decision-support/decision-support.events';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TENANT_ID = '22222222-2222-4222-8222-222222222222';
const BOILER_ASSET_ID = 'asset-boiler-001';
const USER_OPERATOR_ID = 'user-operator-001';

describe('LuminaFM Specialized Boiler Maintenance Module', () => {
  const mockBoilerAsset = {
    id: BOILER_ASSET_ID,
    organizationId: TENANT_ID,
    siteId: 'site-colombo-001',
    locationId: 'loc-boiler-room-001',
    assetCategoryId: 'cat-boilers-001',
    assetCode: 'BLR-001',
    name: 'Main Steam Boiler (Kingsbury Baseline)',
    status: 'in_service' as const,
    criticality: 'critical' as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. DISSERTATION RESEARCH SCOPE & CAPACITY BOUNDARY ENFORCEMENT
  // ===========================================================================
  describe('1. Dissertation Research Scope & Capacity Boundaries', () => {
    it('should accept valid oil-fired fire-tube boiler capacity within scope (1,000 to 1,800 kg/h)', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'count').mockResolvedValue(0);
        vi.spyOn(tenantPrisma.workOrder, 'count').mockResolvedValue(0);

        // Test with dissertation baseline capacity: 1,100 kg/h (Kingsbury Hotel)
        const profile = await boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
          boilerType: 'OIL_FIRED_FIRE_TUBE',
          steamCapacityKgPerHour: 1100,
          fuelType: 'HEAVY_FUEL_OIL_180_CST',
          nominalOperatingPressureBar: 8.5,
          burnerModel: 'Riello Press 140 T/G',
        });

        expect(profile.specifications.steamCapacityKgPerHour).toBe(1100);
        expect(profile.specifications.boilerType).toBe('OIL_FIRED_FIRE_TUBE');
        expect(profile.specifications.nominalOperatingPressureBar).toBe(8.5);
      });
    });

    it('should accept lower boundary (1,000 kg/h) and upper boundary (1,800 kg/h)', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'count').mockResolvedValue(0);
        vi.spyOn(tenantPrisma.workOrder, 'count').mockResolvedValue(0);

        const lowerProfile = await boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
          boilerType: 'OIL_FIRED_FIRE_TUBE',
          steamCapacityKgPerHour: 1000,
          fuelType: 'HEAVY_FUEL_OIL_180_CST',
        });
        expect(lowerProfile.specifications.steamCapacityKgPerHour).toBe(1000);

        const upperProfile = await boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
          boilerType: 'OIL_FIRED_FIRE_TUBE',
          steamCapacityKgPerHour: 1800,
          fuelType: 'FURNACE_OIL',
        });
        expect(upperProfile.specifications.steamCapacityKgPerHour).toBe(1800);
      });
    });

    it('should strictly reject boiler capacity below 1,000 kg/h with BoilerCapacityOutOfRangeError', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);

        await expect(
          boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
            boilerType: 'OIL_FIRED_FIRE_TUBE',
            steamCapacityKgPerHour: 750, // Out of scope (< 1000)
            fuelType: 'DIESEL_AUTO_DIESEL',
          })
        ).rejects.toThrow(BoilerCapacityOutOfRangeError);

        await expect(
          boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
            boilerType: 'OIL_FIRED_FIRE_TUBE',
            steamCapacityKgPerHour: 999, // Just below boundary
            fuelType: 'DIESEL_AUTO_DIESEL',
          })
        ).rejects.toThrow(BoilerCapacityOutOfRangeError);
      });
    });

    it('should strictly reject boiler capacity above 1,800 kg/h with BoilerCapacityOutOfRangeError', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);

        await expect(
          boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
            boilerType: 'OIL_FIRED_FIRE_TUBE',
            steamCapacityKgPerHour: 2500, // Out of scope (> 1800)
            fuelType: 'HEAVY_FUEL_OIL_180_CST',
          })
        ).rejects.toThrow(BoilerCapacityOutOfRangeError);

        await expect(
          boilerService.createOrUpdateBoilerProfile(BOILER_ASSET_ID, {
            boilerType: 'OIL_FIRED_FIRE_TUBE',
            steamCapacityKgPerHour: 1801, // Just above boundary
            fuelType: 'HEAVY_FUEL_OIL_180_CST',
          })
        ).rejects.toThrow(BoilerCapacityOutOfRangeError);
      });
    });

    it('should throw BoilerAssetNotFoundError when asset does not exist in tenant', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(null);

        await expect(
          boilerService.createOrUpdateBoilerProfile('non-existent-id', {
            boilerType: 'OIL_FIRED_FIRE_TUBE',
            steamCapacityKgPerHour: 1100,
            fuelType: 'HEAVY_FUEL_OIL_180_CST',
          })
        ).rejects.toThrow(BoilerAssetNotFoundError);
      });
    });
  });

  // ===========================================================================
  // 2. THE 7 PHYSICAL SUBSYSTEMS & 11 COMPONENT GROUPS (DISSERTATION CH. 4.2)
  // ===========================================================================
  describe('2. The 7 Physical Subsystems & Empirical Component Hierarchy', () => {
    it('should structure all 7 physical subsystems correctly in boiler profile', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'count').mockResolvedValue(2);
        vi.spyOn(tenantPrisma.workOrder, 'count').mockResolvedValue(1);

        const profile = await boilerService.getBoilerProfile(BOILER_ASSET_ID);

        expect(profile.physicalSubsystems).toHaveLength(6); // 6 subsystem groupings containing the 7 domains
        const subsystemCodes = profile.physicalSubsystems.map((s) => s.code);
        expect(subsystemCodes).toContain('FEED_WATER_SYSTEM');
        expect(subsystemCodes).toContain('STEAM_GENERATION_SYSTEM');
        expect(subsystemCodes).toContain('FUEL_AND_COMBUSTION_SYSTEM');
        expect(subsystemCodes).toContain('EXHAUST_GAS_SYSTEM');
        expect(subsystemCodes).toContain('WATER_TREATMENT_SYSTEM');
        expect(subsystemCodes).toContain('SAFETY_AND_INSTRUMENTATION_SYSTEM');

        // Check Feed Water System components
        const feedWater = profile.physicalSubsystems.find((s) => s.code === 'FEED_WATER_SYSTEM');
        expect(feedWater?.components.map((c) => c.code)).toEqual([
          'FEED_PUMP',
          'ECONOMIZER',
          'FEED_WATER_TANK',
        ]);

        // Check Steam Generation components
        const steamGen = profile.physicalSubsystems.find((s) => s.code === 'STEAM_GENERATION_SYSTEM');
        expect(steamGen?.components.map((c) => c.code)).toEqual([
          'HEAT_EXCHANGER_TUBES',
          'BOILER_SHELL',
        ]);

        // Check Fuel & Combustion components
        const fuelComb = profile.physicalSubsystems.find((s) => s.code === 'FUEL_AND_COMBUSTION_SYSTEM');
        expect(fuelComb?.components.map((c) => c.code)).toEqual([
          'BURNER_ASSEMBLY',
          'COMBUSTION_CHAMBER',
        ]);
      });
    });

    it('should include empirical measurement points and walkthrough checkpoints', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'count').mockResolvedValue(0);
        vi.spyOn(tenantPrisma.workOrder, 'count').mockResolvedValue(0);

        const profile = await boilerService.getBoilerProfile(BOILER_ASSET_ID);

        // 10 empirical parameters defined in BOILER_MEASUREMENT_POINTS
        expect(profile.configuredMeasurementPoints).toBeDefined();
        expect(profile.configuredMeasurementPoints['flue_gas_temperature']).toMatchObject({
          code: 'flue_gas_temperature',
          unit: 'deg_c',
          nominalRange: { min: 160.0, max: 185.0 },
          benchmarkThreshold: { operator: '>', value: 190.0 },
        });

        // 6 Walkthrough checkpoints
        expect(profile.walkthroughCheckpoints).toHaveLength(6);
        const checkpointCodes = profile.walkthroughCheckpoints.map((c) => c.code);
        expect(checkpointCodes).toContain('SIGHT_GLASS_LEVEL');
        expect(checkpointCodes).toContain('BURNER_FLAME_APPEARANCE');
        expect(checkpointCodes).toContain('STEAM_LEAKS_ACOUSTIC');
        expect(checkpointCodes).toContain('SAFETY_VALVE_CONDITION');
        expect(checkpointCodes).toContain('BOTTOM_BLOWDOWN_LINE');
        expect(checkpointCodes).toContain('WATER_SOFTENER_HARDNESS');
      });
    });
  });

  // ===========================================================================
  // 3. 2-HOURLY SHIFT LOGGING, PHYSICAL RANGE & BENCHMARK VALIDATION
  // ===========================================================================
  describe('3. 2-Hourly Shift Logging & Physical Instrument Range Validation', () => {
    it('should reject readings violating physical instrument limits with BoilerParameterRangeViolationError', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);

        // Flue gas physical range is 50 - 350 °C; 450 °C is physically impossible or burning stack
        await expect(
          boilerService.submitBoilerShiftLog(BOILER_ASSET_ID, {
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            logTime: '08:00',
            readings: {
              flue_gas_temperature: 450.0,
            },
          })
        ).rejects.toThrow(BoilerParameterRangeViolationError);

        // Operating pressure physical range is 0 - 15 bar; -2.0 bar is invalid gauge reading
        await expect(
          boilerService.submitBoilerShiftLog(BOILER_ASSET_ID, {
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            logTime: '10:00',
            readings: {
              operating_steam_pressure: -2.0,
            },
          })
        ).rejects.toThrow(BoilerParameterRangeViolationError);
      });
    });

    it('should successfully record normal 2-hourly shift readings without anomalies', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.checklistTemplate, 'findFirst').mockResolvedValue({
          id: 'tmpl-boiler-shift',
        } as any);
        vi.spyOn(tenantPrisma.inspection, 'create').mockResolvedValue({
          id: 'insp-log-001',
          overallResult: 'pass',
        } as any);

        const result = await boilerService.submitBoilerShiftLog(BOILER_ASSET_ID, {
          logDate: '2026-11-15',
          shift: 'SHIFT_A',
          logTime: '08:00',
          operatorUserId: USER_OPERATOR_ID,
          operatorNotes: 'Morning shift start, smooth burner modulation at 8.4 bar.',
          readings: {
            operating_steam_pressure: 8.4, // Nominal: 8.0 - 9.0
            steam_temperature: 165.0, // Nominal: 160 - 170
            flue_gas_temperature: 175.0, // Clean nominal (160 - 185)
            feedwater_pressure: 5.2, // Nominal: 4.0 - 6.0
            feedwater_temperature: 88.0, // Nominal: 85 - 90
            exhaust_gas_o2: 4.1, // Nominal: 3.0 - 4.5
            exhaust_gas_co: 65, // Nominal: 0 - 100
          },
          walkthroughResults: {
            SIGHT_GLASS_LEVEL: 'NORMAL_CENTRELINE',
            BURNER_FLAME_APPEARANCE: 'BRIGHT_YELLOW_STABLE',
            STEAM_LEAKS_ACOUSTIC: 'NO_LEAKS',
            SAFETY_VALVE_CONDITION: 'SEATED_TIGHT_NO_LEAK',
            BOTTOM_BLOWDOWN_LINE: 'FREE_FLOW_CLEAN',
            WATER_SOFTENER_HARDNESS: 'ZERO_HARDNESS',
          },
        });

        expect(result.shift).toBe('SHIFT_A');
        expect(result.logTime).toBe('08:00');
        expect(result.anomaliesDetected).toHaveLength(0);
        expect(result.readings['operating_steam_pressure'].inNominalRange).toBe(true);
        expect(result.readings['flue_gas_temperature'].inNominalRange).toBe(true);
      });
    });

    it('should detect empirical benchmark breaches and trigger ANP decision support event', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.checklistTemplate, 'findFirst').mockResolvedValue({
          id: 'tmpl-boiler-shift',
        } as any);
        vi.spyOn(tenantPrisma.inspection, 'create').mockResolvedValue({
          id: 'insp-log-002',
          overallResult: 'conditional',
        } as any);

        const anpEmitSpy = vi.spyOn(decisionSupportEventBus, 'emitDailyLogSubmitted').mockResolvedValue([
          { recommendedAction: 'Schedule fireside tube cleaning' },
        ]);

        // Submit readings with 2 empirical benchmark breaches:
        // 1. flue_gas_temperature = 208°C (> 190°C soot/scale threshold)
        // 2. burner_operating_hours = 2150 hrs (>= 2000 hrs nozzle threshold)
        const result = await boilerService.submitBoilerShiftLog(BOILER_ASSET_ID, {
          logDate: '2026-11-15',
          shift: 'SHIFT_B',
          logTime: '14:00',
          operatorUserId: USER_OPERATOR_ID,
          readings: {
            operating_steam_pressure: 8.6,
            flue_gas_temperature: 208.0, // Breaches > 190°C
            burner_operating_hours: 2150, // Breaches >= 2000 hrs
            exhaust_gas_o2: 4.2,
          },
        });

        expect(result.anomaliesDetected).toHaveLength(2);

        // Verify flue gas anomaly
        const flueGasAnomaly = result.anomaliesDetected.find(
          (a) => a.parameterCode === 'flue_gas_temperature'
        );
        expect(flueGasAnomaly).toBeDefined();
        expect(flueGasAnomaly?.observedValue).toBe(208.0);
        expect(flueGasAnomaly?.thematicMaintenanceAction).toContain('EMA 1 / HEMA 3');

        // Verify burner hours anomaly
        const burnerAnomaly = result.anomaliesDetected.find(
          (a) => a.parameterCode === 'burner_operating_hours'
        );
        expect(burnerAnomaly).toBeDefined();
        expect(burnerAnomaly?.observedValue).toBe(2150);
        expect(burnerAnomaly?.thematicMaintenanceAction).toContain('BMA 1');

        // Verify ANP event bus was triggered with signals
        expect(anpEmitSpy).toHaveBeenCalledTimes(1);
        const emitPayload = anpEmitSpy.mock.calls[0][0];
        expect(emitPayload.assetId).toBe(BOILER_ASSET_ID);
        expect(emitPayload.signals.find((s) => s.key === 'FLUE_GAS_TEMP')?.value).toBe(208.0);
      });
    });

    it('should flag abnormal walkthrough observations as anomalies', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.checklistTemplate, 'findFirst').mockResolvedValue({
          id: 'tmpl-boiler-shift',
        } as any);
        vi.spyOn(tenantPrisma.inspection, 'create').mockResolvedValue({
          id: 'insp-log-003',
          overallResult: 'fail',
        } as any);

        const result = await boilerService.submitBoilerShiftLog(BOILER_ASSET_ID, {
          logDate: '2026-11-15',
          shift: 'SHIFT_C',
          logTime: '22:00',
          readings: {
            operating_steam_pressure: 8.5,
          },
          walkthroughResults: {
            SIGHT_GLASS_LEVEL: 'DIRTY_GLASS_OBSTRUCTED',
            SAFETY_VALVE_CONDITION: 'AUDIBLE_BLOWBY', // Critical safety deviation
          },
        });

        expect(result.anomaliesDetected).toHaveLength(2);
        const blowby = result.anomaliesDetected.find(
          (a) => a.parameterCode === 'SAFETY_VALVE_CONDITION'
        );
        expect(blowby?.severity).toBe('CRITICAL');
      });
    });
  });

  // ===========================================================================
  // 4. SHIFT WALKTHROUGH INSPECTION (VISUAL / ACOUSTIC WALKTHROUGH)
  // ===========================================================================
  describe('4. Shift Walkthrough Visual & Acoustic Inspection Checkpoints', () => {
    it('should evaluate full walkthrough and return "pass" when all checkpoints meet expected state', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.inspection, 'create').mockResolvedValue({
          id: 'insp-walk-001',
          overallResult: 'pass',
        } as any);

        const res = await boilerService.submitBoilerWalkthroughInspection(BOILER_ASSET_ID, {
          inspectionDate: '2026-11-15',
          shift: 'SHIFT_A',
          inspectorUserId: USER_OPERATOR_ID,
          checkpoints: {
            SIGHT_GLASS_LEVEL: 'NORMAL_CENTRELINE',
            BURNER_FLAME_APPEARANCE: 'BRIGHT_YELLOW_STABLE',
            STEAM_LEAKS_ACOUSTIC: 'NO_LEAKS',
            SAFETY_VALVE_CONDITION: 'SEATED_TIGHT_NO_LEAK',
            BOTTOM_BLOWDOWN_LINE: 'FREE_FLOW_CLEAN',
            WATER_SOFTENER_HARDNESS: 'ZERO_HARDNESS',
          },
        });

        expect(res.overallResult).toBe('pass');
        expect(res.hasCriticalSafetyIssue).toBe(false);
        expect(res.checkpoints.every((c) => c.isNormal)).toBe(true);
      });
    });

    it('should evaluate walkthrough as "conditional" for minor observations like gland weeping or hardness slip', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.inspection, 'create').mockResolvedValue({
          id: 'insp-walk-002',
          overallResult: 'conditional',
        } as any);

        const res = await boilerService.submitBoilerWalkthroughInspection(BOILER_ASSET_ID, {
          inspectionDate: '2026-11-15',
          shift: 'SHIFT_B',
          checkpoints: {
            SIGHT_GLASS_LEVEL: 'NORMAL_CENTRELINE',
            STEAM_LEAKS_ACOUSTIC: 'MINOR_GLAND_WEEP', // Minor weep
            WATER_SOFTENER_HARDNESS: 'HARDNESS_SLIP_DETECTED', // Chemical slip
          },
        });

        expect(res.overallResult).toBe('conditional');
        expect(res.hasCriticalSafetyIssue).toBe(false);
      });
    });

    it('should evaluate walkthrough as "fail" and flag critical safety issue for safety valve blowby or low water', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.inspection, 'create').mockResolvedValue({
          id: 'insp-walk-003',
          overallResult: 'fail',
        } as any);

        const res = await boilerService.submitBoilerWalkthroughInspection(BOILER_ASSET_ID, {
          inspectionDate: '2026-11-15',
          shift: 'SHIFT_C',
          checkpoints: {
            SAFETY_VALVE_CONDITION: 'AUDIBLE_BLOWBY',
          },
        });

        expect(res.overallResult).toBe('fail');
        expect(res.hasCriticalSafetyIssue).toBe(true);
      });
    });
  });

  // ===========================================================================
  // 5. QUALITATIVE OPERATIONAL OBSERVATIONS
  // ===========================================================================
  describe('5. Qualitative Operational Observations', () => {
    it('should record and list shift observations with category and severity', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);

        const obs = await boilerService.logBoilerObservation(BOILER_ASSET_ID, {
          shift: 'SHIFT_A',
          category: 'COMBUSTION',
          severity: 'ADVISORY',
          observationText: 'Slight fluttering sound from primary air damper during low-to-high flame transition.',
          observerUserId: USER_OPERATOR_ID,
        });

        expect(obs.category).toBe('COMBUSTION');
        expect(obs.severity).toBe('ADVISORY');
        expect(obs.observationText).toContain('air damper');

        const list = await boilerService.listBoilerObservations(BOILER_ASSET_ID);
        expect(list.length).toBeGreaterThanOrEqual(1);
        expect(list[0].id).toBe(obs.id);
      });
    });
  });

  // ===========================================================================
  // 6. FAULT REPORTING & AUTOMATED WORK ORDER DISPATCH
  // ===========================================================================
  describe('6. Direct Fault Reporting & Work Order Dispatch', () => {
    it('should record boiler fault into fault_logs with unique faultNumber', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'create').mockImplementation(async (args: any) => ({
          id: 'flt-001',
          ...args.data,
        }));

        const result = await boilerService.reportBoilerFault(BOILER_ASSET_ID, {
          subsystemCode: 'FUEL_AND_COMBUSTION_SYSTEM',
          componentCode: 'BURNER_ASSEMBLY',
          severity: 'medium',
          symptom: 'Photocell optical sensor sooted up; intermittent flame failure lockout.',
          suspectedCause: 'Excess fuel oil viscosity at cold morning startup.',
          downtimeMinutes: 45,
        });

        expect(result.faultLog.faultNumber).toMatch(/^FLT-BLR-\d{4}-\d+$/);
        expect(result.faultLog.severity).toBe('medium');
        expect(result.autoDispatchedWorkOrder).toBe(false);
      });
    });

    it('should automatically dispatch a corrective work order when fault severity is critical', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'create').mockImplementation(async (args: any) => ({
          id: 'flt-critical-001',
          ...args.data,
        }));
        vi.spyOn(tenantPrisma.faultLog, 'update').mockResolvedValue({} as any);

        const createWorkOrderSpy = vi.spyOn(workOrdersService, 'createFromFaultReport').mockResolvedValue({
          id: 'wo-corrective-001',
          workOrderNumber: 'WO-2026-00055',
          title: 'CORRECTIVE: Safety relief valve leaking steam',
          priority: 'urgent',
          status: 'open',
        } as any);

        const result = await boilerService.reportBoilerFault(
          BOILER_ASSET_ID,
          {
            subsystemCode: 'SAFETY_AND_INSTRUMENTATION_SYSTEM',
            componentCode: 'SAFETY_VALVES',
            severity: 'critical',
            symptom: 'Safety relief valve popped at 8.2 bar (below 9.0 bar setting) and fails to reseat tight.',
            autoCreateWorkOrder: true,
          },
          USER_OPERATOR_ID
        );

        expect(result.autoDispatchedWorkOrder).toBe(true);
        expect(result.workOrder).toBeDefined();
        expect(createWorkOrderSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            faultLogId: 'flt-critical-001',
            priorityOverride: 'urgent',
          }),
          USER_OPERATOR_ID
        );
      });
    });
  });

  // ===========================================================================
  // 7. MAINTENANCE HISTORY & LIFECYCLE SUMMARY AGGREGATION
  // ===========================================================================
  describe('7. Historical Maintenance Records & Lifecycle Summary', () => {
    it('should aggregate work orders, fault history, cumulative hours and operational averages', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);
        vi.spyOn(tenantPrisma.faultLog, 'count').mockResolvedValue(1);
        vi.spyOn(tenantPrisma.workOrder, 'count').mockResolvedValue(1);

        vi.spyOn(tenantPrisma.workOrder, 'findMany').mockResolvedValue([
          {
            id: 'wo-1',
            workOrderNumber: 'WO-2026-00010',
            title: 'Weekly fire-tube sootblowing and burner inspection',
            maintenanceType: { name: 'Preventive' },
            status: 'completed',
            priority: 'high',
            actualCost: 150.0,
            actualLaborHours: 3.5,
            createdAt: new Date('2026-11-01'),
            completedAt: new Date('2026-11-01'),
          },
        ] as any);

        vi.spyOn(tenantPrisma.faultLog, 'findMany').mockResolvedValue([
          {
            id: 'flt-1',
            faultNumber: 'FLT-BLR-2026-12345',
            detectedAt: new Date('2026-11-05'),
            severity: 'high',
            status: 'resolved',
            symptom: 'Feedwater pump gland leakage',
            faultCode: 'FEED_WATER_SYSTEM',
            downtimeMinutes: 30,
            resolvedAt: new Date('2026-11-05'),
          },
        ] as any);

        vi.spyOn(tenantPrisma.inspection, 'findMany').mockResolvedValue([
          {
            id: 'insp-1',
            inspectionNumber: 'LOG-BLR-20261115-0800',
            completedAt: new Date('2026-11-15T08:00:00Z'),
            overallResult: 'pass',
            notes: 'Normal shift start',
          },
        ] as any);

        const history = await boilerService.getBoilerMaintenanceHistory(BOILER_ASSET_ID);

        expect(history.assetId).toBe(BOILER_ASSET_ID);
        expect(history.boilerName).toBe(mockBoilerAsset.name);
        expect(history.workOrders).toHaveLength(1);
        expect(history.workOrders[0].workOrderNumber).toBe('WO-2026-00010');
        expect(history.faultHistory).toHaveLength(1);
        expect(history.faultHistory[0].faultNumber).toBe('FLT-BLR-2026-12345');
        expect(history.cumulativeMetrics.cumulativeBurnerHours).toBeGreaterThan(0);
        expect(history.cumulativeMetrics.averageOperatingPressureBar).toBeCloseTo(8.45, 1);
      });
    });
  });

  // ===========================================================================
  // 8. SUPPORTING PHOTOGRAPHIC EVIDENCE ATTACHMENT
  // ===========================================================================
  describe('8. Supporting Photographs & Evidence Attachments', () => {
    it('should link uploaded flame port / sight glass photos to boiler entity', async () => {
      await runWithTenantContext(TENANT_ID, async () => {
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(mockBoilerAsset as any);

        const uploadSpy = vi.spyOn(auditAndAttachmentsService, 'uploadAndLinkAttachment').mockResolvedValue({
          attachment: {
            id: 'att-flame-001',
            fileName: 'burner-flame-sight-port.jpg',
            storageUri: 's3://luminafm-uploads/boilers/flame-01.jpg',
            mimeType: 'image/jpeg',
          },
          entityAttachment: {
            organizationId: TENANT_ID,
            attachmentId: 'att-flame-001',
            entityType: 'boiler',
            entityId: BOILER_ASSET_ID,
          },
        } as any);

        const result = await boilerService.attachBoilerEvidence(BOILER_ASSET_ID, {
          fileName: 'burner-flame-sight-port.jpg',
          storageUri: 's3://luminafm-uploads/boilers/flame-01.jpg',
          mimeType: 'image/jpeg',
          entityType: 'boiler',
        });

        expect(uploadSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'burner-flame-sight-port.jpg',
            storageUri: 's3://luminafm-uploads/boilers/flame-01.jpg',
            entityType: 'boiler',
            entityId: BOILER_ASSET_ID,
          })
        );
        expect(result.attachment.id).toBe('att-flame-001');
      });
    });
  });

  // ===========================================================================
  // 9. MULTI-TENANT ISOLATION
  // ===========================================================================
  describe('9. Multi-Tenant Isolation Enforcement', () => {
    it('should prevent cross-tenant access to boiler profiles and shift logs', async () => {
      await runWithTenantContext(OTHER_TENANT_ID, async () => {
        // Mock DB: Asset belongs to TENANT_ID, so looking up under OTHER_TENANT_ID returns null
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(null);

        await expect(boilerService.getBoilerProfile(BOILER_ASSET_ID)).rejects.toThrow(
          BoilerAssetNotFoundError
        );

        await expect(
          boilerService.submitBoilerShiftLog(BOILER_ASSET_ID, {
            logDate: '2026-11-15',
            shift: 'SHIFT_A',
            logTime: '08:00',
            readings: { operating_steam_pressure: 8.5 },
          })
        ).rejects.toThrow(BoilerAssetNotFoundError);
      });
    });
  });
});
