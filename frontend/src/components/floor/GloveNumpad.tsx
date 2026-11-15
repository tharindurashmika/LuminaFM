import React, { useState, useEffect } from 'react';
import { X, Delete, Check, Plus, Minus, AlertTriangle, ShieldCheck } from 'lucide-react';

interface GloveNumpadProps {
  isOpen: boolean;
  title: string;
  itemCode?: string;
  unit?: string | null;
  currentValue: string;
  minValue?: number;
  maxValue?: number;
  presets?: number[];
  onConfirm: (newValue: string) => void;
  onClose: () => void;
}

export const GloveNumpad: React.FC<GloveNumpadProps> = ({
  isOpen,
  title,
  unit,
  currentValue,
  minValue,
  maxValue,
  presets = [],
  onConfirm,
  onClose,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(currentValue || '0');

  useEffect(() => {
    if (isOpen) {
      setDisplayValue(currentValue || '0');
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  const numVal = parseFloat(displayValue);
  const isOutOfRange =
    !isNaN(numVal) &&
    ((minValue !== undefined && numVal < minValue) ||
      (maxValue !== undefined && numVal > maxValue));

  const handleKeyPress = (char: string) => {
    if (char === '.' && displayValue.includes('.')) return;
    if (displayValue === '0' && char !== '.') {
      setDisplayValue(char);
    } else {
      if (displayValue.length < 9) {
        setDisplayValue((prev) => prev + char);
      }
    }
  };

  const handleBackspace = () => {
    if (displayValue.length <= 1) {
      setDisplayValue('0');
    } else {
      setDisplayValue((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setDisplayValue('0');
  };

  const handleStep = (delta: number) => {
    const cur = parseFloat(displayValue) || 0;
    const next = Math.max(0, cur + delta);
    // Format to max 2 decimal places to avoid floating point anomalies
    const formatted = parseFloat(next.toFixed(2)).toString();
    setDisplayValue(formatted);
  };

  const handlePreset = (val: number) => {
    setDisplayValue(val.toString());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="glove-numpad-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-midnight-950/85 backdrop-blur-md p-0 sm:p-4"
    >
      <div className="w-full max-w-lg bg-midnight-900 border-t sm:border border-slate-700/80 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header with Title and Dismiss */}
        <div className="px-5 py-4 bg-midnight-950/90 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              Glove-Accessible Numerical Entry
            </span>
            <h2 id="glove-numpad-title" className="text-base sm:text-lg font-bold text-white truncate max-w-[280px] sm:max-w-md">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close numpad"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-midnight-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Readout Display & Live Range Validation */}
        <div className="p-4 sm:p-5 bg-midnight-950/50 space-y-3">
          <div
            className={`p-4 rounded-2xl border-2 transition-all flex items-baseline justify-between ${
              isOutOfRange
                ? 'bg-red-950/30 border-red-500/80 shadow-glow-gold'
                : 'bg-midnight-950 border-indigo-500/50'
            }`}
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-white tracking-tight">
                {displayValue}
              </span>
              {unit && (
                <span className="text-lg sm:text-xl font-mono font-semibold text-gold-400">
                  {unit}
                </span>
              )}
            </div>

            <div className="shrink-0 text-right">
              {isOutOfRange ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-500/60 uppercase animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Out of Spec
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  In Spec
                </span>
              )}
            </div>
          </div>

          {/* Benchmark Range Guide */}
          {(minValue !== undefined || maxValue !== undefined) && (
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>Nominal Operating Range:</span>
              <span className="text-indigo-300 font-semibold">
                {minValue !== undefined ? minValue : '—'} to {maxValue !== undefined ? maxValue : '—'}{' '}
                {unit}
              </span>
            </div>
          )}

          {/* Quick-Preset Chips for 1-Tap Entry */}
          {presets.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                1-Tap Standard Gauge Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-midnight-900 hover:bg-indigo-900/60 active:bg-indigo-700 text-slate-200 border border-slate-700/80 text-sm font-mono font-semibold transition-all"
                  >
                    {preset} {unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Glove Stepper Incrementors */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleStep(-1.0)}
              className="min-h-[48px] rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1"
            >
              <Minus className="h-4 w-4" /> 1.0
            </button>
            <button
              type="button"
              onClick={() => handleStep(-0.1)}
              className="min-h-[48px] rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1"
            >
              <Minus className="h-3.5 w-3.5" /> 0.1
            </button>
            <button
              type="button"
              onClick={() => handleStep(0.1)}
              className="min-h-[48px] rounded-xl bg-indigo-950 hover:bg-indigo-900 active:bg-indigo-800 text-indigo-200 border border-indigo-700/80 text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5 text-gold-400" /> 0.1
            </button>
            <button
              type="button"
              onClick={() => handleStep(1.0)}
              className="min-h-[48px] rounded-xl bg-indigo-950 hover:bg-indigo-900 active:bg-indigo-800 text-indigo-200 border border-indigo-700/80 text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1"
            >
              <Plus className="h-4 w-4 text-gold-400" /> 1.0
            </button>
          </div>
        </div>

        {/* Tactile Large Keypad Grid (≥ 56px touch target height) */}
        <div className="p-4 sm:p-5 bg-midnight-900 space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="min-h-[56px] sm:min-h-[64px] rounded-2xl bg-midnight-950 hover:bg-slate-800 active:bg-indigo-600 active:text-white text-white border border-slate-700/80 text-2xl font-mono font-bold shadow-md transition-all flex items-center justify-center"
              >
                {key}
              </button>
            ))}

            {/* Bottom Keypad Row: Clear, 0, Period */}
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[56px] sm:min-h-[64px] rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-red-900 text-amber-400 border border-slate-700 text-base sm:text-lg font-mono font-bold uppercase transition-all flex items-center justify-center"
            >
              CLR
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="min-h-[56px] sm:min-h-[64px] rounded-2xl bg-midnight-950 hover:bg-slate-800 active:bg-indigo-600 active:text-white text-white border border-slate-700/80 text-2xl font-mono font-bold shadow-md transition-all flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('.')}
              className="min-h-[56px] sm:min-h-[64px] rounded-2xl bg-midnight-950 hover:bg-slate-800 active:bg-indigo-600 active:text-white text-white border border-slate-700/80 text-2xl font-mono font-bold shadow-md transition-all flex items-center justify-center"
            >
              .
            </button>
          </div>

          {/* Action Row: Backspace & Confirm (≥ 56px height) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Backspace"
              className="min-h-[56px] rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 border border-slate-600 text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Delete className="h-6 w-6" />
              <span>DEL</span>
            </button>

            <button
              type="button"
              onClick={() => onConfirm(displayValue)}
              className="col-span-2 min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="h-6 w-6" />
              <span>Confirm Reading</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
