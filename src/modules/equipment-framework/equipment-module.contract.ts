/**
 * LuminaFM Extensibility Framework - Standardized Equipment Module Contract
 *
 * Provides a polymorphic, decoupled plugin interface allowing future equipment
 * categories (Chillers, Cooling Towers, AHUs, Compressors, Transformers, etc.)
 * to be developed independently while preserving shared asset management,
 * security, work orders, audit logging, and reporting.
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
export type SamplingFrequency = 'CONTINUOUS_SCADA' | 'HOURLY' | 'PER_SHIFT' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type DecisionFrameworkType = 'ANP' | 'RCM' | 'FMEA' | 'CBM_CONDITION_BASED' | 'PENDING_VALIDATION';
export type ModelValidationStatus = 'academic_validated' | 'commercial_validated' | 'pending_validation' | 'independent_framework';

/**
 * 1. Technical Specifications Schema
 */
export interface EquipmentSpecFieldDefinition {
  fieldKey: string;
  label: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
  unit?: string;
  required: boolean;
  defaultValue?: unknown;
  allowedOptions?: string[];
  minValue?: number;
  maxValue?: number;
  description: string;
}

export interface EquipmentSpecsSchema {
  fields: EquipmentSpecFieldDefinition[];
  validate: (specs: Record<string, unknown>) => { isValid: boolean; errors: string[] };
}

/**
 * 2. Physical Subsystems & Hierarchy
 */
export interface EquipmentComponentGroup {
  code: string;
  name: string;
  description?: string;
}

export interface EquipmentSubsystemDefinition {
  code: string;
  name: string;
  description?: string;
  components: EquipmentComponentGroup[];
}

/**
 * 3. Operational Readings & Measurement Definitions
 */
export interface EquipmentMeasurementPointDefinition {
  parameterCode: string;
  parameterName: string;
  physicalProperty: PhysicalProperty;
  unit: string;
  samplingFrequency: SamplingFrequency;
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

/**
 * 4. Inspection Templates
 */
export interface InspectionCheckpointDefinition {
  checkpointCode: string;
  title: string;
  subsystemCode: string;
  inspectionType: 'VISUAL' | 'AUDITORY' | 'TACTILE' | 'GAUGE_VERIFICATION' | 'LEAK_CHECK';
  frequency: 'PER_SHIFT' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  allowedResponses: Array<{ code: string; label: string; isAbnormal: boolean }>;
  guidanceText: string;
  requiresPhotoOnAbnormal: boolean;
}

export interface EquipmentInspectionTemplateDefinition {
  templateCode: string;
  title: string;
  category: string;
  checkpoints: InspectionCheckpointDefinition[];
}

/**
 * 5. Maintenance Task Templates (PM Routines)
 */
export interface EquipmentMaintenanceTaskTemplateDefinition {
  taskTemplateCode: string;
  title: string;
  subsystemCode: string;
  frequencyDays: number;
  estimatedLaborHours: number;
  tradeSkill: string;
  requiredParts: Array<{ partCode: string; partName: string; quantity: number }>;
  procedureSteps: string[];
  safetyPrecautions: string[];
}

/**
 * 6. Decision-Support Model Association
 * STRICT CONSTRAINT: Models must be decoupled and validated per equipment category.
 * Cross-module reuse (e.g. applying Boiler ANP to Chillers) is strictly prohibited
 * unless an independently validated model explicitly supports that use case.
 */
export interface DecisionCriterionDefinition {
  code: string;
  name: string;
  cluster: string;
  weight?: number;
  description: string;
}

export interface DecisionAlternativeDefinition {
  code: string;
  name: string;
  actionType: 'PREVENTIVE' | 'CORRECTIVE' | 'OVERHAUL' | 'CONDITION_MONITORING';
  estimatedCostScore?: number;
  downtimeImpactScore?: number;
  description: string;
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
  criteria: DecisionCriterionDefinition[];
  alternatives: DecisionAlternativeDefinition[];
}

/**
 * 7. Equipment-Specific Dashboard Configuration
 */
export interface EquipmentDashboardWidgetConfig {
  widgetId: string;
  widgetType: 'GAUGE' | 'METRIC_CARD' | 'TIME_SERIES' | 'STATUS_BADGE' | 'DIAGRAM';
  title: string;
  parameterCodes: string[];
  targetSubsystem?: string;
  layout: { w: number; h: number; x: number; y: number };
  options?: Record<string, unknown>;
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
  widgets: EquipmentDashboardWidgetConfig[];
}

/**
 * 8. Equipment Reporting Configuration
 */
export interface EquipmentReportingConfig {
  reportTypes: Array<{
    reportCode: string;
    title: string;
    format: 'CSV' | 'PDF' | 'JSON';
    metricsIncluded: string[];
    governingStandard?: string;
  }>;
}

/**
 * Complete Standardized Equipment Module Contract
 */
export interface EquipmentModuleContract {
  moduleCode: string;
  categoryCode: string; // Matches CMMS AssetCategory code
  name: string;
  version: string;
  description: string;
  governingStandards: string[];
  icon: string;

  // Contracts
  specificationsSchema: EquipmentSpecsSchema;
  physicalSubsystems: EquipmentSubsystemDefinition[];
  measurementPoints: EquipmentMeasurementPointDefinition[];
  inspectionTemplates: EquipmentInspectionTemplateDefinition[];
  maintenanceTaskTemplates: EquipmentMaintenanceTaskTemplateDefinition[];
  decisionSupport: EquipmentDecisionSupportAssociation;
  dashboardConfig: EquipmentDashboardConfig;
  reportingConfig: EquipmentReportingConfig;

  // Behavioral Methods
  evaluateReadings: (readings: Record<string, number>) => EquipmentAnomalyResult[];
  calculateKpis: (readings: Record<string, number>, specs?: Record<string, unknown>) => Record<string, number | null>;
}
