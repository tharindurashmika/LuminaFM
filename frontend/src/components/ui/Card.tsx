import React from 'react';

export type CardVariant = 'default' | 'interactive' | 'accent-gold' | 'accent-indigo';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const baseStyles =
      'bg-midnight-900/85 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl transition-all duration-200 overflow-hidden';

    const variantStyles: Record<CardVariant, string> = {
      default: '',
      interactive:
        'hover:border-indigo-500/40 hover:shadow-glow-indigo cursor-pointer hover:-translate-y-0.5',
      'accent-gold':
        'border-t-2 border-t-gold-500/80 border-slate-800/80 shadow-glow-gold/20',
      'accent-indigo':
        'border-t-2 border-t-indigo-500/80 border-slate-800/80 shadow-glow-indigo/20',
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`p-5 sm:p-6 border-b border-slate-800/70 flex flex-col gap-1.5 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3
    className={`text-lg sm:text-xl font-semibold text-slate-100 tracking-tight flex items-center justify-between ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-slate-400 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 sm:p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`p-4 sm:p-5 bg-midnight-950/60 border-t border-slate-800/70 flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);
