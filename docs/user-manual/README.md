# LuminaFM Complete Visual User Guide & User Manual

Welcome to the **LuminaFM Complete Visual User Guide & User Manual** repository.

This user manual documents the fully implemented, production-ready LuminaFM Computerized Maintenance Management System (CMMS) and Decision-Support Platform.

---

## Master Publication Releases (Phase 9 Complete)

The official compiled publications generated from the Phase 1–8 verified documentation baseline:

- **Master PDF User Manual (245 Pages, 114 Embedded Figures)**:  
  [LuminaFM_User_Manual.pdf](file:///e:/My%20Owns/docs/user-manual/release/LuminaFM_User_Manual.pdf) (18.5 MB)
- **Interactive Standalone HTML Documentation Portal (Searchable, Lightbox, Responsive)**:  
  [LuminaFM_User_Manual.html](file:///e:/My%20Owns/docs/user-manual/release/LuminaFM_User_Manual.html) (981 KB)
- **Plant Floor Operator & Technician Field Quick Start Guide (40 Pages)**:  
  [LuminaFM_Quick_Start_Guide.pdf](file:///e:/My%20Owns/docs/user-manual/release/LuminaFM_Quick_Start_Guide.pdf) (4.5 MB)
- **Executive Governance & Reliability Administrator Guide (63 Pages)**:  
  [LuminaFM_Administrator_Guide.pdf](file:///e:/My%20Owns/docs/user-manual/release/LuminaFM_Administrator_Guide.pdf) (11.3 MB)

---

## Master Documentation Architecture

- **Phase 1: Inventories & Discovery Baseline** (Complete):
  - [Routes Inventory](file:///e:/My%20Owns/docs/user-manual/inventory/routes-inventory.md) — 14 application routes + 1 standalone kiosk route.
  - [Pages Inventory](file:///e:/My%20Owns/docs/user-manual/inventory/pages-inventory.md) — Detailed specifications for all 14 pages.
  - [Components Inventory](file:///e:/My%20Owns/docs/user-manual/inventory/components-inventory.md) — Comprehensive catalog of 35 UI components.
  - [Modals, Drawers & Dialogs Inventory](file:///e:/My%20Owns/docs/user-manual/inventory/modals-inventory.md) — Master inventory of 21 interactive overlays.
  - [Workflows Inventory](file:///e:/My%20Owns/docs/user-manual/inventory/workflows-inventory.md) — Step-by-step documentation for 17 end-to-end verified workflows.

- **Phase 2: Visual Screenshot Capture & Master Index** (Complete):
  - [Master Screenshot Index](file:///e:/My%20Owns/docs/user-manual/inventory/screenshot-index.md) — 49 original + 49 annotated screenshots (98 total image assets).
  - `screenshots/original/` — Clean, high-resolution original viewports across 4 responsive dimensions.
  - `screenshots/annotated/` — Numbered circular callout annotations matching documentation markers.

- **Phase 3: Module & Feature Guides** (Complete):
  - [01. Command Center Dashboard](file:///e:/My%20Owns/docs/user-manual/03-module-guides/01-command-center.md) — Executive facility KPIs, direct safety alerts, and Chiller demonstration.
  - [02. Asset Master & Equipment Hierarchy](file:///e:/My%20Owns/docs/user-manual/03-module-guides/02-asset-management.md) — Dynamic specifications (JSONB), physical location DAG, and process loop DAG.
  - [03. Maintenance Planning & PM Calendar](file:///e:/My%20Owns/docs/user-manual/03-module-guides/03-maintenance-planning.md) — Recurring PM calendar grid, overdue counter, and on-demand work order generation.
  - [04. Work Orders & Work Management](file:///e:/My%20Owns/docs/user-manual/03-module-guides/04-work-orders.md) — Kanban board, formal state machine, task checklists, labor hours, and spare parts.
  - [05. Inspections & Equipment Faults](file:///e:/My%20Owns/docs/user-manual/03-module-guides/05-inspections-and-faults.md) — Walkthrough checklists, checkpoint inspections, and fault-to-work-order escalation.
  - [06. Daily Boiler Monitoring Logbook](file:///e:/My%20Owns/docs/user-manual/03-module-guides/06-boiler-management.md) — 2-hourly digital logbook, real-time threshold limit warnings, and photo attachments.
  - [07. Factory-Floor Operator Tablet Kiosk](file:///e:/My%20Owns/docs/user-manual/03-module-guides/07-floor-operator-kiosk.md) — 44px+ touch targets, glove numpad, glove rocker switches, QR scanner, and offline PWA.
  - [08. Decision Support & Reporting](file:///e:/My%20Owns/docs/user-manual/03-module-guides/08-decision-support-and-reporting.md) — ANP priority rankings, operational abnormalities, trends, alert channels, and PDF export.
  - [09. Audit Trail & Evidence Vault](file:///e:/My%20Owns/docs/user-manual/03-module-guides/09-audit-and-evidence-vault.md) — Immutable before/after diffs, SHA-256 evidence vault, compliance signoffs, and dossiers.
  - [10. Maintenance Financial Cost Analysis](file:///e:/My%20Owns/docs/user-manual/03-module-guides/10-maintenance-cost-analysis.md) — Proactive Maintenance Ratio (72.4%), spend breakdown, and category ledger.
  - [11. ANP Decision Governance](file:///e:/My%20Owns/docs/user-manual/03-module-guides/11-decision-governance.md) — Kingsbury dissertation baseline (14 criteria, 5 experts, CR < 0.10) and version diffing.
  - [12. White-Label Branding & Settings](file:///e:/My%20Owns/docs/user-manual/03-module-guides/12-white-label-and-settings.md) — Logo upload with live preview, preset crests, timezone, and deployment modes.
  - [Account: Login & Role Simulation](file:///e:/My%20Owns/docs/user-manual/02-account-and-navigation/login.md) — Authentication form, tenant routing, and 1-click role simulation launchers.
  - [Account: Application Navigation & Shell](file:///e:/My%20Owns/docs/user-manual/02-account-and-navigation/navigation.md) — Top navigation bar, role selector popover, and responsive sidebar.

- **Phase 4: Complete Modals & Overlays Reference** (Complete):
  - [Modal Reference Directory](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/README.md) — Focus trap, 7 lifecycle states, and index of 21 overlays.
  - [01. Work Orders Modals](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/01-work-orders-modals.md) — `CreateWorkOrderModal`, `WorkOrderDetailModal`, `WorkOrderStatusTransitionModal`.
  - [02. Inspections & Asset Drawers](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/02-inspections-and-assets-drawers.md) — `AssetDetailDrawer`, `InspectionDetailModal`.
  - [03. Floor Kiosk Modals](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/03-floor-kiosk-modals.md) — `QrScannerModal`, `GloveNumpad`, `SyncQueueDrawer`, `LogoutSyncGuardModal`.
  - [04. Decision & Reporting Modals](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/04-decision-reporting-modals.md) — `OperationalAnpDrawer`, `AlertAcknowledgementModal`, `NotificationChannelConfigModal`, `RecommendationReviewModal`, `PrintableReportWindow`.
  - [05. Audit Trail & Evidence Modals](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/05-audit-and-evidence-modals.md) — `EvidenceUploadModal`, `ComplianceVerificationModal`, `EvidencePackageModal`.
  - [06. Decision Governance Modals](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/06-governance-modals.md) — `CriterionGovernanceDetailModal`, `ProposeModelVersionModal`, `ExpertEvaluationModal`, `AttachEmpiricalEvidenceModal`.
  - [07. Navigation Popovers](file:///e:/My%20Owns/docs/user-manual/03-module-guides/modal-reference/07-navigation-popovers.md) — `TopNavbarRoleSelectorPopover`.

- **Phase 5: End-to-End Practical User Workflows** (Complete):
  - [Workflows Master Directory](file:///e:/My%20Owns/docs/user-manual/05-workflows/README.md) — Multi-tenant architecture and index of 18 guides.
  - [00. Full Lifecycle Maintenance](file:///e:/My%20Owns/docs/user-manual/05-workflows/00-full-lifecycle-maintenance.md) — Complete sequence: Asset $\rightarrow$ PM $\rightarrow$ Defect $\rightarrow$ WO $\rightarrow$ Execution $\rightarrow$ Costs $\rightarrow$ Audit.
  - [01. User Authentication & Role Switching](file:///e:/My%20Owns/docs/user-manual/05-workflows/01-user-auth-and-rbac.md)
  - [02. Tenant Branding & White-Label Customization](file:///e:/My%20Owns/docs/user-manual/05-workflows/02-white-label-branding.md)
  - [03. Asset Catalog & Dynamic Attribute Inspection](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md)
  - [04. Dual Equipment Hierarchy Navigation](file:///e:/My%20Owns/docs/user-manual/05-workflows/04-equipment-hierarchies.md)
  - [05. Preventive Maintenance Scheduling & Dispatch](file:///e:/My%20Owns/docs/user-manual/05-workflows/05-preventive-maintenance-scheduling.md)
  - [06. Work Order Execution & Lifecycle State Machine](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
  - [07. Work Order Resource Tracking (Tasks, Labor, Parts)](file:///e:/My%20Owns/docs/user-manual/05-workflows/07-work-order-resource-tracking.md)
  - [08. Inspection Walkthrough & Fault Escalation](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md)
  - [09. Desktop 2-Hourly Daily Boiler Logbook Entry](file:///e:/My%20Owns/docs/user-manual/05-workflows/09-daily-boiler-logbook.md)
  - [10. Industrial Tablet Factory-Floor Kiosk Experience](file:///e:/My%20Owns/docs/user-manual/05-workflows/10-floor-kiosk-operations.md)
  - [11. Offline PWA Queueing & Conflict Resolution](file:///e:/My%20Owns/docs/user-manual/05-workflows/11-offline-sync-and-conflict-resolution.md)
  - [12. Operational ANP Decision Review & Action](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
  - [13. Operational Alert Acknowledgment & Routing](file:///e:/My%20Owns/docs/user-manual/05-workflows/13-operational-alerts-and-channels.md)
  - [14. ANP Model Governance & Academic Baseline Validation](file:///e:/My%20Owns/docs/user-manual/05-workflows/14-model-governance-baseline.md)
  - [15. Commercial Model Versioning & Version Diffing](file:///e:/My%20Owns/docs/user-manual/05-workflows/15-commercial-model-versioning.md)
  - [16. Enterprise Compliance Audit & Evidence Package Generation](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md)
  - [17. Non-Boiler Extensibility (Chiller Telemetry & Isolation Guard)](file:///e:/My%20Owns/docs/user-manual/05-workflows/17-chiller-extensibility-and-isolation.md)

- **Phase 6: Role-Based User Manuals & Practical Training** (Complete):
  - [Role Architecture & Authorization Manual](file:///e:/My%20Owns/docs/user-manual/04-role-based-guides/README.md) — 4 verified roles, permission verification report, and analysis of unimplemented Manager role.
  - [01. Organization Admin Guide](file:///e:/My%20Owns/docs/user-manual/04-role-based-guides/01-organization-admin-guide.md) — Corporate executive handbook, branding, cloud architecture, and financial review.
  - [02. Plant Reliability Engineer Guide](file:///e:/My%20Owns/docs/user-manual/04-role-based-guides/02-plant-reliability-engineer-guide.md) — Chief engineer handbook, ANP modeling, PM scheduling, and statutory signoffs.
  - [03. Boiler Plant Operator Guide](file:///e:/My%20Owns/docs/user-manual/04-role-based-guides/03-boiler-plant-operator-guide.md) — Watchkeeping shift routine, floor kiosk, glove numpad, and offline sync.
  - [04. Maintenance Technician Guide](file:///e:/My%20Owns/docs/user-manual/04-role-based-guides/04-maintenance-technician-guide.md) — Field technician handbook, Kanban execution, labor/parts logging, and repair photos.

- **Phase 7: Troubleshooting & User Reference Catalogs** (Complete):
  - [Troubleshooting Directory & Decision Tree](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/README.md) — Diagnostic flowchart and HTTP error code taxonomy.
  - [01. Authentication & Access Issues](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/01-authentication-and-session.md) — Login problems, tenant routing, session timeouts, and 403 Forbidden states.
  - [02. Form Validation & Input Errors](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/02-form-validation-and-inputs.md) — Missing fields, sight glass confirmation, out-of-range excursions, duplicate keys (`P2002`).
  - [03. Offline Sync & Network Interruption](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/03-offline-sync-and-network.md) — Basements, IndexedDB queueing, HTTP 409 conflicts, camera QR scanner permissions.
  - [04. Work Orders & State Machine Errors](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/04-work-orders-and-state-machine.md) — State machine transition violations, missing justifications, technician closeout blocks.
  - [05. Decision Support & Model Governance](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/05-decision-support-and-governance.md) — Unvalidated model approval locks, cross-module isolation guard blocks, $CR \ge 0.10$ warnings.
  - [06. Evidence Vault & Upload Issues](file:///e:/My%20Owns/docs/user-manual/06-troubleshooting/06-evidence-vault-and-attachments.md) — 25MB ceiling, invalid MIME types, SHA-256 calculation, regulatory disclaimer notice.
  - [Frequently Asked Questions (FAQ)](file:///e:/My%20Owns/docs/user-manual/07-reference/faq.md) — Common questions and operational answers across all modules.
  - [Status & Priority Definitions](file:///e:/My%20Owns/docs/user-manual/07-reference/status-and-priority-definitions.md) — Definitive catalog of lifecycle states, priority codes, and validation tiers.
  - [Notification Reference](file:///e:/My%20Owns/docs/user-manual/07-reference/notifications-reference.md) — Webhook JSON schema, Slack/SMS/PagerDuty protocols, and cooldown throttling.
  - [Quick Navigation Reference](file:///e:/My%20Owns/docs/user-manual/07-reference/quick-navigation-reference.md) — Complete URL directory, keyboard shortcuts, and responsive navigation shell.
  - [Master Field Reference](file:///e:/My%20Owns/docs/user-manual/07-reference/field-reference.md) — Complete directory of 72 input parameters and validation constraints.
  - [Role & Permission Matrix](file:///e:/My%20Owns/docs/user-manual/07-reference/permissions-matrix.md) — Code-verified 5-role permission access matrix.
  - [Engineering Glossary](file:///e:/My%20Owns/docs/user-manual/07-reference/glossary.md) — Technical definitions of CMMS, thermodynamic, and ANP decision terms.
  - [UI Component Catalog](file:///e:/My%20Owns/docs/user-manual/07-reference/ui-component-catalog.md) — Catalog of all 35 design system and specialized domain components.

- **Phase 8: Responsive & Device-Specific User Guides** (Complete):
  - [Responsive Guides Master Directory](file:///e:/My%20Owns/docs/user-manual/08-device-guides/README.md) — Responsive architecture overview, Tailwind breakpoints, and testing methodology.
  - [01. Desktop Workstation Guide (1440 × 900)](file:///e:/My%20Owns/docs/user-manual/08-device-guides/01-desktop-guide.md) — Persistent sidebar (`w-64`/`xl:w-72`), 4-column KPI grids, 14×14 ANP supermatrices, and keyboard shortcuts.
  - [02. Tablet Landscape Guide (1180 × 820)](file:///e:/My%20Owns/docs/user-manual/08-device-guides/02-tablet-landscape-guide.md) — 2-column split layouts, persistent sidebar adaptation, and dual-pane Floor Kiosk mode.
  - [03. Tablet Portrait Guide (820 × 1180)](file:///e:/My%20Owns/docs/user-manual/08-device-guides/03-tablet-portrait-guide.md) — Off-canvas hamburger drawer (`lg:hidden`), single-column stacked telemetry, Glove Numpad, and QR scanner.
  - [04. Mobile Phone Guide (390 × 844)](file:///e:/My%20Owns/docs/user-manual/08-device-guides/04-mobile-phone-guide.md) — Compact single-column viewport, horizontal scroll tables, bottom-sheet modals, and native mobile keyboards.
  - [05. Factory-Floor Ergonomics & Offline Engine](file:///e:/My%20Owns/docs/user-manual/08-device-guides/05-industrial-kiosk-ergonomics.md) — Glove Mode calibration, 64px tactile keys, thermal dark theme, and IndexedDB offline sync queue.
  - [06. Responsive Compatibility & Device Audit Report](file:///e:/My%20Owns/docs/user-manual/08-device-guides/06-responsive-compatibility-report.md) — Comprehensive 14-page and 21-overlay audit matrix across all 4 viewports with certification sign-off.

- **Phase 10: Independent Quality Audit & Coverage Certification** (Complete):
  - [Documentation Coverage & Audit Report](file:///e:/My%20Owns/docs/user-manual/release/LuminaFM_Documentation_Coverage_Report.md) — Code-verified 100% coverage report across all 15 routes, 14 pages, 35 components, 21 modals, 72 fields, and 18 workflows.

- **Phase 11: Continuous Documentation Maintenance Framework** (Complete):
  - [Documentation Maintenance SOP](file:///e:/My%20Owns/docs/user-manual/DOCUMENTATION_MAINTENANCE.md) — Standard operating procedure, change impact analysis, screenshot lifecycle, and CI/CD build pipeline.
  - [Documentation Changelog](file:///e:/My%20Owns/docs/user-manual/CHANGELOG.md) — Full semantic version change history from v1.0.0 through v1.4.0.
  - [Page Documentation Template](file:///e:/My%20Owns/docs/user-manual/templates/page-documentation-template.md) — Authoring template for new or modified pages.
  - [Modal & Drawer Documentation Template](file:///e:/My%20Owns/docs/user-manual/templates/modal-documentation-template.md) — Authoring template for interactive overlays.
  - [Workflow Documentation Template](file:///e:/My%20Owns/docs/user-manual/templates/workflow-documentation-template.md) — Authoring template for operational workflows.

---

## Deliverables Summary

- **Total Implemented Modules Documented**: 14
- **Total Real Screenshots Captured & Annotated**: 98 (49 clean + 49 annotated)
- **Total Overlays & Modals Documented**: 21
- **Total End-to-End Workflows Documented**: 18 (1 Full Lifecycle + 17 Domain Workflows)
- **Total Role Manuals Authored**: 4 (Organization Admin, Plant Reliability Engineer, Boiler Plant Operator, Maintenance Technician)
- **Total Troubleshooting Guides Authored**: 7
- **Total Reference Catalogs**: 8
- **Total Device & Responsive Guides Authored**: 7 (Desktop, Tablet Landscape, Tablet Portrait, Mobile, Industrial Ergonomics, Compatibility Report, Directory Index)
- **Total Published Master Deliverables (Phase 9)**: 4 (Master User Manual PDF [245 pages], Master HTML Portal [Searchable & Lightbox], Field Quick Start Guide PDF [40 pages], Administrator & Reliability Guide PDF [63 pages])
- **Total Quality Audit Reports (Phase 10)**: 1 (100% Verified Coverage Certification Report)
- **Total Continuous Maintenance Artifacts (Phase 11)**: 5 (Maintenance SOP, Changelog, Page Template, Modal Template, Workflow Template)
