import React from 'react';
import { Activity, Calculator, Sliders, Award } from 'lucide-react';
import { DataClassificationType, DATA_CLASSIFICATIONS } from '../../types/reporting.types';

export interface DataClassificationBadgeProps {
  type: DataClassificationType;
  valueDisplay?: string | number | boolean;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const DataClassificationBadge: React.FC<DataClassificationBadgeProps> = ({
  type,
  valueDisplay,
  unit,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const meta = DATA_CLASSIFICATIONS[type];

  const iconMap = {
    measured: <Activity className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    calculated: <Calculator className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    benchmark: <Sliders className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    expert: <Award className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
  };

  const toneStyles: Record<string, string> = {
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-cyan-900/20',
    indigo: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40 shadow-indigo-900/20',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-amber-900/20',
    gold: 'bg-gold-500/15 text-gold-300 border-gold-500/40 shadow-gold-900/20',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1 rounded',
    md: 'text-xs px-2 py-0.5 gap-1.5 rounded-md',
    lg: 'text-sm px-2.5 py-1 gap-2 rounded-lg',
  };

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center font-mono border font-medium tracking-wide shadow-sm select-none ${
        toneStyles[meta.badgeTone]
      } ${sizeStyles[size]} ${className}`}
    >
      <span className="shrink-0 opacity-80">{iconMap[type]}</span>
      {showLabel && (
        <span className="uppercase tracking-wider font-semibold opacity-90">
          [{meta.shortLabel}]
        </span>
      )}
      {valueDisplay !== undefined && (
        <span className="font-bold text-slate-100 ml-0.5">
          {typeof valueDisplay === 'boolean' ? (valueDisplay ? 'TRUE' : 'FALSE') : String(valueDisplay)}
          {unit ? ` ${unit}` : ''}
        </span>
      )}
    </span>
  );
};
