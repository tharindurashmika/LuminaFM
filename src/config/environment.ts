import 'dotenv/config';
import crypto from 'node:crypto';

export type DeploymentModel = 'saas' | 'dedicated';
export type StorageDriver = 'local' | 's3';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'json' | 'pretty';

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  deploymentModel: DeploymentModel;
  corsAllowedOrigins: string[];

  database: {
    url: string;
    poolSize: number;
    timeoutMs: number;
    statementTimeoutMs: number;
  };

  security: {
    jwtSecret: string;
    jwtSecretSecondary?: string;
    jwtExpiresIn: string;
  };

  storage: {
    driver: StorageDriver;
    localPath: string;
    s3?: {
      endpoint: string;
      region: string;
      bucket: string;
      accessKey: string;
      secretKey: string;
      useSsl: boolean;
    };
  };

  rateLimiting: {
    enabled: boolean;
    redisUrl?: string;
    authMax: number;
    standardMax: number;
    operationsMax: number;
  };

  backup: {
    storagePath: string;
    retentionDays: number;
    cronSchedule: string;
    compressionLevel: number;
  };

  logging: {
    level: LogLevel;
    format: LogFormat;
  };

  metrics: {
    prometheusEnabled: boolean;
  };
}

const INSECURE_DEFAULT_SECRETS = new Set([
  'lumina-fm-super-secret-production-key-change-in-prod',
  'change-in-prod',
  'secret',
  'password',
  '12345678',
  'luminafm_secret_2026',
]);

/**
 * Validates and freezes application configuration from environment variables.
 * Enforces production-readiness security gates.
 */
export function loadAndValidateConfig(envSource: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = (envSource.NODE_ENV || 'development') as 'development' | 'test' | 'production';
  const port = parseInt(envSource.PORT || '3000', 10);
  const host = envSource.HOST || '0.0.0.0';
  const deploymentModel = (envSource.DEPLOYMENT_MODEL === 'dedicated' ? 'dedicated' : 'saas') as DeploymentModel;

  const corsOrigins = envSource.CORS_ALLOWED_ORIGINS
    ? envSource.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['*'];

  const dbUrl = envSource.DATABASE_URL || 'postgresql://luminafm:luminafm_secret_2026@localhost:5432/luminafm_db?schema=public';
  const dbPoolSize = parseInt(envSource.DATABASE_POOL_SIZE || (env === 'production' ? '50' : '10'), 10);
  const dbTimeoutMs = parseInt(envSource.DATABASE_TIMEOUT_MS || '10000', 10);
  const dbStatementTimeoutMs = parseInt(envSource.DATABASE_STATEMENT_TIMEOUT_MS || '30000', 10);

  const jwtSecret = envSource.JWT_SECRET || 'lumina-fm-super-secret-production-key-change-in-prod';
  const jwtSecretSecondary = envSource.JWT_SECRET_SECONDARY || undefined;
  const jwtExpiresIn = envSource.JWT_EXPIRES_IN || (env === 'production' ? '12h' : '24h');

  const storageDriver = (envSource.STORAGE_DRIVER === 's3' ? 's3' : 'local') as StorageDriver;
  const storageLocalPath = envSource.STORAGE_LOCAL_PATH || './uploads';

  // Production Security Validation Gates
  if (env === 'production') {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('[Security Config Error] In production, JWT_SECRET must be at least 32 characters in length.');
    }

    if (INSECURE_DEFAULT_SECRETS.has(jwtSecret.toLowerCase()) || jwtSecret.includes('change-in-prod')) {
      throw new Error('[Security Config Error] In production, default or example JWT_SECRET is strictly forbidden.');
    }

    if (dbUrl.includes('postgres:postgres') || (deploymentModel === 'saas' && dbUrl.includes('localhost'))) {
      throw new Error('[Security Config Error] Production DATABASE_URL must not point to localhost or use default postgres credentials.');
    }

    if (storageDriver === 's3') {
      if (!envSource.S3_BUCKET || !envSource.S3_ACCESS_KEY || !envSource.S3_SECRET_KEY) {
        throw new Error('[Storage Config Error] Production S3 storage driver requires S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY.');
      }
    }
  }

  const config: AppConfig = {
    env,
    port,
    host,
    deploymentModel,
    corsAllowedOrigins: corsOrigins,
    database: {
      url: dbUrl,
      poolSize: dbPoolSize,
      timeoutMs: dbTimeoutMs,
      statementTimeoutMs: dbStatementTimeoutMs,
    },
    security: {
      jwtSecret,
      jwtSecretSecondary,
      jwtExpiresIn,
    },
    storage: {
      driver: storageDriver,
      localPath: storageLocalPath,
      s3:
        storageDriver === 's3'
          ? {
              endpoint: envSource.S3_ENDPOINT || 'https://s3.us-east-1.amazonaws.com',
              region: envSource.S3_REGION || 'us-east-1',
              bucket: envSource.S3_BUCKET || 'luminafm-evidence-vault',
              accessKey: envSource.S3_ACCESS_KEY || '',
              secretKey: envSource.S3_SECRET_KEY || '',
              useSsl: envSource.S3_USE_SSL !== 'false',
            }
          : undefined,
    },
    rateLimiting: {
      enabled: envSource.RATE_LIMIT_ENABLED !== 'false',
      redisUrl: envSource.REDIS_URL,
      authMax: parseInt(envSource.RATE_LIMIT_AUTH_MAX || '10', 10),
      standardMax: parseInt(envSource.RATE_LIMIT_STANDARD_MAX || '300', 10),
      operationsMax: parseInt(envSource.RATE_LIMIT_OPERATIONS_MAX || '1000', 10),
    },
    backup: {
      storagePath: envSource.BACKUP_STORAGE_PATH || './backups',
      retentionDays: parseInt(envSource.BACKUP_RETENTION_DAYS || '30', 10),
      cronSchedule: envSource.BACKUP_CRON_SCHEDULE || '0 2 * * *',
      compressionLevel: parseInt(envSource.BACKUP_COMPRESSION_LEVEL || '6', 10),
    },
    logging: {
      level: (envSource.LOG_LEVEL || (env === 'production' ? 'info' : 'debug')) as LogLevel,
      format: (envSource.LOG_FORMAT || (env === 'production' ? 'json' : 'pretty')) as LogFormat,
    },
    metrics: {
      prometheusEnabled: envSource.PROMETHEUS_METRICS_ENABLED !== 'false',
    },
  };

  return Object.freeze(config);
}

/**
 * Global singleton application configuration
 */
export const config: AppConfig = loadAndValidateConfig();

/**
 * Returns a safely masked version of the configuration suitable for logging
 */
export function getMaskedConfig(cfg: AppConfig = config): Record<string, unknown> {
  const maskString = (val?: string): string => {
    if (!val) return '[NOT_SET]';
    if (val.length <= 8) return '****';
    return `${val.slice(0, 3)}...${val.slice(-3)} (${val.length} chars)`;
  };

  return {
    env: cfg.env,
    port: cfg.port,
    host: cfg.host,
    deploymentModel: cfg.deploymentModel,
    corsAllowedOrigins: cfg.corsAllowedOrigins,
    database: {
      url: cfg.database.url.replace(/:([^:@]+)@/, ':****@'),
      poolSize: cfg.database.poolSize,
      timeoutMs: cfg.database.timeoutMs,
    },
    security: {
      jwtSecret: maskString(cfg.security.jwtSecret),
      jwtSecretSecondary: maskString(cfg.security.jwtSecretSecondary),
      jwtExpiresIn: cfg.security.jwtExpiresIn,
    },
    storage: {
      driver: cfg.storage.driver,
      localPath: cfg.storage.localPath,
      s3Bucket: cfg.storage.s3?.bucket,
      s3Endpoint: cfg.storage.s3?.endpoint,
      s3AccessKey: maskString(cfg.storage.s3?.accessKey),
    },
    rateLimiting: {
      enabled: cfg.rateLimiting.enabled,
      authMax: cfg.rateLimiting.authMax,
      standardMax: cfg.rateLimiting.standardMax,
      operationsMax: cfg.rateLimiting.operationsMax,
    },
    backup: {
      storagePath: cfg.backup.storagePath,
      retentionDays: cfg.backup.retentionDays,
    },
    logging: cfg.logging,
    metrics: cfg.metrics,
  };
}
