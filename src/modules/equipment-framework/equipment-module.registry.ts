import { EquipmentModuleContract } from './equipment-module.contract';
import { logger } from '../../utils/logger';

export class CrossModuleDecisionModelError extends Error {
  public code = 'CROSS_MODULE_DECISION_MODEL_PROHIBITED';
  constructor(message: string) {
    super(message);
    this.name = 'CrossModuleDecisionModelError';
  }
}

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
  decisionFrameworkType: string;
  decisionValidationStatus: string;
}

export class EquipmentModuleRegistry {
  private modules = new Map<string, EquipmentModuleContract>();
  private categoryIndex = new Map<string, string>(); // categoryCode -> moduleCode

  /**
   * Registers a new equipment module.
   * Validates contract completeness and registers category mapping.
   */
  registerModule(module: EquipmentModuleContract): void {
    if (!module.moduleCode) {
      throw new Error('[Registry Error] Module must define a non-empty moduleCode.');
    }
    if (!module.categoryCode) {
      throw new Error(`[Registry Error] Module '${module.moduleCode}' must specify categoryCode.`);
    }

    // Validate essential contract definitions
    if (!module.specificationsSchema || !Array.isArray(module.specificationsSchema.fields)) {
      throw new Error(`[Registry Error] Module '${module.moduleCode}' missing specificationsSchema fields.`);
    }
    if (!Array.isArray(module.measurementPoints) || module.measurementPoints.length === 0) {
      throw new Error(`[Registry Error] Module '${module.moduleCode}' must define at least one measurementPoint.`);
    }
    if (!module.decisionSupport || !module.decisionSupport.modelCode) {
      throw new Error(`[Registry Error] Module '${module.moduleCode}' must define decisionSupport association.`);
    }

    this.modules.set(module.moduleCode, module);
    this.categoryIndex.set(module.categoryCode.toLowerCase(), module.moduleCode);

    logger.info(`[Equipment Framework] Successfully registered equipment module '${module.name}' (${module.moduleCode}) for category '${module.categoryCode}'.`);
  }

  /**
   * Retrieves a module by its unique moduleCode.
   */
  getModule(moduleCode: string): EquipmentModuleContract | undefined {
    return this.modules.get(moduleCode);
  }

  /**
   * Retrieves the equipment module associated with a CMMS AssetCategory code.
   */
  getModuleForCategory(categoryCode: string): EquipmentModuleContract | undefined {
    const moduleCode = this.categoryIndex.get(categoryCode.toLowerCase());
    if (!moduleCode) return undefined;
    return this.modules.get(moduleCode);
  }

  /**
   * Lists lightweight summaries of all registered equipment modules.
   */
  listModules(): EquipmentModuleSummary[] {
    const list: EquipmentModuleSummary[] = [];
    for (const mod of this.modules.values()) {
      let totalCheckpoints = 0;
      for (const t of mod.inspectionTemplates) {
        totalCheckpoints += t.checkpoints.length;
      }

      list.push({
        moduleCode: mod.moduleCode,
        categoryCode: mod.categoryCode,
        name: mod.name,
        version: mod.version,
        description: mod.description,
        governingStandards: mod.governingStandards,
        icon: mod.icon,
        subsystemsCount: mod.physicalSubsystems.length,
        measurementPointsCount: mod.measurementPoints.length,
        inspectionCheckpointsCount: totalCheckpoints,
        maintenanceTasksCount: mod.maintenanceTaskTemplates.length,
        decisionModelCode: mod.decisionSupport.modelCode,
        decisionFrameworkType: mod.decisionSupport.frameworkType,
        decisionValidationStatus: mod.decisionSupport.validationStatus,
      });
    }
    return list;
  }

  /**
   * Validates cross-module compatibility.
   * STRICT CONSTRAINT: Throws an error if an unvalidated decision model is applied
   * across equipment categories (e.g. attempting to evaluate a Boiler ANP model on a Chiller).
   */
  assertDecisionModelCompatibility(moduleCode: string, requestedDecisionModelCode: string): void {
    const module = this.getModule(moduleCode);
    if (!module) {
      throw new Error(`Equipment module '${moduleCode}' not found.`);
    }

    const assignedModelCode = module.decisionSupport.modelCode;

    // Check if models match
    if (assignedModelCode !== requestedDecisionModelCode) {
      // If module does not explicitly permit cross-module reuse, reject with strict error
      if (!module.decisionSupport.crossModuleReusePermitted) {
        throw new CrossModuleDecisionModelError(
          `[Extensibility Safety Violation] Cannot apply decision model '${requestedDecisionModelCode}' to '${module.name}' (${moduleCode}). ` +
          `Equipment module '${moduleCode}' is bound to '${assignedModelCode}' (${module.decisionSupport.frameworkType}). ` +
          `Cross-equipment decision model reuse is strictly prohibited without independent peer-reviewed academic validation.`
        );
      }
    }
  }

  /**
   * Clears registry (primarily for test isolation)
   */
  clear(): void {
    this.modules.clear();
    this.categoryIndex.clear();
  }
}

export const equipmentModuleRegistry = new EquipmentModuleRegistry();
