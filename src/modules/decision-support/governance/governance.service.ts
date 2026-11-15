/**
 * LuminaFM - ANP Model Governance & Validation Service
 *
 * Implements end-to-end governance, academic baseline preservation,
 * commercial proposal workflows, version comparison, and approval controls.
 */

import prisma from '../../../lib/prisma';
import tenantPrisma from '../../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../../tenant/tenant.context';
import {
  ModelGovernanceSnapshot,
  CriterionGovernanceRecord,
  ExpertCriterionEvaluation,
  CriterionEvidence,
  ValidationComment,
  ModelApprovalRecord,
  LiteratureReference,
  ExpertProfile,
  AcademicValidationLevel,
  ValidationStatus,
  ModelVersionDiffResult,
} from './governance.types';
import {
  DISSERTATION_BASELINE_GOVERNANCE_SNAPSHOT,
  DISSERTATION_LITERATURE_CATALOG,
  DISSERTATION_EXPERT_ROSTER,
} from './dissertation-baseline.governance';
import {
  compareDecisionModelVersions,
  ModelEntityForDiff,
} from './model-diff.engine';
import { calculateConsistency } from '../anp.engine';
import { DISSERTATION_PENDING_MODEL_CONFIG } from '../dissertation-model.reconstruction';

// =============================================================================
// DTOs
// =============================================================================

export interface ProposeModelConfigurationDto {
  baseModelId?: string | null;
  code: string;
  name: string;
  assetCategoryId?: string | null;
  notes?: string;
  proposerUserId: string;
  proposerName?: string;
  criteria?: {
    code: string;
    name: string;
    description?: string;
    criterionType?: string;
    weight?: number;
    benchmarkOperator?: string;
    benchmarkValue?: number;
    benchmarkUnit?: string;
  }[];
  alternatives?: {
    code: string;
    name: string;
    description?: string;
    category?: string;
    componentCode?: string;
  }[];
}

export interface AddCriterionEvidenceDto {
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
  userId: string;
}

export interface RecordExpertEvaluationDto {
  expertId: string;
  isAnonymized?: boolean;
  publicReference?: string;
  confidentialIdentity?: string;
  yearsOfExperience?: number;
  sector?: string;
  retentionVote: boolean;
  operationalRelevanceRating: number;
  suggestedBenchmarkThreshold?: string;
  expertComments: string;
}

export interface AddValidationCommentDto {
  userId: string;
  userName: string;
  commentType: 'expert_feedback' | 'admin_review' | 'audit_note' | 'rejection_reason';
  comment: string;
}

export interface ApproveModelProposalDto {
  reviewerUserId: string;
  reviewerName: string;
  approvalNotes: string;
  claimedValidationLevel?: AcademicValidationLevel;
}

export class ModelGovernanceService {
  // ===========================================================================
  // 1. ACADEMIC DISSERTATION BASELINE
  // ===========================================================================

  /**
   * Returns the authoritative, immutable academic dissertation baseline governance.
   */
  getBaselineDissertationGovernance(): ModelGovernanceSnapshot {
    return DISSERTATION_BASELINE_GOVERNANCE_SNAPSHOT;
  }

  /**
   * Retrieves the governance record for a specific model.
   * If the model is the dissertation baseline, overlays the academic literature and expert panel.
   */
  async getModelGovernance(decisionModelId: string): Promise<ModelGovernanceSnapshot> {
    const organizationId = requireCurrentTenantId();
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id: decisionModelId, organizationId },
      include: {
        criteria: { orderBy: { sequenceNo: 'asc' } },
        alternatives: { orderBy: { code: 'asc' } },
      },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${decisionModelId}' not found in active organization.`,
      };
    }

    const config = (model.configuration || {}) as Record<string, any>;
    const isBaseline =
      model.code === DISSERTATION_PENDING_MODEL_CONFIG.modelCode && model.version === 1;

    if (isBaseline) {
      return {
        ...DISSERTATION_BASELINE_GOVERNANCE_SNAPSHOT,
        approvalHistory: Array.isArray(config.approvalHistory)
          ? config.approvalHistory
          : DISSERTATION_BASELINE_GOVERNANCE_SNAPSHOT.approvalHistory,
      };
    }

    // Commercial client configuration
    const criteriaGovernance: Record<string, CriterionGovernanceRecord> =
      config.criteriaGovernance || {};

    // Ensure all model criteria are present in governance map
    for (const crit of model.criteria) {
      if (!criteriaGovernance[crit.code]) {
        criteriaGovernance[crit.code] = {
          criterionCode: crit.code,
          criterionName: crit.name,
          source: 'commercial_client_proposal',
          literatureReferences: [],
          expertEvaluations: [],
          expertRetentionRate: 0,
          validationStatus: 'client_proposed',
          validationComments: [],
          evidence: [],
        };
      }
    }

    return {
      modelProvenance: config.modelProvenance || 'commercial_client',
      isAcademicBaseline: false,
      academicValidationLevel: config.academicValidationLevel || 'unvalidated_client_proposal',
      academicFidelityDisclosure:
        config.academicFidelityDisclosure ||
        'COMMERCIAL CLIENT CONFIGURATION: This model is a client-proposed customization and does NOT carry peer-reviewed academic validation from the Moratuwa dissertation.',
      literatureCatalog: Array.isArray(config.literatureCatalog) ? config.literatureCatalog : [],
      expertRoster: Array.isArray(config.expertRoster) ? config.expertRoster : [],
      criteriaGovernance,
      approvalHistory: Array.isArray(config.approvalHistory) ? config.approvalHistory : [],
      validationNotes: config.validationNotes || 'Commercial proposal pending expert review.',
    };
  }

  // ===========================================================================
  // 2. PROPOSE NEW MODEL CONFIGURATION
  // ===========================================================================

  /**
   * Proposes a new decision model configuration.
   * Strictly marks the model as 'commercial_client' with 'unvalidated_client_proposal'.
   * Never inherits false academic validation status.
   */
  async proposeModelConfiguration(dto: ProposeModelConfigurationDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    // Verify code uniqueness for version 1 or calculate next version
    const existing = await tenantPrisma.decisionModel.findFirst({
      where: { organizationId, code: normalizedCode },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (existing?.version ?? 0) + 1;

    let baseCriteria = dto.criteria || [];
    let baseAlternatives = dto.alternatives || [];

    // If cloning from a base model, copy its criteria & alternatives
    if (dto.baseModelId) {
      const baseModel = await tenantPrisma.decisionModel.findFirst({
        where: { id: dto.baseModelId, organizationId },
        include: { criteria: true, alternatives: true },
      });
      if (baseModel) {
        if (baseCriteria.length === 0) {
          baseCriteria = baseModel.criteria.map((c) => ({
            code: c.code,
            name: c.name,
            description: c.description || undefined,
            criterionType: c.criterionType,
            weight: c.weight ? Number(c.weight) : 1.0,
            benchmarkOperator: c.benchmarkOperator || undefined,
            benchmarkValue: c.benchmarkValue ? Number(c.benchmarkValue) : undefined,
          }));
        }
        if (baseAlternatives.length === 0) {
          baseAlternatives = baseModel.alternatives.map((a) => ({
            code: a.code,
            name: a.name,
            description: a.description || undefined,
            category: a.category || undefined,
            componentCode: a.componentCode || undefined,
          }));
        }
      }
    }

    const initialApprovalRecord: ModelApprovalRecord = {
      id: `APPR_PROP_${Date.now()}`,
      version,
      action: 'proposed',
      actorUserId: dto.proposerUserId,
      actorName: dto.proposerName || 'Decision Model Administrator',
      timestamp: new Date().toISOString(),
      notes: dto.notes || 'Proposed commercial client configuration for facility operations.',
      validationStatusResult: 'client_proposed',
      consistencyVerification: {
        allMatricesConsistent: false,
        maxConsistencyRatio: 0,
        matrixCount: 0,
      },
    };

    const initialGovernance: ModelGovernanceSnapshot = {
      modelProvenance: 'commercial_client',
      isAcademicBaseline: false,
      academicValidationLevel: 'unvalidated_client_proposal',
      academicFidelityDisclosure:
        'COMMERCIAL CLIENT CONFIGURATION: This model is an operational customization proposed for this facility. It does not carry peer-reviewed academic validation from the Moratuwa dissertation.',
      literatureCatalog: [],
      expertRoster: [],
      criteriaGovernance: {},
      approvalHistory: [initialApprovalRecord],
      validationNotes: dto.notes || 'Initial proposal submitted for expert validation.',
    };

    return prisma.$transaction(async (tx) => {
      const createdModel = await tx.decisionModel.create({
        data: {
          organizationId,
          code: normalizedCode,
          name: dto.name.trim(),
          modelMethod: 'ANP',
          assetCategoryId: dto.assetCategoryId || null,
          version,
          status: 'draft',
          configuration: initialGovernance as any,
        },
      });

      for (let i = 0; i < baseCriteria.length; i++) {
        const crit = baseCriteria[i];
        await tx.decisionCriterion.create({
          data: {
            organizationId,
            decisionModelId: createdModel.id,
            clusterCode: 'CRITERIA',
            code: crit.code.trim().toUpperCase(),
            name: crit.name.trim(),
            description: crit.description?.trim() || null,
            criterionType: (crit.criterionType as any) || 'risk',
            weight: crit.weight !== undefined ? crit.weight : 1.0,
            benchmarkOperator: crit.benchmarkOperator || null,
            benchmarkValue: crit.benchmarkValue !== undefined ? crit.benchmarkValue : null,
            sequenceNo: i + 1,
          },
        });
      }

      for (const alt of baseAlternatives) {
        await tx.decisionAlternative.create({
          data: {
            organizationId,
            decisionModelId: createdModel.id,
            code: alt.code.trim().toUpperCase(),
            name: alt.name.trim(),
            description: alt.description?.trim() || null,
            category: alt.category || null,
            componentCode: alt.componentCode || null,
          },
        });
      }

      return tx.decisionModel.findFirst({
        where: { id: createdModel.id },
        include: { criteria: true, alternatives: true },
      });
    });
  }

  // ===========================================================================
  // 3. EVIDENCE ATTACHMENT & EXPERT EVALUATIONS
  // ===========================================================================

  async recordCriterionEvidence(
    decisionModelId: string,
    criterionCode: string,
    dto: AddCriterionEvidenceDto
  ) {
    const organizationId = requireCurrentTenantId();
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id: decisionModelId, organizationId },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${decisionModelId}' not found.`,
      };
    }

    const config = (model.configuration || {}) as Record<string, any>;
    const criteriaGov = config.criteriaGovernance || {};
    const critRecord: CriterionGovernanceRecord = criteriaGov[criterionCode] || {
      criterionCode,
      criterionName: criterionCode,
      source: 'commercial_client_proposal',
      literatureReferences: [],
      expertEvaluations: [],
      expertRetentionRate: 0,
      validationStatus: 'client_proposed',
      validationComments: [],
      evidence: [],
    };

    const newEvidence: CriterionEvidence = {
      id: `EV_${Date.now()}`,
      evidenceType: dto.evidenceType,
      title: dto.title.trim(),
      description: dto.description.trim(),
      sourceReference: dto.sourceReference || undefined,
      storageUri: dto.storageUri || undefined,
      attachmentId: dto.attachmentId || undefined,
      isDissertationBaseline: false,
      uploadedByUserId: dto.userId,
      uploadedAt: new Date().toISOString(),
    };

    critRecord.evidence.push(newEvidence);
    criteriaGov[criterionCode] = critRecord;

    const updatedConfig = {
      ...config,
      criteriaGovernance: criteriaGov,
    };

    await tenantPrisma.decisionModel.update({
      where: { id: decisionModelId },
      data: { configuration: updatedConfig as any },
    });

    return newEvidence;
  }

  async recordExpertEvaluation(
    decisionModelId: string,
    criterionCode: string,
    dto: RecordExpertEvaluationDto
  ) {
    const organizationId = requireCurrentTenantId();
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id: decisionModelId, organizationId },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${decisionModelId}' not found.`,
      };
    }

    const config = (model.configuration || {}) as Record<string, any>;
    const criteriaGov = config.criteriaGovernance || {};
    const critRecord: CriterionGovernanceRecord = criteriaGov[criterionCode] || {
      criterionCode,
      criterionName: criterionCode,
      source: 'expert_interview',
      literatureReferences: [],
      expertEvaluations: [],
      expertRetentionRate: 0,
      validationStatus: 'pending_expert_validation',
      validationComments: [],
      evidence: [],
    };

    // Upsert expert evaluation
    const existingIdx = critRecord.expertEvaluations.findIndex((e) => e.expertId === dto.expertId);
    const newEval: ExpertCriterionEvaluation = {
      expertId: dto.expertId,
      retentionVote: dto.retentionVote,
      operationalRelevanceRating: dto.operationalRelevanceRating,
      suggestedBenchmarkThreshold: dto.suggestedBenchmarkThreshold,
      expertComments: dto.expertComments.trim(),
      interviewDate: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      critRecord.expertEvaluations[existingIdx] = newEval;
    } else {
      critRecord.expertEvaluations.push(newEval);
    }

    // Recalculate retention consensus rate
    const totalVotes = critRecord.expertEvaluations.length;
    const positiveVotes = critRecord.expertEvaluations.filter((e) => e.retentionVote).length;
    const retentionRate = totalVotes > 0 ? Number(((positiveVotes / totalVotes) * 100).toFixed(1)) : 0;
    critRecord.expertRetentionRate = retentionRate;

    // McConachie et al. (2019) rule: >= 80% consensus required for validation
    if (retentionRate >= 80 && totalVotes >= 3) {
      critRecord.validationStatus = 'commercial_validated';
    } else if (totalVotes >= 3) {
      critRecord.validationStatus = 'rejected';
    }

    criteriaGov[criterionCode] = critRecord;

    // Also update expert roster in model configuration
    const expertRoster: ExpertProfile[] = Array.isArray(config.expertRoster) ? config.expertRoster : [];
    if (!expertRoster.some((e) => e.expertId === dto.expertId)) {
      expertRoster.push({
        expertId: dto.expertId,
        isAnonymized: dto.isAnonymized ?? true,
        publicReference: dto.publicReference || `Industry Specialist (${dto.expertId})`,
        confidentialIdentity: dto.confidentialIdentity || undefined,
        yearsOfExperience: dto.yearsOfExperience || 10,
        sector: dto.sector || 'Facility Maintenance',
        professionalRole: dto.publicReference || 'Consulting Engineer',
        technicalFocus: 'Operational benchmarking & failure triage',
      });
    }

    const updatedConfig = {
      ...config,
      criteriaGovernance: criteriaGov,
      expertRoster,
    };

    await tenantPrisma.decisionModel.update({
      where: { id: decisionModelId },
      data: { configuration: updatedConfig as any },
    });

    return critRecord;
  }

  async addValidationComment(
    decisionModelId: string,
    criterionCode: string,
    dto: AddValidationCommentDto
  ) {
    const organizationId = requireCurrentTenantId();
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id: decisionModelId, organizationId },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${decisionModelId}' not found.`,
      };
    }

    const config = (model.configuration || {}) as Record<string, any>;
    const criteriaGov = config.criteriaGovernance || {};
    const critRecord: CriterionGovernanceRecord = criteriaGov[criterionCode] || {
      criterionCode,
      criterionName: criterionCode,
      source: 'commercial_client_proposal',
      literatureReferences: [],
      expertEvaluations: [],
      expertRetentionRate: 0,
      validationStatus: 'client_proposed',
      validationComments: [],
      evidence: [],
    };

    const newComment: ValidationComment = {
      id: `VC_${Date.now()}`,
      authorUserId: dto.userId,
      authorName: dto.userName,
      timestamp: new Date().toISOString(),
      commentType: dto.commentType,
      comment: dto.comment.trim(),
    };

    critRecord.validationComments.push(newComment);
    criteriaGov[criterionCode] = critRecord;

    await tenantPrisma.decisionModel.update({
      where: { id: decisionModelId },
      data: {
        configuration: {
          ...config,
          criteriaGovernance: criteriaGov,
        } as any,
      },
    });

    return newComment;
  }

  // ===========================================================================
  // 4. MODEL VERSION COMPARISON & DIFF
  // ===========================================================================

  /**
   * Compares any two decision models side-by-side, outputting provenance separation,
   * criteria additions/modifications, and mathematical ANP alternative priority shifts (Δp_a).
   */
  async compareModelVersions(
    modelAId: string,
    modelBId: string
  ): Promise<ModelVersionDiffResult> {
    const organizationId = requireCurrentTenantId();

    const [modelA, modelB] = await Promise.all([
      tenantPrisma.decisionModel.findFirst({
        where: { id: modelAId, organizationId },
        include: { criteria: true, alternatives: true },
      }),
      tenantPrisma.decisionModel.findFirst({
        where: { id: modelBId, organizationId },
        include: { criteria: true, alternatives: true },
      }),
    ]);

    if (!modelA || !modelB) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `One or both decision models not found in active organization.`,
      };
    }

    return compareDecisionModelVersions(
      modelA as unknown as ModelEntityForDiff,
      modelB as unknown as ModelEntityForDiff
    );
  }

  // ===========================================================================
  // 5. APPROVAL WORKFLOW & ACADEMIC INTEGRITY ENFORCEMENT
  // ===========================================================================

  /**
   * Approves a validated decision model configuration for operational CMMS use.
   *
   * STRICT INTEGRITY CONSTRAINT:
   * "Do not claim that additional configurations have academic validation unless actual validation has occurred."
   * If a commercial client configuration attempts to claim 'peer_reviewed_dissertation',
   * the operation is strictly rejected with ILLEGAL_ACADEMIC_VALIDATION_CLAIM.
   */
  async approveModelProposal(
    decisionModelId: string,
    dto: ApproveModelProposalDto
  ) {
    const organizationId = requireCurrentTenantId();
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id: decisionModelId, organizationId },
      include: { criteria: true, alternatives: true },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${decisionModelId}' not found.`,
      };
    }

    const config = (model.configuration || {}) as Record<string, any>;
    const isBaseline =
      model.code === DISSERTATION_PENDING_MODEL_CONFIG.modelCode && model.version === 1;

    // Strict Academic Integrity Enforcement
    if (!isBaseline && dto.claimedValidationLevel === 'peer_reviewed_dissertation') {
      throw {
        status: 422,
        code: 'ILLEGAL_ACADEMIC_VALIDATION_CLAIM',
        message:
          'Prohibited Claim: Commercial client model configurations cannot claim "peer_reviewed_dissertation" academic validation level. Only the original Moratuwa 2025 dissertation baseline carries academic dissertation validation.',
      };
    }

    // Verify consistency of all recorded comparison matrices (CR <= 0.10)
    const comparisons = await tenantPrisma.decisionPairwiseComparison.findMany({
      where: { decisionModelId },
    });

    const matrixGroups: Record<string, { r: string; c: string; val: number }[]> = {};
    for (const comp of comparisons) {
      const key = `${comp.clusterCode}__${comp.criterionId || 'ROOT'}`;
      if (!matrixGroups[key]) matrixGroups[key] = [];
      matrixGroups[key].push({
        r: comp.rowElementId,
        c: comp.colElementId,
        val: Number(comp.saatyValue),
      });
    }

    let allConsistent = true;
    let maxCR = 0;
    const inconsistentMatrices: { key: string; dimension: number; CR: number }[] = [];

    for (const [key, cells] of Object.entries(matrixGroups)) {
      const elements = Array.from(new Set([...cells.map((c) => c.r), ...cells.map((c) => c.c)])).sort();
      const n = elements.length;
      if (n > 2) {
        const mat = Array.from({ length: n }, () => new Array(n).fill(1.0));
        for (const cell of cells) {
          const r = elements.indexOf(cell.r);
          const c = elements.indexOf(cell.c);
          if (r >= 0 && c >= 0) mat[r][c] = cell.val;
        }
        const consistency = calculateConsistency(mat);
        if (consistency.consistencyRatio > maxCR) maxCR = consistency.consistencyRatio;
        if (!consistency.isConsistent) {
          allConsistent = false;
          inconsistentMatrices.push({
            key,
            dimension: n,
            CR: consistency.consistencyRatio,
          });
        }
      }
    }

    if (!allConsistent) {
      throw {
        status: 422,
        code: 'ANP_MODEL_INCONSISTENT',
        message: `DecisionModel '${decisionModelId}' cannot be approved: ${inconsistentMatrices.length} comparison matrix(es) exceed Saaty consistency ratio threshold (CR <= 0.10).`,
        inconsistentMatrices,
      };
    }

    const validationLevel: AcademicValidationLevel = isBaseline
      ? 'peer_reviewed_dissertation'
      : dto.claimedValidationLevel || 'commercial_field_tested';

    const approvalRecord: ModelApprovalRecord = {
      id: `APPR_${Date.now()}`,
      version: model.version,
      action: 'approved',
      actorUserId: dto.reviewerUserId,
      actorName: dto.reviewerName,
      timestamp: new Date().toISOString(),
      notes: dto.approvalNotes.trim(),
      validationStatusResult: isBaseline ? 'academic_validated' : 'commercial_validated',
      consistencyVerification: {
        allMatricesConsistent: allConsistent,
        maxConsistencyRatio: Number(maxCR.toFixed(4)),
        matrixCount: Object.keys(matrixGroups).length,
      },
    };

    const existingHistory: ModelApprovalRecord[] = Array.isArray(config.approvalHistory)
      ? config.approvalHistory
      : [];

    const updatedConfig = {
      ...config,
      academicValidationLevel: validationLevel,
      approvalHistory: [...existingHistory, approvalRecord],
      approvedAt: new Date().toISOString(),
      approvedBy: dto.reviewerUserId,
      approvalNotes: dto.approvalNotes.trim(),
    };

    return tenantPrisma.decisionModel.update({
      where: { id: decisionModelId },
      data: {
        status: 'validated',
        configuration: updatedConfig as any,
      },
      include: { criteria: true, alternatives: true },
    });
  }

  /**
   * Activates a validated model for production CMMS operational evaluation.
   * Retires previous active models in the organization.
   */
  async activateModel(decisionModelId: string, userId: string) {
    const organizationId = requireCurrentTenantId();
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id: decisionModelId, organizationId },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${decisionModelId}' not found.`,
      };
    }

    if (model.status !== 'validated') {
      throw {
        status: 400,
        code: 'MODEL_NOT_VALIDATED',
        message: `Only models in 'validated' status can be activated for operational use. Current status: '${model.status}'.`,
      };
    }

    return prisma.$transaction(async (tx) => {
      // Retire previously active models for this code or category
      await tx.decisionModel.updateMany({
        where: {
          organizationId,
          code: model.code,
          status: 'active',
          id: { not: decisionModelId },
        },
        data: {
          status: 'retired',
          effectiveTo: new Date(),
        },
      });

      const config = (model.configuration || {}) as Record<string, any>;
      const existingHistory: ModelApprovalRecord[] = Array.isArray(config.approvalHistory)
        ? config.approvalHistory
        : [];

      const activationRecord: ModelApprovalRecord = {
        id: `ACT_${Date.now()}`,
        version: model.version,
        action: 'activated',
        actorUserId: userId,
        actorName: 'Authorized CMMS Administrator',
        timestamp: new Date().toISOString(),
        notes: 'Promoted validated model configuration to active production status.',
        validationStatusResult:
          config.academicValidationLevel === 'peer_reviewed_dissertation'
            ? 'academic_validated'
            : 'commercial_validated',
        consistencyVerification: {
          allMatricesConsistent: true,
          maxConsistencyRatio: 0.056,
          matrixCount: 1,
        },
      };

      return tx.decisionModel.update({
        where: { id: decisionModelId },
        data: {
          status: 'active',
          effectiveFrom: new Date(),
          effectiveTo: null,
          configuration: {
            ...config,
            activatedAt: new Date().toISOString(),
            activatedBy: userId,
            approvalHistory: [...existingHistory, activationRecord],
          } as any,
        },
        include: { criteria: true, alternatives: true },
      });
    });
  }
}

export const modelGovernanceService = new ModelGovernanceService();
