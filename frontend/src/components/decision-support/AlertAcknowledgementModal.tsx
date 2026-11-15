import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { DataClassificationBadge } from '../ui/DataClassificationBadge';
import { OperationalAbnormalityItem, AlertAcknowledgementPayload } from '../../types/reporting.types';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export interface AlertAcknowledgementModalProps {
  isOpen: boolean;
  onClose: () => void;
  abnormality: OperationalAbnormalityItem | null;
  onAcknowledge: (payload: AlertAcknowledgementPayload) => Promise<void>;
}

export const AlertAcknowledgementModal: React.FC<AlertAcknowledgementModalProps> = ({
  isOpen,
  onClose,
  abnormality,
  onAcknowledge,
}) => {
  const [operatorName, setOperatorName] = useState('');
  const [actionTaken, setActionTaken] = useState<'dispatched_work_order' | 'recalibrated' | 'verified_nominal' | 'monitoring'>('dispatched_work_order');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abnormality) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim()) {
      setError('Operator / Engineer name is required for regulatory audit trail.');
      return;
    }
    if (!notes.trim()) {
      setError('Acknowledgement engineering notes are mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAcknowledge({
        abnormalityId: abnormality.id,
        acknowledgedBy: operatorName.trim(),
        acknowledgementNotes: notes.trim(),
        actionTaken,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to acknowledge abnormality.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acknowledge Operational Abnormality"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-midnight-950/70 p-3.5 rounded-lg border border-indigo-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{abnormality.assetCode} — {abnormality.assetName}</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
              abnormality.severity === 'CRITICAL'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
            }`}>
              {abnormality.severity} EXCURSION
            </span>
          </div>
          <h4 className="text-sm font-semibold text-slate-100">{abnormality.parameterName}</h4>
          
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <DataClassificationBadge
              type="measured"
              valueDisplay={abnormality.measuredValue}
              unit={abnormality.unit}
              size="sm"
            />
            <span className="text-xs text-slate-400">vs Benchmark:</span>
            <DataClassificationBadge
              type="benchmark"
              valueDisplay={`${abnormality.benchmarkOperator} ${abnormality.benchmarkThreshold}`}
              unit={abnormality.unit}
              size="sm"
            />
          </div>

          <p className="text-xs text-slate-300 pt-1 leading-relaxed">
            {abnormality.deviationDescription}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Acknowledging Engineer / Operator Name *
          </label>
          <Input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="e.g., Marcus Thorne (Lead Reliability Engineer)"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Operational Action Taken *
          </label>
          <select
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value as any)}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-gold-500"
          >
            <option value="dispatched_work_order">Dispatched Corrective Work Order</option>
            <option value="recalibrated">Recalibrated Sensor / Physical Linkage</option>
            <option value="verified_nominal">Physical Inspection Verified Nominal (False Transient)</option>
            <option value="monitoring">Active Monitoring & Short-Interval Watch</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Engineering Justification & Observation Notes *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500 placeholder-slate-500"
            placeholder="Record physical verification details, damper position, relief valve state, or technician assignment..."
            required
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-indigo-900/40">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            {isSubmitting ? 'Recording...' : 'Confirm Acknowledgement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
