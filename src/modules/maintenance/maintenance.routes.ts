import { Router } from 'express';
import { maintenanceController } from './maintenance.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Enforce tenant authentication & AsyncLocalStorage context across all maintenance routes
router.use(authenticateTenant);

// =============================================================================
// 1. REUSABLE TASK TEMPLATES
// =============================================================================
router.post('/maintenance/task-templates', (req, res, next) =>
  maintenanceController.createTaskTemplate(req, res, next)
);
router.get('/maintenance/task-templates', (req, res, next) =>
  maintenanceController.listTaskTemplates(req, res, next)
);
router.get('/maintenance/task-templates/:id', (req, res, next) =>
  maintenanceController.getTaskTemplate(req, res, next)
);
router.patch('/maintenance/task-templates/:id', (req, res, next) =>
  maintenanceController.updateTaskTemplate(req, res, next)
);
router.delete('/maintenance/task-templates/:id', (req, res, next) =>
  maintenanceController.deleteTaskTemplate(req, res, next)
);

// =============================================================================
// 2. MAINTENANCE TYPES
// =============================================================================
router.post('/maintenance/types', (req, res, next) =>
  maintenanceController.createMaintenanceType(req, res, next)
);
router.get('/maintenance/types', (req, res, next) =>
  maintenanceController.listMaintenanceTypes(req, res, next)
);
router.get('/maintenance/types/:id', (req, res, next) =>
  maintenanceController.getMaintenanceType(req, res, next)
);

// =============================================================================
// 3. PREVENTIVE MAINTENANCE PLANS
// =============================================================================
router.post('/maintenance/plans', (req, res, next) =>
  maintenanceController.createMaintenancePlan(req, res, next)
);
router.get('/maintenance/plans', (req, res, next) =>
  maintenanceController.listMaintenancePlans(req, res, next)
);
router.get('/maintenance/plans/:id', (req, res, next) =>
  maintenanceController.getMaintenancePlan(req, res, next)
);
router.patch('/maintenance/plans/:id', (req, res, next) =>
  maintenanceController.updateMaintenancePlan(req, res, next)
);
router.delete('/maintenance/plans/:id', (req, res, next) =>
  maintenanceController.deleteMaintenancePlan(req, res, next)
);

router.post('/maintenance/plans/:planId/tasks', (req, res, next) =>
  maintenanceController.addPlanTask(req, res, next)
);
router.delete('/maintenance/plans/:planId/tasks/:taskId', (req, res, next) =>
  maintenanceController.removePlanTask(req, res, next)
);

// =============================================================================
// 4. ASSET-PLAN ASSIGNMENTS & SCHEDULES
// =============================================================================
router.post('/maintenance/asset-plans', (req, res, next) =>
  maintenanceController.assignPlanToAsset(req, res, next)
);
router.get('/maintenance/asset-plans', (req, res, next) =>
  maintenanceController.listAssetMaintenancePlans(req, res, next)
);
router.get('/maintenance/asset-plans/:id', (req, res, next) =>
  maintenanceController.getAssetMaintenancePlan(req, res, next)
);
router.post('/maintenance/asset-plans/:id/reschedule', (req, res, next) =>
  maintenanceController.rescheduleAssetPlan(req, res, next)
);
router.patch('/maintenance/asset-plans/:id/status', (req, res, next) =>
  maintenanceController.toggleAssetPlanStatus(req, res, next)
);
router.get('/maintenance/asset-plans/:id/history', (req, res, next) =>
  maintenanceController.getScheduleHistory(req, res, next)
);

// =============================================================================
// 5. MAINTENANCE DUE CALCULATIONS & OVERDUE TRACKING
// =============================================================================
router.get('/maintenance/due-summary', (req, res, next) =>
  maintenanceController.getDueAndOverdueSummary(req, res, next)
);
router.get('/maintenance/asset-plans/:id/due-status', (req, res, next) =>
  maintenanceController.calculateAssetPlanDueStatus(req, res, next)
);

// =============================================================================
// 6. WORK ORDER GENERATION & COMPLETION
// =============================================================================
router.post('/maintenance/asset-plans/:id/generate-work-order', (req, res, next) =>
  maintenanceController.generateWorkOrderForAssetPlan(req, res, next)
);
router.post('/maintenance/batch-generate-work-orders', (req, res, next) =>
  maintenanceController.batchGenerateDueWorkOrders(req, res, next)
);
router.post('/maintenance/asset-plans/:id/complete', (req, res, next) =>
  maintenanceController.recordWorkOrderCompletion(req, res, next)
);

// =============================================================================
// 7. CONTROLLED ANP INTEGRATION BRIDGE
// =============================================================================
router.post('/maintenance/anp/create-work-order', (req, res, next) =>
  maintenanceController.createWorkOrderFromAnpRecommendation(req, res, next)
);
router.post('/maintenance/anp/propose-plan', (req, res, next) =>
  maintenanceController.proposePlanAssignmentFromAnpRecommendation(req, res, next)
);

export default router;
