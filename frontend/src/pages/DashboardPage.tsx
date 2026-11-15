import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Layers,
  ArrowUpRight,
  Shield,
  Scale,
  Sparkles,
  Wrench,
  Calendar,
  DollarSign,
  Activity,
  Network,
  Clock,
  TrendingUp,
  Plus,
  Lock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { CriticalityBadge, WorkOrderStatusBadge, PriorityBadge } from '../components/ui/StatusBadge';
import { ActiveMaintenanceAlerts } from '../components/dashboard/ActiveMaintenanceAlerts';
import { ChillerModuleCard } from '../components/equipment/ChillerModuleCard';
import { operationalAnpApiService } from '../services/operational-anp.service';
import { OperationalAnpDrawer } from '../components/decision-support/OperationalAnpDrawer';
import {
  OperationalAnpExecutionResult,
  WorkOrderSummary,
  MaintenanceSchedule,
  FaultHistoryRecord,
} from '../types/cmms.types';
import { analyticsApiService, OverviewKpiMetrics } from '../services/analytics.service';
import { workOrdersApiService } from '../services/work-orders.service';
import { maintenanceApiService } from '../services/maintenance.service';
import { inspectionsApiService } from '../services/inspections.service';

export const DashboardPage: React.FC = () => {
  const { organization, activeRole } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kpis, setKpis] = useState<OverviewKpiMetrics | null>(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrderSummary[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<MaintenanceSchedule[]>([]);
  const [recentFaults, setRecentFaults] = useState<FaultHistoryRecord[]>([]);
  const [operationalRun, setOperationalRun] = useState<OperationalAnpExecutionResult | null>(null);
  const [isAnpDrawerOpen, setIsAnpDrawerOpen] = useState<boolean>(false);

  const canViewFinancials = activeRole === 'Organization Admin' || activeRole === 'Plant Reliability Engineer';

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpiData, woData, schedulesData, faultsData] = await Promise.all([
        analyticsApiService.getOverviewKpiMetrics(),
        workOrdersApiService.listWorkOrders(),
        maintenanceApiService.listSchedules(),
        inspectionsApiService.listFaults(),
      ]);

      setKpis(kpiData);
      setRecentWorkOrders(woData.slice(0, 4));
      setUpcomingSchedules(schedulesData.slice(0, 3));
      setRecentFaults(faultsData.slice(0, 3));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Load ANP Operational Run in background
    operationalAnpApiService
      .processOperationalLog({
        assetId: 'a1000000-0000-0000-0000-000000000001',
        signals: [
          { key: 'STEAM_PRESSURE', value: 8.5, unit: 'bar' },
          { key: 'FLUE_GAS_TEMP', value: 205.0, unit: '°C' }, // Soot excursion > 190°C
          { key: 'BOILER_WATER_TDS', value: 2400, unit: 'ppm' },
          { key: 'AMBIENT_TEMP', value: 30.0, unit: '°C' },
          { key: 'WATER_LEVEL_OK', value: true },
        ],
      })
      .then((run) => setOperationalRun(run))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs md:text-sm font-mono text-indigo-400 uppercase tracking-widest mb-1">
            <Shield className="h-4 w-4 text-gold-400" />
            <span>Tenant Command Center • {organization?.code}</span>
            <span className="text-slate-600">•</span>
            <span className="text-gold-300 font-semibold">{activeRole}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {organization?.name || 'LuminaFM'} — Facility Operations
          </h1>
          <p className="text-base text-slate-400 mt-1">
            Cross-discipline facility maintenance overview: assets, preventive schedules, work order execution, and cost tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadDashboardData}
            title="Refresh dashboard metrics"
            className="p-2.5 rounded-xl border border-slate-800 bg-midnight-900/80 hover:bg-midnight-800 text-slate-300 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link to="/maintenance-calendar" className="lumina-btn-secondary text-sm">
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </Link>
          <Link to="/work-orders" className="lumina-btn-primary text-sm">
            <span>Work Orders</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Critical Safety Alert Banner (Strictly Decoupled from ANP) */}
      <div className="lumina-card lumina-alert-critical p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-gold-500/20 border border-gold-500/40 shrink-0">
            <AlertTriangle className="h-6 w-6 text-gold-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs md:text-sm font-mono uppercase tracking-wider text-gold-300 font-semibold">
                Critical Safety Alert • Direct Escalation Rule
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-red-950/80 text-red-300 border border-red-500/40">
                Safety Priority High
              </span>
            </div>
            <p className="text-sm md:text-base text-slate-100 mt-1 leading-snug">
              <strong>BLR-001 (High-Pressure Steam Boiler)</strong> safety interlock test due.
              Work order <span className="font-mono text-gold-300 font-semibold">WO-2026-00001</span> is currently{' '}
              <span className="underline decoration-gold-400/60 font-mono">in_progress</span> by lead technician.
            </p>
          </div>
        </div>
        <Link
          to="/work-orders"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0 px-4 py-2.5 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-200 border border-gold-400/40 text-xs md:text-sm font-mono font-semibold transition-colors"
        >
          View Work Order
        </Link>
      </div>

      {/* Top Facility KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Registered Assets */}
        <Link to="/assets" className="lumina-card lumina-card-hover p-5 block">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Facility Assets</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-white font-mono">
              {kpis?.totalAssets ?? 48}
            </span>
            <span className="text-xs text-indigo-300 font-mono">2 Hierarchies</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Physical locations &amp; technical systems linked
          </p>
        </Link>

        {/* Metric 2: Active Work Orders */}
        <Link to="/work-orders" className="lumina-card lumina-card-hover p-5 block">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Work Orders</span>
            <ClipboardCheck className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-white font-mono">
              {kpis?.activeWorkOrders ?? 4}
            </span>
            <span className="text-xs text-amber-400 font-mono">In Workflow</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Audited state machine with transaction logging
          </p>
        </Link>

        {/* Metric 3: PM Compliance % */}
        <Link to="/maintenance-calendar" className="lumina-card lumina-card-hover p-5 block">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>PM Compliance Rate</span>
            <Calendar className="h-4 w-4 text-gold-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-gold-300 font-mono">
              {kpis?.pmComplianceRate ?? 96.2}%
            </span>
            <span className="text-xs text-emerald-400 font-mono">Target &ge; 90%</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Calendar &amp; runtime hours scheduling active
          </p>
        </Link>

        {/* Metric 4: Role-Aware Card (Spend MTD vs MTBF / Shift Health) */}
        {canViewFinancials ? (
          <Link to="/cost-analysis" className="lumina-card lumina-card-hover p-5 block border-indigo-500/30">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Maintenance Spend (MTD)</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-emerald-300 font-mono">
                {kpis?.currency || 'LKR'} {((kpis?.totalMaintenanceSpendMtd || 170000) / 1000).toFixed(0)}k
              </span>
              <span className="text-xs text-indigo-300 font-mono">72% PM Ratio</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Proactive target met (industry target: &gt;70%)
            </p>
          </Link>
        ) : (
          <div className="lumina-card p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Equipment Reliability (MTBF)</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-white font-mono">
                {kpis?.mtbfHours ?? 1768} hrs
              </span>
              <span className="text-xs text-indigo-300 font-mono">Operational</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="h-3 w-3 text-slate-500" />
              <span>Cost metrics restricted to engineers</span>
            </p>
          </div>
        )}
      </div>

      {/* Main Dual-Column Operational Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column 1: Active Work Orders Register Preview */}
        <div className="lumina-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-indigo-400" />
                Active Work Orders
              </h2>
              <p className="text-xs text-slate-400">
                Current maintenance dispatches across all facility equipment
              </p>
            </div>
            <Link
              to="/work-orders"
              className="text-xs text-indigo-400 hover:text-gold-300 font-mono flex items-center gap-1"
            >
              All Orders ({kpis?.activeWorkOrders ?? recentWorkOrders.length}) →
            </Link>
          </div>

          {recentWorkOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No active work orders</p>
          ) : (
            <div className="space-y-3">
              {recentWorkOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="p-3.5 rounded-xl bg-midnight-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-indigo-300 font-medium">
                        {wo.workOrderNumber}
                      </span>
                      <span className="text-xs font-mono text-slate-500">• {wo.asset?.assetCode || 'Facility'}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 font-medium truncate">{wo.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                      <span>{wo.maintenanceType?.name || 'General'}</span>
                      <span>•</span>
                      <span>Scheduled: {wo.scheduledStartAt ? wo.scheduledStartAt.slice(0, 10) : 'Open'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={wo.priority} />
                    <WorkOrderStatusBadge status={wo.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column 1: Upcoming Maintenance Schedules */}
        <div className="lumina-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gold-400" />
                Preventive Maintenance Due
              </h2>
              <p className="text-xs text-slate-400">
                Scheduled recurring tasks and inspections due soon
              </p>
            </div>
            <Link
              to="/maintenance-calendar"
              className="text-xs text-indigo-400 hover:text-gold-300 font-mono flex items-center gap-1"
            >
              Full Calendar →
            </Link>
          </div>

          {upcomingSchedules.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No upcoming schedules</p>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((sched) => (
                <div
                  key={sched.id}
                  className="p-3.5 rounded-xl bg-midnight-950/80 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gold-400 font-medium">
                        {sched.assetCode}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">• {sched.frequencyType}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5 font-medium truncate">{sched.planTitle}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Next Due: {sched.nextDueAt ? sched.nextDueAt.slice(0, 10) : 'Pending calculation'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {sched.isOverdue ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-950 text-red-300 border border-red-500/40 font-semibold">
                        Overdue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold">
                        On Schedule
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Left Column 2: Equipment Hierarchy Quick Glance */}
        <div className="lumina-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Network className="h-4 w-4 text-indigo-400" />
                Equipment Hierarchy Explorer
              </h2>
              <p className="text-xs text-slate-400">
                Cycle-protected self-referencing DAG trees for Physical Space vs Technical Systems
              </p>
            </div>
            <Link
              to="/hierarchies"
              className="text-xs text-indigo-400 hover:text-gold-300 font-mono"
            >
              Interactive Tree →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-midnight-950/90 border border-slate-800/90 space-y-1.5">
              <div className="text-indigo-400 font-semibold mb-2 flex items-center justify-between">
                <span>1. Physical Locations</span>
                <span className="text-[10px] text-slate-500">Spatial</span>
              </div>
              <div className="text-slate-300">└─ Main Building (LOC-MB)</div>
              <div className="text-slate-400 pl-4">└─ Basement (LOC-B1)</div>
              <div className="text-slate-300 pl-8">└─ Boiler Room (LOC-BLR)</div>
              <div className="text-gold-300 pl-12 font-semibold">• Boiler BLR-001</div>
            </div>

            <div className="p-3.5 rounded-lg bg-midnight-950/90 border border-slate-800/90 space-y-1.5">
              <div className="text-gold-400 font-semibold mb-2 flex items-center justify-between">
                <span>2. Technical Systems</span>
                <span className="text-[10px] text-slate-500">Functional</span>
              </div>
              <div className="text-slate-300">└─ Steam Generation (SYS-STM)</div>
              <div className="text-gold-300 pl-4 font-semibold">├─ Boiler BLR-001</div>
              <div className="text-indigo-300 pl-4">├─ Feed Pump P-001</div>
              <div className="text-slate-400 pl-4">└─ Water Tank T-001</div>
            </div>
          </div>
        </div>

        {/* Right Column 2: Recent Operator Observations & Faults */}
        <div className="lumina-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Recent Faults &amp; Abnormalities
              </h2>
              <p className="text-xs text-slate-400">
                Operator reported defects and checklist failure flags
              </p>
            </div>
            <Link
              to="/inspections"
              className="text-xs text-indigo-400 hover:text-gold-300 font-mono flex items-center gap-1"
            >
              Inspection Log →
            </Link>
          </div>

          {recentFaults.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No open faults recorded</p>
          ) : (
            <div className="space-y-3">
              {recentFaults.map((fault) => (
                <div
                  key={fault.id}
                  className="p-3.5 rounded-xl bg-midnight-950/80 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gold-400 font-medium">
                        {fault.assetCode}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">• {fault.reportedAt.slice(0, 10)}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5 font-medium truncate">{fault.symptoms}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Reported by: {fault.reportedByName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded uppercase font-semibold ${
                        fault.severity === 'critical'
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : fault.severity === 'high'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {fault.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compartmentalized ANP Decision Support Module */}
      <div className="lumina-card p-6 border-indigo-500/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Scale className="h-4 w-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                Approved ANP Decision Engine • Operational Recommendations
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gold-500/20 text-gold-300 border border-gold-500/40">
                {operationalRun?.decisionModelCode || 'ANP-BOILER-VALIDATED-V1'} (v{operationalRun?.decisionModelVersion || '1.0.0'})
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Ranked Multi-Criteria Maintenance Solutions (Kingsbury Baseline)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Decoupled multi-criteria optimization &bull; Replayable decision run snapshots &bull; Independent from CMMS work order execution
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAnpDrawerOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all min-h-[44px]"
            >
              <Wrench className="h-4 w-4" />
              Inspect &amp; Approve Recommendations ({operationalRun?.recommendations.length || 0})
            </button>
          </div>
        </div>

        {operationalRun && operationalRun.recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {operationalRun.recommendations.slice(0, 2).map((rec) => (
              <div
                key={rec.recommendationId}
                className="p-4 bg-midnight-950/80 rounded-xl border border-slate-800 space-y-2.5 hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-600 text-white">
                      #{rec.rank}
                    </span>
                    <span className="font-bold text-slate-100 text-sm">{rec.alternativeName}</span>
                  </div>
                  <span className="font-mono text-gold-400 font-bold text-xs">
                    p_a: {rec.priorityValue.toFixed(4)} ({rec.relativeWeightPercentage}%)
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">
                  {rec.technicalWorkScope}
                </p>

                {rec.criteriaAttribution.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="text-indigo-300 font-medium">Primary Influence:</span>{' '}
                    {rec.criteriaAttribution[0].criterionName} ({rec.criteriaAttribution[0].contributionPercentage}% weight)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extensible Equipment Framework Demonstration: Chiller Module */}
      <ChillerModuleCard />

      {/* Active Maintenance Alerts & Decision Feed */}
      <ActiveMaintenanceAlerts />

      {/* Operational ANP Decision Support Drawer */}
      <OperationalAnpDrawer
        runResult={operationalRun}
        isOpen={isAnpDrawerOpen}
        onClose={() => setIsAnpDrawerOpen(false)}
      />
    </div>
  );
};
