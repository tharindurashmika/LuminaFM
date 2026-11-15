import { apiRequest } from './api.client';
import {
  EquipmentModuleSummary,
  EquipmentModuleContract,
  EquipmentAnomalyResult,
} from '../types/equipment-module.types';

export interface EvaluateReadingsResponse {
  moduleCode: string;
  evaluatedAt: string;
  readingsCount: number;
  anomaliesDetectedCount: number;
  anomalies: EquipmentAnomalyResult[];
  calculatedKpis: Record<string, number | null>;
}

export interface DecisionCompatibilityResponse {
  compatible: boolean;
  moduleCode: string;
  decisionModelCode: string;
  decisionFrameworkType: string;
  validationStatus: string;
  message?: string;
  error?: string;
}

export class EquipmentModuleApiService {
  /**
   * Fetches all registered equipment modules
   */
  async listModules(): Promise<EquipmentModuleSummary[]> {
    const res = await apiRequest<{ totalCount: number; modules: EquipmentModuleSummary[] }>(
      '/equipment-modules'
    );
    return res.data.modules;
  }

  /**
   * Fetches full equipment module specification by module code
   */
  async getModuleByCode(moduleCode: string): Promise<EquipmentModuleContract> {
    const res = await apiRequest<EquipmentModuleContract>(`/equipment-modules/${moduleCode}`);
    return res.data;
  }

  /**
   * Resolves equipment module for an asset category
   */
  async getModuleByCategory(categoryCode: string): Promise<EquipmentModuleSummary | null> {
    try {
      const res = await apiRequest<EquipmentModuleSummary>(
        `/equipment-modules/by-category/${categoryCode}`
      );
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Evaluates operational readings and computes real-time KPIs
   */
  async evaluateReadings(
    moduleCode: string,
    readings: Record<string, number>
  ): Promise<EvaluateReadingsResponse> {
    const res = await apiRequest<EvaluateReadingsResponse>(
      `/equipment-modules/${moduleCode}/evaluate-readings`,
      {
        method: 'POST',
        body: JSON.stringify({ readings }),
      }
    );
    return res.data;
  }

  /**
   * Verifies decision support model compatibility against equipment module
   */
  async verifyDecisionCompatibility(
    moduleCode: string,
    decisionModelCode: string
  ): Promise<DecisionCompatibilityResponse> {
    const res = await apiRequest<DecisionCompatibilityResponse>(
      `/equipment-modules/${moduleCode}/verify-decision-compatibility`,
      {
        method: 'POST',
        body: JSON.stringify({ decisionModelCode }),
      }
    );
    return res.data;
  }
}

export const equipmentModuleApiService = new EquipmentModuleApiService();
