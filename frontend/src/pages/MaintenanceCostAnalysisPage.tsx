import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  Layers,
  Wrench,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Tabs,
  LoadingState,
  EmptyState,
} from '../components/ui';
import { MaintenanceCostReport } from '../types/cmms.types';
import { analyticsApiService } from '../services/analytics.service';
import { exportToCsv, exportToJson } from '../utils/export.utils';
import { useAuth } from '../store/AuthContext';

export const MaintenanceCostAnalysisPage: React.FC = () => {
  const { activeRole } = useAuth();
  const [report, setReport] = useState<MaintenanceCostReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isFinancialPrivileged =
    activeRole === 'Organization Admin' || activeRole === 'Plant Reliability Engineer';

  useEffect(() => {
    analyticsApiService
      .getMaintenanceCostReport()
      .then((data) => setReport(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleExportCsv = () => {
    if (!report) return;
    exportToCsv(
      report.categoryBreakdown,
      [
        { header: 'Asset Category', accessor: 'categoryName' },
        { header: 'Total Spend (LKR)', accessor: 'totalCost' },
        { header: 'Percentage (%)', accessor: 'percentage' },
        { header: 'Work Orders Count', accessor: 'workOrderCount' },
      ],
      'lumina_maintenance_category_costs'
    );
  };

  const handleExportJson = () => {
    if (!report) return;
    exportToJson(report, 'lumina_annual_maintenance_financial_audit');
  };

  const formatCurrency = (amount: number) => {
    return `${report?.currency || 'LKR'} ${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="p-12">
        <LoadingState
          title="Aggregating Maintenance Financial Ledger..."
          description="Calculating labor hours, parts inventory transactions, and contractor invoices."
        />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-12">
        <EmptyState
          title="Financial Ledger Unavailable"
          description="No cost records available for the selected fiscal period."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <DollarSign className="w-4 h-4" />
            <span>Facility Asset Lifecycle &amp; Total Cost of Ownership (TCO)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Maintenance Cost Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Preventive vs. corrective spend ratios, labor hours valuation, spare parts consumption, and contractor audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Cost CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Full Audit (JSON)
          </Button>
        </div>
      </div>

      {!isFinancialPrivileged && (
        <div className="p-4 rounded-xl lumina-alert-critical text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-gold-400 shrink-0" />
            <span>
              Restricted View: You are logged in as{' '}
              <strong className="text-gold-300">{activeRole}</strong>. Hourly wage rates and confidential vendor invoices are masked.
            </span>
          </div>
          <span className="font-mono text-gold-400 uppercase tracking-widest">
            RBAC Enforced
          </span>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card variant="accent-gold">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-gold-300 text-xs font-medium">
              <span>Total Maintenance Spend</span>
              <DollarSign className="h-4 w-4 text-gold-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gold-300 font-mono">
                {isFinancialPrivileged ? formatCurrency(report.totalCost) : 'CONFIDENTIAL'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {report.period} &bull; Labor + Parts + External
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Preventive Spend Ratio</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                {report.preventiveRatio}%
              </span>
              <span className="text-xs text-slate-400 font-mono">Target: &gt;70%</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Proactive maintenance dominant over reactive failures
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Internal Labor Cost</span>
              <Wrench className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">
                {isFinancialPrivileged ? formatCurrency(report.laborCost) : 'CONFIDENTIAL'}
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                {((report.laborCost / report.totalCost) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Technician hours tracked against work order tasks
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Spare Parts &amp; Consumables</span>
              <Layers className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">
                {isFinancialPrivileged ? formatCurrency(report.partsCost) : 'CONFIDENTIAL'}
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                {((report.partsCost / report.totalCost) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Gaskets, seals, lube oil, and valve kits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Grid: Category Breakdown vs Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-7">
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-400" />
                  Maintenance Spend by Equipment Category
                </span>
                <Badge tone="indigo" size="sm">
                  {report.categoryBreakdown.length} Categories
                </Badge>
              </CardTitle>
              <CardDescription>
                Financial allocation across plant engineering systems
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {report.categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-midnight-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-slate-100">{cat.categoryName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-300">
                        {isFinancialPrivileged ? formatCurrency(cat.totalCost) : `${cat.percentage}%`}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-midnight-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-gold-400 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-0.5">
                    <span>{cat.workOrderCount} work orders executed</span>
                    <span>Rank #{idx + 1} cost driver</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Fiscal Trends */}
        <div className="lg:col-span-5">
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gold-400" />
                Monthly Spend vs. Fiscal Budget
              </CardTitle>
              <CardDescription>
                Budget compliance across trailing 5 months
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {report.monthlyTrends.map((trend, idx) => {
                const isUnderBudget = trend.total <= trend.budget;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-midnight-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-200">{trend.month}</span>
                      <span className={isUnderBudget ? 'text-emerald-400' : 'text-rose-400'}>
                        {isFinancialPrivileged ? formatCurrency(trend.total) : 'CONFIDENTIAL'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isUnderBudget ? 'bg-indigo-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, (trend.total / trend.budget) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>Labor: {isFinancialPrivileged ? formatCurrency(trend.labor) : '—'}</span>
                      <span>Budget: {isFinancialPrivileged ? formatCurrency(trend.budget) : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top 5 High-Cost Equipment Ranking Table */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Top Cost-Driving Plant Equipment (TCO Ranking)
            </span>
            <Badge tone="gold" size="sm">
              Highest Lifecycle Spend
            </Badge>
          </CardTitle>
          <CardDescription>
            Equipment units requiring the highest maintenance expenditure, parts consumption, and unscheduled downtime.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-midnight-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Asset Code</th>
                  <th className="py-3.5 px-4">Asset Description</th>
                  <th className="py-3.5 px-4">Cumulative Spend</th>
                  <th className="py-3.5 px-4">Corrective Events</th>
                  <th className="py-3.5 px-4 font-right">MTBF (Hours)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {report.topCostAssets.map((asset, idx) => (
                  <tr key={asset.assetId} className="hover:bg-midnight-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gold-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-300">
                      {asset.assetCode}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-100">
                      {asset.assetName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {isFinancialPrivileged ? formatCurrency(asset.totalSpend) : 'CONFIDENTIAL'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={asset.correctiveCount > 2 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                        {asset.correctiveCount} incidents
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      {asset.mtbfHours} hrs MTBF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceCostAnalysisPage;
