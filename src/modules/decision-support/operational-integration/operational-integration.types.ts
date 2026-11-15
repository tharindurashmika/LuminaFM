/**
 * LuminaFM - Operational ANP Decision Support Types
 *
 * Grounded in the University of Moratuwa Master's Dissertation:
 * "Development of a Software-Based Boiler Maintenance Decision-Making Tool" (Vishal Perera, June 2025)
 *
 * Implements:
 * 1. Data completeness & quality assessment (physical validity, sensor integrity)
 * 2. Active decision model retrieval & criteria mapping
 * 3. Mathematical ANP execution (Limit Supermatrix) & priority storage
 * 4. Ranked maintenance recommendations with criteria influence attribution
 * 5. Linking recommendations to operational readings & asset maintenance history
 * 6. Authorized engineer review & approval workflows (preventing unvetted execution)
 * 7. Strict distinction between independent safety alerts & ANP recommendations
 * 8. Prohibition of automatic safety-critical interventions
 * 9. Deterministic replayability & verification
 */

import { PriorityLevel } from '@prisma/client';

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
  score: number; // 0.0 to 1.0 (e.g. 0.95 = 95%)
  completenessRatio: number; // 0.0 to 1.0
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
  | 'SAFETY_CRITICAL_INTERVENTION' // Requires certified physical inspection; never auto-prescribed
  | 'OPERATIONAL_MAINTENANCE'      // Planned corrective or component maintenance
  | 'PREVENTIVE_OPTIMIZATION';     // Tuning, chemical dosing, fireside cleaning

export interface CriteriaAttributionDetail {
  criterionCode: string;
  criterionName: string;
  clusterCode: string;
  observedValue: number | string | boolean;
  benchmarkThreshold: string;
  deviationDescription: string;
  contributionPercentage: number; // e.g. 45.2%
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
  rank: number; // 1, 2, 3...
  alternativeCode: string;
  alternativeName: string;
  priorityValue: number; // Limit Supermatrix priority (p_a)
  relativeWeightPercentage: number; // e.g. 28.5%
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
