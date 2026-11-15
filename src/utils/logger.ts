import { config, LogLevel } from '../config/environment';

export interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  environment: string;
  message: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_LOG_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'creditcard',
  'ssn',
]);

/**
 * Recursively masks sensitive fields in log metadata
 */
export function maskSensitiveLogData(data: unknown, depth = 0): unknown {
  if (depth > 6 || data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveLogData(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SENSITIVE_LOG_KEYS.has(normalizedKey)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = maskSensitiveLogData(val, depth + 1);
    }
  }
  return result;
}

export class StructuredLogger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName = 'luminafm-backend', minLevel = config.logging.level) {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private formatMessage(
    level: string,
    message: string,
    meta?: Record<string, unknown>,
    err?: Error,
    correlationId?: string
  ): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      environment: config.env,
      message,
      correlationId,
      meta: meta ? (maskSensitiveLogData(meta) as Record<string, unknown>) : undefined,
    };

    if (err) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: config.env === 'production' ? err.stack?.split('\n').slice(0, 5).join('\n') : err.stack,
      };
    }

    if (config.logging.format === 'json') {
      return JSON.stringify(entry);
    }

    // Pretty console format for development
    const metaStr = meta ? ` ${JSON.stringify(maskSensitiveLogData(meta))}` : '';
    const errStr = err ? ` [${err.name}: ${err.message}]` : '';
    const corrStr = correlationId ? ` [cid=${correlationId.slice(0, 8)}]` : '';
    return `[${entry.timestamp}] ${entry.level}${corrStr} ${entry.message}${metaStr}${errStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>, correlationId?: string): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('DEBUG', message, meta, undefined, correlationId));
    }
  }

  info(message: string, meta?: Record<string, unknown>, correlationId?: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('INFO', message, meta, undefined, correlationId));
    }
  }

  warn(message: string, meta?: Record<string, unknown>, err?: Error, correlationId?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('WARN', message, meta, err, correlationId));
    }
  }

  error(message: string, err?: Error, meta?: Record<string, unknown>, correlationId?: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('ERROR', message, meta, err, correlationId));
    }
  }

  fatal(message: string, err?: Error, meta?: Record<string, unknown>, correlationId?: string): void {
    console.error(this.formatMessage('FATAL', message, meta, err, correlationId));
  }
}

export const logger = new StructuredLogger();
