import { Request, Response, NextFunction } from 'express';
import {
  maintenancePlanningService,
  CreateMaintenanceTaskTemplateDto,
  UpdateMaintenanceTaskTemplateDto,
  CreateMaintenanceTypeDto,
  CreateMaintenancePlanDto,
  UpdateMaintenancePlanDto,
  CreateMaintenancePlanTaskDto,
  AssignPlanToAssetDto,
  RescheduleAssetPlanDto,
  GenerateWorkOrderFromPlanOptions,
  BatchGenerateOptions,
  RecordCompletionDto,
} from './maintenance-planning.service';
import { ProposeWorkOrderFromAnpDto, ProposePlanAssignmentFromAnpDto } from './anp-maintenance.bridge';
import { getCurrentUserId } from '../../tenant/tenant.context';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param || '';
}

export class MaintenanceController {
  // ===========================================================================
  // 1. REUSABLE TASK TEMPLATES
  // ===========================================================================

  async createTaskTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateMaintenanceTaskTemplateDto = req.body;
      const created = await maintenancePlanningService.createTaskTemplate(dto);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async listTaskTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const assetCategoryId = req.query.assetCategoryId as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const templates = await maintenancePlanningService.listTaskTemplates(assetCategoryId, isActive);
      return res.status(200).json({ success: true, count: templates.length, data: templates });
    } catch (error) {
      next(error);
    }
  }

  async getTaskTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const template = await maintenancePlanningService.getTaskTemplate(id);
      return res.status(200).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const dto: UpdateMaintenanceTaskTemplateDto = req.body;
      const updated = await maintenancePlanningService.updateTaskTemplate(id, dto);
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async deleteTaskTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      await maintenancePlanningService.deleteTaskTemplate(id);
      return res.status(200).json({ success: true, message: 'Task template deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 2. MAINTENANCE TYPES
  // ===========================================================================

  async createMaintenanceType(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateMaintenanceTypeDto = req.body;
      const created = await maintenancePlanningService.createMaintenanceType(dto);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async listMaintenanceTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const types = await maintenancePlanningService.listMaintenanceTypes();
      return res.status(200).json({ success: true, count: types.length, data: types });
    } catch (error) {
      next(error);
    }
  }

  async getMaintenanceType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const type = await maintenancePlanningService.getMaintenanceType(id);
      return res.status(200).json({ success: true, data: type });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 3. PREVENTIVE MAINTENANCE PLANS
  // ===========================================================================

  async createMaintenancePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateMaintenancePlanDto = req.body;
      const created = await maintenancePlanningService.createMaintenancePlan(dto);
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async listMaintenancePlans(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        maintenanceTypeId: req.query.maintenanceTypeId as string | undefined,
        recurrenceType: req.query.recurrenceType as any,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      };
      const plans = await maintenancePlanningService.listMaintenancePlans(filters);
      return res.status(200).json({ success: true, count: plans.length, data: plans });
    } catch (error) {
      next(error);
    }
  }

  async getMaintenancePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const plan = await maintenancePlanningService.getMaintenancePlan(id);
      return res.status(200).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async updateMaintenancePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const dto: UpdateMaintenancePlanDto = req.body;
      const updated = await maintenancePlanningService.updateMaintenancePlan(id, dto);
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async deleteMaintenancePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      await maintenancePlanningService.deleteMaintenancePlan(id);
      return res.status(200).json({ success: true, message: 'Maintenance plan deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async addPlanTask(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = getParam(req.params.planId);
      const dto: CreateMaintenancePlanTaskDto = req.body;
      const task = await maintenancePlanningService.addPlanTask(planId, dto);
      return res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async removePlanTask(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = getParam(req.params.planId);
      const taskId = getParam(req.params.taskId);
      await maintenancePlanningService.removePlanTask(planId, taskId);
      return res.status(200).json({ success: true, message: 'Task removed from plan successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 4. ASSET-PLAN ASSIGNMENTS & SCHEDULES
  // ===========================================================================

  async assignPlanToAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: AssignPlanToAssetDto = req.body;
      const currentUserId = getCurrentUserId();
      const assignment = await maintenancePlanningService.assignPlanToAsset(dto, currentUserId);
      return res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async listAssetMaintenancePlans(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        assetId: req.query.assetId as string | undefined,
        siteId: req.query.siteId as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      };
      const assignments = await maintenancePlanningService.listAssetMaintenancePlans(filters);
      return res.status(200).json({ success: true, count: assignments.length, data: assignments });
    } catch (error) {
      next(error);
    }
  }

  async getAssetMaintenancePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const assignment = await maintenancePlanningService.getAssetMaintenancePlan(id);
      return res.status(200).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async rescheduleAssetPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const dto: RescheduleAssetPlanDto = req.body;
      dto.updatedByUserId = dto.updatedByUserId || getCurrentUserId();
      const updated = await maintenancePlanningService.rescheduleAssetPlan(id, dto);
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async toggleAssetPlanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const { isActive, reason } = req.body;
      const currentUserId = getCurrentUserId();
      const updated = await maintenancePlanningService.toggleAssetPlanStatus(
        id,
        Boolean(isActive),
        reason,
        currentUserId
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async getScheduleHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const history = await maintenancePlanningService.getScheduleHistory(id);
      return res.status(200).json({ success: true, count: history.length, data: history });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 5. MAINTENANCE DUE CALCULATIONS & OVERDUE TRACKING
  // ===========================================================================

  async calculateAssetPlanDueStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const refDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
      const result = await maintenancePlanningService.calculateAssetPlanDueStatus(id, refDate);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDueAndOverdueSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const siteId = req.query.siteId as string | undefined;
      const refDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
      const summary = await maintenancePlanningService.getDueAndOverdueSummary({
        siteId,
        referenceDate: refDate,
      });
      return res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 6. WORK ORDER GENERATION & COMPLETION
  // ===========================================================================

  async generateWorkOrderForAssetPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const options: GenerateWorkOrderFromPlanOptions = {
        forceGenerate: req.body.forceGenerate === true,
        scheduledStartAt: req.body.scheduledStartAt,
        assignedTo: req.body.assignedTo,
        status: req.body.status,
        currentUserId: getCurrentUserId(),
      };
      const workOrder = await maintenancePlanningService.generateWorkOrderForAssetPlan(id, options);
      return res.status(201).json({ success: true, data: workOrder });
    } catch (error) {
      next(error);
    }
  }

  async batchGenerateDueWorkOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const options: BatchGenerateOptions = {
        siteId: req.body.siteId,
        dryRun: req.body.dryRun === true,
        currentUserId: getCurrentUserId(),
      };
      const result = await maintenancePlanningService.batchGenerateDueWorkOrders(options);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async recordWorkOrderCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params.id);
      const dto: RecordCompletionDto = {
        completedAt: req.body.completedAt,
        meterReadingValue: req.body.meterReadingValue,
        notes: req.body.notes,
        updatedByUserId: getCurrentUserId(),
      };
      const updated = await maintenancePlanningService.recordWorkOrderCompletion(id, dto);
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 7. CONTROLLED ANP INTEGRATION BRIDGE
  // ===========================================================================

  async createWorkOrderFromAnpRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: ProposeWorkOrderFromAnpDto = req.body;
      const currentUserId = getCurrentUserId();
      const workOrder = await maintenancePlanningService.createWorkOrderFromAnpRecommendation(
        dto,
        currentUserId
      );
      return res.status(201).json({ success: true, data: workOrder });
    } catch (error) {
      next(error);
    }
  }

  async proposePlanAssignmentFromAnpRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: ProposePlanAssignmentFromAnpDto = req.body;
      const currentUserId = getCurrentUserId();
      const proposal = await maintenancePlanningService.proposePlanAssignmentFromAnpRecommendation(
        dto,
        currentUserId
      );
      return res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      next(error);
    }
  }
}

export const maintenanceController = new MaintenanceController();
