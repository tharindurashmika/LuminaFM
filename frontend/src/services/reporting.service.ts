import { apiRequest } from './api.client';
import {
  DecisionReportingSummary,
  OperationalAbnormalityItem,
  NotificationChannelConfig,
  AlertAcknowledgementPayload,
  ParameterTrendHistory,
  PreventiveMaintenanceItem,
  WorkOrderPerformanceMetrics,
} from '../types/reporting.types';
import {
  ValidationStatus,
  AcademicValidationLevel,
  AnpMaintenanceRecommendation,
} from '../types/cmms.types';

// =============================================================================
// MOCK BASELINE & SIMULATED REPORTING DATA (GROUNDED IN DISSERTATION FINDINGS)
// =============================================================================

const INITIAL_CHANNELS: NotificationChannelConfig[] = [
  {
    id: 'chan-001',
    channelType: 'in_app',
    name: 'Primary Control Room Audio/Visual Tray',
    enabled: true,
    destination: 'Operator Dashboard Notification Tray',
    minSeverity: 'ALL',
    minAnpPriorityScore: 0.65,
    includeAuditHash: true,
    cooldownMinutes: 5,
    lastDispatchedAt: '2026-11-15T09:12:00Z',
    dispatchCount: 142,
  },
  {
    id: 'chan-002',
    channelType: 'email',
    name: 'Reliability Engineering Escalation Group',
    enabled: true,
    destination: 'reliability-lead@lumina.io, chief-engineer@factory.com',
    minSeverity: 'WARNING',
    minAnpPriorityScore: 0.80,
    includeAuditHash: true,
    cooldownMinutes: 15,
    lastDispatchedAt: '2026-11-15T08:45:00Z',
    dispatchCount: 38,
  },
  {
    id: 'chan-003',
    channelType: 'sms',
    name: 'Emergency Standby Engineer On-Call SMS',
    enabled: true,
    destination: '+1-555-0199 (Chief Plant Engineer Mobile)',
    minSeverity: 'CRITICAL',
    minAnpPriorityScore: 0.90,
    includeAuditHash: false,
    cooldownMinutes: 30,
    lastDispatchedAt: '2026-11-14T23:18:00Z',
    dispatchCount: 6,
  },
  {
    id: 'chan-004',
    channelType: 'webhook',
    name: 'Central SCADA / Enterprise ERP Bridge',
    enabled: false,
    destination: 'https://scada-gateway.internal.factory/api/v2/alarms/webhook',
    minSeverity: 'CRITICAL',
    minAnpPriorityScore: 0.85,
    includeAuditHash: true,
    cooldownMinutes: 10,
    lastDispatchedAt: null,
    dispatchCount: 0,
  },
];

const INITIAL_ABNORMALITIES: OperationalAbnormalityItem[] = [
  {
    id: 'abn-101',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Cleaver-Brooks Firetube Steam Boiler #1 (1,100 kg/h)',
    parameterCode: 'FLUE_GAS_TEMP',
    parameterName: 'Flue Gas Stack Temperature',
    measuredValue: 248.4,
    benchmarkThreshold: 190.0,
    benchmarkOperator: '>',
    unit: '°C',
    severity: 'CRITICAL',
    deviationDescription: 'Exceeds benchmark by 58.4°C. Severe soot accumulation on convection tubes or damaged refractory baffle.',
    thematicAction: 'Execute fireside boiler tube sootblowing and inspect economizer heat transfer surface.',
    detectedAt: '2026-11-15T08:30:00Z',
    acknowledged: false,
    linkedWorkOrderNumber: 'WO-2026-00014',
    source: 'manual_logbook',
  },
  {
    id: 'abn-102',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Cleaver-Brooks Firetube Steam Boiler #1 (1,100 kg/h)',
    parameterCode: 'STEAM_PRESSURE',
    parameterName: 'Operating Steam Header Pressure',
    measuredValue: 13.4,
    benchmarkThreshold: 12.0,
    benchmarkOperator: '>',
    unit: 'bar',
    severity: 'CRITICAL',
    deviationDescription: 'Exceeds standard 12.0 bar setpoint, approaching 14.0 bar ASME relief valve pop pressure.',
    thematicAction: 'Verify modulating burner firing rate controller and test high-limit safety pressure cut-off switch.',
    detectedAt: '2026-11-15T08:15:00Z',
    acknowledged: true,
    acknowledgedBy: 'Eng. Marcus Thorne (Lead Reliability Engineer)',
    acknowledgedAt: '2026-11-15T08:40:00Z',
    acknowledgementNotes: 'Burner modulation confirmed locked in low fire. Pressuretrol verified operational. Monitoring header relief.',
    linkedWorkOrderNumber: 'WO-2026-00017',
    source: 'manual_logbook',
  },
  {
    id: 'abn-103',
    assetId: 'a1000000-0000-0000-0000-000000000002',
    assetCode: 'BLR-002',
    assetName: 'Viessmann Vitomax 200-HS Standby Boiler (1,400 kg/h)',
    parameterCode: 'TDS_LEVEL',
    parameterName: 'Boiler Water Total Dissolved Solids',
    measuredValue: 3200,
    benchmarkThreshold: 2500,
    benchmarkOperator: '>',
    unit: 'ppm',
    severity: 'WARNING',
    deviationDescription: 'Conductivity probe confirms dissolved solids exceeding 2,500 ppm threshold. High foaming & carryover hazard.',
    thematicAction: 'Initiate continuous surface blowdown cycle and verify feedwater demineralizer resin bed condition.',
    detectedAt: '2026-11-15T07:45:00Z',
    acknowledged: false,
    source: 'daily_inspection',
  },
  {
    id: 'abn-104',
    assetId: 'a1000000-0000-0000-0000-000000000003',
    assetCode: 'P-001',
    assetName: 'Grundfos Multistage Boiler Feedwater Pump A',
    parameterCode: 'PUMP_OPERATING_HOURS',
    parameterName: 'Feedwater Pump Operating Hours',
    measuredValue: 12150,
    benchmarkThreshold: 12000,
    benchmarkOperator: '>=',
    unit: 'hrs',
    severity: 'WARNING',
    deviationDescription: 'Total accumulated operating hours has reached 12,150 hrs (overhaul benchmark: 12,000 hrs).',
    thematicAction: 'Replace silicon-carbide mechanical cartridge seal, motor bearings, and verify dynamic impeller balance.',
    detectedAt: '2026-11-14T19:00:00Z',
    acknowledged: true,
    acknowledgedBy: 'Sarah Lin (Plant Operator)',
    acknowledgedAt: '2026-11-14T20:10:00Z',
    acknowledgementNotes: 'Pump swapped to Standby Pump B. Work order drafted for scheduled weekend maintenance.',
    linkedWorkOrderNumber: 'WO-2026-00016',
    source: 'scada_telemetry',
  },
];

const VALIDATED_BASELINE_RUN: DecisionReportingSummary = {
  decisionRunId: 'drun-anp-baseline-001',
  assetId: 'a1000000-0000-0000-0000-000000000001',
  assetCode: 'BLR-001',
  assetName: 'Cleaver-Brooks Firetube Steam Boiler #1 (1,100 kg/h)',
  decisionModelId: 'dm-kingsbury-dissertation-baseline',
  decisionModelCode: 'ANP-KINGSBURY-FIRETUBE-v1.0.0',
  decisionModelVersion: 1,
  evaluatedAt: '2026-11-15T08:35:12Z',
  deterministicHash: 'a8f7c9e4b2d1109a882e3f4c1b99a0e672d1182cfb802a4e9b72412854da091c',
  validationStatus: 'academic_validated',
  academicValidationLevel: 'peer_reviewed_dissertation',
  isValidated: true,
  compositeRiskScore: 0.892,
  recommendedPriority: 'urgent',
  topAlternative: {
    code: 'ALT-SOOTBLOW-OVERHAUL',
    name: 'Sootblower Overhaul & Fireside Convection Tube Cleaning',
    anpPriorityScore: 0.4320,
    relativeWeightPercentage: 43.20,
  },
  recommendations: [
    {
      recommendationId: 'rec-001',
      rank: 1,
      alternativeCode: 'ALT-SOOTBLOW-OVERHAUL',
      alternativeName: 'Sootblower Overhaul & Convection Tube Mechanical Desooting',
      priorityValue: 0.4320,
      relativeWeightPercentage: 43.20,
      safetyTier: 'OPERATIONAL_MAINTENANCE',
      recommendedActionTitle: 'Execute Immediate Fireside Tube Cleaning & Economizer Sweep',
      technicalWorkScope: 'Isolate burner, open front and rear smokebox doors, rod out firetubes, clean soot deposits, and calibrate sootblower lance travel.',
      suggestedPriority: 'urgent',
      estimatedLaborHours: 12,
      sparesRequired: ['Tube brush kit', 'Spiral wire turbulators', 'High-temp door gasket rope'],
      criteriaAttribution: [
        {
          criterionCode: 'FLUE_GAS_TEMP',
          criterionName: 'Stack Temperature Excursion',
          clusterCode: 'THERMAL_EFFICIENCY',
          observedValue: 248.4,
          benchmarkThreshold: '> 190.0 °C',
          deviationDescription: 'Gas temperature 58.4°C above clean baseline',
          contributionPercentage: 48.5,
          rootCauseHypothesis: 'Thermal insulating soot accumulation on gas passes',
        },
        {
          criterionCode: 'FUEL_CONSUMPTION',
          criterionName: 'Specific Fuel Consumption Rate',
          clusterCode: 'ENERGY_EFFICIENCY',
          observedValue: 84.2,
          benchmarkThreshold: '> 78.0 kg/h',
          deviationDescription: 'Combustion efficiency dropped by ~6.8%',
          contributionPercentage: 26.2,
          rootCauseHypothesis: 'Fireside fouling inhibiting heat transfer to water shell',
        },
        {
          criterionCode: 'STACK_SMOKE_DENSITY',
          criterionName: 'Ringelmann Smoke Index',
          clusterCode: 'ENVIRONMENTAL_COMPLIANCE',
          observedValue: 2.5,
          benchmarkThreshold: '>= 2.0',
          deviationDescription: 'Dark smoke discharge indicating poor secondary combustion',
          contributionPercentage: 15.3,
          rootCauseHypothesis: 'Restriction in gas flow draft caused by tube fouling',
        },
      ],
      linkedReadings: [
        {
          parameterCode: 'FLUE_GAS_TEMP',
          parameterName: 'Flue Gas Stack Temperature',
          observedValue: 248.4,
          unit: '°C',
          thresholdOperator: '>',
          thresholdValue: 190.0,
          deviationDescription: 'Stack temperature 58.4°C above clean baseline',
          timestamp: '2026-11-15T08:30:00Z',
        },
      ],
      maintenanceHistoryContext: {
        lastCompletedWorkOrder: {
          id: 'wo-hist-082',
          workOrderNumber: 'WO-2026-00008',
          title: 'Quarterly Convection Baffle Inspection',
          completedAt: '2026-08-10T14:00:00Z',
          maintenanceType: 'Preventive',
        },
        daysSinceLastIntervention: 97,
        previousInterventionsCount: 3,
        contextualNote: 'Fouling rate has increased 22% compared to historical baseline.',
      },
      reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
    },
    {
      recommendationId: 'rec-002',
      rank: 2,
      alternativeCode: 'ALT-BURNER-CALIBRATION',
      alternativeName: 'Burner Air-to-Fuel Ratio Damper Linkage Calibration',
      priorityValue: 0.2810,
      relativeWeightPercentage: 28.10,
      safetyTier: 'OPERATIONAL_MAINTENANCE',
      recommendedActionTitle: 'Calibrate Rotary Cup Fuel Damper & Excess Air Curve',
      technicalWorkScope: 'Perform flue gas combustion analysis (O2, CO, CO2, NOx), adjust modulating cam linkages, and verify flame scanner signal strength.',
      suggestedPriority: 'high',
      estimatedLaborHours: 6,
      sparesRequired: ['Oxygen sensor replacement', 'Cam follower ball bearings'],
      criteriaAttribution: [
        {
          criterionCode: 'O2_EXCESS_AIR',
          criterionName: 'Flue Gas Residual Oxygen',
          clusterCode: 'COMBUSTION_QUALITY',
          observedValue: 6.8,
          benchmarkThreshold: '> 4.5 %',
          deviationDescription: 'Excess air excessive, cooling flame front',
          contributionPercentage: 54.0,
          rootCauseHypothesis: 'Loose linkage on mechanical fuel-air ratio cam',
        },
        {
          criterionCode: 'FLUE_GAS_TEMP',
          criterionName: 'Stack Temperature Excursion',
          clusterCode: 'THERMAL_EFFICIENCY',
          observedValue: 248.4,
          benchmarkThreshold: '> 190.0 °C',
          deviationDescription: 'High gas volume accelerates exit velocity',
          contributionPercentage: 32.0,
          rootCauseHypothesis: 'Excess air driving heat out of the chimney',
        },
      ],
      linkedReadings: [],
      maintenanceHistoryContext: {},
      reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
    },
    {
      recommendationId: 'rec-003',
      rank: 3,
      alternativeCode: 'ALT-CHEMICAL-DESCALING',
      alternativeName: 'Waterside Chemical Blowdown & Acid Descaling Flush',
      priorityValue: 0.1820,
      relativeWeightPercentage: 18.20,
      safetyTier: 'PREVENTIVE_OPTIMIZATION',
      recommendedActionTitle: 'Waterside Descaling & Water Treatment Softener Regeneration',
      technicalWorkScope: 'Introduce sulfamic acid descaling solution with corrosion inhibitors, circulate for 6 hours, flush, and perform EDTA hardness titration.',
      suggestedPriority: 'medium',
      estimatedLaborHours: 16,
      criteriaAttribution: [],
      linkedReadings: [],
      maintenanceHistoryContext: {},
      reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
    },
    {
      recommendationId: 'rec-004',
      rank: 4,
      alternativeCode: 'ALT-FEEDWATER-PUMP-OVERHAUL',
      alternativeName: 'Feedwater Pump Mechanical Seal & Bearing Replacement',
      priorityValue: 0.1050,
      relativeWeightPercentage: 10.50,
      safetyTier: 'PREVENTIVE_OPTIMIZATION',
      recommendedActionTitle: 'Scheduled Pump Bearings & Impeller Clearance Check',
      technicalWorkScope: 'Disassemble pump casing, inspect stage wear rings, replace silicon carbide mechanical seals, and grease DE/NDE bearings.',
      suggestedPriority: 'low',
      estimatedLaborHours: 8,
      criteriaAttribution: [],
      linkedReadings: [],
      maintenanceHistoryContext: {},
      reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
    },
  ],
  criteriaContributions: [
    {
      criterionCode: 'FLUE_GAS_TEMP',
      criterionName: 'Flue Gas Stack Temperature',
      clusterCode: 'THERMAL_EFFICIENCY',
      contributionPercentage: 42.5,
      measuredValue: 248.4,
      benchmarkValue: '> 190.0',
      unit: '°C',
    },
    {
      criterionCode: 'STEAM_PRESSURE',
      criterionName: 'Header Steam Pressure',
      clusterCode: 'PRESSURE_SAFETY',
      contributionPercentage: 27.5,
      measuredValue: 13.4,
      benchmarkValue: '> 12.0',
      unit: 'bar',
    },
    {
      criterionCode: 'TDS_LEVEL',
      criterionName: 'Boiler Water TDS Concentration',
      clusterCode: 'WATERSIDE_INTEGRITY',
      contributionPercentage: 18.0,
      measuredValue: 3200,
      benchmarkValue: '> 2500',
      unit: 'ppm',
    },
    {
      criterionCode: 'O2_EXCESS_AIR',
      criterionName: 'Excess Combustion Air',
      clusterCode: 'COMBUSTION_QUALITY',
      contributionPercentage: 12.0,
      measuredValue: 6.8,
      benchmarkValue: '> 4.5',
      unit: '%',
    },
  ],
  safetyAlerts: [
    {
      alertId: 'sa-001',
      assetId: 'a1000000-0000-0000-0000-000000000001',
      severity: 'SAFETY_WARNING',
      ruleCode: 'RULE-STACK-OVERTEMP',
      ruleTitle: 'High Stack Gas Overheat Limit Check',
      parameterCode: 'FLUE_GAS_TEMP',
      observedValue: 248.4,
      safetyLimit: '260.0 °C Emergency Burner Cutoff',
      emergencyActionRequired: 'Inspect refractory lining, verify flame impingement, ensure flue stack damper is free.',
      independentOfAnp: true,
      requiresCertifiedInspectorSignoff: true,
      escalatedAt: '2026-11-15T08:31:00Z',
      notifiedUserIds: ['u-001', 'u-002'],
    },
  ],
};

const UNVALIDATED_CLIENT_RUN: DecisionReportingSummary = {
  decisionRunId: 'drun-anp-unvalidated-002',
  assetId: 'a1000000-0000-0000-0000-000000000002',
  assetCode: 'BLR-002',
  assetName: 'Viessmann Vitomax 200-HS Standby Boiler (1,400 kg/h)',
  decisionModelId: 'dm-client-custom-draft-2',
  decisionModelCode: 'ANP-CLIENT-CUSTOM-PROPOSAL-v2.1.0',
  decisionModelVersion: 2,
  evaluatedAt: '2026-11-15T09:00:00Z',
  deterministicHash: '98a76d1e4c3b2a1f0987e6d5c4b3a210987654321fedcba0987654321fedcba0',
  validationStatus: 'client_proposed',
  academicValidationLevel: 'unvalidated_client_proposal',
  isValidated: false,
  validationDisclaimer: 'UNVALIDATED DRAFT MODEL: This model configuration was proposed by commercial client administrators without peer-reviewed dissertation validation or independent expert panel sign-off. Outputs are advisory simulations only and cannot be recorded as approved maintenance decisions.',
  compositeRiskScore: 0.640,
  recommendedPriority: 'high',
  topAlternative: {
    code: 'ALT-EXPEDITED-BLOWDOWN',
    name: 'Expedited Bottom Blowdown & Chemical De-foaming Cycle',
    anpPriorityScore: 0.5210,
    relativeWeightPercentage: 52.10,
  },
  recommendations: [
    {
      recommendationId: 'rec-client-001',
      rank: 1,
      alternativeCode: 'ALT-EXPEDITED-BLOWDOWN',
      alternativeName: 'Expedited Bottom Blowdown & Chemical De-foaming Cycle',
      priorityValue: 0.5210,
      relativeWeightPercentage: 52.10,
      safetyTier: 'OPERATIONAL_MAINTENANCE',
      recommendedActionTitle: 'Open Bottom Blowdown Valves for 15-second cycles every 2 hours',
      technicalWorkScope: 'Manual bottom blowdown to eject precipitated sludge from mud drum, adjust surface skimmer rate.',
      suggestedPriority: 'high',
      estimatedLaborHours: 4,
      criteriaAttribution: [
        {
          criterionCode: 'TDS_LEVEL',
          criterionName: 'Boiler Water TDS Concentration',
          clusterCode: 'WATERSIDE_INTEGRITY',
          observedValue: 3200,
          benchmarkThreshold: '> 2500 ppm',
          deviationDescription: 'Dissolved minerals 700 ppm over target',
          contributionPercentage: 78.0,
          rootCauseHypothesis: 'Insufficient blowdown rate relative to makeup water cycle',
        },
      ],
      linkedReadings: [],
      maintenanceHistoryContext: {},
      reviewStatus: 'PROPOSED_PENDING_ENGINEER_REVIEW',
    },
  ],
  criteriaContributions: [
    {
      criterionCode: 'TDS_LEVEL',
      criterionName: 'Boiler Water TDS Concentration',
      clusterCode: 'WATERSIDE_INTEGRITY',
      contributionPercentage: 78.0,
      measuredValue: 3200,
      benchmarkValue: '> 2500',
      unit: 'ppm',
    },
  ],
  safetyAlerts: [],
};

const INITIAL_PM_ITEMS: PreventiveMaintenanceItem[] = [
  {
    id: 'pm-001',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Cleaver-Brooks Firetube Steam Boiler #1',
    title: 'Bi-Weekly ASME Low Water Cutoff (LWCO) Slow Drain Float Test',
    frequency: 'bi-weekly',
    dueDate: '2026-11-13', // Overdue by 2 days
    isOverdue: true,
    daysRemainingOrOverdue: -2,
    criticality: 'critical',
    assignedEngineer: 'Marcus Thorne',
    estimatedLaborHours: 1.5,
  },
  {
    id: 'pm-002',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Cleaver-Brooks Firetube Steam Boiler #1',
    title: 'Monthly Safety Relief Valve (SRV) Manual Lift Lever Verification',
    frequency: 'monthly',
    dueDate: '2026-11-14', // Overdue by 1 day
    isOverdue: true,
    daysRemainingOrOverdue: -1,
    criticality: 'critical',
    assignedEngineer: 'Marcus Thorne',
    estimatedLaborHours: 2.0,
  },
  {
    id: 'pm-003',
    assetId: 'a1000000-0000-0000-0000-000000000002',
    assetCode: 'BLR-002',
    assetName: 'Viessmann Vitomax Standby Boiler #2',
    title: 'Monthly Fuel Oil Strainer Basket Cleaning & Filter Differential Inspection',
    frequency: 'monthly',
    dueDate: '2026-11-18', // Due in 3 days
    isOverdue: false,
    daysRemainingOrOverdue: 3,
    criticality: 'medium',
    assignedEngineer: 'Sarah Lin',
    estimatedLaborHours: 3.0,
  },
  {
    id: 'pm-004',
    assetId: 'a1000000-0000-0000-0000-000000000003',
    assetCode: 'P-001',
    assetName: 'Grundfos Feedwater Pump A',
    title: 'Quarterly Laser Shaft Alignment & Flexible Coupling Elastomer Check',
    frequency: 'quarterly',
    dueDate: '2026-11-25', // Due in 10 days
    isOverdue: false,
    daysRemainingOrOverdue: 10,
    criticality: 'high',
    assignedEngineer: 'Marcus Thorne',
    estimatedLaborHours: 4.5,
  },
];

const INITIAL_METRICS: WorkOrderPerformanceMetrics = {
  totalWorkOrders: 84,
  completedCount: 68,
  openCount: 16,
  overdueCount: 3,
  completionRatePercentage: 80.95,
  onTimeCompletionPercentage: 88.24,
  meanTimeToRepairHours: 3.4,
  proactiveVsReactiveRatio: 72.5,
  recentCompletions: [
    {
      id: 'wo-comp-01',
      workOrderNumber: 'WO-2026-00010',
      assetCode: 'BLR-001',
      title: 'Rotary Burner Fuel Nozzle Replacement & Atomizer Inspection',
      completedAt: '2026-11-14T16:00:00Z',
      completedBy: 'Marcus Thorne',
      actualHours: 3.5,
      type: 'preventive',
    },
    {
      id: 'wo-comp-02',
      workOrderNumber: 'WO-2026-00011',
      assetCode: 'BLR-002',
      title: 'Water Level Sight Glass Gauge Cock Packing Renewal',
      completedAt: '2026-11-13T11:30:00Z',
      completedBy: 'Sarah Lin',
      actualHours: 2.0,
      type: 'corrective',
    },
    {
      id: 'wo-comp-03',
      workOrderNumber: 'WO-2026-00012',
      assetCode: 'P-001',
      title: 'Feedwater Check Valve Seat Lapping & Pressure Drop Test',
      completedAt: '2026-11-12T14:45:00Z',
      completedBy: 'Marcus Thorne',
      actualHours: 4.0,
      type: 'anp_prescribed',
    },
  ],
};

const INITIAL_TELEMETRY_TRENDS: ParameterTrendHistory[] = [
  {
    parameterCode: 'STEAM_PRESSURE',
    parameterName: 'Operating Steam Pressure',
    unit: 'bar',
    category: 'steam_pressure',
    currentValue: 13.4,
    currentStatus: 'critical',
    benchmarkThreshold: 12.0,
    benchmarkOperator: '>',
    points: [
      { timestamp: '11/10 08:00', measuredValue: 9.8, benchmarkLimit: 12.0, nominalMin: 8.0, nominalMax: 10.5, isBreached: false },
      { timestamp: '11/11 08:00', measuredValue: 10.1, benchmarkLimit: 12.0, nominalMin: 8.0, nominalMax: 10.5, isBreached: false },
      { timestamp: '11/12 08:00', measuredValue: 10.3, benchmarkLimit: 12.0, nominalMin: 8.0, nominalMax: 10.5, isBreached: false },
      { timestamp: '11/13 08:00', measuredValue: 11.2, benchmarkLimit: 12.0, nominalMin: 8.0, nominalMax: 10.5, isBreached: false },
      { timestamp: '11/14 08:00', measuredValue: 12.4, benchmarkLimit: 12.0, nominalMin: 8.0, nominalMax: 10.5, isBreached: true },
      { timestamp: '11/15 08:00', measuredValue: 13.4, benchmarkLimit: 12.0, nominalMin: 8.0, nominalMax: 10.5, isBreached: true },
    ],
  },
  {
    parameterCode: 'FLUE_GAS_TEMP',
    parameterName: 'Flue Gas Stack Temperature',
    unit: '°C',
    category: 'combustion',
    currentValue: 248.4,
    currentStatus: 'critical',
    benchmarkThreshold: 190.0,
    benchmarkOperator: '>',
    points: [
      { timestamp: '11/10 08:00', measuredValue: 172.0, benchmarkLimit: 190.0, nominalMin: 140.0, nominalMax: 185.0, isBreached: false },
      { timestamp: '11/11 08:00', measuredValue: 178.5, benchmarkLimit: 190.0, nominalMin: 140.0, nominalMax: 185.0, isBreached: false },
      { timestamp: '11/12 08:00', measuredValue: 184.0, benchmarkLimit: 190.0, nominalMin: 140.0, nominalMax: 185.0, isBreached: false },
      { timestamp: '11/13 08:00', measuredValue: 195.2, benchmarkLimit: 190.0, nominalMin: 140.0, nominalMax: 185.0, isBreached: true },
      { timestamp: '11/14 08:00', measuredValue: 221.0, benchmarkLimit: 190.0, nominalMin: 140.0, nominalMax: 185.0, isBreached: true },
      { timestamp: '11/15 08:00', measuredValue: 248.4, benchmarkLimit: 190.0, nominalMin: 140.0, nominalMax: 185.0, isBreached: true },
    ],
  },
  {
    parameterCode: 'TDS_LEVEL',
    parameterName: 'Boiler Water TDS Concentration',
    unit: 'ppm',
    category: 'water_quality',
    currentValue: 3200,
    currentStatus: 'warning',
    benchmarkThreshold: 2500,
    benchmarkOperator: '>',
    points: [
      { timestamp: '11/10 08:00', measuredValue: 2100, benchmarkLimit: 2500, nominalMin: 1500, nominalMax: 2400, isBreached: false },
      { timestamp: '11/11 08:00', measuredValue: 2250, benchmarkLimit: 2500, nominalMin: 1500, nominalMax: 2400, isBreached: false },
      { timestamp: '11/12 08:00', measuredValue: 2380, benchmarkLimit: 2500, nominalMin: 1500, nominalMax: 2400, isBreached: false },
      { timestamp: '11/13 08:00', measuredValue: 2490, benchmarkLimit: 2500, nominalMin: 1500, nominalMax: 2400, isBreached: false },
      { timestamp: '11/14 08:00', measuredValue: 2820, benchmarkLimit: 2500, nominalMin: 1500, nominalMax: 2400, isBreached: true },
      { timestamp: '11/15 08:00', measuredValue: 3200, benchmarkLimit: 2500, nominalMin: 1500, nominalMax: 2400, isBreached: true },
    ],
  },
  {
    parameterCode: 'PUMP_OPERATING_HOURS',
    parameterName: 'Feedwater Pump Operating Hours',
    unit: 'hrs',
    category: 'rotary_equipment',
    currentValue: 12150,
    currentStatus: 'warning',
    benchmarkThreshold: 12000,
    benchmarkOperator: '>=',
    points: [
      { timestamp: '11/10 08:00', measuredValue: 11920, benchmarkLimit: 12000, nominalMin: 0, nominalMax: 12000, isBreached: false },
      { timestamp: '11/11 08:00', measuredValue: 11968, benchmarkLimit: 12000, nominalMin: 0, nominalMax: 12000, isBreached: false },
      { timestamp: '11/12 08:00', measuredValue: 12016, benchmarkLimit: 12000, nominalMin: 0, nominalMax: 12000, isBreached: true },
      { timestamp: '11/13 08:00', measuredValue: 12064, benchmarkLimit: 12000, nominalMin: 0, nominalMax: 12000, isBreached: true },
      { timestamp: '11/14 08:00', measuredValue: 12112, benchmarkLimit: 12000, nominalMin: 0, nominalMax: 12000, isBreached: true },
      { timestamp: '11/15 08:00', measuredValue: 12150, benchmarkLimit: 12000, nominalMin: 0, nominalMax: 12000, isBreached: true },
    ],
  },
];

// In-Memory state caches
let channelsStore = [...INITIAL_CHANNELS];
let abnormalitiesStore = [...INITIAL_ABNORMALITIES];
let decisionRunsStore = [VALIDATED_BASELINE_RUN, UNVALIDATED_CLIENT_RUN];
let pmItemsStore = [...INITIAL_PM_ITEMS];

export const reportingApiService = {
  /**
   * Strictly determines if a decision model is validated for operational use.
   * "Do not display unvalidated ANP outputs as approved maintenance decisions."
   */
  isModelValidated(
    status: ValidationStatus | string,
    level?: AcademicValidationLevel | string
  ): boolean {
    const validStatuses: (ValidationStatus | string)[] = [
      'academic_validated',
      'commercial_validated',
      'active',
    ];
    const invalidLevels: (AcademicValidationLevel | string)[] = [
      'unvalidated_client_proposal',
    ];

    if (!validStatuses.includes(status)) {
      return false;
    }
    if (level && invalidLevels.includes(level)) {
      return false;
    }
    return true;
  },

  /**
   * Fetches active decision runs, indicating their validation status.
   */
  async getDecisionRuns(): Promise<DecisionReportingSummary[]> {
    return [...decisionRunsStore];
  },

  /**
   * Fetches a specific decision run by ID.
   */
  async getDecisionRunById(runId: string): Promise<DecisionReportingSummary | undefined> {
    return decisionRunsStore.find((r) => r.decisionRunId === runId);
  },

  /**
   * Fetches operational parameter abnormalities and alarms.
   */
  async getOperationalAbnormalities(): Promise<OperationalAbnormalityItem[]> {
    return [...abnormalitiesStore];
  },

  /**
   * Acknowledges an operational abnormality with technician identity and notes.
   */
  async acknowledgeAbnormality(
    payload: AlertAcknowledgementPayload
  ): Promise<OperationalAbnormalityItem> {
    const item = abnormalitiesStore.find((a) => a.id === payload.abnormalityId);
    if (!item) {
      throw new Error(`Abnormality with ID ${payload.abnormalityId} not found.`);
    }

    item.acknowledged = true;
    item.acknowledgedBy = payload.acknowledgedBy;
    item.acknowledgedAt = new Date().toISOString();
    item.acknowledgementNotes = payload.acknowledgementNotes;

    return { ...item };
  },

  /**
   * Fetches upcoming and overdue preventive maintenance schedules.
   */
  async getPreventiveMaintenanceSchedule(): Promise<PreventiveMaintenanceItem[]> {
    return [...pmItemsStore];
  },

  /**
   * Fetches overall work order completion and reliability performance metrics.
   */
  async getWorkOrderPerformanceMetrics(): Promise<WorkOrderPerformanceMetrics> {
    return { ...INITIAL_METRICS };
  },

  /**
   * Fetches historical telemetry trends for multi-parameter comparison.
   */
  async getHistoricalTelemetryTrends(): Promise<ParameterTrendHistory[]> {
    return [...INITIAL_TELEMETRY_TRENDS];
  },

  /**
   * Fetches configured notification channels.
   */
  async getNotificationChannels(): Promise<NotificationChannelConfig[]> {
    return [...channelsStore];
  },

  /**
   * Updates an existing notification channel configuration.
   */
  async updateNotificationChannel(
    channelId: string,
    updates: Partial<NotificationChannelConfig>
  ): Promise<NotificationChannelConfig> {
    const idx = channelsStore.findIndex((c) => c.id === channelId);
    if (idx === -1) {
      throw new Error(`Notification channel ${channelId} not found.`);
    }

    channelsStore[idx] = {
      ...channelsStore[idx],
      ...updates,
    };
    return { ...channelsStore[idx] };
  },

  /**
   * Dispatches a test alert through the designated channel.
   */
  async dispatchTestNotification(channelId: string): Promise<{ success: boolean; message: string }> {
    const channel = channelsStore.find((c) => c.id === channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found.`);
    }

    channel.lastDispatchedAt = new Date().toISOString();
    channel.dispatchCount += 1;

    return {
      success: true,
      message: `Test alert dispatched successfully to ${channel.destination} via [${channel.channelType.toUpperCase()}].`,
    };
  },

  /**
   * Reviews an ANP maintenance recommendation.
   * Strictly enforces that unvalidated models CANNOT have approved decisions.
   */
  async reviewRecommendation(
    runId: string,
    recId: string,
    action: 'approve' | 'reject' | 'convert_to_work_order',
    engineerName: string,
    notes: string
  ): Promise<{ status: string; message: string; workOrderNumber?: string }> {
    const run = decisionRunsStore.find((r) => r.decisionRunId === runId);
    if (!run) {
      throw new Error(`Decision run ${runId} not found.`);
    }

    if (!run.isValidated && action === 'approve') {
      throw new Error(
        'SECURITY & SAFETY COMPLIANCE ERROR: Unvalidated ANP model outputs cannot be approved as operational maintenance decisions. Academic or expert panel validation is strictly required.'
      );
    }

    const rec = run.recommendations.find((r) => r.recommendationId === recId);
    if (!rec) {
      throw new Error(`Recommendation ${recId} not found.`);
    }

    if (action === 'approve') {
      rec.reviewStatus = 'APPROVED';
      rec.reviewedByUserId = engineerName;
      rec.reviewedAt = new Date().toISOString();
      rec.engineerNotes = notes;
      return {
        status: 'APPROVED',
        message: `Recommendation "${rec.alternativeName}" approved for execution by ${engineerName}.`,
      };
    } else if (action === 'reject') {
      rec.reviewStatus = 'REJECTED';
      rec.reviewedByUserId = engineerName;
      rec.reviewedAt = new Date().toISOString();
      rec.engineerNotes = notes;
      return {
        status: 'REJECTED',
        message: `Recommendation rejected with recorded justification.`,
      };
    } else {
      rec.reviewStatus = 'CONVERTED_TO_WORK_ORDER';
      const woNumber = `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      rec.generatedWorkOrderId = woNumber;
      return {
        status: 'CONVERTED_TO_WORK_ORDER',
        workOrderNumber: woNumber,
        message: `Work Order ${woNumber} generated from ANP recommendation.`,
      };
    }
  },
};
