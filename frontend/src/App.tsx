import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsRegistryPage } from './pages/AssetsRegistryPage';
import { EquipmentHierarchyPage } from './pages/EquipmentHierarchyPage';
import { MaintenanceCalendarPage } from './pages/MaintenanceCalendarPage';
import { InspectionsAndFaultsPage } from './pages/InspectionsAndFaultsPage';
import { MaintenanceCostAnalysisPage } from './pages/MaintenanceCostAnalysisPage';
import { FloorOperatorPage } from './pages/FloorOperatorPage';
import { DailyBoilerMonitoringPage } from './pages/DailyBoilerMonitoringPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage';
import { DecisionGovernancePage } from './pages/DecisionGovernancePage';
import { DecisionReportingPage } from './pages/DecisionReportingPage';
import { AuditAndEvidencePage } from './pages/AuditAndEvidencePage';
import { ForbiddenState } from './components/ui/ForbiddenState';
import { UserRole } from './types/cmms.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermission?: string;
  resourceName?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredPermission,
  resourceName,
}) => {
  const { isAuthenticated, activeRole, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(activeRole)) {
    return (
      <ForbiddenState
        requiredRole={requiredRoles}
        resourceName={resourceName || 'this facility module'}
      />
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <ForbiddenState
        requiredPermission={requiredPermission}
        resourceName={resourceName || 'this facility module'}
      />
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/operator"
            element={
              <ProtectedRoute>
                <FloorOperatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="assets" element={<AssetsRegistryPage />} />
            <Route path="hierarchies" element={<EquipmentHierarchyPage />} />
            <Route path="maintenance-calendar" element={<MaintenanceCalendarPage />} />
            <Route path="inspections" element={<InspectionsAndFaultsPage />} />
            <Route path="daily-monitoring" element={<DailyBoilerMonitoringPage />} />
            <Route path="operator" element={<FloorOperatorPage />} />
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="reports" element={<DecisionReportingPage />} />
            <Route path="audit-evidence" element={<AuditAndEvidencePage />} />
            <Route
              path="cost-analysis"
              element={
                <ProtectedRoute
                  requiredRoles={['Organization Admin', 'Plant Reliability Engineer']}
                  requiredPermission="finance:read"
                  resourceName="Maintenance Financial Cost Analysis & Proactive Ratio"
                >
                  <MaintenanceCostAnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="governance"
              element={
                <ProtectedRoute
                  requiredRoles={['Organization Admin', 'Plant Reliability Engineer']}
                  requiredPermission="governance:manage"
                  resourceName="ANP Decision Model Governance & Multi-Criteria Validation"
                >
                  <DecisionGovernancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute
                  requiredRoles={['Organization Admin']}
                  requiredPermission="org:admin"
                  resourceName="White-Label Branding & Tenant Organization Configuration"
                >
                  <OrganizationSettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
