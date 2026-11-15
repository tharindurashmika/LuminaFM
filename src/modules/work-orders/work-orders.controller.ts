import { Request, Response, NextFunction } from 'express';
import { workOrdersService } from './work-orders.service';
import { PriorityLevel, WorkOrderStatus } from '@prisma/client';

export class WorkOrdersController {
  // --- WORK ORDERS ---

  async createWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { siteId, site_id, maintenanceTypeId, maintenance_type_id, title } = req.body;
      const resolvedSiteId = siteId || site_id;
      const resolvedMaintenanceTypeId = maintenanceTypeId || maintenance_type_id;

      if (!resolvedSiteId || !resolvedMaintenanceTypeId || !title) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'siteId, maintenanceTypeId, and title are required to create a work order.',
          },
        });
        return;
      }

      const created = await workOrdersService.createWorkOrder(
        {
          siteId: resolvedSiteId,
          maintenanceTypeId: resolvedMaintenanceTypeId,
          assetId: req.body.assetId ?? req.body.asset_id,
          locationId: req.body.locationId ?? req.body.location_id,
          maintenancePlanId: req.body.maintenancePlanId ?? req.body.maintenance_plan_id,
          title,
          description: req.body.description,
          priority: req.body.priority,
          requestedBy: req.body.requestedBy ?? req.body.requested_by,
          assignedTo: req.body.assignedTo ?? req.body.assigned_to,
          approvedBy: req.body.approvedBy ?? req.body.approved_by,
          scheduledStartAt: req.body.scheduledStartAt ?? req.body.scheduled_start_at,
          scheduledEndAt: req.body.scheduledEndAt ?? req.body.scheduled_end_at,
          estimatedCost: req.body.estimatedCost ?? req.body.estimated_cost,
          tasks: req.body.tasks,
        },
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Work order created successfully.',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  async listWorkOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { siteId, assetId, status, priority, assignedTo } = req.query;
      const workOrders = await workOrdersService.listWorkOrders({
        siteId: siteId as string | undefined,
        assetId: assetId as string | undefined,
        status: status as WorkOrderStatus | undefined,
        priority: priority as PriorityLevel | undefined,
        assignedTo: assignedTo as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: workOrders,
      });
    } catch (err) {
      next(err);
    }
  }

  async getWorkOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrder = await workOrdersService.getWorkOrderById(String(req.params.id));
      res.status(200).json({
        success: true,
        data: workOrder,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);

      // If caller attempts to transition status via PATCH /api/work-orders/:id,
      // route through the strict state machine with transactional status history logging
      if (req.body.status !== undefined) {
        const transitioned = await workOrdersService.transitionWorkOrderStatus(
          workOrderId,
          {
            status: req.body.status,
            comment: req.body.comment,
            completionNotes: req.body.completionNotes ?? req.body.completion_notes,
            actualCost: req.body.actualCost ?? req.body.actual_cost,
          },
          req.user?.userId
        );

        res.status(200).json({
          success: true,
          message: `Work order transitioned to '${req.body.status}'.`,
          data: transitioned,
        });
        return;
      }

      const updated = await workOrdersService.updateWorkOrder(workOrderId, {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        assetId: req.body.assetId ?? req.body.asset_id,
        locationId: req.body.locationId ?? req.body.location_id,
        assignedTo: req.body.assignedTo ?? req.body.assigned_to,
        approvedBy: req.body.approvedBy ?? req.body.approved_by,
        scheduledStartAt: req.body.scheduledStartAt ?? req.body.scheduled_start_at,
        scheduledEndAt: req.body.scheduledEndAt ?? req.body.scheduled_end_at,
        estimatedCost: req.body.estimatedCost ?? req.body.estimated_cost,
        actualCost: req.body.actualCost ?? req.body.actual_cost,
        completionNotes: req.body.completionNotes ?? req.body.completion_notes,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- STATE MACHINE TRANSITIONS & STATUS HISTORY ---

  async transitionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const { status, comment, completionNotes, completion_notes, actualCost, actual_cost } =
        req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Target status is required for state transition.',
          },
        });
        return;
      }

      const updated = await workOrdersService.transitionWorkOrderStatus(
        workOrderId,
        {
          status,
          comment,
          completionNotes: completionNotes ?? completion_notes,
          actualCost: actualCost ?? actual_cost,
        },
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: `Work order status transitioned to '${status}' and logged in history.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatusHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await workOrdersService.getWorkOrderStatusHistory(String(req.params.id));
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- WORK ORDER TASKS ---

  async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await workOrdersService.listWorkOrderTasks(String(req.params.id));
      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (err) {
      next(err);
    }
  }

  async addTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, instructions, sequenceNo, sequence_no, taskTemplateId, task_template_id } =
        req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Task title is required.',
          },
        });
        return;
      }

      const task = await workOrdersService.addWorkOrderTask(String(req.params.id), {
        title,
        instructions,
        sequenceNo: sequenceNo ?? sequence_no,
        taskTemplateId: taskTemplateId ?? task_template_id,
      });

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await workOrdersService.updateWorkOrderTask(
        String(req.params.id),
        String(req.params.taskId),
        {
          title: req.body.title,
          instructions: req.body.instructions,
          sequenceNo: req.body.sequenceNo ?? req.body.sequence_no,
          status: req.body.status,
          completionNotes: req.body.completionNotes ?? req.body.completion_notes,
        },
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.deleteWorkOrderTask(
        String(req.params.id),
        String(req.params.taskId)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // --- WORK ORDER LABOR ---

  async listLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labor = await workOrdersService.listWorkOrderLabor(String(req.params.id));
      res.status(200).json({
        success: true,
        data: labor,
      });
    } catch (err) {
      next(err);
    }
  }

  async addLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hoursWorked = req.body.hoursWorked ?? req.body.hours_worked;

      if (hoursWorked === undefined || hoursWorked === null) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'hoursWorked is required to record labor.',
          },
        });
        return;
      }

      const labor = await workOrdersService.addWorkOrderLabor(String(req.params.id), {
        userId: req.body.userId ?? req.body.user_id,
        technicianName: req.body.technicianName ?? req.body.technician_name,
        hoursWorked: Number(hoursWorked),
        hourlyCost:
          req.body.hourlyCost !== undefined
            ? Number(req.body.hourlyCost)
            : req.body.hourly_cost !== undefined
            ? Number(req.body.hourly_cost)
            : undefined,
        notes: req.body.notes,
      });

      res.status(201).json({
        success: true,
        data: labor,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await workOrdersService.updateWorkOrderLabor(
        String(req.params.id),
        String(req.params.laborId),
        {
          userId: req.body.userId ?? req.body.user_id,
          technicianName: req.body.technicianName ?? req.body.technician_name,
          hoursWorked: req.body.hoursWorked ?? req.body.hours_worked,
          hourlyCost: req.body.hourlyCost ?? req.body.hourly_cost,
          notes: req.body.notes,
        }
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.deleteWorkOrderLabor(
        String(req.params.id),
        String(req.params.laborId)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // --- WORK ORDER PARTS ---

  async listParts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parts = await workOrdersService.listWorkOrderParts(String(req.params.id));
      res.status(200).json({
        success: true,
        data: parts,
      });
    } catch (err) {
      next(err);
    }
  }

  async addPart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { description, quantity } = req.body;

      if (!description || quantity === undefined || quantity === null) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'description and quantity are required to record part consumption.',
          },
        });
        return;
      }

      const part = await workOrdersService.addWorkOrderPart(String(req.params.id), {
        partCode: req.body.partCode ?? req.body.part_code,
        description,
        quantity: Number(quantity),
        unitCost:
          req.body.unitCost !== undefined
            ? Number(req.body.unitCost)
            : req.body.unit_cost !== undefined
            ? Number(req.body.unit_cost)
            : undefined,
      });

      res.status(201).json({
        success: true,
        data: part,
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await workOrdersService.updateWorkOrderPart(
        String(req.params.id),
        String(req.params.partId),
        {
          partCode: req.body.partCode ?? req.body.part_code,
          description: req.body.description,
          quantity: req.body.quantity,
          unitCost: req.body.unitCost ?? req.body.unit_cost,
        }
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workOrdersService.deleteWorkOrderPart(
        String(req.params.id),
        String(req.params.partId)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // --- MAINTENANCE TYPES ---

  async listMaintenanceTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const types = await workOrdersService.listMaintenanceTypes();
      res.status(200).json({
        success: true,
        data: types,
      });
    } catch (err) {
      next(err);
    }
  }

  async createMaintenanceType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, name, description } = req.body;

      if (!code || !name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code and name are required to create a maintenance type.',
          },
        });
        return;
      }

      const created = await workOrdersService.createMaintenanceType({ code, name, description });
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // LIFECYCLE TRANSITIONS & ACCOUNTABILITY
  // ===========================================================================

  async approveWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const approved = await workOrdersService.approveWorkOrder(
        workOrderId,
        {
          approvedByUserId: req.body.approvedByUserId ?? req.user?.userId,
          comment: req.body.comment,
        },
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order approved successfully.',
        data: approved,
      });
    } catch (err) {
      next(err);
    }
  }

  async assignWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const assignedToUserId = req.body.assignedToUserId ?? req.body.assignedTo;
      if (!assignedToUserId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assignedToUserId is required.' },
        });
        return;
      }
      const assigned = await workOrdersService.assignWorkOrder(
        workOrderId,
        {
          assignedToUserId,
          comment: req.body.comment,
        },
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order assigned successfully.',
        data: assigned,
      });
    } catch (err) {
      next(err);
    }
  }

  async startWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const started = await workOrdersService.startWorkOrder(
        workOrderId,
        req.body.comment,
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order started.',
        data: started,
      });
    } catch (err) {
      next(err);
    }
  }

  async holdWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const reason = req.body.reason || req.body.comment;
      if (!reason) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'reason is required to place work order on hold.' },
        });
        return;
      }
      const held = await workOrdersService.holdWorkOrder(workOrderId, reason, req.user?.userId);
      res.status(200).json({
        success: true,
        message: 'Work order placed on hold.',
        data: held,
      });
    } catch (err) {
      next(err);
    }
  }

  async resumeWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const resumed = await workOrdersService.resumeWorkOrder(
        workOrderId,
        req.body.comment,
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order execution resumed.',
        data: resumed,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const completed = await workOrdersService.completeWorkOrder(
        workOrderId,
        {
          completionNotes: req.body.completionNotes ?? req.body.completion_notes,
          actualCost: req.body.actualCost ?? req.body.actual_cost,
          comment: req.body.comment,
          skipIncompleteTaskCheck: req.body.skipIncompleteTaskCheck === true,
        },
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order completed and costs rolled up.',
        data: completed,
      });
    } catch (err) {
      next(err);
    }
  }

  async closeWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const closed = await workOrdersService.closeWorkOrder(
        workOrderId,
        req.body.comment,
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order officially closed.',
        data: closed,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const reason = req.body.reason || req.body.comment || 'Cancelled by user';
      const cancelled = await workOrdersService.cancelWorkOrder(
        workOrderId,
        reason,
        req.user?.userId
      );
      res.status(200).json({
        success: true,
        message: 'Work order cancelled.',
        data: cancelled,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // FINANCIALS & COST BREAKDOWN
  // ===========================================================================

  async getWorkOrderCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const costs = await workOrdersService.calculateWorkOrderCosts(workOrderId);
      res.status(200).json({
        success: true,
        data: costs,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // ORIGINATING SOURCES
  // ===========================================================================

  async createFromFaultReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { faultLogId, fault_log_id, priorityOverride, scheduledStartAt, assignedTo, notes } =
        req.body;
      const targetFaultId = faultLogId || fault_log_id;
      if (!targetFaultId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'faultLogId is required.' },
        });
        return;
      }
      const wo = await workOrdersService.createFromFaultReport(
        {
          faultLogId: targetFaultId,
          priorityOverride,
          scheduledStartAt,
          assignedTo,
          notes,
        },
        req.user?.userId
      );
      res.status(201).json({
        success: true,
        message: 'Work order created from operator fault report.',
        data: wo,
      });
    } catch (err) {
      next(err);
    }
  }

  async createFromInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inspectionId, inspection_id, priorityOverride, scheduledStartAt, assignedTo, notes } =
        req.body;
      const targetInspectionId = inspectionId || inspection_id;
      if (!targetInspectionId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'inspectionId is required.' },
        });
        return;
      }
      const wo = await workOrdersService.createFromInspection(
        {
          inspectionId: targetInspectionId,
          priorityOverride,
          scheduledStartAt,
          assignedTo,
          notes,
        },
        req.user?.userId
      );
      res.status(201).json({
        success: true,
        message: 'Work order created from inspection deficiency.',
        data: wo,
      });
    } catch (err) {
      next(err);
    }
  }

  async createFromAnpRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        decisionRunId,
        decision_run_id,
        supervisorApproval,
        supervisor_approval,
        approvalNotes,
        approval_notes,
        priorityOverride,
        assignedTo,
        scheduledStartAt,
      } = req.body;

      const targetRunId = decisionRunId || decision_run_id;
      if (!targetRunId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'decisionRunId is required.' },
        });
        return;
      }

      const wo = await workOrdersService.createFromAnpRecommendation(
        {
          decisionRunId: targetRunId,
          supervisorApproval: supervisorApproval ?? supervisor_approval,
          approvalNotes: approvalNotes ?? approval_notes,
          priorityOverride,
          assignedTo,
          scheduledStartAt,
        },
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Work order instantiated from approved ANP recommendation.',
        data: wo,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // ATTACHMENTS
  // ===========================================================================

  async listAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const attachments = await workOrdersService.listWorkOrderAttachments(workOrderId);
      res.status(200).json({
        success: true,
        data: attachments,
      });
    } catch (err) {
      next(err);
    }
  }

  async linkAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrderId = String(req.params.id);
      const { attachmentId, attachment_id } = req.body;
      const targetAttachmentId = attachmentId || attachment_id;
      if (!targetAttachmentId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'attachmentId is required.' },
        });
        return;
      }
      const linked = await workOrdersService.linkAttachmentToWorkOrder(
        workOrderId,
        targetAttachmentId
      );
      res.status(201).json({
        success: true,
        message: 'Attachment linked to work order successfully.',
        data: linked,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const workOrdersController = new WorkOrdersController();

