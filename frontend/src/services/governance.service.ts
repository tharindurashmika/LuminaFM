import { apiRequest } from './api.client';
import {
  ModelGovernanceSnapshot,
  ModelVersionDiffResult,
  DecisionModelSummary,
  ProposeModelConfigurationDto,
  RecordCriterionEvidenceDto,
  RecordExpertEvaluationDto,
  AddValidationCommentDto,
  ApproveModelProposalDto,
} from '../types/cmms.types';

export const governanceService = {
  /**
   * Retrieve the immutable baseline dissertation governance metadata
   * (Saaty 1996, McConachie et al. 2019, 5 expert profiles, 22+ criteria)
   */
  async getBaselineGovernance(): Promise<ModelGovernanceSnapshot> {
    const res = await apiRequest<ModelGovernanceSnapshot>('/api/decision-governance/baseline');
    return res.data;
  },

  /**
   * Retrieve the governance snapshot for a specific decision model
   */
  async getModelGovernance(modelId: string): Promise<ModelGovernanceSnapshot> {
    const res = await apiRequest<ModelGovernanceSnapshot>(`/api/decision-governance/models/${modelId}`);
    return res.data;
  },

  /**
   * List all decision models in tenant for selection/comparison
   */
  async listDecisionModels(): Promise<DecisionModelSummary[]> {
    const res = await apiRequest<DecisionModelSummary[]>('/api/decision-models');
    return res.data;
  },

  /**
   * Deep diff between two decision model versions including ANP priority shifts
   */
  async compareModelVersions(
    modelAId: string,
    modelBId: string
  ): Promise<ModelVersionDiffResult> {
    const query = new URLSearchParams({ modelAId, modelBId }).toString();
    const res = await apiRequest<ModelVersionDiffResult>(`/api/decision-governance/compare?${query}`);
    return res.data;
  },

  /**
   * Propose a new commercial client configuration
   */
  async proposeModelConfiguration(
    dto: ProposeModelConfigurationDto
  ): Promise<any> {
    const res = await apiRequest<any>('/api/decision-governance/models/propose', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  /**
   * Attach evidence to a specific criterion (photos, logsheets, standards)
   */
  async recordCriterionEvidence(
    modelId: string,
    criterionCode: string,
    dto: RecordCriterionEvidenceDto
  ): Promise<any> {
    const res = await apiRequest<any>(
      `/api/decision-governance/models/${modelId}/criteria/${encodeURIComponent(criterionCode)}/evidence`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      }
    );
    return res.data;
  },

  /**
   * Record expert interview / evaluation for McConachie consensus
   */
  async recordExpertEvaluation(
    modelId: string,
    criterionCode: string,
    dto: RecordExpertEvaluationDto
  ): Promise<any> {
    const res = await apiRequest<any>(
      `/api/decision-governance/models/${modelId}/criteria/${encodeURIComponent(criterionCode)}/expert-evaluation`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      }
    );
    return res.data;
  },

  /**
   * Add validation or review comment
   */
  async addValidationComment(
    modelId: string,
    criterionCode: string,
    dto: AddValidationCommentDto
  ): Promise<any> {
    const res = await apiRequest<any>(
      `/api/decision-governance/models/${modelId}/criteria/${encodeURIComponent(criterionCode)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      }
    );
    return res.data;
  },

  /**
   * Formally approve or reject a model proposal
   */
  async approveModelProposal(
    modelId: string,
    dto: ApproveModelProposalDto
  ): Promise<any> {
    const res = await apiRequest<any>(`/api/decision-governance/models/${modelId}/approve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  /**
   * Activate an approved model for operational CMMS use
   */
  async activateModel(modelId: string): Promise<any> {
    const res = await apiRequest<any>(`/api/decision-governance/models/${modelId}/activate`, {
      method: 'POST',
    });
    return res.data;
  },
};
