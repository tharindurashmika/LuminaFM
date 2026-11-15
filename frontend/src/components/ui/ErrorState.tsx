import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string | number;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operational Error Encountered',
  message = 'An unexpected error prevented loading telemetry signals or computing the ANP supermatrix.',
  errorCode,
  onRetry,
  retryLabel = 'Retry Calculation',
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-rose-950/20 border border-rose-500/40 rounded-2xl shadow-xl shadow-rose-950/30 ${className}`}
    >
      <div className="h-14 w-14 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 flex items-center justify-center mb-4 shadow-lg shadow-rose-900/40">
        <AlertTriangle className="h-7 w-7 text-rose-400 animate-pulse" />
      </div>

      <div className="space-y-1">
        {errorCode && (
          <span className="px-2.5 py-0.5 rounded-md bg-rose-900/60 border border-rose-600/40 text-[11px] font-mono text-rose-300 uppercase tracking-widest">
            ERR-{errorCode}
          </span>
        )}
        <h4 className="text-base sm:text-lg font-semibold text-rose-100 tracking-tight mt-1.5">
          {title}
        </h4>
      </div>

      <p className="text-xs sm:text-sm text-rose-200/80 max-w-md mt-2 font-mono leading-relaxed">
        {message}
      </p>

      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {onRetry && (
            <Button
              variant="danger"
              onClick={onRetry}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              {retryLabel}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
