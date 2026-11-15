import { Router } from 'express';
import { decisionSupportController } from './decision-support.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Enforce multi-tenancy authentication & AsyncLocalStorage tenant context
router.use(authenticateTenant);

// =============================================================================
// 1. ANP DECISION MODELS & VERSIONS
// =============================================================================
router.post('/decision-models', (req, res, next) =>
  decisionSupportController.createDecisionModel(req, res, next)
);
router.get('/decision-models', (req, res, next) =>
  decisionSupportController.listDecisionModels(req, res, next)
);
router.get('/decision-models/:id', (req, res, next) =>
  decisionSupportController.getDecisionModelById(req, res, next)
);
router.patch('/decision-models/:id', (req, res, next) =>
  decisionSupportController.updateDecisionModel(req, res, next)
);
router.post('/decision-models/:id/version', (req, res, next) =>
  decisionSupportController.createNewModelVersion(req, res, next)
);
router.post('/decision-models/:id/approve', (req, res, next) =>
  decisionSupportController.approveDecisionModel(req, res, next)
);
router.post('/decision-models/:id/activate', (req, res, next) =>
  decisionSupportController.activateDecisionModel(req, res, next)
);
router.post('/decision-models/dissertation/instantiate', (req, res, next) =>
  decisionSupportController.instantiateDissertationModel(req, res, next)
);

// Criteria CRUD
router.post('/decision-models/:modelId/criteria', (req, res, next) =>
  decisionSupportController.addDecisionCriterion(req, res, next)
);
router.post('/decision-criteria', (req, res, next) =>
  decisionSupportController.addDecisionCriterion(req, res, next)
);
router.patch('/decision-criteria/:id', (req, res, next) =>
  decisionSupportController.updateDecisionCriterion(req, res, next)
);

// Alternatives CRUD
router.post('/decision-models/:modelId/alternatives', (req, res, next) =>
  decisionSupportController.addDecisionAlternative(req, res, next)
);
router.post('/decision-alternatives', (req, res, next) =>
  decisionSupportController.addDecisionAlternative(req, res, next)
);

// =============================================================================
// 2. PAIRWISE COMPARISONS & NETWORK EDGES
// =============================================================================
router.post('/decision-models/:modelId/pairwise', (req, res, next) =>
  decisionSupportController.recordPairwiseComparison(req, res, next)
);
router.get('/decision-models/:modelId/pairwise/:clusterCode', (req, res, next) =>
  decisionSupportController.getPairwiseComparisonMatrix(req, res, next)
);
router.post('/decision-models/:modelId/edges', (req, res, next) =>
  decisionSupportController.addNetworkEdge(req, res, next)
);

// =============================================================================
// 3. ANP DECISION RUNS, DIRECT EVALUATION, REPRODUCIBILITY & NOTIFICATIONS
// =============================================================================
router.post('/decision-support/evaluate', (req, res, next) =>
  decisionSupportController.evaluateReadings(req, res, next)
);
router.get('/decision-runs', (req, res, next) =>
  decisionSupportController.listDecisionRuns(req, res, next)
);
router.get('/decision-runs/:id/reproduce', (req, res, next) =>
  decisionSupportController.reproduceDecisionRun(req, res, next)
);

router.get('/notifications', (req, res, next) =>
  decisionSupportController.listNotifications(req, res, next)
);
router.patch('/notifications/:id/read', (req, res, next) =>
  decisionSupportController.markNotificationRead(req, res, next)
);

export default router;
