import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { NotificationChannelConfig } from '../../types/reporting.types';
import { Bell, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface NotificationChannelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: NotificationChannelConfig | null;
  onSave: (channelId: string, updates: Partial<NotificationChannelConfig>) => Promise<void>;
  onTestDispatch: (channelId: string) => Promise<{ success: boolean; message: string }>;
}

export const NotificationChannelConfigModal: React.FC<NotificationChannelConfigModalProps> = ({
  isOpen,
  onClose,
  channel,
  onSave,
  onTestDispatch,
}) => {
  if (!channel) return null;

  const [name, setName] = useState(channel.name);
  const [destination, setDestination] = useState(channel.destination);
  const [enabled, setEnabled] = useState(channel.enabled);
  const [minSeverity, setMinSeverity] = useState(channel.minSeverity);
  const [minAnpPriorityScore, setMinAnpPriorityScore] = useState(channel.minAnpPriorityScore);
  const [cooldownMinutes, setCooldownMinutes] = useState(channel.cooldownMinutes);
  const [includeAuditHash, setIncludeAuditHash] = useState(channel.includeAuditHash);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(channel.id, {
        name,
        destination,
        enabled,
        minSeverity,
        minAnpPriorityScore: Number(minAnpPriorityScore),
        cooldownMinutes: Number(cooldownMinutes),
        includeAuditHash,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update channel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);
      const res = await onTestDispatch(channel.id);
      setTestResult(res.message);
    } catch (err: any) {
      setError(err?.message || 'Test dispatch failed.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure Notification Channel: ${channel.channelType.toUpperCase()}`}
      size="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {testResult && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{testResult}</span>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-midnight-950/70 border border-indigo-900/40 rounded-lg">
          <div>
            <div className="text-sm font-semibold text-slate-100">Channel Status</div>
            <div className="text-xs text-slate-400">
              {enabled ? 'Active and dispatching alerts' : 'Muted / Inactive'}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Channel Display Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Primary Control Room Alert Tray"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Destination / Endpoint / Webhook Target
          </label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g., engineer@plant.com, +1-555-0100, or https://webhook..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Minimum Severity Filter
            </label>
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value as any)}
              className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500"
            >
              <option value="ALL">ALL (Observations, Warnings, Critical)</option>
              <option value="WARNING">WARNING (Warnings & Critical Excursions)</option>
              <option value="CRITICAL">CRITICAL ONLY (Emergency Shutdowns & MAWP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Minimum ANP Priority (pa)
            </label>
            <select
              value={minAnpPriorityScore}
              onChange={(e) => setMinAnpPriorityScore(Number(e.target.value))}
              className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500"
            >
              <option value={0.50}>pa ≥ 0.50 (Moderate Priorities)</option>
              <option value={0.65}>pa ≥ 0.65 (Significant Interventions)</option>
              <option value={0.80}>pa ≥ 0.80 (High Urgency Strategies)</option>
              <option value={0.90}>pa ≥ 0.90 (Critical Interventions Only)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Cooldown Rate Limit (Minutes)
            </label>
            <Input
              type="number"
              min={1}
              max={120}
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeAuditHash}
                onChange={(e) => setIncludeAuditHash(e.target.checked)}
                className="rounded border-indigo-800 text-gold-500 focus:ring-gold-500 bg-midnight-950"
              />
              <span>Attach Cryptographic Audit Hash</span>
            </label>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-indigo-900/40">
          <Button
            variant="secondary"
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            {isTesting ? 'Sending...' : 'Send Test Dispatch'}
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
