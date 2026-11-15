import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, LogOut, Trash2, X, Check } from 'lucide-react';
import { offlineSyncService } from '../../services/offline-sync.service';

interface LogoutSyncGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedLogout: (clearLocalData: boolean) => void;
}

export const LogoutSyncGuardModal: React.FC<LogoutSyncGuardModalProps> = ({
  isOpen,
  onClose,
  onProceedLogout,
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const { pendingCount, conflictCount } = offlineSyncService.checkPendingSyncBeforeLogout();

  const handleSyncAndLogout = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await offlineSyncService.processQueue();
      if (res.conflicts > 0) {
        setSyncFeedback(`${res.conflicts} conflict(s) require operator resolution.`);
        setIsSyncing(false);
        return;
      }
      offlineSyncService.handleSecureLogout(true);
      onProceedLogout(true);
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Sync failed before logout.');
      setIsSyncing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-guard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/90 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-md bg-midnight-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 id="logout-guard-title" className="text-base sm:text-lg font-bold text-white">
              Unsynchronized Records Detected
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {pendingCount} pending submission(s) &bull; {conflictCount} conflict(s)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          You are signing out of an offline-capable floor kiosk session. Unsynchronized shift records remain stored in this tablet's local storage partition.
        </p>

        {syncFeedback && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono">
            {syncFeedback}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          {/* Option 1: Force Sync & Logout */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncAndLogout}
            className="min-h-[48px] w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Force Sync Now &amp; Sign Out</span>
          </button>

          {/* Option 2: Leave queued for next connection & logout */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              offlineSyncService.handleSecureLogout(false);
              onProceedLogout(false);
            }}
            className="min-h-[48px] w-full px-4 py-2.5 rounded-xl bg-midnight-950 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono font-medium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="h-4 w-4 text-gold-400" />
            <span>Leave Queued on Tablet &amp; Sign Out</span>
          </button>

          {/* Option 3: Discard local uncommitted drafts & logout */}
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              offlineSyncService.handleSecureLogout(true);
              onProceedLogout(true);
            }}
            className="min-h-[48px] w-full px-4 py-2.5 rounded-xl bg-midnight-950 hover:bg-red-950/40 text-rose-300 border border-rose-900/50 font-mono font-medium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            <span>Purge Local Queue &amp; Sign Out</span>
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full px-4 py-2 text-slate-400 hover:text-slate-200 font-mono text-xs transition-colors"
          >
            Cancel / Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
};
