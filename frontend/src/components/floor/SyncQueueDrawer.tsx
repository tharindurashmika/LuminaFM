import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  CloudUpload,
  Layers,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Trash2,
  Send,
} from 'lucide-react';
import {
  offlineSyncService,
  SyncQueueItem,
  SyncEngineStatus,
} from '../../services/offline-sync.service';

interface SyncQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncQueueDrawer: React.FC<SyncQueueDrawerProps> = ({ isOpen, onClose }) => {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [status, setStatus] = useState<SyncEngineStatus>(offlineSyncService.getStatus());
  const [selectedConflictItem, setSelectedConflictItem] = useState<SyncQueueItem | null>(null);
  const [amendmentReason, setAmendmentReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshData = () => {
    setQueue(offlineSyncService.getQueue());
    setStatus(offlineSyncService.getStatus());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
    const unsubscribe = offlineSyncService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setQueue(offlineSyncService.getQueue());
    });
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceSync = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await offlineSyncService.processQueue();
      refreshData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sync failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveConflict = async (resolution: 'amend_as_traceable_revision' | 'discard_local_duplicate') => {
    if (!selectedConflictItem) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await offlineSyncService.resolveConflict(
        selectedConflictItem.clientSubmissionId,
        resolution,
        amendmentReason
      );
      setSelectedConflictItem(null);
      setAmendmentReason('');
      refreshData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Conflict resolution failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryItem = async (clientSubmissionId: string) => {
    await offlineSyncService.retryItem(clientSubmissionId);
    refreshData();
  };

  const handleCleanSynced = () => {
    offlineSyncService.cleanSyncedItems();
    refreshData();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-midnight-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl bg-midnight-900 border-l border-slate-800 flex flex-col h-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-midnight-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <CloudUpload className="h-5 w-5" />
            </span>
            <div>
              <h2 id="sync-drawer-title" className="text-base sm:text-lg font-bold text-white">
                PWA Synchronization &amp; Offline Queue
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono">
                {status.isOnline ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline (Local Queue)
                  </span>
                )}
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400">
                  {status.pendingCount} pending &bull; {status.conflictCount} conflicts
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close sync drawer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-midnight-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-midnight-950/60 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={isProcessing || !status.isOnline || status.pendingCount === 0}
            onClick={handleForceSync}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Force Synchronize Now ({status.pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={handleCleanSynced}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-midnight-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-medium border border-slate-700 transition-colors"
          >
            Clear Synced
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="m-3 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Queue List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {queue.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto opacity-60" />
              <p className="text-sm font-semibold text-white">Queue Empty &amp; All Records Synced</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                All daily shift logbooks and inspection attachments are up to date on the authoritative PostgreSQL cluster.
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                  item.status === 'conflict'
                    ? 'bg-red-950/30 border-red-500/80'
                    : item.status === 'failed'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : item.status === 'syncing'
                    ? 'bg-indigo-950/40 border-indigo-500/60'
                    : item.status === 'synced'
                    ? 'bg-midnight-950/40 border-slate-800 opacity-70'
                    : 'bg-midnight-950/80 border-slate-800'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gold-400">
                        {item.assetCode}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        • {item.entityType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-100 truncate mt-0.5">{item.title}</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      ID: {item.clientSubmissionId.slice(0, 8)}... &bull; Enqueued:{' '}
                      {item.createdAt.slice(11, 19)}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {item.status === 'synced' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                        SYNCED
                      </span>
                    )}
                    {item.status === 'syncing' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/50 animate-pulse">
                        SYNCING...
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50">
                        QUEUED (Retry #{item.retryCount})
                      </span>
                    )}
                    {item.status === 'conflict' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/80 animate-pulse">
                        CONFLICT (409)
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/60">
                        FAILED (Max Retries)
                      </span>
                    )}
                  </div>
                </div>

                {/* Conflict Alert Banner with Inspect Button */}
                {item.status === 'conflict' && (
                  <div className="p-3 rounded-xl bg-midnight-900 border border-red-500/50 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-red-300 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Authoritative Record Conflict Detected</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {item.conflictDetails?.message ||
                        'A finalized record for this shift exists on the server. Cannot silently overwrite.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedConflictItem(item)}
                      className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>Inspect Server Diff &amp; Resolve</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Error Message & Retry Action */}
                {item.errorMessage && item.status !== 'conflict' && (
                  <div className="p-2.5 rounded-lg bg-midnight-900/90 text-[11px] font-mono text-slate-300 flex items-center justify-between gap-2 border border-slate-800">
                    <span className="truncate text-amber-300">{item.errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => handleRetryItem(item.clientSubmissionId)}
                      className="min-h-[36px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold shrink-0 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Conflict Resolution Modal */}
        {selectedConflictItem && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/95 backdrop-blur-md p-4"
          >
            <div className="w-full max-w-lg bg-midnight-900 border-2 border-red-500/80 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-red-400 font-bold font-mono text-sm sm:text-base">
                  <ShieldAlert className="h-5 w-5" />
                  <span>Resolve Authoritative Conflict</span>
                </div>
                <button
                  onClick={() => setSelectedConflictItem(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-midnight-950 text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                LuminaFM strictly enforces that the server-side PostgreSQL database remains authoritative. Conflicting operational records are <strong>never silently overwritten</strong>.
              </p>

              {/* Side-by-Side Diff Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-midnight-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">
                    Authoritative Server Record
                  </span>
                  <p className="text-slate-200 font-semibold truncate">
                    Status: {selectedConflictItem.conflictDetails?.serverRecord?.status || 'completed'}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Operator: {selectedConflictItem.conflictDetails?.serverRecord?.operatorName || 'Prior Shift Lead'}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Submitted: {selectedConflictItem.conflictDetails?.serverRecord?.completedAt || 'Earlier'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-midnight-950 border border-gold-500/40 space-y-1">
                  <span className="text-[10px] text-gold-400 uppercase font-bold">
                    Your Offline Client Record
                  </span>
                  <p className="text-slate-200 font-semibold truncate">
                    Status: {selectedConflictItem.payload?.status || 'completed'}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Readings: {Object.keys(selectedConflictItem.payload?.readings || {}).length} captured
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Submission ID: {selectedConflictItem.clientSubmissionId.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Mandatory Justification Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 uppercase block">
                  Amendment Reason (Strictly Mandatory for Audit Trail):
                </label>
                <textarea
                  rows={2}
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="e.g., Re-verified feedwater TDS reading after blowdown; amending recorded shift log..."
                  className="w-full text-xs font-mono bg-midnight-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={!amendmentReason.trim() || isProcessing}
                  onClick={() => handleResolveConflict('amend_as_traceable_revision')}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit as Traceable Amendment</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleResolveConflict('discard_local_duplicate')}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  <span>Discard Local Duplicate</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
