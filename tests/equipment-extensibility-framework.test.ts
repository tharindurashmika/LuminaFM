import { describe, it, expect, beforeEach } from 'vitest';
import {
  EquipmentModuleContract,
  EquipmentAnomalyResult,
  EquipmentMeasurementPointDefinition,
} from '../src/modules/equipment-framework/equipment-module.contract';
import {
  EquipmentModuleRegistry,
  CrossModuleDecisionModelError,
} from '../src/modules/equipment-framework/equipment-module.registry';
import { ChillerEquipmentModule } from '../src/modules/equipment-framework/modules/chiller/chiller.module';
import { BoilerEquipmentModule } from '../src/modules/equipment-framework/modules/boiler/boiler.module';

describe('LuminaFM Equipment Extensibility Framework & Module Contract', () => {
  let registry: EquipmentModuleRegistry;

  beforeEach(() => {
    registry = new EquipmentModuleRegistry();
    registry.registerModule(BoilerEquipmentModule);
    registry.registerModule(ChillerEquipmentModule);
  });

  // =========================================================================
  // 1. STANDARDIZED MODULE CONTRACT & FACET COMPLETENESS
  // =========================================================================
  describe('1. Standardized Module Contract & Facet Completeness', () => {
    it('should require all 8 standardized facets on any valid equipment module contract', () => {
      const module = ChillerEquipmentModule;

      // 1. Equipment-specific configuration schema
      expect(module.specificationsSchema).toBeDefined();
      expect(typeof module.specificationsSchema.validate).toBe('function');
      expect(module.specificationsSchema.fields.length).toBeGreaterThanOrEqual(5);

      // 2. Physical subsystems DAG
      expect(module.physicalSubsystems).toBeDefined();
      expect(module.physicalSubsystems.length).toBeGreaterThanOrEqual(4);

      // 3. Operational readings & measurement definitions
      expect(module.measurementPoints).toBeDefined();
      expect(module.measurementPoints.length).toBeGreaterThanOrEqual(10);

      // 4. Inspection templates
      expect(module.inspectionTemplates).toBeDefined();
      expect(module.inspectionTemplates.length).toBeGreaterThanOrEqual(1);

      // 5. Maintenance task templates
      expect(module.maintenanceTaskTemplates).toBeDefined();
      expect(module.maintenanceTaskTemplates.length).toBeGreaterThanOrEqual(2);

      // 6. Decision-support model association
      expect(module.decisionSupport).toBeDefined();
      expect(module.decisionSupport.modelCode).toBeDefined();
      expect(module.decisionSupport.frameworkType).toBeDefined();

      // 7. Equipment-specific dashboard configuration
      expect(module.dashboardConfig).toBeDefined();
      expect(module.dashboardConfig.kpiCards.length).toBeGreaterThanOrEqual(3);
      expect(module.dashboardConfig.widgets.length).toBeGreaterThanOrEqual(2);

      // 8. Reporting configuration
      expect(module.reportingConfig).toBeDefined();
      expect(module.reportingConfig.reportTypes.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject invalid module registrations missing required facets', () => {
      const invalidModule: any = {
        moduleCode: 'INVALID_MODULE',
        categoryCode: 'invalid',
        name: 'Invalid Incomplete Module',
        // Missing specificationsSchema, measurementPoints, decisionSupport
      };

      expect(() => registry.registerModule(invalidModule)).toThrowError(
        /missing specificationsSchema fields/
      );
    });
  });

  // =========================================================================
  // 2. MODULE REGISTRY LIFECYCLE & CATEGORY RESOLUTION
  // =========================================================================
  describe('2. Module Registry Lifecycle & Category Resolution', () => {
    it('should list all registered equipment modules with contract summaries', () => {
      const list = registry.listModules();
      expect(list.length).toBeGreaterThanOrEqual(2);

      const codes = list.map((m) => m.moduleCode);
      expect(codes).toContain('STEAM_BOILER_FIRETUBE');
      expect(codes).toContain('CHILLER_WATER_COOLED');
    });

    it('should retrieve modules by moduleCode', () => {
      const chillerMod = registry.getModule('CHILLER_WATER_COOLED');
      expect(chillerMod).toBeDefined();
      expect(chillerMod?.name).toContain('Water-Cooled Centrifugal & Screw Chiller');

      const boilerMod = registry.getModule('STEAM_BOILER_FIRETUBE');
      expect(boilerMod).toBeDefined();
      expect(boilerMod?.name).toContain('Fire-Tube Steam Boiler');
    });

    it('should resolve the correct equipment module for a generic CMMS AssetCategory', () => {
      // CMMS equipment category 'chillers'
      const chillerMod = registry.getModuleForCategory('chillers');
      expect(chillerMod).toBeDefined();
      expect(chillerMod?.moduleCode).toBe('CHILLER_WATER_COOLED');

      // CMMS equipment category 'boilers'
      const boilerMod = registry.getModuleForCategory('boilers');
      expect(boilerMod).toBeDefined();
      expect(boilerMod?.moduleCode).toBe('STEAM_BOILER_FIRETUBE');

      // Unregistered category falls back safely to undefined
      const pumpMod = registry.getModuleForCategory('centrifugal_pumps');
      expect(pumpMod).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. DEMONSTRATION OF NON-BOILER CHILLER MODULE
  // =========================================================================
  describe('3. Demonstration of Non-Boiler Chiller Module', () => {
    const chiller = ChillerEquipmentModule;

    it('should validate chiller technical specifications schema', () => {
      const validSpecs = {
        chillerType: 'WATER_COOLED_CENTRIFUGAL',
        coolingCapacityTons: 850,
        refrigerantType: 'R134a',
        nominalCop: 6.2,
        nominalKwPerTon: 0.56,
      };

      const validRes = chiller.specificationsSchema.validate(validSpecs);
      expect(validRes.isValid).toBe(true);
      expect(validRes.errors).toHaveLength(0);

      const invalidSpecs = {
        chillerType: 'WATER_COOLED_CENTRIFUGAL',
        coolingCapacityTons: -50, // Invalid negative capacity
        // Missing refrigerantType
      };

      const invalidRes = chiller.specificationsSchema.validate(invalidSpecs);
      expect(invalidRes.isValid).toBe(false);
      expect(invalidRes.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should define comprehensive chiller measurement points conforming to AHRI 550/590 and ASHRAE Guideline 22', () => {
      const pointCodes = chiller.measurementPoints.map((p) => p.parameterCode);

      // Must include primary thermal and thermodynamic circuit parameters
      expect(pointCodes).toContain('CHW_SUPPLY_TEMP');
      expect(pointCodes).toContain('CHW_RETURN_TEMP');
      expect(pointCodes).toContain('CW_SUPPLY_TEMP');
      expect(pointCodes).toContain('CW_RETURN_TEMP');
      expect(pointCodes).toContain('EVAP_APPROACH_TEMP');
      expect(pointCodes).toContain('COND_APPROACH_TEMP');
      expect(pointCodes).toContain('EVAP_PRESSURE');
      expect(pointCodes).toContain('COND_PRESSURE');
      expect(pointCodes).toContain('COMPRESSOR_DISCHARGE_TEMP');
      expect(pointCodes).toContain('OIL_PRESSURE_DIFF');
      expect(pointCodes).toContain('COMPRESSOR_RLA_PCT');
      expect(pointCodes).toContain('KW_PER_TON');
    });

    it('should detect condenser tube scaling when condenser approach temperature exceeds threshold', () => {
      const readings = {
        CHW_SUPPLY_TEMP: 6.8,
        CHW_RETURN_TEMP: 12.2,
        CW_SUPPLY_TEMP: 29.5,
        CW_RETURN_TEMP: 35.8,
        EVAP_APPROACH_TEMP: 1.1, // Clean (< 1.5°C)
        COND_APPROACH_TEMP: 2.8, // ELEVATED! (nominal 0.5 - 1.8, warningHigh 2.5)
        OIL_PRESSURE_DIFF: 1.6,  // Normal (< 2.4 bar)
        KW_PER_TON: 0.62,
      };

      const anomalies = chiller.evaluateReadings(readings);
      expect(anomalies.length).toBeGreaterThan(0);

      const condAnomaly = anomalies.find((a) => a.parameterCode === 'COND_APPROACH_TEMP');
      expect(condAnomaly).toBeDefined();
      expect(condAnomaly?.severity).toBe('WARNING');
      expect(condAnomaly?.thresholdBreached).toBe('WARNING_HIGH');
      expect(condAnomaly?.thematicMaintenanceAction).toContain('Condenser tube scaling');
    });

    it('should detect critical lubrication blockage when oil filter differential pressure exceeds critical limit', () => {
      const readings = {
        OIL_PRESSURE_DIFF: 3.7, // CRITICAL (> 3.5 bar criticalHigh)
      };

      const anomalies = chiller.evaluateReadings(readings);
      const oilAnomaly = anomalies.find((a) => a.parameterCode === 'OIL_PRESSURE_DIFF');

      expect(oilAnomaly).toBeDefined();
      expect(oilAnomaly?.severity).toBe('CRITICAL');
      expect(oilAnomaly?.thresholdBreached).toBe('CRITICAL_HIGH');
      expect(oilAnomaly?.thematicMaintenanceAction).toContain('Oil filter cartridge clogged');
    });

    it('should calculate real-time chiller thermodynamic KPIs (COP, Delta T, kW/TR)', () => {
      const readings = {
        CHW_SUPPLY_TEMP: 6.7,
        CHW_RETURN_TEMP: 12.2,
        KW_PER_TON: 0.58, // 0.58 kW / TR
        COND_APPROACH_TEMP: 1.4,
        EVAP_APPROACH_TEMP: 1.0,
      };

      const kpis = chiller.calculateKpis(readings);

      // Delta T = 12.2 - 6.7 = 5.5 °C
      expect(kpis.CHW_DELTA_T).toBe(5.5);

      // COP = 3.517 / 0.58 ~ 6.06 COP
      expect(kpis.COP).toBeCloseTo(6.06, 1);
      expect(kpis.COND_APPROACH).toBe(1.4);
      expect(kpis.EVAP_APPROACH).toBe(1.0);
    });
  });

  // =========================================================================
  // 4. STRICT ISOLATION & MODEL DECOUPLING RULE ENFORCEMENT
  // =========================================================================
  describe('4. Strict Isolation & Model Decoupling Rule Enforcement', () => {
    it('should associate Chiller with an independent decision model (CHILLER-RCM-ASHRAE-v1.0.0)', () => {
      const decisionConfig = ChillerEquipmentModule.decisionSupport;

      expect(decisionConfig.frameworkType).toBe('RCM');
      expect(decisionConfig.modelCode).toBe('CHILLER-RCM-ASHRAE-v1.0.0');
      expect(decisionConfig.validationStatus).toBe('independent_framework');
      expect(decisionConfig.crossModuleReusePermitted).toBe(false);
      expect(decisionConfig.validationDisclaimer).toContain(
        'The boiler dissertation ANP model (Kingsbury baseline) must NOT be applied to chillers'
      );
    });

    it('should strictly reject applying the Boiler ANP model to a Chiller', () => {
      const chillerModuleCode = 'CHILLER_WATER_COOLED';
      const boilerAnpModelCode = 'ANP-KINGSBURY-FIRETUBE-v1.0.0';

      // An attempt to evaluate boiler ANP on chiller must throw CrossModuleDecisionModelError
      expect(() =>
        registry.assertDecisionModelCompatibility(chillerModuleCode, boilerAnpModelCode)
      ).toThrowError(CrossModuleDecisionModelError);

      expect(() =>
        registry.assertDecisionModelCompatibility(chillerModuleCode, boilerAnpModelCode)
      ).toThrowError(/Cross-equipment decision model reuse is strictly prohibited/);
    });

    it('should strictly reject applying the Chiller RCM model to a Boiler', () => {
      const boilerModuleCode = 'STEAM_BOILER_FIRETUBE';
      const chillerRcmModelCode = 'CHILLER-RCM-ASHRAE-v1.0.0';

      expect(() =>
        registry.assertDecisionModelCompatibility(boilerModuleCode, chillerRcmModelCode)
      ).toThrowError(CrossModuleDecisionModelError);
    });

    it('should permit decision model evaluation when model matches the registered module contract', () => {
      expect(() =>
        registry.assertDecisionModelCompatibility('CHILLER_WATER_COOLED', 'CHILLER-RCM-ASHRAE-v1.0.0')
      ).not.toThrow();

      expect(() =>
        registry.assertDecisionModelCompatibility('STEAM_BOILER_FIRETUBE', 'ANP-KINGSBURY-FIRETUBE-v1.0.0')
      ).not.toThrow();
    });
  });

  // =========================================================================
  // 5. EXTENSIBILITY WITH DYNAMIC FUTURE MODULES (COOLING TOWER EXAMPLE)
  // =========================================================================
  describe('5. Extensibility with Dynamic Future Modules (Cooling Tower Example)', () => {
    it('should allow future equipment modules to be plugged in at runtime without changing core code', () => {
      // Create a 3rd module: Cross-Flow Induced Draft Cooling Tower Module
      const CoolingTowerModule: EquipmentModuleContract = {
        moduleCode: 'COOLING_TOWER_CROSSFLOW',
        categoryCode: 'cooling_towers',
        name: 'Induced-Draft Crossflow Cooling Tower Module',
        version: '1.0.0',
        description: 'Industrial open-circuit crossflow cooling towers supporting CTI STD-201 thermal certification.',
        governingStandards: ['Cooling Technology Institute (CTI) STD-201', 'ASHRAE Standard 188 (Legionellosis)'],
        icon: 'Wind',
        specificationsSchema: {
          fields: [
            { fieldKey: 'waterFlowGpm', label: 'Design Water Flow (GPM)', dataType: 'NUMBER', required: true, description: 'Circulating rate' },
            { fieldKey: 'wetBulbDesignC', label: 'Design Ambient Wet-Bulb (°C)', dataType: 'NUMBER', required: true, description: 'Ambient wet-bulb' },
          ],
          validate: (s) => ({ isValid: typeof s.waterFlowGpm === 'number', errors: [] }),
        },
        physicalSubsystems: [
          { code: 'DISTRIBUTION_BASIN', name: 'Hot Water Distribution Basin & Gravity Nozzles', components: [] },
          { code: 'FILL_MEDIA_PACK', name: 'PVC Film Fill Pack & Drift Eliminator', components: [] },
          { code: 'AXIAL_FAN_DRIVE', name: 'Axial Fan, Gearbox & VFD Motor Drive', components: [] },
        ],
        measurementPoints: [
          {
            parameterCode: 'WET_BULB_APPROACH',
            parameterName: 'Tower Wet-Bulb Approach Temperature',
            physicalProperty: 'TEMPERATURE',
            unit: '°C',
            samplingFrequency: 'HOURLY',
            nominalMin: 3.0,
            nominalMax: 5.5,
            warningHigh: 6.5,
            thematicMaintenanceAction: 'Clean PVC fill media and check air flow dampers.',
            description: 'Cold basin water temp minus ambient wet-bulb temp.',
          },
        ],
        inspectionTemplates: [],
        maintenanceTaskTemplates: [],
        decisionSupport: {
          frameworkType: 'FMEA',
          modelCode: 'COOLING-TOWER-FMEA-v1.0.0',
          modelName: 'Failure Mode and Effects Analysis for Heat Rejection Towers',
          version: '1.0.0',
          validationStatus: 'independent_framework',
          crossModuleReusePermitted: false,
          validationDisclaimer: 'Cooling tower failure physics are independent from boiler/chiller models.',
          criteria: [],
          alternatives: [],
        },
        dashboardConfig: {
          dashboardTitle: 'Cooling Tower Water Quality & Thermal Performance',
          kpiCards: [],
          widgets: [],
        },
        reportingConfig: { reportTypes: [] },
        evaluateReadings: () => [],
        calculateKpis: () => ({}),
      };

      // Register dynamically at runtime
      registry.registerModule(CoolingTowerModule);

      // Verify immediate discoverability
      expect(registry.getModule('COOLING_TOWER_CROSSFLOW')).toBeDefined();
      expect(registry.getModuleForCategory('cooling_towers')?.moduleCode).toBe('COOLING_TOWER_CROSSFLOW');
      expect(registry.listModules().map((m) => m.moduleCode)).toContain('COOLING_TOWER_CROSSFLOW');
    });
  });

  // =========================================================================
  // 6. PRESERVATION OF SHARED CMMS FUNCTIONALITY
  // =========================================================================
  describe('6. Preservation of Shared CMMS Functionality', () => {
    it('should preserve universal work order generation and asset hierarchy contracts', () => {
      // Verify that PM task templates on Chiller map to standard CMMS Work Order fields
      const chillerPm = ChillerEquipmentModule.maintenanceTaskTemplates[0];

      expect(chillerPm.taskTemplateCode).toBeDefined();
      expect(chillerPm.title).toBeDefined();
      expect(chillerPm.frequencyDays).toBe(90);
      expect(chillerPm.estimatedLaborHours).toBeGreaterThan(0);
      expect(chillerPm.tradeSkill).toBeDefined();
      expect(chillerPm.requiredParts.length).toBeGreaterThan(0);

      // Verify parts have valid standard inventory schemas
      const part = chillerPm.requiredParts[0];
      expect(part.partCode).toBeDefined();
      expect(part.quantity).toBeGreaterThan(0);
    });

    it('should format equipment inspection responses into universal CMMS checklist responses', () => {
      const template = ChillerEquipmentModule.inspectionTemplates[0];
      expect(template.checkpoints.length).toBeGreaterThanOrEqual(4);

      for (const chk of template.checkpoints) {
        expect(chk.checkpointCode).toBeDefined();
        expect(chk.subsystemCode).toBeDefined();
        expect(chk.allowedResponses.length).toBeGreaterThanOrEqual(2);

        // Every checkpoint must have at least one normal and one abnormal option
        const hasNormal = chk.allowedResponses.some((r) => !r.isAbnormal);
        const hasAbnormal = chk.allowedResponses.some((r) => r.isAbnormal);
        expect(hasNormal).toBe(true);
        expect(hasAbnormal).toBe(true);
      }
    });
  });
});
