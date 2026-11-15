import { Router, Request, Response } from 'express';
import { healthService } from './health.service';
import { metricsService } from './metrics.service';
import { backupService } from './backup.service';
import { restoreService } from './restore.service';
import { databasePoolManager } from '../../lib/database-pool';

export const devopsRouter = Router();

// =============================================================================
// 1. PUBLIC OBSERVABILITY & ORCHESTRATION PROBES
// =============================================================================

// Standard Kubernetes / Docker liveness probe
devopsRouter.get('/health/live', (_req: Request, res: Response) => {
  const liveness = healthService.getLiveness();
  res.status(200).json(liveness);
});

// Standard Kubernetes / Docker readiness probe (503 on unready database/storage)
devopsRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const readiness = await healthService.getReadiness();
  const statusCode = readiness.status === 'ready' ? 200 : 503;
  res.status(statusCode).json(readiness);
});

// Prometheus scraping endpoint
devopsRouter.get('/metrics', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metricsService.getPrometheusMetrics());
});

// =============================================================================
// 2. DIAGNOSTICS & SYSTEM DASHBOARD
// =============================================================================

devopsRouter.get('/api/diagnostics/health', async (_req: Request, res: Response) => {
  const diagnostics = await healthService.getDiagnostics();
  res.status(200).json(diagnostics);
});

devopsRouter.get('/api/devops/pool-metrics', (_req: Request, res: Response) => {
  const metrics = databasePoolManager.getMetrics();
  res.status(200).json(metrics);
});

// =============================================================================
// 3. AUTOMATED DATABASE BACKUPS & DISASTER RECOVERY
// =============================================================================

devopsRouter.get('/api/devops/backups', async (_req: Request, res: Response) => {
  const backups = await backupService.listBackups();
  res.status(200).json({ backups });
});

devopsRouter.post('/api/devops/backups', async (req: Request, res: Response) => {
  try {
    const manifest = await backupService.createBackup({
      tenantId: req.body?.tenantId,
      tables: req.body?.tables,
    });
    res.status(201).json({
      message: 'Backup archive created successfully.',
      manifest,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'BACKUP_FAILED',
      message: err.message,
    });
  }
});

devopsRouter.post('/api/devops/backups/:id/restore', async (req: Request, res: Response) => {
  try {
    const backupId = String(req.params.id);
    const result = await restoreService.restoreFromBackup(backupId, {
      targetDatabase: req.body?.targetDatabase,
      dryRun: req.body?.dryRun,
    });
    const statusCode = result.status === 'success' ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'RESTORE_FAILED',
      message: err.message,
    });
  }
});

devopsRouter.get('/api/devops/backups/:id/verify', (req: Request, res: Response) => {
  try {
    const backupId = String(req.params.id);
    const verification = backupService.verifyBackupIntegrity(backupId);
    res.status(200).json(verification);
  } catch (err: any) {
    res.status(404).json({
      error: 'VERIFICATION_FAILED',
      message: err.message,
    });
  }
});

export default devopsRouter;
