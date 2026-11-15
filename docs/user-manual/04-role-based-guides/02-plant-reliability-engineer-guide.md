# LuminaFM Role User Manual: Plant Reliability Engineer

### Plant Reliability Engineer Operational Manual

```carousel
![Command Center Overview Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/DASH-001-dashboard-overview.png)
<!-- slide -->
![ANP Maintenance Priorities Tab](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-001-decision-anp-priorities-annotated.png)
```

---

## 1. Role Overview & Core Responsibilities

The **Plant Reliability Engineer** serves as the Chief Reliability Specialist, Lead Thermodynamicist, or Senior Mechanical Maintenance Engineer. This role is responsible for asset health, multi-criteria decision modeling, and preventive maintenance engineering:

- **ANP Multi-Criteria Decision Evaluation**: Evaluating mathematical limit supermatrices, auditing criteria eigenvalues, performing real-time cluster sensitivity analysis, and executing formal recommendation reviews.
- **Operational Abnormality Acknowledgment**: Investigating plant telemetry threshold breaches (steam overpressure, flue gas overheating, water chemistry TDS spikes) and logging statutory mitigation actions under ASME Section I.
- **Preventive Maintenance Planning**: Formulating time-based and meter-based PM routines on the interactive calendar and dispatching on-demand work orders.
- **Asset Master Specifications**: Maintaining dynamic category-specific JSONB attributes (MAWP, rated evaporation, burner capacity, heating surface area) and structuring dual physical/process hierarchies.
- **Statutory Compliance Signoff**: Recording certified engineering verifications against international standards (ASME BPVC Sec I, EN 12953, NB-23, OSHA 1910.119, ISO 55001).
- **Decision Governance & Versioning**: Auditing the Kingsbury dissertation baseline and proposing custom site-specific model configurations.

---

## 2. Login & First Access

1. Navigate to `/login`.
2. Input engineering credentials:
   - Email: `chief.engineer@colombohotel.lk`
   - *Quick Shortcut*: Click the **Reliability Engineer** quick-login button.
3. Click **Sign In to Facility**.
4. In the top-right header, confirm that the **Active Role Badge** renders in Deep Indigo (`bg-indigo-950 text-indigo-300 border-indigo-500/40`) with the label **Plant Reliability Engineer**.

---

## 3. Relevant Dashboard: Command Center & ANP Priorities

The Plant Reliability Engineer focuses on two primary operational cockpits:
1. **Command Center Overview (`/`)** (`DASH-001`):
   - Real-time thermodynamic gauges for steam pressure, flue gas temperature, and TDS.
   - Centrifugal Chiller module card (`CHL-001`) with operating COP and approach temperature.
   - Active maintenance alerts banner with 1-click links to inspect ANP matrices.
2. **ANP Maintenance Priorities (`/reports`)** (`REP-001`):
   - Limit supermatrix priority vectors ranking maintenance alternatives (Chemical Descaling, Burner Tuning, SRV Recertification, Refractory Repair).
   - Telemetry signal snapshot distinguishing Measured, Calculated, Benchmark, and Expert data.
   - Cluster weight sensitivity perturbation sliders.

```carousel
![Maintenance Calendar Grid Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/CAL-001-maintenance-calendar-grid.png)
<!-- slide -->
![Criterion Governance Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-002-criterion-governance-modal-annotated.png)
```

**Numbered Callout Descriptions (`GOV-002`):**
- **Marker 1 (Modal Title & Academic Baseline)**: Displays Criterion Code (`C1.1`), cluster name, and Academic Baseline badge.
- **Marker 2 (Peer-Reviewed Literature)**: Citations, journal names, authors, and permanent DOI links.
- **Marker 3 (5 Expert Consensus Profiles)**: Individual evaluation profiles from 5 domain specialists.

---

## 4. Accessible Modules & Navigation Scope

The Plant Reliability Engineer has access to **13 facility modules**:

| Module Name | Route | Operational Capability | Access Level |
|---|---|---|:---:|
| **Command Center** | `/` | Executive KPIs, telemetry monitors, chiller card | Full Access |
| **Asset Master** | `/assets` | Inspect equipment, edit dynamic JSONB attributes | Full Access |
| **Equipment Hierarchies** | `/hierarchies` | Trace physical and process loop dependency DAGs | Full Access |
| **Maintenance Planning** | `/maintenance-calendar` | Configure PM routines, dispatch work orders from calendar | Full Access |
| **Work Orders** | `/work-orders` | Authorize tickets, assign technicians, track labor/parts | Full Access |
| **Inspections & Faults** | `/inspections` | Inspect walkthrough checklists, escalate faults to WOs | Full Access |
| **Boiler Logbook** | `/daily-monitoring` | Review shift entries, inspect historical archives | Full Access |
| **Floor Operator Kiosk** | `/operator` | Touch-first kiosk mode, offline sync management | Full Access |
| **Decision & Reporting** | `/reports` | ANP decision runs, sensitivity tuning, alert mitigations | Full Access |
| **Audit & Evidence** | `/audit-evidence` | Inspect before/after diffs, sign off statutory clauses | Full Access |
| **Cost Analytics** | `/cost-analysis` | Review maintenance spend, proactive ratio ($72.4\%$) | Full Access |
| **Decision Governance** | `/governance` | Audit dissertation baseline, propose model variants | Full Access |
| **White-Label & Settings** | `/settings` | Corporate branding and deployment settings | **FORBIDDEN (403)** |

---

## 5. Daily Tasks & Practical User Training

### Morning Engineering Routine (07:30 - 08:30)
1. **Shift Telemetry & Excursion Audit**:
   - Open `/reports` $\rightarrow$ **Operational Abnormalities** (`REP-002`).
   - If unacknowledged excursions exist, open the `AlertAcknowledgementModal` (`REP-003`).
   - Record mitigation action: select `dispatched_work_order` or `recalibrated`, enter technical notes, and click **Confirm Acknowledgment**.
2. **ANP Maintenance Recommendation Review**:
   - On `/reports` $\rightarrow$ **ANP Maintenance Priorities** (`REP-001`), review the highest-ranked alternative.
   - Click **Review Action** to launch `RecommendationReviewModal`.
   - **Crucial Rule**: Verify that the active model has validated baseline status (`isValidated === true`).
   - Enter your name and detailed engineering justification (minimum 15 characters).
   - Click **Approve & Issue Work Order**.
3. **PM Calendar Dispatch**:
   - Navigate to `/maintenance-calendar` $\rightarrow$ **Schedules Tab** (`CAL-002`).
   - Inspect routines due this week (e.g. `Weekly Sight Glass Blowdown`, `Quarterly Burner Overhaul`).
   - Click **Generate Work Order** to stage active tickets for maintenance technicians.

### Afternoon Routine (13:30 - 15:00)
1. **Work Order Progress Inspection**:
   - Open `/work-orders` (`WO-002`).
   - Verify that technicians have moved active tickets into `in_progress` and are checking off task items.
   - For completed tickets, review the **Financial Cost Ledger** and execute supervisory transition to `closed`.
2. **Statutory Compliance Signoffs**:
   - Open `/audit-evidence` $\rightarrow$ **Compliance Records** (`AUDIT-004`).
   - Sign off daily/weekly regulatory clauses (e.g. ASME Section I PG-60.1 for water gauges) with your inspector certification number.

---

## 6. Important Workflows for This Role

- [**WF-03: Asset Catalog & Dynamic Attributes**](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md): Updating JSONB engineering specifications.
- [**WF-05: Preventive Maintenance Scheduling**](file:///e:/My%20Owns/docs/user-manual/05-workflows/05-preventive-maintenance-scheduling.md): Calendar planning and on-demand WO dispatch.
- [**WF-06: Work Order Execution & Lifecycle**](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md): Authorizing and closing work orders.
- [**WF-12: Operational ANP Decision Review**](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md): Inspecting supermatrices and approving recommendations.
- [**WF-13: Operational Alert Acknowledgment**](file:///e:/My%20Owns/docs/user-manual/05-workflows/13-operational-alerts-and-channels.md): Mitigating plant excursions and configuring alerts.
- [**WF-14: ANP Model Governance & Academic Baseline**](file:///e:/My%20Owns/docs/user-manual/05-workflows/14-model-governance-baseline.md): Auditing 14 criteria and expert judgments.
- [**WF-17: Non-Boiler Extensibility (Chiller Telemetry & Guard)**](file:///e:/My%20Owns/docs/user-manual/05-workflows/17-chiller-extensibility-and-isolation.md): Operating chiller diagnostics and verifying isolation.

---

## 7. Restricted Operations & Common Errors

### Restricted Operations
- **White-Label & Organization Settings (`/settings`)**: Strictly restricted to `Organization Admin`. Navigating to `/settings` triggers the `ForbiddenState` (HTTP 403 Forbidden).
- **Unvalidated ANP Model Approval**: Under plant safety policy, you **cannot approve unvalidated ANP outputs as operational maintenance decisions**. If a model is unvalidated, the `Approve` button is strictly locked.
- **Cross-Module Model Reuse**: You cannot run the boiler ANP decision model against chiller equipment assets.

### Common Errors & Solutions
- *Error*: `"Forbidden: You do not have permission to access White-Label & Organization Settings"`.
  *Solution*: Branding and tenant configuration require Organization Admin privileges. Switch active persona via the top navigation role switcher if authorized.
- *Error*: `"Safety-critical interventions require minimum 15 characters of certified physical on-site inspection justification"`.
  *Solution*: Enter a comprehensive engineering justification explaining what physical inspection was performed before submitting recommendation approvals.
