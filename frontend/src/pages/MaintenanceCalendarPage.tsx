import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  PlusCircle,
  Wrench,
  Download,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Tabs,
  LoadingState,
  EmptyState,
} from '../components/ui';
import { MaintenanceSchedule, PriorityLevel } from '../types/cmms.types';
import { maintenanceApiService } from '../services/maintenance.service';
import { exportToCsv, exportToJson } from '../utils/export.utils';
import { CriticalityBadge } from '../components/ui/StatusBadge';

export const MaintenanceCalendarPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'schedules'>('calendar');
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dueSummary, setDueSummary] = useState({
    totalActiveSchedules: 6,
    overdueCount: 2,
    dueNext7Days: 2,
    complianceRate: 96.2,
  });

  // Calendar month state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schedList, summary] = await Promise.all([
        maintenanceApiService.listSchedules(),
        maintenanceApiService.getDueSummary(),
      ]);
      setSchedules(schedList);
      setDueSummary(summary);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateWo = async (scheduleId: string) => {
    try {
      const result = await maintenanceApiService.generateWorkOrderFromSchedule(scheduleId);
      setActionSuccessMessage(result.message);
      await loadData();
    } catch (err: any) {
      alert(`Failed to generate work order: ${err?.message || 'Unknown error'}`);
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedPriority !== 'ALL' && s.priority !== selectedPriority) return false;
      if (overdueOnly && !s.isOverdue) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          s.planTitle.toLowerCase().includes(q) ||
          s.assetCode.toLowerCase().includes(q) ||
          s.assetName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [schedules, selectedPriority, overdueOnly, searchTerm]);

  // Calendar Grid Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleExportCsv = () => {
    exportToCsv(
      filteredSchedules,
      [
        { header: 'Schedule ID', accessor: 'id' },
        { header: 'Plan Title', accessor: 'planTitle' },
        { header: 'Asset Code', accessor: 'assetCode' },
        { header: 'Asset Name', accessor: 'assetName' },
        { header: 'Frequency', accessor: (s) => `${s.intervalValue} ${s.intervalUnit}` },
        { header: 'Next Due Date', accessor: 'nextDueAt' },
        { header: 'Overdue Status', accessor: (s) => (s.isOverdue ? 'OVERDUE' : 'ON SCHEDULE') },
        { header: 'Priority', accessor: 'priority' },
        { header: 'Assigned Engineer', accessor: (s) => s.assignedEngineer || 'Unassigned' },
        { header: 'Estimated Hours', accessor: 'estimatedHours' },
      ],
      'lumina_preventive_schedules'
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-400">
            <CalendarIcon className="w-4 h-4" />
            <span>Preventive Maintenance Planning &amp; Asset Schedules</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Maintenance Calendar &amp; PM Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Calendar-based and runtime-hour maintenance schedules with automated due calculations and duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export PM Schedules (CSV)
          </Button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between text-emerald-300 text-xs sm:text-sm font-mono animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-xs text-emerald-400/80 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active PM Plans</span>
              <Wrench className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">
                {dueSummary.totalActiveSchedules}
              </span>
              <span className="text-xs text-indigo-300 font-mono">Boilers &amp; HVAC</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Recurring calendar &amp; run-hour intervals
            </p>
          </CardContent>
        </Card>

        <Card variant="accent-gold">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-gold-300 text-xs font-medium">
              <span>Overdue Tasks</span>
              <AlertTriangle className="h-4 w-4 text-gold-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gold-300 font-mono">
                {dueSummary.overdueCount}
              </span>
              <span className="text-xs text-gold-400 font-mono">Immediate Action</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Requires immediate Work Order dispatch
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Due in Next 7 Days</span>
              <Clock className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-mono">
                {dueSummary.dueNext7Days}
              </span>
              <span className="text-xs text-emerald-400 font-mono">Ready to Lead</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Pre-staged spare parts &amp; assigned labor
            </p>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>PM Compliance SLA</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                {dueSummary.complianceRate}%
              </span>
              <span className="text-xs text-slate-400 font-mono">Target: &gt;95%</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Zero tolerance for statutory safety lapses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'calendar',
            label: 'Interactive Calendar View',
            icon: <CalendarIcon className="w-4 h-4" />,
            badge: `${monthName} ${year}`,
          },
          {
            id: 'schedules',
            label: 'Preventive Schedule Register',
            icon: <Wrench className="w-4 h-4" />,
            badge: `${filteredSchedules.length} Plans`,
          },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: INTERACTIVE MONTHLY CALENDAR */}
      {activeTab === 'calendar' && (
        <Card variant="default">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>
                    {monthName} {year} — Facility Maintenance Schedule
                  </span>
                </CardTitle>
                <CardDescription>
                  Click any date or scheduled maintenance badge to review task scope and trigger work orders.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={prevMonth} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Current Month
                </Button>
                <Button variant="secondary" size="sm" onClick={nextMonth} rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-5">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-mono font-semibold text-slate-400 py-2 border-b border-slate-800">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
              {/* Empty padding cells for first week */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="min-h-[90px] sm:min-h-[115px] p-2 rounded-xl bg-midnight-950/40 border border-slate-900 opacity-40"
                />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                const dayNum = dayIdx + 1;
                const cellDate = new Date(year, month, dayNum);
                const isToday =
                  cellDate.toDateString() === new Date().toDateString();

                // Find schedules due on this day
                const daySchedules = schedules.filter((s) => {
                  const sDate = new Date(s.nextDueAt);
                  return (
                    sDate.getDate() === dayNum &&
                    sDate.getMonth() === month &&
                    sDate.getFullYear() === year
                  );
                });

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`min-h-[90px] sm:min-h-[115px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      isToday
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-glow-indigo/20'
                        : daySchedules.length > 0
                        ? 'bg-midnight-900 border-slate-800 hover:border-slate-700'
                        : 'bg-midnight-950/70 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          isToday ? 'text-gold-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {daySchedules.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[75px]">
                      {daySchedules.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleGenerateWo(s.id)}
                          title={`Click to generate Work Order for ${s.planTitle}`}
                          className={`text-[10px] p-1 rounded-md font-mono truncate cursor-pointer transition-colors ${
                            s.isOverdue
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900'
                              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900'
                          }`}
                        >
                          {s.assetCode}: {s.planTitle}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: PREVENTIVE SCHEDULE REGISTER TABLE */}
      {activeTab === 'schedules' && (
        <Card variant="default">
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  Preventive Maintenance Asset Plan Schedules
                </CardTitle>
                <CardDescription>
                  Configured recurring intervals, calculated next due timestamps, and 1-click Work Order generation.
                </CardDescription>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-48">
                  <Input
                    placeholder="Search plan or asset..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leadingIcon={<Search className="w-3.5 h-3.5" />}
                    className="min-h-[38px] text-xs py-1.5"
                  />
                </div>

                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="min-h-[38px] text-xs bg-midnight-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <button
                  type="button"
                  onClick={() => setOverdueOnly((prev) => !prev)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                    overdueOnly
                      ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-lg shadow-rose-950/40'
                      : 'bg-midnight-950 text-slate-300 border-slate-700'
                  }`}
                >
                  {overdueOnly ? 'Showing Overdue Only' : 'Filter Overdue'}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState title="Loading PM Schedules..." />
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Schedules Match Filter"
                  description="Try clearing search or filter terms to display maintenance schedules."
                  actionLabel="Reset Filters"
                  onAction={() => {
                    setSearchTerm('');
                    setSelectedPriority('ALL');
                    setOverdueOnly(false);
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-midnight-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Asset</th>
                      <th className="py-3.5 px-4">Maintenance Task Plan</th>
                      <th className="py-3.5 px-4">Frequency</th>
                      <th className="py-3.5 px-4">Next Due Date</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Lead Tech</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-midnight-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                          {s.assetCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100">{s.planTitle}</div>
                          <div className="text-xs text-slate-400">{s.assetName}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-indigo-300">
                          Every {s.intervalValue} {s.intervalUnit}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className={s.isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {new Date(s.nextDueAt).toLocaleDateString()}
                            </span>
                            {s.isOverdue && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <CriticalityBadge level={s.priority as any} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {s.assignedEngineer || 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant={s.isOverdue ? 'gold' : 'secondary'}
                            size="sm"
                            onClick={() => handleGenerateWo(s.id)}
                            leftIcon={<Wrench className="w-3.5 h-3.5" />}
                          >
                            Generate WO
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MaintenanceCalendarPage;
