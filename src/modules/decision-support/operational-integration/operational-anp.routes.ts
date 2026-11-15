import { Router } from 'express';
import { operationalAnpController } from './operational-anp.controller';
import { authenticateTenant } from '../../../middleware/auth.middleware';

const router = Router();

// Multi-tenant authentication
router.use(authenticateTenant);

// 1. Process operational daily logbook readings
router.post('/process-log', (req, res, next) =>
  operationalAnpController.processDailyLog(req, res, next)
);

// 2. Query operational decision runs with full recommendations & attribution
router.get('/runs/:id', (req, res, next) =>
  operationalAnpController.getOperationalDecisionRun(req, res, next)
);

// 3. Replay decision run from stored snapshot
router.get('/runs/:id/replay', (req, res, next) =>
  operationalAnpController.replayDecisionRun(req, res, next)
);

// 4. Authorized engineer review & approval of proposed recommendation
router.post('/runs/:id/recommendations/:recIndex/review', (req, res, next) =>
  operationalAnpController.reviewRecommendation(req, res, next)
);

// 5. Query active independent safety escalation alerts
router.get('/safety-alerts', (req, res, next) =>
  operationalAnpController.getSafetyAlerts(req, res, next)
);

export default router;
