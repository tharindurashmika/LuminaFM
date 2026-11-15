# LuminaFM User Manual Changelog

All notable changes to the **LuminaFM Complete Visual User Guide and Technical User Manual** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this documentation project adheres to [Semantic Documentation Versioning](DOCUMENTATION_MAINTENANCE.md#7-versioning--changelog-protocol).

---

## [Unreleased]

### Added
- Template section for future releases.

### Changed
- None.

---

## [1.4.0] - 2026-11-15

### Added
- **Master Release Publication Deliverables**:
  - `LuminaFM_User_Manual.pdf` (245 Pages, 18.5 MB) — Comprehensive master technical user manual embedding 114 figure instances.
  - `LuminaFM_User_Manual.html` (981 KB) — Interactive standalone documentation portal featuring live search, hierarchical navigation, and screenshot lightbox viewing.
  - `LuminaFM_Quick_Start_Guide.pdf` (40 Pages, 4.5 MB) — Dedicated field guide for Boiler Plant Operators and Maintenance Technicians.
  - `LuminaFM_Administrator_Guide.pdf` (63 Pages, 11.3 MB) — Executive handbook for Organization Administrators and Plant Reliability Engineers.
- **Phase 8: Responsive & Device-Specific User Guides**:
  - `08-device-guides/01-desktop-guide.md` (Desktop Workstation $1440 \times 900$).
  - `08-device-guides/02-tablet-landscape-guide.md` (Tablet Landscape $1180 \times 820$).
  - `08-device-guides/03-tablet-portrait-guide.md` (Tablet Portrait $820 \times 1180$).
  - `08-device-guides/04-mobile-phone-guide.md` (Mobile Phone $390 \times 844$).
  - `08-device-guides/05-industrial-kiosk-ergonomics.md` (Factory-floor glove touch targets, thermal dark theme, and offline PWA sync).
  - `08-device-guides/06-responsive-compatibility-report.md` (Cross-device 14-page compatibility audit matrix).
- **Phase 10: Independent Quality Audit & Coverage Certification**:
  - `release/LuminaFM_Documentation_Coverage_Report.md` (100% verified coverage report across 15 routes, 14 pages, 35 components, 21 modals, 12 forms, 72 fields, 18 workflows, 4 verified roles, and 4 device viewports).
- **Phase 11: Continuous Documentation Maintenance Framework**:
  - `DOCUMENTATION_MAINTENANCE.md` (Standard operating procedure for future documentation synchronization).
  - `templates/page-documentation-template.md` (Standardized page documentation template).
  - `templates/modal-documentation-template.md` (Standardized modal & overlay documentation template).
  - `templates/workflow-documentation-template.md` (Standardized workflow documentation template).
  - `builder/audit_verification.py` (Automated build regression testing tool).

### Changed
- Updated root `README.md` with official release download links and updated deliverables summary.
- Enhanced ReportLab XML escaping in `build_pdf_manual.py` to prevent nested tag syntax errors on mathematical and currency notations.

---

## [1.3.0] - 2026-11-14

### Added
- **Phase 6: Role-Based User Manuals & Authorization Audit**:
  - `04-role-based-guides/README.md` (Role architecture, verified permissions, and unimplemented Manager role gap analysis).
  - `04-role-based-guides/01-organization-admin-guide.md` (Tenant onboarding, white-label branding, financial review).
  - `04-role-based-guides/02-plant-reliability-engineer-guide.md` (ANP decision governance, PM scheduling, statutory signoffs).
  - `04-role-based-guides/03-boiler-plant-operator-guide.md` (Shift logbook, floor kiosk, glove numpad, offline sync).
  - `04-role-based-guides/04-maintenance-technician-guide.md` (Kanban execution, task/labor/parts logging, repair photos).
  - `07-reference/permissions-matrix.md` (Verified 5-role permission access matrix).
- **Phase 7: Troubleshooting Diagnostics & Reference Catalogs**:
  - `06-troubleshooting/README.md` (Diagnostic decision tree & HTTP status taxonomy).
  - `06-troubleshooting/01-authentication-and-session.md` (Login problems, 401/403 states, session timeouts).
  - `06-troubleshooting/02-form-validation-and-inputs.md` (Missing fields, sight glass confirmation, Prisma P2002 errors).
  - `06-troubleshooting/03-offline-sync-and-network.md` (IndexedDB queueing, HTTP 409 conflict resolution).
  - `06-troubleshooting/04-work-orders-and-state-machine.md` (State machine transition violations, closeout gates).
  - `06-troubleshooting/05-decision-support-and-governance.md` (Unvalidated model locks, $CR \ge 0.10$ warnings).
  - `06-troubleshooting/06-evidence-vault-and-attachments.md` (25MB ceiling, SHA-256 calculation, MIME types).
  - `07-reference/faq.md` (15+ frequently asked questions & operational answers).
  - `07-reference/status-and-priority-definitions.md` (Definitive status and priority code definitions).
  - `07-reference/notifications-reference.md` (Webhook payload schema, Slack/PagerDuty protocols).
  - `07-reference/quick-navigation-reference.md` (Application URL directory and keyboard shortcuts).
  - `07-reference/field-reference.md` (Directory of 72 input parameters and validation rules).
  - `07-reference/glossary.md` (Technical definitions of CMMS, thermodynamic, and ANP terms).
  - `07-reference/ui-component-catalog.md` (Catalog of 35 UI design system components).

---

## [1.2.0] - 2026-11-10

### Added
- **Phase 4: Complete Modals, Drawers & Form Reference**:
  - `03-module-guides/modal-reference/README.md` (Modal architecture & 7 operational lifecycle states).
  - `01-work-orders-modals.md` (`CreateWorkOrderModal`, `WorkOrderDetailModal`).
  - `02-inspections-and-assets-drawers.md` (`AssetDetailDrawer`, `InspectionDetailModal`, `FaultResolutionModal`).
  - `03-floor-kiosk-modals.md` (`GloveNumpad`, `QrScannerModal`, `SyncQueueDrawer`, `LogoutSyncGuardModal`).
  - `04-decision-reporting-modals.md` (`OperationalAnpDrawer`, `AlertAcknowledgementModal`, `NotificationConfigModal`, `RecommendationReviewModal`, `PrintableReportWindow`).
  - `05-audit-and-evidence-modals.md` (`EvidenceUploadModal`, `ComplianceVerificationModal`, `EvidencePackageModal`).
  - `06-governance-modals.md` (`CriterionGovernanceModal`, `ProposeModelVersionModal`, `ExpertEvaluationModal`, `AttachEmpiricalEvidenceModal`).
  - `07-navigation-popovers.md` (`TopNavbarRolePopover`).
- **Phase 5: End-to-End Operational Workflows**:
  - `05-workflows/00-full-lifecycle-maintenance.md` (Master asset-to-audit maintenance workflow).
  - `05-workflows/01-user-auth-and-rbac.md` through `17-chiller-extensibility-and-isolation.md` (17 individual operational workflow guides).

---

## [1.1.0] - 2026-11-05

### Added
- **Phase 2: Visual Screenshot Capture & Master Index**:
  - 49 clean, high-resolution original screenshots in `screenshots/original/`.
  - 49 annotated screenshots with gold circular callout markers in `screenshots/annotated/`.
  - Master screenshot index in `inventory/screenshot-index.md`.
- **Phase 3: Module & Feature Guides**:
  - Authored all 12 major module guides in `docs/user-manual/03-module-guides/` (`01-command-center.md` through `12-white-label-and-settings.md`).
  - Authored Account and Navigation guides in `docs/user-manual/02-account-and-navigation/` (`login.md`, `navigation.md`).

---

## [1.0.0] - 2026-11-01

### Added
- **Phase 1: Application Discovery & Master Inventories Baseline**:
  - `inventory/routes-inventory.md` (15 application routes).
  - `inventory/pages-inventory.md` (14 pages).
  - `inventory/components-inventory.md` (35 UI components).
  - `inventory/modals-inventory.md` (21 interactive overlays).
  - `inventory/workflows-inventory.md` (17 operational workflows).
  - Initial repository structure and `README.md`.
