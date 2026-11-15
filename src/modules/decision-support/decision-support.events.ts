import { EventEmitter } from 'node:events';
import { TelemetrySignalInput } from './anp.engine';

export interface DailyLogSubmittedEventPayload {
  organizationId: string;
  assetId?: string | null;
  locationId?: string | null;
  workOrderId?: string | null;
  inspectionId: string;
  inspectionNumber: string;
  checklistTemplateId: string;
  operatorUserId?: string | null;
  autoDraftWorkOrder?: boolean;
  signals: TelemetrySignalInput[];
}

export type DailyLogListener = (
  payload: DailyLogSubmittedEventPayload
) => Promise<unknown> | unknown;

class DecisionSupportEventBus extends EventEmitter {
  private asyncListeners: DailyLogListener[] = [];

  /**
   * Registers an async listener that evaluates incoming Daily Log submissions.
   */
  registerDailyLogEvaluator(listener: DailyLogListener): void {
    this.asyncListeners.push(listener);
    this.on('daily-log:submitted', listener);
  }

  /**
   * Clears custom evaluators (useful in isolated unit tests).
   */
  clearDailyLogEvaluators(): void {
    this.asyncListeners = [];
    this.removeAllListeners('daily-log:submitted');
  }

  /**
   * Emits the `daily-log:submitted` event and awaits all registered ANP evaluators.
   */
  async emitDailyLogSubmitted(
    payload: DailyLogSubmittedEventPayload
  ): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const listener of this.asyncListeners) {
      const res = await listener(payload);
      if (res !== undefined && res !== null) {
        results.push(res);
      }
    }
    return results;
  }
}

export const decisionSupportEventBus = new DecisionSupportEventBus();

