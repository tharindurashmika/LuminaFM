# Enterprise Role & Permission Access Matrix

This document provides the verified, code-audited **Role-Based Access Control (RBAC) Permission Matrix** for LuminaFM. It reflects backend Express middleware guards (`requirePermission`, `requireRole`, `authenticateTenant`), database seeds (`prisma/seed.ts`), and frontend route guards (`App.tsx`, `ProtectedRoute`, `AuthContext.tsx`).

---

## 1. Role Definitions & Implementation Status

| Formal Role Name | System Implementation Status | Operational Persona & Function |
|---|:---:|---|
| **Administrator (`Organization Admin`)** | **IMPLEMENTED (System Role)** | Facility General Manager / System Administrator with superuser wildcard authority (`*`, `org:admin`). |
| **Manager (`Facility / Maintenance Manager`)** | **UNIMPLEMENTED / INACCESSIBLE** | **No distinct "Manager" system role exists in LuminaFM.** Managerial responsibilities are split between `Organization Admin` (commercial & financial) and `Plant Reliability Engineer` (engineering & operational dispatch). |
| **Engineer (`Plant Reliability Engineer`)** | **IMPLEMENTED (System Role)** | Senior Reliability Specialist responsible for ANP decision models, PM calendar planning, asset specifications, and statutory compliance. |
| **Technician (`Maintenance Technician`)** | **IMPLEMENTED (Operational Role)** | Field Mechanical/Electrical Millwright executing assigned work orders, task checklists, labor tracking, and spare parts consumption. |
| **Operator (`Boiler Plant Operator`)** | **IMPLEMENTED (Operational Role)** | Licensed Stationary Steam Plant Watchkeeper recording 2-hourly shift telemetry, operating the floor kiosk, and conducting walkthroughs. |

---

## 2. Verified Enterprise Permission Matrix

The table below details permissions across all modules and critical operational actions. In accordance with Master Prompt rules, all 5 requested columns are presented, with the unverified/non-existent `Manager` role clearly marked as **INACCESSIBLE (Unimplemented)**:

| Module / Action | Administrator (`Organization Admin`) | Manager *(Unimplemented Role)* | Engineer (`Plant Reliability Engineer`) | Technician (`Maintenance Technician`) | Operator (`Boiler Plant Operator`) | Backend Permission Key | Route / Component Guard |
|---|:---:|:---:|:---:|:---:|:---:|---|---|
| **Command Center Dashboard (`/`)** | Allowed | *INACCESSIBLE* | Allowed | Allowed (No Financials) | Allowed (No Financials) | Authenticated session | Public authenticated |
| **Asset Master Registry (`/assets`)** | Allowed (Full CRUD) | *INACCESSIBLE* | Allowed (Create / Edit) | Read-Only | Read-Only | `assets:read` / `assets:manage` | `requirePermission('assets:read')` |
| **Edit Dynamic JSONB Attributes** | Allowed | *INACCESSIBLE* | Allowed | Restricted | Restricted | `assets:manage` | In-drawer role guard |
| **Equipment Hierarchies (`/hierarchies`)** | Allowed | *INACCESSIBLE* | Allowed | Read-Only | Read-Only | `assets:read` | `requirePermission('assets:read')` |
| **Maintenance Calendar (`/maintenance-calendar`)** | Allowed | *INACCESSIBLE* | Allowed | Read-Only | Read-Only | `work_orders:read` | `requirePermission('work_orders:read')` |
| **Generate Work Order from PM Schedule** | Allowed | *INACCESSIBLE* | Allowed | Restricted | Restricted | `work_orders:manage` | Action-level permission check |
| **Work Orders Register & Kanban (`/work-orders`)** | Allowed (Full CRUD) | *INACCESSIBLE* | Allowed | Allowed | Read-Only | `work_orders:read` / `work_orders:manage` | `requirePermission('work_orders:read')` |
| **Create New Work Order** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Restricted | `work_orders:manage` | `CreateWorkOrderModal` trigger |
| **Execute Work Order State Transition** | Allowed | *INACCESSIBLE* | Allowed | Allowed (`in_prog`/`comp`) | Restricted | `work_orders:manage` | State machine rule validation |
| **Close Work Order (`completed` $\rightarrow$ `closed`)** | Allowed | *INACCESSIBLE* | Allowed | **Restricted** (Needs Supervisor) | Restricted | `work_orders:manage` | Supervisory authority check |
| **Log Labor Hours & Spare Parts** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Restricted | `work_orders:manage` | In-modal resource forms |
| **Inspections Register (`/inspections`)** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Allowed | `work_orders:read` | `requirePermission('work_orders:read')` |
| **Dispatch Work Order from Fault** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Restricted | `work_orders:manage` | Action-level mutation |
| **Daily Boiler Logbook (`/daily-monitoring`)** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Allowed (Shift Watchkeeper) | `operations:daily_log` | `requirePermission('operations:daily_log')` |
| **Floor Operator Tablet Kiosk (`/operator`)** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Allowed (Primary Floor UI) | `operations:daily_log` | `ProtectedRoute` |
| **Offline PWA IndexedDB Queueing & Sync** | Allowed | *INACCESSIBLE* | Allowed | Allowed | Allowed | `operations:daily_log` | Local ServiceWorker / IndexedDB |
| **Decision Support & Reports (`/reports`)** | Allowed | *INACCESSIBLE* | Allowed | Read-Only | Read-Only | `work_orders:read` | `requirePermission('work_orders:read')` |
| **Acknowledge Operational Alert** | Allowed | *INACCESSIBLE* | Allowed | Restricted | Restricted | `governance:manage` / `assets:manage` | `AlertAcknowledgementModal` |
| **Approve / Reject ANP Recommendation** | Allowed | *INACCESSIBLE* | Allowed (Validated models only) | Restricted | Restricted | `governance:manage` | `RecommendationReviewModal` |
| **Configure Alert Notification Webhooks** | Allowed | *INACCESSIBLE* | Allowed | Restricted | Restricted | `org:admin` / `governance:manage` | `NotificationChannelConfigModal` |
| **Audit Trail & JSON Diffs (`/audit-evidence`)** | Allowed (Full Diffs) | *INACCESSIBLE* | Allowed | Restricted | Restricted | `work_orders:read` | `requirePermission('work_orders:read')` |
| **Upload Compliance Evidence Files** | Allowed | *INACCESSIBLE* | Allowed | Allowed (Photos / Logs) | Restricted | `assets:manage` / `work_orders:manage` | `EvidenceUploadModal` |
| **Sign Off Statutory Compliance Clause** | Allowed | *INACCESSIBLE* | Allowed | Restricted | Restricted | `assets:manage` | `ComplianceVerificationModal` |
| **Build Exportable Evidence Package** | Allowed | *INACCESSIBLE* | Allowed | Restricted | Restricted | `work_orders:read` | `EvidencePackageModal` |
| **Maintenance Cost Analytics (`/cost-analysis`)** | **Allowed** | *INACCESSIBLE* | **Allowed** | **FORBIDDEN (403)** | **FORBIDDEN (403)** | `finance:read` | `ProtectedRoute` (`requiredRoles`) |
| **ANP Decision Governance (`/governance`)** | **Allowed** | *INACCESSIBLE* | **Allowed** | **FORBIDDEN (403)** | **FORBIDDEN (403)** | `governance:manage` | `ProtectedRoute` (`requiredRoles`) |
| **Propose / Validate Model Versions** | Allowed | *INACCESSIBLE* | Allowed | **FORBIDDEN (403)** | **FORBIDDEN (403)** | `governance:manage` | `ProposeModelVersionModal` |
| **White-Label & Settings (`/settings`)** | **Allowed** | *INACCESSIBLE* | **FORBIDDEN (403)** | **FORBIDDEN (403)** | **FORBIDDEN (403)** | `org:admin` | `ProtectedRoute` (`requiredRoles`) |

---

## 3. Permission Keys Directory

| Permission Key | Description | Seeded Role Assignments |
|---|---|---|
| `*` | Superuser wildcard granting unrestricted administrative authority. | `Organization Admin` |
| `org:admin` | Tenant organization settings, white-label branding, and cloud deployment visibility. | `Organization Admin` |
| `assets:manage` | Asset creation, specifications modification, dynamic JSONB schema changes, and hierarchy editing. | `Organization Admin`, `Plant Reliability Engineer` |
| `assets:read` | Read-only access to asset registers, equipment nameplates, and location hierarchies. | All 4 Implemented Roles |
| `work_orders:manage` | Work order creation, status transitions, labor hours entry, and parts consumption. | `Organization Admin`, `Plant Reliability Engineer`, `Maintenance Technician` |
| `work_orders:read` | Read-only viewing of maintenance orders, schedules, inspections, and audit logs. | All 4 Implemented Roles |
| `operations:daily_log` | Submitting 2-hourly boiler logs, executing floor kiosk operations, and reporting shift faults. | All 4 Implemented Roles |
| `governance:manage` | ANP decision model administration, sensitivity tuning, and recommendation approvals. | `Organization Admin`, `Plant Reliability Engineer` |
| `finance:read` | Executive financial ledger, proactive maintenance ratio meter, and category spend analysis. | `Organization Admin`, `Plant Reliability Engineer` |
| `audit:view` | Viewing immutable event logs, before/after JSON diffs, and cryptographic evidence hashes. | `Organization Admin`, `Plant Reliability Engineer` |
