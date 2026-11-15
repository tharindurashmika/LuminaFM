import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export interface SuccessStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title = 'Action Successfully Executed',
  description = 'The record has been committed to the immutable audit log and synchronized.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      role="status"
      className={`p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-emerald-950/20 border border-emerald-500/40 rounded-2xl shadow-xl shadow-emerald-950/20 ${className}`}
    >
      <div className="h-14 w-14 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/40">
        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
      </div>

      <h4 className="text-base sm:text-lg font-semibold text-emerald-100 tracking-tight">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-emerald-200/80 max-w-md mt-1.5 font-mono leading-relaxed">
        {description}
      </p>

      {(onAction || onSecondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {onAction && actionLabel && (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button variant="ghost" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
