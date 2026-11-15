import { Request, Response, NextFunction } from 'express';
import {
  decisionSupportService,
  CreateDecisionCriterionInput,
  CreateDecisionAlternativeInput,
} from './decision-support.service';
import { DecisionModelStatus } from '@prisma/client';
import { TelemetrySignalInput } from './anp.engine';

export class DecisionSupportController {
  // ===========================================================================
  // 1. DECISION MODELS, CRITERIA & ALTERNATIVES
  // ===========================================================================

  async createDecisionModel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const code = b.code;
      const name = b.name;

      if (!code || !name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code and name are required to create a DecisionModel.',
          },
        });
        return;
      }

      const criteria: CreateDecisionCriterionInput[] | undefined = Array.isArray(
        b.criteria
      )
        ? b.criteria.map((c: any) => ({
            parentCriterionId: c.parentCriterionId ?? c.parent_criterion_id,
            clusterCode: c.clusterCode ?? c.cluster_code,
            code: c.code,
            name: c.name,
            description: c.description,
            criterionType: c.criterionType ?? c.criterion_type,
            weight: c.weight !== undefined ? Number(c.weight) : undefined,
            sequenceNo: c.sequenceNo ?? c.sequence_no,
            benchmarkRule: c.benchmarkRule ?? c.benchmark_rule,
          }))
        : undefined;

      const alternatives: CreateDecisionAlternativeInput[] | undefined =
        Array.isArray(b.alternatives)
          ? b.alternatives.map((a: any) => ({
              code: a.code,
              name: a.name,
              description: a.description,
              category: a.category,
              componentCode: a.componentCode ?? a.component_code,
            }))
          : undefined;

      const model = await decisionSupportService.createDecisionModel({
        code,
        name,
        modelMethod: b.modelMethod ?? b.model_method,
        systemTypeId: b.systemTypeId ?? b.system_type_id,
        assetCategoryId: b.assetCategoryId ?? b.asset_category_id,
        version: b.version,
        configuration: b.configuration,
        status: b.status,
        effectiveFrom: b.effectiveFrom ?? b.effective_from,
        effectiveTo: b.effectiveTo ?? b.effective_to,
        criteria,
        alternatives,
      });

      res.status(201).json({
        success: true,
        message: 'ANP Decision Model created successfully.',
        data: model,
      });
    } catch (err) {
      next(err);
    }
  }

  async listDecisionModels(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const models = await decisionSupportService.listDecisionModels({
        assetCategoryId: (req.query.assetCategoryId ??
          req.query.asset_category_id) as string | undefined,
        status: req.query.status as DecisionModelStatus | undefined,
      });

      res.status(200).json({
        success: true,
        data: models,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDecisionModelById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const model = await decisionSupportService.getDecisionModelById(
        String(req.params.id)
      );
      res.status(200).json({
        success: true,
        data: model,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDecisionModel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const updated = await decisionSupportService.updateDecisionModel(
        String(req.params.id),
        {
          name: b.name,
          status: b.status,
          configuration: b.configuration,
          effectiveFrom: b.effectiveFrom ?? b.effective_from,
          effectiveTo: b.effectiveTo ?? b.effective_to,
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

  async createNewModelVersion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const newVersion = await decisionSupportService.createNewModelVersion(
        String(req.params.id)
      );
      res.status(201).json({
        success: true,
        message: 'New decision model version created successfully.',
        data: newVersion,
      });
    } catch (err) {
      next(err);
    }
  }

  async addDecisionCriterion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const decisionModelId =
        String(req.params.modelId || '') ||
        b.decisionModelId ||
        b.decision_model_id;

      if (!decisionModelId || !b.code || !b.name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'decisionModelId, code, and name are required to add a decision criterion.',
          },
        });
        return;
      }

      const criterion = await decisionSupportService.addDecisionCriterion(
        decisionModelId,
        {
          parentCriterionId: b.parentCriterionId ?? b.parent_criterion_id,
          clusterCode: b.clusterCode ?? b.cluster_code,
          code: b.code,
          name: b.name,
          description: b.description,
          criterionType: b.criterionType ?? b.criterion_type,
          weight: b.weight !== undefined ? Number(b.weight) : undefined,
          sequenceNo: b.sequenceNo ?? b.sequence_no,
          benchmarkRule: b.benchmarkRule ?? b.benchmark_rule,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Decision criterion added successfully.',
        data: criterion,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateDecisionCriterion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const updated = await decisionSupportService.updateDecisionCriterion(
        String(req.params.id),
        {
          parentCriterionId: b.parentCriterionId ?? b.parent_criterion_id,
          clusterCode: b.clusterCode ?? b.cluster_code,
          name: b.name,
          description: b.description,
          criterionType: b.criterionType ?? b.criterion_type,
          weight: b.weight !== undefined ? Number(b.weight) : undefined,
          sequenceNo: b.sequenceNo ?? b.sequence_no,
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

  async addDecisionAlternative(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const decisionModelId =
        String(req.params.modelId || '') ||
        b.decisionModelId ||
        b.decision_model_id;

      if (!decisionModelId || !b.code || !b.name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'decisionModelId, code, and name are required to add a decision alternative.',
          },
        });
        return;
      }

      const alt = await decisionSupportService.addDecisionAlternative(
        decisionModelId,
        {
          code: b.code,
          name: b.name,
          description: b.description,
          category: b.category,
          componentCode: b.componentCode ?? b.component_code,
        }
      );

      res.status(201).json({
        success: true,
        data: alt,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // 2. PAIRWISE COMPARISONS, NETWORK EDGES & GOVERNANCE
  // ===========================================================================

  async recordPairwiseComparison(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const decisionModelId =
        String(req.params.modelId || '') || b.decisionModelId || b.decision_model_id;

      if (
        !decisionModelId ||
        !b.clusterCode ||
        !b.rowElementId ||
        !b.colElementId ||
        b.saatyValue === undefined
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'decisionModelId, clusterCode, rowElementId, colElementId, and saatyValue are required.',
          },
        });
        return;
      }

      const comparison = await decisionSupportService.recordPairwiseComparison({
        decisionModelId,
        clusterCode: b.clusterCode,
        criterionId: b.criterionId || null,
        rowElementId: b.rowElementId,
        colElementId: b.colElementId,
        saatyValue: Number(b.saatyValue),
        evaluatorUserId: req.user?.userId || b.evaluatorUserId,
      });

      res.status(200).json({
        success: true,
        message: 'Pairwise comparison and reciprocal entry recorded successfully.',
        data: comparison,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPairwiseComparisonMatrix(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const decisionModelId = String(req.params.modelId);
      const clusterCode = String(req.params.clusterCode);
      const criterionId = req.query.criterionId as string | undefined;

      const matrixData = await decisionSupportService.getPairwiseComparisonMatrix(
        decisionModelId,
        clusterCode,
        criterionId
      );

      res.status(200).json({
        success: true,
        data: matrixData,
      });
    } catch (err) {
      next(err);
    }
  }

  async addNetworkEdge(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const decisionModelId =
        String(req.params.modelId || '') || b.decisionModelId || b.decision_model_id;

      if (!decisionModelId || !b.fromCriterionId || !b.toCriterionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'decisionModelId, fromCriterionId, and toCriterionId are required.',
          },
        });
        return;
      }

      const edge = await decisionSupportService.addNetworkEdge({
        decisionModelId,
        fromCriterionId: b.fromCriterionId,
        toCriterionId: b.toCriterionId,
        edgeType: b.edgeType,
        weight: b.weight !== undefined ? Number(b.weight) : undefined,
      });

      res.status(201).json({
        success: true,
        data: edge,
      });
    } catch (err) {
      next(err);
    }
  }

  async approveDecisionModel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const notes = req.body.approvalNotes ?? req.body.approval_notes;
      const approved = await decisionSupportService.approveDecisionModel(
        id,
        notes,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: 'ANP Decision Model validated and approved successfully.',
        data: approved,
      });
    } catch (err) {
      next(err);
    }
  }

  async activateDecisionModel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const activated = await decisionSupportService.activateDecisionModel(
        id,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: 'ANP Decision Model activated for production evaluation.',
        data: activated,
      });
    } catch (err) {
      next(err);
    }
  }

  async instantiateDissertationModel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const assetCategoryId =
        req.body.assetCategoryId ?? req.body.asset_category_id;
      const model = await decisionSupportService.instantiateDissertationModel(
        assetCategoryId
      );

      res.status(201).json({
        success: true,
        message:
          'Dissertation ANP Model reconstructed and seeded successfully in pending_expert_judgment status.',
        data: model,
      });
    } catch (err) {
      next(err);
    }
  }

  // ===========================================================================
  // 3. DECISION RUNS, MANUAL EVALUATION, REPRODUCIBILITY & NOTIFICATIONS
  // ===========================================================================

  async evaluateReadings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      const rawSignals = Array.isArray(b.signals ?? b.readings)
        ? b.signals ?? b.readings
        : [];

      if (rawSignals.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'signals array is required to run ANP decision evaluation.',
          },
        });
        return;
      }

      const signals: TelemetrySignalInput[] = rawSignals.map((s: any) => ({
        key: s.key ?? s.code ?? s.itemCode ?? s.meterCode,
        label: s.label ?? s.name,
        value: s.value ?? s.readingValue,
        unit: s.unit ?? s.unitCode,
        sourceType: s.sourceType ?? 'manual',
      }));

      const result =
        await decisionSupportService.evaluateReadingsAndTriggerActions({
          decisionModelId: b.decisionModelId ?? b.decision_model_id,
          assetId: b.assetId ?? b.asset_id,
          siteId: b.siteId ?? b.site_id,
          locationId: b.locationId ?? b.location_id,
          maintenanceTypeId: b.maintenanceTypeId ?? b.maintenance_type_id,
          notifyUserId: b.notifyUserId ?? b.notify_user_id ?? req.user?.userId,
          autoDraftWorkOrder:
            b.autoDraftWorkOrder ?? b.auto_draft_work_order,
          signals,
        });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listDecisionRuns(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const runs = await decisionSupportService.listDecisionRuns({
        assetId: (req.query.assetId ?? req.query.asset_id) as
          | string
          | undefined,
        decisionModelId: (req.query.decisionModelId ??
          req.query.decision_model_id) as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: runs,
      });
    } catch (err) {
      next(err);
    }
  }

  async reproduceDecisionRun(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const runId = String(req.params.id);
      const reproduced = await decisionSupportService.reproduceDecisionRun(runId);

      res.status(200).json({
        success: true,
        message: 'Decision run reproduced and verified against original immutable snapshot.',
        data: reproduced,
      });
    } catch (err) {
      next(err);
    }
  }

  async listNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const unreadRaw = req.query.unreadOnly ?? req.query.unread_only;
      const unreadOnly =
        unreadRaw !== undefined ? String(unreadRaw) === 'true' : undefined;

      const notifications = await decisionSupportService.listNotifications({
        userId: (req.query.userId ?? req.query.user_id) as string | undefined,
        unreadOnly,
      });

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (err) {
      next(err);
    }
  }

  async markNotificationRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updated = await decisionSupportService.markNotificationRead(
        String(req.params.id)
      );
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const decisionSupportController = new DecisionSupportController();
