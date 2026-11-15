import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract or generate unique correlation ID for distributed tracing
  const correlationId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Request-Id', correlationId);

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const tenantId = (req as any).user?.organizationId;
    const userId = (req as any).user?.userId;

    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      clientIp: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,
      userAgent: req.headers['user-agent'],
      tenantId,
      userId,
    };

    const logMessage = `HTTP ${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 500) {
      logger.error(logMessage, undefined, meta, correlationId);
    } else if (statusCode >= 400) {
      logger.warn(logMessage, meta, undefined, correlationId);
    } else {
      logger.info(logMessage, meta, correlationId);
    }
  });

  next();
}
