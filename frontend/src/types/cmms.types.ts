export type CriticalityLevel = 'low' | 'medium' | 'high' | 'critical';

export type AssetStatus =
  | 'in_service'
  | 'out_of_service'
  | 'under_maintenance'
  | 'standby'
  | 'decommissioned';

export type AttributeDataType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'json';

export type WorkOrderStatus =
  | 'draft'
  | 'open'
  | 'approved'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'
  | 'closed';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type UserRole =
  | 'Organization Admin'
  | 'Plant Reliability Engineer'
  | 'Boiler Plant Operator'
  | 'Maintenance Technician';

export interface OrganizationThemeConfig {
  primaryColor?: string;
  brandColor?: string;
  showPlatformBadge?: boolean;
  customFooterText?: string;
}

export interface OrganizationInfo {
  id: string;
  code: string;
  name: string;
  legalName?: string | null;
  logoUri: string | null;
  timezone?: string;
  baseCurrency?: string;
  isActive?: boolean;
  themeConfig?: OrganizationThemeConfig;
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  jobTitle?: string | null;
  roles?: string[];
  permissions?: string[];
}

/**
 * Matches the backend POST /api/auth/login response payload
 */
export interface LoginResponseData {
  access_token: string;
  user_id: string;
  organization_id: string;
  logo_uri: string | null;
  user: UserInfo;
  organization: OrganizationInfo;
}

export interface DynamicEquipmentAttribute {
  id: string;
  attributeDefinitionId: string;
  code: string;
  name: string;
  dataType: AttributeDataType;
  unitCode: string | null;
  value: unknown;
  updatedAt: string;
}

export interface AssetDynamicAttributesResponse {
  assetId: string;
  assetCode: string;
  name: string;
  attributes: DynamicEquipmentAttribute[];
}

export interface AssetSummary {
  id: string;
  assetCode: string;
  name: string;
  serialNumber?: string | null;
  description?: string | null;
  criticality: CriticalityLevel;
  status: AssetStatus;
  site: { id: string; code: string; name: string };
  location: { id: string; code: string; name: string };
  assetCategory: { id: string; code: string; name: string };
  system?: { id: string; code: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  model?: { id: string; modelNumber: string; modelName: string } | null;
  parent?: { id: string; assetCode: string; name: string } | null;
  installationDate?: string | null;
  commissioningDate?: string | null;
  warrantyExpiryDate?: string | null;
  expectedLifeYears?: number | null;
  _count?: {
    workOrders: number;
    faultLogs: number;
    inspections: number;
    assetMeters: number;
  };
  attributes?: Record<string, string | number | boolean>;
}

export interface WorkOrderSummary {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string | null;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  site: { id: string; code: string; name: string };
  asset?: { id: string; assetCode: string; name: string } | null;
  maintenanceType: { id: string; code: string; name: string };
  scheduledStartAt?: string | null;
  createdAt: string;
}

export type ChecklistResponseType =
  | 'pass_fail'
  | 'yes_no'
  | 'number'
  | 'text'
  | 'date'
  | 'photo'
  | 'select';

export interface ChecklistItemDefinition {
  id: string;
  checklistTemplateId: string;
  itemCode: string;
  question: string;
  responseType: ChecklistResponseType;
  isRequired: boolean;
  expectedValue?: unknown;
  options?: string[];
  minValue?: number | null;
  maxValue?: number | null;
  unitCode?: string | null;
  sequenceNo: number;
  linkedMeterCode?: string | null;
}

export interface ChecklistTemplateDefinition {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  version: number;
  isActive: boolean;
  assetCategoryId?: string | null;
  items: ChecklistItemDefinition[];
}

export interface DailyLogEntryPayload {
  checklistItemId?: string;
  itemCode?: string;
  assetMeterId?: string;
  meterCode?: string;
  value?: unknown;
  readingValue?: number;
  notes?: string;
}

export interface DailyLogSubmissionPayload {
  assetId: string;
  checklistTemplateId: string;
  shiftName?: string;
  notes?: string;
  recordedAt?: string;
  autoDraftWorkOrder?: boolean;
  responses: DailyLogEntryPayload[];
}

export interface DailyLogSubmissionResult {
  inspection: {
    id: string;
    inspectionNumber: string;
    status: string;
    overallResult: 'pass' | 'fail' | 'conditional' | 'not_applicable';
    completedAt: string;
  };
  summary: {
    inspectionNumber: string;
    overallResult: 'pass' | 'fail' | 'conditional' | 'not_applicable';
    totalInspectionResponses: number;
    totalMeterReadings: number;
    failedItemsCount: number;
  };
  decisionSupport?: {
    evaluated: boolean;
    isBreached: boolean;
    evaluation?: {
      recommendedAction: string;
      recommendedPriority: PriorityLevel;
      confidenceScore: number;
      breachedCriteria: Array<{
        criterionCode: string;
        criterionName: string;
        observedValue: number | string | boolean;
        operator: string;
        threshold: number | string | boolean;
        unit: string | null;
        recommendedAction: string;
      }>;
    };
    decisionRun?: {
      id: string;
      recommendedAction: string;
      confidenceScore: number;
    } | null;
    notification?: {
      id: string;
      title: string;
      message: string;
    } | null;
    draftedWorkOrder?: {
      id: string;
      workOrderNumber: string;
      title: string;
      status: WorkOrderStatus;
      priority: PriorityLevel;
    } | null;
  } | null;
}

export type AnpAlertSeverity = 'warning' | 'critical';

export interface NotificationRecord {
  id: string;
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface DecisionRunRecord {
  id: string;
  decisionModelId: string;
  assetId?: string | null;
  workOrderId?: string | null;
  runAt: string;
  inputSnapshot?: Record<string, unknown>;
  resultSnapshot?: {
    compositeRiskScore?: number;
    recommendedPriority?: PriorityLevel;
    breachedCriteria?: Array<{
      criterionCode: string;
      criterionName: string;
      observedValue: number | string | boolean;
      operator: string;
      threshold: number | string | boolean;
      unit: string | null;
      recommendedAction: string;
    }>;
  };
  recommendedAction?: string | null;
  confidenceScore?: number | null;
  decisionModel?: {
    id: string;
    code: string;
    name: string;
    modelMethod: string;
  } | null;
  asset?: {
    id: string;
    assetCode: string;
    name: string;
  } | null;
  workOrder?: {
    id: string;
    workOrderNumber: string;
    title: string;
    status: WorkOrderStatus;
    priority: PriorityLevel;
  } | null;
}

export interface ActiveMaintenanceAlertItem {
  id: string;
  notificationId: string;
  decisionRunId: string;
  severity: AnpAlertSeverity;
  headline: string;
  criterionSummary: string;
  recommendedAction: string;
  confidenceScore: number;
  compositeRiskScore: number;
  createdAt: string;
  acknowledgedAt: string | null;
  asset: {
    id: string;
    assetCode: string;
    name: string;
  };
  draftedWorkOrder: {
    id: string;
    workOrderNumber: string;
    title: string;
    status: WorkOrderStatus;
    priority: PriorityLevel;
  };
}

export type BoilerShift = 'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C';
export type LogbookStatus = 'draft' | 'completed';

export interface StoredOperationalReading {
  id: string;
  parameterCode: string;
  parameterName: string;
  value: number;
  unit: string;
  source: 'manual' | 'iot' | 'scada' | 'calculated';
  recordedAt: string;
  operatorId?: string | null;
  operatorName?: string | null;
  notes?: string | null;
  isAmended: boolean;
  amendmentCount: number;
  nominalRange: { min: number; max: number };
  physicalRange: { min: number; max: number };
  inNominalRange: boolean;
  benchmarkBreached: boolean;
  thematicAction?: string | null;
}

export interface ChecklistResponseRecord {
  id: string;
  checklistItemId?: string;
  checkpointCode: string;
  name: string;
  responseValue: string | number | boolean;
  resultStatus: 'pass' | 'fail' | 'observation' | 'not_applicable';
  notes?: string | null;
  evidenceUri?: string | null;
}

export interface OperationalObservationRecord {
  id: string;
  category: string;
  severity: string;
  observationText: string;
  recordedAt: string;
  observerUserId?: string | null;
  attachmentUris: string[];
}

export interface TraceableAmendmentRecord {
  id: string;
  logbookId: string;
  readingId?: string;
  parameterCode: string;
  parameterName: string;
  originalValue: number;
  amendedValue: number;
  unit: string;
  reason: string; // STRICTLY MANDATORY
  amendedBy: string;
  amendedByName?: string;
  amendedAt: string;
  evidenceUri?: string | null;
}

export interface SaveDailyLogbookDto {
  assetId: string;
  logDate: string;
  shift: BoilerShift;
  operatingPeriod: string;
  status?: LogbookStatus;
  readings: Record<string, number> | Array<{ parameterCode: string; value: number; unit?: string; notes?: string }>;
  checklists?: Record<string, string | number | boolean>;
  observations?: Array<{
    category: string;
    severity?: string;
    observationText: string;
    attachmentUris?: string[];
  }>;
  attachments?: Array<{
    fileName: string;
    storageUri: string;
    mimeType?: string;
    caption?: string;
  }>;
  operatorNotes?: string;
  autoEvaluateAnp?: boolean;
}

export interface AmendLogbookReadingDto {
  readingId?: string;
  parameterCode: string;
  amendedValue: number;
  reason: string;
  evidenceUri?: string;
}

export interface DailyLogbookFilterParams {
  assetId?: string;
  startDate?: string;
  endDate?: string;
  shift?: BoilerShift;
  status?: LogbookStatus | 'all';
  operatorId?: string;
}

export interface DailyLogbookSummaryItem {
  id: string;
  logNumber: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  status: LogbookStatus;
  shift: BoilerShift;
  operatingPeriod: string;
  logDate: string;
  recordedAt: string;
  completedAt?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  totalReadingsCount: number;
  anomaliesCount: number;
  amendmentsCount: number;
  overallResult?: string | null;
  operatorNotes?: string | null;
}

export interface DetailedDailyLogbookResponse {
  id: string;
  logNumber: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  status: LogbookStatus;
  shift: BoilerShift;
  operatingPeriod: string;
  logDate: string;
  createdAt: string;
  completedAt?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  operatorNotes?: string | null;
  overallResult?: string | null;
  readings: StoredOperationalReading[];
  checklists: ChecklistResponseRecord[];
  observations: OperationalObservationRecord[];
  attachments: Array<{
    id: string;
    fileName: string;
    storageUri: string;
    mimeType?: string;
    caption?: string;
    uploadedAt: string;
  }>;
  amendments: TraceableAmendmentRecord[];
  anomalies: Array<{
    parameterCode: string;
    parameterName: string;
    observedValue: number;
    unit: string;
    thresholdOperator: string;
    thresholdValue: number;
    deviationDescription: string;
    thematicMaintenanceAction: string;
    severity: 'WARNING' | 'CRITICAL';
  }>;
}

// =============================================================================
// ANP Model Governance & Validation Types
// =============================================================================

export type CriteriaProvenance =
  | 'literature'
  | 'expert_interview'
  | 'empirical_baseline'
  | 'commercial_client_proposal';

export type ModelProvenance = 'dissertation_baseline' | 'commercial_client';

export type AcademicValidationLevel =
  | 'peer_reviewed_dissertation'
  | 'industry_expert_panel'
  | 'unvalidated_client_proposal'
  | 'commercial_field_tested';

export type ValidationStatus =
  | 'academic_validated'
  | 'pending_expert_validation'
  | 'client_proposed'
  | 'commercial_validated'
  | 'rejected';

export interface LiteratureReference {
  id: string;
  citationKey: string;
  author: string;
  year: number;
  title: string;
  source: string;
  doiOrUrl?: string;
  pages?: string;
  excerpts?: string;
}

export interface ExpertProfile {
  expertId: string;
  isAnonymized: boolean;
  publicReference: string;
  confidentialIdentity?: string;
  yearsOfExperience: number;
  sector: string;
  professionalRole: string;
  technicalFocus: string;
}

export interface ExpertCriterionEvaluation {
  expertId: string;
  retentionVote: boolean;
  operationalRelevanceRating: number; // 1 to 5
  suggestedBenchmarkThreshold?: string;
  expertComments: string;
  interviewDate?: string;
}

export interface CriterionEvidence {
  id: string;
  evidenceType:
    | 'dissertation_text_excerpt'
    | 'standards_clause'
    | 'operational_log_sheet'
    | 'inspection_photograph'
    | 'test_report';
  title: string;
  description: string;
  sourceReference?: string;
  storageUri?: string;
  attachmentId?: string;
  isDissertationBaseline: boolean;
  uploadedByUserId?: string;
  uploadedAt: string;
}

export interface ValidationComment {
  id: string;
  authorUserId: string;
  authorName: string;
  timestamp: string;
  commentType:
    | 'expert_feedback'
    | 'admin_review'
    | 'audit_note'
    | 'rejection_reason';
  comment: string;
}

export interface CriterionGovernanceRecord {
  criterionCode: string;
  criterionName: string;
  source: CriteriaProvenance;
  literatureReferences: LiteratureReference[];
  expertEvaluations: ExpertCriterionEvaluation[];
  expertRetentionRate: number; // Percentage e.g. 100 or 80
  validationStatus: ValidationStatus;
  validationComments: ValidationComment[];
  evidence: CriterionEvidence[];
}

export interface ModelApprovalRecord {
  id: string;
  version: number;
  action:
    | 'proposed'
    | 'reviewed'
    | 'approved'
    | 'rejected'
    | 'activated'
    | 'retired';
  actorUserId: string;
  actorName: string;
  timestamp: string;
  notes: string;
  validationStatusResult: ValidationStatus;
  consistencyVerification: {
    allMatricesConsistent: boolean;
    maxConsistencyRatio: number;
    matrixCount: number;
  };
}

export interface ModelGovernanceSnapshot {
  modelProvenance: ModelProvenance;
  isAcademicBaseline: boolean;
  academicValidationLevel: AcademicValidationLevel;
  academicFidelityDisclosure: string;
  literatureCatalog: LiteratureReference[];
  expertRoster: ExpertProfile[];
  criteriaGovernance: Record<string, CriterionGovernanceRecord>;
  approvalHistory: ModelApprovalRecord[];
  validationNotes: string;
}

export interface CriteriaDiffItem {
  criterionCode: string;
  name: string;
  diffType: 'added' | 'removed' | 'modified' | 'unchanged';
  changes: {
    field: string;
    valueA: unknown;
    valueB: unknown;
  }[];
}

export interface AlternativeDiffItem {
  alternativeCode: string;
  name: string;
  diffType: 'added' | 'removed' | 'modified' | 'unchanged';
}

export interface PriorityShiftItem {
  code: string;
  name: string;
  priorityA: number;
  priorityB: number;
  deltaPriority: number; // priorityB - priorityA
  rankA: number;
  rankB: number;
  rankShift: number; // rankA - rankB (positive means improved rank)
}

export interface ModelVersionDiffResult {
  modelA: {
    id: string;
    code: string;
    name: string;
    version: number;
    status: string;
    provenance: ModelProvenance;
    academicValidationLevel: AcademicValidationLevel;
  };
  modelB: {
    id: string;
    code: string;
    name: string;
    version: number;
    status: string;
    provenance: ModelProvenance;
    academicValidationLevel: AcademicValidationLevel;
  };
  provenanceDifference: {
    isProvenanceEqual: boolean;
    message: string;
  };
  criteriaDiff: {
    added: CriteriaDiffItem[];
    removed: CriteriaDiffItem[];
    modified: CriteriaDiffItem[];
    totalChanges: number;
  };
  alternativesDiff: {
    added: AlternativeDiffItem[];
    removed: AlternativeDiffItem[];
    totalChanges: number;
  };
  anpPriorityShifts: {
    shifts: PriorityShiftItem[];
    maxShift: number;
    topPromotedAlternative: string | null;
    topDemotedAlternative: string | null;
  };
  governanceDiff: {
    newLiteratureAdded: number;
    newEvidenceAdded: number;
    approvalHistoryDifference: number;
  };
}

export interface DecisionModelSummary {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
  modelMethod?: string;
  configuration?: any;
  createdAt?: string;
  criteriaCount?: number;
  alternativesCount?: number;
}

export interface ProposeModelConfigurationDto {
  baseModelId?: string;
  code: string;
  name: string;
  description?: string;
  proposedCriteriaChanges?: {
    code: string;
    name: string;
    clusterCode: string;
    thresholdOperator?: string;
    thresholdValue?: number;
    unit?: string;
    thematicAction?: string;
  }[];
}

export interface RecordCriterionEvidenceDto {
  evidenceType:
    | 'dissertation_text_excerpt'
    | 'standards_clause'
    | 'operational_log_sheet'
    | 'inspection_photograph'
    | 'test_report';
  title: string;
  description: string;
  sourceReference?: string;
  storageUri?: string;
  attachmentId?: string;
}

export interface RecordExpertEvaluationDto {
  expertId: string;
  retentionVote: boolean;
  operationalRelevanceRating: number;
  suggestedBenchmarkThreshold?: string;
  expertComments: string;
  interviewDate?: string;
}

export interface AddValidationCommentDto {
  commentType:
    | 'expert_feedback'
    | 'admin_review'
    | 'audit_note'
    | 'rejection_reason';
  comment: string;
}

export interface ApproveModelProposalDto {
  action: 'approved' | 'rejected';
  notes: string;
  validationStatusResult?: ValidationStatus;
  academicValidationLevel?: AcademicValidationLevel;
}

// =============================================================================
// Operational ANP Integration & Recommendations Governance Types
// =============================================================================

export type QualityFlag =
  | 'STALE_READING'
  | 'SENSOR_OUT_OF_PHYSICAL_RANGE'
  | 'MISSING_CRITICAL_PARAMETER'
  | 'DISCREPANT_CROSS_READING'
  | 'NEGATIVE_VALUE_PHYSICAL_IMPOSSIBILITY';

export interface OutOfRangeReadingDetail {
  parameterCode: string;
  observedValue: number;
  physicalMin: number;
  physicalMax: number;
  unit: string;
  reason: string;
}

export interface DataQualityReport {
  isValid: boolean;
  score: number;
  completenessRatio: number;
  totalParametersAssessed: number;
  validParametersCount: number;
  missingRequiredParameters: string[];
  outOfRangeReadings: OutOfRangeReadingDetail[];
  qualityFlags: QualityFlag[];
  validationTimestamp: string;
}

export interface SafetyEscalationAlert {
  alertId: string;
  assetId: string;
  severity: 'CRITICAL_EMERGENCY' | 'SAFETY_WARNING';
  ruleCode: string;
  ruleTitle: string;
  parameterCode: string;
  observedValue: number | boolean | string;
  safetyLimit: string;
  emergencyActionRequired: string;
  independentOfAnp: true;
  requiresCertifiedInspectorSignoff: true;
  escalatedAt: string;
  notifiedUserIds: string[];
}

export type RecommendationSafetyTier =
  | 'SAFETY_CRITICAL_INTERVENTION'
  | 'OPERATIONAL_MAINTENANCE'
  | 'PREVENTIVE_OPTIMIZATION';

export interface CriteriaAttributionDetail {
  criterionCode: string;
  criterionName: string;
  clusterCode: string;
  observedValue: number | string | boolean;
  benchmarkThreshold: string;
  deviationDescription: string;
  contributionPercentage: number;
  rootCauseHypothesis: string;
}

export interface LinkedReadingSummary {
  readingId?: string;
  parameterCode: string;
  parameterName: string;
  observedValue: number | string | boolean;
  unit: string;
  thresholdOperator?: string;
  thresholdValue?: number | string | boolean;
  deviationDescription?: string;
  timestamp: string;
}

export interface AssetMaintenanceContext {
  lastCompletedWorkOrder?: {
    id: string;
    workOrderNumber: string;
    title: string;
    completedAt: string;
    maintenanceType?: string;
  } | null;
  daysSinceLastIntervention?: number | null;
  previousInterventionsCount?: number;
  contextualNote?: string;
}

export type RecommendationReviewStatus =
  | 'PROPOSED_PENDING_ENGINEER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_WORK_ORDER';

export interface AnpMaintenanceRecommendation {
  recommendationId: string;
  rank: number;
  alternativeCode: string;
  alternativeName: string;
  priorityValue: number;
  relativeWeightPercentage: number;
  safetyTier: RecommendationSafetyTier;
  recommendedActionTitle: string;
  technicalWorkScope: string;
  suggestedPriority: PriorityLevel;
  estimatedLaborHours?: number;
  sparesRequired?: string[];
  criteriaAttribution: CriteriaAttributionDetail[];
  linkedReadings: LinkedReadingSummary[];
  maintenanceHistoryContext: AssetMaintenanceContext;
  reviewStatus: RecommendationReviewStatus;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  engineerNotes?: string | null;
  generatedWorkOrderId?: string | null;
}

export interface OperationalAnpExecutionResult {
  decisionRunId: string;
  assetId?: string | null;
  assetCode?: string | null;
  assetName?: string | null;
  decisionModelId: string;
  decisionModelCode: string;
  decisionModelVersion: number;
  evaluatedAt: string;
  dataQuality: DataQualityReport;
  safetyAlerts: SafetyEscalationAlert[];
  recommendations: AnpMaintenanceRecommendation[];
  isBreached: boolean;
  compositeRiskScore: number;
  recommendedPriority: PriorityLevel;
  topAlternative: {
    code: string;
    name: string;
    anpPriorityScore: number;
  } | null;
  supermatrixWeights: Record<string, number>;
  deterministicHash: string;
  convergenceDetails: {
    converged: boolean;
    iterations: number;
    finalEpsilon: number;
  };
}

export interface ReviewRecommendationDto {
  action: 'approve' | 'reject' | 'modify_and_approve';
  engineerNotes: string;
  targetPriority?: PriorityLevel;
  assignedUserId?: string;
  scheduledDate?: string;
  autoCreateWorkOrder?: boolean;
}

export interface RecommendationApprovalResult {
  recommendationId: string;
  decisionRunId: string;
  reviewStatus: RecommendationReviewStatus;
  reviewedByUserId: string;
  reviewedAt: string;
  engineerNotes: string;
  workOrder?: {
    id: string;
    workOrderNumber: string;
    title: string;
    status: string;
    priority: PriorityLevel;
  } | null;
}

export interface ReplayDecisionRunResult {
  runId: string;
  decisionModelId: string;
  decisionModelCode: string;
  decisionModelVersion: number;
  isReproducible: boolean;
  priorityDeltaMax: number;
  originalPriorities: Record<string, number>;
  recalculatedPriorities: Record<string, number>;
  originalTopAlternative: string | null;
  recalculatedTopAlternative: string | null;
  recalculatedResult?: any;
  originalResult?: any;
  recalculatedAt: string;
  verifiedAt?: string;
  verificationNotes: string;
}

// =============================================================================
// GENERIC CMMS MANAGEMENT INTERFACE TYPES
// =============================================================================

export interface EquipmentHierarchyNode {
  id: string;
  code: string;
  name: string;
  type: 'site' | 'building' | 'floor' | 'room' | 'system' | 'subsystem' | 'asset' | 'component';
  parentId?: string | null;
  children?: EquipmentHierarchyNode[];
  assetCount?: number;
  status?: AssetStatus;
  criticality?: CriticalityLevel;
  categoryName?: string;
  systemName?: string;
  locationName?: string;
  modelNumber?: string;
}

export interface MaintenanceSchedule {
  id: string;
  planTitle: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  frequencyType: 'calendar' | 'runtime_hours' | 'inspection';
  intervalValue: number;
  intervalUnit: 'days' | 'weeks' | 'months' | 'hours';
  nextDueAt: string;
  lastCompletedAt?: string | null;
  isOverdue: boolean;
  priority: PriorityLevel;
  status: 'active' | 'paused' | 'draft';
  assignedEngineer?: string | null;
  estimatedHours: number;
  workOrderGenerationLeadDays?: number;
}

export interface MaintenanceCostReport {
  period: string;
  currency: string;
  totalCost: number;
  laborCost: number;
  partsCost: number;
  contractorCost: number;
  preventiveSpend: number;
  correctiveSpend: number;
  preventiveRatio: number; // e.g. 72.5%
  categoryBreakdown: Array<{
    categoryName: string;
    totalCost: number;
    percentage: number;
    workOrderCount: number;
  }>;
  topCostAssets: Array<{
    assetId: string;
    assetCode: string;
    assetName: string;
    totalSpend: number;
    correctiveCount: number;
    mtbfHours: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    labor: number;
    parts: number;
    total: number;
    budget: number;
  }>;
}

export interface InspectionHistoryRecord {
  id: string;
  inspectionNumber: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  inspectorName: string;
  inspectedAt: string;
  overallResult: 'pass' | 'fail' | 'conditional' | 'not_applicable';
  checklistName: string;
  scorePercentage: number;
  abnormalCount: number;
  notes?: string | null;
  responses?: Array<{
    question: string;
    answer: string;
    isAnomaly: boolean;
    itemCode?: string;
  }>;
}

export interface FaultHistoryRecord {
  id: string;
  faultCode: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string;
  reportedAt: string;
  reportedByName: string;
  linkedWorkOrderId?: string | null;
  linkedWorkOrderNumber?: string | null;
  resolutionStatus: 'reported' | 'investigating' | 'work_order_created' | 'resolved';
  downtimeMinutes?: number;
  notes?: string | null;
}






