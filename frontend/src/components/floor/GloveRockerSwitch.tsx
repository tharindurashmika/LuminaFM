import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Check, X } from 'lucide-react';

export type RockerState = 'pass' | 'conditional' | 'fail' | 'yes' | 'no';

interface GloveRockerSwitchProps {
  label: string;
  itemCode?: string;
  subtext?: string;
  value: string | boolean | null | undefined;
  mode?: 'pass_fail' | 'pass_conditional_fail' | 'yes_no';
  onChange: (val: any) => void;
  disabled?: boolean;
}

export const GloveRockerSwitch: React.FC<GloveRockerSwitchProps> = ({
  label,
  subtext,
  value,
  mode = 'pass_conditional_fail',
  onChange,
  disabled = false,
}) => {
  // Normalize current value string
  const normalizedValue =
    typeof value === 'boolean'
      ? value
        ? 'pass'
        : 'fail'
      : typeof value === 'string'
      ? value.toLowerCase()
      : null;

  return (
    <div className="p-4 rounded-2xl bg-midnight-950/80 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
            {label}
          </p>
          {subtext && <p className="text-xs text-slate-400 mt-0.5 leading-normal">{subtext}</p>}
        </div>

        {/* Current status pill */}
        <div className="shrink-0">
          {normalizedValue === 'pass' || normalizedValue === 'yes' ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 uppercase">
              PASS
            </span>
          ) : normalizedValue === 'conditional' ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40 uppercase">
              CONDITIONAL
            </span>
          ) : normalizedValue === 'fail' || normalizedValue === 'no' ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/40 uppercase">
              FAIL
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-500 border border-slate-800 uppercase">
              UNCHECKED
            </span>
          )}
        </div>
      </div>

      {/* 3-State or 2-State Large Industrial Glove Touch Rocker */}
      <div className="grid grid-cols-3 gap-2">
        {mode === 'pass_conditional_fail' ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('pass')}
              className={`min-h-[52px] rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all border ${
                normalizedValue === 'pass'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/30'
                  : 'bg-midnight-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 active:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>PASS</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('conditional')}
              className={`min-h-[52px] rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all border ${
                normalizedValue === 'conditional'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/30'
                  : 'bg-midnight-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 active:bg-slate-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>WARN</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('fail')}
              className={`min-h-[52px] rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all border ${
                normalizedValue === 'fail'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-900/30'
                  : 'bg-midnight-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 active:bg-slate-700'
              }`}
            >
              <XCircle className="h-4 w-4" />
              <span>FAIL</span>
            </button>
          </>
        ) : (
          <div className="col-span-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(true)}
              className={`min-h-[52px] rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border ${
                normalizedValue === 'pass' || normalizedValue === 'yes'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/30'
                  : 'bg-midnight-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 active:bg-slate-700'
              }`}
            >
              <Check className="h-5 w-5" />
              <span>YES / OK</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(false)}
              className={`min-h-[52px] rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border ${
                normalizedValue === 'fail' || normalizedValue === 'no'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-900/30'
                  : 'bg-midnight-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 active:bg-slate-700'
              }`}
            >
              <X className="h-5 w-5" />
              <span>NO / ABNORMAL</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
