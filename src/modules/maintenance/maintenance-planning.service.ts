import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import {
  PriorityLevel,
  RecurrenceType,
  WorkOrderStatus,
  Prisma,
} from '@prisma/client';
import { workOrdersService } from '../work-orders/work-orders.service';
import { ForeignKeyViolationError } from '../assets/hierarchy.validator';
import {
  MaintenancePlanNotFoundError,
  TaskTemplateNotFoundError,
  AssetPlanNotFoundError,
  MaintenanceTypeNotFoundError,
  DuplicateWorkOrderError,
  InvalidScheduleIntervalError,
} from './maintenance.errors';
import {
  addIntervalToDate,
  calculateNextCalendarDueDate,
  calculateMeterDueStatus,
  evaluateScheduleDueStatus,
  DueEvaluationResult,
} from './schedule-calculator';
import {
  anpMaintenanceBridge,
  ProposeWorkOrderFromAnpDto,
  ProposePlanAssignmentFromAnpDto,
} from './anp-maintenance.bridge';

// =============================================================================
// DTO Interfaces
// =============================================================================

export interface CreateMaintenanceTaskTemplateDto {
  code: string;
  title: string;
  description?: string | null;
  assetCategoryId?: string | null;
  estimatedDurationMinutes?: number | null;
  safetyInstructions?: string | null;
  requiredSkills?: string[];
  isActive?: boolean;
}

export interface UpdateMaintenanceTaskTemplateDto {
  title?: string;
  description?: string | null;
  assetCategoryId?: string | null;
  estimatedDurationMinutes?: number | null;
  safetyInstructions?: string | null;
  requiredSkills?: string[];
  isActive?: boolean;
}

export interface CreateMaintenanceTypeDto {
  code: string;
  name: string;
  description?: string | null;
}

export interface CreateMaintenancePlanTaskDto {
  taskTemplateId: string;
  sequenceNo?: number;
  isMandatory?: boolean;
}

export interface CreateMaintenancePlanDto {
  code: string;
  name: string;
  description?: string | null;
  maintenanceTypeId: string;
  recurrenceType: RecurrenceType;
  intervalValue?: number | null;
  intervalUnit?: string | null;
  meterDefinitionId?: string | null;
  leadTimeDays?: number;
  priority?: PriorityLevel;
  isActive?: boolean;
  tasks?: CreateMaintenancePlanTaskDto[];
}

export interface UpdateMaintenancePlanDto {
  name?: string;
  description?: string | null;
  maintenanceTypeId?: string;
  recurrenceType?: RecurrenceType;
  intervalValue?: number | null;
  intervalUnit?: string | null;
  meterDefinitionId?: string | null;
  leadTimeDays?: number;
  priority?: PriorityLevel;
  isActive?: boolean;
}

export interface AssignPlanToAssetDto {
  assetId: string;
  maintenancePlanId: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  initialNextDueAt?: string | Date | null;
  isActive?: boolean;
}

export interface RescheduleAssetPlanDto {
  newDueAt: string | Date;
  reason: string;
  updatedByUserId?: string;
}

export interface GenerateWorkOrderFromPlanOptions {
  forceGenerate?: boolean;
  scheduledStartAt?: string | Date;
  assignedTo?: string | null;
  status?: WorkOrderStatus;
  currentUserId?: string;
}

export interface BatchGenerateOptions {
  siteId?: string;
  dryRun?: boolean;
  currentUserId?: string;
}

export interface RecordCompletionDto {
  completedAt?: string | Date;
  meterReadingValue?: number;
  updatedByUserId?: string;
  notes?: string;
}

// =============================================================================
// Maintenance Planning Service
// =============================================================================

export class MaintenancePlanningService {
  // ===========================================================================
  // 1. REUSABLE TASK TEMPLATES
  // ===========================================================================

  async createTaskTemplate(dto: CreateMaintenanceTaskTemplateDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await tenantPrisma.maintenanceTaskTemplate.findFirst({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'TASK_TEMPLATE_EXISTS',
        message: `A task template with code '${normalizedCode}' already exists in this organization.`,
      };
    }

    if (dto.assetCategoryId) {
      const cat = await tenantPrisma.assetCategory.findFirst({
        where: { id: dto.assetCategoryId },
      });
      if (!cat) {
        throw new ForeignKeyViolationError(
          'assetCategoryId',
          dto.assetCategoryId,
          `AssetCategory '${dto.assetCategoryId}' not found in active organization.`
        );
      }
    }

    return tenantPrisma.maintenanceTaskTemplate.create({
      data: {
        organizationId,
        code: normalizedCode,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        assetCategoryId: dto.assetCategoryId || null,
        estimatedDurationMinutes: dto.estimatedDurationMinutes || null,
        safetyInstructions: dto.safetyInstructions?.trim() || null,
        requiredSkills: (dto.requiredSkills || []) as any,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async listTaskTemplates(assetCategoryId?: string, isActive?: boolean) {
    return tenantPrisma.maintenanceTaskTemplate.findMany({
      where: {
        ...(assetCategoryId ? { assetCategoryId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        assetCategory: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getTaskTemplate(idOrCode: string) {
    const template = await tenantPrisma.maintenanceTaskTemplate.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
      },
      include: {
        assetCategory: true,
      },
    });

    if (!template) {
      throw new TaskTemplateNotFoundError(idOrCode);
    }

    return template;
  }

  async updateTaskTemplate(id: string, dto: UpdateMaintenanceTaskTemplateDto) {
    await this.getTaskTemplate(id);

    return tenantPrisma.maintenanceTaskTemplate.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.assetCategoryId !== undefined ? { assetCategoryId: dto.assetCategoryId } : {}),
        ...(dto.estimatedDurationMinutes !== undefined
          ? { estimatedDurationMinutes: dto.estimatedDurationMinutes }
          : {}),
        ...(dto.safetyInstructions !== undefined ? { safetyInstructions: dto.safetyInstructions } : {}),
        ...(dto.requiredSkills ? { requiredSkills: dto.requiredSkills as any } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteTaskTemplate(id: string) {
    await this.getTaskTemplate(id);

    return tenantPrisma.maintenanceTaskTemplate.delete({
      where: { id },
    });
  }

  // ===========================================================================
  // 2. MAINTENANCE TYPES
  // ===========================================================================

  async createMaintenanceType(dto: CreateMaintenanceTypeDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await tenantPrisma.maintenanceType.findFirst({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'MAINTENANCE_TYPE_EXISTS',
        message: `Maintenance type with code '${normalizedCode}' already exists.`,
      };
    }

    return tenantPrisma.maintenanceType.create({
      data: {
        organizationId,
        code: normalizedCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  async listMaintenanceTypes() {
    return tenantPrisma.maintenanceType.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getMaintenanceType(idOrCode: string) {
    const type = await tenantPrisma.maintenanceType.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
      },
    });

    if (!type) {
      throw new MaintenanceTypeNotFoundError(idOrCode);
    }

    return type;
  }

  // ===========================================================================
  // 3. PREVENTIVE MAINTENANCE PLANS
  // ===========================================================================

  async createMaintenancePlan(dto: CreateMaintenancePlanDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    // Verify unique code
    const existing = await tenantPrisma.maintenancePlan.findFirst({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw {
        status: 409,
        code: 'MAINTENANCE_PLAN_EXISTS',
        message: `A maintenance plan with code '${normalizedCode}' already exists.`,
      };
    }

    // Verify maintenance type
    const mType = await tenantPrisma.maintenanceType.findFirst({
      where: { id: dto.maintenanceTypeId },
    });
    if (!mType) {
      throw new ForeignKeyViolationError(
        'maintenanceTypeId',
        dto.maintenanceTypeId,
        `MaintenanceType '${dto.maintenanceTypeId}' not found.`
      );
    }

    // Recurrence validation
    if (dto.recurrenceType === 'calendar') {
      if (!dto.intervalValue || dto.intervalValue <= 0) {
        throw new InvalidScheduleIntervalError(
          'Calendar-based maintenance plans require a positive intervalValue (e.g. 30).'
        );
      }
      if (!dto.intervalUnit) {
        throw new InvalidScheduleIntervalError(
          "Calendar-based maintenance plans require an intervalUnit (e.g. 'days', 'months')."
        );
      }
    } else if (dto.recurrenceType === 'meter') {
      if (!dto.intervalValue || dto.intervalValue <= 0) {
        throw new InvalidScheduleIntervalError(
          'Meter-based maintenance plans require a positive intervalValue (e.g. 500 hours).'
        );
      }
      if (!dto.meterDefinitionId) {
        throw new InvalidScheduleIntervalError(
          'Meter-based maintenance plans require a valid meterDefinitionId.'
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const plan = await tx.maintenancePlan.create({
        data: {
          organizationId,
          code: normalizedCode,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          maintenanceTypeId: dto.maintenanceTypeId,
          recurrenceType: dto.recurrenceType,
          intervalValue:
            dto.intervalValue !== null && dto.intervalValue !== undefined
              ? new Prisma.Decimal(dto.intervalValue)
              : null,
          intervalUnit: dto.intervalUnit || null,
          meterDefinitionId: dto.meterDefinitionId || null,
          leadTimeDays: dto.leadTimeDays ?? 0,
          priority: dto.priority || PriorityLevel.medium,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      // Link tasks if provided
      if (Array.isArray(dto.tasks) && dto.tasks.length > 0) {
        for (let i = 0; i < dto.tasks.length; i++) {
          const t = dto.tasks[i];
          await tx.maintenancePlanTask.create({
            data: {
              organizationId,
              maintenancePlanId: plan.id,
              taskTemplateId: t.taskTemplateId,
              sequenceNo: t.sequenceNo ?? i + 1,
              isMandatory: t.isMandatory !== undefined ? t.isMandatory : true,
            },
          });
        }
      }

      return tx.maintenancePlan.findUnique({
        where: { id: plan.id },
        include: {
          maintenanceType: true,
          maintenancePlanTasks: {
            include: { taskTemplate: true },
            orderBy: { sequenceNo: 'asc' },
          },
        },
      });
    });
  }

  async listMaintenancePlans(filters?: {
    maintenanceTypeId?: string;
    recurrenceType?: RecurrenceType;
    isActive?: boolean;
  }) {
    return tenantPrisma.maintenancePlan.findMany({
      where: {
        ...(filters?.maintenanceTypeId ? { maintenanceTypeId: filters.maintenanceTypeId } : {}),
        ...(filters?.recurrenceType ? { recurrenceType: filters.recurrenceType } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      include: {
        maintenanceType: true,
        meterDefinition: true,
        maintenancePlanTasks: {
          include: { taskTemplate: true },
          orderBy: { sequenceNo: 'asc' },
        },
        _count: {
          select: { assetMaintenancePlans: true, workOrders: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getMaintenancePlan(idOrCode: string) {
    const plan = await tenantPrisma.maintenancePlan.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
      },
      include: {
        maintenanceType: true,
        meterDefinition: true,
        maintenancePlanTasks: {
          include: { taskTemplate: true },
          orderBy: { sequenceNo: 'asc' },
        },
        _count: {
          select: { assetMaintenancePlans: true, workOrders: true },
        },
      },
    });

    if (!plan) {
      throw new MaintenancePlanNotFoundError(idOrCode);
    }

    return plan;
  }

  async updateMaintenancePlan(id: string, dto: UpdateMaintenancePlanDto) {
    await this.getMaintenancePlan(id);

    return tenantPrisma.maintenancePlan.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.maintenanceTypeId ? { maintenanceTypeId: dto.maintenanceTypeId } : {}),
        ...(dto.recurrenceType ? { recurrenceType: dto.recurrenceType } : {}),
        ...(dto.intervalValue !== undefined
          ? {
              intervalValue:
                dto.intervalValue !== null ? new Prisma.Decimal(dto.intervalValue) : null,
            }
          : {}),
        ...(dto.intervalUnit !== undefined ? { intervalUnit: dto.intervalUnit } : {}),
        ...(dto.meterDefinitionId !== undefined ? { meterDefinitionId: dto.meterDefinitionId } : {}),
        ...(dto.leadTimeDays !== undefined ? { leadTimeDays: dto.leadTimeDays } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        maintenanceType: true,
        maintenancePlanTasks: {
          include: { taskTemplate: true },
          orderBy: { sequenceNo: 'asc' },
        },
      },
    });
  }

  async deleteMaintenancePlan(id: string) {
    await this.getMaintenancePlan(id);

    return tenantPrisma.maintenancePlan.delete({
      where: { id },
    });
  }

  async addPlanTask(maintenancePlanId: string, dto: CreateMaintenancePlanTaskDto) {
    const organizationId = requireCurrentTenantId();
    await this.getMaintenancePlan(maintenancePlanId);

    const taskTemplate = await tenantPrisma.maintenanceTaskTemplate.findFirst({
      where: { id: dto.taskTemplateId },
    });
    if (!taskTemplate) {
      throw new TaskTemplateNotFoundError(dto.taskTemplateId);
    }

    return tenantPrisma.maintenancePlanTask.upsert({
      where: {
        organizationId_maintenancePlanId_taskTemplateId: {
          organizationId,
          maintenancePlanId,
          taskTemplateId: dto.taskTemplateId,
        },
      },
      create: {
        organizationId,
        maintenancePlanId,
        taskTemplateId: dto.taskTemplateId,
        sequenceNo: dto.sequenceNo ?? 1,
        isMandatory: dto.isMandatory !== undefined ? dto.isMandatory : true,
      },
      update: {
        sequenceNo: dto.sequenceNo ?? 1,
        isMandatory: dto.isMandatory !== undefined ? dto.isMandatory : true,
      },
      include: {
        taskTemplate: true,
      },
    });
  }

  async removePlanTask(maintenancePlanId: string, taskTemplateId: string) {
    const organizationId = requireCurrentTenantId();

    return tenantPrisma.maintenancePlanTask.deleteMany({
      where: {
        organizationId,
        maintenancePlanId,
        taskTemplateId,
      },
    });
  }

  // ===========================================================================
  // 4. ASSET-PLAN ASSIGNMENTS & SCHEDULES
  // ===========================================================================

  async assignPlanToAsset(dto: AssignPlanToAssetDto, currentUserId?: string) {
    const organizationId = requireCurrentTenantId();

    // 1. Verify Asset
    const asset = await tenantPrisma.asset.findFirst({
      where: { id: dto.assetId },
      include: { site: true, location: true },
    });
    if (!asset) {
      throw new ForeignKeyViolationError(
        'assetId',
        dto.assetId,
        `Asset '${dto.assetId}' not found in active organization.`
      );
    }

    // 2. Verify Maintenance Plan
    const plan = await this.getMaintenancePlan(dto.maintenancePlanId);

    // 3. Compute Initial Next Due Date
    const startDate = new Date(dto.startDate);
    let initialDueAt: Date | null = null;

    if (dto.initialNextDueAt) {
      initialDueAt = new Date(dto.initialNextDueAt);
    } else if (plan.recurrenceType === 'calendar' && plan.intervalValue && plan.intervalUnit) {
      initialDueAt = addIntervalToDate(startDate, Number(plan.intervalValue), plan.intervalUnit);
    } else {
      initialDueAt = startDate;
    }

    // 4. Create Asset Maintenance Plan assignment
    const assignment = await tenantPrisma.assetMaintenancePlan.create({
      data: {
        organizationId,
        assetId: dto.assetId,
        maintenancePlanId: dto.maintenancePlanId,
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextDueAt: initialDueAt,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        asset: { select: { id: true, assetCode: true, name: true, siteId: true } },
        maintenancePlan: {
          include: { maintenanceType: true, maintenancePlanTasks: true },
        },
      },
    });

    // 5. Audit log schedule assignment
    if (tenantPrisma.auditLog) {
      try {
        await tenantPrisma.auditLog.create({
          data: {
            organizationId,
            userId: currentUserId || null,
            action: 'SCHEDULE_ASSIGNED',
            entityType: 'ASSET_MAINTENANCE_PLAN',
            entityId: assignment.id,
            newValues: {
              assetId: dto.assetId,
              planId: dto.maintenancePlanId,
              planCode: plan.code,
              initialDueAt: initialDueAt?.toISOString(),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Safe fallback in offline/mock environment
      }
    }

    return assignment;
  }

  async listAssetMaintenancePlans(filters?: {
    assetId?: string;
    siteId?: string;
    isActive?: boolean;
  }) {
    return tenantPrisma.assetMaintenancePlan.findMany({
      where: {
        ...(filters?.assetId ? { assetId: filters.assetId } : {}),
        ...(filters?.siteId ? { asset: { siteId: filters.siteId } } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            siteId: true,
            site: { select: { id: true, name: true } },
          },
        },
        maintenancePlan: {
          include: {
            maintenanceType: true,
            meterDefinition: true,
            maintenancePlanTasks: {
              include: { taskTemplate: true },
            },
          },
        },
      },
      orderBy: [{ nextDueAt: 'asc' }],
    });
  }

  async getAssetMaintenancePlan(id: string) {
    const assignment = await tenantPrisma.assetMaintenancePlan.findFirst({
      where: { id },
      include: {
        asset: {
          include: {
            site: true,
            location: true,
            assetCategory: true,
          },
        },
        maintenancePlan: {
          include: {
            maintenanceType: true,
            meterDefinition: true,
            maintenancePlanTasks: {
              include: { taskTemplate: true },
              orderBy: { sequenceNo: 'asc' },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new AssetPlanNotFoundError(id);
    }

    return assignment;
  }

  /**
   * Reschedules an asset maintenance plan due date with full audit trail.
   */
  async rescheduleAssetPlan(id: string, dto: RescheduleAssetPlanDto) {
    const organizationId = requireCurrentTenantId();
    const assignment = await this.getAssetMaintenancePlan(id);

    const oldDueAt = assignment.nextDueAt;
    const newDueAt = new Date(dto.newDueAt);

    const updated = await tenantPrisma.assetMaintenancePlan.update({
      where: { id },
      data: {
        nextDueAt: newDueAt,
      },
      include: {
        asset: { select: { id: true, assetCode: true, name: true } },
        maintenancePlan: true,
      },
    });

    // Record schedule adjustment in audit_logs
    if (tenantPrisma.auditLog) {
      try {
        await tenantPrisma.auditLog.create({
          data: {
            organizationId,
            userId: dto.updatedByUserId || null,
            action: 'SCHEDULE_RESCHEDULED',
            entityType: 'ASSET_MAINTENANCE_PLAN',
            entityId: id,
            oldValues: {
              nextDueAt: oldDueAt?.toISOString() || null,
            } as unknown as Prisma.InputJsonValue,
            newValues: {
              nextDueAt: newDueAt.toISOString(),
              reason: dto.reason,
              planCode: assignment.maintenancePlan.code,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Safe fallback in offline/mock environment
      }
    }

    return updated;
  }

  /**
   * Toggles assignment status (e.g. Pause or Resume maintenance schedule).
   */
  async toggleAssetPlanStatus(
    id: string,
    isActive: boolean,
    reason?: string,
    currentUserId?: string
  ) {
    const organizationId = requireCurrentTenantId();
    const assignment = await this.getAssetMaintenancePlan(id);

    const updated = await tenantPrisma.assetMaintenancePlan.update({
      where: { id },
      data: { isActive },
    });

    if (tenantPrisma.auditLog) {
      try {
        await tenantPrisma.auditLog.create({
          data: {
            organizationId,
            userId: currentUserId || null,
            action: isActive ? 'SCHEDULE_RESUMED' : 'SCHEDULE_PAUSED',
            entityType: 'ASSET_MAINTENANCE_PLAN',
            entityId: id,
            oldValues: { isActive: assignment.isActive } as unknown as Prisma.InputJsonValue,
            newValues: {
              isActive,
              reason: reason || (isActive ? 'Schedule resumed' : 'Schedule paused'),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Safe fallback in offline/mock environment
      }
    }

    return updated;
  }

  /**
   * Retrieves the full historical audit log of schedule changes for an asset maintenance assignment.
   */
  async getScheduleHistory(assetPlanId: string) {
    await this.getAssetMaintenancePlan(assetPlanId);

    const logs = await tenantPrisma.auditLog.findMany({
      where: {
        entityType: 'ASSET_MAINTENANCE_PLAN',
        entityId: assetPlanId,
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((l: any) => ({
      id: l.id,
      action: l.action,
      changedAt: l.createdAt,
      changedBy: l.user ? { id: l.user.id, name: l.user.fullName, email: l.user.email } : null,
      oldValues: l.oldValues,
      newValues: l.newValues,
    }));
  }

  // ===========================================================================
  // 5. MAINTENANCE DUE CALCULATIONS & OVERDUE TRACKING
  // ===========================================================================

  /**
   * Evaluates real-time maintenance due status for a specific asset plan.
   */
  async calculateAssetPlanDueStatus(
    assetPlanId: string,
    referenceDate: Date = new Date()
  ) {
    const assignment = await this.getAssetMaintenancePlan(assetPlanId);
    const plan = assignment.maintenancePlan;

    // 1. Evaluate calendar-based status
    const calendarEval = evaluateScheduleDueStatus(
      assignment.nextDueAt,
      plan.leadTimeDays,
      plan.priority,
      assignment.isActive,
      referenceDate
    );

    // 2. Evaluate meter-based status if meter definition is linked
    let meterEval: any = null;
    if (plan.recurrenceType === 'meter' && plan.meterDefinitionId) {
      // Find latest meter reading for this asset and meter
      const meterReading = await tenantPrisma.meterReading.findFirst({
        where: {
          assetMeter: {
            assetId: assignment.assetId,
            meterDefinitionId: plan.meterDefinitionId,
          },
        },
        orderBy: { recordedAt: 'desc' },
      });

      if (meterReading) {
        meterEval = calculateMeterDueStatus({
          intervalValue: Number(plan.intervalValue || 0),
          currentReading: Number(meterReading.readingValue),
          lastReadingAtMaintenance: 0,
          dailyAverageUtilizationRate: 10, // default nominal 10 units/day
          referenceDate,
        });
      }
    }

    const isOverdue = calendarEval.isOverdue || (meterEval ? meterEval.isDue : false);
    const isDue = calendarEval.isDue || (meterEval ? meterEval.isDue : false);
    const status = !assignment.isActive
      ? 'INACTIVE'
      : isOverdue
      ? 'OVERDUE'
      : isDue
      ? 'DUE'
      : calendarEval.isUpcoming
      ? 'UPCOMING'
      : 'ON_SCHEDULE';

    return {
      assetPlanId: assignment.id,
      asset: {
        id: assignment.asset.id,
        assetCode: assignment.asset.assetCode,
        name: assignment.asset.name,
      },
      plan: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        recurrenceType: plan.recurrenceType,
        priority: plan.priority,
        leadTimeDays: plan.leadTimeDays,
      },
      status,
      isDue,
      isOverdue,
      nextDueAt: assignment.nextDueAt,
      daysOverdue: calendarEval.daysOverdue,
      hoursOverdue: calendarEval.hoursOverdue,
      daysUntilDue: calendarEval.daysUntilDue,
      urgencyScore: calendarEval.urgencyScore,
      calendarEvaluation: calendarEval,
      meterEvaluation: meterEval,
    };
  }

  /**
   * Generates a high-level summary of all due, overdue, and upcoming maintenance schedules.
   */
  async getDueAndOverdueSummary(options?: {
    siteId?: string;
    referenceDate?: Date;
  }) {
    const refDate = options?.referenceDate || new Date();
    const assignments = await this.listAssetMaintenancePlans({
      siteId: options?.siteId,
      isActive: true,
    });

    const overdueList: any[] = [];
    const dueList: any[] = [];
    const upcomingList: any[] = [];
    const onScheduleList: any[] = [];

    for (const a of assignments) {
      const evaluation = evaluateScheduleDueStatus(
        a.nextDueAt,
        a.maintenancePlan.leadTimeDays,
        a.maintenancePlan.priority,
        a.isActive,
        refDate
      );

      const item = {
        assetPlanId: a.id,
        assetId: a.assetId,
        assetCode: a.asset.assetCode,
        assetName: a.asset.name,
        siteId: a.asset.siteId,
        siteName: a.asset.site?.name,
        planCode: a.maintenancePlan.code,
        planName: a.maintenancePlan.name,
        recurrenceType: a.maintenancePlan.recurrenceType,
        priority: a.maintenancePlan.priority,
        nextDueAt: a.nextDueAt,
        status: evaluation.status,
        daysOverdue: evaluation.daysOverdue,
        hoursOverdue: evaluation.hoursOverdue,
        daysUntilDue: evaluation.daysUntilDue,
        urgencyScore: evaluation.urgencyScore,
      };

      if (evaluation.status === 'OVERDUE') {
        overdueList.push(item);
      } else if (evaluation.status === 'DUE') {
        dueList.push(item);
      } else if (evaluation.status === 'UPCOMING') {
        upcomingList.push(item);
      } else {
        onScheduleList.push(item);
      }
    }

    // Sort overdue by urgencyScore descending
    overdueList.sort((a, b) => b.urgencyScore - a.urgencyScore);

    return {
      referenceDate: refDate.toISOString(),
      counts: {
        totalAssignments: assignments.length,
        overdueCount: overdueList.length,
        dueCount: dueList.length,
        upcomingCount: upcomingList.length,
        onScheduleCount: onScheduleList.length,
      },
      overdue: overdueList,
      due: dueList,
      upcoming: upcomingList,
      onSchedule: onScheduleList,
    };
  }

  // ===========================================================================
  // 6. WORK ORDER GENERATION & DUPLICATE PREVENTION
  // ===========================================================================

  /**
   * Generates a Work Order from an Asset Maintenance Plan.
   *
   * Features:
   * 1. Duplicate Prevention: Verifies whether an active, uncompleted work order
   *    already exists for this asset and plan. Blocks duplicate generation unless forceGenerate is set.
   * 2. Reusable Task Instantiation: Copies all tasks from MaintenancePlanTask into WorkOrderTask.
   * 3. Automatic Work Order Number generation (WO-YYYY-XXXXX).
   */
  async generateWorkOrderForAssetPlan(
    assetPlanId: string,
    options?: GenerateWorkOrderFromPlanOptions
  ) {
    const organizationId = requireCurrentTenantId();
    const assignment = await this.getAssetMaintenancePlan(assetPlanId);
    const plan = assignment.maintenancePlan;
    const asset = assignment.asset;

    // 1. Duplicate Prevention Check
    const activeStatuses: WorkOrderStatus[] = [
      'draft',
      'open',
      'approved',
      'assigned',
      'in_progress',
      'on_hold',
    ];

    const existingActiveWorkOrder = await tenantPrisma.workOrder.findFirst({
      where: {
        organizationId,
        assetId: asset.id,
        maintenancePlanId: plan.id,
        status: { in: activeStatuses },
      },
      select: {
        id: true,
        workOrderNumber: true,
        title: true,
        status: true,
        scheduledStartAt: true,
      },
    });

    if (existingActiveWorkOrder && !options?.forceGenerate) {
      throw new DuplicateWorkOrderError(
        asset.id,
        plan.id,
        existingActiveWorkOrder.workOrderNumber
      );
    }

    // 2. Transactional Work Order Generation
    return prisma.$transaction(async (tx) => {
      const workOrderNumber = await workOrdersService.generateWorkOrderNumber(organizationId, tx);
      const scheduledStartAt = options?.scheduledStartAt
        ? new Date(options.scheduledStartAt)
        : assignment.nextDueAt || new Date();

      const workOrder = await tx.workOrder.create({
        data: {
          organizationId,
          workOrderNumber,
          siteId: asset.siteId,
          assetId: asset.id,
          locationId: asset.locationId,
          maintenancePlanId: plan.id,
          maintenanceTypeId: plan.maintenanceTypeId,
          title: `[PM] ${asset.name}: ${plan.name}`,
          description:
            `Scheduled Preventive Maintenance generated from plan '${plan.code}'.\n` +
            (plan.description ? `${plan.description}\n` : '') +
            `Recurrence: ${plan.recurrenceType} (Interval: ${plan.intervalValue || 'N/A'} ${
              plan.intervalUnit || ''
            })`,
          priority: plan.priority,
          status: options?.status || 'draft',
          scheduledStartAt,
          assignedTo: options?.assignedTo || null,
          requestedBy: options?.currentUserId || null,
        },
      });

      // Copy all plan tasks into work_order_tasks
      for (const pt of plan.maintenancePlanTasks) {
        await tx.workOrderTask.create({
          data: {
            organizationId,
            workOrderId: workOrder.id,
            taskTemplateId: pt.taskTemplateId,
            title: pt.taskTemplate.title,
            instructions: pt.taskTemplate.safetyInstructions
              ? `Safety Instructions: ${pt.taskTemplate.safetyInstructions}\n\nTask Details: ${
                  pt.taskTemplate.description || ''
                }`
              : pt.taskTemplate.description || null,
            sequenceNo: pt.sequenceNo,
            status: 'pending',
          },
        });
      }

      // Record in status history
      await tx.workOrderStatusHistory.create({
        data: {
          organizationId,
          workOrderId: workOrder.id,
          oldStatus: null,
          newStatus: workOrder.status,
          changedBy: options?.currentUserId || null,
          comment: `Generated from maintenance plan '${plan.code}' (Schedule ID: ${assignment.id}).`,
        },
      });

      // Audit log
      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            organizationId,
            userId: options?.currentUserId || null,
            action: 'WORK_ORDER_GENERATED_FROM_PLAN',
            entityType: 'WORK_ORDER',
            entityId: workOrder.id,
            newValues: {
              workOrderNumber: workOrder.workOrderNumber,
              assetPlanId: assignment.id,
              planCode: plan.code,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }

      return workOrder;
    });
  }

  /**
   * Batch scans all active schedules and generates work orders for due/overdue items,
   * skipping any that already have active work orders.
   */
  async batchGenerateDueWorkOrders(options?: BatchGenerateOptions) {
    const summary = await this.getDueAndOverdueSummary({ siteId: options?.siteId });
    const eligible = [...summary.overdue, ...summary.due];

    const results = {
      scanned: summary.counts.totalAssignments,
      eligibleCount: eligible.length,
      generatedCount: 0,
      skippedDuplicatesCount: 0,
      generatedWorkOrders: [] as any[],
      skippedDuplicates: [] as any[],
    };

    if (options?.dryRun) {
      return {
        dryRun: true,
        ...results,
        eligiblePlans: eligible,
      };
    }

    for (const item of eligible) {
      try {
        const wo = await this.generateWorkOrderForAssetPlan(item.assetPlanId, {
          forceGenerate: false,
          currentUserId: options?.currentUserId,
        });
        results.generatedCount++;
        results.generatedWorkOrders.push({
          assetPlanId: item.assetPlanId,
          workOrderId: wo.id,
          workOrderNumber: wo.workOrderNumber,
        });
      } catch (err: any) {
        if (err?.code === 'DUPLICATE_WORK_ORDER') {
          results.skippedDuplicatesCount++;
          results.skippedDuplicates.push({
            assetPlanId: item.assetPlanId,
            planCode: item.planCode,
            reason: err.message,
          });
        } else {
          throw err;
        }
      }
    }

    return results;
  }

  /**
   * Records maintenance completion for an asset plan and advances nextDueAt to the next recurring cycle.
   */
  async recordWorkOrderCompletion(
    assetPlanId: string,
    dto?: RecordCompletionDto
  ) {
    const organizationId = requireCurrentTenantId();
    const assignment = await this.getAssetMaintenancePlan(assetPlanId);
    const plan = assignment.maintenancePlan;

    const completedAt = dto?.completedAt ? new Date(dto.completedAt) : new Date();

    // Calculate advanced nextDueAt
    let nextDueAt: Date | null = null;
    if (plan.recurrenceType === 'calendar' && plan.intervalValue && plan.intervalUnit) {
      nextDueAt = calculateNextCalendarDueDate(
        Number(plan.intervalValue),
        plan.intervalUnit,
        completedAt,
        assignment.startDate
      );
    } else if (plan.recurrenceType === 'one_time') {
      nextDueAt = null; // one-time plan has no next due date
    } else {
      nextDueAt = calculateNextCalendarDueDate(30, 'days', completedAt, assignment.startDate);
    }

    const updated = await tenantPrisma.assetMaintenancePlan.update({
      where: { id: assetPlanId },
      data: {
        lastCompletedAt: completedAt,
        nextDueAt,
      },
    });

    if (tenantPrisma.auditLog) {
      try {
        await tenantPrisma.auditLog.create({
          data: {
            organizationId,
            userId: dto?.updatedByUserId || null,
            action: 'MAINTENANCE_COMPLETED_SCHEDULE_ADVANCED',
            entityType: 'ASSET_MAINTENANCE_PLAN',
            entityId: assetPlanId,
            newValues: {
              lastCompletedAt: completedAt.toISOString(),
              advancedNextDueAt: nextDueAt?.toISOString() || null,
              notes: dto?.notes || null,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Safe fallback in offline/mock environment
      }
    }

    return updated;
  }

  // ===========================================================================
  // 7. CONTROLLED ANP INTEGRATION BRIDGE
  // ===========================================================================

  async createWorkOrderFromAnpRecommendation(
    dto: ProposeWorkOrderFromAnpDto,
    currentUserId?: string
  ) {
    return anpMaintenanceBridge.createWorkOrderFromAnpRun(dto, currentUserId);
  }

  async proposePlanAssignmentFromAnpRecommendation(
    dto: ProposePlanAssignmentFromAnpDto,
    currentUserId?: string
  ) {
    return anpMaintenanceBridge.proposePlanAssignmentFromAnp(dto, currentUserId);
  }
}

export const maintenancePlanningService = new MaintenancePlanningService();
