import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  BellRing,
  CheckCircle2,
  Wrench,
  RefreshCw,
  Radio,
  Sparkles,
  X,
  ArrowRight,
  Clock,
  Cpu,
  Check,
} from 'lucide-react';
import {
  ActiveMaintenanceAlertItem,
  AnpAlertSeverity,
  WorkOrderStatus,
} from '../../types/cmms.types';
import { alertsApiService } from '../../services/alerts.service';
import { WorkOrderStatusBadge } from '../ui/StatusBadge';

export const ActiveMaintenanceAlerts: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ActiveMaintenanceAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
  const [severityFilter, setSeverityFilter] = useState<
    'ALL' | AnpAlertSeverity
  >('ALL');

  // Active Alert whose Drafted Work Order is open in the 'Resolve' Modal
  const [resolvingAlert, setResolvingAlert] =
    useState<ActiveMaintenanceAlertItem | null>(null);
  const [isDispatchingWo, setIsDispatchingWo] = useState<boolean>(false);

  const fetchAlerts = useCallback(async () => {
    const data = await alertsApiService.fetchActiveAlerts();
    setAlerts(data);
    setIsLoading(false);
    setLastSyncedAt(
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }, []);

  // Initial fetch + Near real-time polling interval (every 5 seconds) + live stream subscription
  useEffect(() => {
    fetchAlerts();

    const unsubscribeStream = alertsApiService.subscribeToRealtimeStream(() => {
      fetchAlerts();
    });

    if (!isPollingActive) {
      return () => unsubscribeStream();
    }

    const intervalId = window.setInterval(() => {
      fetchAlerts();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      unsubscribeStream();
    };
  }, [fetchAlerts, isPollingActive]);

  const handleAcknowledge = async (alert: ActiveMaintenanceAlertItem) => {
    await alertsApiService.acknowledgeAlert(alert.notificationId);
    await fetchAlerts();
  };

  const handleOpenResolveModal = (alert: ActiveMaintenanceAlertItem) => {
    setResolvingAlert(alert);
  };

  const handleDispatchWorkOrder = async (targetStatus: WorkOrderStatus) => {
    if (!resolvingAlert) return;
    setIsDispatchingWo(true);
    try {
      await alertsApiService.dispatchDraftedWorkOrder(
        resolvingAlert.id,
        resolvingAlert.draftedWorkOrder.id,
        targetStatus
      );
      await fetchAlerts();
      setResolvingAlert((prev) =>
        prev
          ? {
              ...prev,
              acknowledgedAt: prev.acknowledgedAt ?? new Date().toISOString(),
              draftedWorkOrder: {
                ...prev.draftedWorkOrder,
                status: targetStatus,
              },
            }
          : null
      );
    } finally {
      setIsDispatchingWo(false);
    }
  };

  const filteredAlerts = alerts.filter((a) =>
    severityFilter === 'ALL' ? true : a.severity === severityFilter
  );

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledgedAt).length;

  return (
    <section
      aria-label="Active Maintenance Alerts"
      className="lumina-card p-4 sm:p-6 space-y-5 border-slate-800/90"
    >
      {/* Top Header & Near Real-Time Polling Telemetry Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs md:text-sm font-mono uppercase tracking-widest text-gold-400">
              <BellRing className="w-4 h-4 text-gold-400" />
              <span>ANP Decision Support Engine • Real-Time Stream</span>
            </div>

            {/* Near Real-Time Polling Indicator (>=44px height touch target) */}
            <button
              type="button"
              onClick={() => setIsPollingActive((prev) => !prev)}
              className={`inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono border transition-colors ${
                isPollingActive
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Toggle Near Real-Time Polling (5s Interval)"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isPollingActive
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-slate-500'
                }`}
              />
              <Radio className="w-3.5 h-3.5" />
              <span>
                {isPollingActive ? 'LIVE POLLING (5s)' : 'POLLING PAUSED'}
              </span>
              <span className="text-slate-400 hidden sm:inline">
                • Synced {lastSyncedAt}
              </span>
            </button>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-white mt-2 flex flex-wrap items-center gap-2.5">
            <span>Active Maintenance Alerts</span>
            {unacknowledgedCount > 0 && (
              <span className="px-3 py-1 text-xs md:text-sm font-mono rounded-full bg-rose-950/90 text-rose-200 border border-rose-500/50">
                {unacknowledgedCount} Unacknowledged
              </span>
            )}
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-1">
            Synchronized from{' '}
            <code className="font-mono text-indigo-300">/api/notifications</code>{' '}
            &amp;{' '}
            <code className="font-mono text-gold-300">/api/decision-runs</code>{' '}
            — Subtle gold for warning states, deep red for critical failures.
          </p>
        </div>

        {/* Severity Filter Pills & Live Stream Simulation Buttons (44px+ touch targets) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-midnight-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setSeverityFilter('ALL')}
              className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg text-xs md:text-sm font-mono transition-colors ${
                severityFilter === 'ALL'
                  ? 'bg-indigo-950 text-indigo-200 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter('critical')}
              className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg text-xs md:text-sm font-mono transition-colors ${
                severityFilter === 'critical'
                  ? 'bg-rose-950/90 text-rose-200 border border-rose-500/50'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter('warning')}
              className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg text-xs md:text-sm font-mono transition-colors ${
                severityFilter === 'warning'
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50'
                  : 'text-slate-400 hover:text-gold-300'
              }`}
            >
              Warning ({warningCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              alertsApiService.simulateIncomingRealtimeAlert('warning')
            }
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs md:text-sm font-mono bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/40 flex items-center gap-2 transition-colors"
            title="Push a live warning alert into the real-time feed"
          >
            <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
            <span>+ Push Warning (195°C)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              alertsApiService.simulateIncomingRealtimeAlert('critical')
            }
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs md:text-sm font-mono bg-rose-950/80 hover:bg-rose-900/80 text-rose-200 border border-rose-500/50 flex items-center gap-2 transition-colors"
            title="Push a live critical failure alert into the real-time feed"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>+ Push Critical Failure</span>
          </button>
        </div>
      </div>

      {/* Alerts Display: Stacked Cards on Mobile/Tablet Portrait (`lg:hidden`) & Structured Grid/Table on Desktop & Tablet Landscape (`hidden lg:block`) */}
      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2.5 text-base font-mono text-slate-400">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          <span>Polling ANP notifications &amp; decision_runs...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-8 rounded-xl bg-midnight-950/70 border border-slate-800 text-center text-base text-slate-400">
          No maintenance alerts matching the selected severity filter.
        </div>
      ) : (
        <>
          {/* =================================================================
              A. TABLET PORTRAIT (`md:`) & MOBILE STACKED CARD VIEW (`lg:hidden`)
                 High-contrast arm's-length legibility + full-width 48px buttons
             ================================================================= */}
          <div className="lg:hidden space-y-4">
            {filteredAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isAcknowledged = Boolean(alert.acknowledgedAt);

              return (
                <div
                  key={alert.id}
                  className={`p-5 rounded-xl border transition-all duration-200 space-y-4 ${
                    isCritical
                      ? 'bg-gradient-to-r from-rose-950/90 via-rose-950/50 to-midnight-950/95 border-rose-500/70 shadow-[0_0_25px_-5px_rgba(244,63,94,0.3)]'
                      : 'bg-gradient-to-r from-gold-500/15 via-gold-500/5 to-midnight-950/95 border-gold-500/55 shadow-glow-gold'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                        isCritical
                          ? 'bg-rose-950 text-rose-200 border-rose-500/70'
                          : 'bg-gold-500/20 text-gold-200 border-gold-400/50'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-gold-300" />
                      )}
                      <span>
                        {isCritical ? 'Critical Failure' : 'Warning State'}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-midnight-950/90 text-gold-300 border border-gold-500/30 text-xs font-mono">
                      <Wrench className="w-3.5 h-3.5 text-gold-400" />
                      {alert.draftedWorkOrder.workOrderNumber} (
                      {alert.draftedWorkOrder.status})
                    </span>
                  </div>

                  {/* Arm's-Length Legible Alert Headline */}
                  <div>
                    <h3
                      className={`text-lg md:text-xl font-bold tracking-tight leading-snug ${
                        isCritical ? 'text-rose-100' : 'text-gold-200'
                      }`}
                    >
                      {alert.headline}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs md:text-sm font-mono text-indigo-300">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span>
                        {alert.asset.assetCode} — {alert.asset.name}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">
                        ANP Confidence:{' '}
                        {(alert.confidenceScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Criterion Breach & Recommended Action */}
                  <div className="text-sm font-mono text-slate-200">
                    {alert.criterionSummary}
                  </div>
                  <p className="text-sm md:text-base text-slate-200 leading-relaxed bg-midnight-950/80 p-3.5 rounded-xl border border-slate-800/80">
                    {alert.recommendedAction}
                  </p>

                  {/* Glove-Friendly 48px Touch Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenResolveModal(alert)}
                      className={`min-h-[48px] px-4 py-3 rounded-xl text-sm font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        isCritical
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                          : 'bg-gold-500 hover:bg-gold-400 text-slate-950 shadow-glow-gold'
                      }`}
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Resolve Work Order</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAcknowledged}
                      onClick={() => handleAcknowledge(alert)}
                      className={`min-h-[48px] px-4 py-3 rounded-xl text-sm font-mono font-semibold border flex items-center justify-center gap-2 transition-colors ${
                        isAcknowledged
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 cursor-default'
                          : 'bg-midnight-950/90 hover:bg-slate-800 text-slate-100 border-slate-700'
                      }`}
                    >
                      {isAcknowledged ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Acknowledged</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          <span>Acknowledge</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* =================================================================
              B. DESKTOP & TABLET LANDSCAPE STRUCTURED DATA TABLE (`hidden lg:block`)
             ================================================================= */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/90 bg-midnight-950/95 text-xs font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-5">Severity &amp; Equipment</th>
                  <th className="py-4 px-4">ANP Alert &amp; Breach Telemetry</th>
                  <th className="py-4 px-4">Recommended Maintenance Action</th>
                  <th className="py-4 px-4">Drafted Work Order</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === 'critical';
                  const isAcknowledged = Boolean(alert.acknowledgedAt);

                  return (
                    <tr
                      key={alert.id}
                      className={`transition-colors ${
                        isCritical
                          ? 'bg-rose-950/25 hover:bg-rose-950/40'
                          : 'bg-gold-500/5 hover:bg-gold-500/10'
                      }`}
                    >
                      {/* Severity & Asset */}
                      <td className="py-4 px-5 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                            isCritical
                              ? 'bg-rose-950 text-rose-200 border-rose-500/70'
                              : 'bg-gold-500/20 text-gold-200 border-gold-400/50'
                          }`}
                        >
                          {isCritical ? (
                            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-gold-300" />
                          )}
                          <span>
                            {isCritical ? 'Critical Failure' : 'Warning State'}
                          </span>
                        </span>

                        <div className="mt-2.5 flex items-center gap-1.5 text-sm font-mono font-semibold text-indigo-300">
                          <Cpu className="w-4 h-4 text-indigo-400" />
                          <span>{alert.asset.assetCode}</span>
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[190px]">
                          {alert.asset.name}
                        </div>
                      </td>

                      {/* Headline & Criterion Summary (Arm's-Length Legible) */}
                      <td className="py-4 px-4 align-top">
                        <div
                          className={`text-base xl:text-lg font-bold tracking-tight ${
                            isCritical ? 'text-rose-100' : 'text-gold-200'
                          }`}
                        >
                          {alert.headline}
                        </div>
                        <div className="text-xs xl:text-sm font-mono text-slate-300 mt-1">
                          {alert.criterionSummary}
                        </div>
                        <div className="mt-1.5 inline-flex items-center gap-2 text-xs font-mono text-slate-400">
                          <span>
                            ANP Confidence:{' '}
                            <strong className="text-slate-200">
                              {(alert.confidenceScore * 100).toFixed(1)}%
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alert.decisionRunId.slice(0, 10)}
                          </span>
                        </div>
                      </td>

                      {/* Recommended Action */}
                      <td className="py-4 px-4 align-top max-w-md">
                        <p className="text-xs xl:text-sm text-slate-200 leading-relaxed bg-midnight-950/80 p-3 rounded-xl border border-slate-800/80">
                          {alert.recommendedAction}
                        </p>
                      </td>

                      {/* Drafted Work Order */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-midnight-950 text-gold-300 border border-gold-500/30 text-xs font-mono font-semibold">
                          <Wrench className="w-3.5 h-3.5 text-gold-400" />
                          {alert.draftedWorkOrder.workOrderNumber}
                        </div>
                        <div className="mt-2">
                          <WorkOrderStatusBadge
                            status={alert.draftedWorkOrder.status}
                          />
                        </div>
                      </td>

                      {/* Touch Action Buttons (>=44px height) */}
                      <td className="py-4 px-5 align-top whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(alert)}
                            className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all ${
                              isCritical
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                                : 'bg-gold-500 hover:bg-gold-400 text-slate-950 shadow-glow-gold'
                            }`}
                          >
                            <Wrench className="w-4 h-4" />
                            <span>Resolve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isAcknowledged}
                            onClick={() => handleAcknowledge(alert)}
                            className={`min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium border inline-flex items-center gap-1.5 transition-colors ${
                              isAcknowledged
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 cursor-default'
                                : 'bg-midnight-950/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                            }`}
                          >
                            {isAcknowledged ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Acknowledged</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                <span>Acknowledge</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 'Resolve' Drafted Work Order Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-midnight-950/80 backdrop-blur-sm"
            onClick={() => setResolvingAlert(null)}
          />

          <div
            role="dialog"
            aria-label="Resolve Maintenance Alert & Drafted Work Order"
            className="relative z-10 w-full max-w-xl rounded-2xl bg-midnight-900 border border-slate-700/90 shadow-2xl overflow-hidden"
          >
            {/* Top Accent Bar */}
            <div
              className={`h-1.5 w-full ${
                resolvingAlert.severity === 'critical'
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-gold-500'
                  : 'bg-gradient-to-r from-gold-500 via-indigo-500 to-gold-400'
              }`}
            />

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-midnight-950 text-gold-400 border border-gold-500/40">
                      {resolvingAlert.draftedWorkOrder.workOrderNumber}
                    </span>
                    <WorkOrderStatusBadge
                      status={resolvingAlert.draftedWorkOrder.status}
                    />
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                      Priority: {resolvingAlert.draftedWorkOrder.priority}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-100 mt-2">
                    {resolvingAlert.draftedWorkOrder.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  aria-label="Close Resolve Modal"
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-midnight-950 text-slate-400 hover:text-slate-100 border border-slate-800 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Alert & ANP Decision Run Context */}
              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-xl bg-midnight-950 border border-slate-800/90 space-y-2 font-mono">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Target Equipment:</span>
                    <span className="text-slate-100 font-semibold text-right">
                      {resolvingAlert.asset.assetCode} — {resolvingAlert.asset.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Triggered Alert:</span>
                    <span
                      className={
                        resolvingAlert.severity === 'critical'
                          ? 'text-rose-300 font-semibold text-right'
                          : 'text-gold-300 font-semibold text-right'
                      }
                    >
                      {resolvingAlert.headline}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">ANP Decision Run:</span>
                    <span className="text-indigo-300 text-right">
                      {resolvingAlert.decisionRunId} (Confidence:{' '}
                      {(resolvingAlert.confidenceScore * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-midnight-950/80 border border-gold-500/30 space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-gold-400">
                    ANP Recommended Maintenance Scope
                  </div>
                  <p className="text-base text-slate-200 leading-relaxed">
                    {resolvingAlert.recommendedAction}
                  </p>
                </div>
              </div>

              {/* Modal Footer Actions (44px+ touch targets) */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/work-orders')}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono text-indigo-400 hover:text-gold-300 flex items-center gap-1.5"
                >
                  <span>Open Full Work Order Board</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {resolvingAlert.draftedWorkOrder.status === 'draft' && (
                    <button
                      type="button"
                      disabled={isDispatchingWo}
                      onClick={() => handleDispatchWorkOrder('open')}
                      className="lumina-btn-gold font-mono"
                    >
                      <span>Release Draft → Open</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={
                      isDispatchingWo ||
                      resolvingAlert.draftedWorkOrder.status === 'in_progress'
                    }
                    onClick={() => handleDispatchWorkOrder('in_progress')}
                    className="lumina-btn-primary font-mono"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>
                      {resolvingAlert.draftedWorkOrder.status === 'in_progress'
                        ? 'Work Order In Progress'
                        : 'Dispatch Crew (In Progress)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ActiveMaintenanceAlerts;
