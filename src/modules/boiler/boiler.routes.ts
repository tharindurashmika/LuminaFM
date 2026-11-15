/**
 * Specialized Boiler Maintenance REST API Routes
 */

import { Router } from 'express';
import { boilerController } from './boiler.controller';
import { boilerLogbookController } from './boiler-logbook.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Enforce tenant authentication across all boiler routes
router.use(authenticateTenant);

// --- COMPREHENSIVE DAILY LOGBOOK & INSPECTION WORKFLOW ---
router.get('/boiler-logbooks/boilers', (req, res, next) =>
  boilerLogbookController.listBoilers(req, res, next)
);
router.post('/boiler-logbooks', (req, res, next) =>
  boilerLogbookController.saveLogbook(req, res, next)
);
router.get('/boiler-logbooks', (req, res, next) =>
  boilerLogbookController.listLogbooks(req, res, next)
);
router.get('/boiler-logbooks/:id', (req, res, next) =>
  boilerLogbookController.getLogbookById(req, res, next)
);
router.post('/boiler-logbooks/:id/submit', (req, res, next) =>
  boilerLogbookController.submitDraft(req, res, next)
);
router.post('/boiler-logbooks/:id/amendments', (req, res, next) =>
  boilerLogbookController.recordAmendment(req, res, next)
);
router.post('/boiler-logbooks/:id/attachments', (req, res, next) =>
  boilerLogbookController.uploadAttachment(req, res, next)
);

// --- EMPIRICAL RESEARCH CATALOG & SUBSYSTEMS ---
router.get('/boiler/catalog/benchmarks', (req, res, next) =>
  boilerController.getCatalog(req, res, next)
);

// --- CONFIGURABLE BOILER PROFILE ---
router.post('/boiler/:assetId/profile', (req, res, next) =>
  boilerController.createOrUpdateProfile(req, res, next)
);
router.get('/boiler/:assetId/profile', (req, res, next) =>
  boilerController.getProfile(req, res, next)
);

// --- DAILY OPERATING LOGS & 2-HOURLY SHIFT READINGS (MANUAL DATA ENTRY) ---
router.post('/boiler/:assetId/shift-logs', (req, res, next) =>
  boilerController.submitShiftLog(req, res, next)
);
router.get('/boiler/:assetId/shift-logs', (req, res, next) =>
  boilerController.getDailyLogs(req, res, next)
);

// --- VISUAL & ACOUSTIC SHIFT WALKTHROUGH INSPECTION ---
router.post('/boiler/:assetId/walkthrough', (req, res, next) =>
  boilerController.submitWalkthrough(req, res, next)
);

// --- OPERATIONAL OBSERVATIONS & NOTES ---
router.post('/boiler/:assetId/observations', (req, res, next) =>
  boilerController.logObservation(req, res, next)
);
router.get('/boiler/:assetId/observations', (req, res, next) =>
  boilerController.listObservations(req, res, next)
);

// --- FAULT REPORTING & WORK ORDER DISPATCH ---
router.post('/boiler/:assetId/faults', (req, res, next) =>
  boilerController.reportFault(req, res, next)
);

// --- HISTORICAL MAINTENANCE RECORDS & LIFECYCLE SUMMARY ---
router.get('/boiler/:assetId/history', (req, res, next) =>
  boilerController.getMaintenanceHistory(req, res, next)
);

// --- SUPPORTING PHOTOGRAPHS & EVIDENCE ATTACHMENTS ---
router.post('/boiler/:assetId/attachments', (req, res, next) =>
  boilerController.attachEvidence(req, res, next)
);
router.get('/boiler/:assetId/attachments', (req, res, next) =>
  boilerController.listAttachments(req, res, next)
);

export default router;
