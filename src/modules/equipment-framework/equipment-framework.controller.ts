import { Request, Response } from 'express';
import { equipmentModuleRegistry, CrossModuleDecisionModelError } from './equipment-module.registry';

export class EquipmentFrameworkController {
  /**
   * Lists all registered equipment modules in the platform
   */
  listModules(_req: Request, res: Response): void {
    const modules = equipmentModuleRegistry.listModules();
    res.status(200).json({
      totalCount: modules.length,
      modules,
    });
  }

  /**
   * Retrieves the full equipment module contract definition by moduleCode
   */
  getModuleByCode(req: Request, res: Response): void {
    const moduleCode = String(req.params.moduleCode);
    const module = equipmentModuleRegistry.getModule(moduleCode);

    if (!module) {
      res.status(404).json({
        error: 'MODULE_NOT_FOUND',
        message: `Equipment module with code '${moduleCode}' is not registered.`,
      });
      return;
    }

    res.status(200).json({
      moduleCode: module.moduleCode,
      categoryCode: module.categoryCode,
      name: module.name,
      version: module.version,
      description: module.description,
      governingStandards: module.governingStandards,
      icon: module.icon,
      specificationsSchema: module.specificationsSchema,
      physicalSubsystems: module.physicalSubsystems,
      measurementPoints: module.measurementPoints,
      inspectionTemplates: module.inspectionTemplates,
      maintenanceTaskTemplates: module.maintenanceTaskTemplates,
      decisionSupport: module.decisionSupport,
      dashboardConfig: module.dashboardConfig,
      reportingConfig: module.reportingConfig,
    });
  }

  /**
   * Resolves the equipment module corresponding to a CMMS AssetCategory code
   */
  getModuleByCategory(req: Request, res: Response): void {
    const categoryCode = String(req.params.categoryCode);
    const module = equipmentModuleRegistry.getModuleForCategory(categoryCode);

    if (!module) {
      res.status(404).json({
        error: 'MODULE_FOR_CATEGORY_NOT_FOUND',
        message: `No specialized equipment module is registered for asset category '${categoryCode}'. Falling back to generic CMMS behavior.`,
      });
      return;
    }

    res.status(200).json({
      moduleCode: module.moduleCode,
      categoryCode: module.categoryCode,
      name: module.name,
      version: module.version,
      description: module.description,
      icon: module.icon,
    });
  }

  /**
   * Evaluates operational readings against the equipment module's thresholds
   */
  evaluateReadings(req: Request, res: Response): void {
    const moduleCode = String(req.params.moduleCode);
    const module = equipmentModuleRegistry.getModule(moduleCode);

    if (!module) {
      res.status(404).json({
        error: 'MODULE_NOT_FOUND',
        message: `Equipment module '${moduleCode}' is not registered.`,
      });
      return;
    }

    const readings = req.body?.readings || {};
    const anomalies = module.evaluateReadings(readings);
    const kpis = module.calculateKpis(readings);

    res.status(200).json({
      moduleCode: module.moduleCode,
      evaluatedAt: new Date().toISOString(),
      readingsCount: Object.keys(readings).length,
      anomaliesDetectedCount: anomalies.length,
      anomalies,
      calculatedKpis: kpis,
    });
  }

  /**
   * Checks whether a decision model is compatible with an equipment module.
   * STRICT CONSTRAINT: Enforces that Boiler ANP model cannot be applied to a Chiller.
   */
  verifyDecisionCompatibility(req: Request, res: Response): void {
    const moduleCode = String(req.params.moduleCode);
    const requestedModelCode = req.body?.decisionModelCode;

    if (!requestedModelCode) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: "Missing 'decisionModelCode' in request body.",
      });
      return;
    }

    try {
      equipmentModuleRegistry.assertDecisionModelCompatibility(moduleCode, requestedModelCode);
      const module = equipmentModuleRegistry.getModule(moduleCode);
      res.status(200).json({
        compatible: true,
        moduleCode,
        decisionModelCode: requestedModelCode,
        decisionFrameworkType: module?.decisionSupport.frameworkType,
        validationStatus: module?.decisionSupport.validationStatus,
        message: `Decision model '${requestedModelCode}' is compatible and officially bound to module '${moduleCode}'.`,
      });
    } catch (err: any) {
      if (err instanceof CrossModuleDecisionModelError) {
        res.status(422).json({
          compatible: false,
          error: err.code,
          message: err.message,
        });
      } else {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: err.message,
        });
      }
    }
  }
}

export const equipmentFrameworkController = new EquipmentFrameworkController();
