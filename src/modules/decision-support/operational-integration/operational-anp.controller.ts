import { Request, Response, NextFunction } from 'express';
import { operationalAnpService } from './operational-anp.service';
import { DecisionReplayEngine } from './decision-replay.engine';
import { SafetyEscalationService } from './safety-escalation.service';
import { ReviewRecommendationDto } from './operational-integration.types';
import tenantPrisma from '../../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../../tenant/tenant.context';

export class OperationalAnpController {
  /**
   * POST /api/decision-support/operational/process-log
   * Evaluates operational readings and logbook telemetry
   */
  async processDailyLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireCurrentTenantId();
      const user = (req as any).user;

      const payload = {
        organizationId,
        assetId: req.body.assetId || null,
        locationId: req.body.locationId || null,
        inspectionId: req.body.inspectionId || `log-${Date.now()}`,
        inspectionNumber: req.body.inspectionNumber || `LOG-${Date.now()}`,
        checklistTemplateId: req.body.checklistTemplateId || 'BOILER_DAILY_SHIFT_LOGBOOK',
        operatorUserId: user?.id || req.body.operatorUserId || null,
        signals: Array.isArray(req.body.signals) ? req.body.signals : [],
      };

      const result = await operationalAnpService.processDailyLogSubmission(payload);

      res.status(200).json({
        success: true,
        message: 'Operational logbook processed by ANP decision engine.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/decision-support/operational/runs/:id
   * Retrieves an operational decision run with full recommendations, attribution & data quality
   */
  async getOperationalDecisionRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const runId = String(req.params.id);
      const run = await operationalAnpService.getOperationalDecisionRun(runId);

      res.status(200).json({
        success: true,
        data: run,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/decision-support/operational/runs/:id/recommendations/:recIndex/review
   * Authorized engineer review and approval of proposed maintenance recommendation
   */
  async reviewRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const runId = String(req.params.id);
      const recIndex = parseInt(String(req.params.recIndex), 10);
      const user = (req as any).user;
      const engineerUserId = user?.id || req.body.engineerUserId;

      if (!engineerUserId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED_ENGINEER',
            message: 'Engineer authentication is required to review and approve maintenance recommendations.',
          },
        });
        return;
      }

      const dto: ReviewRecommendationDto = {
        action: req.body.action || 'approve',
        engineerNotes: req.body.engineerNotes || '',
        targetPriority: req.body.targetPriority,
        assignedUserId: req.body.assignedUserId,
        scheduledDate: req.body.scheduledDate,
        autoCreateWorkOrder: req.body.autoCreateWorkOrder !== false,
      };

      const approval = await operationalAnpService.reviewAndApproveRecommendation(
        runId,
        recIndex,
        dto,
        engineerUserId
      );

      res.status(200).json({
        success: true,
        message: `Recommendation ${recIndex + 1} successfully updated to status: ${approval.reviewStatus}`,
        data: approval,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/decision-support/operational/runs/:id/replay
   * Replays decision run from stored input snapshot and verifies mathematical reproducibility
   */
  async replayDecisionRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const runId = String(req.params.id);
      const replay = await DecisionReplayEngine.replayRun(runId);

      res.status(200).json({
        success: true,
        message: 'Decision run replayed against original immutable input snapshot.',
        data: replay,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/decision-support/operational/safety-alerts
   * Lists active critical safety escalation notifications for the tenant
   */
  async getSafetyAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await tenantPrisma.notification.findMany({
        where: {
          notificationType: 'CRITICAL_SAFETY_ESCALATION',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const operationalAnpController = new OperationalAnpController();
