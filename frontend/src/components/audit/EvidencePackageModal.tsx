import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import {
  ComplianceFrameworkCode,
  ExportableEvidencePackage,
  MANDATORY_REGULATORY_DISCLAIMER,
} from '../../types/audit.types';
import { Package, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export interface EvidencePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    frameworkCode: ComplianceFrameworkCode;
    targetAssetCode?: string;
    startDate: string;
    endDate: string;
    includeAuditLogs: boolean;
    includeAttachments: boolean;
  }) => Promise<ExportableEvidencePackage>;
}

export const EvidencePackageModal: React.FC<EvidencePackageModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [frameworkCode, setFrameworkCode] = useState<ComplianceFrameworkCode>('ASME_BPVC_SEC_I');
  const [targetAssetCode, setTargetAssetCode] = useState<string>('BLR-001');
  const [startDate, setStartDate] = useState<string>('2026-11-01');
  const [endDate, setEndDate] = useState<string>('2026-11-15');
  const [includeAuditLogs, setIncludeAuditLogs] = useState<boolean>(true);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onGenerate({
        frameworkCode,
        targetAssetCode,
        startDate,
        endDate,
        includeAuditLogs,
        includeAttachments,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to compile evidence package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compile Tamper-Evident Evidence Package" size="lg">
      <form onSubmit={handleGenerate} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Mandatory Regulatory Compliance Notice */}
        <div className="p-3.5 bg-amber-950/70 border border-amber-500/50 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mandatory Regulatory Compliance Notice</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/90">
            {MANDATORY_REGULATORY_DISCLAIMER}
          </p>
        </div>

        {/* Framework Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Governing Compliance Standard / Framework *
          </label>
          <select
            value={frameworkCode}
            onChange={(e) => setFrameworkCode(e.target.value as ComplianceFrameworkCode)}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500"
          >
            <option value="ASME_BPVC_SEC_I">
              ASME BPVC Section I: Power Boilers (SRV Calibration, LWCO Float Trips)
            </option>
            <option value="EN_12953">
              EN 12953: Shell Boilers (1,000–1,800 kg/h Oil-Fired Fire-Tube Cleanliness)
            </option>
            <option value="NB_23_NBIC">
              NB-23 NBIC: National Board In-Service Ultrasonic NDT & Repairs
            </option>
            <option value="OSHA_1910_119">
              OSHA 29 CFR 1910.119: Process Safety Management (PSM Mechanical Integrity)
            </option>
            <option value="ISO_55001">
              ISO 55001: Asset Management Strategic Lifecycle Governance
            </option>
            <option value="CUSTOMER_SPECIFIC">
              Tenant Facility Safety Standard: Corporate Boiler Policy v4.2
            </option>
          </select>
        </div>

        {/* Target Asset */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Target Equipment / Boiler Asset Code *
          </label>
          <Input
            value={targetAssetCode}
            onChange={(e) => setTargetAssetCode(e.target.value)}
            placeholder="e.g. BLR-001 (Cleaver-Brooks Firetube Steam Boiler #1)"
            required
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Audit Period Start Date *
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Audit Period End Date *
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Package Inclusions */}
        <div className="bg-midnight-950/70 p-3 rounded-lg border border-indigo-900/40 space-y-2">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
            Evidence Manifest Inclusions:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={includeAuditLogs}
                onChange={(e) => setIncludeAuditLogs(e.target.checked)}
                className="rounded border-indigo-800 text-gold-500 bg-midnight-950"
              />
              <span>Immutable Audit Logs Trail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                className="rounded border-indigo-800 text-gold-500 bg-midnight-950"
              />
              <span>Sealed Evidence Attachments</span>
            </label>
          </div>
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-indigo-900/40">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            leftIcon={<Package className="w-4 h-4" />}
          >
            {isSubmitting ? 'Computing Cryptographic Hashes...' : 'Compile & Seal Package'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
