import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { PriorityLevel, WorkOrderStatus, Prisma } from '@prisma/client';
import { workOrdersService } from '../work-orders/work-orders.service';
import { AnpRecommendationNotFoundError, DuplicateWorkOrderError } from './maintenance.errors';

export interface ProposeWorkOrderFromAnpDto {
  decisionRunId: string;
  assetId?: string;
  siteId?: string;
  locationId?: string;
  maintenanceTypeId?: string;
  priorityOverride?: PriorityLevel;
  scheduledStartAt?: string | Date;
  assignedTo?: string | null;
  status?: WorkOrderStatus;
  notes?: string;
}

export interface ProposePlanAssignmentFromAnpDto {
  decisionRunId: string;
  assetId: string;
  maintenancePlanId: string;
  startDate?: string | Date;
  notes?: string;
}

/**
 * Controlled ANP Maintenance Bridge
 *
 * Provides a controlled, audited integration between ANP Decision Support and Maintenance Execution:
 * - Schedule execution remains 100% independent of ANP.
 * - Approved ANP recommendations can explicitly instantiate or propose maintenance activities.
 * - Full bidirectional traceability: links WorkOrder to DecisionRun and vice versa.
 */
export class AnpMaintenanceBridge {
  /**
   * Generates a targeted maintenance Work Order from an approved ANP DecisionRun recommendation.
   */
  async createWorkOrderFromAnpRun(dto: ProposeWorkOrderFromAnpDto, currentUserId?: string) {
    const organizationId = requireCurrentTenantId();

    // 1. Fetch DecisionRun with DecisionModel and Asset
    const decisionRun = await tenantPrisma.decisionRun.findFirst({
      where: { id: dto.decisionRunId },
      include: {
        decisionModel: {
          include: {
            alternatives: {
              include: {
                maintenanceTaskTemplate: true,
              },
            },
          },
        },
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            siteId: true,
            locationId: true,
            assetCategoryId: true,
          },
        },
      },
    });

    if (!decisionRun) {
      throw new AnpRecommendationNotFoundError(dto.decisionRunId);
    }

    // 2. Prevent duplicate work order creation for the same DecisionRun
    if (decisionRun.workOrderId) {
      const existingWo = await tenantPrisma.workOrder.findFirst({
        where: { id: decisionRun.workOrderId },
        select: { id: true, workOrderNumber: true, status: true },
      });

      if (existingWo && existingWo.status !== 'cancelled') {
        throw new DuplicateWorkOrderError(
          decisionRun.assetId || 'UNKNOWN',
          decisionRun.decisionModelId,
          existingWo.workOrderNumber
        );
      }
    }

    // 3. Resolve Target Asset, Site, and Location
    const assetId = dto.assetId || decisionRun.assetId;
    const siteId = dto.siteId || decisionRun.asset?.siteId;
    const locationId = dto.locationId || decisionRun.asset?.locationId;

    if (!siteId) {
      throw {
        status: 400,
        code: 'SITE_REQUIRED',
        message: 'A valid siteId is required to generate a maintenance work order from ANP recommendation.',
      };
    }

    // 4. Resolve Maintenance Type: prefer CBM_ANP or CM, or caller provided
    let maintenanceTypeId = dto.maintenanceTypeId;
    if (!maintenanceTypeId) {
      const preferredType = await tenantPrisma.maintenanceType.findFirst({
        where: {
          OR: [{ code: 'CBM_ANP' }, { code: 'CM' }, { code: 'PM' }],
        },
        orderBy: { code: 'asc' },
      });
      maintenanceTypeId = preferredType?.id;
    }

    if (!maintenanceTypeId) {
      throw {
        status: 400,
        code: 'MAINTENANCE_TYPE_REQUIRED',
        message: 'No suitable maintenance type found for ANP maintenance generation.',
      };
    }

    // 5. Extract Recommended Alternative and Task Template
    const resultSnapshot = decisionRun.resultSnapshot as any;
    const topAlternativeCode = resultSnapshot?.topAlternative?.code;
    const matchedAlternative = decisionRun.decisionModel.alternatives.find(
      (a: any) => a.code === topAlternativeCode
    );

    const taskTemplate = matchedAlternative?.maintenanceTaskTemplate;

    // 6. Resolve Priority and Scheduled Start
    const recommendedPriority = (resultSnapshot?.recommendedPriority as PriorityLevel) || PriorityLevel.high;
    const finalPriority = dto.priorityOverride || recommendedPriority;
    const scheduledStartAt = dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : new Date();

    // 7. Atomic transaction: create work order, link to decision run, populate tasks, log history
    return prisma.$transaction(async (tx) => {
      const workOrderNumber = await workOrdersService.generateWorkOrderNumber(organizationId, tx);

      const assetTag = decisionRun.asset ? `${decisionRun.asset.assetCode} (${decisionRun.asset.name})` : 'Asset';
      const actionTitle = matchedAlternative?.name || decisionRun.recommendedAction || 'Remedial Intervention';

      const workOrder = await tx.workOrder.create({
        data: {
          organizationId,
          workOrderNumber,
          siteId,
          assetId: assetId || null,
          locationId: locationId || null,
          maintenanceTypeId,
          title: `[ANP Action] ${assetTag}: ${actionTitle}`,
          description:
            `Controlled maintenance generated from approved ANP Decision Run (${decisionRun.id}).\n` +
            `Recommended Action: ${decisionRun.recommendedAction}\n` +
            (dto.notes ? `Supervisor Notes: ${dto.notes}\n` : ''),
          priority: finalPriority,
          status: dto.status || 'draft',
          scheduledStartAt,
          assignedTo: dto.assignedTo || null,
          requestedBy: currentUserId || null,
        },
      });

      // Populate task from task template if available
      if (taskTemplate) {
        await tx.workOrderTask.create({
          data: {
            organizationId,
            workOrderId: workOrder.id,
            taskTemplateId: taskTemplate.id,
            title: taskTemplate.title,
            instructions: taskTemplate.safetyInstructions
              ? `Safety: ${taskTemplate.safetyInstructions}\n${taskTemplate.description || ''}`
              : taskTemplate.description || null,
            sequenceNo: 1,
            status: 'pending',
          },
        });
      } else {
        // Create standard action task
        await tx.workOrderTask.create({
          data: {
            organizationId,
            workOrderId: workOrder.id,
            title: actionTitle,
            instructions: `Execute ANP recommended action: ${decisionRun.recommendedAction || actionTitle}`,
            sequenceNo: 1,
            status: 'pending',
          },
        });
      }

      // Link DecisionRun to newly created WorkOrder
      await tx.decisionRun.update({
        where: { id: decisionRun.id },
        data: { workOrderId: workOrder.id },
      });

      // Record in work order status history
      await tx.workOrderStatusHistory.create({
        data: {
          organizationId,
          workOrderId: workOrder.id,
          oldStatus: null,
          newStatus: workOrder.status,
          changedBy: currentUserId || null,
          comment: `Created via ANP Decision Support bridge from DecisionRun '${decisionRun.id}'.`,
        },
      });

      // Audit log entry
      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            organizationId,
            userId: currentUserId || null,
            action: 'ANP_WORK_ORDER_GENERATED',
            entityType: 'WORK_ORDER',
            entityId: workOrder.id,
            newValues: {
              workOrderNumber: workOrder.workOrderNumber,
              decisionRunId: decisionRun.id,
              recommendedAction: decisionRun.recommendedAction,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }

      return workOrder;
    });
  }

  /**
   * Proposes a new recurring Preventive Maintenance Plan assignment based on ANP findings.
   */
  async proposePlanAssignmentFromAnp(dto: ProposePlanAssignmentFromAnpDto, currentUserId?: string) {
    const organizationId = requireCurrentTenantId();

    const decisionRun = await tenantPrisma.decisionRun.findFirst({
      where: { id: dto.decisionRunId },
      select: { id: true, recommendedAction: true },
    });

    if (!decisionRun) {
      throw new AnpRecommendationNotFoundError(dto.decisionRunId);
    }

    const plan = await tenantPrisma.maintenancePlan.findFirst({
      where: { id: dto.maintenancePlanId },
      select: { id: true, code: true, name: true, intervalValue: true, intervalUnit: true },
    });

    if (!plan) {
      throw {
        status: 404,
        code: 'MAINTENANCE_PLAN_NOT_FOUND',
        message: `Maintenance Plan '${dto.maintenancePlanId}' not found.`,
      };
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    return {
      proposed: true,
      decisionRunId: decisionRun.id,
      assetId: dto.assetId,
      maintenancePlanId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      recommendedStartDate: startDate,
      notes: dto.notes || `Proposed schedule modification following ANP decision run ${decisionRun.id}`,
      proposedBy: currentUserId || null,
    };
  }
}

export const anpMaintenanceBridge = new AnpMaintenanceBridge();
