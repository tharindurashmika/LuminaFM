# LuminaFM User Manual — Components Inventory

This document details all 35 verified UI components identified in LuminaFM.

## 1. Reusable Design System Components (`frontend/src/components/ui/`)

| Component Name | File | Purpose | Key Props / Variants | Interactive Target Size |
|---|---|---|---|---|
| `Button` | `Button.tsx` | Standard enterprise button with loading spinner & icon support | `variant`: `primary`, `secondary`, `danger`, `ghost`, `gold`; `size`: `sm`, `md`, `lg` | $\ge 44\text{px}$ touch target |
| `Card` | `Card.tsx` | Midnight navy container surface with indigo border | Includes `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | N/A |
| `Input` | `Input.tsx` | High-contrast form text/number input | `label`, `error`, `helperText`, `prefixIcon` | Min height $44\text{px}$ |
| `Select` | `Select.tsx` | Accessible dropdown input with validation states | `label`, `error`, `options` | Min height $44\text{px}$ |
| `Badge` | `Badge.tsx` | General status/category pill tag | `tone`: `indigo`, `gold`, `emerald`, `amber`, `rose`, `slate`; `size`: `sm`, `md` | Non-interactive pill |
| `StatusBadge` | `StatusBadge.tsx` | Domain status pills | `AssetStatusBadge`, `WorkOrderStatusBadge`, `CriticalityBadge`, `PriorityBadge` | Non-interactive pill |
| `BrandLogo` | `BrandLogo.tsx` | Dynamic SVG logo with LuminaFM gold crest fallback | `overrideLogoUri`, `size`: `sm`, `md`, `lg` | Direct link to home |
| `LoadingState` | `LoadingState.tsx` | Animated spinner with enterprise status message | `title`, `description` | Full-width container |
| `EmptyState` | `EmptyState.tsx` | Empty table/data illustration container | `icon`, `title`, `description`, `action` button | Full-width container |
| `ErrorState` | `ErrorState.tsx` | Error alert card with retry trigger | `title`, `description`, `onRetry` callback | Full-width container |
| `SuccessState` | `SuccessState.tsx` | Success banner with dismiss button | `title`, `description`, `onDismiss` | Alert banner |
| `ForbiddenState` | `ForbiddenState.tsx` | RBAC 403 access barrier banner | `requiredRole`, `requiredPermission`, `resourceName` | Hero barrier banner |
| `Modal` | `Modal.tsx` | Accessible modal dialog with backdrop & focus trapping | `isOpen`, `onClose`, `title`, `description`, `size`, `footer` | Backdrop + dialog card |
| `Tabs` | `Tabs.tsx` | Tab strip navigation with count badge support | `tabs: Array<{ id, label, count, icon }>`, `activeTab`, `onChange` | Min height $44\text{px}$ per tab |
| `DataClassificationBadge` | `DataClassificationBadge.tsx` | Enterprise compliance confidentiality pill | `classification`: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED` | Color-coded pill |

---

## 2. Layout & Shell Components (`frontend/src/components/layout/`)

| Component Name | File | Purpose | Sub-elements |
|---|---|---|---|
| `MainLayout` | `MainLayout.tsx` | Primary responsive app frame containing top header, collapsible sidebar, and main view pane | TopNavbar, Sidebar, Outlet, Mobile drawer state |
| `Sidebar` | `Sidebar.tsx` | Persistent desktop sidebar & mobile slide-over drawer with role-based navigation item filtering | Navigation links (12 modules), RBAC active role switcher panel, specialized Boiler telemetry widget |
| `TopNavbar` | `TopNavbar.tsx` | Global sticky header with tenant indicator, critical safety alert pill, tablet kiosk trigger, and logout | BrandLogo, Tenant Scope badge, Role dropdown, Tablet Kiosk trigger, RLS status badge, White-Label link, User profile, Logout button |

---

## 3. Domain-Specific Feature Components

| Component Name | File | Domain Module | Purpose & Features |
|---|---|---|---|
| `AssetDetailDrawer` | `components/assets/AssetDetailDrawer.tsx` | Assets | Slide-over inspection drawer for technical specifications, dynamic attributes, running hours, and active work orders. |
| `DynamicAttributeRenderer` | `components/assets/DynamicAttributeRenderer.tsx` | Dynamic Attributes | Renders schema-driven JSONB specifications and custom fields with units and validation. |
| `ActiveMaintenanceAlerts` | `components/dashboard/ActiveMaintenanceAlerts.tsx` | Dashboard | Surfaces active equipment alerts and out-of-tolerance operating parameters with quick actions. |
| `ChillerModuleCard` | `components/equipment/ChillerModuleCard.tsx` | Equipment Extensibility | Live demonstration card for non-boiler equipment (Water-Cooled Chiller) featuring thermodynamic COP gauges, approach temperatures, and decision model isolation verification. |
| `GloveNumpad` | `components/floor/GloveNumpad.tsx` | Floor Operator | Large $64\times 64\text{px}$ touch keypad with decimal support and visual feedback for users wearing work gloves. |
| `GloveRockerSwitch` | `components/floor/GloveRockerSwitch.tsx` | Floor Operator | Oversized bipolar (Normal / Abnormal) rocker switch control for factory-floor walkthrough checks. |
| `QrScannerModal` | `components/floor/QrScannerModal.tsx` | Floor Operator | Industrial QR barcode scanner dialog with video stream, camera switcher, and manual code override. |
| `SyncStatusIndicator` | `components/floor/SyncStatusIndicator.tsx` | Offline PWA | Pill indicator showing network state (`ONLINE`, `OFFLINE`, `SYNCING`, `ERROR`) and pending queue count. |
| `SyncQueueDrawer` | `components/floor/SyncQueueDrawer.tsx` | Offline PWA | Inspection drawer showing local IndexedDB queue items, sync timestamps, retry triggers, and conflict diffs. |
| `LogoutSyncGuardModal` | `components/floor/LogoutSyncGuardModal.tsx` | Offline PWA | Safety modal that prevents accidental logout when unsynchronized inspection logs remain in local storage. |
| `OperationalAnpDrawer` | `components/decision-support/OperationalAnpDrawer.tsx` | ANP Decision Engine | Slide-over drawer displaying ANP supermatrix calculation results, priority vectors, criteria influences, and sensitivity analysis. |
| `AlertAcknowledgementModal` | `components/decision-support/AlertAcknowledgementModal.tsx` | Decision Support | Dialog for operational engineers to formally acknowledge alerts with shift notes and priority escalations. |
| `NotificationChannelConfigModal` | `components/decision-support/NotificationChannelConfigModal.tsx` | Decision Support | Dialog to configure alert dispatch channels (Email, SMS Webhook, Slack, PagerDuty). |
| `RecommendationReviewModal` | `components/decision-support/RecommendationReviewModal.tsx` | Decision Support | Approval/rejection dialog for ANP-derived maintenance recommendations with override audit reason. |
| `EvidenceUploadModal` | `components/audit/EvidenceUploadModal.tsx` | Audit & Evidence | Secure file uploader calculating client-side SHA-256 hashes, setting data classification, and linking to assets. |
| `EvidencePackageModal` | `components/audit/EvidencePackageModal.tsx` | Audit & Evidence | Dialog to compile multi-source evidence (inspections, logs, photos) into an exportable regulatory compliance dossier. |
| `ComplianceVerificationModal` | `components/audit/ComplianceVerificationModal.tsx` | Audit & Evidence | Formal verification dialog to sign off asset compliance against ASME Section I, NB-23, or ISO 55001. |
