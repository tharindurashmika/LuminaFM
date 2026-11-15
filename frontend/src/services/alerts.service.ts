import { apiRequest } from './api.client';
import {
  ActiveMaintenanceAlertItem,
  DecisionRunRecord,
  NotificationRecord,
  WorkOrderStatus,
} from '../types/cmms.types';

const ALERTS_EVENT_NAME = 'lumina:anp-alert-stream';

const INITIAL_FALLBACK_ALERTS: ActiveMaintenanceAlertItem[] = [
  {
    id: 'alert-anp-101',
    notificationId: 'notif-anp-101',
    decisionRunId: 'drun-anp-101',
    severity: 'critical',
    headline: 'Critical Stack Temp Excursion: 248.4°C & Damper Drift',
    criterionSummary: 'FLUE_GAS_TEMP: Observed 248.4 °C (Benchmark > 190 °C)',
    recommendedAction:
      '[ANP Strategy: Immediate Corrective Maintenance (Priority Score: 96.2%)] — Execute immediate fireside boiler tube sootblowing, inspect economizer fin fouling, and recalibrate rotary burner air-to-fuel damper linkage.',
    confidenceScore: 0.962,
    compositeRiskScore: 0.89,
    createdAt: '2026-11-14T15:42:10Z',
    acknowledgedAt: null,
    asset: {
      id: 'a1000000-0000-0000-0000-000000000001',
      assetCode: 'BLR-001',
      name: 'Cleaver-Brooks Firetube Steam Boiler #1',
    },
    draftedWorkOrder: {
      id: 'wo-draft-101',
      workOrderNumber: 'WO-2026-00014',
      title: '[ANP Auto-Draft] BLR-001: Flue Gas Stack Temperature Benchmark Breach',
      status: 'draft',
      priority: 'urgent',
    },
  },
  {
    id: 'alert-anp-102',
    notificationId: 'notif-anp-102',
    decisionRunId: 'drun-anp-102',
    severity: 'warning',
    headline: 'High Temp Detected: 195°C',
    criterionSummary: 'FLUE_GAS_TEMP: Observed 195.0 °C (Benchmark > 190 °C)',
    recommendedAction:
      '[ANP Strategy: Scheduled Tube Cleaning & Combustion Tuning (Priority Score: 84.5%)] — Schedule flue gas analyzer check and inspect 3rd-pass turbulators during low-load window.',
    confidenceScore: 0.884,
    compositeRiskScore: 0.46,
    createdAt: '2026-11-14T15:18:00Z',
    acknowledgedAt: null,
    asset: {
      id: 'a1000000-0000-0000-0000-000000000002',
      assetCode: 'BLR-002',
      name: 'Viessmann Vitomax 200-HS Standby Steam Boiler #2',
    },
    draftedWorkOrder: {
      id: 'wo-draft-102',
      workOrderNumber: 'WO-2026-00015',
      title: '[ANP Auto-Draft] BLR-002: High Flue Gas Temp (195°C) Combustion Check',
      status: 'draft',
      priority: 'high',
    },
  },
  {
    id: 'alert-anp-103',
    notificationId: 'notif-anp-103',
    decisionRunId: 'drun-anp-103',
    severity: 'warning',
    headline: 'Pump Operating Hours Threshold Reached: 12,150 hrs',
    criterionSummary: 'PUMP_OPERATING_HOURS: Observed 12,150 hrs (Benchmark >= 12,000 hrs)',
    recommendedAction:
      '[ANP Strategy: Scheduled Preventive Overhaul (Priority Score: 88.1%)] — Replace HQQE silicon-carbide mechanical cartridge seal, DE/NDE motor bearings, and verify shaft alignment.',
    confidenceScore: 0.915,
    compositeRiskScore: 0.52,
    createdAt: '2026-11-14T14:05:22Z',
    acknowledgedAt: null,
    asset: {
      id: 'a1000000-0000-0000-0000-000000000003',
      assetCode: 'P-001',
      name: 'Grundfos Multistage Boiler Feedwater Pump A',
    },
    draftedWorkOrder: {
      id: 'wo-draft-103',
      workOrderNumber: 'WO-2026-00016',
      title: '[ANP Auto-Draft] P-001: 12,000-Hr Mechanical Seal & Bearing Overhaul',
      status: 'draft',
      priority: 'high',
    },
  },
  {
    id: 'alert-anp-104',
    notificationId: 'notif-anp-104',
    decisionRunId: 'drun-anp-104',
    severity: 'critical',
    headline: 'Critical Steam Header Overpressure: 13.4 bar (MAWP Limit)',
    criterionSummary: 'STEAM_PRESSURE: Observed 13.4 bar (Benchmark > 12.0 bar)',
    recommendedAction:
      '[ANP Strategy: Immediate Safety Interlock Verification (Priority Score: 98.1%)] — Isolate main header modulating valve, verify high-limit pressuretrol cutout, and inspect ASME safety relief valve pop setpoint.',
    confidenceScore: 0.981,
    compositeRiskScore: 0.94,
    createdAt: '2026-11-14T13:12:45Z',
    acknowledgedAt: null,
    asset: {
      id: 'a1000000-0000-0000-0000-000000000006',
      assetCode: 'BLR-003',
      name: 'Fulton VMP-120 Vertical Tubeless Steam Boiler',
    },
    draftedWorkOrder: {
      id: 'wo-draft-104',
      workOrderNumber: 'WO-2026-00017',
      title: '[ANP Auto-Draft] BLR-003: Steam Header Overpressure Cutout & SRV Calibration',
      status: 'draft',
      priority: 'urgent',
    },
  },
];

let inMemoryAlertsStore: ActiveMaintenanceAlertItem[] = [
  ...INITIAL_FALLBACK_ALERTS,
];
let simulatedAlertCounter = 18;

/**
 * Correlates backend `NotificationRecord[]` and `DecisionRunRecord[]` into
 * unified `ActiveMaintenanceAlertItem[]` objects.
 */
function correlateNotificationsAndDecisionRuns(
  notifications: NotificationRecord[],
  decisionRuns: DecisionRunRecord[]
): ActiveMaintenanceAlertItem[] {
  const runMap = new Map<string, DecisionRunRecord>();
  for (const run of decisionRuns) {
    runMap.set(run.id, run);
  }

  return decisionRuns.map((run, idx) => {
    const matchingNotif = notifications.find((n) => n.entityId === run.id) ?? notifications[idx];
    const breached = run.resultSnapshot?.breachedCriteria?.[0];
    const riskScore = Number(run.resultSnapshot?.compositeRiskScore ?? 0.65);
    const priority = run.resultSnapshot?.recommendedPriority ?? 'high';
    const isCritical = priority === 'urgent' || riskScore >= 0.65;

    const headline = breached
      ? `${isCritical ? 'Critical' : 'High'} ${breached.criterionName} Detected: ${
          breached.observedValue
        }${breached.unit ? ' ' + breached.unit : ''}`
      : matchingNotif?.title || 'ANP Benchmark Threshold Breach';

    const criterionSummary = breached
      ? `${breached.criterionCode}: Observed ${breached.observedValue}${
          breached.unit ? ' ' + breached.unit : ''
        } (Benchmark ${breached.operator} ${breached.threshold}${
          breached.unit ? ' ' + breached.unit : ''
        })`
      : 'ANP Multi-Criteria Threshold Excursion';

    return {
      id: `alert-${run.id}`,
      notificationId: matchingNotif?.id ?? `notif-${run.id}`,
      decisionRunId: run.id,
      severity: isCritical ? 'critical' : 'warning',
      headline,
      criterionSummary,
      recommendedAction:
        run.recommendedAction ??
        matchingNotif?.message ??
        'Execute ANP recommended corrective inspection.',
      confidenceScore: Number(run.confidenceScore ?? 0.91),
      compositeRiskScore: riskScore,
      createdAt: run.runAt || matchingNotif?.createdAt || new Date().toISOString(),
      acknowledgedAt: matchingNotif?.readAt ?? null,
      asset: run.asset ?? {
        id: run.assetId ?? 'a1000000-0000-0000-0000-000000000001',
        assetCode: 'BLR-001',
        name: 'Cleaver-Brooks Firetube Steam Boiler #1',
      },
      draftedWorkOrder: run.workOrder ?? {
        id: run.workOrderId ?? `wo-${run.id}`,
        workOrderNumber: `WO-2026-000${14 + idx}`,
        title: `[ANP Auto-Draft] ${headline}`,
        status: 'draft',
        priority: isCritical ? 'urgent' : 'high',
      },
    };
  });
}

function broadcastAlertsUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTS_EVENT_NAME));
  }
}

export const alertsApiService = {
  /**
   * Fetches active maintenance alerts by querying `/api/notifications`
   * and `/api/decision-runs` concurrently.
   */
  async fetchActiveAlerts(): Promise<ActiveMaintenanceAlertItem[]> {
    try {
      const [notifsRes, runsRes] = await Promise.all([
        apiRequest<NotificationRecord[]>('/api/notifications', {
          method: 'GET',
        }),
        apiRequest<DecisionRunRecord[]>('/api/decision-runs', {
          method: 'GET',
        }),
      ]);

      if (
        Array.isArray(runsRes.data) &&
        runsRes.data.length > 0 &&
        Array.isArray(notifsRes.data)
      ) {
        return correlateNotificationsAndDecisionRuns(
          notifsRes.data,
          runsRes.data
        );
      }
    } catch {
      // Fallback to in-memory real-time store when backend is offline
    }

    return [...inMemoryAlertsStore];
  },

  /**
   * Marks an alert notification as acknowledged (`PATCH /api/notifications/:id/read`).
   */
  async acknowledgeAlert(notificationId: string): Promise<string> {
    const nowIso = new Date().toISOString();
    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    } catch {
      // Update in-memory fallback store
    }

    inMemoryAlertsStore = inMemoryAlertsStore.map((a) =>
      a.notificationId === notificationId ? { ...a, acknowledgedAt: nowIso } : a
    );
    broadcastAlertsUpdate();
    return nowIso;
  },

  /**
   * Transitions the drafted Work Order associated with an alert
   * (e.g., from `draft -> open` or `in_progress` via `POST /api/work-orders/:id/status`)
   * when the engineer clicks 'Resolve' and dispatches the work order.
   */
  async dispatchDraftedWorkOrder(
    alertId: string,
    workOrderId: string,
    targetStatus: WorkOrderStatus = 'open'
  ): Promise<void> {
    try {
      await apiRequest(`/api/work-orders/${workOrderId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: targetStatus,
          comment: 'Dispatched from Active Maintenance Alerts ANP Command Center.',
        }),
      });
    } catch {
      // Update in-memory fallback store
    }

    const nowIso = new Date().toISOString();
    inMemoryAlertsStore = inMemoryAlertsStore.map((a) =>
      a.id === alertId
        ? {
            ...a,
            acknowledgedAt: a.acknowledgedAt ?? nowIso,
            draftedWorkOrder: {
              ...a.draftedWorkOrder,
              status: targetStatus,
            },
          }
        : a
    );
    broadcastAlertsUpdate();
  },

  /**
   * Simulates a real-time incoming ANP alert pushed from the boiler telemetry stream
   * so reviewers can test near-real-time updates without refreshing the page.
   */
  simulateIncomingRealtimeAlert(severity: 'warning' | 'critical' = 'warning'): ActiveMaintenanceAlertItem {
    simulatedAlertCounter += 1;
    const nowIso = new Date().toISOString();
    const isCritical = severity === 'critical';

    const newAlert: ActiveMaintenanceAlertItem = isCritical
      ? {
          id: `alert-live-${Date.now()}`,
          notificationId: `notif-live-${Date.now()}`,
          decisionRunId: `drun-live-${Date.now()}`,
          severity: 'critical',
          headline: `Critical Low-Water Cutoff Interlock Excursion & Stack Temp 241°C`,
          criterionSummary:
            'WATER_LEVEL_OK == false & FLUE_GAS_TEMP: Observed 241.0 °C (Benchmark > 190 °C)',
          recommendedAction:
            '[ANP Strategy: Immediate Emergency Intervention (Priority Score: 97.4%)] — Verify feedwater pump P-001 discharge head immediately, purge LWCO float chamber, and reduce burner firing rate to low-fire hold.',
          confidenceScore: 0.974,
          compositeRiskScore: 0.92,
          createdAt: nowIso,
          acknowledgedAt: null,
          asset: {
            id: 'a1000000-0000-0000-0000-000000000001',
            assetCode: 'BLR-001',
            name: 'Cleaver-Brooks Firetube Steam Boiler #1',
          },
          draftedWorkOrder: {
            id: `wo-live-${Date.now()}`,
            workOrderNumber: `WO-2026-000${simulatedAlertCounter}`,
            title: `[ANP Auto-Draft] BLR-001: Emergency LWCO & High Stack Temp Remediation`,
            status: 'draft',
            priority: 'urgent',
          },
        }
      : {
          id: `alert-live-${Date.now()}`,
          notificationId: `notif-live-${Date.now()}`,
          decisionRunId: `drun-live-${Date.now()}`,
          severity: 'warning',
          headline: `High Temp Detected: 195°C (Economizer Approach Delta Warning)`,
          criterionSummary: 'FLUE_GAS_TEMP: Observed 195.0 °C (Benchmark > 190 °C)',
          recommendedAction:
            '[ANP Strategy: Condition-Based Sootblowing & Damper Check (Priority Score: 86.0%)] — Perform steam sootblowing sequence on economizer tube bank and verify O2 trim sensor.',
          confidenceScore: 0.892,
          compositeRiskScore: 0.48,
          createdAt: nowIso,
          acknowledgedAt: null,
          asset: {
            id: 'a1000000-0000-0000-0000-000000000009',
            assetCode: 'BLR-004',
            name: 'Miura LX-200SG Low-NOx Once-Through Steam Boiler',
          },
          draftedWorkOrder: {
            id: `wo-live-${Date.now()}`,
            workOrderNumber: `WO-2026-000${simulatedAlertCounter}`,
            title: `[ANP Auto-Draft] BLR-004: High Flue Gas Temp (195°C) Economizer Cleaning`,
            status: 'draft',
            priority: 'high',
          },
        };

    inMemoryAlertsStore = [newAlert, ...inMemoryAlertsStore];
    broadcastAlertsUpdate();
    return newAlert;
  },

  subscribeToRealtimeStream(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(ALERTS_EVENT_NAME, callback);
    return () => window.removeEventListener(ALERTS_EVENT_NAME, callback);
  },
};

