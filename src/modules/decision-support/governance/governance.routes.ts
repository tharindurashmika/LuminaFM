import { Router } from 'express';
import { modelGovernanceController } from './governance.controller';
import { authenticateTenant } from '../../../middleware/auth.middleware';

const router = Router();

// Multi-tenant authentication
router.use(authenticateTenant);

// Baseline Academic Dissertation Metadata
router.get('/baseline', (req, res, next) =>
  modelGovernanceController.getBaselineDissertationGovernance(req, res, next)
);

// Version Comparison & Deep Diff
router.get('/compare', (req, res, next) =>
  modelGovernanceController.compareModelVersions(req, res, next)
);

// Model Governance Metadata
router.get('/models/:id', (req, res, next) =>
  modelGovernanceController.getModelGovernance(req, res, next)
);

// Propose New Commercial Client Configuration
router.post('/models/propose', (req, res, next) =>
  modelGovernanceController.proposeModelConfiguration(req, res, next)
);

// Criterion Evidence & Expert Evaluations
router.post('/models/:id/criteria/:code/evidence', (req, res, next) =>
  modelGovernanceController.recordCriterionEvidence(req, res, next)
);
router.post('/models/:id/criteria/:code/expert-evaluation', (req, res, next) =>
  modelGovernanceController.recordExpertEvaluation(req, res, next)
);
router.post('/models/:id/criteria/:code/comments', (req, res, next) =>
  modelGovernanceController.addValidationComment(req, res, next)
);

// Approval & Activation
router.post('/models/:id/approve', (req, res, next) =>
  modelGovernanceController.approveModelProposal(req, res, next)
);
router.post('/models/:id/activate', (req, res, next) =>
  modelGovernanceController.activateModel(req, res, next)
);

export default router;
