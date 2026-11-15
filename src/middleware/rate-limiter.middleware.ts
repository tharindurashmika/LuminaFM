import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

interface RateLimitRecord {
  count: number;
  resetTimeMs: number;
}

export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodically prune expired entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetTimeMs) {
          this.store.delete(key);
        }
      }
    }, 30000).unref();
  }

  public check(key: string): { allowed: boolean; remaining: number; resetTimeMs: number; limit: number } {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.resetTimeMs) {
      record = {
        count: 1,
        resetTimeMs: now + this.windowMs,
      };
      this.store.set(key, record);
      return {
        allowed: true,
        remaining: Math.max(0, this.maxRequests - 1),
        resetTimeMs: record.resetTimeMs,
        limit: this.maxRequests,
      };
    }

    record.count += 1;
    const allowed = record.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - record.count);

    return {
      allowed,
      remaining,
      resetTimeMs: record.resetTimeMs,
      limit: this.maxRequests,
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

// Instantiate limiters according to config
export const authRateLimiter = new InMemoryRateLimiter(config.rateLimiting.authMax, 60000);
export const standardRateLimiter = new InMemoryRateLimiter(config.rateLimiting.standardMax, 60000);
export const operationsRateLimiter = new InMemoryRateLimiter(config.rateLimiting.operationsMax, 60000);

export function createRateLimiterMiddleware(limiter: InMemoryRateLimiter, category = 'standard') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.rateLimiting.enabled) {
      return next();
    }

    // Determine key: prioritize authenticated tenant/user, then client IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const tenantId = (req as any).user?.organizationId || '';
    const key = tenantId ? `${category}:${tenantId}:${clientIp}` : `${category}:${clientIp}`;

    const result = limiter.check(key);

    const now = Date.now();
    const retryAfterSec = Math.max(1, Math.ceil((result.resetTimeMs - now) / 1000));

    res.setHeader('RateLimit-Limit', result.limit.toString());
    res.setHeader('RateLimit-Remaining', result.remaining.toString());
    res.setHeader('RateLimit-Reset', retryAfterSec.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests for ${category} operations. Please retry after ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
      });
      return;
    }

    next();
  };
}

export const authRateLimitMiddleware = createRateLimiterMiddleware(authRateLimiter, 'auth');
export const standardRateLimitMiddleware = createRateLimiterMiddleware(standardRateLimiter, 'standard');
export const operationsRateLimitMiddleware = createRateLimiterMiddleware(operationsRateLimiter, 'operations');
