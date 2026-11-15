/**
 * Specialized Boiler Daily Logbook & Traceable Amendments Controller
 */

import { Request, Response, NextFunction } from 'express';
import { boilerLogbookService } from './boiler-logbook.service';
import { auditAndAttachmentsService } from '../audit/audit.service';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class BoilerLogbookController {
  /**
   * GET /api/boiler-logbooks/boilers
   * Lists available boiler equipment for operator assignment and selection.
   */
  async listBoilers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const boilers = await boilerLogbookService.listAssignedBoilers();
      res.status(200).json(boilers);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler-logbooks
   * Saves a daily logbook entry (supports status 'draft' or 'completed').
   */
  async saveLogbook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operatorUserId = (req as any).user?.userId;
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.clientSubmissionId;
      const payload = {
        ...req.body,
        clientSubmissionId: idempotencyKey || req.body?.clientSubmissionId,
      };
      const result = await boilerLogbookService.saveDailyLogbook(payload, operatorUserId);
      res.status(201).json(result);
    } catch (err: any) {
      if (err?.code === 'OPERATIONAL_SYNC_CONFLICT') {
        res.status(409).json({
          code: 'OPERATIONAL_SYNC_CONFLICT',
          message: err.message,
          serverRecord: err.serverRecord,
          clientSubmissionId: err.clientSubmissionId,
        });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/boiler-logbooks
   * Lists previous daily logbook records with filtering.
   */
  async listLogbooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        assetId: req.query.assetId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        shift: req.query.shift as any,
        status: req.query.status as any,
        operatorId: req.query.operatorId as string | undefined,
      };
      const list = await boilerLogbookService.listDailyLogbooks(filters);
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/boiler-logbooks/:id
   * Retrieves full details of a specific logbook entry including readings,
   * checklists, observations, attachments, and amendments history.
   */
  async getLogbookById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const logbook = await boilerLogbookService.getDailyLogbookById(id);
      res.status(200).json(logbook);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler-logbooks/:id/submit
   * Submits a draft logbook (runs required measurements validation).
   */
  async submitDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const operatorUserId = (req as any).user?.userId;
      const completed = await boilerLogbookService.submitDraftLogbook(id, operatorUserId);
      res.status(200).json(completed);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler-logbooks/:id/amendments
   * Records a traceable amendment for an operational reading.
   * Strictly requires a non-empty explanation reason.
   */
  async recordAmendment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const operatorUserId = (req as any).user?.userId;
      const updated = await boilerLogbookService.amendLogbookReading(
        id,
        req.body,
        operatorUserId
      );
      res.status(201).json(updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler-logbooks/:id/attachments
   * Uploads and links a supporting photograph to the logbook.
   */
  async uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const operatorUserId = (req as any).user?.userId;
      const attachment = await auditAndAttachmentsService.uploadAndLinkAttachment({
        fileName: req.body.fileName,
        storageUri: req.body.storageUri,
        mimeType: req.body.mimeType || 'image/jpeg',
        fileSizeBytes: req.body.fileSizeBytes,
        uploadedBy: operatorUserId,
        entityType: 'boiler_logbook',
        entityId: id,
      });
      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  }
}

export const boilerLogbookController = new BoilerLogbookController();
