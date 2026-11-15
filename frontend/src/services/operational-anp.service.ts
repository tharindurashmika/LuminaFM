import { apiRequest } from './api.client';
import {
  OperationalAnpExecutionResult,
  ReviewRecommendationDto,
  RecommendationApprovalResult,
  ReplayDecisionRunResult,
} from '../types/cmms.types';

export const operationalAnpApiService = {
  /**
   * Retrieves an operational decision run with data quality, safety alerts,
   * ranked recommendations, criteria attribution, and linked readings.
   */
  async getOperationalDecisionRun(runId: string): Promise<OperationalAnpExecutionResult> {
    const res = await apiRequest<OperationalAnpExecutionResult>(
      `/api/decision-support/operational/runs/${runId}`
    );
    return res.data;
  },

  /**
   * Authorized engineer review and approval of a proposed maintenance recommendation.
   * "Do not automatically prescribe safety-critical interventions."
   */
  async reviewRecommendation(
    runId: string,
    recIndex: number,
    dto: ReviewRecommendationDto
  ): Promise<RecommendationApprovalResult> {
    const res = await apiRequest<RecommendationApprovalResult>(
      `/api/decision-support/operational/runs/${runId}/recommendations/${recIndex}/review`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      }
    );
    return res.data;
  },

  /**
   * Replays decision run from immutable stored input snapshot and model version,
   * verifying mathematical bit-for-bit reproducibility.
   */
  async replayDecisionRun(runId: string): Promise<ReplayDecisionRunResult> {
    const res = await apiRequest<ReplayDecisionRunResult>(
      `/api/decision-support/operational/runs/${runId}/replay`
    );
    return res.data;
  },

  /**
   * Queries active independent safety escalation alerts (LWCO, Overpressure, Stack Fire).
   */
  async getSafetyAlerts(): Promise<any[]> {
    const res = await apiRequest<any[]>('/api/decision-support/operational/safety-alerts');
    return res.data;
  },

  /**
   * Submits operational readings or manual telemetry directly to the ANP engine.
   */
  async processOperationalLog(payload: {
    assetId?: string;
    signals: Array<{ key: string; value: number | boolean | string; unit?: string }>;
    operatorUserId?: string;
  }): Promise<OperationalAnpExecutionResult> {
    const res = await apiRequest<OperationalAnpExecutionResult>(
      '/api/decision-support/operational/process-log',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },
};
