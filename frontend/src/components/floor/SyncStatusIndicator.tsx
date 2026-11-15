import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, CloudUpload, AlertTriangle, Layers } from 'lucide-react';

export type SyncStatusState = 'synced' | 'saving' | 'offline' | 'syncing' | 'conflict';

interface SyncStatusIndicatorProps {
  status: SyncStatusState;
  lastSavedAt?: string | null;
  pendingCount?: number;
  conflictCount?: number;
  onForceSync?: () => void;
  onClick?: () => void;
  isCompact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  lastSavedAt,
  pendingCount = 0,
  conflictCount = 0,
  onForceSync,
  onClick,
  isCompact = false,
}) => {
  return (
    <div
      aria-live="polite"
      onClick={onClick}
      className={`flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-2xl bg-midnight-950 border text-xs font-mono transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-600' : ''
      } ${
        status === 'conflict' || conflictCount > 0
          ? 'border-red-500/80 bg-red-950/30 text-red-300'
          : 'border-slate-800'
      }`}
    >
      {status === 'synced' && conflictCount === 0 && (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Wifi className="h-3.5 w-3.5" />
            <span>{!isCompact ? 'ONLINE • CLOUD SYNCED' : 'SYNCED'}</span>
          </div>
        </>
      )}

      {(status === 'conflict' || conflictCount > 0) && (
        <div className="flex items-center gap-1.5 text-red-300 font-bold animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          <span>
            {!isCompact ? `CONFLICT • ${conflictCount} REQUIRES ACTION` : `${conflictCount} CONFLICT`}
          </span>
        </div>
      )}

      {status === 'saving' && conflictCount === 0 && (
        <>
          <RefreshCw className="h-3.5 w-3.5 text-gold-400 animate-spin" />
          <span className="text-gold-300 font-medium">
            {!isCompact ? 'AUTOSAVING DRAFT...' : 'SAVING...'}
          </span>
        </>
      )}

      {status === 'syncing' && conflictCount === 0 && (
        <>
          <CloudUpload className="h-3.5 w-3.5 text-indigo-400 animate-bounce" />
          <span className="text-indigo-300 font-semibold">
            {!isCompact ? 'UPLOADING TO CLUSTER...' : 'SYNCING...'}
          </span>
        </>
      )}

      {status === 'offline' && conflictCount === 0 && (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <WifiOff className="h-3.5 w-3.5" />
            <span>
              {!isCompact
                ? `OFFLINE • ${pendingCount} DRAFT${pendingCount === 1 ? '' : 'S'} QUEUED`
                : `${pendingCount} QUEUED`}
            </span>
          </div>
        </>
      )}

      {lastSavedAt && !isCompact && (
        <span className="hidden md:inline-block text-slate-500 border-l border-slate-800 pl-2">
          {lastSavedAt}
        </span>
      )}

      {onClick && (
        <span className="px-2 py-0.5 rounded-md bg-midnight-900 border border-slate-700/80 text-[10px] text-indigo-300 font-mono hover:text-white ml-1">
          Queue ({pendingCount})
        </span>
      )}

      {onForceSync && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onForceSync();
          }}
          title="Manually force database sync"
          className="min-h-[32px] px-2 py-1 rounded-lg bg-midnight-900 hover:bg-slate-800 active:bg-indigo-900 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-colors ml-1"
        >
          Sync
        </button>
      )}
    </div>
  );
};
