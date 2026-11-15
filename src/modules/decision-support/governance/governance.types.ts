/**
 * LuminaFM - ANP Model Governance & Validation Types
 *
 * Implements structured governance for multi-criteria boiler maintenance decision models:
 * - Criteria source & provenance (Academic dissertation baseline vs Commercial client proposals)
 * - Literature references & peer-reviewed citations
 * - Expert identification & anonymization controls
 * - Expert judgments, interviews & retention rates (McConachie et al. 2019 >= 80% consensus)
 * - Pairwise comparison matrices & Saaty consistency verification
 * - Validation status & audit approval history
 * - Model versioning, deep diffing, and priority shift tracking
 * - Evidence attachments supporting each criterion
 */

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

// =============================================================================
// Model Version Comparison & Diff Types
// =============================================================================

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
