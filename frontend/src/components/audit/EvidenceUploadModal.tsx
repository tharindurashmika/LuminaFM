import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { EvidenceCategory } from '../../types/audit.types';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react';

export interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (payload: {
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    evidenceCategory: EvidenceCategory;
    entityType?: string;
    entityId?: string;
    tags?: string[];
    notes?: string;
  }) => Promise<void>;
}

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<EvidenceCategory>('equipment_photo');
  const [entityType, setEntityType] = useState<string>('assets');
  const [entityId, setEntityId] = useState<string>('BLR-001');
  const [tagsInput, setTagsInput] = useState<string>('Boiler, Convection Pass, Fireside');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 25 * 1024 * 1024) {
        setError('File exceeds the 25MB maximum evidence upload limit.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an evidence file to upload.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await onUpload({
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        evidenceCategory: category,
        entityType,
        entityId,
        tags,
        notes,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload evidence attachment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Verified Evidence Attachment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop File Zone */}
        <div className="border-2 border-dashed border-indigo-900/60 hover:border-gold-500/60 bg-midnight-950/60 rounded-xl p-6 text-center transition-colors">
          <input
            type="file"
            id="evidence-file-input"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.csv,.txt,.json,.xlsx,.docx"
          />
          <label htmlFor="evidence-file-input" className="cursor-pointer block space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-gold-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            {file ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-100">{file.name}</div>
                <div className="text-xs font-mono text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Click to select equipment photo, NDT scan, or report
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Supported: JPEG, PNG, WebP, PDF, CSV, TXT (Max 25MB). Auto SHA-256 fingerprinting.
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Evidence Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Evidence Classification Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EvidenceCategory)}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500"
          >
            <option value="equipment_photo">Equipment Photograph (Nameplate, Burner, Convection Tubes, Impeller)</option>
            <option value="inspection_evidence">Inspection Evidence (Ultrasonic NDT, Dye Penetrant, Checklist Photos)</option>
            <option value="maintenance_report">Maintenance Report (Lab Oil/Water Analysis, Calibration Sheets)</option>
            <option value="supporting_document">Supporting Document (ASME Certificates, Manufacturer Manuals, P&ID)</option>
          </select>
        </div>

        {/* Polymorphic Entity Linkage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Link To Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-gold-500"
            >
              <option value="assets">Asset (Boiler / Equipment)</option>
              <option value="work_orders">Work Order</option>
              <option value="inspections">Inspection Checkpoint</option>
              <option value="daily_logbooks">Daily Shift Logbook</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Target Entity Code / ID
            </label>
            <Input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g. BLR-001 or WO-2026-00014"
              required
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Audit Indexing Tags (Comma-Separated)
          </label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. ASME BPVC, SRV Calibration, Fireside, Soot"
          />
        </div>

        {/* Engineering Observations */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Technical Observations & Context Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-midnight-950 border border-indigo-900/60 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-gold-500 placeholder-slate-500"
            placeholder="Record physical observations, probe calibration setpoint, or contractor service notes..."
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-indigo-900/40">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting || !file}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isSubmitting ? 'Uploading & Hashing...' : 'Upload & Seal Evidence'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
