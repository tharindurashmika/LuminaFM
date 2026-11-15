# LuminaFM Role User Manual: Organization Admin

### Organization Admin Operational Manual

```carousel
![Login Portal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUTH-001-login-desktop.png)
<!-- slide -->
![White-Label Branding Settings](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/SET-001-organization-branding-settings-annotated.png)
```

---

## 1. Role Overview & Core Responsibilities

The **Organization Admin** serves as the Executive Facility Director, Plant General Manager, or Principal CMMS Administrator. This role exercises comprehensive, unrestricted administrative authority across the tenant organization:

- **Corporate White-Label Branding**: Uploading custom client logos, configuring platform badge display, and managing brand color tokens.
- **Tenant Configuration**: Managing facility operating timezone (`Asia/Colombo`), base accounting currency (`LKR`), and site locations.
- **Financial Oversight**: Inspecting facility maintenance expenditure, reviewing labor/parts/contractor cost distributions, and tracking the facility's proactive maintenance ratio ($72.4\%$).
- **Cloud Infrastructure & Security**: Inspecting tenant deployment architecture (Shared SaaS vs. Dedicated Cloud), monitoring PostgreSQL connection pool health, and reviewing encrypted object storage buckets.
- **Model Governance Authority**: Granting final formal commercial validation to proposed ANP decision model versions.
- **Audit Non-Repudiation**: Inspecting immutable chronological change ledgers and compiling tamper-evident evidence packages for external statutory auditors.

---

## 2. Login & First Access

1. Navigate to the LuminaFM login screen at `/login` (`AUTH-001`).
2. Input administrative credentials:
   - Email: `chief.engineer@colombohotel.lk` (or designated administrator email).
   - Password: `••••••••••••`.
   - Tenant Code: `COLOMBO-GRAND`.
   - *Quick Shortcut*: Click the **Org Admin** quick-login button to populate credentials instantly.
3. Click **Sign In to Facility**.
4. Upon authentication, verify that the **Active Role Badge** in the top-right header displays **Organization Admin** in a regal gold tone (`bg-gold-500/15 text-gold-300 border-gold-500/40`).

---

## 3. Relevant Dashboard: Executive Command Center & Financial Overview

The Organization Admin begins each operational session at the **Executive Command Center** (`/`):
- **Overall Plant Availability**: $98.2\%$ across primary utility systems.
- **Mean Time Between Failures (MTBF)**: $720\text{ Hours}$.
- **Active Work Order Load**: 5 Active tickets in progress.
- **Proactive Maintenance Ratio**: $72.4\%$ (Target: $> 70\%$).
- **Active Operational Alerts Banner**: Surfaces high-priority excursions requiring executive awareness.

```carousel
![Maintenance Cost Analysis Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/COST-001-maintenance-cost-analysis.png)
<!-- slide -->
![Maintenance Cost Analysis Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/COST-001-maintenance-cost-analysis-annotated.png)
```

**Numbered Callout Descriptions (`COST-001`):**
- **Marker 1 (Executive Cost Summary)**: Total spend ($14,850), Planned vs Unplanned cost split, and Proactive Ratio ($72.4\%$).
- **Marker 2 (Cost Breakdown by Category)**: Proportional spend for Labor ($42\%$), Spare Parts ($38\%$), and External Contractors ($20\%$).
- **Marker 3 (Asset Cost Center Table)**: Ranking of top facility equipment cost centers (`BLR-001`, `CHL-001`).

---

## 4. Accessible Modules & Navigation Scope

The Organization Admin possesses unrestricted access (`*`, `org:admin`) to all **14 application modules**:

| Module Name | Route | Operational Capability | Key UI Views |
|---|---|---|---|
| **Command Center** | `/` | Executive KPIs, critical alert monitor, Chiller module | Overview, Mobile view |
| **Asset Master** | `/assets` | Full CRUD on equipment records, dynamic JSONB specs | Registry table, AssetDetailDrawer |
| **Equipment Hierarchies** | `/hierarchies` | Restructure physical locations and process loops | Physical DAG, Process DAG |
| **Maintenance Planning** | `/maintenance-calendar` | Configure PM plans, manage recurring schedules | Month Grid, Schedules table |
| **Work Orders** | `/work-orders` | Create, authorize, assign, transition, and close tickets | List view, Kanban board, WO Detail |
| **Inspections & Faults** | `/inspections` | Inspect walkthrough checklists, dispatch fault WOs | Inspections table, Fault History |
| **Boiler Logbook** | `/daily-monitoring` | Review shift entries, inspect historical archives | 2-Hourly entry, Archive table |
| **Floor Operator Kiosk** | `/operator` | Touch-first kiosk mode, offline sync management | Portrait kiosk, Landscape kiosk |
| **Decision & Reporting** | `/reports` | Inspect ANP limit supermatrices, alert routing | ANP Priorities, Abnormalities |
| **Audit & Evidence** | `/audit-evidence` | Inspect JSON diffs, upload vault files, build packages | Audit Trail, Evidence Vault, Packages |
| **Cost Analytics** | `/cost-analysis` | Financial spend analysis, proactive maintenance ratio | Executive Ledger, Cost Centers |
| **Decision Governance** | `/governance` | Dissertation baseline audit, commercial version approval | Academic Baseline, Version Diff |
| **White-Label & Settings** | `/settings` | Corporate logo upload, timezone/currency, cloud pool | Branding, Localization, Deployment |

---

## 5. Daily Administrative Tasks & Practical Training

### Morning Routine (08:30 - 09:15)
1. **Executive Health Review**:
   - Log in and open the Command Center at `/`.
   - Check the **Active Alerts Banner**: confirm whether any critical boiler excursions occurred during the overnight shift (`Shift C: 22:00 - 06:00`).
   - If an unacknowledged critical alert exists, review the mitigation notes logged by the operating engineer.
2. **Work Order Backlog Review**:
   - Navigate to `/work-orders` and switch to the **Kanban Board** (`WO-002`).
   - Review tickets in the `open` column. Ensure that high-priority corrective tickets are assigned to technicians.
3. **Financial Proactive Ratio Audit**:
   - Navigate to `/cost-analysis` (`COST-001`).
   - Verify that the **Proactive Maintenance Ratio** remains above $70\%$. If unplanned spend exceeds $30\%$, consult with the Plant Reliability Engineer to investigate recurring root-cause defects.

### Weekly Routine (Monday Morning)
1. **Model Governance & Proposal Signoff**:
   - Navigate to `/governance` $\rightarrow$ **Commercial Configurations** (`GOV-004`).
   - Review pending model version proposals submitted by reliability engineers.
   - Inspect the mathematical delta diff on the **Model Version Comparison** tab (`GOV-003`).
   - If satisfied, execute formal approval via the `GovernanceApprovalModal`.
2. **Statutory Audit Evidence Compilation**:
   - Navigate to `/audit-evidence` $\rightarrow$ **Evidence Packages** (`AUDIT-006`).
   - Build monthly evidence packages for statutory ASME Section I / NBIC compliance dossiers.

---

## 6. Important Workflows for This Role

- [**WF-01: User Authentication & Role Switching**](file:///e:/My%20Owns/docs/user-manual/05-workflows/01-user-auth-and-rbac.md): Authenticating and testing user personas.
- [**WF-02: Tenant Branding & White-Label Customization**](file:///e:/My%20Owns/docs/user-manual/05-workflows/02-white-label-branding.md): Configuring logo, timezone, currency, and deployment settings.
- [**WF-06: Work Order Execution & Lifecycle**](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md): Authorizing and formally closing maintenance work orders.
- [**WF-15: Commercial Model Versioning & Diffing**](file:///e:/My%20Owns/docs/user-manual/05-workflows/15-commercial-model-versioning.md): Auditing custom ANP model proposals.
- [**WF-16: Enterprise Compliance Audit & Evidence Packages**](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md): Compiling sealed evidence archives.

---

## 7. Restricted Operations & Common Errors

### Restricted Operations
- The `Organization Admin` possesses superuser privileges (`*`). There are no in-application feature restrictions.
- However, the admin must respect the **Cross-Module Model Isolation Guard**: the system strictly prohibits running the boiler ANP decision model against chiller equipment assets.

### Common Errors & Solutions
- *Error*: `"Image upload failed: file exceeds 2MB limit in Branding Settings"`.
  *Solution*: Compress the corporate logo before uploading. Use SVG format with a transparent background.
- *Error*: `"Mandatory transition justification required"`.
  *Solution*: Even administrators must provide an audit reason when transitioning work order lifecycle states to satisfy regulatory compliance.
