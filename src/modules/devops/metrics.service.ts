import { config } from '../../config/environment';

export class MetricsService {
  private requestCounts = new Map<string, number>();
  private requestDurations = new Map<string, number[]>();
  private anpCalculationsCount = 0;
  private offlineSyncBatchesCount = 0;

  recordHttpRequest(method: string, route: string, status: number, durationMs: number): void {
    const key = `${method.toUpperCase()}_${route}_${status}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    const durKey = `${method.toUpperCase()}_${route}`;
    const list = this.requestDurations.get(durKey) || [];
    list.push(durationMs / 1000);
    if (list.length > 100) list.shift(); // Keep last 100 samples
    this.requestDurations.set(durKey, list);
  }

  incrementAnpCalculation(): void {
    this.anpCalculationsCount += 1;
  }

  incrementOfflineSyncBatch(): void {
    this.offlineSyncBatchesCount += 1;
  }

  /**
   * Generates standard Prometheus exposition text format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const mem = process.memoryUsage();

    lines.push('# HELP luminafm_uptime_seconds Total application uptime in seconds.');
    lines.push('# TYPE luminafm_uptime_seconds gauge');
    lines.push(`luminafm_uptime_seconds ${Math.floor(process.uptime())}`);

    lines.push('# HELP luminafm_process_memory_bytes Memory usage of the Node.js process in bytes.');
    lines.push('# TYPE luminafm_process_memory_bytes gauge');
    lines.push(`luminafm_process_memory_bytes{type="rss"} ${mem.rss}`);
    lines.push(`luminafm_process_memory_bytes{type="heapTotal"} ${mem.heapTotal}`);
    lines.push(`luminafm_process_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);

    lines.push('# HELP luminafm_anp_calculations_total Total ANP decision model mathematical calculations executed.');
    lines.push('# TYPE luminafm_anp_calculations_total counter');
    lines.push(`luminafm_anp_calculations_total ${this.anpCalculationsCount}`);

    lines.push('# HELP luminafm_offline_sync_batches_total Total offline sync batches processed.');
    lines.push('# TYPE luminafm_offline_sync_batches_total counter');
    lines.push(`luminafm_offline_sync_batches_total ${this.offlineSyncBatchesCount}`);

    lines.push('# HELP luminafm_http_requests_total Total number of HTTP requests processed.');
    lines.push('# TYPE luminafm_http_requests_total counter');
    for (const [key, count] of this.requestCounts.entries()) {
      const [method, route, status] = key.split('_');
      lines.push(`luminafm_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }

    return lines.join('\n') + '\n';
  }

  reset(): void {
    this.requestCounts.clear();
    this.requestDurations.clear();
    this.anpCalculationsCount = 0;
    this.offlineSyncBatchesCount = 0;
  }
}

export const metricsService = new MetricsService();
