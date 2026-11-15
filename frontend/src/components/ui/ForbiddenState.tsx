import React from 'react';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { useAuth } from '../../store/AuthContext';
import { UserRole } from '../../types/cmms.types';

export interface ForbiddenStateProps {
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string;
  resourceName?: string;
  className?: string;
}

export const ForbiddenState: React.FC<ForbiddenStateProps> = ({
  requiredRole,
  requiredPermission,
  resourceName = 'this enterprise facility resource',
  className = '',
}) => {
  const { activeRole, switchRole } = useAuth();

  const formattedRequiredRole = Array.isArray(requiredRole)
    ? requiredRole.join(' or ')
    : requiredRole || 'Organization Admin';

  return (
    <div
      role="alert"
      className={`p-8 sm:p-14 flex flex-col items-center justify-center text-center bg-midnight-900/80 border border-gold-500/30 rounded-2xl shadow-glow-gold/10 max-w-2xl mx-auto my-8 ${className}`}
    >
      <div className="h-16 w-16 rounded-2xl bg-midnight-950 border border-gold-500/50 text-gold-400 flex items-center justify-center mb-5 shadow-glow-gold/20">
        <ShieldAlert className="h-8 w-8 text-gold-400" />
      </div>

      <div className="space-y-1">
        <span className="px-2.5 py-0.5 rounded-md bg-gold-500/15 border border-gold-500/40 text-[11px] font-mono text-gold-300 uppercase tracking-widest">
          Role-Based Access Control (RBAC)
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mt-2">
          Restricted Engineering Access
        </h3>
      </div>

      <p className="text-xs sm:text-sm text-slate-300 max-w-lg mt-3 leading-relaxed">
        Your current session role is active as{' '}
        <span className="font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/30">
          {activeRole}
        </span>
        . Access to {resourceName} requires elevated authorization:
      </p>

      <div className="mt-4 p-4 rounded-xl bg-midnight-950 border border-slate-800 text-left w-full space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Required Role:</span>
          <span className="text-gold-300 font-semibold">{formattedRequiredRole}</span>
        </div>
        {requiredPermission && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Required Permission:</span>
            <span className="text-indigo-300">{requiredPermission}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link to="/">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Return to Command Center
          </Button>
        </Link>
        <Button
          variant="gold"
          onClick={() => switchRole('Organization Admin')}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Switch to Organization Admin
        </Button>
      </div>
    </div>
  );
};
