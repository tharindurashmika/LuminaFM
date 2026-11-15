import React from 'react';
import { AssetStatus, CriticalityLevel, WorkOrderStatus, PriorityLevel } from '../../types/cmms.types';

interface CriticalityBadgeProps {
  level: CriticalityLevel;
}

export const CriticalityBadge: React.FC<CriticalityBadgeProps> = ({ level }) => {
  const styles: Record<CriticalityLevel, string> = {
    critical:
      'bg-gold-500/15 text-gold-300 border-gold-500/50 shadow-glow-gold font-semibold',
    high: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
    medium: 'bg-slate-800/80 text-slate-300 border-slate-700',
    low: 'bg-slate-900 text-slate-400 border-slate-800',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border uppercase tracking-wider font-mono ${styles[level]}`}
    >
      {level === 'critical' && (
        <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
      )}
      {level}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: PriorityLevel;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const styles: Record<PriorityLevel, string> = {
    urgent: 'bg-red-950/80 text-red-300 border-red-500/40 font-semibold',
    high: 'bg-amber-950/70 text-amber-300 border-amber-500/40 font-medium',
    medium: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40',
    low: 'bg-slate-900 text-slate-400 border-slate-800',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border font-mono uppercase tracking-wider ${styles[priority]}`}
    >
      {priority === 'urgent' && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
      {priority}
    </span>
  );
};

interface AssetStatusBadgeProps {
  status: AssetStatus;
}

export const AssetStatusBadge: React.FC<AssetStatusBadgeProps> = ({ status }) => {
  const styles: Record<AssetStatus, string> = {
    in_service: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    under_maintenance:
      'bg-gold-500/15 text-gold-300 border-gold-500/50 shadow-glow-gold font-medium',
    standby: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    out_of_service: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    decommissioned: 'bg-slate-900 text-slate-500 border-slate-800',
  };

  const dotStyles: Record<AssetStatus, string> = {
    in_service: 'bg-emerald-400',
    under_maintenance: 'bg-gold-400 animate-pulse',
    standby: 'bg-indigo-400',
    out_of_service: 'bg-rose-400 animate-pulse',
    decommissioned: 'bg-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs border font-mono uppercase tracking-wider ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
}

export const WorkOrderStatusBadge: React.FC<WorkOrderStatusBadgeProps> = ({ status }) => {
  const styles: Record<WorkOrderStatus, string> = {
    draft: 'bg-slate-800/80 text-slate-400 border-slate-700',
    open: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    approved: 'bg-indigo-900/60 text-indigo-200 border-indigo-400/40',
    assigned: 'bg-indigo-900/60 text-indigo-200 border-indigo-400/40',
    in_progress:
      'bg-gold-500/15 text-gold-300 border-gold-500/50 shadow-glow-gold font-medium',
    on_hold: 'bg-amber-950/60 text-amber-300 border-amber-600/40',
    completed: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40',
    closed: 'bg-slate-900 text-slate-500 border-slate-800',
    cancelled: 'bg-rose-950/50 text-rose-400 border-rose-800/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs border font-mono uppercase tracking-wider ${styles[status]}`}
    >
      {status === 'in_progress' && (
        <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
      )}
      {status.replace('_', ' ')}
    </span>
  );
};
