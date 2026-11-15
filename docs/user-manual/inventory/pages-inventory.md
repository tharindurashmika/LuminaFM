# LuminaFM User Manual — Pages Inventory

This document details all 14 implemented application pages within the LuminaFM React frontend.

## 1. Login Page (`LoginPage.tsx`)
- **File**: `frontend/src/pages/LoginPage.tsx`
- **Route**: `/login`
- **Purpose**: Authenticates facility personnel, supports tenant code routing, and provides 1-click role simulation for testing.
- **Key Sections**:
  - Branding header with dynamic LuminaFM / client logo crest.
  - Credential authentication form (Email, Password, Organization Code).
  - Quick-switch demo accounts (Organization Admin, Plant Reliability Engineer, Boiler Plant Operator, Maintenance Technician).
  - Quick white-label demo launcher ("Ceylon Luxury Resorts PLC").
- **States Handled**: Idle, Submitting (Loading), Authentication Error, Success redirect.

## 2. Command Center Dashboard (`DashboardPage.tsx`)
- **File**: `frontend/src/pages/DashboardPage.tsx`
- **Route**: `/`
- **Purpose**: High-level cross-discipline command center providing executive KPIs, equipment telemetry, active safety alerts, and upcoming work.
- **Key Sections**:
  - Top header banner with tenant code, active role badge, and quick action links.
  - Critical Safety Alert Banner (hardcoded safety escalation rule decoupled from ANP).
  - Overview KPI metrics grid (Total Assets, Active PM Due, Open Work Orders, Proactive Maintenance Ratio).
  - Active Maintenance Alerts & Threshold Excursions.
  - Water-Cooled Chiller Extensibility Demonstration Card (`ChillerModuleCard`).
  - Recent Work Orders table.
  - Upcoming Preventive Schedules summary.
  - Recent Critical Faults log.
- **Drawers / Modals**:
  - Operational ANP Evaluation Drawer (`OperationalAnpDrawer`).

## 3. Asset Master Registry (`AssetsRegistryPage.tsx`)
- **File**: `frontend/src/pages/AssetsRegistryPage.tsx`
- **Route**: `/assets`
- **Purpose**: Centralized asset catalog with multi-dimensional filtering, dynamic JSONB attribute rendering, and export.
- **Key Sections**:
  - Filter bar: Multi-site selector, Category filter, Status filter, Search input query.
  - Responsive Asset Card grid and summary list.
  - Pagination controls (items per page, previous/next page navigation).
  - Data export actions (Export CSV, Export JSON).
- **Drawers / Modals**:
  - Asset Detail Side-Drawer (`AssetDetailDrawer`) showing full engineering nameplate, custom attributes, meters, and maintenance history.

## 4. Equipment Hierarchy Page (`EquipmentHierarchyPage.tsx`)
- **File**: `frontend/src/pages/EquipmentHierarchyPage.tsx`
- **Route**: `/hierarchies`
- **Purpose**: Interactive dual Directed Acyclic Graph (DAG) visualizing facility physical locations and system process relationships.
- **Key Sections**:
  - View switcher tab: Physical Location DAG vs. System Process Hierarchy.
  - Tree node navigator with collapsible nodes, asset count badges, and health statuses.
  - Selected Node Detail Inspector pane (Asset details, parent breadcrumb, criticality level, child count, JSON export).

## 5. Maintenance Calendar Page (`MaintenanceCalendarPage.tsx`)
- **File**: `frontend/src/pages/MaintenanceCalendarPage.tsx`
- **Route**: `/maintenance-calendar`
- **Purpose**: Visual scheduling tool for recurring preventive maintenance routines and compliance inspections.
- **Key Sections**:
  - View switcher: Month Grid Calendar View vs. Tabular Schedules List View.
  - Month navigation bar (Previous, Next, Current Month button).
  - Calendar day cells with color-coded PM event pills.
  - Overdue PM counter and compliance rate KPI cards.
  - "Generate Work Order" on-demand action button per schedule.

## 6. Inspections & Faults Page (`InspectionsAndFaultsPage.tsx`)
- **File**: `frontend/src/pages/InspectionsAndFaultsPage.tsx`
- **Route**: `/inspections`
- **Purpose**: Repository of completed walkthrough inspections and active equipment fault records.
- **Key Sections**:
  - Tab switcher: Walkthrough Inspection Records vs. Fault History.
  - Inspection table with overall result badges (`PASS`, `FAIL`, `WARNING`), inspector metadata, and date.
  - Fault table with severity badges (`CRITICAL`, `MAJOR`, `MINOR`), failure mode descriptions, and status.
  - "Create Work Order from Fault" action trigger.
- **Drawers / Modals**:
  - Inspection Detail Modal (`inspectedRecord`) showing checkpoint responses and notes.

## 7. Daily Boiler Monitoring Logbook (`DailyBoilerMonitoringPage.tsx`)
- **File**: `frontend/src/pages/DailyBoilerMonitoringPage.tsx`
- **Route**: `/daily-monitoring`
- **Purpose**: Dedicated desktop logbook for 2-hourly boiler watchkeeping, walkthrough checklists, and live threshold checks.
- **Key Sections**:
  - Tab switcher: Active Shift Entry vs. Historical Shift Log Archive.
  - Boiler selection and shift configuration header (Shift A, Shift B, Shift C).
  - Real-time numerical telemetry input fields with instantaneous min/max range validation indicators.
  - Visual walkthrough checkpoints with Yes/No/Observation toggles.
  - Photograph evidence uploader with caption support.
  - Auto-draft Work Order toggle on parameter exceedance.
  - Historical shift logs table with JSON drilldown viewer.
- **Drawers / Modals**:
  - Operational ANP Evaluation Drawer (`OperationalAnpDrawer`).

## 8. Factory-Floor Operator Tablet Kiosk (`FloorOperatorPage.tsx`)
- **File**: `frontend/src/pages/FloorOperatorPage.tsx`
- **Route**: `/operator`
- **Purpose**: Touch-first, high-contrast kiosk application designed specifically for industrial tablets (iPad & Android) and operators wearing work gloves.
- **Key Sections**:
  - Kiosk top bar with offline synchronization status indicator, battery/time, and fullscreen toggle.
  - Industrial QR Scanner button.
  - Step-by-step touch workflow:
    1. Shift & Operator Confirmation.
    2. Asset Selection.
    3. Large-target telemetry fields with preset quick-tap buttons and custom glove numpad.
    4. Oversized glove rocker switches for physical walkthrough checks.
    5. Observation notes and camera photo attachments.
    6. Local draft save and direct submission.
- **Drawers / Modals**:
  - Industrial QR Scanner Modal (`QrScannerModal`).
  - Glove Numpad Overlay (`GloveNumpad`).
  - Offline Sync Queue Drawer (`SyncQueueDrawer`).
  - Logout Data Guard Modal (`LogoutSyncGuardModal`).
  - Operational ANP Decision Drawer (`OperationalAnpDrawer`).

## 9. Work Orders Management (`WorkOrdersPage.tsx`)
- **File**: `frontend/src/pages/WorkOrdersPage.tsx`
- **Route**: `/work-orders`
- **Purpose**: Comprehensive work management hub supporting full lifecycle state machine tracking, task checklists, labor hours, and spare parts.
- **Key Sections**:
  - View switcher: Tabular List View vs. Drag-and-Drop Kanban Board View.
  - Multi-status filter tabs, priority filter, and search input.
  - New Work Order button.
  - Kanban columns: Draft, Open, Approved, Assigned, In Progress, Completed, Closed.
- **Drawers / Modals**:
  - Create Work Order Modal (`CreateWorkOrderModal`).
  - Work Order Detail Modal (`WorkOrderDetailModal`).
  - Status Transition Reason Modal (`WorkOrderStatusTransitionModal`).

## 10. Decision Support & Reporting (`DecisionReportingPage.tsx`)
- **File**: `frontend/src/pages/DecisionReportingPage.tsx`
- **Route**: `/reports`
- **Purpose**: Decision-support analytics hub displaying ANP maintenance priorities, operational abnormalities, trend charts, and exportable reports.
- **Key Sections**:
  - 5 Navigation Tabs:
    1. ANP Maintenance Priorities & Decision Runs.
    2. Operational Abnormalities & Threshold Excursions.
    3. Preventive Maintenance Due & Overdue Tracking.
    4. Telemetry Historical Trends & Time-Series.
    5. Multi-Channel Alert Routing & Report Exports.
  - Data Classification Badges (`CONFIDENTIAL`, `RESTRICTED`, `INTERNAL`).
  - Printable PDF Report generation window.
- **Drawers / Modals**:
  - Operational Alert Acknowledgement Modal (`AlertAcknowledgementModal`).
  - Notification Channel Config Modal (`NotificationChannelConfigModal`).
  - Recommendation Review & Approval Modal (`RecommendationReviewModal`).

## 11. Enterprise Audit & Evidence Vault (`AuditAndEvidencePage.tsx`)
- **File**: `frontend/src/pages/AuditAndEvidencePage.tsx`
- **Route**: `/audit-evidence`
- **Purpose**: Regulatory evidence repository, immutable audit log viewer, and compliance package exporter.
- **Key Sections**:
  - 4 Navigation Tabs:
    1. Immutable Audit Trail (with before/after JSON diff expander).
    2. Evidence Vault (with SHA-256 checksum verification).
    3. Regulatory Compliance Records (ASME, NB-23, ISO 55001, OSHA 1910).
    4. Exportable Evidence Packages (with mandatory regulatory disclaimer banner).
- **Drawers / Modals**:
  - Evidence Upload Modal (`EvidenceUploadModal`).
  - Evidence Package Builder Modal (`EvidencePackageModal`).
  - Compliance Verification Modal (`ComplianceVerificationModal`).

## 12. Maintenance Cost Analysis (`MaintenanceCostAnalysisPage.tsx`)
- **File**: `frontend/src/pages/MaintenanceCostAnalysisPage.tsx`
- **Route**: `/cost-analysis`
- **Purpose**: Financial analytics dashboard for maintenance expenditure, PM vs. corrective ratios, and category cost distributions.
- **Key Sections**:
  - Executive Financial KPI Cards (Total Spend, PM Ratio, Labor vs. Parts vs. Contractor).
  - Proactive Maintenance Ratio meter (72.4% benchmark against World-Class 80% target).
  - Spend by Asset Category breakdown chart and table.
  - CSV and JSON financial ledger export actions.
- **Access Constraint**: Restricted to `Organization Admin` and `Plant Reliability Engineer` (`finance:read`).

## 13. ANP Decision Governance (`DecisionGovernancePage.tsx`)
- **File**: `frontend/src/pages/DecisionGovernancePage.tsx`
- **Route**: `/governance`
- **Purpose**: Scientific governance and validation platform for Analytic Network Process decision models.
- **Key Sections**:
  - 3 Navigation Tabs:
    1. Academic Baseline (Kingsbury Dissertation baseline model, 14 criteria, 4 clusters, literature citations, 5 anonymized expert profiles, consistency ratios).
    2. Version Comparison (Model A vs. Model B pairwise comparison, criteria delta, ranking shift).
    3. Commercial Proposals (Draft client models, expert evaluation submission, empirical evidence attachment, approval workflow).
- **Drawers / Modals**:
  - Criterion Governance Detail Modal (`activeCriterionModal`).
  - Propose Model Version Modal (`isProposeModalOpen`).
  - Expert Evaluation Modal (`isEvaluationModalOpen`).
  - Attach Empirical Evidence Modal (`isEvidenceModalOpen`).
- **Access Constraint**: Restricted to `Organization Admin` and `Plant Reliability Engineer` (`governance:manage`).

## 14. White-Label & Organization Settings (`OrganizationSettingsPage.tsx`)
- **File**: `frontend/src/pages/OrganizationSettingsPage.tsx`
- **Route**: `/settings`
- **Purpose**: White-label branding customization, localization preferences, and deployment architecture visibility.
- **Key Sections**:
  - 3 Navigation Tabs:
    1. White-Label Branding: Custom SVG/PNG client logo upload with instant live top navbar preview, preset logos, reset button, and platform badge toggle.
    2. Localization & Regional Settings: Timezone and Base Currency configurator.
    3. Deployment Architecture: Dedicated vs. Shared SaaS mode indicator, PostgreSQL connection pool metrics, isolated tenant UUID display.
- **Access Constraint**: Restricted to `Organization Admin` (`org:admin`).
