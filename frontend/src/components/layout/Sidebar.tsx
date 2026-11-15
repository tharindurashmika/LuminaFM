import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  ClipboardList,
  Settings,
  Gauge,
  GitBranch,
  Flame,
  Scale,
  X,
  UserCheck,
  Network,
  Calendar,
  ClipboardCheck,
  DollarSign,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, SYSTEM_ROLES } from '../../store/AuthContext';
import { BrandLogo } from '../ui/BrandLogo';
import { UserRole } from '../../types/cmms.types';

export interface NavItem {
  label: string;
  shortLabel: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: 'gold' | 'indigo';
  requiredRoles?: UserRole[];
  requiredPermission?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Command Center',
    shortLabel: 'Command',
    to: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Asset Master',
    shortLabel: 'Assets',
    to: '/assets',
    icon: Cpu,
    badge: '12 Assets',
    badgeTone: 'indigo',
    requiredPermission: 'assets:read',
  },
  {
    label: 'Equipment Hierarchy',
    shortLabel: 'Hierarchies',
    to: '/hierarchies',
    icon: Network,
    badge: 'Dual DAG',
    badgeTone: 'indigo',
    requiredPermission: 'assets:read',
  },
  {
    label: 'Maintenance Calendar',
    shortLabel: 'Calendar',
    to: '/maintenance-calendar',
    icon: Calendar,
    badge: 'PM Due',
    badgeTone: 'gold',
    requiredPermission: 'work_orders:read',
  },
  {
    label: 'Work Management',
    shortLabel: 'Work Orders',
    to: '/work-orders',
    icon: ClipboardList,
    badge: 'Active',
    badgeTone: 'gold',
    requiredPermission: 'work_orders:read',
  },
  {
    label: 'Inspections & Faults',
    shortLabel: 'Inspections',
    to: '/inspections',
    icon: ClipboardCheck,
    requiredPermission: 'work_orders:read',
  },
  {
    label: 'Boiler Logbook',
    shortLabel: 'Logbook',
    to: '/daily-monitoring',
    icon: Flame,
    badge: 'Shift Logs',
    badgeTone: 'gold',
    requiredPermission: 'operations:daily_log',
  },
  {
    label: 'Decision & Reporting',
    shortLabel: 'Reports',
    to: '/reports',
    icon: BarChart3,
    badge: 'ANP & PM',
    badgeTone: 'gold',
    requiredPermission: 'work_orders:read',
  },
  {
    label: 'Audit & Evidence',
    shortLabel: 'Audit',
    to: '/audit-evidence',
    icon: ShieldCheck,
    badge: 'ASME Vault',
    badgeTone: 'gold',
    requiredPermission: 'work_orders:read',
  },
  {
    label: 'Cost Analytics',
    shortLabel: 'Costs',
    to: '/cost-analysis',
    icon: DollarSign,
    badge: '72% PM',
    badgeTone: 'indigo',
    requiredRoles: ['Organization Admin', 'Plant Reliability Engineer'],
    requiredPermission: 'finance:read',
  },
  {
    label: 'Decision Governance',
    shortLabel: 'Governance',
    to: '/governance',
    icon: Scale,
    badge: 'ANP v1',
    badgeTone: 'gold',
    requiredRoles: ['Organization Admin', 'Plant Reliability Engineer'],
    requiredPermission: 'governance:manage',
  },
  {
    label: 'White-Label & Org',
    shortLabel: 'Branding',
    to: '/settings',
    icon: Settings,
    requiredRoles: ['Organization Admin'],
    requiredPermission: 'org:admin',
  },
];

interface SidebarProps {
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const { organization, activeRole, switchRole, hasPermission } = useAuth();

  // Role-Aware Navigation Filtering
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.requiredRoles && !item.requiredRoles.includes(activeRole)) {
      return false;
    }
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      return false;
    }
    return true;
  });

  const renderNavLinks = (onItemClick?: () => void) => (
    <nav className="space-y-1.5" aria-label="Main Facility Navigation">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onItemClick}
            className={({ isActive }) =>
              `min-h-[48px] flex items-center justify-between px-3.5 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-150 ${
                isActive
                  ? 'lumina-nav-active'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-midnight-900/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? 'text-gold-400' : 'text-indigo-400/80'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 shrink-0 px-2 py-0.5 text-[11px] font-mono rounded-md ${
                      item.badgeTone === 'gold'
                        ? 'bg-gold-500/15 text-gold-300 border border-gold-500/40'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* =====================================================================
          1. DESKTOP & TABLET LANDSCAPE PINNED SIDEBAR (`lg:flex`)
         ===================================================================== */}
      <aside
        aria-label="Desktop & Tablet Landscape Sidebar"
        className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 bg-midnight-950/90 border-r border-slate-800/80 flex-col justify-between min-h-[calc(100vh-4.5rem)] p-4"
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between px-3 mb-2.5">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                Facility Operations
              </span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/30">
                {visibleNavItems.length} modules
              </span>
            </div>
            {renderNavLinks()}
          </div>

          {/* Role Switching / Testing Panel */}
          <div className="p-3.5 rounded-xl bg-midnight-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-gold-400" />
                Active RBAC Role
              </span>
              <span className="text-[10px] font-mono text-gold-400 uppercase tracking-widest">
                Protected
              </span>
            </div>
            <select
              value={activeRole}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="w-full text-xs font-medium bg-midnight-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
            >
              {SYSTEM_ROLES.map((role) => (
                <option key={role} value={role} className="bg-midnight-900 text-slate-100">
                  {role}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-2 font-mono leading-tight">
              {activeRole === 'Organization Admin'
                ? 'Unrestricted administrative access to all facility systems & settings.'
                : activeRole === 'Plant Reliability Engineer'
                ? 'Engineering analytics, ANP decision governance, and work orders.'
                : activeRole === 'Boiler Plant Operator'
                ? 'Daily shift log entry and operational monitoring focus.'
                : 'Work execution and scheduled task tracking focus.'}
            </p>
          </div>

          {/* Specialized Boiler Module Telemetry Status Card */}
          <div className="lumina-card p-4 border-indigo-500/25">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-300 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-gold-400" />
                Boiler Module v1.4
              </span>
              <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Active telemetry for{' '}
              <span className="text-slate-200 font-medium">
                {organization?.code}
              </span>
              .
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-indigo-400" />
                16.5 bar max
              </span>
              <span className="flex items-center gap-1 text-gold-300">
                <GitBranch className="h-3.5 w-3.5" />
                ANP Validated
              </span>
            </div>

            <Link
              to="/operator"
              className="mt-3 w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 active:bg-gold-500/40 text-gold-300 border border-gold-500/40 text-xs font-mono font-bold transition-all shadow-sm"
            >
              <Flame className="h-4 w-4 text-gold-400" />
              <span>Launch Tablet Kiosk</span>
            </Link>
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="px-3 py-2.5 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between font-mono">
          <span>TZ: {organization?.timezone || 'Asia/Colombo'}</span>
          <span>{organization?.baseCurrency || 'LKR'}</span>
        </div>
      </aside>

      {/* =====================================================================
          2. TABLET PORTRAIT (`md:`) & MOBILE SLIDE-OVER HAMBURGER DRAWER (`lg:hidden`)
         ===================================================================== */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-midnight-950/80 backdrop-blur-sm"
            onClick={onCloseMobileDrawer}
          />
          <aside
            aria-label="Tablet Portrait Navigation Drawer"
            className="relative z-10 w-80 max-w-[85vw] bg-midnight-900 border-r border-slate-800 shadow-2xl flex flex-col justify-between p-5 overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <BrandLogo />
                <button
                  type="button"
                  onClick={onCloseMobileDrawer}
                  aria-label="Close navigation menu"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-midnight-950 text-slate-300 hover:text-white border border-slate-800 flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <p className="px-3 mb-2.5 text-xs font-mono uppercase tracking-widest text-slate-400">
                  Role: {activeRole}
                </p>
                {renderNavLinks(onCloseMobileDrawer)}
              </div>

              <div className="p-3 rounded-xl bg-midnight-950 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Switch Role:</span>
                <select
                  value={activeRole}
                  onChange={(e) => {
                    switchRole(e.target.value as UserRole);
                    onCloseMobileDrawer?.();
                  }}
                  className="w-full text-xs font-medium bg-midnight-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  {SYSTEM_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>{organization?.name}</span>
              <span>{organization?.baseCurrency || 'LKR'}</span>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          3. TABLET PORTRAIT (`md:`) & MOBILE FIXED BOTTOM NAVIGATION BAR (`lg:hidden`)
         ===================================================================== */}
      <nav
        aria-label="Tablet Portrait Bottom Navigation Bar"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-midnight-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5"
      >
        <div className="flex items-center justify-around gap-1 max-w-2xl mx-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `min-h-[52px] min-w-[44px] flex-1 rounded-xl px-1.5 py-1.5 flex flex-col items-center justify-center gap-1 text-[11px] sm:text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-950/90 text-gold-300 border border-gold-500/40 shadow-glow-gold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 ${
                        isActive ? 'text-gold-400' : 'text-indigo-400/80'
                      }`}
                    />
                    <span className="truncate max-w-[80px] leading-none">
                      {item.shortLabel}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};
