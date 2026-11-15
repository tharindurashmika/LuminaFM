import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No records found',
  description = 'There are no active entries matching your criteria in the facility database.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`p-8 sm:p-14 flex flex-col items-center justify-center text-center bg-midnight-900/50 border border-slate-800/80 rounded-2xl ${className}`}
    >
      <div className="h-14 w-14 rounded-2xl bg-midnight-950 border border-slate-800/80 text-slate-400 flex items-center justify-center mb-4 shadow-inner">
        {icon || <PackageOpen className="h-7 w-7 text-indigo-400/80" />}
      </div>
      <h4 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">
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
