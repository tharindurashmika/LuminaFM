import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import {
  requireCurrentTenantId,
  runWithTenantContext,
} from '../../tenant/tenant.context';
import {
  CriterionType,
  DecisionModelMethod,
  DecisionModelStatus,
  Prisma,
} from '@prisma/client';
import {
  validateNoHierarchyCycle,
  ForeignKeyViolationError,
} from '../assets/hierarchy.validator';
import { workOrdersService } from '../work-orders/work-orders.service';
import {
  evaluateAnpDecisionModel,
  AnpEvaluationResult,
  BenchmarkThresholdRule,
  CriterionInput,
  TelemetrySignalInput,
  calculateConsistency,
  calculatePriorityVectorPowerMethod,
  AnpMatrixConsistencyResult,
} from './anp.engine';
import {
  decisionSupportEventBus,
  DailyLogSubmittedEventPayload,
} from './decision-support.events';
import {
  DISSERTATION_CLUSTERS,
  DISSERTATION_CRITERIA,
  DISSERTATION_ALTERNATIVES,
  DISSERTATION_NETWORK_EDGES,
  DISSERTATION_PENDING_MODEL_CONFIG,
} from './dissertation-model.reconstruction';

import { operationalAnpService } from './operational-integration/operational-anp.service';
import { DecisionReplayEngine } from './operational-integration/decision-replay.engine';

// =============================================================================
// DTO Interfaces
// =============================================================================

export interface CreateDecisionCriterionInput {
  parentCriterionId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  criterionType?: CriterionType;
  clusterCode?: string;
  weight?: number | null;
  sequenceNo?: number;
  benchmarkRule?: BenchmarkThresholdRule;
}

export interface CreateDecisionAlternativeInput {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  componentCode?: string | null;
}

export interface CreateDecisionModelDto {
  code: string;
  name: string;
  modelMethod?: DecisionModelMethod;
  systemTypeId?: string | null;
  assetCategoryId?: string | null;
  version?: number;
  configuration?: Record<string, any>;
  status?: DecisionModelStatus;
  effectiveFrom?: string | Date | null;
  effectiveTo?: string | Date | null;
  criteria?: CreateDecisionCriterionInput[];
  alternatives?: CreateDecisionAlternativeInput[];
}

export interface UpdateDecisionModelDto {
  name?: string;
  status?: DecisionModelStatus;
  configuration?: Record<string, any>;
  effectiveFrom?: string | Date | null;
  effectiveTo?: string | Date | null;
}

export interface UpdateDecisionCriterionDto {
  parentCriterionId?: string | null;
  clusterCode?: string;
  name?: string;
  description?: string | null;
  criterionType?: CriterionType;
  weight?: number | null;
  sequenceNo?: number;
}

export interface RecordPairwiseComparisonDto {
  decisionModelId: string;
  clusterCode: string;
  criterionId?: string | null;
  rowElementId: string;
  colElementId: string;
  saatyValue: number;
  evaluatorUserId?: string | null;
}

export interface AddNetworkEdgeDto {
  decisionModelId: string;
  fromCriterionId: string;
  toCriterionId: string;
  edgeType?: string;
  weight?: number | null;
}

export interface EvaluateManualReadingsDto {
  decisionModelId?: string;
  assetId?: string | null;
  siteId?: string | null;
  locationId?: string | null;
  maintenanceTypeId?: string | null;
  notifyUserId?: string | null;
  autoDraftWorkOrder?: boolean;
  signals: TelemetrySignalInput[];
}

// =============================================================================
// Decision Support Service (ANP Brain & Model Governance)
// =============================================================================

export class DecisionSupportService {
  constructor() {
    this.bindDailyLogListener();
  }

  /**
   * Registers the ANP listener on `decisionSupportEventBus` so any new data
   * submitted via `POST /api/operations/daily-log` is automatically evaluated.
   */
  public bindDailyLogListener(): void {
    decisionSupportEventBus.clearDailyLogEvaluators();
    decisionSupportEventBus.registerDailyLogEvaluator(
      async (event: DailyLogSubmittedEventPayload) => {
        return runWithTenantContext(event.organizationId, async () => {
          return operationalAnpService.processDailyLogSubmission(event);
        });
      }
    );
  }

  // ===========================================================================
  // 1. DECISION MODELS, CRITERIA & ALTERNATIVES CRUD
  // ===========================================================================

  async createDecisionModel(dto: CreateDecisionModelDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();
    const version = dto.version ?? 1;

    const baseConfig: Record<string, any> = {
      ...(dto.configuration || {}),
    };
    if (Array.isArray(dto.criteria)) {
      const benchmarksMap: Record<string, BenchmarkThresholdRule> = {
        ...(baseConfig.benchmarks || {}),
      };
      for (const c of dto.criteria) {
        if (c.benchmarkRule) {
          benchmarksMap[c.code.trim().toUpperCase()] = c.benchmarkRule;
        }
      }
      if (Object.keys(benchmarksMap).length > 0) {
        baseConfig.benchmarks = benchmarksMap;
      }
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.decisionModel.findFirst({
        where: {
          organizationId,
          code: normalizedCode,
          version,
        },
      });

      if (existing) {
        throw {
          status: 409,
          code: 'DECISION_MODEL_EXISTS',
          message: `Decision model '${normalizedCode}' (v${version}) already exists in this organization.`,
        };
      }

      const model = await tx.decisionModel.create({
        data: {
          organizationId,
          code: normalizedCode,
          name: dto.name.trim(),
          modelMethod: dto.modelMethod || 'ANP',
          systemTypeId: dto.systemTypeId || null,
          assetCategoryId: dto.assetCategoryId || null,
          version,
          configuration: baseConfig as any,
          status: dto.status || 'draft',
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });

      if (Array.isArray(dto.criteria) && dto.criteria.length > 0) {
        for (let i = 0; i < dto.criteria.length; i++) {
          const crit = dto.criteria[i];
          await tx.decisionCriterion.create({
            data: {
              organizationId,
              decisionModelId: model.id,
              parentCriterionId: crit.parentCriterionId || null,
              clusterCode: crit.clusterCode || 'criteria',
              code: crit.code.trim().toUpperCase(),
              name: crit.name.trim(),
              description: crit.description?.trim() || null,
              criterionType: crit.criterionType || 'risk',
              weight:
                crit.weight !== undefined && crit.weight !== null
                  ? crit.weight
                  : 1.0,
              sequenceNo: crit.sequenceNo ?? i + 1,
            },
          });
        }
      }

      if (Array.isArray(dto.alternatives) && dto.alternatives.length > 0) {
        for (const alt of dto.alternatives) {
          await tx.decisionAlternative.create({
            data: {
              organizationId,
              decisionModelId: model.id,
              code: alt.code.trim().toUpperCase(),
              name: alt.name.trim(),
              description: alt.description?.trim() || null,
              category: alt.category || null,
              componentCode: alt.componentCode || null,
            },
          });
        }
      }

      return tx.decisionModel.findFirst({
        where: { id: model.id, organizationId },
        include: {
          criteria: { orderBy: { sequenceNo: 'asc' } },
          alternatives: { orderBy: { code: 'asc' } },
        },
      });
    });
  }

  async listDecisionModels(filters?: {
    assetCategoryId?: string;
    status?: DecisionModelStatus;
  }) {
    return tenantPrisma.decisionModel.findMany({
      where: {
        ...(filters?.assetCategoryId
          ? { assetCategoryId: filters.assetCategoryId }
          : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        criteria: { orderBy: { sequenceNo: 'asc' } },
        alternatives: { orderBy: { code: 'asc' } },
      },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async getDecisionModelById(id: string) {
    const model = await tenantPrisma.decisionModel.findFirst({
      where: { id },
      include: {
        criteria: { orderBy: { sequenceNo: 'asc' } },
        alternatives: { orderBy: { code: 'asc' } },
        pairwiseComparisons: true,
        networkEdges: true,
      },
    });

    if (!model) {
      throw {
        status: 404,
        code: 'DECISION_MODEL_NOT_FOUND',
        message: `DecisionModel '${id}' not found in active organization.`,
      };
    }

    return model;
  }

  async updateDecisionModel(id: string, dto: UpdateDecisionModelDto) {
    await this.getDecisionModelById(id);

    return tenantPrisma.decisionModel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.configuration !== undefined
          ? { configuration: dto.configuration as any }
          : {}),
        ...(dto.effectiveFrom !== undefined
          ? {
              effectiveFrom: dto.effectiveFrom
                ? new Date(dto.effectiveFrom)
                : null,
            }
          : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }
          : {}),
      },
      include: {
        criteria: { orderBy: { sequenceNo: 'asc' } },
        alternatives: { orderBy: { code: 'asc' } },
      },
    });
  }

  async createNewModelVersion(baseModelId: string) {
    const organizationId = requireCurrentTenantId();
    const source = await this.getDecisionModelById(baseModelId);

    const latest = await tenantPrisma.decisionModel.findFirst({
      where: { organizationId, code: source.code },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? source.version) + 1;

    return prisma.$transaction(async (tx) => {
      const cloned = await tx.decisionModel.create({
        data: {
          organizationId,
          code: source.code,
          name: `${source.name} (v${nextVersion})`,
          modelMethod: source.modelMethod,
          systemTypeId: source.systemTypeId,
          assetCategoryId: source.assetCategoryId,
          version: nextVersion,
          configuration: {
            ...(typeof source.configuration === 'object' && source.configuration !== null
              ? (source.configuration as object)
              : {}),
            parentModelId: source.id,
            parentVersion: source.version,
            clonedAt: new Date().toISOString(),
          } as any,
          status: 'draft',
        },
      });

      for (const crit of source.criteria) {
        await tx.decisionCriterion.create({
          data: {
            organizationId,
            decisionModelId: cloned.id,
            clusterCode: crit.clusterCode,
            code: crit.code,
            name: crit.name,
            description: crit.description,
            criterionType: crit.criterionType,
            weight: crit.weight,
            sequenceNo: crit.sequenceNo,
          },
        });
      }

      for (const alt of source.alternatives) {
        await tx.decisionAlternative.create({
          data: {
            organizationId,
            decisionModelId: cloned.id,
            code: alt.code,
            name: alt.name,
            description: alt.description,
            category: alt.category,
            componentCode: alt.componentCode,
          },
        });
      }

      return tx.decisionModel.findFirst({
        where: { id: cloned.id, organizationId },
        include: {
          criteria: { orderBy: { sequenceNo: 'asc' } },
          alternatives: { orderBy: { code: 'asc' } },
        },
      });
    });
  }

  async addDecisionCriterion(
    decisionModelId: string,
    dto: CreateDecisionCriterionInput
  ) {
    const organizationId = requireCurrentTenantId();
    const model = await this.getDecisionModelById(decisionModelId);

    if (dto.parentCriterionId) {
      const parent = await tenantPrisma.decisionCriterion.findFirst({
        where: { id: dto.parentCriterionId, decisionModelId },
      });
      if (!parent) {
        throw new ForeignKeyViolationError(
          'parentCriterionId',
          dto.parentCriterionId,
          `Parent DecisionCriterion '${dto.parentCriterionId}' not found in model '${decisionModelId}'.`
        );
      }
    }

    if (dto.benchmarkRule) {
      const currentConfig =
        typeof model.configuration === 'object' && model.configuration !== null
          ? (model.configuration as Record<string, any>)
          : {};
      const updatedConfig = {
        ...currentConfig,
        benchmarks: {
          ...(currentConfig.benchmarks || {}),
          [dto.code.trim().toUpperCase()]: dto.benchmarkRule,
        },
      };
      await tenantPrisma.decisionModel.update({
        where: { id: decisionModelId },
        data: { configuration: updatedConfig as any },
      });
    }

    return tenantPrisma.decisionCriterion.create({
      data: {
        organizationId,
        decisionModelId,
        parentCriterionId: dto.parentCriterionId || null,
        clusterCode: dto.clusterCode || 'criteria',
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        criterionType: dto.criterionType || 'risk',
        weight:
          dto.weight !== undefined && dto.weight !== null ? dto.weight : 1.0,
        sequenceNo: dto.sequenceNo ?? 1,
      },
    });
  }

  async updateDecisionCriterion(
    criterionId: string,
    dto: UpdateDecisionCriterionDto
  ) {
    const existing = await tenantPrisma.decisionCriterion.findFirst({
      where: { id: criterionId },
    });

    if (!existing) {
      throw {
        status: 404,
        code: 'DECISION_CRITERION_NOT_FOUND',
        message: `DecisionCriterion '${criterionId}' not found in active organization.`,
      };
    }

    if (
      dto.parentCriterionId !== undefined &&
      dto.parentCriterionId !== existing.parentCriterionId
    ) {
      await validateNoHierarchyCycle(
        'DecisionCriterion',
        criterionId,
        dto.parentCriterionId,
        async (id) => {
          const node = await tenantPrisma.decisionCriterion.findFirst({
            where: { id },
            select: { parentCriterionId: true },
          });
          return node?.parentCriterionId;
        }
      );
    }

    return tenantPrisma.decisionCriterion.update({
      where: { id: criterionId },
      data: {
        ...(dto.parentCriterionId !== undefined
          ? { parentCriterionId: dto.parentCriterionId }
          : {}),
        ...(dto.clusterCode !== undefined ? { clusterCode: dto.clusterCode } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.criterionType !== undefined
          ? { criterionType: dto.criterionType }
          : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        ...(dto.sequenceNo !== undefined ? { sequenceNo: dto.sequenceNo } : {}),
      },
    });
  }

  async addDecisionAlternative(
    decisionModelId: string,
    dto: CreateDecisionAlternativeInput
  ) {
    const organizationId = requireCurrentTenantId();
    await this.getDecisionModelById(decisionModelId);

    return tenantPrisma.decisionAlternative.create({
      data: {
        organizationId,
        decisionModelId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category: dto.category || null,
        componentCode: dto.componentCode || null,
      },
    });
  }

  // ===========================================================================
  // 2. PAIRWISE COMPARISONS, EXPERT JUDGMENT & NETWORK EDGES
  // ===========================================================================

  async recordPairwiseComparison(dto: RecordPairwiseComparisonDto) {
    const organizationId = requireCurrentTenantId();
    const val = Number(dto.saatyValue);

    if (Number.isNaN(val) || val <= 0 || val > 9.0 || val < 1 / 9.0) {
      throw {
        status: 400,
        code: 'INVALID_SAATY_SCALE_VALUE',
        message: `Saaty comparison value must be between 1/9 (0.1111) and 9.0, received ${dto.saatyValue}.`,
      };
    }

    await this.getDecisionModelById(dto.decisionModelId);

    return prisma.$transaction(async (tx) => {
      // 1. Upsert primary cell (row -> col)
      const primary = await tx.decisionPairwiseComparison.upsert({
        where: {
          organizationId_decisionModelId_clusterCode_criterionId_rowElementId_colElementId: {
            organizationId,
            decisionModelId: dto.decisionModelId,
            clusterCode: dto.clusterCode,
            criterionId: dto.criterionId || (null as any),
            rowElementId: dto.rowElementId,
            colElementId: dto.colElementId,
          },
        },
        create: {
          organizationId,
          decisionModelId: dto.decisionModelId,
          clusterCode: dto.clusterCode,
          criterionId: dto.criterionId || null,
          rowElementId: dto.rowElementId,
          colElementId: dto.colElementId,
          saatyValue: new Prisma.Decimal(val),
          evaluatorUserId: dto.evaluatorUserId || null,
        },
        update: {
          saatyValue: new Prisma.Decimal(val),
          evaluatorUserId: dto.evaluatorUserId || null,
        },
      });

      // 2. Upsert reciprocal cell (col -> row) if distinct
      if (dto.rowElementId !== dto.colElementId) {
        const recipVal = Number((1.0 / val).toFixed(6));
        await tx.decisionPairwiseComparison.upsert({
          where: {
            organizationId_decisionModelId_clusterCode_criterionId_rowElementId_colElementId: {
              organizationId,
              decisionModelId: dto.decisionModelId,
              clusterCode: dto.clusterCode,
              criterionId: dto.criterionId || (null as any),
              rowElementId: dto.colElementId,
              colElementId: dto.rowElementId,
            },
          },
          create: {
            organizationId,
            decisionModelId: dto.decisionModelId,
            clusterCode: dto.clusterCode,
            criterionId: dto.criterionId || null,
            rowElementId: dto.colElementId,
            colElementId: dto.rowElementId,
            saatyValue: new Prisma.Decimal(recipVal),
            evaluatorUserId: dto.evaluatorUserId || null,
          },
          update: {
            saatyValue: new Prisma.Decimal(recipVal),
            evaluatorUserId: dto.evaluatorUserId || null,
          },
        });
      }

      return primary;
    });
  }

  async getPairwiseComparisonMatrix(
    decisionModelId: string,
    clusterCode: string,
    criterionId?: string | null
  ) {
    const organizationId = requireCurrentTenantId();

    const comparisons = await tenantPrisma.decisionPairwiseComparison.findMany({
      where: {
        organizationId,
        decisionModelId,
        clusterCode,
        ...(criterionId !== undefined ? { criterionId } : {}),
      },
    });

    const elementIds = Array.from(
      new Set([
        ...comparisons.map((c) => c.rowElementId),
        ...comparisons.map((c) => c.colElementId),
      ])
    ).sort();

    const n = elementIds.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(1.0));

    for (const c of comparisons) {
      const rIdx = elementIds.indexOf(c.rowElementId);
      const cIdx = elementIds.indexOf(c.colElementId);
      if (rIdx >= 0 && cIdx >= 0) {
        matrix[rIdx][cIdx] = Number(c.saatyValue);
      }
    }

    const consistency: AnpMatrixConsistencyResult = calculateConsistency(matrix);

    return {
      decisionModelId,
      clusterCode,
      criterionId: criterionId || null,
      dimension: n,
      elementIds,
      matrix,
      consistency,
    };
  }

  async addNetworkEdge(dto: AddNetworkEdgeDto) {
    const organizationId = requireCurrentTenantId();
    await this.getDecisionModelById(dto.decisionModelId);

    return tenantPrisma.decisionNetworkEdge.upsert({
      where: {
        organizationId_decisionModelId_fromCriterionId_toCriterionId: {
          organizationId,
          decisionModelId: dto.decisionModelId,
          fromCriterionId: dto.fromCriterionId,
          toCriterionId: dto.toCriterionId,
        },
      },
      create: {
        organizationId,
        decisionModelId: dto.decisionModelId,
        fromCriterionId: dto.fromCriterionId,
        toCriterionId: dto.toCriterionId,
        edgeType: dto.edgeType || 'inner_dependence',
        weight: dto.weight !== undefined && dto.weight !== null ? new Prisma.Decimal(dto.weight) : null,
      },
      update: {
        edgeType: dto.edgeType || 'inner_dependence',
        weight: dto.weight !== undefined && dto.weight !== null ? new Prisma.Decimal(dto.weight) : null,
      },
    });
  }

  // ===========================================================================
  // 3. MODEL GOVERNANCE, APPROVAL & ACTIVATION
  // ===========================================================================

  async approveDecisionModel(
    decisionModelId: string,
    approvalNotes?: string,
    userId?: string
  ) {
    const model = await this.getDecisionModelById(decisionModelId);

    // Verify consistency of all recorded comparison matrices
    const comparisons = await tenantPrisma.decisionPairwiseComparison.findMany({
      where: { decisionModelId },
    });

    const matrixGroups: Record<string, { r: string; c: string; val: number }[]> = {};
    for (const comp of comparisons) {
      const key = `${comp.clusterCode}__${comp.criterionId || 'ROOT'}`;
      if (!matrixGroups[key]) matrixGroups[key] = [];
      matrixGroups[key].push({
        r: comp.rowElementId,
        c: comp.colElementId,
        val: Number(comp.saatyValue),
      });
    }

    const inconsistentMatrices: { key: string; dimension: number; CR: number }[] = [];

    for (const [key, cells] of Object.entries(matrixGroups)) {
      const elements = Array.from(new Set([...cells.map((c) => c.r), ...cells.map((c) => c.c)])).sort();
      const n = elements.length;
      if (n > 2) {
        const mat = Array.from({ length: n }, () => new Array(n).fill(1.0));
        for (const cell of cells) {
          const r = elements.indexOf(cell.r);
          const c = elements.indexOf(cell.c);
          if (r >= 0 && c >= 0) mat[r][c] = cell.val;
        }
        const consistency = calculateConsistency(mat);
        if (!consistency.isConsistent) {
          inconsistentMatrices.push({
            key,
            dimension: n,
            CR: consistency.consistencyRatio,
          });
        }
      }
    }

    if (inconsistentMatrices.length > 0) {
      throw {
        status: 422,
        code: 'ANP_MODEL_INCONSISTENT',
        message: `DecisionModel '${decisionModelId}' cannot be approved: ${inconsistentMatrices.length} comparison matrix(es) exceed Saaty consistency ratio threshold (CR <= 0.10).`,
        inconsistentMatrices,
      };
    }

    const currentConfig =
      typeof model.configuration === 'object' && model.configuration !== null
        ? (model.configuration as Record<string, any>)
        : {};

    const updatedConfig = {
      ...currentConfig,
      approvedAt: new Date().toISOString(),
      approvedBy: userId || null,
      approvalNotes: approvalNotes || 'ANP model pairwise matrices validated consistent (CR <= 0.10).',
    };

    return tenantPrisma.decisionModel.update({
      where: { id: decisionModelId },
      data: {
        status: 'validated',
        configuration: updatedConfig as any,
      },
      include: {
        criteria: true,
        alternatives: true,
      },
    });
  }

  async activateDecisionModel(decisionModelId: string, userId?: string) {
    const organizationId = requireCurrentTenantId();
    const model = await this.getDecisionModelById(decisionModelId);

    if (model.status !== 'validated' && model.status !== 'draft') {
      throw {
        status: 400,
        code: 'MODEL_NOT_VALIDATED',
        message: `Only 'validated' or 'draft' decision models can be activated. Current status: '${model.status}'.`,
      };
    }

    return prisma.$transaction(async (tx) => {
      // Retire previously active model for the same code or category
      await tx.decisionModel.updateMany({
        where: {
          organizationId,
          code: model.code,
          status: 'active',
          id: { not: decisionModelId },
        },
        data: {
          status: 'retired',
          effectiveTo: new Date(),
        },
      });

      const currentConfig =
        typeof model.configuration === 'object' && model.configuration !== null
          ? (model.configuration as Record<string, any>)
          : {};

      return tx.decisionModel.update({
        where: { id: decisionModelId },
        data: {
          status: 'active',
          effectiveFrom: new Date(),
          effectiveTo: null,
          configuration: {
            ...currentConfig,
            activatedAt: new Date().toISOString(),
            activatedBy: userId || null,
          } as any,
        },
        include: {
          criteria: true,
          alternatives: true,
        },
      });
    });
  }

  // ===========================================================================
  // 4. REPRODUCIBLE CALCULATIONS & IMMUTABLE DECISION RUN SNAPSHOTS
  // ===========================================================================

  async reproduceDecisionRun(runId: string) {
    return DecisionReplayEngine.replayRun(runId);
  }

  // ===========================================================================
  // 5. DISSERTATION MODEL RECONSTRUCTION & SEEDING
  // ===========================================================================

  async instantiateDissertationModel(targetAssetCategoryId?: string | null) {
    const organizationId = requireCurrentTenantId();

    return prisma.$transaction(async (tx) => {
      // Check if already seeded
      const existing = await tx.decisionModel.findFirst({
        where: {
          organizationId,
          code: DISSERTATION_PENDING_MODEL_CONFIG.modelCode,
          version: 1,
        },
      });

      if (existing) {
        return tx.decisionModel.findFirst({
          where: { id: existing.id },
          include: { criteria: true, alternatives: true, networkEdges: true },
        });
      }

      // 1. Create DecisionModel in 'pending_expert_judgment' (status: 'draft')
      const model = await tx.decisionModel.create({
        data: {
          organizationId,
          code: DISSERTATION_PENDING_MODEL_CONFIG.modelCode,
          name: DISSERTATION_PENDING_MODEL_CONFIG.modelName,
          modelMethod: 'ANP',
          assetCategoryId: targetAssetCategoryId || null,
          version: 1,
          status: 'draft',
          configuration: {
            status: 'pending_expert_judgment',
            sourceDocument: DISSERTATION_PENDING_MODEL_CONFIG.sourceDocument,
            author: DISSERTATION_PENDING_MODEL_CONFIG.author,
            institution: DISSERTATION_PENDING_MODEL_CONFIG.institution,
            targetAsset: DISSERTATION_PENDING_MODEL_CONFIG.targetAsset,
            academicFidelityDisclosure: DISSERTATION_PENDING_MODEL_CONFIG.academicFidelityDisclosure,
            uncalibratedMatrices: DISSERTATION_PENDING_MODEL_CONFIG.uncalibratedMatrices,
            benchmarks: DISSERTATION_PENDING_MODEL_CONFIG.benchmarks,
            clusters: DISSERTATION_CLUSTERS,
          } as any,
        },
      });

      // 2. Insert the 22 Criteria
      const createdCriteriaMap: Record<string, string> = {};
      for (let i = 0; i < DISSERTATION_CRITERIA.length; i++) {
        const crit = DISSERTATION_CRITERIA[i];
        const record = await tx.decisionCriterion.create({
          data: {
            organizationId,
            decisionModelId: model.id,
            clusterCode: 'CRITERIA',
            code: crit.code,
            name: crit.name,
            description: crit.description,
            criterionType: crit.category === 'performance_indicator' ? 'risk' : 'benefit',
            weight: 1.0,
            sequenceNo: i + 1,
          },
        });
        createdCriteriaMap[crit.code] = record.id;
      }

      // 3. Insert the 35 Alternatives
      for (const alt of DISSERTATION_ALTERNATIVES) {
        await tx.decisionAlternative.create({
          data: {
            organizationId,
            decisionModelId: model.id,
            code: alt.code,
            name: alt.name,
            description: alt.description,
            category: alt.cycle,
            componentCode: alt.subsystemCode,
          },
        });
      }

      // 4. Insert Network Interdependence Edges
      for (const edge of DISSERTATION_NETWORK_EDGES) {
        const fromId = createdCriteriaMap[edge.fromNode];
        const toId = createdCriteriaMap[edge.toNode];
        if (fromId && toId) {
          await tx.decisionNetworkEdge.create({
            data: {
              organizationId,
              decisionModelId: model.id,
              fromCriterionId: fromId,
              toCriterionId: toId,
              edgeType: edge.edgeType,
              weight: new Prisma.Decimal(1.0),
            },
          });
        }
      }

      return tx.decisionModel.findFirst({
        where: { id: model.id },
        include: { criteria: true, alternatives: true, networkEdges: true },
      });
    });
  }

  // ===========================================================================
  // 6. DECISION RUNS & NOTIFICATIONS LISTING
  // ===========================================================================

  async listDecisionRuns(filters?: {
    assetId?: string;
    decisionModelId?: string;
  }) {
    return tenantPrisma.decisionRun.findMany({
      where: {
        ...(filters?.assetId ? { assetId: filters.assetId } : {}),
        ...(filters?.decisionModelId
          ? { decisionModelId: filters.decisionModelId }
          : {}),
      },
      include: {
        decisionModel: { select: { id: true, code: true, name: true, version: true, modelMethod: true } },
        asset: { select: { id: true, assetCode: true, name: true } },
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: { runAt: 'desc' },
    });
  }

  async listNotifications(filters?: { userId?: string; unreadOnly?: boolean }) {
    return tenantPrisma.notification.findMany({
      where: {
        ...(filters?.userId ? { userId: filters.userId } : {}),
        ...(filters?.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(notificationId: string) {
    const existing = await tenantPrisma.notification.findFirst({
      where: { id: notificationId },
    });
    if (!existing) {
      throw {
        status: 404,
        code: 'NOTIFICATION_NOT_FOUND',
        message: `Notification '${notificationId}' not found in active organization.`,
      };
    }

    return tenantPrisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  // ===========================================================================
  // 7. CORE ANP EVALUATION & AUTOMATED BREACH EXECUTION
  // ===========================================================================

  async handleDailyLogSubmittedEvent(event: DailyLogSubmittedEventPayload) {
    return this.evaluateReadingsAndTriggerActions({
      assetId: event.assetId,
      locationId: event.locationId,
      notifyUserId: event.operatorUserId,
      autoDraftWorkOrder:
        event.autoDraftWorkOrder !== undefined ? event.autoDraftWorkOrder : true,
      signals: event.signals,
    });
  }

  async evaluateReadingsAndTriggerActions(dto: EvaluateManualReadingsDto) {
    const organizationId = requireCurrentTenantId();

    if (!Array.isArray(dto.signals) || dto.signals.length === 0) {
      return {
        evaluated: false,
        isBreached: false,
        reason: 'No signals provided for ANP evaluation.',
      };
    }

    return prisma.$transaction(async (tx) => {
      let assetRecord: {
        id: string;
        assetCode: string;
        name: string;
        siteId: string;
        locationId: string;
        assetCategoryId: string;
      } | null = null;

      if (dto.assetId) {
        assetRecord = await tx.asset.findFirst({
          where: { id: dto.assetId, organizationId },
          select: {
            id: true,
            assetCode: true,
            name: true,
            siteId: true,
            locationId: true,
            assetCategoryId: true,
          },
        });
      }

      let decisionModel = await tx.decisionModel.findFirst({
        where: {
          organizationId,
          ...(dto.decisionModelId
            ? { id: dto.decisionModelId }
            : {
                status: 'active',
                ...(assetRecord?.assetCategoryId
                  ? {
                      OR: [
                        { assetCategoryId: assetRecord.assetCategoryId },
                        { assetCategoryId: null },
                      ],
                    }
                  : {}),
              }),
        },
        include: {
          criteria: { orderBy: { sequenceNo: 'asc' } },
          alternatives: { orderBy: { code: 'asc' } },
        },
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      });

      if (!decisionModel) {
        // Fallback to latest draft model if no active model exists
        decisionModel = await tx.decisionModel.findFirst({
          where: { organizationId },
          include: {
            criteria: { orderBy: { sequenceNo: 'asc' } },
            alternatives: { orderBy: { code: 'asc' } },
          },
          orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
        });
      }

      if (!decisionModel) {
        return {
          evaluated: false,
          isBreached: false,
          reason: 'No ANP DecisionModel found for this organization.',
        };
      }

      const criteriaInputs: CriterionInput[] = decisionModel.criteria.map(
        (c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          criterionType: c.criterionType,
          clusterCode: c.clusterCode,
          weight: c.weight !== null ? Number(c.weight) : 1.0,
          parentCriterionId: c.parentCriterionId,
          sequenceNo: c.sequenceNo,
        })
      );

      const alternativeInputs = decisionModel.alternatives.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        category: a.category,
        componentCode: a.componentCode,
      }));

      const modelConfig =
        typeof decisionModel.configuration === 'object' &&
        decisionModel.configuration !== null
          ? (decisionModel.configuration as {
              benchmarks?: Record<string, BenchmarkThresholdRule>;
              interdependenceMatrix?: Record<string, Record<string, number>>;
              pairwiseComparisons?: any[];
            })
          : undefined;

      // 4. Run Decoupled Mathematical ANP Engine
      const evaluation: AnpEvaluationResult = evaluateAnpDecisionModel({
        criteria: criteriaInputs,
        alternatives: alternativeInputs,
        signals: dto.signals,
        modelConfiguration: modelConfig,
      });

      if (!evaluation.isBreached) {
        return {
          evaluated: true,
          isBreached: false,
          decisionModelId: decisionModel.id,
          evaluation,
          decisionRun: null,
          notification: null,
          draftedWorkOrder: null,
        };
      }

      // 5. Benchmark Breached! Optionally draft a new WorkOrder if enabled
      let draftedWorkOrder: any = null;
      const shouldDraftWorkOrder =
        dto.autoDraftWorkOrder !== undefined ? dto.autoDraftWorkOrder : true;

      if (shouldDraftWorkOrder) {
        const targetSiteId = dto.siteId || assetRecord?.siteId || null;
        let targetMaintenanceTypeId = dto.maintenanceTypeId || null;

        if (!targetMaintenanceTypeId && tx.maintenanceType) {
          const correctiveType = await tx.maintenanceType.findFirst({
            where: { organizationId },
            select: { id: true },
          });
          targetMaintenanceTypeId = correctiveType?.id || null;
        }

        if (targetSiteId && targetMaintenanceTypeId && tx.workOrder) {
          const workOrderNumber =
            await workOrdersService.generateWorkOrderNumber(organizationId, tx);
          const breachedNames = evaluation.breachedCriteria
            .map(
              (b) =>
                `${b.criterionName} (${b.observedValue}${
                  b.unit ? ' ' + b.unit : ''
                } ${b.operator} ${b.threshold}${b.unit ? ' ' + b.unit : ''})`
            )
            .join(', ');

          const assetLabel = assetRecord
            ? `${assetRecord.assetCode} (${assetRecord.name})`
            : 'Facility Equipment';

          draftedWorkOrder = await tx.workOrder.create({
            data: {
              organizationId,
              workOrderNumber,
              siteId: targetSiteId,
              assetId: assetRecord?.id || dto.assetId || null,
              locationId:
                dto.locationId || assetRecord?.locationId || null,
              maintenanceTypeId: targetMaintenanceTypeId,
              title: `[ANP Auto-Draft] ${assetLabel}: ${evaluation.breachedCriteria[0].criterionName} Benchmark Breach`,
              description: `Automated ANP Decision Support Work Order.\nBreached Criteria: ${breachedNames}\nRecommended Action: ${evaluation.recommendedAction}`,
              priority: evaluation.recommendedPriority,
              status: 'draft',
              requestedBy: dto.notifyUserId || null,
            },
          });

          if (tx.workOrderStatusHistory) {
            await tx.workOrderStatusHistory.create({
              data: {
                organizationId,
                workOrderId: draftedWorkOrder.id,
                oldStatus: null,
                newStatus: 'draft',
                changedBy: dto.notifyUserId || null,
                comment: `Automatically drafted by ANP Decision Support Model '${decisionModel.code}' following benchmark breach.`,
              },
            });
          }
        }
      }

      // 6. Persist immutable DecisionRun snapshot
      const decisionRun = await tx.decisionRun.create({
        data: {
          organizationId,
          decisionModelId: decisionModel.id,
          assetId: assetRecord?.id || dto.assetId || null,
          workOrderId: draftedWorkOrder?.id || null,
          inputSnapshot: {
            evaluatedAt: new Date().toISOString(),
            signals: dto.signals,
            modelVersion: decisionModel.version,
            triggerType: dto.autoDraftWorkOrder ? 'automated_breach' : 'manual_evaluation',
          } as unknown as Prisma.InputJsonValue,
          resultSnapshot: {
            compositeRiskScore: evaluation.compositeRiskScore,
            recommendedPriority: evaluation.recommendedPriority,
            breachedCriteria: evaluation.breachedCriteria,
            topAlternative: evaluation.topAlternative,
            rankedAlternatives: evaluation.rankedAlternatives,
            supermatrixWeights: evaluation.supermatrixWeights,
            mathematicalSnapshot: evaluation.mathematicalSnapshot,
          } as unknown as Prisma.InputJsonValue,
          recommendedAction: evaluation.recommendedAction,
          confidenceScore: evaluation.confidenceScore,
          executedBy: dto.notifyUserId || null,
        },
      });

      // 7. Automatically insert a high-priority alert into the notifications table
      let recipientUserId = dto.notifyUserId || null;
      if (!recipientUserId && tx.organizationMembership) {
        const activeMember = await tx.organizationMembership.findFirst({
          where: { organizationId, status: 'active' },
          select: { userId: true },
        });
        recipientUserId = activeMember?.userId || null;
      }

      let notification: any = null;
      if (recipientUserId && tx.notification) {
        const primaryBreach = evaluation.breachedCriteria[0];
        const assetPrefix = assetRecord ? `[${assetRecord.assetCode}] ` : '';

        notification = await tx.notification.create({
          data: {
            organizationId,
            userId: recipientUserId,
            notificationType: 'HIGH_PRIORITY_ANP_ALERT',
            title: `${assetPrefix}ANP Benchmark Breach: ${primaryBreach.criterionName}`,
            message: `Observed ${primaryBreach.observedValue}${
              primaryBreach.unit ? ' ' + primaryBreach.unit : ''
            } breached benchmark (${primaryBreach.operator} ${
              primaryBreach.threshold
            }${primaryBreach.unit ? ' ' + primaryBreach.unit : ''}). ${
              evaluation.recommendedAction
            }`,
            entityType: 'decision_run',
            entityId: decisionRun.id,
          },
        });
      }

      decisionSupportEventBus.emit('decision-run:breach-detected', {
        organizationId,
        decisionRun,
        notification,
        draftedWorkOrder,
        evaluation,
      });

      return {
        evaluated: true,
        isBreached: true,
        decisionModelId: decisionModel.id,
        evaluation,
        decisionRun,
        notification,
        draftedWorkOrder,
      };
    });
  }
}

export const decisionSupportService = new DecisionSupportService();
