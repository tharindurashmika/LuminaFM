import React, { useEffect, useState, useMemo } from 'react';
import {
  Scale,
  ShieldCheck,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GitCompare,
  FileText,
  PlusCircle,
  Award,
  ArrowRight,
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  Clock,
  TrendingUp,
  TrendingDown,
  Info,
  X,
  ChevronRight,
  Check,
  FileCheck,
} from 'lucide-react';
import {
  ModelGovernanceSnapshot,
  ModelVersionDiffResult,
  DecisionModelSummary,
  LiteratureReference,
  ExpertProfile,
  CriterionGovernanceRecord,
  ValidationStatus,
  ModelProvenance,
  AcademicValidationLevel,
} from '../types/cmms.types';
import { LoadingState, ErrorState, EmptyState } from '../components/ui';
import { governanceService } from '../services/governance.service';

type ActiveTab = 'academic_baseline' | 'version_comparison' | 'commercial_proposals';

export const DecisionGovernancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('academic_baseline');

  // Baseline data state
  const [baselineSnapshot, setBaselineSnapshot] = useState<ModelGovernanceSnapshot | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState<boolean>(true);
  const [baselineError, setBaselineError] = useState<string | null>(null);

  // Model list state
  const [modelsList, setModelsList] = useState<DecisionModelSummary[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);

  // Comparison state
  const [selectedModelAId, setSelectedModelAId] = useState<string>('');
  const [selectedModelBId, setSelectedModelBId] = useState<string>('');
  const [diffResult, setDiffResult] = useState<ModelVersionDiffResult | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Criteria search & filter state in Baseline Tab
  const [criteriaSearch, setCriteriaSearch] = useState<string>('');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>('all');
  const [activeCriterionModal, setActiveCriterionModal] = useState<CriterionGovernanceRecord | null>(null);

  // Modals state for Commercial Tab
  const [isProposeModalOpen, setIsProposeModalOpen] = useState<boolean>(false);
  const [proposeCode, setProposeCode] = useState<string>('');
  const [proposeName, setProposeName] = useState<string>('');
  const [proposeDesc, setProposeDesc] = useState<string>('');
  const [proposeBaseModelId, setProposeBaseModelId] = useState<string>('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState<boolean>(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Expert Evaluation Modal
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState<boolean>(false);
  const [evalTargetModelId, setEvalTargetModelId] = useState<string>('');
  const [evalTargetCriterionCode, setEvalTargetCriterionCode] = useState<string>('');
  const [evalExpertId, setEvalExpertId] = useState<string>('EXP_01');
  const [evalRetentionVote, setEvalRetentionVote] = useState<boolean>(true);
  const [evalRelevanceRating, setEvalRelevanceRating] = useState<number>(5);
  const [evalThreshold, setEvalThreshold] = useState<string>('');
  const [evalComments, setEvalComments] = useState<string>('');
  const [isSubmittingEval, setIsSubmittingEval] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Evidence Modal
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [evidenceTargetModelId, setEvidenceTargetModelId] = useState<string>('');
  const [evidenceTargetCriterionCode, setEvidenceTargetCriterionCode] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<
    'operational_log_sheet' | 'standards_clause' | 'inspection_photograph' | 'test_report' | 'dissertation_text_excerpt'
  >('operational_log_sheet');
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [evidenceDesc, setEvidenceDesc] = useState<string>('');
  const [evidenceStorageUri, setEvidenceStorageUri] = useState<string>('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState<boolean>(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Approval Modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [approvalTargetModel, setApprovalTargetModel] = useState<DecisionModelSummary | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [approvalValidationStatus, setApprovalValidationStatus] = useState<ValidationStatus>('commercial_validated');
  const [approvalValidationLevel, setApprovalValidationLevel] = useState<AcademicValidationLevel>('commercial_field_tested');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Global flash notification
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFlashMessage({ type, text });
    setTimeout(() => setFlashMessage(null), 5000);
  };

  // 1. Initial Load: Fetch Dissertation Baseline & Models List
  const loadBaselineAndModels = async () => {
    setLoadingBaseline(true);
    setBaselineError(null);
    try {
      const [baselineData, modelsData] = await Promise.all([
        governanceService.getBaselineGovernance(),
        governanceService.listDecisionModels(),
      ]);
      setBaselineSnapshot(baselineData);
      setModelsList(modelsData);

      // Pre-select models for comparison if available
      if (modelsData.length > 0) {
        const baselineModel = modelsData.find(
          (m) => m.configuration?.governanceSnapshot?.isAcademicBaseline === true || m.code.includes('MORATUWA')
        ) || modelsData[0];
        setSelectedModelAId(baselineModel.id);
        const secondModel = modelsData.find((m) => m.id !== baselineModel.id) || modelsData[0];
        setSelectedModelBId(secondModel.id);
      }
    } catch (err: any) {
      setBaselineError(err?.message || 'Failed to load governance metadata');
    } finally {
      setLoadingBaseline(false);
    }
  };

  useEffect(() => {
    loadBaselineAndModels();
  }, []);

  // 2. Run Version Comparison
  const handleRunComparison = async () => {
    if (!selectedModelAId || !selectedModelBId) {
      setDiffError('Please select two models to compare');
      return;
    }
    setIsComparing(true);
    setDiffError(null);
    try {
      const result = await governanceService.compareModelVersions(selectedModelAId, selectedModelBId);
      setDiffResult(result);
    } catch (err: any) {
      setDiffError(err?.message || 'Failed to compare model versions');
    } finally {
      setIsComparing(false);
    }
  };

  // 3. Propose New Configuration
  const handleProposeModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeCode || !proposeName) {
      setProposalError('Code and Name are required');
      return;
    }
    setIsSubmittingProposal(true);
    setProposalError(null);
    try {
      await governanceService.proposeModelConfiguration({
        baseModelId: proposeBaseModelId || undefined,
        code: proposeCode,
        name: proposeName,
        description: proposeDesc,
      });
      setIsProposeModalOpen(false);
      setProposeCode('');
      setProposeName('');
      setProposeDesc('');
      showNotification('success', `Proposal "${proposeName}" created successfully under Commercial Client provenance`);
      await loadBaselineAndModels();
    } catch (err: any) {
      setProposalError(err?.message || 'Failed to create proposal');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // 4. Record Expert Evaluation
  const handleRecordEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalTargetModelId || !evalTargetCriterionCode) {
      setEvalError('Target model and criterion code are required');
      return;
    }
    setIsSubmittingEval(true);
    setEvalError(null);
    try {
      const res = await governanceService.recordExpertEvaluation(evalTargetModelId, evalTargetCriterionCode, {
        expertId: evalExpertId,
        retentionVote: evalRetentionVote,
        operationalRelevanceRating: evalRelevanceRating,
        suggestedBenchmarkThreshold: evalThreshold,
        expertComments: evalComments,
      });
      setIsEvaluationModalOpen(false);
      setEvalComments('');
      setEvalThreshold('');
      showNotification(
        'success',
        `Expert evaluation recorded. Criterion consensus retention rate updated: ${res.expertRetentionRate}% (McConachie consensus: ${res.retainsByConsensus ? 'PASS' : 'FAIL'})`
      );
      await loadBaselineAndModels();
    } catch (err: any) {
      setEvalError(err?.message || 'Failed to record expert evaluation');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // 5. Attach Evidence
  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTargetModelId || !evidenceTargetCriterionCode || !evidenceTitle) {
      setEvidenceError('Target model, criterion code, and title are required');
      return;
    }
    setIsSubmittingEvidence(true);
    setEvidenceError(null);
    try {
      await governanceService.recordCriterionEvidence(evidenceTargetModelId, evidenceTargetCriterionCode, {
        evidenceType,
        title: evidenceTitle,
        description: evidenceDesc,
        storageUri: evidenceStorageUri,
      });
      setIsEvidenceModalOpen(false);
      setEvidenceTitle('');
      setEvidenceDesc('');
      setEvidenceStorageUri('');
      showNotification('success', 'Evidence successfully attached to criterion');
      await loadBaselineAndModels();
    } catch (err: any) {
      setEvidenceError(err?.message || 'Failed to attach evidence');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // 6. Approve Model Proposal
  const handleApproveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalTargetModel) return;
    setIsSubmittingApproval(true);
    setApprovalError(null);
    try {
      await governanceService.approveModelProposal(approvalTargetModel.id, {
        action: approvalAction,
        notes: approvalNotes,
        validationStatusResult: approvalValidationStatus,
        academicValidationLevel: approvalValidationLevel,
      });
      setIsApprovalModalOpen(false);
      setApprovalNotes('');
      showNotification('success', `Model ${approvalTargetModel.code} status updated to ${approvalAction}`);
      await loadBaselineAndModels();
    } catch (err: any) {
      setApprovalError(err?.message || 'Approval action failed');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // 7. Activate Model for CMMS Operations
  const handleActivateModel = async (modelId: string, modelCode: string) => {
    if (!confirm(`Are you sure you want to activate model "${modelCode}" for live CMMS decision-making? Previous active models will be retired.`)) {
      return;
    }
    try {
      await governanceService.activateModel(modelId);
      showNotification('success', `Model "${modelCode}" is now the ACTIVE decision model for facility operations!`);
      await loadBaselineAndModels();
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to activate model');
    }
  };

  // Filtered criteria list for Baseline Tab
  const criteriaList = useMemo(() => {
    if (!baselineSnapshot?.criteriaGovernance) return [];
    return Object.values(baselineSnapshot.criteriaGovernance).filter((c) => {
      const matchText =
        c.criterionCode.toLowerCase().includes(criteriaSearch.toLowerCase()) ||
        c.criterionName.toLowerCase().includes(criteriaSearch.toLowerCase());
      if (!matchText) return false;
      if (selectedClusterFilter === 'all') return true;
      return c.criterionCode.startsWith(selectedClusterFilter);
    });
  }, [baselineSnapshot, criteriaSearch, selectedClusterFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* Flash Notification Banner */}
      {flashMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition-all ${
            flashMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {flashMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{flashMessage.text}</span>
          </div>
          <button
            onClick={() => setFlashMessage(null)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-midnight-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Scale className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              ANP Model Governance & Academic Validation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-500/10 text-gold-400 border border-gold-500/30">
              Moratuwa 2025 Baseline
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-3xl">
            Multi-criteria decision architecture separating the peer-reviewed dissertation baseline from commercial client proposals.
            Enforces McConachie consensus (<span className="font-semibold text-slate-300">&ge; 80%</span> retention rate) and Saaty consistency (<span className="font-semibold text-slate-300">CR &le; 0.10</span>).
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsProposeModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Propose Configuration
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab('academic_baseline')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === 'academic_baseline'
              ? 'border-gold-500 text-gold-400 bg-gold-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Award className="h-4 w-4" />
          Academic Research Baseline (Moratuwa 2025)
        </button>

        <button
          onClick={() => {
            setActiveTab('version_comparison');
            if (!diffResult && selectedModelAId && selectedModelBId) {
              handleRunComparison();
            }
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === 'version_comparison'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <GitCompare className="h-4 w-4" />
          Model Version Comparison & Diff Engine
        </button>

        <button
          onClick={() => setActiveTab('commercial_proposals')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
            activeTab === 'commercial_proposals'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          Commercial Client Proposals & Governance
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACADEMIC RESEARCH BASELINE */}
      {/* ========================================================================= */}
      {activeTab === 'academic_baseline' && (
        <div className="space-y-6">
          {loadingBaseline ? (
            <LoadingState
              title="Loading Authoritative Dissertation Academic Baseline..."
              description="Retrieving Saaty Analytic Network Process (ANP) supermatrix, criteria weights, and expert evaluation logs."
            />
          ) : baselineError ? (
            <ErrorState
              title="Failed to Load Academic Baseline"
              message={baselineError}
              onRetry={loadBaselineAndModels}
              retryLabel="Reload Baseline"
            />
          ) : (
            <>
              {/* Research Hero Banner */}
              <div className="bg-gradient-to-r from-midnight-900 via-midnight-850 to-indigo-950/40 border border-gold-500/30 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-500/20 text-gold-400 border border-gold-500/40">
                        Peer-Reviewed Master's Dissertation Baseline
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        University of Moratuwa (June 2025)
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        100% Expert Consensus (5/5)
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-100">
                      Development of a Software-Based Boiler Maintenance Decision-Making Tool
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-200">Author:</span> Vishal Perera &bull;{' '}
                      <span className="font-semibold text-slate-200">Field Baseline Facility:</span> The Kingsbury Hotel, Colombo &bull;{' '}
                      <span className="font-semibold text-slate-200">Asset:</span> 1,100 kg/h Oil-Fired Fire-Tube Steam Boiler
                    </p>
                    <p className="text-xs text-slate-400 max-w-4xl pt-1">
                      {baselineSnapshot?.academicFidelityDisclosure}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                    <div className="bg-midnight-950/80 border border-slate-800 p-3.5 rounded-xl text-center">
                      <div className="text-2xl font-bold text-gold-400">22+</div>
                      <div className="text-xs text-slate-400">Validated Criteria</div>
                    </div>
                    <div className="bg-midnight-950/80 border border-slate-800 p-3.5 rounded-xl text-center">
                      <div className="text-2xl font-bold text-indigo-400">5</div>
                      <div className="text-xs text-slate-400">Domain Experts</div>
                    </div>
                    <div className="bg-midnight-950/80 border border-slate-800 p-3.5 rounded-xl text-center col-span-2 sm:col-span-1">
                      <div className="text-2xl font-bold text-emerald-400">&le; 0.10</div>
                      <div className="text-xs text-slate-400">Saaty CR Verified</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subsection A: 5-Member Expert Panel Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-base font-semibold text-slate-100">
                      Authoritative 5-Member Expert Validation Panel
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Governed under anonymized research protocol (E1 to E5)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {baselineSnapshot?.expertRoster.map((expert) => (
                    <div
                      key={expert.expertId}
                      className="bg-midnight-900 border border-slate-800 hover:border-indigo-500/40 p-4 rounded-xl transition-all space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {expert.publicReference}
                        </span>
                        <span className="text-xs text-gold-400 font-semibold">
                          {expert.yearsOfExperience} yrs exp
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {expert.professionalRole}
                        </h4>
                        <p className="text-xs text-slate-400">{expert.sector}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] font-mono text-slate-400 line-clamp-2">
                          {expert.technicalFocus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subsection B: Peer-Reviewed Literature Catalog */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-gold-400" />
                    <h3 className="text-base font-semibold text-slate-100">
                      Peer-Reviewed Literature References & Standards Base
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    6 Primary citations underpinning ANP network & operational benchmarks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {baselineSnapshot?.literatureCatalog.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-midnight-900 border border-slate-800 p-4 rounded-xl space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-gold-400">
                            [{ref.citationKey}]
                          </span>
                          <span className="text-xs text-slate-400">{ref.year}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                          {ref.title}
                        </h4>
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          {ref.author} &bull; {ref.source}
                        </p>
                        {ref.excerpts && (
                          <div className="mt-2.5 p-2 bg-midnight-950/70 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
                            "{ref.excerpts}"
                          </div>
                        )}
                      </div>

                      {ref.doiOrUrl && (
                        <a
                          href={ref.doiOrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pt-2 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors inline-block"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View publication / DOI reference
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subsection C: Criteria Governance & McConachie Consensus Matrix */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-emerald-400" />
                      Criteria Governance & McConachie Consensus Matrix
                    </h3>
                    <p className="text-xs text-slate-400">
                      All criteria verified against the &ge; 80% consensus threshold (McConachie et al. 2019) and grounded in empirical baseline readings.
                    </p>
                  </div>

                  {/* Search & Filter Controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search criteria..."
                        value={criteriaSearch}
                        onChange={(e) => setCriteriaSearch(e.target.value)}
                        className="pl-9 pr-3 py-1.5 bg-midnight-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <select
                      value={selectedClusterFilter}
                      onChange={(e) => setSelectedClusterFilter(e.target.value)}
                      className="px-3 py-1.5 bg-midnight-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Clusters</option>
                      <option value="CRIT_EFF">Energy & Thermal Efficiency</option>
                      <option value="CRIT_INT">Mechanical & Structural Integrity</option>
                      <option value="CRIT_WTR">Water Chemistry & Scaling</option>
                      <option value="CRIT_REL">Operational Reliability & Safety</option>
                    </select>
                  </div>
                </div>

                {/* Criteria Table */}
                <div className="overflow-x-auto bg-midnight-900 border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-midnight-950 border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-semibold">Criterion Code</th>
                        <th className="py-3 px-4 font-semibold">Criterion Name</th>
                        <th className="py-3 px-4 font-semibold">Source Provenance</th>
                        <th className="py-3 px-4 font-semibold">Consensus Retention</th>
                        <th className="py-3 px-4 font-semibold">Literature Basis</th>
                        <th className="py-3 px-4 font-semibold">Baseline Evidence</th>
                        <th className="py-3 px-4 font-semibold text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {criteriaList.map((crit) => (
                        <tr key={crit.criterionCode} className="hover:bg-midnight-850/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                            {crit.criterionCode}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-100">
                            {crit.criterionName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                              {crit.source}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <CheckCircle2 className="h-3 w-3" />
                              {crit.expertRetentionRate}% (5/5)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {crit.literatureReferences.length > 0 ? (
                              <span className="text-gold-400 font-mono">
                                {crit.literatureReferences.map((r) => `[${r.citationKey}]`).join(' ')}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Expert interview</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {crit.evidence.length > 0 ? (
                              <span className="text-slate-300 truncate max-w-xs block">
                                {crit.evidence[0].title}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setActiveCriterionModal(crit)}
                              className="px-2.5 py-1 bg-midnight-950 hover:bg-indigo-600 hover:text-white border border-slate-700 rounded text-slate-300 transition-colors"
                            >
                              Audit Record
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MODEL VERSION COMPARISON & DIFF ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'version_comparison' && (
        <div className="space-y-6">
          {/* Comparison Selector Card */}
          <div className="bg-midnight-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-indigo-400" />
                  Model Version Diff & Saaty ANP Priority Shift Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Select two model versions to compute criteria diffs, benchmark modifications, and mathematical Limit Supermatrix alternative priority shifts (&Delta;p<sub>a</sub>).
                </p>
              </div>

              {/* Model Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Model A (Reference / Baseline)</label>
                  <select
                    value={selectedModelAId}
                    onChange={(e) => setSelectedModelAId(e.target.value)}
                    className="px-3 py-1.5 bg-midnight-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 min-w-[220px]"
                  >
                    {modelsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} (v{m.version}) - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5 text-slate-500">
                  <ArrowRight className="h-4 w-4" />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Model B (Target / Proposal)</label>
                  <select
                    value={selectedModelBId}
                    onChange={(e) => setSelectedModelBId(e.target.value)}
                    className="px-3 py-1.5 bg-midnight-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 min-w-[220px]"
                  >
                    {modelsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} (v{m.version}) - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-5">
                  <button
                    onClick={handleRunComparison}
                    disabled={isComparing || !selectedModelAId || !selectedModelBId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                  >
                    {isComparing ? <Sparkles className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
                    Compute Diff
                  </button>
                </div>
              </div>
            </div>
          </div>

          {diffError && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-sm">
              {diffError}
            </div>
          )}

          {diffResult && (
            <div className="space-y-6">
              {/* Provenance Alert Banner */}
              {!diffResult.provenanceDifference.isProvenanceEqual && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold uppercase tracking-wider text-amber-200">
                      Academic Provenance Separation Notice
                    </p>
                    <p>{diffResult.provenanceDifference.message}</p>
                    <p className="text-amber-400 font-mono text-[11px]">
                      Model A [{diffResult.modelA.code}] is "{diffResult.modelA.provenance}" ({diffResult.modelA.academicValidationLevel}) &bull; Model B [{diffResult.modelB.code}] is "{diffResult.modelB.provenance}" ({diffResult.modelB.academicValidationLevel}).
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Model Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-midnight-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Model A (Reference)
                  </span>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-100">{diffResult.modelA.name}</h4>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      v{diffResult.modelA.version}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Provenance: {diffResult.modelA.provenance}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/30">
                      Level: {diffResult.modelA.academicValidationLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      Status: {diffResult.modelA.status}
                    </span>
                  </div>
                </div>

                <div className="bg-midnight-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Model B (Target)
                  </span>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-100">{diffResult.modelB.name}</h4>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      v{diffResult.modelB.version}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Provenance: {diffResult.modelB.provenance}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/30">
                      Level: {diffResult.modelB.academicValidationLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      Status: {diffResult.modelB.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mathematical ANP Priority Shifts Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <Scale className="h-5 w-5 text-gold-400" />
                      Maintenance Alternative Priority Shifts (Saaty Limit Supermatrix)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Calculates the exact mathematical shift in alternative weights (&Delta;p<sub>a</sub> = p<sub>a</sub><sup>(B)</sup> - p<sub>a</sub><sup>(A)</sup>) and resulting CMMS ranking changes.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {diffResult.anpPriorityShifts.topPromotedAlternative && (
                      <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Top Promoted: {diffResult.anpPriorityShifts.topPromotedAlternative}
                      </span>
                    )}
                    {diffResult.anpPriorityShifts.topDemotedAlternative && (
                      <span className="text-xs px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Top Demoted: {diffResult.anpPriorityShifts.topDemotedAlternative}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority Shift Table & Visual Bars */}
                <div className="overflow-x-auto bg-midnight-900 border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-midnight-950 border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-semibold">Alternative</th>
                        <th className="py-3 px-4 font-semibold text-right">Priority Model A (p_a)</th>
                        <th className="py-3 px-4 font-semibold text-right">Priority Model B (p_b)</th>
                        <th className="py-3 px-4 font-semibold text-right">Shift (&Delta;p)</th>
                        <th className="py-3 px-4 font-semibold text-center">Rank Shift</th>
                        <th className="py-3 px-4 font-semibold">Relative Visual Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {diffResult.anpPriorityShifts.shifts.map((shift) => (
                        <tr key={shift.code} className="hover:bg-midnight-850/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{shift.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">{shift.code}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {(shift.priorityA * 100).toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-100 font-bold">
                            {(shift.priorityB * 100).toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                shift.deltaPriority > 0.0001
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : shift.deltaPriority < -0.0001
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {shift.deltaPriority > 0 ? '+' : ''}
                              {(shift.deltaPriority * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-xs">
                            <span className="text-slate-400">#{shift.rankA}</span>
                            <span className="mx-1.5 text-slate-600">&rarr;</span>
                            <span className="text-slate-100 font-bold">#{shift.rankB}</span>
                            {shift.rankShift > 0 && (
                              <span className="ml-1 text-emerald-400 font-semibold">(+{shift.rankShift})</span>
                            )}
                            {shift.rankShift < 0 && (
                              <span className="ml-1 text-rose-400 font-semibold">({shift.rankShift})</span>
                            )}
                          </td>
                          <td className="py-3 px-4 min-w-[200px]">
                            {/* Dual Bars */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 w-4">A:</span>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-400 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, shift.priorityA * 300)}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gold-400 w-4">B:</span>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-gold-400 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, shift.priorityB * 300)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Criteria Differences */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-400" />
                  Criteria Differences ({diffResult.criteriaDiff.totalChanges} changes)
                </h4>

                {diffResult.criteriaDiff.totalChanges === 0 ? (
                  <div className="p-4 bg-midnight-900 border border-slate-800 rounded-xl text-xs text-slate-400">
                    Criteria topology and threshold configurations are identical between Model A and Model B.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {diffResult.criteriaDiff.added.length > 0 && (
                      <div className="bg-midnight-900 border border-slate-800 p-4 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-emerald-400">
                          Added in Model B ({diffResult.criteriaDiff.added.length})
                        </span>
                        <ul className="text-xs space-y-1 text-slate-300">
                          {diffResult.criteriaDiff.added.map((c) => (
                            <li key={c.criterionCode} className="font-mono">
                              + {c.criterionCode}: {c.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {diffResult.criteriaDiff.modified.length > 0 && (
                      <div className="bg-midnight-900 border border-slate-800 p-4 rounded-xl space-y-2 col-span-2">
                        <span className="text-xs font-bold text-gold-400">
                          Modified Benchmarks / Weights ({diffResult.criteriaDiff.modified.length})
                        </span>
                        <div className="divide-y divide-slate-800 text-xs">
                          {diffResult.criteriaDiff.modified.map((c) => (
                            <div key={c.criterionCode} className="py-2 space-y-1">
                              <span className="font-bold text-slate-200">{c.criterionCode} - {c.name}</span>
                              <div className="text-slate-400 space-y-0.5">
                                {c.changes.map((ch, idx) => (
                                  <div key={idx} className="font-mono text-[11px]">
                                    &bull; {ch.field}: {String(ch.valueA)} &rarr;{' '}
                                    <span className="text-gold-300 font-bold">{String(ch.valueB)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMMERCIAL CLIENT PROPOSALS & GOVERNANCE */}
      {/* ========================================================================= */}
      {activeTab === 'commercial_proposals' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-midnight-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                Decision Models Registry & Commercial Governance
              </h3>
              <p className="text-xs text-slate-400">
                Manage commercial client model proposals, expert interview consensus logs, evidence attachments, and activation workflows.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsProposeModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <PlusCircle className="h-4 w-4" />
                Propose Commercial Configuration
              </button>
            </div>
          </div>

          {/* Models Table */}
          <div className="overflow-x-auto bg-midnight-900 border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-midnight-950 border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-semibold">Model Code</th>
                  <th className="py-3 px-4 font-semibold">Model Name</th>
                  <th className="py-3 px-4 font-semibold">Version</th>
                  <th className="py-3 px-4 font-semibold">Provenance</th>
                  <th className="py-3 px-4 font-semibold">Academic Validation</th>
                  <th className="py-3 px-4 font-semibold">CMMS Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {modelsList.map((m) => {
                  const isBaseline =
                    m.configuration?.governanceSnapshot?.isAcademicBaseline === true ||
                    m.code.includes('MORATUWA');
                  const validationLevel =
                    m.configuration?.governanceSnapshot?.academicValidationLevel ||
                    (isBaseline ? 'peer_reviewed_dissertation' : 'unvalidated_client_proposal');

                  return (
                    <tr key={m.id} className="hover:bg-midnight-850/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                        {m.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100">
                        {m.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        v{m.version}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isBaseline
                              ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {isBaseline ? 'Academic Baseline' : 'Commercial Client'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            validationLevel === 'peer_reviewed_dissertation'
                              ? 'bg-gold-500/10 text-gold-400'
                              : validationLevel === 'commercial_field_tested'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {validationLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            m.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : m.status === 'approved'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {/* Evidence */}
                        <button
                          onClick={() => {
                            setEvidenceTargetModelId(m.id);
                            setEvidenceTargetCriterionCode('CRIT_EFF_01');
                            setIsEvidenceModalOpen(true);
                          }}
                          className="px-2 py-1 bg-midnight-950 hover:bg-slate-800 text-slate-300 rounded text-[11px] border border-slate-800"
                        >
                          + Evidence
                        </button>

                        {/* Expert Interview */}
                        <button
                          onClick={() => {
                            setEvalTargetModelId(m.id);
                            setEvalTargetCriterionCode('CRIT_EFF_01');
                            setIsEvaluationModalOpen(true);
                          }}
                          className="px-2 py-1 bg-midnight-950 hover:bg-slate-800 text-indigo-300 rounded text-[11px] border border-slate-800"
                        >
                          + Expert Interview
                        </button>

                        {/* Approve */}
                        {m.status !== 'active' && (
                          <button
                            onClick={() => {
                              setApprovalTargetModel(m);
                              setIsApprovalModalOpen(true);
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold"
                          >
                            Review / Approve
                          </button>
                        )}

                        {/* Activate */}
                        {m.status === 'approved' && (
                          <button
                            onClick={() => handleActivateModel(m.id, m.code)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRITERION DETAIL & AUDIT EVIDENCE DRAWER */}
      {/* ========================================================================= */}
      {activeCriterionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {activeCriterionModal.criterionCode}
                </span>
                <h3 className="text-lg font-bold text-slate-100">
                  {activeCriterionModal.criterionName}
                </h3>
              </div>
              <button
                onClick={() => setActiveCriterionModal(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  McConachie Consensus Retention Score
                </h4>
                <div className="mt-1 p-3 bg-midnight-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">
                    Expert Retention: <span className="text-emerald-400 font-bold">{activeCriterionModal.expertRetentionRate}%</span> (Required &ge; 80%)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    VALIDATED BY EXPERT PANEL
                  </span>
                </div>
              </div>

              {activeCriterionModal.literatureReferences.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Supporting Peer-Reviewed Literature
                  </h4>
                  <div className="mt-1 space-y-2">
                    {activeCriterionModal.literatureReferences.map((ref) => (
                      <div key={ref.id} className="p-2.5 bg-midnight-950 rounded-lg border border-slate-800">
                        <div className="font-semibold text-slate-200">[{ref.citationKey}] {ref.title}</div>
                        <div className="text-slate-400 italic text-[11px]">{ref.author} ({ref.year}) &bull; {ref.source}</div>
                        {ref.excerpts && (
                          <div className="mt-1 text-slate-300 font-mono text-[11px]">"{ref.excerpts}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCriterionModal.evidence.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Field & Empirical Baseline Evidence (The Kingsbury Baseline)
                  </h4>
                  <div className="mt-1 space-y-2">
                    {activeCriterionModal.evidence.map((ev) => (
                      <div key={ev.id} className="p-2.5 bg-midnight-950 rounded-lg border border-slate-800">
                        <div className="font-semibold text-slate-200">{ev.title}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{ev.description}</div>
                        {ev.sourceReference && (
                          <div className="text-gold-400 font-mono text-[10px] mt-1">Source: {ev.sourceReference}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setActiveCriterionModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROPOSE NEW CONFIGURATION */}
      {/* ========================================================================= */}
      {isProposeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleProposeModel}
            className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-indigo-400" />
                Propose Commercial Configuration
              </h3>
              <button
                type="button"
                onClick={() => setIsProposeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Academic Integrity Notice */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                New proposals are designated <strong className="text-white">commercial_client</strong> and <strong className="text-white">unvalidated_client_proposal</strong>. Academic dissertation validation remains exclusive to the peer-reviewed baseline.
              </span>
            </div>

            {proposalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                {proposalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Base Model (Clone Topology From)</label>
                <select
                  value={proposeBaseModelId}
                  onChange={(e) => setProposeBaseModelId(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Start Fresh / Default Baseline --</option>
                  {modelsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} (v{m.version}) - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Configuration Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOILER_HOTEL_COMMERCIAL_V1"
                  value={proposeCode}
                  onChange={(e) => setProposeCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Configuration Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hospitality Boiler Commercial Maintenance Profile"
                  value={proposeName}
                  onChange={(e) => setProposeName(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description & Operational Scope</label>
                <textarea
                  rows={3}
                  placeholder="Operational context, specialized thresholds, or equipment modifications..."
                  value={proposeDesc}
                  onChange={(e) => setProposeDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsProposeModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingProposal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmittingProposal && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                Submit Proposal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD EXPERT EVALUATION */}
      {/* ========================================================================= */}
      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleRecordEvaluation}
            className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                Record Expert Interview Evaluation
              </h3>
              <button
                type="button"
                onClick={() => setIsEvaluationModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {evalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                {evalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Criterion Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CRIT_EFF_01"
                  value={evalTargetCriterionCode}
                  onChange={(e) => setEvalTargetCriterionCode(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Expert Identifier / Reference *</label>
                <select
                  value={evalExpertId}
                  onChange={(e) => setEvalExpertId(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="EXP_01">E1 - Chief Marine Engineer (34 yrs)</option>
                  <option value="EXP_02">E2 - Power Station Superintendent (35 yrs)</option>
                  <option value="EXP_03">E3 - Director of Engineering, Hospitality (32 yrs)</option>
                  <option value="EXP_04">E4 - Industrial Utilities Consultant (18 yrs)</option>
                  <option value="EXP_05">E5 - Statutory Chief Boiler Inspector (52 yrs)</option>
                  <option value="COMMERCIAL_SME_01">Commercial SME Panel Member</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Retention Vote (McConachie Consensus) *</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={evalRetentionVote === true}
                      onChange={() => setEvalRetentionVote(true)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span className="text-emerald-400 font-semibold">Retain Criterion (&ge; 80% consensus pool)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={evalRetentionVote === false}
                      onChange={() => setEvalRetentionVote(false)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span className="text-rose-400 font-semibold">Exclude / Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Operational Relevance Rating (1 to 5 Stars)</label>
                <select
                  value={evalRelevanceRating}
                  onChange={(e) => setEvalRelevanceRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5 - Critical & Essential to Steam Safety</option>
                  <option value={4}>4 - High Operational Importance</option>
                  <option value={3}>3 - Moderate Relevance</option>
                  <option value={2}>2 - Marginal Impact</option>
                  <option value={1}>1 - Negligible / Discard</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Suggested Benchmark Threshold</label>
                <input
                  type="text"
                  placeholder="e.g. > 15 deg C above baseline"
                  value={evalThreshold}
                  onChange={(e) => setEvalThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Expert Interview Comments & Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Expert rationale, field observation notes, or empirical references..."
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEvaluationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEval}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmittingEval && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                Log Evaluation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ATTACH CRITERION EVIDENCE */}
      {/* ========================================================================= */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleAttachEvidence}
            className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Attach Criterion Evidence
              </h3>
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {evidenceError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                {evidenceError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Criterion Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CRIT_EFF_01"
                  value={evidenceTargetCriterionCode}
                  onChange={(e) => setEvidenceTargetCriterionCode(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Evidence Type *</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="operational_log_sheet">Operational Log Sheet</option>
                  <option value="inspection_photograph">Inspection Photograph</option>
                  <option value="standards_clause">Standards Clause (ASME / BS EN)</option>
                  <option value="test_report">Laboratory / Water Test Report</option>
                  <option value="dissertation_text_excerpt">Dissertation Text Excerpt</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Evidence Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kingsbury Daily Logsheet - Flue Gas Baseline Deviation"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description & Empirical Findings</label>
                <textarea
                  rows={3}
                  placeholder="Observed data points, readings context, or inspection findings..."
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Storage URI / Document Link</label>
                <input
                  type="text"
                  placeholder="s3://luminafm-evidence/logsheets/2026-11-kingsbury.pdf"
                  value={evidenceStorageUri}
                  onChange={(e) => setEvidenceStorageUri(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEvidence}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmittingEvidence && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                Attach Evidence
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVIEW & APPROVE MODEL PROPOSAL */}
      {/* ========================================================================= */}
      {isApprovalModalOpen && approvalTargetModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleApproveProposal}
            className="bg-midnight-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                Review & Approve Configuration: {approvalTargetModel.code}
              </h3>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Academic Integrity Warning */}
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Strict Academic Validation Constraint
              </div>
              <p>
                Commercial proposals cannot claim <code>peer_reviewed_dissertation</code>. Attempting to claim academic validation without thesis peer review will trigger an <code>ILLEGAL_ACADEMIC_VALIDATION_CLAIM</code> error (HTTP 422).
              </p>
            </div>

            {approvalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                {approvalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Approval Decision *</label>
                <select
                  value={approvalAction}
                  onChange={(e) => setApprovalAction(e.target.value as any)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="approved">Approve Model (Valid for operational deployment)</option>
                  <option value="rejected">Reject Model Proposal</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Permitted Validation Level *</label>
                <select
                  value={approvalValidationLevel}
                  onChange={(e) => setApprovalValidationLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="commercial_field_tested">commercial_field_tested (Passed internal SME review)</option>
                  <option value="unvalidated_client_proposal">unvalidated_client_proposal (Provisional)</option>
                  <option value="industry_expert_panel">industry_expert_panel (External panel)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Audit Review Notes & Justification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record review notes, matrix consistency verification comments, or audit reasoning..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-midnight-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingApproval}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmittingApproval && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                Confirm Review Decision
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DecisionGovernancePage;
