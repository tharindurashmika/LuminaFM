import { Router } from 'express';
import { operationsController } from './operations.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Enforce multi-tenant authentication & AsyncLocalStorage tenant context on all routes
router.use(authenticateTenant);

// =============================================================================
// 1. CHECKLIST TEMPLATES & ITEMS
// =============================================================================
router.post('/checklist-templates', (req, res, next) =>
  operationsController.createChecklistTemplate(req, res, next)
);
router.get('/checklist-templates', (req, res, next) =>
  operationsController.listChecklistTemplates(req, res, next)
);
router.get('/checklist-templates/:id', (req, res, next) =>
  operationsController.getChecklistTemplateById(req, res, next)
);
router.patch('/checklist-templates/:id', (req, res, next) =>
  operationsController.updateChecklistTemplate(req, res, next)
);
router.delete('/checklist-templates/:id', (req, res, next) =>
  operationsController.deleteChecklistTemplate(req, res, next)
);

router.post('/checklist-templates/:templateId/items', (req, res, next) =>
  operationsController.addChecklistItem(req, res, next)
);
router.get('/checklist-templates/:templateId/items', (req, res, next) =>
  operationsController.listChecklistItems(req, res, next)
);
router.post('/checklist-items', (req, res, next) =>
  operationsController.addChecklistItem(req, res, next)
);
router.get('/checklist-items', (req, res, next) =>
  operationsController.listChecklistItems(req, res, next)
);
router.patch('/checklist-items/:id', (req, res, next) =>
  operationsController.updateChecklistItem(req, res, next)
);
router.delete('/checklist-items/:id', (req, res, next) =>
  operationsController.deleteChecklistItem(req, res, next)
);

// =============================================================================
// 2. INSPECTIONS & INSPECTION RESPONSES
// =============================================================================
router.post('/inspections', (req, res, next) =>
  operationsController.createInspection(req, res, next)
);
router.get('/inspections', (req, res, next) =>
  operationsController.listInspections(req, res, next)
);
router.get('/inspections/:id', (req, res, next) =>
  operationsController.getInspectionById(req, res, next)
);
router.patch('/inspections/:id', (req, res, next) =>
  operationsController.updateInspection(req, res, next)
);
router.delete('/inspections/:id', (req, res, next) =>
  operationsController.deleteInspection(req, res, next)
);

router.post('/inspections/:inspectionId/responses', (req, res, next) =>
  operationsController.recordInspectionResponses(req, res, next)
);
router.get('/inspections/:inspectionId/responses', (req, res, next) =>
  operationsController.listInspectionResponses(req, res, next)
);
router.post('/inspection-responses', (req, res, next) =>
  operationsController.recordInspectionResponses(req, res, next)
);

// =============================================================================
// 3. UNITS, METER DEFINITIONS, ASSET METERS & METER READINGS
// =============================================================================
router.post('/units-of-measurement', (req, res, next) =>
  operationsController.createUnitOfMeasurement(req, res, next)
);
router.get('/units-of-measurement', (req, res, next) =>
  operationsController.listUnitsOfMeasurement(req, res, next)
);

router.post('/meter-definitions', (req, res, next) =>
  operationsController.createMeterDefinition(req, res, next)
);
router.get('/meter-definitions', (req, res, next) =>
  operationsController.listMeterDefinitions(req, res, next)
);

router.post('/asset-meters', (req, res, next) =>
  operationsController.createAssetMeter(req, res, next)
);
router.get('/asset-meters', (req, res, next) =>
  operationsController.listAssetMeters(req, res, next)
);
router.get('/assets/:assetId/meters', (req, res, next) =>
  operationsController.listAssetMeters(req, res, next)
);

router.post('/meter-readings', (req, res, next) =>
  operationsController.createMeterReading(req, res, next)
);
router.get('/meter-readings', (req, res, next) =>
  operationsController.listMeterReadings(req, res, next)
);
router.get('/assets/:assetId/meter-readings', (req, res, next) =>
  operationsController.listMeterReadings(req, res, next)
);

// =============================================================================
// 4. COMPOSITE DAILY LOGBOOK SUBMISSION
// =============================================================================
router.post('/operations/daily-log', (req, res, next) =>
  operationsController.submitDailyLog(req, res, next)
);

export default router;

