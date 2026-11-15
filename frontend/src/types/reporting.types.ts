import {
  CriticalityLevel,
  PriorityLevel,
  ValidationStatus,
  AcademicValidationLevel,
  AnpMaintenanceRecommendation,
  SafetyEscalationAlert,
  BoilerShift,
  LogbookStatus,
} from './cmms.types';

// =============================================================================
// DATA CLASSIFICATION (STRICTLY REQUIRED FOR AUDIT & REGULATORY COMPLIANCE)
// =============================================================================

export type DataClassificationType = 'measured' | 'calculated' | 'benchmark' | 'expert';

export interface DataClassificationMeta {
  type: DataClassificationType;
  label: string;
  shortLabel: string;
  description: string;
  badgeTone: 'cyan' | 'indigo' | 'amber' | 'gold';
  iconName: 'Activity' | 'Calculator' | 'Sliders' | 'Award';
}

export const DATA_CLASSIFICATIONS: Record<DataClassificationType, DataClassificationMeta> = {
  measured: {
    type: 'measured',
    label: 'Measured Value',
    shortLabel: 'MEASURED',
    description: 'Raw physical instrument reading captured via calibrated sensors or manual operator observation.',
    badgeTone: 'cyan',
    iconName: 'Activity',
  },
  calculated: {
    type: 'calculated',
    label: 'Calculated Output',
    shortLabel: 'CALCULATED',
    description: 'Mathematical derivative from the ANP Limit Supermatrix or statistical CMMS formula.',
    badgeTone: 'indigo',
    iconName: 'Calculator',
  },
  benchmark: {
    type: 'benchmark',
    label: 'Configured Benchmark',
    shortLabel: 'BENCHMARK',
    description: 'Empirical threshold or safety limit configured from ASME, EN, or OEM technical parameters.',
    badgeTone: 'amber',
    iconName: 'Sliders',
  },
  expert: {
    type: 'expert',
    label: 'Expert Recommendation',
    shortLabel: 'EXPERT REC',
    description: 'Multi-criteria maintenance strategy derived from Kingsbury dissertation expert interviews & academic literature.',
    badgeTone: 'gold',
    iconName: 'Award',
  },
};

// =============================================================================
// OPERATIONAL ABNORMALITIES
// =============================================================================

export type AbnormalitySeverity = 'CRITICAL' | 'WARNING' | 'OBSERVATION';

export interface OperationalAbnormalityItem {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  parameterCode: string;
  parameterName: string;
  measuredValue: number | string | boolean;
  benchmarkThreshold: number | string | boolean;
  benchmarkOperator: string;
  unit: string;
  severity: AbnormalitySeverity;
  deviationDescription: string;
  thematicAction: string;
  detectedAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  acknowledgementNotes?: string | null;
  linkedWorkOrderId?: string | null;
  linkedWorkOrderNumber?: string | null;
  source: 'manual_logbook' | 'scada_telemetry' | 'daily_inspection';
}

// =============================================================================
// NOTIFICATION CHANNELS & ACKNOWLEDGEMENT
// =============================================================================

export type NotificationChannelType = 'in_app' | 'email' | 'sms' | 'webhook';

export interface NotificationChannelConfig {
  id: string;
  channelType: NotificationChannelType;
  name: string;
  enabled: boolean;
  destination: string; // email address, phone number, webhook URL, or 'In-App Tray'
  minSeverity: 'CRITICAL' | 'WARNING' | 'ALL';
  minAnpPriorityScore: number; // 0.0 to 1.0 (e.g. 0.80)
  includeAuditHash: boolean;
  cooldownMinutes: number;
  lastDispatchedAt?: string | null;
  dispatchCount: number;
}

export interface AlertAcknowledgementPayload {
  abnormalityId: string;
  acknowledgedBy: string;
  acknowledgementNotes: string;
  actionTaken?: 'dispatched_work_order' | 'recalibrated' | 'verified_nominal' | 'monitoring';
}

// =============================================================================
// HISTORICAL TELEMETRY TRENDS
// =============================================================================

export interface HistoricalTelemetryPoint {
  timestamp: string;
  measuredValue: number;
  benchmarkLimit: number;
  nominalMin: number;
  nominalMax: number;
  isBreached: boolean;
  operatorNotes?: string;
}

export interface ParameterTrendHistory {
  parameterCode: string;
  parameterName: string;
  unit: string;
  category: 'combustion' | 'steam_pressure' | 'water_quality' | 'rotary_equipment';
  points: HistoricalTelemetryPoint[];
  currentValue: number;
  currentStatus: 'normal' | 'warning' | 'critical';
  benchmarkThreshold: number;
  benchmarkOperator: '>' | '<' | '>=' | '<=';
}

// =============================================================================
// ANP DECISION REPORTING & VALIDATION AUDIT
// =============================================================================

export interface CriteriaAttributionSummary {
  criterionCode: string;
  criterionName: string;
  clusterCode: string;
  contributionPercentage: number;
  measuredValue: number | string | boolean;
  benchmarkValue: string;
  unit: string;
}

export interface DecisionReportingSummary {
  decisionRunId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  decisionModelId: string;
  decisionModelCode: string;
  decisionModelVersion: number;
  evaluatedAt: string;
  deterministicHash: string;
  validationStatus: ValidationStatus;
  academicValidationLevel: AcademicValidationLevel;
  isValidated: boolean;
  validationDisclaimer?: string;
  compositeRiskScore: number;
  recommendedPriority: PriorityLevel;
  topAlternative: {
    code: string;
    name: string;
    anpPriorityScore: number;
    relativeWeightPercentage: number;
  };
  recommendations: AnpMaintenanceRecommendation[];
  criteriaContributions: CriteriaAttributionSummary[];
  safetyAlerts: SafetyEscalationAlert[];
}

// =============================================================================
// PREVENTIVE MAINTENANCE & PERFORMANCE METRICS
// =============================================================================

export interface PreventiveMaintenanceItem {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  title: string;
  frequency: string;
  dueDate: string;
  isOverdue: boolean;
  daysRemainingOrOverdue: number; // positive = days until due, negative = days overdue
  criticality: CriticalityLevel;
  assignedEngineer?: string | null;
  linkedWorkOrderId?: string | null;
  estimatedLaborHours: number;
}

export interface WorkOrderPerformanceMetrics {
  totalWorkOrders: number;
  completedCount: number;
  openCount: number;
  overdueCount: number;
  completionRatePercentage: number;
  onTimeCompletionPercentage: number;
  meanTimeToRepairHours: number;
  proactiveVsReactiveRatio: number; // e.g. 72.5%
  recentCompletions: Array<{
    id: string;
    workOrderNumber: string;
    assetCode: string;
    title: string;
    completedAt: string;
    completedBy: string;
    actualHours: number;
    type: 'preventive' | 'corrective' | 'anp_prescribed';
  }>;
}

// =============================================================================
// EXPORT FORMAT SPECIFICATIONS
// =============================================================================

export type ReportExportFormat = 'excel_csv' | 'printable_pdf';

export interface ReportExportRequest {
  reportType:
    | 'decision_run_audit'
    | 'daily_shift_logbook'
    | 'regulatory_compliance_dossier'
    | 'preventive_maintenance_tracking'
    | 'abnormalities_and_alerts';
  format: ReportExportFormat;
  assetId?: string;
  startDate?: string;
  endDate?: string;
  decisionRunId?: string;
  includeAuditSignatures?: boolean;
}
