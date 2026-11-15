import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Network,
  Database,
  Layers,
  ShieldCheck,
  Edit3,
  Save,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Wrench,
  Activity,
  Award,
} from 'lucide-react';
import {
  AssetSummary,
  AttributeDataType,
  DynamicEquipmentAttribute,
} from '../../types/cmms.types';
import { assetsApiService } from '../../services/assets.service';
import {
  AssetStatusBadge,
  CriticalityBadge,
} from '../ui/StatusBadge';
import { DynamicAttributeRenderer } from './DynamicAttributeRenderer';

interface AssetDetailDrawerProps {
  asset: AssetSummary | null;
  onClose: () => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({
  asset,
  onClose,
}) => {
  const [attributes, setAttributes] = useState<DynamicEquipmentAttribute[]>([]);
  const [isLoadingAttrs, setIsLoadingAttrs] = useState<boolean>(false);
  const [isEditingAttrs, setIsEditingAttrs] = useState<boolean>(false);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) return;

    let isMounted = true;
    setIsLoadingAttrs(true);
    setIsEditingAttrs(false);
    setDraftValues({});
    setFeedbackMsg(null);

    assetsApiService
      .getAssetDynamicAttributes(asset.id)
      .then((res) => {
        if (isMounted) {
          setAttributes(res.attributes);
          setIsLoadingAttrs(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAttributes([]);
          setIsLoadingAttrs(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [asset]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && asset) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [asset, onClose]);

  if (!asset) return null;

  const handleDraftChange = (
    code: string,
    newValue: unknown,
    _dataType: AttributeDataType
  ) => {
    setDraftValues((prev) => ({
      ...prev,
      [code]: newValue,
    }));
  };

  const handleSaveAttributes = async () => {
    const entries = Object.entries(draftValues);
    if (entries.length === 0) {
      setIsEditingAttrs(false);
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const payload = entries.map(([code, value]) => ({ code, value }));
      const updated = await assetsApiService.updateAssetDynamicAttributes(
        asset.id,
        payload
      );
      setAttributes(updated.attributes);
      setDraftValues({});
      setIsEditingAttrs(false);
      setFeedbackMsg(
        `Dynamic attribute values validated against data_type and persisted via PUT /api/assets/${asset.assetCode}/attributes.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-midnight-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Side Drawer Panel */}
      <aside
        aria-label="Asset Details Drawer"
        className="relative z-10 w-full max-w-2xl bg-midnight-900 border-l border-slate-800/90 shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {/* Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-gold-500 to-indigo-600" />

        {/* Drawer Header */}
        <div className="px-6 py-5 bg-midnight-950/80 border-b border-slate-800/80 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                {asset.assetCode}
              </span>
              <CriticalityBadge level={asset.criticality} />
              <AssetStatusBadge status={asset.status} />
            </div>
            <h2 className="text-lg font-semibold text-slate-100 leading-snug">
              {asset.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
              <span>SN: {asset.serialNumber || 'N/A'}</span>
              <span>•</span>
              <span className="text-gold-400">
                Category: {asset.assetCategory.name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-midnight-850 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 flex items-center justify-center transition-colors"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description if present */}
          {asset.description && (
            <p className="text-xs text-slate-300 leading-relaxed bg-midnight-950/60 p-3.5 rounded-xl border border-slate-800/70">
              {asset.description}
            </p>
          )}

          {/* Hierarchy & OEM Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-midnight-950/80 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-indigo-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Physical Hierarchy</span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Site:</span>
                  <span className="text-slate-200 font-medium text-right">
                    {asset.site.name}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-300 font-mono text-[11px] text-right">
                    {asset.location.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-midnight-950/80 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-gold-400">
                <Network className="w-3.5 h-3.5" />
                <span>System & OEM Lineage</span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">System:</span>
                  <span className="text-indigo-300 font-mono text-[11px] text-right">
                    {asset.system?.name ?? 'Standalone'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">OEM / Model:</span>
                  <span className="text-slate-200 font-medium text-right">
                    {asset.brand?.name ?? 'OEM'}{' '}
                    {asset.model?.modelNumber ? `(${asset.model.modelNumber})` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Counters Strip */}
          {asset._count && (
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-midnight-950/70 border border-slate-800/70 text-center">
                <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-1">
                  <Wrench className="w-3 h-3 text-indigo-400" />
                  <span>Work Orders</span>
                </div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-0.5">
                  {asset._count.workOrders}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-midnight-950/70 border border-slate-800/70 text-center">
                <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Inspections</span>
                </div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-0.5">
                  {asset._count.inspections}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-midnight-950/70 border border-slate-800/70 text-center">
                <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3 text-gold-400" />
                  <span>Meters</span>
                </div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-0.5">
                  {asset._count.assetMeters}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-midnight-950/70 border border-slate-800/70 text-center">
                <div className="text-xs font-mono text-slate-500 flex items-center justify-center gap-1">
                  <Award className="w-3 h-3 text-indigo-300" />
                  <span>Design Life</span>
                </div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-0.5">
                  {asset.expectedLifeYears ? `${asset.expectedLifeYears}y` : '20y'}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Equipment Attributes Section (EAV Engine) */}
          <div className="lumina-card p-5 space-y-4 border-indigo-500/30">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-gold-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
                    Dynamic Equipment Attributes
                  </h3>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Fetched via{' '}
                  <code className="text-indigo-300">
                    GET /api/assets/{asset.assetCode}/attributes
                  </code>{' '}
                  • Rendered dynamically by <code className="text-gold-300">data_type</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isEditingAttrs ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingAttrs(true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs md:text-sm font-medium bg-indigo-950/90 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-900/80 flex items-center gap-2 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-gold-400" />
                    <span>Edit Values</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAttrs(false);
                        setDraftValues({});
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium bg-midnight-950 text-slate-300 border border-slate-700 hover:border-slate-500 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveAttributes}
                      className="lumina-btn-gold text-xs md:text-sm py-2 px-4 flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save Typed Values'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {feedbackMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {isLoadingAttrs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                <span className="text-xs font-mono">
                  Fetching dynamic EAV schema for {asset.assetCode}...
                </span>
              </div>
            ) : (
              <DynamicAttributeRenderer
                attributes={attributes}
                isEditing={isEditingAttrs}
                draftValues={draftValues}
                onDraftChange={handleDraftChange}
              />
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3.5 bg-midnight-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Schema-Free EAV Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </aside>
    </div>
  );
};

