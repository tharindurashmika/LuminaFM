import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import {
  ChecklistResponseType,
  InspectionOverallResult,
  InspectionResultStatus,
  InspectionStatus,
  MeterReadingType,
  Prisma,
  ReadingQualityStatus,
  ReadingSource,
} from '@prisma/client';
import { ForeignKeyViolationError } from '../assets/hierarchy.validator';
import { decisionSupportEventBus } from '../decision-support/decision-support.events';
import { TelemetrySignalInput } from '../decision-support/anp.engine';

// =============================================================================
// DTO Interfaces
// =============================================================================

export interface CreateChecklistItemInput {
  itemCode?: string | null;
  question: string;
  responseType: ChecklistResponseType;
  isRequired?: boolean;
  expectedValue?: unknown;
  options?: unknown[];
  minValue?: number | null;
  maxValue?: number | null;
  unitCode?: string | null;
  sequenceNo?: number;
}

export interface CreateChecklistTemplateDto {
  assetCategoryId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  version?: number;
  isActive?: boolean;
  items?: CreateChecklistItemInput[];
}

export interface UpdateChecklistTemplateDto {
  assetCategoryId?: string | null;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateChecklistItemDto {
  itemCode?: string | null;
  question?: string;
  responseType?: ChecklistResponseType;
  isRequired?: boolean;
  expectedValue?: unknown;
  options?: unknown[];
  minValue?: number | null;
  maxValue?: number | null;
  unitCode?: string | null;
  sequenceNo?: number;
}

export interface CreateInspectionDto {
  checklistTemplateId: string;
  assetId?: string | null;
  locationId?: string | null;
  workOrderId?: string | null;
  status?: InspectionStatus;
  scheduledAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  inspectorId?: string | null;
  overallResult?: InspectionOverallResult | null;
  notes?: string | null;
}

export interface UpdateInspectionDto {
  status?: InspectionStatus;
  scheduledAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  inspectorId?: string | null;
  overallResult?: InspectionOverallResult | null;
  notes?: string | null;
}

export interface InspectionResponseInput {
  checklistItemId?: string;
  itemCode?: string;
  value?: unknown;
  responseText?: string | null;
  responseNumber?: number | null;
  responseBoolean?: boolean | null;
  responseDate?: string | Date | null;
  responseJson?: unknown;
  resultStatus?: InspectionResultStatus | null;
  notes?: string | null;
  evidenceUri?: string | null;
}

export interface CreateMeterReadingDto {
  assetMeterId?: string;
  meterCode?: string;
  assetId?: string;
  readingValue: number;
  recordedAt?: string | Date;
  source?: ReadingSource;
  qualityStatus?: ReadingQualityStatus;
  notes?: string | null;
  recordedBy?: string | null;
}

export interface DailyLogEntryInput {
  // Checklist response target (by ID or itemCode)
  checklistItemId?: string;
  itemCode?: string;
  // Meter reading target (by assetMeterId or meterCode)
  assetMeterId?: string;
  meterCode?: string;
  // Unified or specific value fields
  value?: unknown;
  readingValue?: number;
  responseText?: string | null;
  responseNumber?: number | null;
  responseBoolean?: boolean | null;
  responseDate?: string | Date | null;
  responseJson?: unknown;
  resultStatus?: InspectionResultStatus | null;
  source?: ReadingSource;
  qualityStatus?: ReadingQualityStatus;
  recordedAt?: string | Date;
  notes?: string | null;
  evidenceUri?: string | null;
}

export interface SubmitDailyLogDto {
  assetId?: string | null;
  locationId?: string | null;
  workOrderId?: string | null;
  checklistTemplateId?: string;
  inspectionId?: string;
  shiftName?: string | null;
  notes?: string | null;
  recordedAt?: string | Date;
  overallResult?: InspectionOverallResult | null;
  autoDraftWorkOrder?: boolean;
  responses: DailyLogEntryInput[];
  meterReadings?: CreateMeterReadingDto[];
}

export interface CreateUnitOfMeasurementDto {
  unitCode: string;
  unitName: string;
  dimension?: string | null;
}

export interface CreateMeterDefinitionDto {
  code: string;
  name: string;
  unitId: string;
  readingType?: MeterReadingType;
  description?: string | null;
}

export interface CreateAssetMeterDto {
  assetId: string;
  meterDefinitionId: string;
  meterCode?: string | null;
  isActive?: boolean;
  installedAt?: string | Date | null;
}

// =============================================================================
// Operations & Daily Logbook Service
// =============================================================================

export class OperationsService {
  /**
   * Generates a sequentially unique `inspection_number` scoped per organization.
   * Format: `INSP-YYYY-00001`
   */
  async generateInspectionNumber(
    organizationId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<string> {
    const tenantId = organizationId || requireCurrentTenantId();
    const year = new Date().getUTCFullYear();
    const prefix = `INSP-${year}-`;

    const dbClient = tx ? tx.inspection : prisma.inspection;

    const latestInspection = await dbClient.findFirst({
      where: {
        organizationId: tenantId,
        inspectionNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        inspectionNumber: 'desc',
      },
      select: {
        inspectionNumber: true,
      },
    });

    let nextSequence = 1;
    if (latestInspection?.inspectionNumber) {
      const suffix = latestInspection.inspectionNumber.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        nextSequence = parsed + 1;
      }
    }

    return `${prefix}${String(nextSequence).padStart(5, '0')}`;
  }

  // ===========================================================================
  // 1. CHECKLIST TEMPLATES & ITEMS
  // ===========================================================================

  async createChecklistTemplate(dto: CreateChecklistTemplateDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();
    const version = dto.version ?? 1;

    return prisma.$transaction(async (tx) => {
      if (dto.assetCategoryId) {
        const category = await tx.assetCategory.findFirst({
          where: { id: dto.assetCategoryId, organizationId },
          select: { id: true },
        });
        if (!category) {
          throw new ForeignKeyViolationError(
            'assetCategoryId',
            dto.assetCategoryId,
            `AssetCategory '${dto.assetCategoryId}' does not exist in the active organization.`
          );
        }
      }

      const existing = await tx.checklistTemplate.findFirst({
        where: {
          organizationId,
          code: normalizedCode,
          version,
        },
      });

      if (existing) {
        throw {
          status: 409,
          code: 'CHECKLIST_TEMPLATE_EXISTS',
          message: `Checklist template '${normalizedCode}' (v${version}) already exists in this organization.`,
        };
      }

      const template = await tx.checklistTemplate.create({
        data: {
          organizationId,
          assetCategoryId: dto.assetCategoryId || null,
          code: normalizedCode,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          version,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      if (Array.isArray(dto.items) && dto.items.length > 0) {
        for (let i = 0; i < dto.items.length; i++) {
          const item = dto.items[i];
          await tx.checklistItem.create({
            data: {
              organizationId,
              checklistTemplateId: template.id,
              itemCode: item.itemCode ? item.itemCode.trim().toUpperCase() : null,
              question: item.question.trim(),
              responseType: item.responseType,
              isRequired: item.isRequired !== undefined ? item.isRequired : true,
              expectedValue: (item.expectedValue ?? Prisma.DbNull) as any,
              options: (item.options ?? []) as any,
              minValue:
                item.minValue !== undefined && item.minValue !== null
                  ? item.minValue
                  : null,
              maxValue:
                item.maxValue !== undefined && item.maxValue !== null
                  ? item.maxValue
                  : null,
              unitCode: item.unitCode?.trim() || null,
              sequenceNo: item.sequenceNo ?? i + 1,
            },
          });
        }
      }

      return tx.checklistTemplate.findFirst({
        where: { id: template.id, organizationId },
        include: {
          assetCategory: { select: { id: true, code: true, name: true } },
          items: { orderBy: { sequenceNo: 'asc' } },
        },
      });
    });
  }

  async listChecklistTemplates(filters?: {
    assetCategoryId?: string;
    isActive?: boolean;
  }) {
    return tenantPrisma.checklistTemplate.findMany({
      where: {
        ...(filters?.assetCategoryId
          ? { assetCategoryId: filters.assetCategoryId }
          : {}),
        ...(filters?.isActive !== undefined
          ? { isActive: filters.isActive }
          : {}),
      },
      include: {
        assetCategory: { select: { id: true, code: true, name: true } },
        items: { orderBy: { sequenceNo: 'asc' } },
      },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async getChecklistTemplateById(id: string) {
    const template = await tenantPrisma.checklistTemplate.findFirst({
      where: { id },
      include: {
        assetCategory: { select: { id: true, code: true, name: true } },
        items: { orderBy: { sequenceNo: 'asc' } },
      },
    });

    if (!template) {
      throw {
        status: 404,
        code: 'CHECKLIST_TEMPLATE_NOT_FOUND',
        message: `Checklist template '${id}' not found in active organization.`,
      };
    }

    return template;
  }

  async updateChecklistTemplate(id: string, dto: UpdateChecklistTemplateDto) {
    await this.getChecklistTemplateById(id);

    if (dto.assetCategoryId) {
      const cat = await tenantPrisma.assetCategory.findFirst({
        where: { id: dto.assetCategoryId },
        select: { id: true },
      });
      if (!cat) {
        throw new ForeignKeyViolationError(
          'assetCategoryId',
          dto.assetCategoryId,
          `AssetCategory '${dto.assetCategoryId}' not found in active organization.`
        );
      }
    }

    return tenantPrisma.checklistTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.assetCategoryId !== undefined
          ? { assetCategoryId: dto.assetCategoryId }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        assetCategory: { select: { id: true, code: true, name: true } },
        items: { orderBy: { sequenceNo: 'asc' } },
      },
    });
  }

  async deleteChecklistTemplate(id: string) {
    await this.getChecklistTemplateById(id);
    await tenantPrisma.checklistTemplate.delete({ where: { id } });
    return {
      success: true,
      message: `Checklist template '${id}' deleted successfully.`,
    };
  }

  async addChecklistItem(
    checklistTemplateId: string,
    dto: CreateChecklistItemInput
  ) {
    const organizationId = requireCurrentTenantId();
    await this.getChecklistTemplateById(checklistTemplateId);

    return tenantPrisma.checklistItem.create({
      data: {
        organizationId,
        checklistTemplateId,
        itemCode: dto.itemCode ? dto.itemCode.trim().toUpperCase() : null,
        question: dto.question.trim(),
        responseType: dto.responseType,
        isRequired: dto.isRequired !== undefined ? dto.isRequired : true,
        expectedValue: (dto.expectedValue ?? Prisma.DbNull) as any,
        options: (dto.options ?? []) as any,
        minValue:
          dto.minValue !== undefined && dto.minValue !== null
            ? dto.minValue
            : null,
        maxValue:
          dto.maxValue !== undefined && dto.maxValue !== null
            ? dto.maxValue
            : null,
        unitCode: dto.unitCode?.trim() || null,
        sequenceNo: dto.sequenceNo ?? 1,
      },
    });
  }

  async listChecklistItems(checklistTemplateId: string) {
    await this.getChecklistTemplateById(checklistTemplateId);
    return tenantPrisma.checklistItem.findMany({
      where: { checklistTemplateId },
      orderBy: { sequenceNo: 'asc' },
    });
  }

  async updateChecklistItem(itemId: string, dto: UpdateChecklistItemDto) {
    const existing = await tenantPrisma.checklistItem.findFirst({
      where: { id: itemId },
    });
    if (!existing) {
      throw {
        status: 404,
        code: 'CHECKLIST_ITEM_NOT_FOUND',
        message: `Checklist item '${itemId}' not found in active organization.`,
      };
    }

    return tenantPrisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.itemCode !== undefined
          ? { itemCode: dto.itemCode ? dto.itemCode.trim().toUpperCase() : null }
          : {}),
        ...(dto.question !== undefined ? { question: dto.question.trim() } : {}),
        ...(dto.responseType !== undefined
          ? { responseType: dto.responseType }
          : {}),
        ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
        ...(dto.expectedValue !== undefined
          ? { expectedValue: (dto.expectedValue ?? Prisma.DbNull) as any }
          : {}),
        ...(dto.options !== undefined ? { options: dto.options as any } : {}),
        ...(dto.minValue !== undefined ? { minValue: dto.minValue } : {}),
        ...(dto.maxValue !== undefined ? { maxValue: dto.maxValue } : {}),
        ...(dto.unitCode !== undefined
          ? { unitCode: dto.unitCode?.trim() || null }
          : {}),
        ...(dto.sequenceNo !== undefined ? { sequenceNo: dto.sequenceNo } : {}),
      },
    });
  }

  async deleteChecklistItem(itemId: string) {
    const existing = await tenantPrisma.checklistItem.findFirst({
      where: { id: itemId },
    });
    if (!existing) {
      throw {
        status: 404,
        code: 'CHECKLIST_ITEM_NOT_FOUND',
        message: `Checklist item '${itemId}' not found in active organization.`,
      };
    }

    await tenantPrisma.checklistItem.delete({ where: { id: itemId } });
    return {
      success: true,
      message: `Checklist item '${itemId}' deleted successfully.`,
    };
  }

  // ===========================================================================
  // 2. INSPECTIONS & INSPECTION RESPONSES
  // ===========================================================================

  async createInspection(dto: CreateInspectionDto, currentUserId?: string) {
    const organizationId = requireCurrentTenantId();

    const template = await tenantPrisma.checklistTemplate.findFirst({
      where: { id: dto.checklistTemplateId },
      select: { id: true },
    });
    if (!template) {
      throw new ForeignKeyViolationError(
        'checklistTemplateId',
        dto.checklistTemplateId,
        `ChecklistTemplate '${dto.checklistTemplateId}' not found in active organization.`
      );
    }

    if (dto.assetId) {
      const asset = await tenantPrisma.asset.findFirst({
        where: { id: dto.assetId },
        select: { id: true },
      });
      if (!asset) {
        throw new ForeignKeyViolationError(
          'assetId',
          dto.assetId,
          `Asset '${dto.assetId}' not found in active organization.`
        );
      }
    }

    if (dto.locationId) {
      const location = await tenantPrisma.location.findFirst({
        where: { id: dto.locationId },
        select: { id: true },
      });
      if (!location) {
        throw new ForeignKeyViolationError(
          'locationId',
          dto.locationId,
          `Location '${dto.locationId}' not found in active organization.`
        );
      }
    }

    if (dto.workOrderId) {
      const wo = await tenantPrisma.workOrder.findFirst({
        where: { id: dto.workOrderId },
        select: { id: true },
      });
      if (!wo) {
        throw new ForeignKeyViolationError(
          'workOrderId',
          dto.workOrderId,
          `WorkOrder '${dto.workOrderId}' not found in active organization.`
        );
      }
    }

    const inspectionNumber = await this.generateInspectionNumber(organizationId);
    const parseDate = (d?: string | Date | null) => (d ? new Date(d) : null);

    return tenantPrisma.inspection.create({
      data: {
        organizationId,
        inspectionNumber,
        checklistTemplateId: dto.checklistTemplateId,
        assetId: dto.assetId || null,
        locationId: dto.locationId || null,
        workOrderId: dto.workOrderId || null,
        status: dto.status || 'draft',
        scheduledAt: parseDate(dto.scheduledAt),
        startedAt: parseDate(dto.startedAt),
        completedAt: parseDate(dto.completedAt),
        inspectorId: dto.inspectorId || currentUserId || null,
        overallResult: dto.overallResult || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        checklistTemplate: { select: { id: true, code: true, name: true } },
        asset: { select: { id: true, assetCode: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        responses: { include: { checklistItem: true } },
      },
    });
  }

  async listInspections(filters?: {
    assetId?: string;
    checklistTemplateId?: string;
    status?: InspectionStatus;
    workOrderId?: string;
  }) {
    return tenantPrisma.inspection.findMany({
      where: {
        ...(filters?.assetId ? { assetId: filters.assetId } : {}),
        ...(filters?.checklistTemplateId
          ? { checklistTemplateId: filters.checklistTemplateId }
          : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.workOrderId ? { workOrderId: filters.workOrderId } : {}),
      },
      include: {
        checklistTemplate: { select: { id: true, code: true, name: true } },
        asset: { select: { id: true, assetCode: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        inspector: { select: { id: true, fullName: true, email: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async getInspectionById(id: string) {
    const inspection = await tenantPrisma.inspection.findFirst({
      where: { id },
      include: {
        checklistTemplate: {
          include: { items: { orderBy: { sequenceNo: 'asc' } } },
        },
        asset: { select: { id: true, assetCode: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
        inspector: { select: { id: true, fullName: true, email: true } },
        responses: {
          include: { checklistItem: true },
          orderBy: { respondedAt: 'asc' },
        },
      },
    });

    if (!inspection) {
      throw {
        status: 404,
        code: 'INSPECTION_NOT_FOUND',
        message: `Inspection '${id}' not found in active organization.`,
      };
    }

    return inspection;
  }

  async updateInspection(id: string, dto: UpdateInspectionDto) {
    await this.getInspectionById(id);
    const parseDate = (d?: string | Date | null) =>
      d === undefined ? undefined : d ? new Date(d) : null;

    return tenantPrisma.inspection.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: parseDate(dto.scheduledAt) }
          : {}),
        ...(dto.startedAt !== undefined
          ? { startedAt: parseDate(dto.startedAt) }
          : {}),
        ...(dto.completedAt !== undefined
          ? { completedAt: parseDate(dto.completedAt) }
          : {}),
        ...(dto.inspectorId !== undefined
          ? { inspectorId: dto.inspectorId }
          : {}),
        ...(dto.overallResult !== undefined
          ? { overallResult: dto.overallResult }
          : {}),
        ...(dto.notes !== undefined
          ? { notes: dto.notes?.trim() || null }
          : {}),
      },
      include: {
        checklistTemplate: { select: { id: true, code: true, name: true } },
        asset: { select: { id: true, assetCode: true, name: true } },
        responses: { include: { checklistItem: true } },
      },
    });
  }

  async deleteInspection(id: string) {
    await this.getInspectionById(id);
    await tenantPrisma.inspection.delete({ where: { id } });
    return {
      success: true,
      message: `Inspection '${id}' deleted successfully.`,
    };
  }

  /**
   * Maps an incoming checklist item response value to typed columns
   * and evaluates `resultStatus` (`pass` / `fail`) against `minValue` and `maxValue`.
   */
  private resolveChecklistResponseColumns(
    item: {
      id: string;
      responseType: ChecklistResponseType;
      minValue: Prisma.Decimal | null;
      maxValue: Prisma.Decimal | null;
    },
    input: InspectionResponseInput
  ) {
    let responseText: string | null = input.responseText ?? null;
    let responseNumber: number | null =
      input.responseNumber !== undefined && input.responseNumber !== null
        ? Number(input.responseNumber)
        : null;
    let responseBoolean: boolean | null =
      input.responseBoolean !== undefined ? input.responseBoolean : null;
    let responseDate: Date | null = input.responseDate
      ? new Date(input.responseDate)
      : null;
    let responseJson: any =
      input.responseJson !== undefined ? input.responseJson : Prisma.DbNull;

    // If caller passed a unified `value` field, route it based on `item.responseType`
    if (input.value !== undefined && input.value !== null) {
      switch (item.responseType) {
        case 'number': {
          const parsed = Number(input.value);
          if (Number.isNaN(parsed)) {
            throw {
              status: 400,
              code: 'INVALID_RESPONSE_VALUE',
              message: `Checklist item '${item.id}' expects a numeric value, received '${String(input.value)}'.`,
            };
          }
          responseNumber = parsed;
          break;
        }
        case 'yes_no':
        case 'pass_fail': {
          if (typeof input.value === 'boolean') {
            responseBoolean = input.value;
          } else if (typeof input.value === 'string') {
            const lower = input.value.trim().toLowerCase();
            if (['true', 'yes', 'pass', 'ok', '1'].includes(lower)) {
              responseBoolean = true;
              responseText = input.value.trim();
            } else if (['false', 'no', 'fail', '0'].includes(lower)) {
              responseBoolean = false;
              responseText = input.value.trim();
            } else {
              responseText = input.value.trim();
            }
          }
          break;
        }
        case 'date': {
          const d = new Date(String(input.value));
          if (Number.isNaN(d.getTime())) {
            throw {
              status: 400,
              code: 'INVALID_RESPONSE_VALUE',
              message: `Checklist item '${item.id}' expects a valid date, received '${String(input.value)}'.`,
            };
          }
          responseDate = d;
          break;
        }
        case 'text':
        case 'select':
        case 'photo':
        default: {
          if (typeof input.value === 'object') {
            responseJson = input.value;
          } else {
            responseText = String(input.value);
          }
          break;
        }
      }
    }

    // Determine resultStatus if not explicitly supplied
    let resultStatus: InspectionResultStatus = input.resultStatus || 'pass';
    if (!input.resultStatus) {
      if (responseNumber !== null) {
        const min = item.minValue !== null ? Number(item.minValue) : null;
        const max = item.maxValue !== null ? Number(item.maxValue) : null;
        if ((min !== null && responseNumber < min) || (max !== null && responseNumber > max)) {
          resultStatus = 'fail';
        } else {
          resultStatus = 'pass';
        }
      } else if (responseBoolean === false) {
        resultStatus = 'fail';
      }
    }

    return {
      responseText,
      responseNumber,
      responseBoolean,
      responseDate,
      responseJson,
      resultStatus,
    };
  }

  async recordInspectionResponses(
    inspectionId: string,
    inputs: InspectionResponseInput | InspectionResponseInput[],
    respondedByUserId?: string
  ) {
    const organizationId = requireCurrentTenantId();
    const inspection = await this.getInspectionById(inspectionId);
    const itemsList = Array.isArray(inputs) ? inputs : [inputs];

    if (itemsList.length === 0) {
      throw {
        status: 400,
        code: 'EMPTY_RESPONSES',
        message: 'At least one inspection response must be provided.',
      };
    }

    return prisma.$transaction(async (tx) => {
      const savedResponses = [];

      for (const entry of itemsList) {
        const item = await tx.checklistItem.findFirst({
          where: {
            organizationId,
            checklistTemplateId: inspection.checklistTemplateId,
            ...(entry.checklistItemId
              ? { id: entry.checklistItemId }
              : { itemCode: entry.itemCode?.trim().toUpperCase() }),
          },
        });

        if (!item) {
          throw new ForeignKeyViolationError(
            'checklistItemId',
            entry.checklistItemId || entry.itemCode || '',
            `ChecklistItem '${entry.checklistItemId || entry.itemCode}' not found for template '${inspection.checklistTemplateId}' in active organization.`
          );
        }

        const mapped = this.resolveChecklistResponseColumns(item, entry);

        const saved = await tx.inspectionResponse.upsert({
          where: {
            organizationId_inspectionId_checklistItemId: {
              organizationId,
              inspectionId: inspection.id,
              checklistItemId: item.id,
            },
          },
          create: {
            organizationId,
            inspectionId: inspection.id,
            checklistItemId: item.id,
            responseText: mapped.responseText,
            responseNumber: mapped.responseNumber,
            responseBoolean: mapped.responseBoolean,
            responseDate: mapped.responseDate,
            responseJson: mapped.responseJson,
            resultStatus: mapped.resultStatus,
            notes: entry.notes?.trim() || null,
            evidenceUri: entry.evidenceUri?.trim() || null,
            respondedBy: respondedByUserId || null,
          },
          update: {
            responseText: mapped.responseText,
            responseNumber: mapped.responseNumber,
            responseBoolean: mapped.responseBoolean,
            responseDate: mapped.responseDate,
            responseJson: mapped.responseJson,
            resultStatus: mapped.resultStatus,
            notes: entry.notes?.trim() || null,
            evidenceUri: entry.evidenceUri?.trim() || null,
            respondedBy: respondedByUserId || null,
            respondedAt: new Date(),
          },
          include: {
            checklistItem: true,
          },
        });

        savedResponses.push(saved);
      }

      return savedResponses;
    });
  }

  async listInspectionResponses(inspectionId: string) {
    await this.getInspectionById(inspectionId);
    return tenantPrisma.inspectionResponse.findMany({
      where: { inspectionId },
      include: { checklistItem: true },
      orderBy: { respondedAt: 'asc' },
    });
  }

  // ===========================================================================
  // 3. UNITS, METER DEFINITIONS, ASSET METERS & METER READINGS
  // ===========================================================================

  async createUnitOfMeasurement(dto: CreateUnitOfMeasurementDto) {
    const organizationId = requireCurrentTenantId();
    return tenantPrisma.unitOfMeasurement.create({
      data: {
        organizationId,
        unitCode: dto.unitCode.trim(),
        unitName: dto.unitName.trim(),
        dimension: dto.dimension?.trim() || null,
      },
    });
  }

  async listUnitsOfMeasurement() {
    return tenantPrisma.unitOfMeasurement.findMany({
      orderBy: { unitCode: 'asc' },
    });
  }

  async createMeterDefinition(dto: CreateMeterDefinitionDto) {
    const organizationId = requireCurrentTenantId();
    const unit = await tenantPrisma.unitOfMeasurement.findFirst({
      where: { id: dto.unitId },
    });
    if (!unit) {
      throw new ForeignKeyViolationError(
        'unitId',
        dto.unitId,
        `UnitOfMeasurement '${dto.unitId}' not found in active organization.`
      );
    }

    return tenantPrisma.meterDefinition.create({
      data: {
        organizationId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        unitId: dto.unitId,
        readingType: dto.readingType || 'instantaneous',
        description: dto.description?.trim() || null,
      },
      include: { unit: true },
    });
  }

  async listMeterDefinitions() {
    return tenantPrisma.meterDefinition.findMany({
      include: { unit: true },
      orderBy: { code: 'asc' },
    });
  }

  async createAssetMeter(dto: CreateAssetMeterDto) {
    const organizationId = requireCurrentTenantId();

    const asset = await tenantPrisma.asset.findFirst({
      where: { id: dto.assetId },
    });
    if (!asset) {
      throw new ForeignKeyViolationError(
        'assetId',
        dto.assetId,
        `Asset '${dto.assetId}' not found in active organization.`
      );
    }

    const meterDef = await tenantPrisma.meterDefinition.findFirst({
      where: { id: dto.meterDefinitionId },
    });
    if (!meterDef) {
      throw new ForeignKeyViolationError(
        'meterDefinitionId',
        dto.meterDefinitionId,
        `MeterDefinition '${dto.meterDefinitionId}' not found in active organization.`
      );
    }

    return tenantPrisma.assetMeter.create({
      data: {
        organizationId,
        assetId: dto.assetId,
        meterDefinitionId: dto.meterDefinitionId,
        meterCode: dto.meterCode ? dto.meterCode.trim().toUpperCase() : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : new Date(),
      },
      include: {
        asset: { select: { id: true, assetCode: true, name: true } },
        meterDefinition: { include: { unit: true } },
      },
    });
  }

  async listAssetMeters(assetId?: string) {
    return tenantPrisma.assetMeter.findMany({
      where: {
        ...(assetId ? { assetId } : {}),
      },
      include: {
        asset: { select: { id: true, assetCode: true, name: true } },
        meterDefinition: { include: { unit: true } },
      },
    });
  }

  async createMeterReading(dto: CreateMeterReadingDto, currentUserId?: string) {
    const organizationId = requireCurrentTenantId();

    if (
      dto.readingValue === undefined ||
      dto.readingValue === null ||
      Number.isNaN(Number(dto.readingValue))
    ) {
      throw {
        status: 400,
        code: 'INVALID_READING_VALUE',
        message: 'A valid numeric readingValue is required for meter readings.',
      };
    }

    const assetMeter = await tenantPrisma.assetMeter.findFirst({
      where: {
        ...(dto.assetMeterId
          ? { id: dto.assetMeterId }
          : { meterCode: dto.meterCode?.trim().toUpperCase() }),
      },
    });

    if (!assetMeter) {
      throw new ForeignKeyViolationError(
        'assetMeterId',
        dto.assetMeterId || dto.meterCode || '',
        `AssetMeter '${dto.assetMeterId || dto.meterCode}' not found in active organization.`
      );
    }

    return tenantPrisma.meterReading.create({
      data: {
        organizationId,
        assetMeterId: assetMeter.id,
        readingValue: Number(dto.readingValue),
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        source: dto.source || 'manual',
        qualityStatus: dto.qualityStatus || 'valid',
        notes: dto.notes?.trim() || null,
        recordedBy: dto.recordedBy || currentUserId || null,
      },
      include: {
        assetMeter: {
          include: {
            asset: { select: { id: true, assetCode: true, name: true } },
            meterDefinition: { include: { unit: true } },
          },
        },
      },
    });
  }

  async listMeterReadings(filters?: {
    assetMeterId?: string;
    assetId?: string;
    source?: ReadingSource;
    qualityStatus?: ReadingQualityStatus;
  }) {
    return tenantPrisma.meterReading.findMany({
      where: {
        ...(filters?.assetMeterId
          ? { assetMeterId: filters.assetMeterId }
          : {}),
        ...(filters?.assetId
          ? { assetMeter: { assetId: filters.assetId } }
          : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.qualityStatus
          ? { qualityStatus: filters.qualityStatus }
          : {}),
      },
      include: {
        assetMeter: {
          include: {
            asset: { select: { id: true, assetCode: true, name: true } },
            meterDefinition: { include: { unit: true } },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // ===========================================================================
  // 4. COMPOSITE DAILY LOGBOOK SUBMISSION (POST /api/operations/daily-log)
  // ===========================================================================

  /**
   * Composite endpoint (`POST /api/operations/daily-log`) allowing a boiler operator
   * to submit a full shift's readings (e.g., Temperature, Pressure, Water Level) in one go.
   * Executes inside a single atomic database transaction (`prisma.$transaction`),
   * saving entries to both `inspection_responses` and `meter_readings`.
   */
  async submitDailyLog(dto: SubmitDailyLogDto, operatorUserId?: string) {
    const organizationId = requireCurrentTenantId();

    if (!Array.isArray(dto.responses) || dto.responses.length === 0) {
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message:
          'responses array is required and must contain at least one reading or checklist response.',
      };
    }

    const submissionTime = dto.recordedAt
      ? new Date(dto.recordedAt)
      : new Date();

    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Validate Asset if provided
      if (dto.assetId) {
        const asset = await tx.asset.findFirst({
          where: { id: dto.assetId, organizationId },
          select: { id: true, locationId: true },
        });
        if (!asset) {
          throw new ForeignKeyViolationError(
            'assetId',
            dto.assetId,
            `Asset '${dto.assetId}' does not exist in the active organization.`
          );
        }
      }

      // 2. Resolve or Create the Shift Inspection Record
      let inspectionId = dto.inspectionId;
      let checklistTemplateId = dto.checklistTemplateId;

      if (inspectionId) {
        const existingInspection = await tx.inspection.findFirst({
          where: { id: inspectionId, organizationId },
        });
        if (!existingInspection) {
          throw new ForeignKeyViolationError(
            'inspectionId',
            inspectionId,
            `Inspection '${inspectionId}' does not exist in the active organization.`
          );
        }
        checklistTemplateId = existingInspection.checklistTemplateId;
      } else {
        if (!checklistTemplateId) {
          throw {
            status: 400,
            code: 'VALIDATION_ERROR',
            message:
              'Either checklistTemplateId or inspectionId is required to submit a daily log.',
          };
        }

        const template = await tx.checklistTemplate.findFirst({
          where: { id: checklistTemplateId, organizationId },
          select: { id: true },
        });
        if (!template) {
          throw new ForeignKeyViolationError(
            'checklistTemplateId',
            checklistTemplateId,
            `ChecklistTemplate '${checklistTemplateId}' does not exist in the active organization.`
          );
        }

        const inspectionNumber = await this.generateInspectionNumber(
          organizationId,
          tx
        );

        const combinedNotes = [dto.shiftName, dto.notes]
          .filter(Boolean)
          .join(' — ');

        const createdInspection = await tx.inspection.create({
          data: {
            organizationId,
            inspectionNumber,
            checklistTemplateId,
            assetId: dto.assetId || null,
            locationId: dto.locationId || null,
            workOrderId: dto.workOrderId || null,
            status: 'in_progress',
            startedAt: submissionTime,
            inspectorId: operatorUserId || null,
            notes: combinedNotes || null,
          },
        });

        inspectionId = createdInspection.id;
      }

      const savedInspectionResponses = [];
      const savedMeterReadings = [];

      // 3. Process each item in `dto.responses`
      for (const entry of dto.responses) {
        const hasChecklistTarget = Boolean(
          entry.checklistItemId || entry.itemCode
        );
        const hasMeterTarget = Boolean(entry.assetMeterId || entry.meterCode);

        if (!hasChecklistTarget && !hasMeterTarget) {
          throw {
            status: 400,
            code: 'VALIDATION_ERROR',
            message:
              'Each daily log response entry must specify at least a checklistItemId/itemCode or an assetMeterId/meterCode.',
          };
        }

        // 3a. Save to `inspection_responses` if checklist item is referenced
        if (hasChecklistTarget) {
          const item = await tx.checklistItem.findFirst({
            where: {
              organizationId,
              checklistTemplateId: checklistTemplateId!,
              ...(entry.checklistItemId
                ? { id: entry.checklistItemId }
                : { itemCode: entry.itemCode!.trim().toUpperCase() }),
            },
          });

          if (!item) {
            throw new ForeignKeyViolationError(
              'checklistItemId',
              entry.checklistItemId || entry.itemCode || '',
              `ChecklistItem '${entry.checklistItemId || entry.itemCode}' not found in template '${checklistTemplateId}' for active organization.`
            );
          }

          const effectiveValue =
            entry.value !== undefined ? entry.value : entry.readingValue;

          const mapped = this.resolveChecklistResponseColumns(item, {
            ...entry,
            value: effectiveValue,
          });

          const responseRecord = await tx.inspectionResponse.upsert({
            where: {
              organizationId_inspectionId_checklistItemId: {
                organizationId,
                inspectionId: inspectionId!,
                checklistItemId: item.id,
              },
            },
            create: {
              organizationId,
              inspectionId: inspectionId!,
              checklistItemId: item.id,
              responseText: mapped.responseText,
              responseNumber: mapped.responseNumber,
              responseBoolean: mapped.responseBoolean,
              responseDate: mapped.responseDate,
              responseJson: mapped.responseJson,
              resultStatus: mapped.resultStatus,
              notes: entry.notes?.trim() || null,
              evidenceUri: entry.evidenceUri?.trim() || null,
              respondedBy: operatorUserId || null,
              respondedAt: entry.recordedAt
                ? new Date(entry.recordedAt)
                : submissionTime,
            },
            update: {
              responseText: mapped.responseText,
              responseNumber: mapped.responseNumber,
              responseBoolean: mapped.responseBoolean,
              responseDate: mapped.responseDate,
              responseJson: mapped.responseJson,
              resultStatus: mapped.resultStatus,
              notes: entry.notes?.trim() || null,
              evidenceUri: entry.evidenceUri?.trim() || null,
              respondedBy: operatorUserId || null,
              respondedAt: entry.recordedAt
                ? new Date(entry.recordedAt)
                : submissionTime,
            },
            include: {
              checklistItem: true,
            },
          });

          savedInspectionResponses.push(responseRecord);
        }

        // 3b. Save to `meter_readings` if asset meter is referenced
        if (hasMeterTarget) {
          const assetMeter = await tx.assetMeter.findFirst({
            where: {
              organizationId,
              ...(entry.assetMeterId
                ? { id: entry.assetMeterId }
                : { meterCode: entry.meterCode!.trim().toUpperCase() }),
            },
          });

          if (!assetMeter) {
            throw new ForeignKeyViolationError(
              'assetMeterId',
              entry.assetMeterId || entry.meterCode || '',
              `AssetMeter '${entry.assetMeterId || entry.meterCode}' not found in active organization.`
            );
          }

          const rawNumeric =
            entry.readingValue !== undefined
              ? entry.readingValue
              : entry.responseNumber !== undefined &&
                entry.responseNumber !== null
              ? entry.responseNumber
              : entry.value;

          const numericReading = Number(rawNumeric);
          if (
            rawNumeric === undefined ||
            rawNumeric === null ||
            typeof rawNumeric === 'boolean' ||
            Number.isNaN(numericReading)
          ) {
            throw {
              status: 400,
              code: 'INVALID_METER_READING',
              message: `Meter '${entry.assetMeterId || entry.meterCode}' requires a valid numeric readingValue.`,
            };
          }

          const readingRecord = await tx.meterReading.create({
            data: {
              organizationId,
              assetMeterId: assetMeter.id,
              readingValue: numericReading,
              recordedAt: entry.recordedAt
                ? new Date(entry.recordedAt)
                : submissionTime,
              source: entry.source || 'manual',
              qualityStatus: entry.qualityStatus || 'valid',
              notes: entry.notes?.trim() || null,
              recordedBy: operatorUserId || null,
            },
            include: {
              assetMeter: {
                include: {
                  meterDefinition: { include: { unit: true } },
                },
              },
            },
          });

          savedMeterReadings.push(readingRecord);
        }
      }

      // 4. Process any additional standalone `dto.meterReadings` entries inside the same transaction
      if (Array.isArray(dto.meterReadings) && dto.meterReadings.length > 0) {
        for (const mr of dto.meterReadings) {
          const assetMeter = await tx.assetMeter.findFirst({
            where: {
              organizationId,
              ...(mr.assetMeterId
                ? { id: mr.assetMeterId }
                : { meterCode: mr.meterCode?.trim().toUpperCase() }),
            },
          });

          if (!assetMeter) {
            throw new ForeignKeyViolationError(
              'assetMeterId',
              mr.assetMeterId || mr.meterCode || '',
              `AssetMeter '${mr.assetMeterId || mr.meterCode}' not found in active organization.`
            );
          }

          const numericReading = Number(mr.readingValue);
          if (
            mr.readingValue === undefined ||
            mr.readingValue === null ||
            Number.isNaN(numericReading)
          ) {
            throw {
              status: 400,
              code: 'INVALID_METER_READING',
              message: `Meter '${mr.assetMeterId || mr.meterCode}' requires a valid numeric readingValue.`,
            };
          }

          const readingRecord = await tx.meterReading.create({
            data: {
              organizationId,
              assetMeterId: assetMeter.id,
              readingValue: numericReading,
              recordedAt: mr.recordedAt
                ? new Date(mr.recordedAt)
                : submissionTime,
              source: mr.source || 'manual',
              qualityStatus: mr.qualityStatus || 'valid',
              notes: mr.notes?.trim() || null,
              recordedBy: mr.recordedBy || operatorUserId || null,
            },
            include: {
              assetMeter: {
                include: {
                  meterDefinition: { include: { unit: true } },
                },
              },
            },
          });

          savedMeterReadings.push(readingRecord);
        }
      }

      // 5. Compute overallResult and mark the shift Inspection as `completed`
      const hasFailedResponse = savedInspectionResponses.some(
        (r) => r.resultStatus === 'fail'
      );
      const computedOverallResult: InspectionOverallResult =
        dto.overallResult || (hasFailedResponse ? 'fail' : 'pass');

      const completedInspection = await tx.inspection.update({
        where: { id: inspectionId! },
        data: {
          status: 'completed',
          completedAt: submissionTime,
          overallResult: computedOverallResult,
        },
        include: {
          checklistTemplate: { select: { id: true, code: true, name: true } },
          asset: { select: { id: true, assetCode: true, name: true } },
        },
      });

      return {
        inspection: completedInspection,
        inspectionResponses: savedInspectionResponses,
        meterReadings: savedMeterReadings,
        summary: {
          inspectionNumber: completedInspection.inspectionNumber,
          overallResult: completedInspection.overallResult,
          totalInspectionResponses: savedInspectionResponses.length,
          totalMeterReadings: savedMeterReadings.length,
          failedItemsCount: savedInspectionResponses.filter(
            (r) => r.resultStatus === 'fail'
          ).length,
        },
      };
    });

    // Emit 'daily-log:submitted' event to the decoupled ANP Decision Support listener
    const signals: TelemetrySignalInput[] = [];
    for (const r of dto.responses) {
      const key =
        r.itemCode ||
        r.meterCode ||
        r.checklistItemId ||
        r.assetMeterId ||
        'SIGNAL';
      const val =
        r.value !== undefined
          ? r.value
          : r.readingValue !== undefined
          ? r.readingValue
          : r.responseNumber !== undefined && r.responseNumber !== null
          ? r.responseNumber
          : r.responseBoolean !== undefined && r.responseBoolean !== null
          ? r.responseBoolean
          : r.responseText;

      if (
        val !== undefined &&
        val !== null &&
        (typeof val === 'number' ||
          typeof val === 'boolean' ||
          typeof val === 'string')
      ) {
        signals.push({
          key: String(key),
          value: val,
          sourceType: r.checklistItemId || r.itemCode
            ? 'inspection_response'
            : 'meter_reading',
        });
      }
    }

    if (Array.isArray(dto.meterReadings)) {
      for (const mr of dto.meterReadings) {
        const key = mr.meterCode || mr.assetMeterId || 'METER';
        signals.push({
          key: String(key),
          value: Number(mr.readingValue),
          sourceType: 'meter_reading',
        });
      }
    }

    let decisionSupportResults: unknown[] = [];
    try {
      decisionSupportResults =
        await decisionSupportEventBus.emitDailyLogSubmitted({
          organizationId,
          assetId: dto.assetId || txResult.inspection.assetId || null,
          locationId: dto.locationId || null,
          workOrderId: dto.workOrderId || null,
          inspectionId: txResult.inspection.id,
          inspectionNumber: txResult.inspection.inspectionNumber,
          checklistTemplateId: txResult.inspection.checklistTemplateId,
          operatorUserId: operatorUserId || null,
          autoDraftWorkOrder: dto.autoDraftWorkOrder,
          signals,
        });
    } catch {
      // Non-blocking if no ANP decision model is configured in DB
    }

    return {
      ...txResult,
      decisionSupport: decisionSupportResults[0] ?? null,
    };
  }
}

export const operationsService = new OperationsService();
