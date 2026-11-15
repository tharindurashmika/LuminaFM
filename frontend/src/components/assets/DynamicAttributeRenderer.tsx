import React from 'react';
import {
  Hash,
  ToggleLeft,
  Calendar,
  FileCode2,
  Type,
  ListFilter,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { AttributeDataType, DynamicEquipmentAttribute } from '../../types/cmms.types';

interface DynamicAttributeRendererProps {
  attributes: DynamicEquipmentAttribute[];
  isEditing?: boolean;
  draftValues?: Record<string, unknown>;
  onDraftChange?: (code: string, newValue: unknown, dataType: AttributeDataType) => void;
}

/**
 * Returns the visual metadata icon & label for any `AttributeDataType`
 * without hardcoding equipment-specific or category-specific logic.
 */
function getDataTypeDescriptor(dataType: AttributeDataType): {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
} {
  switch (dataType) {
    case 'number':
      return {
        label: 'NUMBER',
        icon: <Hash className="w-3 h-3 text-gold-400" />,
        badgeClass: 'bg-gold-500/10 text-gold-300 border-gold-500/30',
      };
    case 'boolean':
      return {
        label: 'BOOLEAN',
        icon: <ToggleLeft className="w-3 h-3 text-emerald-400" />,
        badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
      };
    case 'date':
    case 'datetime':
      return {
        label: dataType.toUpperCase(),
        icon: <Calendar className="w-3 h-3 text-indigo-400" />,
        badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
      };
    case 'select':
    case 'multi_select':
      return {
        label: dataType.toUpperCase(),
        icon: <ListFilter className="w-3 h-3 text-indigo-300" />,
        badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
      };
    case 'json':
      return {
        label: 'JSONB',
        icon: <FileCode2 className="w-3 h-3 text-gold-300" />,
        badgeClass: 'bg-gold-500/10 text-gold-300 border-gold-500/30',
      };
    case 'text':
    default:
      return {
        label: 'TEXT',
        icon: <Type className="w-3 h-3 text-slate-400" />,
        badgeClass: 'bg-slate-800/90 text-slate-300 border-slate-700',
      };
  }
}

/**
 * Purely schema-driven renderer for dynamic equipment attributes (`asset_attribute_values`).
 * Renders any equipment's telemetry or specification attributes based solely on `data_type`
 * and `unit_code` returned by `GET /api/assets/:id/attributes`.
 */
export const DynamicAttributeRenderer: React.FC<DynamicAttributeRendererProps> = ({
  attributes,
  isEditing = false,
  draftValues = {},
  onDraftChange,
}) => {
  if (!attributes || attributes.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-midnight-950/70 border border-slate-800/80 text-center">
        <p className="text-xs font-mono text-slate-400">
          No dynamic equipment attributes configured for this asset record.
        </p>
      </div>
    );
  }

  // Group numeric telemetry metrics vs specification attributes solely by `dataType`
  const numericAttributes = attributes.filter((attr) => attr.dataType === 'number');
  const nonNumericAttributes = attributes.filter((attr) => attr.dataType !== 'number');

  const renderValueControl = (attr: DynamicEquipmentAttribute) => {
    const currentValue =
      attr.code in draftValues ? draftValues[attr.code] : attr.value;

    if (isEditing && onDraftChange) {
      switch (attr.dataType) {
        case 'number':
          return (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="any"
                value={currentValue !== null && currentValue !== undefined ? String(currentValue) : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  onDraftChange(
                    attr.code,
                    raw === '' ? 0 : Number(raw),
                    attr.dataType
                  );
                }}
                className="lumina-input py-1.5 px-2.5 text-sm font-mono text-gold-300"
              />
              {attr.unitCode && (
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {attr.unitCode}
                </span>
              )}
            </div>
          );

        case 'boolean':
          return (
            <button
              type="button"
              onClick={() =>
                onDraftChange(attr.code, !Boolean(currentValue), attr.dataType)
              }
              className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-all flex items-center gap-2 ${
                Boolean(currentValue)
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {Boolean(currentValue) ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TRUE (Active)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>FALSE (Inactive)</span>
                </>
              )}
            </button>
          );

        case 'date':
          return (
            <input
              type="date"
              value={String(currentValue ?? '')}
              onChange={(e) =>
                onDraftChange(attr.code, e.target.value, attr.dataType)
              }
              className="lumina-input mt-2 py-1.5 px-2.5 text-xs font-mono"
            />
          );

        case 'text':
        case 'select':
          return (
            <input
              type="text"
              value={String(currentValue ?? '')}
              onChange={(e) =>
                onDraftChange(attr.code, e.target.value, attr.dataType)
              }
              className="lumina-input mt-2 py-1.5 px-2.5 text-xs font-mono"
            />
          );

        default:
          break;
      }
    }

    // Read-only rendering driven strictly by `attr.dataType`
    switch (attr.dataType) {
      case 'number': {
        const numVal =
          typeof currentValue === 'number'
            ? currentValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            : String(currentValue ?? '—');
        return (
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-semibold font-mono tracking-tight text-slate-100">
              {numVal}
            </span>
            {attr.unitCode && (
              <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-300 border border-gold-500/30">
                {attr.unitCode}
              </span>
            )}
          </div>
        );
      }

      case 'boolean': {
        const isTrue = Boolean(currentValue);
        return (
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono uppercase tracking-wider border ${
                isTrue
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isTrue ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enabled / Verified</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Disabled / False</span>
                </>
              )}
            </span>
          </div>
        );
      }

      case 'date':
      case 'datetime': {
        return (
          <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-xs font-mono text-indigo-200">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{String(currentValue ?? '—')}</span>
          </div>
        );
      }

      case 'multi_select': {
        const items = Array.isArray(currentValue)
          ? currentValue
          : [String(currentValue ?? '')];
        return (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {items.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-xs font-mono text-indigo-200"
              >
                {String(item)}
              </span>
            ))}
          </div>
        );
      }

      case 'json': {
        if (typeof currentValue === 'object' && currentValue !== null) {
          return (
            <div className="mt-2 p-3 rounded-lg bg-midnight-950 border border-slate-800/90 space-y-1.5">
              {Object.entries(currentValue as Record<string, unknown>).map(
                ([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 text-xs font-mono border-b border-slate-800/50 last:border-b-0 pb-1 last:pb-0"
                  >
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-gold-300 font-medium">
                      {String(v)}
                    </span>
                  </div>
                )
              )}
            </div>
          );
        }
        return (
          <pre className="mt-2 p-2.5 rounded bg-midnight-950 text-xs font-mono text-gold-300 overflow-x-auto">
            {JSON.stringify(currentValue, null, 2)}
          </pre>
        );
      }

      case 'select':
      case 'text':
      default:
        return (
          <div className="mt-1.5">
            <span className="inline-block px-2.5 py-1 rounded-md bg-midnight-950 border border-slate-700/80 text-xs font-mono font-medium text-gold-300">
              {String(currentValue ?? '—')}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Numeric Telemetry Grid (rendered automatically for any `number` data_type attributes) */}
      {numericAttributes.length > 0 && (
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span>Quantitative Metrics (data_type: number)</span>
            <span className="text-gold-400">{numericAttributes.length} Active Parameters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {numericAttributes.map((attr) => {
              const descriptor = getDataTypeDescriptor(attr.dataType);
              return (
                <div
                  key={attr.id || attr.code}
                  className="p-4 rounded-xl bg-midnight-950/90 border border-slate-800/80 hover:border-indigo-500/40 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-200 leading-snug">
                        {attr.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 ${descriptor.badgeClass}`}
                      >
                        {descriptor.icon}
                        {descriptor.label}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {attr.code}
                    </div>
                  </div>

                  {renderValueControl(attr)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-Numeric Specifications (boolean, select, date, text, json) */}
      {nonNumericAttributes.length > 0 && (
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span>Configuration & Compliance Attributes</span>
            <span className="text-indigo-400">
              {nonNumericAttributes.length} Typed Definitions
            </span>
          </div>
          <div className="space-y-2.5">
            {nonNumericAttributes.map((attr) => {
              const descriptor = getDataTypeDescriptor(attr.dataType);
              return (
                <div
                  key={attr.id || attr.code}
                  className="p-3.5 rounded-xl bg-midnight-950/75 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-slate-200">
                        {attr.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {attr.code}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {attr.updatedAt && (
                        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {String(attr.updatedAt).slice(0, 10)}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${descriptor.badgeClass}`}
                      >
                        {descriptor.icon}
                        {descriptor.label}
                      </span>
                    </div>
                  </div>

                  {renderValueControl(attr)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

