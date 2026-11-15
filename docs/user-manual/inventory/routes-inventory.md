# LuminaFM User Manual — Routes Inventory

This document provides a comprehensive inventory of all client-side application routes implemented in LuminaFM (`frontend/src/App.tsx`).

## Route Summary Table

| Route Path | Page Component | Layout Wrapper | Access Level | Required Role(s) | Required Permission | Navigation Source |
|---|---|---|---|---|---|---|
| `/login` | `LoginPage` | None (Standalone) | Public | None | None | Direct URL / Logout redirect |
| `/operator` | `FloorOperatorPage` | Standalone Kiosk | Protected | Any authenticated role | None | TopNavbar "Tablet Kiosk" button |
| `/` | `DashboardPage` | `MainLayout` | Protected | Any authenticated role | None | Sidebar "Command Center" |
| `/assets` | `AssetsRegistryPage` | `MainLayout` | Protected | Any authenticated role | `assets:read` | Sidebar "Asset Master" |
| `/hierarchies` | `EquipmentHierarchyPage` | `MainLayout` | Protected | Any authenticated role | `assets:read` | Sidebar "Equipment Hierarchy" |
| `/maintenance-calendar` | `MaintenanceCalendarPage` | `MainLayout` | Protected | Any authenticated role | `work_orders:read` | Sidebar "Maintenance Calendar" |
| `/work-orders` | `WorkOrdersPage` | `MainLayout` | Protected | Any authenticated role | `work_orders:read` | Sidebar "Work Management" |
| `/inspections` | `InspectionsAndFaultsPage` | `MainLayout` | Protected | Any authenticated role | `work_orders:read` | Sidebar "Inspections & Faults" |
| `/daily-monitoring` | `DailyBoilerMonitoringPage` | `MainLayout` | Protected | Any authenticated role | `operations:daily_log` | Sidebar "Boiler Logbook" |
| `/reports` | `DecisionReportingPage` | `MainLayout` | Protected | Any authenticated role | `work_orders:read` | Sidebar "Decision & Reporting" |
| `/audit-evidence` | `AuditAndEvidencePage` | `MainLayout` | Protected | Any authenticated role | `work_orders:read` | Sidebar "Audit & Evidence" |
| `/cost-analysis` | `MaintenanceCostAnalysisPage` | `MainLayout` | Protected (Restricted) | `Organization Admin`, `Plant Reliability Engineer` | `finance:read` | Sidebar "Cost Analytics" |
| `/governance` | `DecisionGovernancePage` | `MainLayout` | Protected (Restricted) | `Organization Admin`, `Plant Reliability Engineer` | `governance:manage` | Sidebar "Decision Governance" |
| `/settings` | `OrganizationSettingsPage` | `MainLayout` | Protected (Restricted) | `Organization Admin` | `org:admin` | Sidebar "White-Label & Org" / TopNavbar |
| `*` | Redirect to `/` | N/A | Public | None | None | Fallback catch-all |

---

## Route Guard Architecture (`ProtectedRoute`)

Route protection is implemented in `App.tsx` via the `<ProtectedRoute>` wrapper component:
- **Authentication Check**: Verifies `isAuthenticated` in `AuthContext`. If `false`, redirects immediately to `/login`.
- **Role Verification**: Evaluates `requiredRoles`. If the user's active role is not included, displays `<ForbiddenState>` with role badge requirements.
- **Permission Verification**: Evaluates `requiredPermission`. If the active role lacks the requisite key (e.g., `finance:read`, `governance:manage`, `org:admin`), renders `<ForbiddenState>` with the specific permission name and resource descriptor.
