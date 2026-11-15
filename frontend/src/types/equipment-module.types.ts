/**
 * LuminaFM Extensible Equipment Modules - Frontend Type Definitions
 */

export type PhysicalProperty =
  | 'PRESSURE'
  | 'TEMPERATURE'
  | 'FLOW_RATE'
  | 'LEVEL'
  | 'ELECTRICAL_POWER'
  | 'CURRENT'
  | 'VOLTAGE'
  | 'FREQUENCY'
  | 'EFFICIENCY'
  | 'VIBRATION'
  | 'CHEMICAL_CONCENTRATION'
  | 'TIME'
  | 'PERCENTAGE'
  | 'DIMENSION';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type DecisionFrameworkType = 'ANP' | 'RCM' | 'FMEA' | 'CBM_CONDITION_BASED' | 'PENDING_VALIDATION';
export type ModelValidationStatus = 'academic_validated' | 'commercial_validated' | 'pending_validation' | 'independent_framework';

export interface EquipmentModuleSummary {
  moduleCode: string;
  categoryCode: string;
  name: string;
  version: string;
  description: string;
  governingStandards: string[];
  icon: string;
  subsystemsCount: number;
  measurementPointsCount: number;
  inspectionCheckpointsCount: number;
  maintenanceTasksCount: number;
  decisionModelCode: string;
  decisionFrameworkType: DecisionFrameworkType;
  decisionValidationStatus: ModelValidationStatus;
}

export interface EquipmentMeasurementPointDefinition {
  parameterCode: string;
  parameterName: string;
  physicalProperty: PhysicalProperty;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  thematicMaintenanceAction: string;
  description: string;
}

export interface EquipmentAnomalyResult {
  parameterCode: string;
  parameterName: string;
  observedValue: number;
  unit: string;
  nominalRange: { min: number; max: number };
  thresholdBreached: 'WARNING_LOW' | 'WARNING_HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH';
  thresholdValue: number;
  deviationDescription: string;
  thematicMaintenanceAction: string;
  severity: AlertSeverity;
}

export interface EquipmentDecisionSupportAssociation {
  frameworkType: DecisionFrameworkType;
  modelCode: string;
  modelName: string;
  version: string;
  validationStatus: ModelValidationStatus;
  academicValidationReference?: string;
  crossModuleReusePermitted: boolean;
  validationDisclaimer: string;
  criteria: Array<{
    code: string;
    name: string;
    cluster: string;
    weight?: number;
    description: string;
  }>;
  alternatives: Array<{
    code: string;
    name: string;
    actionType: 'PREVENTIVE' | 'CORRECTIVE' | 'OVERHAUL' | 'CONDITION_MONITORING';
    description: string;
  }>;
}

export interface EquipmentDashboardConfig {
  dashboardTitle: string;
  kpiCards: Array<{
    kpiCode: string;
    label: string;
    unit: string;
    calculationFormula: string;
    targetBenchmark: string;
  }>;
  widgets: Array<{
    widgetId: string;
    widgetType: string;
    title: string;
    parameterCodes: string[];
    targetSubsystem?: string;
  }>;
}

export interface EquipmentModuleContract {
  moduleCode: string;
  categoryCode: string;
  name: string;
  version: string;
  description: string;
  governingStandards: string[];
  icon: string;
  physicalSubsystems: Array<{
    code: string;
    name: string;
    components: Array<{ code: string; name: string }>;
  }>;
  measurementPoints: EquipmentMeasurementPointDefinition[];
  inspectionTemplates: Array<{
    templateCode: string;
    title: string;
    checkpoints: Array<{
      checkpointCode: string;
      title: string;
      frequency: string;
      guidanceText: string;
    }>;
  }>;
  maintenanceTaskTemplates: Array<{
    taskTemplateCode: string;
    title: string;
    frequencyDays: number;
    estimatedLaborHours: number;
    tradeSkill: string;
  }>;
  decisionSupport: EquipmentDecisionSupportAssociation;
  dashboardConfig: EquipmentDashboardConfig;
}
