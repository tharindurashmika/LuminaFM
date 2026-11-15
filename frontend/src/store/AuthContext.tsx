import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { OrganizationInfo, UserInfo, LoginResponseData, UserRole } from '../types/cmms.types';
import { getStoredToken, setStoredToken } from '../services/api.client';

const SESSION_STORAGE_KEY = 'lumina_fm_session_meta';

export const SYSTEM_ROLES: UserRole[] = [
  'Organization Admin',
  'Plant Reliability Engineer',
  'Boiler Plant Operator',
  'Maintenance Technician',
];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'Organization Admin': [
    '*',
    'org:admin',
    'assets:manage',
    'assets:read',
    'operations:daily_log',
    'operations:read',
    'work_orders:manage',
    'work_orders:read',
    'governance:manage',
    'settings:manage',
    'finance:read',
  ],
  'Plant Reliability Engineer': [
    'assets:manage',
    'assets:read',
    'operations:daily_log',
    'operations:read',
    'work_orders:manage',
    'work_orders:read',
    'governance:manage',
    'finance:read',
  ],
  'Boiler Plant Operator': [
    'operations:daily_log',
    'operations:read',
    'assets:read',
    'work_orders:read',
  ],
  'Maintenance Technician': [
    'work_orders:manage',
    'work_orders:read',
    'operations:daily_log',
    'operations:read',
    'assets:read',
  ],
};

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  organizationId: string | null;
  user: UserInfo | null;
  organization: OrganizationInfo | null;
  activeRole: UserRole;
}

export interface AuthContextValue extends AuthState {
  setAuthSession: (payload: LoginResponseData) => void;
  updateOrganization: (updated: Partial<OrganizationInfo>) => void;
  switchRole: (role: UserRole) => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
}

const DEFAULT_DEMO_STATE: AuthState = {
  isAuthenticated: true,
  token: 'demo-jwt-session-token',
  userId: '8f8b824a-7140-422f-8706-e78923a1a6f2',
  organizationId: '11111111-1111-1111-1111-111111111111',
  user: {
    id: '8f8b824a-7140-422f-8706-e78923a1a6f2',
    email: 'chief.engineer@colombohotel.lk',
    fullName: 'Arjun Wickramasinghe',
    jobTitle: 'Director of Engineering & Boiler Operations',
    roles: ['Organization Admin', 'Plant Reliability Engineer'],
    permissions: ROLE_PERMISSIONS['Organization Admin'],
  },
  organization: {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'COLOMBO-GRAND',
    name: 'Colombo Grand Hospitality Group',
    legalName: 'Colombo Grand Hospitality PLC',
    logoUri: null, // Starts null to showcase 'LuminaFM' fallback, customizable in Settings
    timezone: 'Asia/Colombo',
    baseCurrency: 'LKR',
    isActive: true,
    themeConfig: {
      primaryColor: '#4F46E5',
      brandColor: '#D4AF37',
      showPlatformBadge: true,
    },
  },
  activeRole: 'Organization Admin',
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const savedMeta = localStorage.getItem(SESSION_STORAGE_KEY);
      const savedToken = getStoredToken();
      if (savedMeta && savedToken) {
        const parsed = JSON.parse(savedMeta) as Omit<AuthState, 'isAuthenticated' | 'token'>;
        const initialActiveRole = (parsed.activeRole as UserRole) || 'Organization Admin';
        return {
          isAuthenticated: true,
          token: savedToken,
          ...parsed,
          activeRole: initialActiveRole,
        };
      }
    } catch {
      // Fallback to default state if storage is unavailable
    }
    return DEFAULT_DEMO_STATE;
  });

  useEffect(() => {
    try {
      if (state.isAuthenticated && state.token) {
        setStoredToken(state.token);
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            userId: state.userId,
            organizationId: state.organizationId,
            user: state.user,
            organization: state.organization,
            activeRole: state.activeRole,
          })
        );
      }
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  const setAuthSession = useCallback((payload: LoginResponseData) => {
    setStoredToken(payload.access_token);
    const assignedRoles = (payload.user?.roles as UserRole[]) || ['Organization Admin'];
    const activeRole: UserRole = assignedRoles[0] || 'Organization Admin';

    setState({
      isAuthenticated: true,
      token: payload.access_token,
      userId: payload.user_id,
      organizationId: payload.organization_id,
      user: {
        ...payload.user,
        roles: assignedRoles,
        permissions: payload.user?.permissions || ROLE_PERMISSIONS[activeRole],
      },
      organization: {
        ...payload.organization,
        logoUri: payload.logo_uri ?? payload.organization.logoUri ?? null,
      },
      activeRole,
    });
  }, []);

  const updateOrganization = useCallback((updated: Partial<OrganizationInfo>) => {
    setState((prev) => {
      if (!prev.organization) return prev;
      return {
        ...prev,
        organization: {
          ...prev.organization,
          ...updated,
        },
      };
    });
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const updatedPermissions = ROLE_PERMISSIONS[role] || [];
      return {
        ...prev,
        activeRole: role,
        user: {
          ...prev.user,
          roles: [role],
          permissions: updatedPermissions,
        },
      };
    });
  }, []);

  const hasRole = useCallback(
    (requiredRole: UserRole | UserRole[]): boolean => {
      if (!state.isAuthenticated || !state.user) return false;
      const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      return rolesToCheck.includes(state.activeRole);
    },
    [state.isAuthenticated, state.user, state.activeRole]
  );

  const hasPermission = useCallback(
    (permissionKey: string): boolean => {
      if (!state.isAuthenticated || !state.user) return false;
      if (state.activeRole === 'Organization Admin') return true;
      const userPermissions = state.user.permissions || ROLE_PERMISSIONS[state.activeRole] || [];
      return userPermissions.includes(permissionKey) || userPermissions.includes('*');
    },
    [state.isAuthenticated, state.user, state.activeRole]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setState({
      isAuthenticated: false,
      token: null,
      userId: null,
      organizationId: null,
      user: null,
      organization: null,
      activeRole: 'Organization Admin',
    });
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      ...state,
      setAuthSession,
      updateOrganization,
      switchRole,
      hasRole,
      hasPermission,
      logout,
    }),
    [state, setAuthSession, updateOrganization, switchRole, hasRole, hasPermission, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

