/**
 * LuminaFM - Exact Dissertation ANP Model Reconstruction
 * 
 * Reconstructed from:
 * "Development of a Software-Based Boiler Maintenance Decision-Making Tool"
 * Author: Vishal Perera (June 2025), University of Moratuwa
 * Case Study Asset: The Kingsbury Hotel, Colombo (1,100 kg/h Oil-Fired Steam Boiler)
 * Source References: Chapters 4.2-4.5, Figure 4.1 (Network Model), Tables 4.6-4.10
 * 
 * Model Governance:
 * In accordance with strict academic fidelity and zero-invention policy:
 * - Network topology, 4 clusters, 22 criteria, empirical benchmarks, and 35 maintenance
 *   activities are fully reconstructed from the dissertation text.
 * - Where raw 1-9 Saaty pairwise numerical comparisons were omitted in the dissertation text,
 *   the model configuration is formally classified as 'pending_expert_judgment' with a clear
 *   specification of uncalibrated comparison matrices.
 */

import { BenchmarkOperator, BenchmarkThresholdRule } from './anp.engine';

// =============================================================================
// 1. CLUSTER DEFINITIONS (Figure 4.1)
// =============================================================================

export interface ClusterDefinition {
  code: string;
  name: string;
  description: string;
}

export const DISSERTATION_CLUSTERS: ClusterDefinition[] = [
  {
    code: 'GOAL',
    name: 'Strategic Maintenance Goal',
    description:
      'Overall decision objective: achieve cost-effective, reliable, safe, and energy-efficient boiler operation in low-sensor commercial facilities.',
  },
  {
    code: 'CRITERIA',
    name: 'Operational & Inspection Criteria',
    description:
      'The 22 expert-validated operational, performance, and inspection parameters logged 2-hourly or during shift walkthroughs.',
  },
  {
    code: 'BENCHMARKS',
    name: 'Empirical Subcriteria Benchmarks',
    description:
      'Empirical operating thresholds and tolerance limits from Tables 4.6 and 4.8-4.10 indicating parameter excursions.',
  },
  {
    code: 'ALTERNATIVES',
    name: 'Validated Maintenance Activities (35 Total)',
    description:
      'The 35 codified maintenance actions (FPMA, EMA, FWTMA, HEMA, CCMA, BMA, ESMA, SVMA, PGMA, BSMA) prioritizing engineering intervention.',
  },
];

// =============================================================================
// 2. GOAL DIMENSIONS (Section 4.4.1)
// =============================================================================

export interface GoalDimension {
  code: string;
  name: string;
  description: string;
}

export const DISSERTATION_GOAL_DIMENSIONS: GoalDimension[] = [
  {
    code: 'PERFORMANCE',
    name: 'Thermal Performance & Steam Output',
    description: 'Maintain rated 1,100 kg/h steam generation capacity and efficient heat transfer.',
  },
  {
    code: 'SAFETY',
    name: 'Plant & Pressure Vessel Safety',
    description: 'Ensure ASME/BS pressure safety valve calibration, flame monitoring, and water level protection.',
  },
  {
    code: 'COST',
    name: 'Direct Maintenance & Life-Cycle Cost',
    description: 'Minimize premature component failure, unburned fuel loss, and catastrophic overhaul costs.',
  },
  {
    code: 'ENERGY_EFFICIENCY',
    name: 'Combustion & Fuel Efficiency',
    description: 'Maintain stoichiometric air-to-fuel ratio, low excess O2, and minimal stack heat loss.',
  },
  {
    code: 'OPERATIONAL_CONTINUITY',
    name: 'Steam Availability & Reliability',
    description: 'Prevent unscheduled hotel/facility boiler shutdowns and laundry/kitchen service interruptions.',
  },
];

// =============================================================================
// 3. THE 22 VALIDATED DECISION CRITERIA & EMPIRICAL BENCHMARKS (Tables 4.6, 4.8-4.10)
// =============================================================================

export interface DissertationCriterionDefinition {
  code: string;
  name: string;
  category: 'operational_data' | 'performance_indicator' | 'physical_inspection';
  loggingMethod: string;
  subsystem: string;
  description: string;
  benchmark: BenchmarkThresholdRule;
  primaryAlternativesTriggered: string[];
}

export const DISSERTATION_CRITERIA: DissertationCriterionDefinition[] = [
  // A. Feed Pump Subsystem
  {
    code: 'PUMP_OPERATING_HOURS',
    name: 'Feed Pump Operating Hours',
    category: 'operational_data',
    loggingMethod: 'Runtime Counter / Hour Meter',
    subsystem: 'Feed Water System (Feed Pump)',
    description: 'Cumulative operating runtime of boiler feed pump. Normal benchmark: <= 10,000 hrs.',
    benchmark: {
      metricKey: 'PUMP_OPERATING_HOURS',
      operator: '>=',
      threshold: 12000,
      unit: 'hrs',
      recommendedActionTemplate: 'Schedule major centrifugal pump overhaul: replace worn mechanical seals (FPMA 1).',
    },
    primaryAlternativesTriggered: ['FPMA_1'],
  },
  {
    code: 'FEEDWATER_PRESSURE',
    name: 'Feed Water Flow / Pressure',
    category: 'operational_data',
    loggingMethod: 'Dial Gauge / 2-Hourly Log',
    subsystem: 'Feed Water System (Feed Pump)',
    description: 'Feed water delivery pressure to boiler drum. Normal range: 4.0 - 6.0 bar.',
    benchmark: {
      metricKey: 'FEEDWATER_PRESSURE',
      operator: '<',
      threshold: 4.0,
      unit: 'bar',
      recommendedActionTemplate: 'Inspect feed pump impellers for cavitation/wear (FPMA 2) and clear feed line drainpipes (FWTMA 4).',
    },
    primaryAlternativesTriggered: ['FPMA_2', 'FWTMA_4'],
  },
  {
    code: 'PUMP_OPERATING_TEMP',
    name: 'Feed Pump Bearing Operating Temperature',
    category: 'operational_data',
    loggingMethod: 'Infrared / Surface Thermometer',
    subsystem: 'Feed Water System (Feed Pump)',
    description: 'Temperature of drive-end and non-drive-end pump bearings. Normal benchmark: < 85 °C.',
    benchmark: {
      metricKey: 'PUMP_OPERATING_TEMP',
      operator: '>',
      threshold: 90.0,
      unit: '°C',
      recommendedActionTemplate: 'Lubricate and clean motor/pump bearings (FPMA 3) to prevent bearing seizure.',
    },
    primaryAlternativesTriggered: ['FPMA_3'],
  },
  {
    code: 'MOTOR_AMPERE_DRAW',
    name: 'Feed Pump Motor Ampere Draw',
    category: 'operational_data',
    loggingMethod: 'Ammeter Clip / Control Panel',
    subsystem: 'Feed Water System (Feed Pump)',
    description: 'Motor electrical current draw. Benchmark: Steady increase above motor rated FLA.',
    benchmark: {
      metricKey: 'MOTOR_AMPERE_DRAW',
      operator: '>',
      threshold: 15.0,
      unit: 'A',
      recommendedActionTemplate: 'Perform motor Megger insulation testing (FPMA 4) to detect electrical winding degradation.',
    },
    primaryAlternativesTriggered: ['FPMA_4'],
  },

  // B. Economizer & Flue Gas Subsystem
  {
    code: 'FLUE_GAS_TEMP',
    name: 'Flue Gas Stack Temperature',
    category: 'performance_indicator',
    loggingMethod: 'Stack Pyrometer / Thermocouple',
    subsystem: 'Economizer & Exhaust Stack',
    description: 'Exhaust flue gas temperature. Normal range: 190 °C - 200 °C. Excursions indicate tube fouling.',
    benchmark: {
      metricKey: 'FLUE_GAS_TEMP',
      operator: '>',
      threshold: 190.0,
      unit: '°C',
      recommendedActionTemplate: 'Remove soot/ash from economizer coils (EMA 1), brush fire tubes (HEMA 3), and inspect burner nozzle (BMA 1).',
    },
    primaryAlternativesTriggered: ['EMA_1', 'HEMA_3', 'BMA_1'],
  },
  {
    code: 'FLUE_GAS_LOW_DRAFT_TEMP',
    name: 'Flue Gas Low Draft Temperature',
    category: 'performance_indicator',
    loggingMethod: 'Stack Pyrometer',
    subsystem: 'Exhaust Stack',
    description: 'Flue gas temperature drop below threshold indicating restricted stack draft.',
    benchmark: {
      metricKey: 'FLUE_GAS_LOW_DRAFT_TEMP',
      operator: '<',
      threshold: 160.0,
      unit: '°C',
      recommendedActionTemplate: 'Clean accumulated soot and carbon deposits from exhaust stack (ESMA 1).',
    },
    primaryAlternativesTriggered: ['ESMA_1'],
  },

  // C. Feed Water Tank Subsystem
  {
    code: 'RETURN_HOT_WATER_TEMP_LOW',
    name: 'Return Hot Water Condensate Temperature (Subcooled)',
    category: 'performance_indicator',
    loggingMethod: 'Condensate Header Thermometer',
    subsystem: 'Feed Water Tank',
    description: 'Condensate return water temperature. Normal range: 85 °C - 90 °C.',
    benchmark: {
      metricKey: 'RETURN_HOT_WATER_TEMP_LOW',
      operator: '<',
      threshold: 85.0,
      unit: '°C',
      recommendedActionTemplate: 'Drain and clean sediment, sludge, and scale from feed tank bottom (FWTMA 1).',
    },
    primaryAlternativesTriggered: ['FWTMA_1'],
  },
  {
    code: 'RETURN_HOT_WATER_TEMP_HIGH',
    name: 'Return Hot Water Condensate Temperature (Steam Slip)',
    category: 'performance_indicator',
    loggingMethod: 'Condensate Header Thermometer',
    subsystem: 'Feed Water Tank',
    description: 'Condensate return temperature above 90 °C indicates blowing/defective steam traps.',
    benchmark: {
      metricKey: 'RETURN_HOT_WATER_TEMP_HIGH',
      operator: '>',
      threshold: 92.0,
      unit: '°C',
      recommendedActionTemplate: 'Clean steam trap return system and condensate headers (FWTMA 2).',
    },
    primaryAlternativesTriggered: ['FWTMA_2'],
  },
  {
    code: 'FEEDWATER_TEMP',
    name: 'Feed Water Tank Storage Temperature',
    category: 'performance_indicator',
    loggingMethod: 'Tank Dial Thermometer',
    subsystem: 'Feed Water Tank',
    description: 'Temperature of feed water storage in tank. Normal: 85 °C - 90 °C.',
    benchmark: {
      metricKey: 'FEEDWATER_TEMP',
      operator: '<',
      threshold: 85.0,
      unit: '°C',
      recommendedActionTemplate: 'Inspect and replace damaged/deteriorated tank thermal insulation (FWTMA 3).',
    },
    primaryAlternativesTriggered: ['FWTMA_3'],
  },
  {
    code: 'BOILER_WATER_LEVEL',
    name: 'Boiler Drum Water Level Departure',
    category: 'performance_indicator',
    loggingMethod: 'Sight Glass Observation',
    subsystem: 'Steam Generation & Feed System',
    description: 'Sight glass level departure from normal operating centerline.',
    benchmark: {
      metricKey: 'BOILER_WATER_LEVEL',
      operator: '==',
      threshold: 'abnormal',
      unit: null,
      recommendedActionTemplate: 'Water level cut-off valve repair/replacement (FWTMA 5) to prevent low-water trip or priming.',
    },
    primaryAlternativesTriggered: ['FWTMA_5'],
  },
  {
    code: 'FEEDWATER_TANK_LEVEL',
    name: 'Feed Water Tank Storage Level Departure',
    category: 'performance_indicator',
    loggingMethod: 'Tank Level Sight Gauge',
    subsystem: 'Feed Water Tank',
    description: 'Feed water storage tank level departure from safe operating mark.',
    benchmark: {
      metricKey: 'FEEDWATER_TANK_LEVEL',
      operator: '==',
      threshold: 'abnormal',
      unit: null,
      recommendedActionTemplate: 'Feed water non-return check valve repair/replacement (FWTMA 6).',
    },
    primaryAlternativesTriggered: ['FWTMA_6'],
  },

  // D. Steam Generation Subsystem
  {
    code: 'STEAM_PRODUCTION_RATE',
    name: 'Steam Production Generation Rate',
    category: 'performance_indicator',
    loggingMethod: 'Steam Flowmeter / Shift Log',
    subsystem: 'Steam Generation System',
    description: 'Steam generation rate compared to rated 1,100 kg/h capacity.',
    benchmark: {
      metricKey: 'STEAM_PRODUCTION_RATE',
      operator: '<',
      threshold: 1000.0,
      unit: 'kg/h',
      recommendedActionTemplate: 'Perform chemical de-scaling of fire tubes (HEMA 1) and clean burner fuel pump filter (BMA 5).',
    },
    primaryAlternativesTriggered: ['HEMA_1', 'BMA_5'],
  },
  {
    code: 'STEAM_PRESSURE_LOW',
    name: 'Operating Steam Pressure Drop',
    category: 'performance_indicator',
    loggingMethod: 'Master Steam Pressure Gauge',
    subsystem: 'Steam Generation & Safety System',
    description: 'Steam operating pressure drop below 8.0 bar during load.',
    benchmark: {
      metricKey: 'STEAM_PRESSURE_LOW',
      operator: '<',
      threshold: 8.0,
      unit: 'bar',
      recommendedActionTemplate: 'Inspect combustion chamber rebe tray (CCMA 1) and lap safety valve seats (SVMA 2).',
    },
    primaryAlternativesTriggered: ['CCMA_1', 'SVMA_2'],
  },
  {
    code: 'STEAM_PRESSURE_HIGH',
    name: 'Operating Steam Pressure Excursion (Overpressure)',
    category: 'performance_indicator',
    loggingMethod: 'Master Steam Pressure Gauge',
    subsystem: 'Steam Generation & Safety System',
    description: 'Steam operating pressure exceeding safety limit of 9.0 bar.',
    benchmark: {
      metricKey: 'STEAM_PRESSURE_HIGH',
      operator: '>',
      threshold: 9.0,
      unit: 'bar',
      recommendedActionTemplate: 'Replace or recalibrate electromechanical pressure cut-off switch (BSMA 2).',
    },
    primaryAlternativesTriggered: ['BSMA_2'],
  },
  {
    code: 'STEAM_TEMP_SUPERHEATED',
    name: 'Steam Temperature Excursion (Elevated)',
    category: 'performance_indicator',
    loggingMethod: 'Steam Header Sensor',
    subsystem: 'Steam Generation & Combustion',
    description: 'Steam temperature exceeding saturated range (> 170 °C at 8-9 bar).',
    benchmark: {
      metricKey: 'STEAM_TEMP_SUPERHEATED',
      operator: '>',
      threshold: 175.0,
      unit: '°C',
      recommendedActionTemplate: 'Resurface and patch refractory lining in combustion chamber (CCMA 3).',
    },
    primaryAlternativesTriggered: ['CCMA_3'],
  },
  {
    code: 'STEAM_TEMP_WET',
    name: 'Steam Temperature Low (Wet Steam / Carryover)',
    category: 'performance_indicator',
    loggingMethod: 'Steam Header Sensor',
    subsystem: 'Steam Generation System',
    description: 'Steam temperature below saturated steam baseline (< 160 °C at 8-9 bar).',
    benchmark: {
      metricKey: 'STEAM_TEMP_WET',
      operator: '<',
      threshold: 160.0,
      unit: '°C',
      recommendedActionTemplate: 'Inspect burner fuel pump pressure and clean suction filter/strainer (BMA 5).',
    },
    primaryAlternativesTriggered: ['BMA_5'],
  },

  // E. Burner Assembly Subsystem
  {
    code: 'BURNER_OPERATING_HOURS',
    name: 'Burner Operating Running Hours',
    category: 'operational_data',
    loggingMethod: 'Burner Hour Meter',
    subsystem: 'Fuel & Combustion System (Burner)',
    description: 'Cumulative burner firing hours. Benchmark: Overhaul at >= 2,000 hrs.',
    benchmark: {
      metricKey: 'BURNER_OPERATING_HOURS',
      operator: '>=',
      threshold: 2000,
      unit: 'hrs',
      recommendedActionTemplate: 'Clean or replace worn/carbonized fuel atomizing nozzle (BMA 1).',
    },
    primaryAlternativesTriggered: ['BMA_1'],
  },
  {
    code: 'FUEL_CONSUMPTION_RATE',
    name: 'Specific Fuel Consumption Rate',
    category: 'performance_indicator',
    loggingMethod: 'Day-Tank Level / Flowmeter Log',
    subsystem: 'Fuel & Combustion System',
    description: 'Excess fuel consumption >= 10% above baseline per kg steam generated.',
    benchmark: {
      metricKey: 'FUEL_CONSUMPTION_RATE',
      operator: '>',
      threshold: 82.0,
      unit: 'L/h',
      recommendedActionTemplate: 'Clean optical photocell flame scanner (BMA 4) and replace leaking fuel solenoid valve (BMA 6).',
    },
    primaryAlternativesTriggered: ['BMA_4', 'BMA_6'],
  },
  {
    code: 'BURNER_IGNITION_SPARK',
    name: 'Burner Ignition Spark Visual State',
    category: 'physical_inspection',
    loggingMethod: 'Observation Port / Inspection',
    subsystem: 'Fuel & Combustion System (Burner)',
    description: 'Visual spark quality and electrode discharge stability.',
    benchmark: {
      metricKey: 'BURNER_IGNITION_SPARK',
      operator: '==',
      threshold: 'poor',
      unit: null,
      recommendedActionTemplate: 'Replace defective ignition electrodes (BMA 2) and replace fuel atomizer assembly (BMA 7).',
    },
    primaryAlternativesTriggered: ['BMA_2', 'BMA_7'],
  },
  {
    code: 'EXHAUST_O2_LEVEL',
    name: 'Exhaust Gas Excess O2 Concentration',
    category: 'performance_indicator',
    loggingMethod: 'Flue Gas Analyzer Log',
    subsystem: 'Combustion & Exhaust Stack',
    description: 'Excess oxygen in flue gas. Normal: 3.0% - 4.5%. Elevated values indicate excess air loss.',
    benchmark: {
      metricKey: 'EXHAUST_O2_LEVEL',
      operator: '>',
      threshold: 5.5,
      unit: '%',
      recommendedActionTemplate: 'Calibrate air dampers and modulating linkages (BMA 3) to optimize air-to-fuel ratio.',
    },
    primaryAlternativesTriggered: ['BMA_3'],
  },
  {
    code: 'EXHAUST_CO_LEVEL',
    name: 'Exhaust Gas Carbon Monoxide Concentration',
    category: 'performance_indicator',
    loggingMethod: 'Flue Gas Analyzer Log',
    subsystem: 'Combustion & Exhaust Stack',
    description: 'Carbon monoxide in flue gas. Normal: < 100 ppm. Elevated values indicate incomplete combustion.',
    benchmark: {
      metricKey: 'EXHAUST_CO_LEVEL',
      operator: '>',
      threshold: 200,
      unit: 'ppm',
      recommendedActionTemplate: 'Inspect and calibrate draft regulators and exhaust dampers (ESMA 2).',
    },
    primaryAlternativesTriggered: ['ESMA_2'],
  },

  // F. Physical Inspections & Safety Interventions
  {
    code: 'SAFETY_VALVE_POPPING',
    name: 'Safety Valve Lift / Pop Pressure Test',
    category: 'physical_inspection',
    loggingMethod: 'Annual Pop Lift Test Gauge',
    subsystem: 'Safety & Control System',
    description: 'Pop lift pressure verification against exact set point of 9.0 bar.',
    benchmark: {
      metricKey: 'SAFETY_VALVE_POPPING',
      operator: '!=',
      threshold: 9.0,
      unit: 'bar',
      recommendedActionTemplate: 'Replace weakened pressure relief valve springs (SVMA 1).',
    },
    primaryAlternativesTriggered: ['SVMA_1'],
  },
  {
    code: 'HYDROSTATIC_LEAK_TEST',
    name: 'Hydrostatic Vessel & Fire-Tube Pressure Test',
    category: 'physical_inspection',
    loggingMethod: 'Hydrostatic Leak Test (Annual)',
    subsystem: 'Steam Generation & Tubes',
    description: 'Vessel pressure drop or weeping/leaking during hydrostatic proof test.',
    benchmark: {
      metricKey: 'HYDROSTATIC_LEAK_TEST',
      operator: '==',
      threshold: 'fail',
      unit: null,
      recommendedActionTemplate: 'Replace cracked or leaking fire tubes via tube expansion/welding (HEMA 2).',
    },
    primaryAlternativesTriggered: ['HEMA_2'],
  },
  {
    code: 'REFRACTORY_INTEGRITY',
    name: 'Combustion Chamber Refractory Lining Integrity',
    category: 'physical_inspection',
    loggingMethod: 'Internal Visual Inspection',
    subsystem: 'Combustion Chamber',
    description: 'Refractory lining spalling, fractures, or hot spot erosion.',
    benchmark: {
      metricKey: 'REFRACTORY_INTEGRITY',
      operator: '==',
      threshold: 'damaged',
      unit: null,
      recommendedActionTemplate: 'Rebe tray repair/alignment (CCMA 2) and refractory patch resurfacing (CCMA 3).',
    },
    primaryAlternativesTriggered: ['CCMA_2', 'CCMA_3'],
  },
  {
    code: 'STEAM_LEAKS',
    name: 'Safety Valve & Piping Steam Leaks',
    category: 'physical_inspection',
    loggingMethod: 'Acoustic / Visual Walkthrough',
    subsystem: 'Safety & Control System',
    description: 'Audible or visible steam vapor escaping from valve spindles, discs, or pipe flanges.',
    benchmark: {
      metricKey: 'STEAM_LEAKS',
      operator: '==',
      threshold: 'detected',
      unit: null,
      recommendedActionTemplate: 'Replace corroded valve discs (SVMA 3) and replace hardened high-temp flange gaskets (SVMA 4).',
    },
    primaryAlternativesTriggered: ['SVMA_3', 'SVMA_4'],
  },
  {
    code: 'PRESSURE_GAUGE_RESPONSE',
    name: 'Pressure Gauge Mechanical Responsiveness',
    category: 'physical_inspection',
    loggingMethod: 'Dual Gauge Comparison Walkthrough',
    subsystem: 'Safety & Control System (Gauges)',
    description: 'Concordance between master and secondary Bourdon dial gauges.',
    benchmark: {
      metricKey: 'PRESSURE_GAUGE_RESPONSE',
      operator: '==',
      threshold: 'faulty',
      unit: null,
      recommendedActionTemplate: 'Replace damaged Bourdon mechanisms (PGMA 1), clean siphon port (PGMA 2), and tighten fittings (PGMA 3).',
    },
    primaryAlternativesTriggered: ['PGMA_1', 'PGMA_2', 'PGMA_3'],
  },
  {
    code: 'BLOWDOWN_OPERATION',
    name: 'Bottom Blowdown Valve Discharge Integrity',
    category: 'physical_inspection',
    loggingMethod: 'Shift Blowdown Routine Check',
    subsystem: 'Boiler Shell & Blowdown',
    description: 'Free flow, rapid shutoff, and absence of seat leakage during bottom blowdown.',
    benchmark: {
      metricKey: 'BLOWDOWN_OPERATION',
      operator: '==',
      threshold: 'abnormal',
      unit: null,
      recommendedActionTemplate: 'Overhaul and service bottom blowdown valves (BSMA 1) to restore rapid sludge discharge.',
    },
    primaryAlternativesTriggered: ['BSMA_1'],
  },
  {
    code: 'SEDIMENT_ACCUMULATION',
    name: 'Feed Water Tank Sediment & Sludge Accumulation',
    category: 'physical_inspection',
    loggingMethod: 'Monthly Drain Inspection Port',
    subsystem: 'Feed Water Tank',
    description: 'Visual sediment and scale mud buildup on feed tank floor.',
    benchmark: {
      metricKey: 'SEDIMENT_ACCUMULATION',
      operator: '==',
      threshold: 'excessive',
      unit: null,
      recommendedActionTemplate: 'Remove sediment, sludge, and scale from tank bottom (FWTMA 1).',
    },
    primaryAlternativesTriggered: ['FWTMA_1'],
  },
];

// =============================================================================
// 4. THE 35 VALIDATED MAINTENANCE ACTIVITIES (ALTERNATIVES) (Table 4.2)
// =============================================================================

export interface DissertationAlternativeDefinition {
  code: string;
  name: string;
  subsystem: string;
  subsystemCode: string;
  cycle: 'Monthly' | 'Quarterly' | 'Biannual' | 'Annual' | 'Corrective_Shift';
  description: string;
}

export const DISSERTATION_ALTERNATIVES: DissertationAlternativeDefinition[] = [
  // 1. Feed Pump (FPMA 1-4)
  {
    code: 'FPMA_1',
    name: 'Replace worn mechanical seals',
    subsystem: 'Feed Water System - Feed Pump',
    subsystemCode: 'FP',
    cycle: 'Annual',
    description: 'Replace carbon-ceramic mechanical seal cartridges to eliminate shaft leakage and maintain delivery head.',
  },
  {
    code: 'FPMA_2',
    name: 'Replace damaged impellers',
    subsystem: 'Feed Water System - Feed Pump',
    subsystemCode: 'FP',
    cycle: 'Annual',
    description: 'Inspect multi-stage centrifugal impellers for cavitation pitting and replace worn stages.',
  },
  {
    code: 'FPMA_3',
    name: 'Lubricate and clean motor/pump bearings',
    subsystem: 'Feed Water System - Feed Pump',
    subsystemCode: 'FP',
    cycle: 'Monthly',
    description: 'Purge old grease, clean bearing housings, and repack with high-temperature synthetic grease.',
  },
  {
    code: 'FPMA_4',
    name: 'Motor Megger insulation testing',
    subsystem: 'Feed Water System - Feed Pump',
    subsystemCode: 'FP',
    cycle: 'Annual',
    description: 'Perform 1,000V DC Megger insulation resistance test across stator windings to ground to detect insulation breakdown.',
  },

  // 2. Economizer (EMA 1)
  {
    code: 'EMA_1',
    name: 'Remove soot and ash deposits from economizer coils',
    subsystem: 'Feed Water System - Economizer',
    subsystemCode: 'EC',
    cycle: 'Quarterly',
    description: 'Clean outer fin surfaces of economizer tube bank to recover heat transfer and lower flue gas backpressure.',
  },

  // 3. Feed Water Tank (FWTMA 1-6)
  {
    code: 'FWTMA_1',
    name: 'Remove sediment, sludge, and scale from tank bottom',
    subsystem: 'Feed Water System - Feed Water Tank',
    subsystemCode: 'FWT',
    cycle: 'Annual',
    description: 'Drain tank completely, scrape sludge and calcium scale, and flush bottom ports.',
  },
  {
    code: 'FWTMA_2',
    name: 'Clean steam trap return system and condensate headers',
    subsystem: 'Feed Water System - Feed Water Tank',
    subsystemCode: 'FWT',
    cycle: 'Annual',
    description: 'Ultrasonically clean steam trap discs and check valves to stop live steam slip into condensate receiver.',
  },
  {
    code: 'FWTMA_3',
    name: 'Replace damaged or deteriorated thermal insulation',
    subsystem: 'Feed Water System - Feed Water Tank',
    subsystemCode: 'FWT',
    cycle: 'Annual',
    description: 'Re-jacket tank with rockwool and aluminum cladding to preserve 85-90 °C feedwater temperature.',
  },
  {
    code: 'FWTMA_4',
    name: 'Clear clogged drainpipes and overflow ports',
    subsystem: 'Feed Water System - Feed Water Tank',
    subsystemCode: 'FWT',
    cycle: 'Quarterly',
    description: 'Rod out overflow discharge line and drain valve to ensure emergency drainage reliability.',
  },
  {
    code: 'FWTMA_5',
    name: 'Water level cut-off valve repair / replacement',
    subsystem: 'Feed Water System - Feed Water Tank',
    subsystemCode: 'FWT',
    cycle: 'Annual',
    description: 'Overhaul float-operated or motorized makeup valve mechanism to prevent tank low-water trip.',
  },
  {
    code: 'FWTMA_6',
    name: 'Feed water non-return check valve repair / replacement',
    subsystem: 'Feed Water System - Feed Water Tank',
    subsystemCode: 'FWT',
    cycle: 'Annual',
    description: 'Lap check valve disc and replace spring to stop boiler backpressure leakage into feed tank.',
  },

  // 4. Heat Exchanger & Fire Tubes (HEMA 1-3)
  {
    code: 'HEMA_1',
    name: 'Chemical de-scaling to remove calcium carbonate scale',
    subsystem: 'Steam Generation System - Fire Tubes',
    subsystemCode: 'HE',
    cycle: 'Annual',
    description: 'Circulate inhibited acid descaler to dissolve CaCO3 water-side scale and restore boiler efficiency.',
  },
  {
    code: 'HEMA_2',
    name: 'Replace cracked or leaking fire tubes via hydrostatic testing',
    subsystem: 'Steam Generation System - Fire Tubes',
    subsystemCode: 'HE',
    cycle: 'Annual',
    description: 'Cut out failed fire tubes, insert new seamless carbon steel tubes, and expand/seal-weld into tube sheets.',
  },
  {
    code: 'HEMA_3',
    name: 'Brush and soot-clean internal and external fire-tube surfaces',
    subsystem: 'Steam Generation System - Fire Tubes',
    subsystemCode: 'HE',
    cycle: 'Quarterly',
    description: 'Pass wire brushes through all fire-tube gas passes to remove insulating carbon and soot layers.',
  },

  // 5. Combustion Chamber (CCMA 1-3)
  {
    code: 'CCMA_1',
    name: 'Remove ash and slag deposits from chamber bottom',
    subsystem: 'Fuel & Combustion System - Combustion Chamber',
    subsystemCode: 'CC',
    cycle: 'Monthly',
    description: 'Vacuum and shovel accumulated ash, slag, and unburned oil soot from furnace bottom.',
  },
  {
    code: 'CCMA_2',
    name: 'Rebe tray repair and alignment',
    subsystem: 'Fuel & Combustion System - Combustion Chamber',
    subsystemCode: 'CC',
    cycle: 'Annual',
    description: 'Realign and weld distorted flame baffle trays to maintain uniform radiant combustion distribution.',
  },
  {
    code: 'CCMA_3',
    name: 'Resurface and patch refractory lining',
    subsystem: 'Fuel & Combustion System - Combustion Chamber',
    subsystemCode: 'CC',
    cycle: 'Annual',
    description: 'Apply high-alumina refractory plastic/castable cement over spalled firebrick and burner throat.',
  },

  // 6. Burner Assembly (BMA 1-7)
  {
    code: 'BMA_1',
    name: 'Replace or clean worn/carbonized fuel atomizing nozzles',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Annual',
    description: 'Ultrasonically clean nozzle swirl chambers and replace worn orifice tips to guarantee conical mist spray.',
  },
  {
    code: 'BMA_2',
    name: 'Replace defective burner ignition electrodes / igniters',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Annual',
    description: 'Set electrode spark gap to 3.5 mm and replace cracked porcelain insulators to prevent delayed ignition.',
  },
  {
    code: 'BMA_3',
    name: 'Calibrate air dampers and modulating linkages',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Annual',
    description: 'Calibrate servomotor cam linkages against flue gas analyzer to maintain 3.0-4.5% excess O2 across firing range.',
  },
  {
    code: 'BMA_4',
    name: 'Clean and inspect optical photocell flame scanner',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Annual',
    description: 'Wipe soot film from scanner quartz lens and test microamp flame current signal at flame controller.',
  },
  {
    code: 'BMA_5',
    name: 'Clean fuel pressure pump suction filter and strainer',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Quarterly',
    description: 'Remove wire-mesh basket from fuel pump suction strainer and wash in solvent to prevent fuel pump starvation.',
  },
  {
    code: 'BMA_6',
    name: 'Replace leaking or sticking fuel solenoid valves',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Annual',
    description: 'Replace Viton valve seats and solenoid coils to prevent fuel drippage into combustion chamber during post-purge.',
  },
  {
    code: 'BMA_7',
    name: 'Replace fuel atomizer assembly',
    subsystem: 'Fuel & Combustion System - Burner Assembly',
    subsystemCode: 'BN',
    cycle: 'Annual',
    description: 'Renew entire atomizing lance assembly to guarantee precise oil droplet micron distribution at peak load.',
  },

  // 7. Exhaust Stack (ESMA 1-2)
  {
    code: 'ESMA_1',
    name: 'Clean accumulated soot and carbon deposits from stack',
    subsystem: 'Fuel & Combustion System - Exhaust Stack',
    subsystemCode: 'ES',
    cycle: 'Annual',
    description: 'Scrape and sweep flue gas chimney stack to eliminate chimney draft constriction and fire hazards.',
  },
  {
    code: 'ESMA_2',
    name: 'Inspect and calibrate draft regulators and exhaust dampers',
    subsystem: 'Fuel & Combustion System - Exhaust Stack',
    subsystemCode: 'ES',
    cycle: 'Biannual',
    description: 'Adjust barometric draft regulator counterweight to maintain stable furnace negative pressure.',
  },

  // 8. Safety Valves (SVMA 1-4)
  {
    code: 'SVMA_1',
    name: 'Replace weakened pressure relief valve springs',
    subsystem: 'Safety & Control System - Safety Valves',
    subsystemCode: 'SV',
    cycle: 'Annual',
    description: 'Bench-test and replace heat-fatigued safety valve compression springs to guarantee pop at 9.0 bar.',
  },
  {
    code: 'SVMA_2',
    name: 'Lap and polish valve seating surfaces',
    subsystem: 'Safety & Control System - Safety Valves',
    subsystemCode: 'SV',
    cycle: 'Annual',
    description: 'Lap valve disc and nozzle seats using fine diamond compound until 100% optical bluing contact is obtained.',
  },
  {
    code: 'SVMA_3',
    name: 'Replace corroded or eroded valve discs',
    subsystem: 'Safety & Control System - Safety Valves',
    subsystemCode: 'SV',
    cycle: 'Biannual',
    description: 'Replace steam-cut stainless steel valve discs to eliminate unseated vapor leakage.',
  },
  {
    code: 'SVMA_4',
    name: 'Replace hardened high-temperature flange gaskets',
    subsystem: 'Safety & Control System - Safety Valves',
    subsystemCode: 'SV',
    cycle: 'Biannual',
    description: 'Replace spiral-wound graphite/stainless flange gaskets on safety valve inlet and discharge connections.',
  },

  // 9. Pressure Gauges (PGMA 1-3)
  {
    code: 'PGMA_1',
    name: 'Replace damaged Bourdon tube internal mechanisms',
    subsystem: 'Safety & Control System - Pressure Gauges',
    subsystemCode: 'PG',
    cycle: 'Annual',
    description: 'Replace internal quadrant gear and pinion movement in master steam pressure gauges showing deadband.',
  },
  {
    code: 'PGMA_2',
    name: 'Clean siphon tube and impulse connection ports',
    subsystem: 'Safety & Control System - Pressure Gauges',
    subsystemCode: 'PG',
    cycle: 'Annual',
    description: 'Flush pigtail siphon loop with compressed air/solvent to remove scale and ensure water seal preserves gauge.',
  },
  {
    code: 'PGMA_3',
    name: 'Tighten or re-thread loose pressure fittings',
    subsystem: 'Safety & Control System - Pressure Gauges',
    subsystemCode: 'PG',
    cycle: 'Quarterly',
    description: 'Reseal NPT/BSPP gauge cock threads using high-temperature PTFE paste to eliminate joint weeping.',
  },

  // 10. Boiler Shell (BSMA 1-2)
  {
    code: 'BSMA_1',
    name: 'Overhaul and service bottom blowdown valves',
    subsystem: 'Safety & Control System - Boiler Shell',
    subsystemCode: 'BS',
    cycle: 'Biannual',
    description: 'Disassemble rack-and-pinion blowdown valves, repack stem gland seals, and lap stellite seats.',
  },
  {
    code: 'BSMA_2',
    name: 'Replace or recalibrate electromechanical pressure cut-off switches',
    subsystem: 'Safety & Control System - Boiler Shell',
    subsystemCode: 'BS',
    cycle: 'Biannual',
    description: 'Recalibrate mercury-tube/microswitch high-pressure limit pressuretrol cutout to trip burner at 9.0 bar.',
  },
];

// =============================================================================
// 5. INTERDEPENDENCE AND FEEDBACK RELATIONSHIPS (Figure 4.1 Synthesis)
// =============================================================================

export interface NetworkEdgeDefinition {
  fromNode: string;
  toNode: string;
  edgeType: 'outer_dependence' | 'inner_dependence' | 'feedback';
  description: string;
}

export const DISSERTATION_NETWORK_EDGES: NetworkEdgeDefinition[] = [
  // --- Outer Dependence: Criteria -> Alternatives (Anomaly Excursion Triggers) ---
  {
    fromNode: 'PUMP_OPERATING_HOURS',
    toNode: 'FPMA_1',
    edgeType: 'outer_dependence',
    description: 'High pump runtime drives mechanical seal replacement.',
  },
  {
    fromNode: 'FEEDWATER_PRESSURE',
    toNode: 'FPMA_2',
    edgeType: 'outer_dependence',
    description: 'Low feedwater pressure indicates worn impeller.',
  },
  {
    fromNode: 'FEEDWATER_PRESSURE',
    toNode: 'FWTMA_4',
    edgeType: 'outer_dependence',
    description: 'Feed line pressure drop drives drainpipe clearance.',
  },
  {
    fromNode: 'PUMP_OPERATING_TEMP',
    toNode: 'FPMA_3',
    edgeType: 'outer_dependence',
    description: 'Bearing overheating triggers bearing lubrication/cleaning.',
  },
  {
    fromNode: 'MOTOR_AMPERE_DRAW',
    toNode: 'FPMA_4',
    edgeType: 'outer_dependence',
    description: 'Elevated motor current triggers Megger insulation testing.',
  },
  {
    fromNode: 'FLUE_GAS_TEMP',
    toNode: 'EMA_1',
    edgeType: 'outer_dependence',
    description: 'Elevated stack temperature triggers economizer soot cleaning.',
  },
  {
    fromNode: 'FLUE_GAS_TEMP',
    toNode: 'HEMA_3',
    edgeType: 'outer_dependence',
    description: 'Elevated flue gas temperature triggers fire tube soot brushing.',
  },
  {
    fromNode: 'FLUE_GAS_TEMP',
    toNode: 'BMA_1',
    edgeType: 'outer_dependence',
    description: 'Poor combustion heat exchange triggers burner nozzle cleaning.',
  },
  {
    fromNode: 'STEAM_PRODUCTION_RATE',
    toNode: 'HEMA_1',
    edgeType: 'outer_dependence',
    description: 'Steam generation deficit triggers chemical tube de-scaling.',
  },
  {
    fromNode: 'STEAM_PRESSURE_LOW',
    toNode: 'SVMA_2',
    edgeType: 'outer_dependence',
    description: 'Steam pressure loss triggers safety valve seat lapping.',
  },
  {
    fromNode: 'STEAM_PRESSURE_HIGH',
    toNode: 'BSMA_2',
    edgeType: 'outer_dependence',
    description: 'Vessel overpressure triggers pressure switch replacement.',
  },
  {
    fromNode: 'BURNER_OPERATING_HOURS',
    toNode: 'BMA_1',
    edgeType: 'outer_dependence',
    description: 'Burner runtime >= 2000 hrs triggers nozzle replacement.',
  },
  {
    fromNode: 'FUEL_CONSUMPTION_RATE',
    toNode: 'BMA_4',
    edgeType: 'outer_dependence',
    description: 'Excess fuel consumption triggers photocell flame scanner inspection.',
  },
  {
    fromNode: 'EXHAUST_O2_LEVEL',
    toNode: 'BMA_3',
    edgeType: 'outer_dependence',
    description: 'High excess O2 triggers damper linkage recalibration.',
  },
  {
    fromNode: 'EXHAUST_CO_LEVEL',
    toNode: 'ESMA_2',
    edgeType: 'outer_dependence',
    description: 'High CO concentration triggers draft regulator service.',
  },
  {
    fromNode: 'SAFETY_VALVE_POPPING',
    toNode: 'SVMA_1',
    edgeType: 'outer_dependence',
    description: 'Pop lift test failure triggers safety valve spring replacement.',
  },
  {
    fromNode: 'HYDROSTATIC_LEAK_TEST',
    toNode: 'HEMA_2',
    edgeType: 'outer_dependence',
    description: 'Hydrostatic pressure drop triggers fire-tube replacement.',
  },
  {
    fromNode: 'REFRACTORY_INTEGRITY',
    toNode: 'CCMA_3',
    edgeType: 'outer_dependence',
    description: 'Refractory damage triggers chamber refractory resurfacing.',
  },
  {
    fromNode: 'STEAM_LEAKS',
    toNode: 'SVMA_3',
    edgeType: 'outer_dependence',
    description: 'Steam leaks trigger safety valve disc replacement.',
  },
  {
    fromNode: 'PRESSURE_GAUGE_RESPONSE',
    toNode: 'PGMA_1',
    edgeType: 'outer_dependence',
    description: 'Sluggish gauge movement triggers Bourdon movement replacement.',
  },
  {
    fromNode: 'BLOWDOWN_OPERATION',
    toNode: 'BSMA_1',
    edgeType: 'outer_dependence',
    description: 'Seized blowdown valve triggers valve overhaul and seat lapping.',
  },
  {
    fromNode: 'SEDIMENT_ACCUMULATION',
    toNode: 'FWTMA_1',
    edgeType: 'outer_dependence',
    description: 'Feed tank mud layer triggers bottom sludge washout.',
  },

  // --- Feedback Relationships: Alternatives -> Criteria (State Restoration) ---
  {
    fromNode: 'HEMA_1',
    toNode: 'STEAM_PRODUCTION_RATE',
    edgeType: 'feedback',
    description: 'Chemical de-scaling restores rated heat transfer and steam output.',
  },
  {
    fromNode: 'HEMA_3',
    toNode: 'FLUE_GAS_TEMP',
    edgeType: 'feedback',
    description: 'Fire tube soot brushing lowers stack flue gas temperature.',
  },
  {
    fromNode: 'EMA_1',
    toNode: 'FLUE_GAS_TEMP',
    edgeType: 'feedback',
    description: 'Economizer cleaning recovers sensible heat, reducing stack loss.',
  },
  {
    fromNode: 'BMA_3',
    toNode: 'EXHAUST_O2_LEVEL',
    edgeType: 'feedback',
    description: 'Damper calibration restores stoichiometric 3.0-4.5% O2 level.',
  },
  {
    fromNode: 'BMA_1',
    toNode: 'FUEL_CONSUMPTION_RATE',
    edgeType: 'feedback',
    description: 'Clean atomizing nozzle eliminates fuel overconsumption.',
  },
  {
    fromNode: 'FPMA_1',
    toNode: 'FEEDWATER_PRESSURE',
    edgeType: 'feedback',
    description: 'Mechanical seal replacement maintains discharge feed pressure.',
  },

  // --- Inner Dependence: Criteria <-> Criteria (Thermodynamic & Process Coupling) ---
  {
    fromNode: 'FLUE_GAS_TEMP',
    toNode: 'FUEL_CONSUMPTION_RATE',
    edgeType: 'inner_dependence',
    description: 'Higher stack temperature directly wastes combustion heat, increasing fuel burn.',
  },
  {
    fromNode: 'EXHAUST_O2_LEVEL',
    toNode: 'FUEL_CONSUMPTION_RATE',
    edgeType: 'inner_dependence',
    description: 'Excess combustion air cools flame, forcing higher fuel consumption.',
  },
  {
    fromNode: 'EXHAUST_CO_LEVEL',
    toNode: 'FUEL_CONSUMPTION_RATE',
    edgeType: 'inner_dependence',
    description: 'Incomplete combustion (high CO) indicates unreleased chemical energy.',
  },
  {
    fromNode: 'STEAM_PRESSURE_LOW',
    toNode: 'STEAM_PRODUCTION_RATE',
    edgeType: 'inner_dependence',
    description: 'Drop in steam pressure correlates with steam delivery deficits under load.',
  },
  {
    fromNode: 'FEEDWATER_PRESSURE',
    toNode: 'BOILER_WATER_LEVEL',
    edgeType: 'inner_dependence',
    description: 'Feedwater delivery pressure dictates boiler drum level recovery speed.',
  },
];

// =============================================================================
// 6. PENDING EXPERT JUDGMENT CONFIGURATION (Zero Invention Disclosure)
// =============================================================================

export interface PendingModelConfiguration {
  modelCode: string;
  modelName: string;
  sourceDocument: string;
  author: string;
  institution: string;
  targetAsset: string;
  version: number;
  status: 'pending_expert_judgment';
  academicFidelityDisclosure: string;
  uncalibratedMatrices: {
    matrixKey: string;
    clusterOrContext: string;
    description: string;
    dimension: number;
    elements: string[];
    status: 'pending_expert_judgment';
  }[];
  benchmarks: Record<string, BenchmarkThresholdRule>;
}

export const DISSERTATION_PENDING_MODEL_CONFIG: PendingModelConfiguration = {
  modelCode: 'BOILER_ANP_MORATUWA_1100KG',
  modelName: '1,100 kg/h Fire-Tube Boiler ANP Decision Model (Vishal Perera 2025)',
  sourceDocument: 'Development of a Software-Based Boiler Maintenance Decision-Making Tool (June 2025)',
  author: 'K.D. Vishal Prabod Perera (Index 202475D)',
  institution: 'Department of Building Economics, Faculty of Architecture, University of Moratuwa, Sri Lanka',
  targetAsset: 'The Kingsbury Hotel, Colombo (1,100 kg/h Oil-Fired Fire-Tube Steam Boiler)',
  version: 1,
  status: 'pending_expert_judgment',
  academicFidelityDisclosure:
    'The dissertation text fully details the qualitative network structure (Figure 4.1), 4 clusters, 22 criteria, 35 maintenance activities, and empirical benchmarks (Tables 4.6-4.10). However, the raw numerical 1-9 Saaty pairwise judgment matrices and limiting supermatrices were omitted from the publication text. In strict compliance with zero-invention governance, this model configuration is maintained in "pending_expert_judgment" status until pairwise judgments are populated by facility engineers or authenticated calibration sessions.',
  uncalibratedMatrices: [
    {
      matrixKey: 'GOAL_DIMENSIONS_COMPARISON',
      clusterOrContext: 'GOAL',
      description: 'Pairwise comparisons between the 5 strategic goal dimensions (Performance, Safety, Cost, Energy Efficiency, Continuity).',
      dimension: 5,
      elements: ['PERFORMANCE', 'SAFETY', 'COST', 'ENERGY_EFFICIENCY', 'OPERATIONAL_CONTINUITY'],
      status: 'pending_expert_judgment',
    },
    {
      matrixKey: 'CRITERIA_UNDER_PERFORMANCE',
      clusterOrContext: 'CRITERIA w.r.t GOAL:PERFORMANCE',
      description: 'Relative importance of operational criteria with respect to Thermal Performance.',
      dimension: DISSERTATION_CRITERIA.length,
      elements: DISSERTATION_CRITERIA.map((c) => c.code),
      status: 'pending_expert_judgment',
    },
    {
      matrixKey: 'CRITERIA_INNER_DEPENDENCE_THERMAL',
      clusterOrContext: 'CRITERIA Inner Dependence',
      description: 'Mutual influence between Flue Gas Temp, Steam Pressure, Excess O2, and Fuel Consumption.',
      dimension: 4,
      elements: ['FLUE_GAS_TEMP', 'STEAM_PRESSURE_LOW', 'EXHAUST_O2_LEVEL', 'FUEL_CONSUMPTION_RATE'],
      status: 'pending_expert_judgment',
    },
    {
      matrixKey: 'ALTERNATIVES_UNDER_CRITERIA_FLUE_GAS',
      clusterOrContext: 'ALTERNATIVES w.r.t FLUE_GAS_TEMP',
      description: 'Relative efficacy of EMA 1, HEMA 3, and BMA 1 in resolving flue gas temperature excursions.',
      dimension: 3,
      elements: ['EMA_1', 'HEMA_3', 'BMA_1'],
      status: 'pending_expert_judgment',
    },
  ],
  benchmarks: DISSERTATION_CRITERIA.reduce((acc, crit) => {
    acc[crit.code] = crit.benchmark;
    return acc;
  }, {} as Record<string, BenchmarkThresholdRule>),
};
