/**
 * LuminaFM Specialized Boiler Module - Empirical Research Constants & Metadata
 *
 * Source: Vishal Perera, June 2025 Dissertation:
 * "Development of an Analytic Network Process (ANP) Based Maintenance Decision Support
 * System for Industrial Oil-Fired Steam Boilers."
 * Case Study Baseline: The Kingsbury Hotel, Colombo (1,100 kg/h oil-fired fire-tube boiler).
 * Validated Capacity Scope: 1,000 kg/h to 1,800 kg/h.
 */

export const BOILER_RESEARCH_SCOPE = {
  typology: 'OIL_FIRED_FIRE_TUBE_STEAM_BOILER',
  minCapacityKgPerHour: 1000,
  maxCapacityKgPerHour: 1800,
  nominalOperatingPressureBar: 8.5,
  safetyValveSetPressureBar: 9.0,
  dataCollectionIntervalHours: 2,
} as const;

/**
 * The 7 Physical Subsystems and 11 Primary Component Groups (Dissertation Chapter 4.2)
 */
export const BOILER_PHYSICAL_SUBSYSTEMS = [
  {
    code: 'FEED_WATER_SYSTEM',
    name: 'Feed Water System',
    components: [
      { code: 'FEED_PUMP', name: 'Feed Water Pump Assembly' },
      { code: 'ECONOMIZER', name: 'Economizer Heat Recovery Unit' },
      { code: 'FEED_WATER_TANK', name: 'Feed Water Storage Tank & Deaerator' },
    ],
  },
  {
    code: 'STEAM_GENERATION_SYSTEM',
    name: 'Steam Generation System',
    components: [
      { code: 'HEAT_EXCHANGER_TUBES', name: 'Fire-Tubes & Heat Transfer Passes' },
      { code: 'BOILER_SHELL', name: 'Boiler Shell & Water Wall Enclosure' },
    ],
  },
  {
    code: 'FUEL_AND_COMBUSTION_SYSTEM',
    name: 'Fuel & Combustion System',
    components: [
      { code: 'BURNER_ASSEMBLY', name: 'Modulating Fuel Burner & Atomizer Assembly' },
      { code: 'COMBUSTION_CHAMBER', name: 'Furnace & Refractory Combustion Chamber' },
    ],
  },
  {
    code: 'EXHAUST_GAS_SYSTEM',
    name: 'Exhaust Gas System',
    components: [
      { code: 'EXHAUST_STACK', name: 'Exhaust Stack, Damper & Chimney Flue' },
    ],
  },
  {
    code: 'WATER_TREATMENT_SYSTEM',
    name: 'Water Treatment & Chemical Dosing System',
    components: [
      { code: 'WATER_SOFTENER', name: 'Water Softener, Resin Bed & Chemical Dosing Unit' },
    ],
  },
  {
    code: 'SAFETY_AND_INSTRUMENTATION_SYSTEM',
    name: 'Safety & Instrumentation System',
    components: [
      { code: 'SAFETY_VALVES', name: 'Spring-Loaded Safety Relief Valves' },
      { code: 'WATER_LEVEL_CONTROLS', name: 'Sight Glass Gauges & Low Water Cut-Off Controls' },
    ],
  },
] as const;

export interface BoilerMeasurementPointDefinition {
  code: string;
  name: string;
  category: 'OPERATIONAL_DATA' | 'PERFORMANCE_INDICATOR' | 'PHYSICAL_INSPECTION';
  unit: string;
  nominalRange: { min: number; max: number };
  physicalRange: { min: number; max: number };
  benchmarkThreshold: {
    operator: '>' | '<' | '>=' | '<=' | 'deviation';
    value: number;
    description: string;
  };
  thematicMaintenanceAction: string;
  isRequired?: boolean;
}

/**
 * Empirical Decision Criteria, Input Parameters, and Benchmarks (Dissertation Table 4.6 & 4.7)
 * Strictly preserves the empirical research values without fabricated parameters.
 */
export const BOILER_MEASUREMENT_POINTS: Record<string, BoilerMeasurementPointDefinition> = {
  operating_steam_pressure: {
    code: 'operating_steam_pressure',
    name: 'Steam Operating Gauge Pressure',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'bar',
    nominalRange: { min: 8.0, max: 9.0 },
    physicalRange: { min: 0.0, max: 15.0 },
    benchmarkThreshold: {
      operator: '>',
      value: 9.0,
      description: 'Overpressure excursion (> 9.0 bar)',
    },
    thematicMaintenanceAction: 'BSMA 2 (Pressure switch check / recalibration)',
    isRequired: true,
  },
  steam_temperature: {
    code: 'steam_temperature',
    name: 'Main Steam Outlet Temperature',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'deg_c',
    nominalRange: { min: 160.0, max: 170.0 },
    physicalRange: { min: 100.0, max: 250.0 },
    benchmarkThreshold: {
      operator: '>',
      value: 170.0,
      description: 'Steam superheating excursion (> 170°C)',
    },
    thematicMaintenanceAction: 'CCMA 3 (Chamber refractory resurface)',
    isRequired: true,
  },
  flue_gas_temperature: {
    code: 'flue_gas_temperature',
    name: 'Stack Flue Gas Temperature',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'deg_c',
    nominalRange: { min: 160.0, max: 185.0 },
    physicalRange: { min: 50.0, max: 350.0 },
    benchmarkThreshold: {
      operator: '>',
      value: 190.0,
      description: 'Fireside soot fouling / waterside scaling (> 190°C)',
    },
    thematicMaintenanceAction: 'EMA 1 / HEMA 3 (Sootblowing & fire-tube cleaning)',
    isRequired: true,
  },
  feedwater_pressure: {
    code: 'feedwater_pressure',
    name: 'Feed Water Pump Discharge Pressure',
    category: 'OPERATIONAL_DATA',
    unit: 'bar',
    nominalRange: { min: 4.0, max: 6.0 },
    physicalRange: { min: 0.0, max: 12.0 },
    benchmarkThreshold: {
      operator: '<',
      value: 4.0,
      description: 'Feedwater pressure drop (< 4.0 bar)',
    },
    thematicMaintenanceAction: 'FPMA 2 (Feed pump impeller wear check)',
    isRequired: true,
  },
  feedwater_temperature: {
    code: 'feedwater_temperature',
    name: 'Feed Water Tank Water Temperature',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'deg_c',
    nominalRange: { min: 85.0, max: 90.0 },
    physicalRange: { min: 20.0, max: 105.0 },
    benchmarkThreshold: {
      operator: '<',
      value: 85.0,
      description: 'Subcooled feedwater (< 85°C thermal shock risk)',
    },
    thematicMaintenanceAction: 'FWTMA 3 (Tank insulation & sparge tube check)',
    isRequired: true,
  },
  return_condensate_temperature: {
    code: 'return_condensate_temperature',
    name: 'Return Hot Condensate Line Temperature',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'deg_c',
    nominalRange: { min: 85.0, max: 90.0 },
    physicalRange: { min: 20.0, max: 105.0 },
    benchmarkThreshold: {
      operator: '<',
      value: 85.0,
      description: 'Condensate subcooling (< 85°C line heat loss)',
    },
    thematicMaintenanceAction: 'FWTMA 2 (Steam trap blow-through inspection)',
  },
  pump_operating_hours: {
    code: 'pump_operating_hours',
    name: 'Feed Water Pump Cumulative Operating Hours',
    category: 'OPERATIONAL_DATA',
    unit: 'hrs',
    nominalRange: { min: 0, max: 10000 },
    physicalRange: { min: 0, max: 50000 },
    benchmarkThreshold: {
      operator: '>=',
      value: 12000,
      description: 'Feed pump major service overhaul threshold (>= 12,000 hrs)',
    },
    thematicMaintenanceAction: 'FPMA 1 (Pump mechanical seal & bearing replacement)',
  },
  burner_operating_hours: {
    code: 'burner_operating_hours',
    name: 'Burner Firing Run Hours',
    category: 'OPERATIONAL_DATA',
    unit: 'hrs',
    nominalRange: { min: 0, max: 1500 },
    physicalRange: { min: 0, max: 50000 },
    benchmarkThreshold: {
      operator: '>=',
      value: 2000,
      description: 'Burner nozzle service threshold (>= 2,000 hrs)',
    },
    thematicMaintenanceAction: 'BMA 1 (Nozzle replacement & electrode cleaning)',
  },
  exhaust_gas_o2: {
    code: 'exhaust_gas_o2',
    name: 'Flue Gas Oxygen (O2) Percentage',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'percent',
    nominalRange: { min: 3.0, max: 4.5 },
    physicalRange: { min: 0.0, max: 21.0 },
    benchmarkThreshold: {
      operator: '>',
      value: 5.5,
      description: 'Excess combustion air (> 5.5% O2)',
    },
    thematicMaintenanceAction: 'BMA 3 (Air damper & modulating linkage calibration)',
  },
  exhaust_gas_co: {
    code: 'exhaust_gas_co',
    name: 'Flue Gas Carbon Monoxide (CO) Concentration',
    category: 'PERFORMANCE_INDICATOR',
    unit: 'ppm',
    nominalRange: { min: 0, max: 100 },
    physicalRange: { min: 0, max: 2000 },
    benchmarkThreshold: {
      operator: '>',
      value: 200,
      description: 'Incomplete combustion (> 200 ppm CO)',
    },
    thematicMaintenanceAction: 'ESMA 2 / BMA 7 (Draft regulator service & atomizer check)',
  },
};

/**
 * Visual and Walkthrough Shift Inspection Checkpoints (Dissertation Table 4.6 & 4.7)
 */
export const BOILER_WALKTHROUGH_CHECKPOINTS = [
  {
    code: 'SIGHT_GLASS_LEVEL',
    name: 'Water Level Gauge Glass Blowdown Check',
    description: 'Verify water level returns immediately to normal operating centreline after blowdown.',
    expectedState: 'NORMAL_CENTRELINE',
    options: ['NORMAL_CENTRELINE', 'HIGH_LEVEL', 'LOW_LEVEL', 'DIRTY_GLASS_OBSTRUCTED'],
  },
  {
    code: 'BURNER_FLAME_APPEARANCE',
    name: 'Combustion Chamber Flame Sight Port',
    description: 'Inspect flame geometry, impingement, and color.',
    expectedState: 'BRIGHT_YELLOW_STABLE',
    options: ['BRIGHT_YELLOW_STABLE', 'DARK_SOOTY_ORANGE', 'SPARK_DELAYED', 'SMOKY_IMPINGEMENT'],
  },
  {
    code: 'STEAM_LEAKS_ACOUSTIC',
    name: 'Acoustic / Visual Steam Leak Walkthrough',
    description: 'Inspect manifold, valve glands, and flange joints for audible or visible vapor leaks.',
    expectedState: 'NO_LEAKS',
    options: ['NO_LEAKS', 'MINOR_GLAND_WEEP', 'AUDIBLE_HIGH_PRESSURE_LEAK'],
  },
  {
    code: 'SAFETY_VALVE_CONDITION',
    name: 'Safety Valve Seat and Discharge Port',
    description: 'Inspect relief valve discharge piping for steam feathering or seat leakage.',
    expectedState: 'SEATED_TIGHT_NO_LEAK',
    options: ['SEATED_TIGHT_NO_LEAK', 'FEATHERING_STEAM', 'AUDIBLE_BLOWBY'],
  },
  {
    code: 'BOTTOM_BLOWDOWN_LINE',
    name: 'Mud / Sludge Bottom Blowdown Discharge',
    description: 'Perform shift blowdown; verify free flow and clear effluent.',
    expectedState: 'FREE_FLOW_CLEAN',
    options: ['FREE_FLOW_CLEAN', 'SLUGGISH_SEDIMENT', 'BLOCKED_VALVE'],
  },
  {
    code: 'WATER_SOFTENER_HARDNESS',
    name: 'Feed Water Chemical Softness Test',
    description: 'Test treated water hardness using chemical indicator drop test.',
    expectedState: 'ZERO_HARDNESS',
    options: ['ZERO_HARDNESS', 'HARDNESS_SLIP_DETECTED', 'REGENERATION_OVERDUE'],
  },
] as const;
