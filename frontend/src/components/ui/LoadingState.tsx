import React from 'react';
import { Loader2, Flame } from 'lucide-react';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  fullscreen?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Processing telemetry & models...',
  description = 'Retrieving real-time data from LuminaFM enterprise registry',
  fullscreen = false,
  className = '',
}) => {
  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 bg-midnight-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center'
    : `p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-midnight-900/60 border border-slate-800/80 rounded-2xl ${className}`;

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="relative flex items-center justify-center mb-4">
        {/* Subtle dual-ring glow */}
        <div className="absolute h-16 w-16 rounded-full bg-indigo-500/15 animate-ping" />
        <div className="relative h-14 w-14 rounded-2xl bg-midnight-950 border border-indigo-500/40 shadow-glow-indigo flex items-center justify-center">
          <Flame className="h-7 w-7 text-gold-400 animate-pulse" />
          <Loader2 className="absolute h-10 w-10 text-indigo-400/50 animate-spin" />
        </div>
      </div>
      <h4 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h4>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm mt-1 font-mono">{description}</p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div
    className={`bg-slate-800/60 animate-pulse rounded-lg border border-slate-800/40 ${className}`}
  />
);

export const SkeletonCard: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => (
  <div
    className={`p-6 bg-midnight-900/70 border border-slate-800/80 rounded-2xl space-y-4 ${className}`}
  >
    <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  </div>
);
