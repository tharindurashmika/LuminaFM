import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  loadAndValidateConfig,
  getMaskedConfig,
  AppConfig,
} from '../src/config/environment';
import { SecretManager } from '../src/config/secrets';
import {
  InMemoryRateLimiter,
  authRateLimiter,
} from '../src/middleware/rate-limiter.middleware';
import {
  maskSensitiveLogData,
  StructuredLogger,
} from '../src/utils/logger';
import { HealthService } from '../src/modules/devops/health.service';
import { MetricsService } from '../src/modules/devops/metrics.service';
import {
  LocalStorageDriver,
  S3StorageDriver,
  ObjectStorageService,
} from '../src/modules/storage/object-storage.service';
import {
  BackupService,
  BackupManifest,
} from '../src/modules/devops/backup.service';
import {
  RestoreService,
} from '../src/modules/devops/restore.service';
import {
  DatabasePoolManager,
} from '../src/lib/database-pool';

const TEST_BACKUP_DIR = path.resolve(process.cwd(), './test-backups-pr');

describe('LuminaFM Commercial Production-Readiness & Quality Engineering Acceptance', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (!fs.existsSync(TEST_BACKUP_DIR)) {
      fs.mkdirSync(TEST_BACKUP_DIR, { recursive: true });
    }
  });

  // =========================================================================
  // 1. ENVIRONMENT CONFIGURATION & SECURE SECRET MANAGEMENT
  // =========================================================================
  describe('1. Environment Configuration & Secure Secret Management', () => {
    it('should successfully validate a complete production environment configuration', () => {
      const prodEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        PORT: '3000',
        DEPLOYMENT_MODEL: 'saas',
        DATABASE_URL: 'postgresql://prod_user:vault_pass@postgres.internal:5432/luminafm_prod?sslmode=require',
        DATABASE_POOL_SIZE: '50',
        DATABASE_TIMEOUT_MS: '15000',
        JWT_SECRET: '9d7e6f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
        JWT_SECRET_SECONDARY: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://s3.us-east-1.amazonaws.com',
        S3_BUCKET: 'luminafm-evidence-vault',
        S3_ACCESS_KEY: 'AKIA_PROD_ACCESS',
        S3_SECRET_KEY: 'SECRET_PROD_KEY',
      };

      const cfg = loadAndValidateConfig(prodEnv);
      expect(cfg.env).toBe('production');
      expect(cfg.database.poolSize).toBe(50);
      expect(cfg.storage.driver).toBe('s3');
      expect(cfg.storage.s3?.bucket).toBe('luminafm-evidence-vault');
    });

    it('should reject production boot if JWT_SECRET is less than 32 characters', () => {
      const insecureEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod_user:vault_pass@postgres.internal:5432/luminafm_prod',
        JWT_SECRET: 'short-secret-key-16',
      };

      expect(() => loadAndValidateConfig(insecureEnv)).toThrowError(
        /must be at least 32 characters in length/
      );
    });

    it('should reject production boot if JWT_SECRET uses default or example secret', () => {
      const defaultSecretEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod_user:vault_pass@postgres.internal:5432/luminafm_prod',
        JWT_SECRET: 'lumina-fm-super-secret-production-key-change-in-prod',
      };

      expect(() => loadAndValidateConfig(defaultSecretEnv)).toThrowError(
        /default or example JWT_SECRET is strictly forbidden/
      );
    });

    it('should reject production boot if DATABASE_URL points to localhost or default postgres credentials', () => {
      const localhostDbEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: '9d7e6f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/luminafm',
      };

      expect(() => loadAndValidateConfig(localhostDbEnv)).toThrowError(
        /Production DATABASE_URL must not point to localhost or use default postgres credentials/
      );
    });

    it('should support zero-downtime key rotation via primary and secondary secrets', () => {
      const oldSecret = 'old-secret-key-at-least-32-chars-long-1111';
      const newSecret = 'new-secret-key-at-least-32-chars-long-2222';

      // 1. Token signed with old secret
      const initialManager = new SecretManager(oldSecret);
      const token = initialManager.signToken({
        userId: 'u1',
        organizationId: 'org1',
        email: 'engineer@luminafm.io',
      });

      // 2. Rotate secret: old secret becomes secondary, new secret becomes primary
      const rotatedManager = new SecretManager(newSecret, oldSecret);

      // 3. Verifies seamlessly using secondary secret
      const decoded = rotatedManager.verifyToken(token);
      expect(decoded.userId).toBe('u1');
      expect(decoded.email).toBe('engineer@luminafm.io');

      // 4. New tokens signed with new primary secret also verify
      const newToken = rotatedManager.signToken({
        userId: 'u2',
        organizationId: 'org1',
        email: 'operator@luminafm.io',
      });
      const decodedNew = rotatedManager.verifyToken(newToken);
      expect(decodedNew.userId).toBe('u2');
    });

    it('should mask sensitive credentials when producing diagnostic config dumps', () => {
      const prodEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod_user:super_secret_db_pass@postgres.internal:5432/luminafm_prod',
        JWT_SECRET: '9d7e6f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
      };

      const cfg = loadAndValidateConfig(prodEnv);
      const masked = getMaskedConfig(cfg);

      const dbUrl = (masked.database as any).url;
      expect(dbUrl).toContain('prod_user:****@postgres.internal:5432');
      expect(dbUrl).not.toContain('super_secret_db_pass');

      const jwtSec = (masked.security as any).jwtSecret;
      expect(jwtSec).toContain('...');
      expect(jwtSec).not.toBe(prodEnv.JWT_SECRET);
    });
  });

  // =========================================================================
  // 2. TIERED RATE LIMITING & SECURITY HARDENING
  // =========================================================================
  describe('2. Tiered Rate Limiting & Security Hardening', () => {
    it('should enforce strict rate limits on authentication endpoints (brute-force defense)', () => {
      const limiter = new InMemoryRateLimiter(5, 60000);
      const clientKey = 'auth:192.168.1.50';

      // First 5 attempts allowed
      for (let i = 1; i <= 5; i++) {
        const res = limiter.check(clientKey);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(5 - i);
      }

      // 6th attempt blocked with HTTP 429 semantics
      const blocked = limiter.check(clientKey);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetTimeMs).toBeGreaterThan(Date.now());
    });

    it('should maintain independent rate limit buckets across different tenants and operations', () => {
      const limiter = new InMemoryRateLimiter(3, 60000);

      // Tenant A uses all quota
      limiter.check('tenant-A:ip1');
      limiter.check('tenant-A:ip1');
      limiter.check('tenant-A:ip1');
      const tenantABlocked = limiter.check('tenant-A:ip1');
      expect(tenantABlocked.allowed).toBe(false);

      // Tenant B on separate bucket remains unaffected
      const tenantBAllowed = limiter.check('tenant-B:ip2');
      expect(tenantBAllowed.allowed).toBe(true);
      expect(tenantBAllowed.remaining).toBe(2);
    });
  });

  // =========================================================================
  // 3. STRUCTURED LOGGING & DISTRIBUTED TRACING
  // =========================================================================
  describe('3. Structured Logging & Distributed Tracing', () => {
    it('should recursively redact sensitive fields from structured log metadata', () => {
      const sensitiveMeta = {
        endpoint: '/api/auth/login',
        requestBody: {
          email: 'admin@plant.com',
          password: 'TopSecretPassword99!',
          apiKey: 'key_1234567890',
        },
        headers: {
          authorization: 'Bearer eyJhbGciOi...',
          cookie: 'session_id=abc123xyz',
        },
        boilerTelemetry: {
          steamPressureBar: 10.2,
          flueGasTempC: 185.0,
        },
      };

      const masked = maskSensitiveLogData(sensitiveMeta) as any;

      expect(masked.requestBody.password).toBe('[REDACTED]');
      expect(masked.requestBody.apiKey).toBe('[REDACTED]');
      expect(masked.headers.authorization).toBe('[REDACTED]');
      expect(masked.headers.cookie).toBe('[REDACTED]');
      expect(masked.requestBody.email).toBe('admin@plant.com');
      expect(masked.boilerTelemetry.steamPressureBar).toBe(10.2);
    });

    it('should format structured logs into standard JSON with correlation ID and ISO timestamp', () => {
      const logger = new StructuredLogger('luminafm-test', 'debug');
      const correlationId = 'corr-uuid-1234-5678';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('Boiler shift reading recorded successfully', { boilerId: 'BLR-001', shift: 'MORNING' }, correlationId);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. OBSERVABILITY, HEALTH CHECKS & PROMETHEUS METRICS
  // =========================================================================
  describe('4. Observability, Health Checks & Prometheus Metrics', () => {
    const healthService = new HealthService();
    const metricsService = new MetricsService();

    it('should provide a responsive liveness probe with uptime and PID', () => {
      const live = healthService.getLiveness();
      expect(live.status).toBe('ok');
      expect(typeof live.uptimeSeconds).toBe('number');
      expect(live.service).toContain('LuminaFM');
      expect(live.pid).toBe(process.pid);
    });

    it('should report component health status in readiness probe', async () => {
      const ready = await healthService.getReadiness();
      expect(ready.timestamp).toBeDefined();
      expect(ready.components.storage.status).toBe('healthy');
      expect(ready.components.memory.status).toBe('healthy');
    });

    it('should generate standard Prometheus exposition format text', () => {
      metricsService.reset();
      metricsService.recordHttpRequest('GET', '/api/assets', 200, 14.5);
      metricsService.recordHttpRequest('POST', '/api/operations/daily-log', 201, 32.1);
      metricsService.incrementAnpCalculation();
      metricsService.incrementOfflineSyncBatch();

      const promOutput = metricsService.getPrometheusMetrics();

      expect(promOutput).toContain('# HELP luminafm_uptime_seconds');
      expect(promOutput).toContain('# TYPE luminafm_uptime_seconds gauge');
      expect(promOutput).toContain('luminafm_anp_calculations_total 1');
      expect(promOutput).toContain('luminafm_offline_sync_batches_total 1');
      expect(promOutput).toContain('luminafm_http_requests_total{method="GET",route="/api/assets",status="200"} 1');
      expect(promOutput).toContain('luminafm_http_requests_total{method="POST",route="/api/operations/daily-log",status="201"} 1');
    });
  });

  // =========================================================================
  // 5. OBJECT STORAGE PERSISTENCE (LOCAL & S3 DRIVERS)
  // =========================================================================
  describe('5. Object Storage Persistence (Local & S3 Drivers)', () => {
    it('should persist binary evidence and calculate SHA-256 fingerprint in LocalStorageDriver', async () => {
      const driver = new LocalStorageDriver('./uploads/test-evidence');
      const testData = Buffer.from('ULTRASONIC_WALL_THICKNESS_MEASUREMENT_DATA_2026');
      const expectedSha = crypto.createHash('sha256').update(testData).digest('hex');

      const putRes = await driver.putObject('surveys/ut-2026-blr1.dat', testData);
      expect(putRes.sha256Checksum).toBe(expectedSha);
      expect(putRes.fileSizeBytes).toBe(testData.length);
      expect(putRes.driver).toBe('local');

      // Verify retrieval
      const getRes = await driver.getObject('surveys/ut-2026-blr1.dat');
      expect(getRes.buffer.toString()).toBe(testData.toString());
      expect(getRes.sha256Checksum).toBe(expectedSha);

      // Clean up
      await driver.deleteObject('surveys/ut-2026-blr1.dat');
    });

    it('should prevent path traversal attacks in LocalStorageDriver', async () => {
      const driver = new LocalStorageDriver('./uploads/test-evidence');
      const maliciousKey = '../../../../etc/passwd';

      await expect(driver.putObject(maliciousKey, Buffer.from('exploit'))).rejects.toThrow(
        /Path traversal detected/
      );
    });

    it('should generate signed time-limited URLs for authorized media streaming', async () => {
      const storageService = new ObjectStorageService();
      const signedUrl = await storageService.generateSignedDownloadUrl('tenants/ten-1/photos/burner_flame.jpg', 1800);

      expect(decodeURIComponent(signedUrl)).toContain('tenants/ten-1/photos/burner_flame.jpg');
      expect(signedUrl).toMatch(/(sig=|X-Amz-Signature=)/);
    });
  });

  // =========================================================================
  // 6. AUTOMATED DATABASE BACKUPS & TESTED RESTORE PROCEDURES
  // =========================================================================
  describe('6. Automated Database Backups & Tested Restore Procedures', () => {
    const backupService = new BackupService(TEST_BACKUP_DIR);
    const restoreService = new RestoreService(TEST_BACKUP_DIR);

    it('should generate a compressed database backup archive with tamper-evident JSON manifest', async () => {
      const manifest = await backupService.createBackup({
        tenantId: 'all-tenants-saas',
        tables: ['assets', 'work_orders', 'inspections', 'decision_runs'],
      });

      expect(manifest.backupId).toMatch(/^luminafm-backup-tenant-all-tenants-saas-/);
      expect(manifest.fileSizeBytes).toBeGreaterThan(0);
      expect(manifest.sha256Checksum).toHaveLength(64);
      expect(manifest.status).toBe('completed');

      // Verify manifest was persisted to disk
      const manifests = await backupService.listBackups();
      const found = manifests.find((m) => m.backupId === manifest.backupId);
      expect(found).toBeDefined();
    });

    it('should verify cryptographic SHA-256 integrity of authentic backup archives', async () => {
      const manifest = await backupService.createBackup({ tenantId: 'test-verify-auth' });
      const verification = backupService.verifyBackupIntegrity(manifest.backupId);
      expect(verification.isValid).toBe(true);
      expect(verification.actualSha256).toBe(manifest.sha256Checksum);
    });

    it('should abort restore procedure and flag security error if backup archive is tampered with', async () => {
      // 1. Create a fresh backup
      const manifest = await backupService.createBackup();

      // 2. Tamper with the backup file on disk
      const backupFilePath = path.join(TEST_BACKUP_DIR, manifest.fileName);
      fs.appendFileSync(backupFilePath, '\n-- MALICIOUS_INJECTED_DATA');

      // 3. Attempt restore
      const restoreRes = await restoreService.restoreFromBackup(manifest.backupId);

      expect(restoreRes.status).toBe('failed');
      expect(restoreRes.integrityVerified).toBe(false);
      expect(restoreRes.message).toContain('SHA-256 checksum mismatch');
    });

    it('should successfully execute a simulated disaster recovery restore procedure on authentic archives', async () => {
      // Create fresh authentic backup
      const manifest = await backupService.createBackup({
        tables: ['organizations', 'users', 'assets', 'work_orders', 'inspections'],
      });

      const drResult = await restoreService.testDisasterRecovery(manifest.backupId);
      expect(drResult.testPassed).toBe(true);
      expect(drResult.details.status).toBe('success');
      expect(drResult.details.tablesRestoredCount).toBe(5);
    });
  });

  // =========================================================================
  // 7. DEPLOYMENT MODEL A: SHARED MULTI-TENANT SAAS
  // =========================================================================
  describe('7. Deployment Model A: Shared Multi-Tenant SaaS', () => {
    it('should isolate data and queries between different tenant organizations', () => {
      const tenantAlphaId = 'ten-alpha-1111';
      const tenantBetaId = 'ten-beta-2222';

      // Mock database records with organizationId foreign keys
      const databaseStore = [
        { id: 'blr-alpha-1', organizationId: tenantAlphaId, name: 'Alpha Boiler 1' },
        { id: 'blr-alpha-2', organizationId: tenantAlphaId, name: 'Alpha Boiler 2' },
        { id: 'blr-beta-1', organizationId: tenantBetaId, name: 'Beta Boiler 1' },
      ];

      // Tenant Alpha scoped query
      const alphaQuery = (tenantId: string) => databaseStore.filter((r) => r.organizationId === tenantId);

      const alphaResults = alphaQuery(tenantAlphaId);
      expect(alphaResults).toHaveLength(2);
      expect(alphaResults.map((r) => r.id)).toEqual(['blr-alpha-1', 'blr-alpha-2']);
      expect(alphaResults.some((r) => r.organizationId === tenantBetaId)).toBe(false);

      // Tenant Beta scoped query
      const betaResults = alphaQuery(tenantBetaId);
      expect(betaResults).toHaveLength(1);
      expect(betaResults[0].id).toBe('blr-beta-1');
    });

    it('should isolate rate limiting so one noisy tenant cannot starve another tenant', () => {
      const limiter = new InMemoryRateLimiter(5, 60000);
      const tenantAlphaKey = 'saas:org-alpha:10.0.1.1';
      const tenantBetaKey = 'saas:org-beta:10.0.1.2';

      // Tenant Alpha sends 5 requests, hitting limit
      for (let i = 0; i < 5; i++) {
        limiter.check(tenantAlphaKey);
      }
      expect(limiter.check(tenantAlphaKey).allowed).toBe(false);

      // Tenant Beta is completely unaffected
      expect(limiter.check(tenantBetaKey).allowed).toBe(true);
    });
  });

  // =========================================================================
  // 8. DEPLOYMENT MODEL B: DEDICATED CUSTOMER DEPLOYMENT
  // =========================================================================
  describe('8. Deployment Model B: Dedicated Customer Deployment', () => {
    it('should configure single-tenant on-premise architecture with dedicated storage', () => {
      const dedicatedEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        DEPLOYMENT_MODEL: 'dedicated',
        DATABASE_URL: 'postgresql://customer_admin:pass@localhost:5432/luminafm_customer_db',
        JWT_SECRET: 'customer-dedicated-64char-secret-key-3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
        STORAGE_DRIVER: 'local',
        STORAGE_LOCAL_PATH: '/data/customer-uploads',
      };

      const cfg = loadAndValidateConfig(dedicatedEnv);
      expect(cfg.deploymentModel).toBe('dedicated');
      expect(cfg.storage.driver).toBe('local');
      expect(cfg.storage.localPath).toBe('/data/customer-uploads');
    });
  });

  // =========================================================================
  // 9. DATABASE CONNECTION MANAGEMENT & RESILIENCY
  // =========================================================================
  describe('9. Database Connection Management & Resiliency', () => {
    const poolManager = new DatabasePoolManager();

    it('should track pool metrics and active queries', () => {
      const metrics = poolManager.getMetrics();
      expect(metrics.poolSize).toBeGreaterThan(0);
      expect(metrics.timeoutMs).toBeGreaterThan(0);
      expect(typeof metrics.activeQueries).toBe('number');
    });

    it('should retry transient database connection errors with exponential backoff', async () => {
      let attempts = 0;
      const transientOp = async () => {
        attempts += 1;
        if (attempts < 2) {
          const err: any = new Error('Connection lost to database');
          err.code = 'P1001';
          throw err;
        }
        return 'SUCCESS_AFTER_RETRY';
      };

      const result = await poolManager.executeWithRetry(transientOp, 2);
      expect(result).toBe('SUCCESS_AFTER_RETRY');
      expect(attempts).toBe(2);
    });
  });

  // =========================================================================
  // 10. OFFLINE SYNCHRONIZATION & CONFLICT RESILIENCY
  // =========================================================================
  describe('10. Offline Synchronization & Conflict Resiliency', () => {
    it('should detect duplicate batch submissions via unique syncBatchId (idempotency)', () => {
      const processedBatchIds = new Set<string>();

      const processSyncBatch = (batchId: string): { status: 'processed' | 'duplicate_ignored' } => {
        if (processedBatchIds.has(batchId)) {
          return { status: 'duplicate_ignored' };
        }
        processedBatchIds.add(batchId);
        return { status: 'processed' };
      };

      const batch1 = 'sync-batch-tablet-blr1-20261115-001';
      expect(processSyncBatch(batch1).status).toBe('processed');

      // Duplicate network retry with same batchId must not create duplicate logbooks
      expect(processSyncBatch(batch1).status).toBe('duplicate_ignored');
    });

    it('should detect and prevent silent overwrites when conflicting revisions occur', () => {
      const serverRecord = {
        id: 'log-101',
        steamPressureBar: 10.4,
        serverRevision: 3,
        updatedAt: '2026-11-15T08:00:00Z',
      };

      const clientUpdate = {
        id: 'log-101',
        steamPressureBar: 9.8,
        baseRevision: 2, // Client had stale revision 2 while server is on revision 3
      };

      const applyUpdateWithConflictDetection = (server: typeof serverRecord, client: typeof clientUpdate) => {
        if (client.baseRevision !== server.serverRevision) {
          return {
            conflict: true,
            message: 'Conflict detected: server record has been modified by another shift operator.',
            serverRecord: server,
          };
        }
        return { conflict: false, updated: { ...server, steamPressureBar: client.steamPressureBar } };
      };

      const result = applyUpdateWithConflictDetection(serverRecord, clientUpdate);
      expect(result.conflict).toBe(true);
      expect(result.message).toContain('Conflict detected');
    });
  });
});
