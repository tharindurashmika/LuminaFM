import {
  EquipmentModuleContract,
  EquipmentAnomalyResult,
  EquipmentSpecsSchema,
} from '../../equipment-module.contract';

/**
 * Chiller Technical Specifications Schema
 */
const chillerSpecsSchema: EquipmentSpecsSchema = {
  fields: [
    {
      fieldKey: 'chillerType',
      label: 'Chiller Typology',
      dataType: 'SELECT',
      required: true,
      allowedOptions: [
        'WATER_COOLED_CENTRIFUGAL',
        'WATER_COOLED_SCREW',
        'AIR_COOLED_SCREW',
        'MAGNETIC_BEARING_CENTRIFUGAL',
      ],
      description: 'Physical compressor and heat rejection architecture.',
    },
    {
      fieldKey: 'coolingCapacityTons',
      label: 'Rated Cooling Capacity (TR)',
      dataType: 'NUMBER',
      unit: 'TR',
      required: true,
      minValue: 50,
      maxValue: 3000,
      description: 'Refrigeration cooling capacity in Tons of Refrigeration (1 TR = 3.517 kW).',
    },
    {
      fieldKey: 'refrigerantType',
      label: 'Refrigerant Designation',
      dataType: 'SELECT',
      required: true,
      allowedOptions: ['R134a', 'R513A', 'R1234ze', 'R1233zd', 'R410A'],
      description: 'ASHRAE safety group refrigerant designation.',
    },
    {
      fieldKey: 'nominalCop',
      label: 'Nominal Full-Load COP',
      dataType: 'NUMBER',
      required: true,
      minValue: 4.0,
      maxValue: 8.5,
      defaultValue: 6.2,
      description: 'Nominal Coefficient of Performance at AHRI 550/590 rating conditions.',
    },
    {
      fieldKey: 'nominalKwPerTon',
      label: 'Nominal Power Intensity (kW/TR)',
      dataType: 'NUMBER',
      unit: 'kW/TR',
      required: true,
      minValue: 0.4,
      maxValue: 1.0,
      defaultValue: 0.56,
      description: 'Full load electrical power consumption per ton of cooling.',
    },
    {
      fieldKey: 'designChilledWaterSupplyTempC',
      label: 'Design Chilled Water Supply Temp',
      dataType: 'NUMBER',
      unit: '°C',
      required: false,
      defaultValue: 6.7,
      description: 'Design leaving evaporator chilled water temperature.',
    },
    {
      fieldKey: 'designCondenserWaterSupplyTempC',
      label: 'Design Condenser Water Supply Temp',
      dataType: 'NUMBER',
      unit: '°C',
      required: false,
      defaultValue: 29.4,
      description: 'Design entering condenser water temperature from cooling tower.',
    },
    {
      fieldKey: 'vfdEquipped',
      label: 'Variable Frequency Drive (VFD)',
      dataType: 'BOOLEAN',
      required: false,
      defaultValue: true,
      description: 'Whether the compressor motor is equipped with an inverter drive.',
    },
  ],
  validate(specs: Record<string, unknown>) {
    const errors: string[] = [];
    if (!specs.chillerType) errors.push("Missing required specification: 'chillerType'.");
    if (typeof specs.coolingCapacityTons !== 'number' || specs.coolingCapacityTons <= 0) {
      errors.push("'coolingCapacityTons' must be a positive number.");
    }
    if (!specs.refrigerantType) errors.push("Missing required specification: 'refrigerantType'.");
    return { isValid: errors.length === 0, errors };
  },
};

/**
 * Standard Water-Cooled Centrifugal / Screw Chiller Extensible Module
 */
export const ChillerEquipmentModule: EquipmentModuleContract = {
  moduleCode: 'CHILLER_WATER_COOLED',
  categoryCode: 'chillers',
  name: 'Water-Cooled Centrifugal & Screw Chiller Module',
  version: '1.0.0',
  description:
    'Industrial water-cooled centrifugal and screw chillers (300 to 1,500 TR) operating in central chilled water plants. Supports AHRI 550/590 energy efficiency standards and ASHRAE Guideline 22 instrumentation.',
  governingStandards: [
    'AHRI Standard 550/590: Performance Rating of Water-Chilling Packages',
    'ASHRAE Standard 90.1: Energy Standard for Buildings Except Low-Rise Residential',
    'ASHRAE Guideline 22: Instrumentation for Monitoring Central Chilled-Water Plant Efficiency',
    'ASHRAE Standard 15: Safety Standard for Refrigeration Systems',
  ],
  icon: 'Snowflake',

  // 1. Technical Specifications Schema
  specificationsSchema: chillerSpecsSchema,

  // 2. Physical Subsystems & Hierarchy
  physicalSubsystems: [
    {
      code: 'COMPRESSOR_MOTOR_DRIVE',
      name: 'Compressor & Motor Drive Assembly',
      description: 'Centrifugal impeller or twin-screw rotor assembly, electric drive motor, and lubrication circuit.',
      components: [
        { code: 'COMPRESSOR_ROTOR', name: 'Impeller / Screw Rotor Assembly' },
        { code: 'DRIVE_MOTOR', name: 'Hermetic / Semi-Hermetic Induction Motor' },
        { code: 'GUIDE_VANES_SLIDE_VALVE', name: 'Inlet Guide Vanes / Capacity Slide Valve' },
      ],
    },
    {
      code: 'EVAPORATOR_HEAT_EXCHANGER',
      name: 'Evaporator (Cooler) Shell & Tube Heat Exchanger',
      description: 'Flooded or falling-film shell-and-tube evaporator cooling returning building water.',
      components: [
        { code: 'EVAPORATOR_TUBES', name: 'Enhanced Copper / CuNi Chilled Water Tubes' },
        { code: 'EXPANSION_DEVICE', name: 'Electronic Expansion Valve (EXV) & Liquid Level Sensor' },
        { code: 'EVAP_WATER_BOX', name: 'Chilled Water Inlet/Outlet Water Boxes' },
      ],
    },
    {
      code: 'CONDENSER_HEAT_EXCHANGER',
      name: 'Condenser Shell & Tube Heat Exchanger',
      description: 'Rejects heat from refrigerant vapor to cooling tower loop.',
      components: [
        { code: 'CONDENSER_TUBES', name: 'High-Efficiency Externally Finned Condenser Tubes' },
        { code: 'SUBCOOLER', name: 'Integral Liquid Subcooler Circuit' },
        { code: 'SAFETY_RELIEF_VALVES', name: 'Dual ASME Refrigerant Pressure Relief Valves' },
      ],
    },
    {
      code: 'LUBRICATION_OIL_CIRCUIT',
      name: 'Lubrication & Oil Recovery System',
      description: 'Maintains hydrodynamic journal bearing lubrication and oil return.',
      components: [
        { code: 'OIL_PUMP_HEATER', name: 'Auxiliary Oil Pump & Immersion Sump Heater' },
        { code: 'OIL_FILTER_ASSEMBLY', name: 'High-Efficiency Oil Filter & Differential Pressure Transducer' },
        { code: 'OIL_SEPARATOR', name: 'Internal Demister Mesh / Cyclone Oil Separator' },
      ],
    },
    {
      code: 'PURGE_UNIT_SYSTEM',
      name: 'Non-Condensible Purge System',
      description: 'Removes air and moisture from low-pressure refrigerant circuits.',
      components: [
        { code: 'PURGE_COMPRESSOR', name: 'Miniature Purge Condensing Unit' },
        { code: 'CARBON_CANISTER', name: 'Refrigerant Reclamation Carbon Canister' },
      ],
    },
    {
      code: 'VFD_AND_AUTOMATION_PANEL',
      name: 'Variable Frequency Drive & Microprocessor Controls',
      description: 'Inverter drive, harmonic filter, and microprocessor PID safety panel.',
      components: [
        { code: 'VFD_POWER_MODULE', name: 'IGBT Inverter Stack & DC Link Capacitor Bank' },
        { code: 'CHILLER_PLC_PANEL', name: 'Microprocessor Unit Controller & Sensor Network' },
      ],
    },
  ],

  // 3. Operational Readings & Measurement Points (14 Parameters)
  measurementPoints: [
    {
      parameterCode: 'CHW_SUPPLY_TEMP',
      parameterName: 'Chilled Water Supply Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'HOURLY',
      nominalMin: 6.0,
      nominalMax: 7.5,
      warningHigh: 8.5,
      criticalHigh: 10.0,
      thematicMaintenanceAction: 'Check cooling load demand, guide vane opening, and evaporator refrigerant level.',
      description: 'Leaving chilled water temperature delivered to air handling units.',
    },
    {
      parameterCode: 'CHW_RETURN_TEMP',
      parameterName: 'Chilled Water Return Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'HOURLY',
      nominalMin: 11.5,
      nominalMax: 13.5,
      warningHigh: 15.0,
      thematicMaintenanceAction: 'Inspect facility building cooling coils and bypass valves.',
      description: 'Entering chilled water returning from air handling units.',
    },
    {
      parameterCode: 'CW_SUPPLY_TEMP',
      parameterName: 'Condenser Water Supply Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'HOURLY',
      nominalMin: 27.0,
      nominalMax: 30.5,
      warningHigh: 32.0,
      criticalHigh: 34.0,
      thematicMaintenanceAction: 'Inspect cooling tower fan speed, water distribution nozzles, and wet-bulb ambient.',
      description: 'Cooling tower water entering the chiller condenser.',
    },
    {
      parameterCode: 'CW_RETURN_TEMP',
      parameterName: 'Condenser Water Return Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'HOURLY',
      nominalMin: 33.0,
      nominalMax: 36.5,
      warningHigh: 38.0,
      criticalHigh: 40.0,
      thematicMaintenanceAction: 'Check cooling tower heat rejection and water flow rate.',
      description: 'Warmed condenser water leaving chiller to cooling tower.',
    },
    {
      parameterCode: 'EVAP_APPROACH_TEMP',
      parameterName: 'Evaporator Approach Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'PER_SHIFT',
      nominalMin: 0.4,
      nominalMax: 1.5,
      warningHigh: 2.2,
      criticalHigh: 3.0,
      thematicMaintenanceAction: 'Evaporator tube waterside fouling or oil migration into cooler. Schedule tube cleaning.',
      description: 'Leaving chilled water temp minus Evaporator refrigerant saturation temp. Core fouling KPI.',
    },
    {
      parameterCode: 'COND_APPROACH_TEMP',
      parameterName: 'Condenser Approach Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'PER_SHIFT',
      nominalMin: 0.5,
      nominalMax: 1.8,
      warningHigh: 2.5,
      criticalHigh: 3.5,
      thematicMaintenanceAction: 'Condenser tube scaling, biofilm, or non-condensibles in shell. Schedule mechanical brushing.',
      description: 'Leaving condenser water temp minus Condenser refrigerant saturation temp. Core scaling KPI.',
    },
    {
      parameterCode: 'EVAP_PRESSURE',
      parameterName: 'Evaporator Refrigerant Suction Pressure',
      physicalProperty: 'PRESSURE',
      unit: 'bar',
      samplingFrequency: 'HOURLY',
      nominalMin: 2.8,
      nominalMax: 4.2,
      warningLow: 2.4,
      criticalLow: 2.0,
      thematicMaintenanceAction: 'Low suction pressure indicates refrigerant undercharge or starved expansion valve.',
      description: 'Refrigerant saturation pressure in the evaporator shell.',
    },
    {
      parameterCode: 'COND_PRESSURE',
      parameterName: 'Condenser Refrigerant Discharge Pressure',
      physicalProperty: 'PRESSURE',
      unit: 'bar',
      samplingFrequency: 'HOURLY',
      nominalMin: 7.5,
      nominalMax: 10.5,
      warningHigh: 11.5,
      criticalHigh: 13.0,
      thematicMaintenanceAction: 'High discharge pressure indicates scaled condenser tubes, tower fan failure, or air in shell.',
      description: 'Refrigerant discharge head pressure leaving compressor.',
    },
    {
      parameterCode: 'COMPRESSOR_DISCHARGE_TEMP',
      parameterName: 'Compressor Discharge Superheat Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'HOURLY',
      nominalMin: 55.0,
      nominalMax: 82.0,
      warningHigh: 90.0,
      criticalHigh: 105.0,
      thematicMaintenanceAction: 'Excessive discharge temperature causes lubrication oil breakdown. Check expansion valve.',
      description: 'Hot gas temperature measured directly downstream of compressor discharge.',
    },
    {
      parameterCode: 'OIL_PRESSURE_DIFF',
      parameterName: 'Oil Filter Differential Pressure',
      physicalProperty: 'PRESSURE',
      unit: 'bar',
      samplingFrequency: 'PER_SHIFT',
      nominalMin: 1.2,
      nominalMax: 2.4,
      warningHigh: 2.8,
      criticalHigh: 3.5,
      thematicMaintenanceAction: 'Oil filter cartridge clogged with particulate. Replace filter element immediately.',
      description: 'Pressure drop across the lubrication oil filter element.',
    },
    {
      parameterCode: 'OIL_SUMP_TEMP',
      parameterName: 'Oil Sump Reservoir Temperature',
      physicalProperty: 'TEMPERATURE',
      unit: '°C',
      samplingFrequency: 'HOURLY',
      nominalMin: 45.0,
      nominalMax: 60.0,
      warningLow: 40.0,
      warningHigh: 68.0,
      criticalHigh: 75.0,
      thematicMaintenanceAction: 'Inspect oil cooler thermostat and oil heater interlock.',
      description: 'Bearing lubrication reservoir temperature.',
    },
    {
      parameterCode: 'COMPRESSOR_RLA_PCT',
      parameterName: 'Compressor Motor Load (% RLA)',
      physicalProperty: 'PERCENTAGE',
      unit: '%',
      samplingFrequency: 'HOURLY',
      nominalMin: 35.0,
      nominalMax: 95.0,
      warningHigh: 102.0,
      criticalHigh: 108.0,
      thematicMaintenanceAction: 'Motor overload condition. Check condenser water temperature and guide vane control.',
      description: 'Percentage of rated load amperage draw by compressor drive motor.',
    },
    {
      parameterCode: 'KW_PER_TON',
      parameterName: 'Electrical Power Intensity (kW/TR)',
      physicalProperty: 'EFFICIENCY',
      unit: 'kW/TR',
      samplingFrequency: 'HOURLY',
      nominalMin: 0.50,
      nominalMax: 0.68,
      warningHigh: 0.76,
      criticalHigh: 0.88,
      thematicMaintenanceAction: 'Thermodynamic degradation detected. Review approach temperatures and refrigerant charge.',
      description: 'AHRI 550/590 energy intensity: compressor electrical input kW divided by cooling tons produced.',
    },
    {
      parameterCode: 'PURGE_DAILY_MINUTES',
      parameterName: 'Purge Unit Pump-Out Run Time Today',
      physicalProperty: 'TIME',
      unit: 'min',
      samplingFrequency: 'DAILY',
      nominalMin: 0.0,
      nominalMax: 15.0,
      warningHigh: 30.0,
      criticalHigh: 60.0,
      thematicMaintenanceAction: 'Excessive purge runtime indicates atmospheric air leak into sub-atmospheric chiller shell.',
      description: 'Total daily minutes purge compressor ran to expel non-condensible gases.',
    },
  ],

  // 4. Inspection Templates
  inspectionTemplates: [
    {
      templateCode: 'INSP-CHLR-DAILY-WALKTHROUGH',
      title: 'Chiller Shift Operator Walkthrough Checklist',
      category: 'OPERATIONAL_ROUTINE',
      checkpoints: [
        {
          checkpointCode: 'REFRIGERANT_SIGHT_GLASS',
          title: 'Liquid Line Sight Glass Refrigerant Flow',
          subsystemCode: 'EVAPORATOR_HEAT_EXCHANGER',
          inspectionType: 'VISUAL',
          frequency: 'PER_SHIFT',
          allowedResponses: [
            { code: 'CLEAR_FULL_LIQUID', label: 'Clear & Solid Liquid Flow (Normal)', isAbnormal: false },
            { code: 'CONTINUOUS_BUBBLES', label: 'Continuous Bubbles (Low Refrigerant Charge)', isAbnormal: true },
            { code: 'MOISTURE_INDICATOR_PINK', label: 'Moisture Color Indicator Wet/Pink (Moisture Alert)', isAbnormal: true },
          ],
          guidanceText: 'Observe sight glass through inspection port with flashlight. Bubbles indicate refrigerant leakage.',
          requiresPhotoOnAbnormal: true,
        },
        {
          checkpointCode: 'OIL_LEVEL_SIGHT_GLASS',
          title: 'Lubrication Sump Oil Level',
          subsystemCode: 'LUBRICATION_OIL_CIRCUIT',
          inspectionType: 'GAUGE_VERIFICATION',
          frequency: 'PER_SHIFT',
          allowedResponses: [
            { code: 'HALF_TO_THREE_QUARTER', label: '1/2 to 3/4 Sight Glass (Normal)', isAbnormal: false },
            { code: 'BELOW_ONE_QUARTER', label: 'Below 1/4 Sight Glass (Critically Low Oil)', isAbnormal: true },
            { code: 'FOAMING_EXCESSIVE', label: 'Excessive Oil Foaming / Refrigerant Boiling', isAbnormal: true },
          ],
          guidanceText: 'Oil level should settle between 1/2 and 3/4 of lower bullseye glass during steady run.',
          requiresPhotoOnAbnormal: true,
        },
        {
          checkpointCode: 'ACOUSTIC_VIBRATION',
          title: 'Compressor Impeller & Bearing Acoustic Vibration',
          subsystemCode: 'COMPRESSOR_MOTOR_DRIVE',
          inspectionType: 'AUDITORY',
          frequency: 'PER_SHIFT',
          allowedResponses: [
            { code: 'SMOOTH_HUM', label: 'Smooth Aerodynamic Whine (Normal)', isAbnormal: false },
            { code: 'CAVITATION_SURGE', label: 'Pulsing Surge / Chugging Acoustic Surge', isAbnormal: true },
            { code: 'MECHANICAL_METALLIC_KNOCK', label: 'Metallic Grinding / Bearing Chattering', isAbnormal: true },
          ],
          guidanceText: 'Listen at bearing housings for surge cavitation or metal-to-metal rubbing.',
          requiresPhotoOnAbnormal: false,
        },
        {
          checkpointCode: 'WATER_BOX_GASKET_SEALS',
          title: 'Evaporator & Condenser Water Box Gasket Seals',
          subsystemCode: 'CONDENSER_HEAT_EXCHANGER',
          inspectionType: 'LEAK_CHECK',
          frequency: 'DAILY',
          allowedResponses: [
            { code: 'TIGHT_DRY', label: 'Completely Dry, No Weeping (Normal)', isAbnormal: false },
            { code: 'ACTIVE_WEEPING', label: 'Active Water Drip / Flange Leak', isAbnormal: true },
          ],
          guidanceText: 'Check perimeter flange bolts and vent cocks for water seepage.',
          requiresPhotoOnAbnormal: true,
        },
      ],
    },
  ],

  // 5. Maintenance Task Templates (PM Routines)
  maintenanceTaskTemplates: [
    {
      taskTemplateCode: 'PM-CHLR-TUBE-BRUSH',
      title: 'Quarterly Condenser Water Box Removal & Mechanical Tube Brushing',
      subsystemCode: 'CONDENSER_HEAT_EXCHANGER',
      frequencyDays: 90,
      estimatedLaborHours: 12.0,
      tradeSkill: 'HVAC Mechanical Specialist',
      requiredParts: [
        { partCode: 'GASKET-COND-WB-01', partName: 'Neoprene Water Box Flange Gasket Set', quantity: 2 },
        { partCode: 'BRUSH-NYLON-TUBE', partName: 'Condenser Nylon Rotary Brushes (0.75 in)', quantity: 4 },
      ],
      procedureSteps: [
        'Isolate cooling tower water isolation valves and tag out condenser pumps.',
        'Drain condenser water box using bottom drain ball valves.',
        'Rig and unbolt hinged marine water boxes.',
        'Run motorized rotary tube cleaning brush with water flush through all condenser tubes.',
        'Inspect tube ends for erosion, scale, and pitting.',
        'Install new neoprene gaskets, torque water box bolts in cross-pattern to 180 Nm, and hydrostatic test.',
      ],
      safetyPrecautions: [
        'Lockout/Tagout (LOTO) of condenser water circulation pumps.',
        'Confined space awareness near open marine water boxes.',
      ],
    },
    {
      taskTemplateCode: 'PM-CHLR-OIL-SERVICE',
      title: 'Semi-Annual Lubrication Oil & Filter Cartridge Overhaul',
      subsystemCode: 'LUBRICATION_OIL_CIRCUIT',
      frequencyDays: 180,
      estimatedLaborHours: 6.0,
      tradeSkill: 'Certified Chiller Technician',
      requiredParts: [
        { partCode: 'OIL-POE-68-LUM', partName: 'Polyolester Synthetic Lubricant (POE 68)', quantity: 20 },
        { partCode: 'FLTR-OIL-CHLR-02', partName: 'Micro-Fiberglass Oil Filter Cartridge', quantity: 1 },
        { partCode: 'KIT-OIL-SAMPLE', partName: 'Laboratory Spectrometric Oil Sample Bottle Kit', quantity: 1 },
      ],
      procedureSteps: [
        'Draw 100ml hot oil sample under running conditions for laboratory wear metal and acid analysis.',
        'Shut down chiller and isolate oil filter service manifold.',
        'Depressurize and reclaim refrigerant trapped in filter housing.',
        'Remove spent oil filter element; inspect for copper/steel metallic debris.',
        'Install new filter element and evacuate housing to < 500 microns.',
        'Record baseline clean differential pressure upon startup.',
      ],
      safetyPrecautions: [
        'Wear thermal safety gloves when handling hot oil.',
        'Use certified refrigerant recovery cylinder to avoid venting.',
      ],
    },
    {
      taskTemplateCode: 'PM-CHLR-EDDY-CURRENT-NDT',
      title: 'Annual Eddy Current Non-Destructive Testing (NDT) of Heat Exchanger Tubes',
      subsystemCode: 'EVAPORATOR_HEAT_EXCHANGER',
      frequencyDays: 365,
      estimatedLaborHours: 16.0,
      tradeSkill: 'ASNT Level II NDT Inspector',
      requiredParts: [],
      procedureSteps: [
        'Open both condenser and evaporator water boxes after seasonal shutdown.',
        'Calibrate multi-frequency eddy current probe using ASME calibration tube standard.',
        'Scan 100% of condenser tubes and 25% of evaporator tubes.',
        'Map tube wall thinning, external baffle cutting, internal pitting, and freeze bulges.',
        'Plug any tube displaying wall loss exceeding 50% using brass mechanical plugs.',
        'Compile formal NDT engineering report with remaining tube life projection.',
      ],
      safetyPrecautions: ['Verify equipment grounding and probe calibration against ASME Section V Article 8 standards.'],
    },
  ],

  // 6. Decision-Support Model Association (DECOUPLED FROM BOILER ANP)
  decisionSupport: {
    frameworkType: 'RCM',
    modelCode: 'CHILLER-RCM-ASHRAE-v1.0.0',
    modelName: 'Reliability-Centered Maintenance (RCM) Decision Engine for Centrifugal & Screw Chillers',
    version: '1.0.0',
    validationStatus: 'independent_framework',
    academicValidationReference: 'ASHRAE Guideline 22-2023 & AHRI Standard 550/590 RCM Evaluation Baseline',
    crossModuleReusePermitted: false, // STRICTLY PROHIBITS BOILER MODEL REUSE
    validationDisclaimer:
      'This decision model is grounded in ASHRAE Guideline 22 and AHRI Standard 550/590 for water-cooled chillers. The boiler dissertation ANP model (Kingsbury baseline) must NOT be applied to chillers because the failure physics, thermodynamic fluid properties, and criteria topologies differ fundamentally.',
    criteria: [
      {
        code: 'CRIT_TUBE_FOULING',
        name: 'Condenser & Evaporator Tube Fouling Thermal Resistance',
        cluster: 'THERMAL_PERFORMANCE',
        weight: 0.32,
        description: 'Approach temperature elevation above clean tube baseline (scale, biological slime, mud).',
      },
      {
        code: 'CRIT_REFRIGERANT_INTEGRITY',
        name: 'Refrigerant Charge & Containment Integrity',
        cluster: 'THERMODYNAMIC_CIRCUIT',
        weight: 0.26,
        description: 'Sight glass bubbling, purge run hours, low suction pressure, and atmospheric leak probability.',
      },
      {
        code: 'CRIT_LUBRICATION_QUALITY',
        name: 'Lubrication Chemistry & Bearing Hydrodynamic Protection',
        cluster: 'MECHANICAL_HEALTH',
        weight: 0.22,
        description: 'Oil differential pressure drop, sump temperature, moisture, and acid contamination.',
      },
      {
        code: 'CRIT_ENERGY_INTENSITY_DEVIATION',
        name: 'Power Intensity (kW/TR) Deviation Against Design Baseline',
        cluster: 'ENERGY_EFFICIENCY',
        weight: 0.20,
        description: 'Excess electrical kWh consumption per refrigeration ton produced.',
      },
    ],
    alternatives: [
      {
        code: 'ALT_CONDENSER_BRUSHING',
        name: 'Mechanical Condenser Tube Brushing & Water Box Descaling',
        actionType: 'PREVENTIVE',
        estimatedCostScore: 0.25,
        downtimeImpactScore: 0.30,
        description: 'Removes waterside scale deposit to restore design condenser approach temperature.',
      },
      {
        code: 'ALT_OIL_AND_FILTER_OVERHAUL',
        name: 'Compressor Lubricant & High-Efficiency Filter Replacement',
        actionType: 'PREVENTIVE',
        estimatedCostScore: 0.35,
        downtimeImpactScore: 0.20,
        description: 'Protects compressor bearings and restores oil filter differential to nominal.',
      },
      {
        code: 'ALT_REFRIGERANT_LEAK_REPAIR',
        name: 'Helium/Sniffer Refrigerant Leak Localization & System Top-Up',
        actionType: 'CORRECTIVE',
        estimatedCostScore: 0.45,
        downtimeImpactScore: 0.40,
        description: 'Isolates and brazes flange/casting leaks and purges non-condensibles.',
      },
      {
        code: 'ALT_VFD_POWER_MODULE_SERVICE',
        name: 'VFD Inverter Capacitor & Harmonic Filter Overhaul',
        actionType: 'CONDITION_MONITORING',
        estimatedCostScore: 0.50,
        downtimeImpactScore: 0.25,
        description: 'Inspects inverter DC link capacitors, cooling fans, and gate drive electronics.',
      },
      {
        code: 'ALT_COMPLETE_COMPRESSOR_TEARDOWN',
        name: 'Major Compressor Teardown, Bearing & Impeller Replacement',
        actionType: 'OVERHAUL',
        estimatedCostScore: 0.95,
        downtimeImpactScore: 0.90,
        description: 'Full mechanical overhaul reserved for catastrophic bearing wear or rotor rub.',
      },
    ],
  },

  // 7. Equipment-Specific Dashboard Configuration
  dashboardConfig: {
    dashboardTitle: 'Central Plant Water-Cooled Chiller Telemetry & Energy Dashboard',
    kpiCards: [
      {
        kpiCode: 'CHILLER_COP',
        label: 'Operating COP',
        unit: 'COP',
        calculationFormula: 'Cooling_Output_kW / Electrical_Input_kW',
        targetBenchmark: '>= 5.8 COP',
      },
      {
        kpiCode: 'CHILLER_KW_PER_TON',
        label: 'Energy Intensity',
        unit: 'kW/TR',
        calculationFormula: 'Electrical_Input_kW / Cooling_Output_TR',
        targetBenchmark: '<= 0.60 kW/TR',
      },
      {
        kpiCode: 'COND_APPROACH',
        label: 'Condenser Approach',
        unit: '°C',
        calculationFormula: 'Condenser_Leaving_Water_C - Saturation_Temp_C',
        targetBenchmark: '< 1.8 °C',
      },
      {
        kpiCode: 'EVAP_APPROACH',
        label: 'Evaporator Approach',
        unit: '°C',
        calculationFormula: 'Chilled_Leaving_Water_C - Saturation_Temp_C',
        targetBenchmark: '< 1.5 °C',
      },
    ],
    widgets: [
      {
        widgetId: 'wdg-chiller-approach-gauges',
        widgetType: 'GAUGE',
        title: 'Heat Exchanger Approach Temperatures',
        parameterCodes: ['COND_APPROACH_TEMP', 'EVAP_APPROACH_TEMP'],
        targetSubsystem: 'CONDENSER_HEAT_EXCHANGER',
        layout: { w: 6, h: 4, x: 0, y: 0 },
        options: { cleanBaselineMarker: true },
      },
      {
        widgetId: 'wdg-chiller-oil-differential',
        widgetType: 'GAUGE',
        title: 'Lubrication Oil Filter Differential Pressure',
        parameterCodes: ['OIL_PRESSURE_DIFF'],
        targetSubsystem: 'LUBRICATION_OIL_CIRCUIT',
        layout: { w: 6, h: 4, x: 6, y: 0 },
      },
      {
        widgetId: 'wdg-chiller-energy-intensity-trend',
        widgetType: 'TIME_SERIES',
        title: 'Real-Time kW/TR Efficiency vs AHRI 550/590 Standard',
        parameterCodes: ['KW_PER_TON'],
        layout: { w: 12, h: 6, x: 0, y: 4 },
      },
    ],
  },

  // 8. Reporting Configuration
  reportingConfig: {
    reportTypes: [
      {
        reportCode: 'RPT_CHILLER_SHIFT_LOGBOOK',
        title: 'Chiller Plant Daily Operational Shift Logbook',
        format: 'PDF',
        metricsIncluded: [
          'CHW_SUPPLY_TEMP',
          'CHW_RETURN_TEMP',
          'CW_SUPPLY_TEMP',
          'CW_RETURN_TEMP',
          'EVAP_APPROACH_TEMP',
          'COND_APPROACH_TEMP',
          'OIL_PRESSURE_DIFF',
          'COMPRESSOR_RLA_PCT',
          'KW_PER_TON',
        ],
        governingStandard: 'ASHRAE Guideline 22',
      },
      {
        reportCode: 'RPT_CHILLER_AHRI_ENERGY_AUDIT',
        title: 'Chiller Energy Performance & Fouling Audit',
        format: 'CSV',
        metricsIncluded: ['KW_PER_TON', 'COND_APPROACH_TEMP', 'EVAP_APPROACH_TEMP', 'PURGE_DAILY_MINUTES'],
        governingStandard: 'AHRI Standard 550/590',
      },
    ],
  },

  // Behavioral Methods: Operational Anomaly Evaluation
  evaluateReadings(readings: Record<string, number>): EquipmentAnomalyResult[] {
    const anomalies: EquipmentAnomalyResult[] = [];

    for (const point of this.measurementPoints) {
      const val = readings[point.parameterCode];
      if (val === undefined || val === null || isNaN(val)) continue;

      let breached: 'WARNING_LOW' | 'WARNING_HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | null = null;
      let threshold = 0;
      let severity: 'WARNING' | 'CRITICAL' = 'WARNING';

      if (point.criticalHigh !== undefined && val >= point.criticalHigh) {
        breached = 'CRITICAL_HIGH';
        threshold = point.criticalHigh;
        severity = 'CRITICAL';
      } else if (point.criticalLow !== undefined && val <= point.criticalLow) {
        breached = 'CRITICAL_LOW';
        threshold = point.criticalLow;
        severity = 'CRITICAL';
      } else if (point.warningHigh !== undefined && val >= point.warningHigh) {
        breached = 'WARNING_HIGH';
        threshold = point.warningHigh;
        severity = 'WARNING';
      } else if (point.warningLow !== undefined && val <= point.warningLow) {
        breached = 'WARNING_LOW';
        threshold = point.warningLow;
        severity = 'WARNING';
      }

      if (breached) {
        const deviation =
          breached.endsWith('HIGH')
            ? `Value ${val} ${point.unit} exceeds threshold of ${threshold} ${point.unit}.`
            : `Value ${val} ${point.unit} fell below threshold of ${threshold} ${point.unit}.`;

        anomalies.push({
          parameterCode: point.parameterCode,
          parameterName: point.parameterName,
          observedValue: val,
          unit: point.unit,
          nominalRange: { min: point.nominalMin, max: point.nominalMax },
          thresholdBreached: breached,
          thresholdValue: threshold,
          deviationDescription: deviation,
          thematicMaintenanceAction: point.thematicMaintenanceAction,
          severity,
        });
      }
    }

    return anomalies;
  },

  // Behavioral Methods: Real-Time Thermodynamic KPI Calculation
  calculateKpis(readings: Record<string, number>): Record<string, number | null> {
    const chwSupply = readings['CHW_SUPPLY_TEMP'];
    const chwReturn = readings['CHW_RETURN_TEMP'];
    const kwPerTon = readings['KW_PER_TON'];

    let deltaT: number | null = null;
    if (chwReturn !== undefined && chwSupply !== undefined) {
      deltaT = Math.round((chwReturn - chwSupply) * 10) / 10;
    }

    let cop: number | null = null;
    if (kwPerTon !== undefined && kwPerTon > 0) {
      // COP = 3.517 / (kW / TR)
      cop = Math.round((3.51685 / kwPerTon) * 100) / 100;
    }

    return {
      CHW_DELTA_T: deltaT,
      COP: cop,
      COND_APPROACH: readings['COND_APPROACH_TEMP'] ?? null,
      EVAP_APPROACH: readings['EVAP_APPROACH_TEMP'] ?? null,
      OIL_DIFF: readings['OIL_PRESSURE_DIFF'] ?? null,
    };
  },
};
