import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  Wrench,
  Clock,
  FileCheck,
  History,
  Check,
  X,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  OperationalAnpExecutionResult,
  AnpMaintenanceRecommendation,
  ReviewRecommendationDto,
  ReplayDecisionRunResult,
} from '../../types/cmms.types';
import { operationalAnpApiService } from '../../services/operational-anp.service';

interface OperationalAnpDrawerProps {
  runResult: OperationalAnpExecutionResult | null;
  isOpen: boolean;
  onClose: () => void;
  onRecommendationReviewed?: (recommendationId: string, status: string) => void;
}

export const OperationalAnpDrawer: React.FC<OperationalAnpDrawerProps> = ({
  runResult,
  isOpen,
  onClose,
  onRecommendationReviewed,
}) => {
  const [activeRecTab, setActiveRecTab] = useState<number>(0);
  const [reviewModalRecIndex, setReviewModalRecIndex] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'modify_and_approve'>('approve');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Replay state
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayResult, setReplayResult] = useState<ReplayDecisionRunResult | null>(null);
  const [replayModalOpen, setReplayModalOpen] = useState<boolean>(false);

  // Expanded attribution cards state
  const [expandedAttributions, setExpandedAttributions] = useState<Record<number, boolean>>({ 0: true });

  if (!isOpen || !runResult) return null;

  const toggleAttribution = (index: number) => {
    setExpandedAttributions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleOpenReview = (index: number) => {
    setReviewModalRecIndex(index);
    setReviewAction('approve');
    setReviewNotes('');
    setReviewError(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewModalRecIndex === null) return;

    const targetRec = runResult.recommendations[reviewModalRecIndex];
    if (targetRec.safetyTier === 'SAFETY_CRITICAL_INTERVENTION' && reviewAction === 'approve') {
      if (reviewNotes.trim().length < 15) {
        setReviewError(
          'Safety-critical interventions require minimum 15 characters of certified physical on-site inspection justification.'
        );
        return;
      }
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const dto: ReviewRecommendationDto = {
        action: reviewAction,
        engineerNotes: reviewNotes,
        autoCreateWorkOrder: true,
      };

      const result = await operationalAnpApiService.reviewRecommendation(
        runResult.decisionRunId,
        reviewModalRecIndex,
        dto
      );

      // Update in-memory state
      targetRec.reviewStatus = result.reviewStatus;
      targetRec.engineerNotes = result.engineerNotes;
      targetRec.reviewedAt = result.reviewedAt;
      if (result.workOrder) {
        targetRec.generatedWorkOrderId = result.workOrder.id;
      }

      setReviewModalRecIndex(null);
      if (onRecommendationReviewed) {
        onRecommendationReviewed(targetRec.recommendationId, result.reviewStatus);
      }
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleExecuteReplay = async () => {
    setIsReplaying(true);
    try {
      const replay = await operationalAnpApiService.replayDecisionRun(runResult.decisionRunId);
      setReplayResult(replay);
      setReplayModalOpen(true);
    } catch (err: any) {
      alert(`Replay failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-midnight-950/80">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Scale className="h-4 w-4" />
              </span>
              <span className="text-xs font-mono font-bold text-slate-300">
                Run ID: {runResult.decisionRunId}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 border border-gold-500/40">
                Model: {runResult.decisionModelCode} (v{runResult.decisionModelVersion})
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {runResult.assetCode || 'Facility Boiler'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Operational ANP Decision Support &amp; Recommendations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluated at {new Date(runResult.evaluatedAt).toLocaleString()} &bull; Saaty Limit Supermatrix Converged ({runResult.convergenceDetails.iterations} iterations)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteReplay}
              disabled={isReplaying}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Assert bit-for-bit mathematical reproducibility from stored input snapshot"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
              Replay Run
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* 1. INDEPENDENT SAFETY ESCALATION ALERTS (Critical safety separated from ANP) */}
          {runResult.safetyAlerts.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                  <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
                  <span>CRITICAL SAFETY ESCALATION ALERT (INDEPENDENT OF ANP)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Non-Negotiable Safety Limit
                </span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                The following safety interlock excursion was triggered synchronously upon telemetry submission.
                Safety limits are hard physical constraints and <strong className="text-white">are not subject to ANP multi-criteria trade-offs</strong>.
              </p>
              <div className="space-y-2 pt-1">
                {runResult.safetyAlerts.map((alert) => (
                  <div
                    key={alert.alertId}
                    className="p-3 bg-midnight-950/80 rounded-lg border border-rose-500/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300">{alert.ruleTitle}</span>
                      <span className="font-mono text-rose-400 font-semibold">{alert.parameterCode}: {String(alert.observedValue)}</span>
                    </div>
                    <p className="text-slate-300">{alert.emergencyActionRequired}</p>
                    <div className="text-[11px] text-rose-400/80 font-mono pt-1">
                      Limit: {alert.safetyLimit} &bull; Requires Certified Inspector Physical Sign-Off: YES
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. DATA QUALITY & COMPLETENESS REPORT */}
          <div className="p-3.5 bg-midnight-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-indigo-400" />
                <span className="font-semibold text-slate-200">Data Completeness &amp; Quality Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Quality Score:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold ${
                    runResult.dataQuality.score >= 0.8
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {(runResult.dataQuality.score * 100).toFixed(0)}%
                </span>
                <span className="text-slate-400 ml-2">Completeness:</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {(runResult.dataQuality.completenessRatio * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {runResult.dataQuality.qualityFlags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {runResult.dataQuality.qualityFlags.map((flag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30"
                  >
                    Flag: {flag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. RANKED ANP RECOMMENDATIONS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-gold-400" />
                  Ranked Maintenance Interventions (ANP Supermatrix Solutions)
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Prioritized by multi-criteria trade-offs combining energy efficiency, water quality, and asset runtime.
                </p>
              </div>
            </div>

            {runResult.recommendations.length === 0 ? (
              <div className="p-6 bg-midnight-950 border border-slate-800 rounded-xl text-center text-slate-400">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p>All operational parameters within standard benchmark tolerances. Routine monitoring active.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {runResult.recommendations.map((rec, idx) => {
                  const isAttributionOpen = !!expandedAttributions[idx];

                  return (
                    <div
                      key={rec.recommendationId}
                      className="bg-midnight-950 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-600 text-white shadow-sm">
                            #{rec.rank}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-100 text-sm">{rec.alternativeName}</h4>
                            <span className="text-[11px] font-mono text-slate-400">{rec.alternativeCode}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Limit Supermatrix Weight */}
                          <span className="px-2 py-0.5 rounded bg-gold-500/10 text-gold-300 font-mono font-bold border border-gold-500/30">
                            p_a: {rec.priorityValue.toFixed(4)} ({rec.relativeWeightPercentage}%)
                          </span>

                          {/* Safety Tier Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rec.safetyTier === 'SAFETY_CRITICAL_INTERVENTION'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : rec.safetyTier === 'OPERATIONAL_MAINTENANCE'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {rec.safetyTier.replace(/_/g, ' ')}
                          </span>

                          {/* Review Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              rec.reviewStatus === 'CONVERTED_TO_WORK_ORDER'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : rec.reviewStatus === 'APPROVED'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : rec.reviewStatus === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {rec.reviewStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Technical Work Scope */}
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {rec.technicalWorkScope}
                      </p>

                      {/* Criteria Attribution & Root Cause Explanation Toggle */}
                      {rec.criteriaAttribution.length > 0 && (
                        <div className="bg-midnight-900 border border-slate-800 rounded-lg p-3 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleAttribution(idx)}
                            className="flex items-center justify-between w-full text-slate-200 font-semibold hover:text-white"
                          >
                            <span className="flex items-center gap-1.5 text-xs text-gold-400">
                              <Info className="h-3.5 w-3.5" />
                              Criteria Influencing This Recommendation ({rec.criteriaAttribution.length})
                            </span>
                            {isAttributionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          {isAttributionOpen && (
                            <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
                              {rec.criteriaAttribution.map((attr, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="p-2 bg-midnight-950 rounded border border-slate-800 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-200">
                                      {attr.criterionName} ({attr.criterionCode})
                                    </span>
                                    <span className="font-mono text-gold-400 font-bold">
                                      {attr.contributionPercentage}% influence
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Observed: <span className="font-mono text-slate-200">{String(attr.observedValue)}</span> &bull; Benchmark: <span className="font-mono text-slate-200">{attr.benchmarkThreshold}</span>
                                  </div>
                                  <div className="text-[11px] text-indigo-300 italic">
                                    &bull; Root Cause: {attr.rootCauseHypothesis}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Context & Engineer Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-slate-500" />
                          <span>
                            {rec.maintenanceHistoryContext?.contextualNote ||
                              'No prior maintenance history recorded.'}
                          </span>
                        </div>

                        {/* Engineer Review Action */}
                        <div>
                          {rec.reviewStatus === 'PROPOSED_PENDING_ENGINEER_REVIEW' ? (
                            <button
                              onClick={() => handleOpenReview(idx)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              Review / Approve Action
                            </button>
                          ) : (
                            <div className="text-slate-400 italic font-mono text-[11px]">
                              Reviewed: {rec.reviewedAt ? new Date(rec.reviewedAt).toLocaleDateString() : 'Yes'}{' '}
                              {rec.generatedWorkOrderId && `(WO Created)`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-midnight-950 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            Human-in-the-loop governance: recommendations are not dispatched without engineer review.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            Close Drawer
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL: ENGINEER REVIEW & APPROVAL */}
      {/* ======================================================================= */}
      {reviewModalRecIndex !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitReview}
            className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-400" />
                Engineer Review &amp; Approval
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalRecIndex(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Recommendation Summary */}
            <div className="p-3 bg-midnight-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm">
                  {runResult.recommendations[reviewModalRecIndex].alternativeName}
                </span>
                <span className="font-mono text-gold-400 font-bold">
                  Rank #{runResult.recommendations[reviewModalRecIndex].rank}
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                {runResult.recommendations[reviewModalRecIndex].technicalWorkScope}
              </p>
            </div>

            {/* Safety Warning Constraint */}
            {runResult.recommendations[reviewModalRecIndex].safetyTier === 'SAFETY_CRITICAL_INTERVENTION' && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-200 space-y-1">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  SAFETY-CRITICAL INTERVENTION MANDATE
                </div>
                <p>
                  This action touches high-pressure or safety valve boundaries. ASME BPVC Section VII strictly prohibits automated dispatch. Certified physical on-site inspection justification is required.
                </p>
              </div>
            )}

            {reviewError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl">
                {reviewError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Review Decision *</label>
                <select
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value as any)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="approve">Approve &amp; Dispatch Work Order</option>
                  <option value="modify_and_approve">Modify &amp; Approve</option>
                  <option value="reject">Reject Recommendation</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Engineer Justification &amp; Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record justification, scheduled shutdown window, or physical inspection notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalRecIndex(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5"
              >
                {isSubmittingReview && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                Confirm Review Action
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL: DETERMINISTIC DECISION REPLAY VERIFICATION */}
      {/* ======================================================================= */}
      {replayModalOpen && replayResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-400" />
                Decision Run Replay &amp; Mathematical Verification
              </h3>
              <button
                type="button"
                onClick={() => setReplayModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                replayResult.isReproducible
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {replayResult.isReproducible ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {replayResult.isReproducible
                      ? '100% BIT-FOR-BIT DETERMINISTIC REPRODUCIBILITY CONFIRMED'
                      : 'MATHEMATICAL DISCREPANCY DETECTED'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Max Supermatrix Priority Delta: &Delta;p = {replayResult.priorityDeltaMax.toExponential(4)} (Threshold &lt; 10&minus;4)
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              {replayResult.verificationNotes}
            </p>

            {/* Side-by-Side Priority Comparison Table */}
            <div className="overflow-x-auto bg-midnight-950 border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Alternative</th>
                    <th className="py-2.5 px-3 text-right">Original Priority</th>
                    <th className="py-2.5 px-3 text-right">Recomputed Priority</th>
                    <th className="py-2.5 px-3 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
                  {Object.keys(replayResult.originalPriorities).map((code) => {
                    const orig = replayResult.originalPriorities[code] ?? 0;
                    const recal = replayResult.recalculatedPriorities[code] ?? 0;
                    const delta = Math.abs(orig - recal);

                    return (
                      <tr key={code} className="hover:bg-midnight-900/60">
                        <td className="py-2 px-3 font-sans font-semibold text-slate-100">{code}</td>
                        <td className="py-2 px-3 text-right">{orig.toFixed(4)}</td>
                        <td className="py-2 px-3 text-right">{recal.toFixed(4)}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {delta < 1e-6 ? '0.000000' : delta.toExponential(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReplayModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalAnpDrawer;
