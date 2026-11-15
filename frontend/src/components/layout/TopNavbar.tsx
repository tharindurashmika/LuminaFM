import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Bell,
  LogOut,
  Sparkles,
  Building2,
  Menu,
  UserCheck,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';
import { useAuth, SYSTEM_ROLES } from '../../store/AuthContext';
import { UserRole } from '../../types/cmms.types';
import { offlineSyncService } from '../../services/offline-sync.service';
import { LogoutSyncGuardModal } from '../floor/LogoutSyncGuardModal';

interface TopNavbarProps {
  onToggleMobileDrawer?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleMobileDrawer,
}) => {
  const { user, organization, activeRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isLogoutGuardOpen, setIsLogoutGuardOpen] = useState(false);

  const handleLogout = () => {
    const { pendingCount, conflictCount } = offlineSyncService.checkPendingSyncBeforeLogout();
    if (pendingCount > 0 || conflictCount > 0) {
      setIsLogoutGuardOpen(true);
      return;
    }
    logout();
    navigate('/login');
  };

  const executeConfirmedLogout = (_clearLocalData: boolean) => {
    setIsLogoutGuardOpen(false);
    logout();
    navigate('/login');
  };

  const getRoleBadgeTone = (role: UserRole) => {
    switch (role) {
      case 'Organization Admin':
        return 'bg-gold-500/15 text-gold-300 border-gold-500/40 shadow-glow-gold/30';
      case 'Plant Reliability Engineer':
        return 'bg-indigo-950 text-indigo-300 border-indigo-500/40 shadow-glow-indigo/30';
      case 'Boiler Plant Operator':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
      case 'Maintenance Technician':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      default:
        return 'bg-midnight-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 min-h-[72px] w-full bg-midnight-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-3">
      {/* Left: Hamburger Trigger (Mobile) + Dynamic White-Label Brand Logo */}
      <div className="flex items-center gap-3 md:gap-5">
        <button
          type="button"
          onClick={onToggleMobileDrawer}
          aria-label="Open navigation menu"
          className="lg:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-midnight-900 hover:bg-indigo-950/80 text-slate-200 border border-slate-800 flex items-center justify-center transition-colors"
        >
          <Menu className="h-5 w-5 text-gold-400" />
        </button>

        <Link
          to="/"
          className="min-h-[44px] inline-flex items-center focus:outline-none"
        >
          <BrandLogo size="md" />
        </Link>

        {/* Tenant Scope Indicator */}
        <div className="hidden md:flex items-center gap-2.5 pl-5 border-l border-slate-800/80">
          <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 hidden xl:inline">Tenant Scope:</span>
            <span className="font-medium text-slate-200 truncate max-w-[180px] xl:max-w-none">
              {organization?.name || 'Unassigned Organization'}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-indigo-950/90 border border-indigo-500/30 font-mono text-xs text-indigo-300">
              {organization?.code || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Role Switcher, Alerts, White-Label Quick-Link & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive RBAC Role Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleMenuOpen((prev) => !prev)}
            aria-label="Change active user role"
            aria-expanded={isRoleMenuOpen}
            className={`min-h-[44px] px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${getRoleBadgeTone(
              activeRole
            )}`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-semibold">{activeRole}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          {isRoleMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsRoleMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 z-50 w-64 p-2 bg-midnight-900 border border-slate-800 rounded-xl shadow-2xl shadow-midnight-950 space-y-1">
                <div className="px-2.5 py-1.5 border-b border-slate-800/80 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Switch Active RBAC Role
                </div>
                {SYSTEM_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      switchRole(role);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      activeRole === role
                        ? 'bg-indigo-950 text-gold-300 border border-gold-500/30 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-midnight-800'
                    }`}
                  >
                    <span>{role}</span>
                    {activeRole === role && (
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Critical Alert Indicator */}
        <Link
          to="/work-orders"
          className="hidden xl:inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium lumina-alert-critical hover:bg-gold-500/20 transition-colors"
        >
          <Bell className="h-3.5 w-3.5 text-gold-400 animate-bounce shrink-0" />
          <span>BLR-001 Pressure Alert</span>
        </Link>

        {/* Floor Tablet Kiosk Mode Trigger */}
        <Link
          to="/operator"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 active:bg-gold-500/40 text-gold-300 border border-gold-500/40 text-xs font-mono font-bold transition-all shadow-sm"
          title="Switch to Purpose-Built Factory-Floor Tablet Kiosk"
        >
          <Flame className="h-4 w-4 text-gold-400 shrink-0" />
          <span className="hidden sm:inline">Tablet Kiosk</span>
        </Link>

        {/* Tenant Isolation Status */}
        <div
          title={`Isolated to Organization UUID: ${organization?.id}`}
          className="hidden lg:flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-midnight-900 border border-slate-800 text-xs text-slate-300 font-mono"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span>RLS Isolated</span>
        </div>

        {/* White-Label Quick Link (visible to Admin) */}
        {activeRole === 'Organization Admin' && (
          <Link
            to="/settings"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-500/30 text-xs font-medium text-indigo-200 transition-colors"
            title="Configure White-Label Logo & Organization Settings"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span className="hidden md:inline">White-Label</span>
          </Link>
        )}

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs sm:text-sm font-semibold text-slate-100 leading-tight">
              {user?.fullName || 'Facility Engineer'}
            </span>
            <span className="text-[11px] text-slate-400 leading-tight font-mono">
              {user?.email}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out / Switch Organization"
            aria-label="Sign out"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-midnight-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-700/60 flex items-center justify-center transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Unsynchronized Data Logout Guard Modal */}
      <LogoutSyncGuardModal
        isOpen={isLogoutGuardOpen}
        onClose={() => setIsLogoutGuardOpen(false)}
        onProceedLogout={executeConfirmedLogout}
      />
    </header>
  );
};
