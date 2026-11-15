/**
 * Specialized Boiler Maintenance Controller
 */

import { Request, Response, NextFunction } from 'express';
import { boilerService } from './boiler.service';
import {
  BOILER_PHYSICAL_SUBSYSTEMS,
  BOILER_MEASUREMENT_POINTS,
  BOILER_WALKTHROUGH_CHECKPOINTS,
  BOILER_RESEARCH_SCOPE,
} from './boiler.constants';

/**
 * Safely extracts a route parameter as a single string.
 */
function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class BoilerController {
  /**
   * GET /api/boiler/catalog/benchmarks
   * Returns empirical research scope, 7 subsystems, measurement definitions, and checkpoints.
   */
  async getCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        researchScope: BOILER_RESEARCH_SCOPE,
        subsystems: BOILER_PHYSICAL_SUBSYSTEMS,
        measurementPoints: BOILER_MEASUREMENT_POINTS,
        walkthroughCheckpoints: BOILER_WALKTHROUGH_CHECKPOINTS,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler/:assetId/profile
   */
  async createOrUpdateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const profile = await boilerService.createOrUpdateBoilerProfile(
        assetId,
        req.body,
        (req as any).user?.userId
      );
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/boiler/:assetId/profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const profile = await boilerService.getBoilerProfile(assetId);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler/:assetId/shift-logs
   */
  async submitShiftLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const result = await boilerService.submitBoilerShiftLog(
        assetId,
        req.body,
        (req as any).user?.userId
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/boiler/:assetId/shift-logs?date=YYYY-MM-DD
   */
  async getDailyLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const logs = await boilerService.getBoilerDailyLogs(assetId, date);
      res.status(200).json(logs);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler/:assetId/walkthrough
   */
  async submitWalkthrough(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const result = await boilerService.submitBoilerWalkthroughInspection(
        assetId,
        req.body,
        (req as any).user?.userId
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler/:assetId/observations
   */
  async logObservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const observation = await boilerService.logBoilerObservation(
        assetId,
        req.body,
        (req as any).user?.userId
      );
      res.status(201).json(observation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/boiler/:assetId/observations
   */
  async listObservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const observations = await boilerService.listBoilerObservations(assetId);
      res.status(200).json(observations);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler/:assetId/faults
   */
  async reportFault(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const result = await boilerService.reportBoilerFault(
        assetId,
        req.body,
        (req as any).user?.userId
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/boiler/:assetId/history
   */
  async getMaintenanceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const history = await boilerService.getBoilerMaintenanceHistory(assetId);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/boiler/:assetId/attachments
   */
  async attachEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const attachment = await boilerService.attachBoilerEvidence(
        assetId,
        req.body,
        (req as any).user?.userId
      );
      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/boiler/:assetId/attachments
   */
  async listAttachments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = getParam(req.params.assetId);
      const entityType = req.query.entityType as string | undefined;
      const entityId = (req.query.entityId as string) || assetId;
      const attachments = await boilerService.listBoilerAttachments(
        assetId,
        entityType,
        entityId
      );
      res.status(200).json(attachments);
    } catch (err) {
      next(err);
    }
  }
}

export const boilerController = new BoilerController();
