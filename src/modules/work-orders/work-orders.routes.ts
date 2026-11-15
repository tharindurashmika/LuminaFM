import { Router } from 'express';
import { workOrdersController } from './work-orders.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Enforce multi-tenancy middleware across all work management routes
router.use(authenticateTenant);

// --- MAINTENANCE TYPES ---
router.get('/maintenance-types', (req, res, next) =>
  workOrdersController.listMaintenanceTypes(req, res, next)
);
router.post('/maintenance-types', (req, res, next) =>
  workOrdersController.createMaintenanceType(req, res, next)
);

// --- WORK ORDERS (work_orders) ---
router.get('/work-orders', (req, res, next) =>
  workOrdersController.listWorkOrders(req, res, next)
);
router.post('/work-orders', (req, res, next) =>
  workOrdersController.createWorkOrder(req, res, next)
);
router.get('/work-orders/:id', (req, res, next) =>
  workOrdersController.getWorkOrderById(req, res, next)
);
router.patch('/work-orders/:id', (req, res, next) =>
  workOrdersController.updateWorkOrder(req, res, next)
);

// --- STATE MACHINE TRANSITIONS & STATUS HISTORY (work_order_status_history) ---
router.post('/work-orders/:id/status', (req, res, next) =>
  workOrdersController.transitionStatus(req, res, next)
);
router.patch('/work-orders/:id/status', (req, res, next) =>
  workOrdersController.transitionStatus(req, res, next)
);
router.get('/work-orders/:id/status-history', (req, res, next) =>
  workOrdersController.getStatusHistory(req, res, next)
);

// --- EXPLICIT LIFECYCLE TRANSITION ACTIONS ---
router.post('/work-orders/:id/approve', (req, res, next) =>
  workOrdersController.approveWorkOrder(req, res, next)
);
router.post('/work-orders/:id/assign', (req, res, next) =>
  workOrdersController.assignWorkOrder(req, res, next)
);
router.post('/work-orders/:id/start', (req, res, next) =>
  workOrdersController.startWorkOrder(req, res, next)
);
router.post('/work-orders/:id/hold', (req, res, next) =>
  workOrdersController.holdWorkOrder(req, res, next)
);
router.post('/work-orders/:id/resume', (req, res, next) =>
  workOrdersController.resumeWorkOrder(req, res, next)
);
router.post('/work-orders/:id/complete', (req, res, next) =>
  workOrdersController.completeWorkOrder(req, res, next)
);
router.post('/work-orders/:id/close', (req, res, next) =>
  workOrdersController.closeWorkOrder(req, res, next)
);
router.post('/work-orders/:id/cancel', (req, res, next) =>
  workOrdersController.cancelWorkOrder(req, res, next)
);

// --- ORIGINATING SOURCES ---
router.post('/work-orders/from-fault', (req, res, next) =>
  workOrdersController.createFromFaultReport(req, res, next)
);
router.post('/work-orders/from-inspection', (req, res, next) =>
  workOrdersController.createFromInspection(req, res, next)
);
router.post('/work-orders/from-anp', (req, res, next) =>
  workOrdersController.createFromAnpRecommendation(req, res, next)
);

// --- FINANCIALS & COSTS ---
router.get('/work-orders/:id/costs', (req, res, next) =>
  workOrdersController.getWorkOrderCosts(req, res, next)
);

// --- ATTACHMENTS ---
router.get('/work-orders/:id/attachments', (req, res, next) =>
  workOrdersController.listAttachments(req, res, next)
);
router.post('/work-orders/:id/attachments', (req, res, next) =>
  workOrdersController.linkAttachment(req, res, next)
);

// --- WORK ORDER TASKS (work_order_tasks) ---
router.get('/work-orders/:id/tasks', (req, res, next) =>
  workOrdersController.listTasks(req, res, next)
);
router.post('/work-orders/:id/tasks', (req, res, next) =>
  workOrdersController.addTask(req, res, next)
);
router.patch('/work-orders/:id/tasks/:taskId', (req, res, next) =>
  workOrdersController.updateTask(req, res, next)
);
router.delete('/work-orders/:id/tasks/:taskId', (req, res, next) =>
  workOrdersController.deleteTask(req, res, next)
);

// --- WORK ORDER LABOR (work_order_labor) ---
router.get('/work-orders/:id/labor', (req, res, next) =>
  workOrdersController.listLabor(req, res, next)
);
router.post('/work-orders/:id/labor', (req, res, next) =>
  workOrdersController.addLabor(req, res, next)
);
router.patch('/work-orders/:id/labor/:laborId', (req, res, next) =>
  workOrdersController.updateLabor(req, res, next)
);
router.delete('/work-orders/:id/labor/:laborId', (req, res, next) =>
  workOrdersController.deleteLabor(req, res, next)
);

// --- WORK ORDER PARTS (work_order_parts) ---
router.get('/work-orders/:id/parts', (req, res, next) =>
  workOrdersController.listParts(req, res, next)
);
router.post('/work-orders/:id/parts', (req, res, next) =>
  workOrdersController.addPart(req, res, next)
);
router.patch('/work-orders/:id/parts/:partId', (req, res, next) =>
  workOrdersController.updatePart(req, res, next)
);
router.delete('/work-orders/:id/parts/:partId', (req, res, next) =>
  workOrdersController.deletePart(req, res, next)
);

export default router;

