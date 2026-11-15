import { Router } from 'express';
import { equipmentFrameworkController } from './equipment-framework.controller';

export const equipmentFrameworkRouter = Router();

// List all registered equipment modules
equipmentFrameworkRouter.get('/api/equipment-modules', (req, res) =>
  equipmentFrameworkController.listModules(req, res)
);

// Get detailed module contract definition by code
equipmentFrameworkRouter.get('/api/equipment-modules/:moduleCode', (req, res) =>
  equipmentFrameworkController.getModuleByCode(req, res)
);

// Resolve equipment module by asset category code
equipmentFrameworkRouter.get('/api/equipment-modules/by-category/:categoryCode', (req, res) =>
  equipmentFrameworkController.getModuleByCategory(req, res)
);

// Evaluate telemetry readings against module thresholds
equipmentFrameworkRouter.post('/api/equipment-modules/:moduleCode/evaluate-readings', (req, res) =>
  equipmentFrameworkController.evaluateReadings(req, res)
);

// Verify decision support model compatibility (strictly blocks cross-module reuse)
equipmentFrameworkRouter.post('/api/equipment-modules/:moduleCode/verify-decision-compatibility', (req, res) =>
  equipmentFrameworkController.verifyDecisionCompatibility(req, res)
);

export default equipmentFrameworkRouter;
