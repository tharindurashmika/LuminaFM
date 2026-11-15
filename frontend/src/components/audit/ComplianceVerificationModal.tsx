import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { ComplianceRecord, ComplianceStatus } from '../../types/audit.types';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface ComplianceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ComplianceRecord | null;
  onVerify: (
    recordId: string,
    payload: {
      status: ComplianceStatus;
      verifiedBy: string;
      inspectorCertificationNumber?: string;
      findingsNotes: string;
      attachmentIds?: string[];
    }
  ) => Promise<void>;
}

export const ComplianceVerificationModal: React.FC<ComplianceVerificationModalProps> = ({
  isOpen,
  onClose,
  record,
  onVerify,
}) => {
  if (!record) return null;

  const [status, setStatus] = useState<ComplianceStatus>(record.status || 'compliant');
  const [verifiedBy, setVerifiedBy] = useState<string>(
    record.verifiedBy || 'Eng. Marcus Thorne (Lead Reliability Engineer)'
  );
  const [inspectorCert, setInspectorCert] = useState<string>(
    record.inspectorCertificationNumber || 'NB-COMM-984421'
  );
  const [notes, setNotes] = useState<string>(record.findingsNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedBy.trim()) {
      setError('Verifying engineer / inspector name is mandatory for statutory compliance.');
      return;
    }
    if (!notes.trim()) {
      setError('Technical findings notes are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onVerify(record.id, {
        status,
        verifiedBy: verifiedBy.trim(),
        inspectorCertificationNumber: inspectorCert.trim() || undefined,
        findingsNotes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record compliance verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Statutory Compliance Verification" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3.5 bg-midnight-950/70 border border-indigo-900/40 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-200">
              {record.frameworkCode} • {record.clauseCode}
            </span>
            <span className="text-gold-400 font-semibold">{record.assetCode}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">{record.title}</h4>
          <div className="text-[11px] text-slate-400">
            Statutory Retention Expiration: <span className="font-mono text-slate-200">{new Date(record.statutoryRetentionExpiry).toLocaleDateString()}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Verification Disposition Status *
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ComplianceStatus)}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500"
          >
            <option value="compliant">COMPLIANT (Full Physical & Documentation Verification Satisfied)</option>
            <option value="pending_evidence">PENDING EVIDENCE (Inspection Pending Supporting Reports or Photos)</option>
            <option value="under_review">UNDER REVIEW (Parameter Deviation Detected; Active Remediation)</option>
            <option value="non_compliant">NON-COMPLIANT (Safety Interlock or Limit Breach Exceeds Allowance)</option>
            <option value="exempt">EXEMPT (Statutory Exemption Documented)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Verifying Engineer / Authorized Inspector Name *
          </label>
          <Input
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            placeholder="e.g. Eng. Marcus Thorne, CMRP / Plant Lead"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            National Board / Jurisdictional Commission Number
          </label>
          <Input
            value={inspectorCert}
            onChange={(e) => setInspectorCert(e.target.value)}
            placeholder="e.g. NB-COMM-984421 (National Board Commission #)"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Technical Findings & Inspection Disposition Notes *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500 placeholder-slate-500"
            placeholder="Record physical verification details, safety valve pop pressure, float switch trip timing, wall thickness readings..."
            required
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-indigo-900/40">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            {isSubmitting ? 'Recording In Audit Trail...' : 'Confirm Compliance Sign-Off'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
