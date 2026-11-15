import { Request, Response, NextFunction } from 'express';
import { modelGovernanceService } from './governance.service';

export class ModelGovernanceController {
  async getBaselineDissertationGovernance(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const baseline = modelGovernanceService.getBaselineDissertationGovernance();
      res.status(200).json({
        success: true,
        data: baseline,
      });
    } catch (err) {
      next(err);
    }
  }

  async getModelGovernance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const governance = await modelGovernanceService.getModelGovernance(id);
      res.status(200).json({
        success: true,
        data: governance,
      });
    } catch (err) {
      next(err);
    }
  }

  async proposeModelConfiguration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const b = req.body;
      if (!b.code || !b.name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code and name are required to propose a model configuration.',
          },
        });
        return;
      }

      const proposal = await modelGovernanceService.proposeModelConfiguration({
        baseModelId: b.baseModelId ?? b.base_model_id,
        code: b.code,
        name: b.name,
        assetCategoryId: b.assetCategoryId ?? b.asset_category_id,
        notes: b.notes,
        proposerUserId: req.user?.userId || b.proposerUserId,
        proposerName: req.user?.email || b.proposerName,
        criteria: b.criteria,
        alternatives: b.alternatives,
      });

      res.status(201).json({
        success: true,
        message: 'New commercial client model configuration proposed successfully.',
        data: proposal,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordCriterionEvidence(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const criterionCode = String(req.params.code).toUpperCase();
      const b = req.body;

      if (!b.title || !b.evidenceType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'title and evidenceType are required to record criterion evidence.',
          },
        });
        return;
      }

      const evidence = await modelGovernanceService.recordCriterionEvidence(
        id,
        criterionCode,
        {
          evidenceType: b.evidenceType,
          title: b.title,
          description: b.description || '',
          sourceReference: b.sourceReference || b.source_reference,
          storageUri: b.storageUri || b.storage_uri,
          attachmentId: b.attachmentId || b.attachment_id,
          userId: req.user?.userId || b.userId,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Evidence attached to criterion successfully.',
        data: evidence,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordExpertEvaluation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const criterionCode = String(req.params.code).toUpperCase();
      const b = req.body;

      if (!b.expertId || b.retentionVote === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'expertId and retentionVote are required to record an expert evaluation.',
          },
        });
        return;
      }

      const record = await modelGovernanceService.recordExpertEvaluation(
        id,
        criterionCode,
        {
          expertId: b.expertId,
          isAnonymized: b.isAnonymized,
          publicReference: b.publicReference || b.public_reference,
          confidentialIdentity: b.confidentialIdentity || b.confidential_identity,
          yearsOfExperience: b.yearsOfExperience || b.years_of_experience,
          sector: b.sector,
          retentionVote: Boolean(b.retentionVote),
          operationalRelevanceRating: Number(b.operationalRelevanceRating || 5),
          suggestedBenchmarkThreshold: b.suggestedBenchmarkThreshold || b.suggested_benchmark_threshold,
          expertComments: b.expertComments || b.expert_comments || '',
        }
      );

      res.status(200).json({
        success: true,
        message: 'Expert evaluation recorded and retention rate recalculated.',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  async addValidationComment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const criterionCode = String(req.params.code).toUpperCase();
      const b = req.body;

      if (!b.comment) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'comment is required.',
          },
        });
        return;
      }

      const comment = await modelGovernanceService.addValidationComment(
        id,
        criterionCode,
        {
          userId: req.user?.userId || b.userId,
          userName: req.user?.email || b.userName || 'Administrator',
          commentType: b.commentType || 'admin_review',
          comment: b.comment,
        }
      );

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (err) {
      next(err);
    }
  }

  async compareModelVersions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const modelAId = (req.query.modelAId ?? req.query.model_a_id) as string;
      const modelBId = (req.query.modelBId ?? req.query.model_b_id) as string;

      if (!modelAId || !modelBId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'modelAId and modelBId query parameters are required for version comparison.',
          },
        });
        return;
      }

      const diff = await modelGovernanceService.compareModelVersions(modelAId, modelBId);

      res.status(200).json({
        success: true,
        data: diff,
      });
    } catch (err) {
      next(err);
    }
  }

  async approveModelProposal(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const b = req.body;

      const approved = await modelGovernanceService.approveModelProposal(id, {
        reviewerUserId: req.user?.userId || b.reviewerUserId,
        reviewerName: req.user?.email || b.reviewerName || 'Decision Model Administrator',
        approvalNotes: b.approvalNotes || b.approval_notes || 'Model configuration approved.',
        claimedValidationLevel: b.claimedValidationLevel || b.claimed_validation_level,
      });

      res.status(200).json({
        success: true,
        message: 'Decision model proposal validated and approved successfully.',
        data: approved,
      });
    } catch (err) {
      next(err);
    }
  }

  async activateModel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const activated = await modelGovernanceService.activateModel(
        id,
        req.user?.userId || 'system-admin'
      );

      res.status(200).json({
        success: true,
        message: 'Model activated for operational CMMS use.',
        data: activated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const modelGovernanceController = new ModelGovernanceController();
