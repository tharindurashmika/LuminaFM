import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-950 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'min-h-[38px] px-3.5 py-1.5 text-xs rounded-lg gap-2',
      md: 'min-h-[44px] px-5 py-2.5 text-sm rounded-xl gap-2.5',
      lg: 'min-h-[50px] px-6 py-3.5 text-base rounded-xl gap-3',
    };

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow-indigo border border-indigo-400/30',
      gold:
        'bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/40 shadow-glow-gold',
      secondary:
        'bg-midnight-900/90 hover:bg-midnight-800 text-slate-200 border border-slate-700/80 hover:border-slate-600',
      danger:
        'bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 shadow-lg shadow-rose-950/40',
      ghost:
        'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 border border-transparent',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
