import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string | null;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      id,
      className = '',
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-slate-300"
          >
            {label} {required && <span className="text-gold-400">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {leadingIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            required={required}
            aria-invalid={!!error}
            className={`w-full min-h-[44px] bg-midnight-950/90 border rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
              leadingIcon ? 'pl-10' : ''
            } ${trailingIcon ? 'pr-10' : ''} ${
              error
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-indigo-500'
            } ${className}`}
            {...props}
          />
          {trailingIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
              {trailingIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-400 flex items-center gap-1 font-mono">
            <span>•</span> {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
