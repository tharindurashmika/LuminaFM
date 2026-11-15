import React from 'react';

export type BadgeTone = 'gold' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
export type BadgeSize = 'sm' | 'md';
export type BadgeVariant = 'subtle' | 'outline' | 'solid';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  variant?: BadgeVariant;
  pulseDot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'indigo',
  size = 'md',
  variant = 'subtle',
  pulseDot = false,
  icon,
  className = '',
  ...props
}) => {
  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 rounded-md font-mono',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg font-mono',
  };

  const toneSubtleStyles: Record<BadgeTone, string> = {
    gold: 'bg-gold-500/15 text-gold-300 border border-gold-500/40 shadow-glow-gold/40',
    indigo: 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-glow-indigo/30',
    emerald: 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40',
    amber: 'bg-amber-950/60 text-amber-300 border border-amber-500/40',
    rose: 'bg-rose-950/60 text-rose-300 border border-rose-500/40',
    slate: 'bg-midnight-800 text-slate-300 border border-slate-700/80',
  };

  const dotStyles: Record<BadgeTone, string> = {
    gold: 'bg-gold-400',
    indigo: 'bg-indigo-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium uppercase tracking-wider select-none ${
        sizeStyles[size]
      } ${toneSubtleStyles[tone]} ${className}`}
      {...props}
    >
      {pulseDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotStyles[tone]} animate-pulse`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
