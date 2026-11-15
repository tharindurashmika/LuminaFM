import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Tabs,
  LoadingState,
  ErrorState,
} from '../components/ui';
import { DataClassificationBadge } from '../components/ui/DataClassificationBadge';
import {
  DecisionReportingSummary,
  OperationalAbnormalityItem,
  NotificationChannelConfig,
  PreventiveMaintenanceItem,
  WorkOrderPerformanceMetrics,
  ParameterTrendHistory,
} from '../types/reporting.types';
import { AnpMaintenanceRecommendation } from '../types/cmms.types';
import { reportingApiService } from '../services/reporting.service';
import {
  exportDecisionRunToCsv,
  exportAbnormalitiesToCsv,
  exportMultiSectionToCsv,
  openPrintableReportWindow,
} from '../utils/report-export.utils';
import { AlertAcknowledgementModal } from '../components/decision-support/AlertAcknowledgementModal';
import { NotificationChannelConfigModal } from '../components/decision-support/NotificationChannelConfigModal';
import { RecommendationReviewModal } from '../components/decision-support/RecommendationReviewModal';
import { useAuth } from '../store/AuthContext';
import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  Info,
  Layers,
  LineChart,
  Printer,
  RefreshCw,
  Scale,
  Send,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Wrench,
  XCircle,
} from 'lucide-react';

export const DecisionReportingPage: React.FC = () => {
  const { organization } = useAuth();

  // Primary State
  const [activeTab, setActiveTab] = useState<'anp_decisions' | 'abnormalities' | 'pm_overdue' | 'trends' | 'channels_export'>('anp_decisions');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data Stores
  const [decisionRuns, setDecisionRuns] = useState<DecisionReportingSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('drun-anp-baseline-001');
  const [abnormalities, setAbnormalities] = useState<OperationalAbnormalityItem[]>([]);
  const [pmItems, setPmItems] = useState<PreventiveMaintenanceItem[]>([]);
  const [metrics, setMetrics] = useState<WorkOrderPerformanceMetrics | null>(null);
  const [trends, setTrends] = useState<ParameterTrendHistory[]>([]);
  const [channels, setChannels] = useState<NotificationChannelConfig[]>([]);

  // Modals State
  const [acknowledgingAbnormality, setAcknowledgingAbnormality] = useState<OperationalAbnormalityItem | null>(null);
  const [editingChannel, setEditingChannel] = useState<NotificationChannelConfig | null>(null);
  const [reviewingRecommendation, setReviewingRecommendation] = useState<AnpMaintenanceRecommendation | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllReportingData();
  }, []);

  const loadAllReportingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [runsData, abnData, pmData, metricsData, trendsData, channelsData] = await Promise.all([
        reportingApiService.getDecisionRuns(),
        reportingApiService.getOperationalAbnormalities(),
        reportingApiService.getPreventiveMaintenanceSchedule(),
        reportingApiService.getWorkOrderPerformanceMetrics(),
        reportingApiService.getHistoricalTelemetryTrends(),
        reportingApiService.getNotificationChannels(),
      ]);

      setDecisionRuns(runsData);
      setAbnormalities(abnData);
      setPmItems(pmData);
      setMetrics(metricsData);
      setTrends(trendsData);
      setChannels(channelsData);

      if (runsData.length > 0 && !runsData.some((r) => r.decisionRunId === selectedRunId)) {
        setSelectedRunId(runsData[0].decisionRunId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load decision reporting data.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentRun = decisionRuns.find((r) => r.decisionRunId === selectedRunId) || decisionRuns[0];

  // Acknowledgement Handler
  const handleAcknowledge = async (payload: any) => {
    await reportingApiService.acknowledgeAbnormality(payload);
    const updated = await reportingApiService.getOperationalAbnormalities();
    setAbnormalities(updated);
    setActionSuccessMessage('Operational abnormality acknowledged and recorded in regulatory audit trail.');
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Notification Channel Save Handler
  const handleSaveChannel = async (channelId: string, updates: any) => {
    await reportingApiService.updateNotificationChannel(channelId, updates);
    const updated = await reportingApiService.getNotificationChannels();
    setChannels(updated);
    setActionSuccessMessage('Notification channel configuration updated successfully.');
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Channel Test Dispatch
  const handleTestDispatch = async (channelId: string) => {
    const res = await reportingApiService.dispatchTestNotification(channelId);
    const updated = await reportingApiService.getNotificationChannels();
    setChannels(updated);
    return res;
  };

  // Recommendation Review Handler
  const handleRecommendationReview = async (
    action: 'approve' | 'reject' | 'convert_to_work_order',
    engineerName: string,
    notes: string
  ) => {
    if (!currentRun || !reviewingRecommendation) return;
    const res = await reportingApiService.reviewRecommendation(
      currentRun.decisionRunId,
      reviewingRecommendation.recommendationId,
      action,
      engineerName,
      notes
    );
    const updatedRuns = await reportingApiService.getDecisionRuns();
    setDecisionRuns(updatedRuns);
    setActionSuccessMessage(res.message);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  if (isLoading) {
    return <LoadingState title="Aggregating decision support analytics, limit supermatrix priorities, and operational logs..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAllReportingData} />;
  }

  const unacknowledgedAbnormalitiesCount = abnormalities.filter((a) => !a.acknowledged).length;
  const overduePmCount = pmItems.filter((p) => p.isOverdue).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <Scale className="w-7 h-7 text-gold-400" />
              <span>Decision Support & Reporting Center</span>
            </h1>
            <Badge tone="gold" size="sm">
              ANP ENGINE & REGULATORY AUDIT
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Multi-criteria maintenance priority engine based on Kingsbury oil-fired fire-tube boiler research (1,000–1,800 kg/h), operational abnormality detection, and verified preventive compliance.
          </p>
        </div>

        {/* Global Export Shortcuts */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (currentRun) {
                exportDecisionRunToCsv(currentRun);
              }
            }}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          >
            Export ANP (Excel)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (currentRun) {
                openPrintableReportWindow({
                  title: 'ANP Multi-Criteria Decision Audit Dossier',
                  subtitle: `${currentRun.assetCode} - ${currentRun.assetName}`,
                  organizationName: organization?.name,
                  organizationLogo: organization?.logoUri,
                  reportType: 'anp_decision',
                  decisionRun: currentRun,
                });
              }
            }}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Dossier (PDF)
          </Button>
        </div>
      </div>

      {/* Global Action Success Toast */}
      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Four-Column Key Performance Indicator Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Abnormalities</div>
            <div className="text-2xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
              <span>{abnormalities.length}</span>
              {unacknowledgedAbnormalitiesCount > 0 && (
                <span className="text-xs font-mono font-bold text-rose-400">({unacknowledgedAbnormalitiesCount} unacked)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sensor threshold excursions</div>
          </div>
          <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Top ANP Priority (pa)</div>
            <div className="text-2xl font-bold text-gold-400 mt-1 font-mono">
              {currentRun ? (currentRun.topAlternative.anpPriorityScore).toFixed(4) : '0.0000'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[170px]" title={currentRun?.topAlternative.name}>
              {currentRun?.topAlternative.name}
            </div>
          </div>
          <div className="p-3 bg-gold-950/50 border border-gold-500/30 rounded-xl text-gold-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PM Compliance</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {metrics ? `${metrics.onTimeCompletionPercentage}%` : '88.2%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              {overduePmCount > 0 ? (
                <span className="text-rose-400 font-semibold">{overduePmCount} tasks overdue</span>
              ) : (
                <span className="text-emerald-400">All PMs on schedule</span>
              )}
            </div>
          </div>
          <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Proactive Spend Ratio</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {metrics ? `${metrics.proactiveVsReactiveRatio}%` : '72.5%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">MTTR: {metrics?.meanTimeToRepairHours} hrs</div>
          </div>
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <Tabs
        tabs={[
          {
            id: 'anp_decisions',
            label: 'ANP Decision Priorities',
            badge: currentRun?.recommendations.length,
          },
          {
            id: 'abnormalities',
            label: 'Operational Abnormalities',
            badge: abnormalities.length,
          },
          {
            id: 'pm_overdue',
            label: 'PM Due Dates & Overdue',
            badge: pmItems.length,
          },
          {
            id: 'trends',
            label: 'Historical Readings & Trends',
          },
          {
            id: 'channels_export',
            label: 'Notification Channels & Export Center',
            badge: channels.length,
          },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: ANP DECISION PRIORITIES & VALIDATION GATING                        */}
      {/* ========================================================================= */}
      {activeTab === 'anp_decisions' && currentRun && (
        <div className="space-y-5">
          {/* Model Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-midnight-900/60 p-3.5 rounded-xl border border-indigo-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Decision Run:</span>
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-gold-500"
              >
                {decisionRuns.map((r) => (
                  <option key={r.decisionRunId} value={r.decisionRunId}>
                    {r.decisionModelCode} — {r.assetCode} ({r.isValidated ? 'VALIDATED' : 'UNVALIDATED'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Evaluated At:</span>
              <span className="font-mono text-slate-200">{new Date(currentRun.evaluatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Validation Status Gating Banner: "Do not display unvalidated ANP outputs as approved maintenance decisions" */}
          {!currentRun.isValidated ? (
            <div className="p-4 bg-amber-950/70 border-2 border-amber-500/60 rounded-xl space-y-2 text-amber-200">
              <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-amber-300">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>UNVALIDATED ANP MODEL — ADVISORY ONLY (NOT AN APPROVED DECISION)</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-200/90">
                {currentRun.validationDisclaimer ||
                  'This decision run originates from a draft or unvalidated commercial configuration. Academic or independent expert panel validation has NOT been recorded for this model. Under plant operating regulations, unvalidated ANP outputs cannot be displayed or recorded as approved maintenance decisions.'}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-amber-300/80">
                <span>Validation Status: <strong>[{currentRun.validationStatus.toUpperCase()}]</strong></span>
                <span>•</span>
                <span>Level: <strong>[{currentRun.academicValidationLevel.toUpperCase()}]</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Academic Validated Baseline:</strong> Conforms to Kingsbury oil-fired fire-tube dissertation baseline (1,000–1,800 kg/h). Mathematical supermatrix convergence verified.
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
                <span>Hash:</span>
                <span className="text-slate-200 bg-midnight-950 px-2 py-0.5 rounded border border-indigo-900/40">
                  {currentRun.deterministicHash.slice(0, 16)}...
                </span>
              </div>
            </div>
          )}

          {/* Ranked Maintenance Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>Ranked Maintenance Recommendations</span>
                <DataClassificationBadge type="expert" />
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Formula: Lim Supermatrix Priority (pa)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {currentRun.recommendations.map((rec) => {
                const isApproved = rec.reviewStatus === 'APPROVED';
                const isConverted = rec.reviewStatus === 'CONVERTED_TO_WORK_ORDER';
                const isRejected = rec.reviewStatus === 'REJECTED';
                const isPending = rec.reviewStatus === 'PROPOSED_PENDING_ENGINEER_REVIEW';

                return (
                  <Card key={rec.recommendationId} className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-indigo-900/40 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gold-400">RANK #{rec.rank}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-xs text-slate-300">{rec.alternativeCode}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">{rec.safetyTier}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-100">{rec.alternativeName}</h4>
                      </div>

                      {/* Priorities and Review Status */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <DataClassificationBadge
                          type="calculated"
                          valueDisplay={`pa = ${rec.priorityValue.toFixed(4)}`}
                        />
                        <DataClassificationBadge
                          type="calculated"
                          valueDisplay={`${rec.relativeWeightPercentage.toFixed(1)}%`}
                        />
                        <span
                          className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold tracking-wide uppercase ${
                            isApproved
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                              : isConverted
                              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/50'
                              : isRejected
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                          }`}
                        >
                          {!currentRun.isValidated && isApproved
                            ? 'ADVISORY (MODEL UNVALIDATED)'
                            : rec.reviewStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Technical Scope & Spares */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {rec.technicalWorkScope}
                    </p>

                    {rec.sparesRequired && rec.sparesRequired.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-semibold">Recommended Spares:</span>
                        {rec.sparesRequired.map((s, idx) => (
                          <span key={idx} className="bg-midnight-950 text-slate-300 border border-indigo-900/60 px-2 py-0.5 rounded font-mono text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Criteria Influence Attribution Breakdown */}
                    {rec.criteriaAttribution && rec.criteriaAttribution.length > 0 && (
                      <div className="bg-midnight-950/60 p-3 rounded-lg border border-indigo-900/40 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <span>Criteria Influence Attribution (Why this action was ranked):</span>
                          <span>Influence %</span>
                        </div>
                        <div className="space-y-1.5">
                          {rec.criteriaAttribution.map((crit) => (
                            <div key={crit.criterionCode} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-200">
                                  {crit.criterionName} ({crit.observedValue})
                                </span>
                                <span className="font-mono font-bold text-gold-400">
                                  {crit.contributionPercentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gold-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${crit.contributionPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviewer / Work Order Footprint */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-900/30 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        {rec.reviewedByUserId ? (
                          <span>Reviewed by: <strong className="text-slate-200">{rec.reviewedByUserId}</strong> ({new Date(rec.reviewedAt!).toLocaleDateString()})</span>
                        ) : (
                          <span className="text-amber-400 font-medium">Awaiting Engineering Review & Sign-Off</span>
                        )}
                        {rec.generatedWorkOrderId && (
                          <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                            Work Order: {rec.generatedWorkOrderId}
                          </span>
                        )}
                      </div>

                      {/* Action Button: Opens Review Modal */}
                      <Button
                        variant={isPending ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setReviewingRecommendation(rec)}
                        leftIcon={<Wrench className="w-3.5 h-3.5" />}
                      >
                        {isPending ? 'Review & Sign Off' : 'Update Disposition'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OPERATIONAL ABNORMALITIES & REAL-TIME SENSOR EXCURSIONS           */}
      {/* ========================================================================= */}
      {activeTab === 'abnormalities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Detected Operational Abnormalities & Threshold Alarms</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical sensor breaches compared against ASME safety relief limits and empirical Kingsbury research benchmarks.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportAbnormalitiesToCsv(abnormalities)}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Abnormalities (CSV)
            </Button>
          </div>

          <div className="space-y-3">
            {abnormalities.map((item) => (
              <Card
                key={item.id}
                className={`p-4 bg-midnight-900/60 border ${
                  item.severity === 'CRITICAL'
                    ? 'border-rose-900/60 shadow-lg shadow-rose-950/20'
                    : 'border-amber-900/60 shadow-lg shadow-amber-950/20'
                } space-y-3`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-slate-200">{item.assetCode}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{item.assetName}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{item.parameterName}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </h4>
                  </div>

                  {/* Measured vs Benchmark Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <DataClassificationBadge
                      type="measured"
                      valueDisplay={item.measuredValue}
                      unit={item.unit}
                    />
                    <span className="text-xs text-slate-400 font-semibold">vs</span>
                    <DataClassificationBadge
                      type="benchmark"
                      valueDisplay={`${item.benchmarkOperator} ${item.benchmarkThreshold}`}
                      unit={item.unit}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.deviationDescription}
                </p>

                <div className="bg-midnight-950/70 p-2.5 rounded-lg border border-indigo-900/40 text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-gold-400 uppercase tracking-wider">Thematic Prescribed Action:</span>
                  <div className="text-slate-300">{item.thematicAction}</div>
                </div>

                {/* Acknowledgement Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-900/30 text-xs">
                  <div>
                    {item.acknowledged ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledged by <strong>{item.acknowledgedBy}</strong> on {new Date(item.acknowledgedAt!).toLocaleString()}</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>UNACKNOWLEDGED EXCURSION</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.linkedWorkOrderNumber && (
                      <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                        {item.linkedWorkOrderNumber}
                      </span>
                    )}
                    {!item.acknowledged && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setAcknowledgingAbnormality(item)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Acknowledge Alert
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PREVENTIVE MAINTENANCE DUE DATES & OVERDUE TRACKING                */}
      {/* ========================================================================= */}
      {activeTab === 'pm_overdue' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Preventive Maintenance Calendar & Overdue Verification</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ASME boiler inspection cycles, low-water cutoff tests, and scheduled mechanical overhaul tracking.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                openPrintableReportWindow({
                  title: 'Preventive Maintenance & Regulatory Compliance Report',
                  subtitle: 'Boiler Plant PM Due Dates & Overdue Verification',
                  organizationName: organization?.name,
                  organizationLogo: organization?.logoUri,
                  reportType: 'preventive_maintenance',
                  pmItems,
                });
              }}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Print PM Schedule (PDF)
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pmItems.map((pm) => (
              <Card
                key={pm.id}
                className={`p-4 bg-midnight-900/60 border ${
                  pm.isOverdue
                    ? 'border-rose-900/70 shadow-lg shadow-rose-950/20'
                    : 'border-indigo-900/50'
                } flex flex-col md:flex-row md:items-center justify-between gap-3`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-slate-200">{pm.assetCode}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{pm.assetName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-indigo-300 capitalize">{pm.frequency}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">{pm.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                    <span>Assigned: <strong className="text-slate-300">{pm.assignedEngineer || 'Unassigned'}</strong></span>
                    <span>•</span>
                    <span>Est. Labor: <strong className="text-slate-300">{pm.estimatedLaborHours} hrs</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Due Date</div>
                    <div className="text-sm font-mono font-bold text-slate-100">{pm.dueDate}</div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-lg font-mono font-bold uppercase tracking-wider ${
                      pm.isOverdue
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                    }`}
                  >
                    {pm.isOverdue
                      ? `OVERDUE (${Math.abs(pm.daysRemainingOrOverdue)}d)`
                      : `IN ${pm.daysRemainingOrOverdue} DAYS`}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HISTORICAL TELEMETRY READINGS & MULTI-DAY TRENDS                  */}
      {/* ========================================================================= */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <LineChart className="w-4 h-4 text-cyan-400" />
                <span>Historical Physical Readings & Benchmark Trend Comparison</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-day trends showing calibrated sensor readings against configured benchmark limits and nominal bands.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DataClassificationBadge type="measured" />
              <DataClassificationBadge type="benchmark" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trends.map((trend) => (
              <Card key={trend.parameterCode} className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase">{trend.category.replace(/_/g, ' ')}</span>
                    <h4 className="text-sm font-bold text-slate-100">{trend.parameterName}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-slate-100">
                      {trend.currentValue} {trend.unit}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400">
                      Benchmark: {trend.benchmarkOperator} {trend.benchmarkThreshold} {trend.unit}
                    </div>
                  </div>
                </div>

                {/* Simulated Visual Sparkline / Bar Graph */}
                <div className="bg-midnight-950/70 p-3 rounded-lg border border-indigo-900/40 space-y-2">
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>6-Day Historical Readings</span>
                    <span>Threshold Line: {trend.benchmarkThreshold} {trend.unit}</span>
                  </div>

                  <div className="grid grid-cols-6 gap-2 pt-2 items-end h-28 border-b border-indigo-900/40 pb-2">
                    {trend.points.map((pt, i) => {
                      const maxScale = trend.benchmarkThreshold * 1.35;
                      const heightPercent = Math.min(100, Math.max(15, (pt.measuredValue / maxScale) * 100));

                      return (
                        <div key={i} className="flex flex-col items-center h-full justify-end group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-midnight-950 border border-indigo-900/60 text-slate-100 text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-10 whitespace-nowrap">
                            {pt.measuredValue} {trend.unit}
                          </div>

                          <div
                            className={`w-full rounded-t transition-all duration-300 ${
                              pt.isBreached
                                ? 'bg-rose-500 shadow-glow-rose/40'
                                : 'bg-cyan-500/70'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                          <span className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-full">
                            {pt.timestamp.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                    <span>Nominal: {trend.points[0]?.nominalMin} - {trend.points[0]?.nominalMax} {trend.unit}</span>
                    <span className={trend.currentStatus === 'critical' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      Status: {trend.currentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NOTIFICATION CHANNELS & COMPREHENSIVE EXPORT CENTER                */}
      {/* ========================================================================= */}
      {activeTab === 'channels_export' && (
        <div className="space-y-6">
          {/* Section 1: Configurable Notification Channels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gold-400" />
                  <span>Configurable Notification Channels & Dispatch Rules</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated routing of ANP priority recommendations and safety alerts to in-app trays, email, SMS, and SCADA webhooks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {channels.map((chan) => (
                <Card key={chan.id} className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-indigo-300 uppercase">
                          [{chan.channelType}]
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            chan.enabled
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {chan.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1">{chan.name}</h4>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingChannel(chan)}
                      leftIcon={<Sliders className="w-3.5 h-3.5" />}
                    >
                      Configure
                    </Button>
                  </div>

                  <div className="text-xs font-mono text-slate-300 bg-midnight-950 p-2 rounded border border-indigo-900/40 truncate">
                    Destination: {chan.destination}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                    <div>Severity Filter: <strong className="text-slate-200">{chan.minSeverity}</strong></div>
                    <div>Min pa Trigger: <strong className="text-slate-200">≥ {chan.minAnpPriorityScore.toFixed(2)}</strong></div>
                    <div>Rate Cooldown: <strong className="text-slate-200">{chan.cooldownMinutes} min</strong></div>
                    <div>Dispatched: <strong className="text-slate-200">{chan.dispatchCount} times</strong></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Section 2: Comprehensive Export Center */}
          <div className="space-y-3 pt-4 border-t border-indigo-900/40">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Regulatory Export Center (PDF & Excel)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate authenticated compliance packages, mathematical ANP snapshots, and maintenance records with cryptographic hashes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <Card className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">ANP Decision Run Audit Snapshot</div>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-criteria limit supermatrix weights, criteria influence attributions, and baseline verification evidence.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (currentRun) exportDecisionRunToCsv(currentRun);
                    }}
                    leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                  >
                    Excel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (currentRun) {
                        openPrintableReportWindow({
                          title: 'ANP Multi-Criteria Decision Audit Snapshot',
                          subtitle: `${currentRun.assetCode} - ${currentRun.assetName}`,
                          organizationName: organization?.name,
                          organizationLogo: organization?.logoUri,
                          reportType: 'anp_decision',
                          decisionRun: currentRun,
                        });
                      }
                    }}
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                  >
                    PDF
                  </Button>
                </div>
              </Card>

              <Card className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">Operational Abnormalities & Excursions</div>
                  <p className="text-xs text-slate-400 mt-1">
                    Threshold breaches, ASME safety limits, operator acknowledgements, and corrective maintenance links.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => exportAbnormalitiesToCsv(abnormalities)}
                    leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                  >
                    Excel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      openPrintableReportWindow({
                        title: 'Operational Parameter Abnormalities & Compliance Log',
                        subtitle: 'Plant Pressure Vessel & Combustion Excursions',
                        organizationName: organization?.name,
                        organizationLogo: organization?.logoUri,
                        reportType: 'regulatory_dossier',
                        abnormalities,
                      });
                    }}
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                  >
                    PDF
                  </Button>
                </div>
              </Card>

              <Card className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-100">Preventive Maintenance Schedule</div>
                  <p className="text-xs text-slate-400 mt-1">
                    ASME calendar due dates, overdue inspections, technician assignments, and labor estimates.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      openPrintableReportWindow({
                        title: 'Preventive Maintenance & Safety Schedule',
                        subtitle: 'Regulatory Due Dates & Overdue Verification',
                        organizationName: organization?.name,
                        organizationLogo: organization?.logoUri,
                        reportType: 'preventive_maintenance',
                        pmItems,
                      });
                    }}
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                  >
                    Print Schedule (PDF)
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AlertAcknowledgementModal
        isOpen={Boolean(acknowledgingAbnormality)}
        onClose={() => setAcknowledgingAbnormality(null)}
        abnormality={acknowledgingAbnormality}
        onAcknowledge={handleAcknowledge}
      />

      <NotificationChannelConfigModal
        isOpen={Boolean(editingChannel)}
        onClose={() => setEditingChannel(null)}
        channel={editingChannel}
        onSave={handleSaveChannel}
        onTestDispatch={handleTestDispatch}
      />

      <RecommendationReviewModal
        isOpen={Boolean(reviewingRecommendation)}
        onClose={() => setReviewingRecommendation(null)}
        run={currentRun}
        recommendation={reviewingRecommendation}
        onReviewSubmit={handleRecommendationReview}
      />
    </div>
  );
};
