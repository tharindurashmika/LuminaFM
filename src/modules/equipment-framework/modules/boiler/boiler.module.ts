import {
  EquipmentModuleContract,
  EquipmentAnomalyResult,
  EquipmentSpecsSchema,
} from '../../equipment-module.contract';
import {
  BOILER_PHYSICAL_SUBSYSTEMS,
  BOILER_MEASUREMENT_POINTS,
  BOILER_WALKTHROUGH_CHECKPOINTS,
} from '../../../boiler/boiler.constants';

const boilerSpecsSchema: EquipmentSpecsSchema = {
  fields: [
    {
      fieldKey: 'boilerType',
      label: 'Boiler Shell Architecture',
      dataType: 'SELECT',
      required: true,
      allowedOptions: ['OIL_FIRED_FIRE_TUBE', 'FIRE_TUBE'],
      description: 'Cylindrical shell fire-tube industrial steam boiler.',
    },
    {
      fieldKey: 'steamCapacityKgPerHour',
      label: 'Rated Steam Generation Capacity (kg/h)',
      dataType: 'NUMBER',
      unit: 'kg/h',
      required: true,
      minValue: 1000,
      maxValue: 1800,
      description: 'Dissertation validated research capacity scope (1,000 to 1,800 kg/h).',
    },
    {
      fieldKey: 'fuelType',
      label: 'Primary Fuel Designation',
      dataType: 'SELECT',
      required: true,
      allowedOptions: ['HEAVY_FUEL_OIL_180_CST', 'FURNACE_OIL', 'DIESEL_AUTO_DIESEL', 'OIL_FIRED'],
      description: 'Liquid fuel utilized in burner atomizer.',
    },
    {
      fieldKey: 'nominalOperatingPressureBar',
      label: 'Nominal Steam Working Pressure (bar)',
      dataType: 'NUMBER',
      unit: 'bar',
      required: false,
      defaultValue: 8.5,
      description: 'Typical saturated steam operating pressure at header.',
    },
    {
      fieldKey: 'safetyValveSetPressureBar',
      label: 'Safety Relief Valve Popping Setpoint (bar)',
      dataType: 'NUMBER',
      unit: 'bar',
      required: false,
      defaultValue: 9.0,
      description: 'ASME Section I safety valve lift setpoint.',
    },
  ],
  validate(specs: Record<string, unknown>) {
    const errors: string[] = [];
    if (!specs.boilerType) errors.push("Missing required specification: 'boilerType'.");
    const cap = Number(specs.steamCapacityKgPerHour);
    if (isNaN(cap) || cap < 1000 || cap > 1800) {
      errors.push('Boiler steam capacity must strictly be between 1,000 and 1,800 kg/h under validated research baseline.');
    }
    return { isValid: errors.length === 0, errors };
  },
};

/**
 * Validated Industrial Oil-Fired Fire-Tube Steam Boiler Module
 * Baseline: Vishal Perera Dissertation, June 2025.
 */
export const BoilerEquipmentModule: EquipmentModuleContract = {
  moduleCode: 'STEAM_BOILER_FIRETUBE',
  categoryCode: 'boilers',
  name: 'Industrial Fire-Tube Steam Boiler Module (1,000 - 1,800 kg/h)',
  version: '1.0.0',
  description:
    'Empirically validated multi-criteria decision-support and telemetry module for industrial oil-fired fire-tube steam boilers. Validated against Kingsbury Hotel baseline dataset.',
  governingStandards: [
    'ASME Boiler and Pressure Vessel Code Section I (Power Boilers)',
    'EN 12953: Shell Boilers (Fire-tube Boilers)',
    'National Board Inspection Code (NBIC) NB-23',
  ],
  icon: 'Flame',

  specificationsSchema: boilerSpecsSchema,

  physicalSubsystems: BOILER_PHYSICAL_SUBSYSTEMS.map((sub) => ({
    code: sub.code,
    name: sub.name,
    components: sub.components.map((c) => ({ code: c.code, name: c.name })),
  })),

  measurementPoints: Object.values(BOILER_MEASUREMENT_POINTS).map((pt) => ({
    parameterCode: pt.code,
    parameterName: pt.name,
    physicalProperty:
      pt.unit === 'bar'
        ? 'PRESSURE'
        : pt.unit === 'deg_c'
        ? 'TEMPERATURE'
        : pt.unit === 'ppm'
        ? 'CHEMICAL_CONCENTRATION'
        : pt.unit === 'hrs'
        ? 'TIME'
        : pt.unit === 'percent'
        ? 'PERCENTAGE'
        : 'LEVEL',
    unit: pt.unit === 'deg_c' ? '°C' : pt.unit,
    samplingFrequency: 'HOURLY',
    nominalMin: pt.nominalRange.min,
    nominalMax: pt.nominalRange.max,
    warningHigh: pt.benchmarkThreshold?.value,
    criticalHigh: pt.benchmarkThreshold ? pt.benchmarkThreshold.value * 1.15 : undefined,
    thematicMaintenanceAction: pt.thematicMaintenanceAction,
    description: pt.name,
  })),

  inspectionTemplates: [
    {
      templateCode: 'INSP-BOILER-DAILY-WALKTHROUGH',
      title: 'Boiler Shift Walkthrough & Safety Checkpoints',
      category: 'OPERATIONAL_SAFETY',
      checkpoints: BOILER_WALKTHROUGH_CHECKPOINTS.map((chk) => ({
        checkpointCode: chk.code,
        title: chk.name,
        subsystemCode: 'SAFETY_AND_INSTRUMENTATION_SYSTEM',
        inspectionType: chk.code.includes('GLASS') ? 'VISUAL' : 'GAUGE_VERIFICATION',
        frequency: 'PER_SHIFT',
        allowedResponses: chk.options.map((opt) => ({
          code: opt,
          label: opt.replace(/_/g, ' '),
          isAbnormal: opt !== chk.expectedState,
        })),
        guidanceText: chk.description,
        requiresPhotoOnAbnormal: true,
      })),
    },
  ],

  maintenanceTaskTemplates: [
    {
      taskTemplateCode: 'PM-BLR-BLOWDOWN',
      title: 'Daily Surface & Bottom Mud Blowdown Routine',
      subsystemCode: 'STEAM_GENERATION_SYSTEM',
      frequencyDays: 1,
      estimatedLaborHours: 0.5,
      tradeSkill: 'Boiler Plant Operator',
      requiredParts: [],
      procedureSteps: [
        'Verify steam pressure is between 6.0 and 8.0 bar.',
        'Open fast-acting bottom blowdown valve for 5-8 seconds to purge precipitated sludge.',
        'Check gauge glass level returns to centerline.',
      ],
      safetyPrecautions: ['Verify blowdown pit cooling water flow prior to opening valve.'],
    },
    {
      taskTemplateCode: 'PM-BLR-SOOTBLOW',
      title: 'Monthly Fireside Fire-Tube Soot Removal & Baffle Inspection',
      subsystemCode: 'STEAM_GENERATION_SYSTEM',
      frequencyDays: 30,
      estimatedLaborHours: 8.0,
      tradeSkill: 'Certified Boiler Technician',
      requiredParts: [{ partCode: 'GASKET-SMOKEBOX-01', partName: 'Ceramic Smokebox Rope Gasket', quantity: 1 }],
      procedureSteps: [
        'Open front and rear smokebox doors.',
        'Wire-brush all fire-tubes to remove soot layer exceeding 0.8mm thickness.',
        'Inspect tube sheet ligament cracks around rear tube ends.',
      ],
      safetyPrecautions: ['Allow boiler furnace to cool below 50°C before opening smokebox.'],
    },
  ],

  decisionSupport: {
    frameworkType: 'ANP',
    modelCode: 'ANP-KINGSBURY-FIRETUBE-v1.0.0',
    modelName: 'Analytic Network Process (ANP) Maintenance Decision Model for Industrial Steam Boilers',
    version: '1.0.0',
    validationStatus: 'academic_validated',
    academicValidationReference: 'Vishal Perera, June 2025 Dissertation (5 Industry Expert Delphi Validation)',
    crossModuleReusePermitted: false, // RESTRICTED TO FIRE-TUBE BOILERS ONLY
    validationDisclaimer:
      'This ANP mathematical model is strictly validated for industrial oil-fired fire-tube steam boilers (1,000 - 1,800 kg/h). Cross-application to other equipment (e.g. Chillers, Transformers) is academically invalid.',
    criteria: [
      { code: 'CRIT_SAFETY', name: 'Safety & Regulatory Compliance', cluster: 'GOVERNANCE', description: 'ASME Section I cutoffs and risk' },
      { code: 'CRIT_RELIABILITY', name: 'Operational Steam Reliability', cluster: 'PERFORMANCE', description: 'Steam supply continuity' },
      { code: 'CRIT_MAINT_COST', name: 'Maintenance & Overhaul Cost', cluster: 'FINANCIAL', description: 'Direct labor and replacement spares' },
      { code: 'CRIT_ENERGY_EFFICIENCY', name: 'Fuel-to-Steam Thermal Efficiency', cluster: 'EFFICIENCY', description: 'Stack gas temperature & soot' },
    ],
    alternatives: [
      { code: 'ALT_CORRECTIVE', name: 'Run-to-Failure (Corrective Maintenance)', actionType: 'CORRECTIVE', description: 'Unplanned intervention' },
      { code: 'ALT_TIME_BASED', name: 'Calendar Periodic Overhaul (Time-Based PM)', actionType: 'PREVENTIVE', description: 'Fixed interval overhaul' },
      { code: 'ALT_CBM', name: 'Condition-Based Predictive Overhaul (CBM)', actionType: 'CONDITION_MONITORING', description: 'Real-time telemetry trigger' },
    ],
  },

  dashboardConfig: {
    dashboardTitle: 'Steam Boiler Shift Monitoring & ANP Governance Dashboard',
    kpiCards: [
      { kpiCode: 'STEAM_PRESSURE', label: 'Steam Header Pressure', unit: 'bar', calculationFormula: 'Mean_Pressure_Shift', targetBenchmark: '8.0 - 9.0 bar' },
      { kpiCode: 'THERMAL_EFFICIENCY', label: 'Combustion Efficiency', unit: '%', calculationFormula: '100 - Stack_Loss_Pct', targetBenchmark: '>= 82.5%' },
      { kpiCode: 'FLUE_TEMP', label: 'Stack Flue Gas Temp', unit: '°C', calculationFormula: 'Thermocouple_Reading', targetBenchmark: '<= 195 °C' },
    ],
    widgets: [
      { widgetId: 'wdg-boiler-steam-press', widgetType: 'GAUGE', title: 'Steam Pressure Barometer', parameterCodes: ['operating_steam_pressure'], layout: { w: 6, h: 4, x: 0, y: 0 } },
      { widgetId: 'wdg-boiler-flue-temp', widgetType: 'TIME_SERIES', title: 'Flue Gas Temperature Trend', parameterCodes: ['stack_temperature'], layout: { w: 12, h: 6, x: 0, y: 4 } },
    ],
  },

  reportingConfig: {
    reportTypes: [
      { reportCode: 'RPT_BOILER_SHIFT_LOG', title: 'Boiler Daily Operational Logbook', format: 'PDF', metricsIncluded: ['operating_steam_pressure', 'stack_temperature', 'total_dissolved_solids'] },
    ],
  },

  evaluateReadings(readings: Record<string, number>): EquipmentAnomalyResult[] {
    const anomalies: EquipmentAnomalyResult[] = [];
    for (const pt of this.measurementPoints) {
      const val = readings[pt.parameterCode];
      if (val === undefined || isNaN(val)) continue;

      if (pt.criticalHigh !== undefined && val >= pt.criticalHigh) {
        anomalies.push({
          parameterCode: pt.parameterCode,
          parameterName: pt.parameterName,
          observedValue: val,
          unit: pt.unit,
          nominalRange: { min: pt.nominalMin, max: pt.nominalMax },
          thresholdBreached: 'CRITICAL_HIGH',
          thresholdValue: pt.criticalHigh,
          deviationDescription: `Observed ${val} ${pt.unit} critically exceeds ${pt.criticalHigh} ${pt.unit}.`,
          thematicMaintenanceAction: pt.thematicMaintenanceAction,
          severity: 'CRITICAL',
        });
      } else if (pt.warningHigh !== undefined && val >= pt.warningHigh) {
        anomalies.push({
          parameterCode: pt.parameterCode,
          parameterName: pt.parameterName,
          observedValue: val,
          unit: pt.unit,
          nominalRange: { min: pt.nominalMin, max: pt.nominalMax },
          thresholdBreached: 'WARNING_HIGH',
          thresholdValue: pt.warningHigh,
          deviationDescription: `Observed ${val} ${pt.unit} exceeds warning limit ${pt.warningHigh} ${pt.unit}.`,
          thematicMaintenanceAction: pt.thematicMaintenanceAction,
          severity: 'WARNING',
        });
      }
    }
    return anomalies;
  },

  calculateKpis(readings: Record<string, number>): Record<string, number | null> {
    return {
      STEAM_PRESSURE: readings['operating_steam_pressure'] ?? null,
      FLUE_TEMP: readings['stack_temperature'] ?? null,
      TDS: readings['total_dissolved_solids'] ?? null,
    };
  },
};
