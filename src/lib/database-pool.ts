import prisma from './prisma';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface PoolMetrics {
  poolSize: number;
  timeoutMs: number;
  statementTimeoutMs: number;
  activeQueries: number;
  totalQueriesExecuted: number;
  failedQueries: number;
}

export class DatabasePoolManager {
  private activeQueries = 0;
  private totalQueriesExecuted = 0;
  private failedQueries = 0;
  private isShuttingDown = false;

  getMetrics(): PoolMetrics {
    return {
      poolSize: config.database.poolSize,
      timeoutMs: config.database.timeoutMs,
      statementTimeoutMs: config.database.statementTimeoutMs,
      activeQueries: this.activeQueries,
      totalQueriesExecuted: this.totalQueriesExecuted,
      failedQueries: this.failedQueries,
    };
  }

  /**
   * Executes a database operation with metrics tracking and automatic retry on transient connection drops
   */
  async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('[Database Pool] Database is shutting down. New queries rejected.');
    }

    this.activeQueries += 1;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        this.totalQueriesExecuted += 1;
        this.activeQueries = Math.max(0, this.activeQueries - 1);
        return result;
      } catch (err: any) {
        attempt += 1;
        const isTransient =
          err.code === 'P1001' || // Can't reach database server
          err.code === 'P1002' || // Database timeout
          err.message?.includes('Connection lost') ||
          err.message?.includes('ECONNRESET');

        if (isTransient && attempt <= maxRetries) {
          const backoffMs = Math.min(1000, 100 * Math.pow(2, attempt));
          logger.warn(`[Database Pool] Transient error on query. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})`, {
            errorCode: err.code,
            attempt,
          });
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        this.failedQueries += 1;
        this.activeQueries = Math.max(0, this.activeQueries - 1);
        throw err;
      }
    }

    this.activeQueries = Math.max(0, this.activeQueries - 1);
    throw new Error('[Database Pool] Max query retries exceeded.');
  }

  /**
   * Graceful disconnect handling on SIGTERM / SIGINT
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    logger.info('[Database Pool] Closing database connections gracefully...');
    try {
      await prisma.$disconnect();
      logger.info('[Database Pool] All database connections cleanly disconnected.');
    } catch (err: any) {
      logger.error('[Database Pool] Error disconnecting Prisma client:', err);
    }
  }
}

export const databasePoolManager = new DatabasePoolManager();

// Register process exit listeners for zero-downtime container termination
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', async () => {
    logger.info('[Process] Received SIGTERM signal. Initiating graceful shutdown.');
    await databasePoolManager.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('[Process] Received SIGINT signal. Initiating graceful shutdown.');
    await databasePoolManager.disconnect();
    process.exit(0);
  });
}
