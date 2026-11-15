# Status & Priority Definitions Directory

This reference defines all lifecycle states, operational statuses, criticality tiers, and severity levels implemented across LuminaFM.

---

## 1. Work Order Lifecycle Statuses (`WorkOrderStatus`)

LuminaFM implements a strict finite state machine for maintenance tickets:

| Status Code | Display Label | Badge Chromatic Tone | Operational Meaning & Permitted Actions | Terminal? |
|---|---|---|---|:---:|
| `draft` | **Draft** | Slate (`border-slate-700 text-slate-400`) | Ticket initially staged (e.g. from floor defect). Not yet authorized. Permitted transitions: `open`, `cancelled`. | No |
| `open` | **Open** | Indigo Glow (`border-indigo-500/40 text-indigo-300`) | Formally created and awaiting planner review. Permitted transitions: `approved`, `assigned`, `in_progress`, `cancelled`. | No |
| `approved` | **Approved** | Indigo (`border-indigo-400/50 text-indigo-200`) | Authorized by reliability engineer; ready for assignment. Permitted transitions: `assigned`, `in_progress`, `cancelled`. | No |
| `assigned` | **Assigned** | Indigo (`border-indigo-400/50 text-indigo-200`) | Assigned to designated technician. Permitted transitions: `in_progress`, `on_hold`, `cancelled`. | No |
| `in_progress` | **In Progress** | Gold (`border-gold-500/50 text-gold-300`) | Physical work actively underway on site. Permitted transitions: `on_hold`, `completed`, `cancelled`. | No |
| `on_hold` | **On Hold** | Amber (`border-amber-500/50 text-amber-300`) | Work temporarily paused (e.g. awaiting spare parts delivery). Permitted transitions: `in_progress`, `cancelled`. | No |
| `completed` | **Completed** | Emerald (`border-emerald-500/50 text-emerald-300`) | All mechanical tasks finished by technician; awaiting supervisor signoff. Permitted transitions: `closed`, `in_progress` (reopen). | No |
| `closed` | **Closed** | Emerald Subdued (`bg-emerald-950/40 text-emerald-400`) | Final supervisory signoff complete; costs committed to ledger. **Terminal state**. | **YES** |
| `cancelled` | **Cancelled** | Rose Subdued (`bg-rose-950/40 text-rose-400`) | Ticket aborted or rejected. **Terminal state**. | **YES** |

---

## 2. Work Order Criticality & Priority Levels (`PriorityLevel`)

| Priority Code | Label | Color Pill | SLA / Execution Target | Operational Trigger |
|---|---|---|---|---|
| `urgent` | **Urgent** | Rose Glow (`bg-rose-500/20 text-rose-300 border-rose-500/50`) | Immediate dispatch ($\le 2\text{ hours}$) | Direct threat to human safety, boiler steam overpressure excursion, or environmental release. |
| `high` | **High** | Amber Glow (`bg-amber-500/20 text-amber-300 border-amber-500/50`) | Same shift ($\le 8\text{ hours}$) | Critical equipment operating degraded or active thermal loss in convection pass. |
| `medium` | **Medium** | Indigo (`bg-indigo-500/20 text-indigo-300 border-indigo-500/40`) | Within 48 hours | Standard scheduled preventive routines, minor packing leaks, or routine filter changes. |
| `low` | **Low** | Slate (`bg-slate-800 text-slate-300 border-slate-700`) | Next planned outage / 14 days | Cosmetic servicing, nameplate re-tagging, or non-critical insulation touch-ups. |

---

## 3. Asset Operating Statuses (`AssetStatus`)

| Status Code | Display Label | Badge Styling | Equipment Operational Availability |
|---|---|---|---|
| `operational` / `in_service` | **In Service** | Emerald | Asset energized, commissioned, and carrying normal facility steam/cooling load. |
| `degraded` | **Degraded** | Amber | Asset operating with reduced efficiency, minor weeping, or elevated stack temperatures. |
| `under_maintenance` | **In Maintenance** | Gold | Asset mechanically isolated (LOTO) for scheduled overhaul or active repair. |
| `standby` | **Standby** | Indigo | Redundant auxiliary unit operational and ready for immediate automatic changeover. |
| `out_of_service` | **Out of Service** | Rose | Asset tripped on safety interlock or shut down due to major mechanical failure. |
| `decommissioned` | **Decommissioned** | Slate | Asset permanently retired or removed from facility plant inventory. |

---

## 4. Operational Abnormality Alert Severities

| Severity Level | Color Accent | Threshold Breach Definition | Notification Behavior |
|---|---|---|---|
| **CRITICAL** | Red (`bg-rose-950 border-rose-500`) | Parameter exceeds Maximum Allowable Working Pressure (MAWP) or high-high stack trip. | Immediate audible kiosk alarm + SMS/PagerDuty dispatch. |
| **WARNING** | Amber (`bg-amber-950 border-amber-500`) | Parameter deviates $> 15\%$ from nominal baseline (e.g. stack temp $> 190^\circ\text{C}$). | High-visibility dashboard banner + Slack alert. |
| **INFO** | Blue (`bg-indigo-950 border-indigo-500`) | Advisory notice (e.g. routine blowdown due in 30 minutes). | Kiosk status ribbon notice. |

---

## 5. Offline Synchronization Statuses (`SyncStatus`)

| Status Code | Indicator Icon | Meaning in Local Client |
|---|---|---|
| `queued` | Blue Clock | Record safely written to IndexedDB; waiting for network restoration. |
| `syncing` | Gold Animated Spinner | Payload actively transmitting to central server via idempotent UUID. |
| `synced` | Emerald Checkmark | Confirmed committed to authoritative server PostgreSQL database. |
| `retry` | Amber Warning Pill | Transmission attempt failed; scheduled for automatic exponential backoff. |
| `conflict` | Rose Shield Icon | HTTP 409 conflict detected; requires operator resolution. |
| `failed` | Red Exclamation | Maximum retries ($5/5$) exhausted; requires manual force-sync trigger. |

---

## 6. Decision Model Validation Tiers (`ValidationStatus`)

| Validation Tier | Badge Label | Mathematical Status & Permitted Use |
|---|---|---|
| `academic_baseline` | **Academic Baseline Validated** | Verified against Kingsbury dissertation (Moratuwa 2018); approved for physical work order creation. |
| `commercial_validated` | **Commercial Field Tested** | Verified custom site proposal; approved for physical work order creation. |
| `provisional` | **Provisional Draft** | Newly proposed custom variant; **strictly blocked from authorizing work orders**. |
| `rejected` | **Rejected Variant** | Model variant failed consistency audit ($CR \ge 0.10$); disabled. |

---

## 7. Compliance Verification Dispositions (`ComplianceStatus`)

| Disposition Code | Display Label | Regulatory Interpretation |
|---|---|---|
| `compliant` | **Compliant** | Equipment physically inspected and meets all requirements of the governing standard clause. |
| `non_compliant` | **Non-Compliant** | Statutory violation identified; mandatory corrective action work order required. |
| `pending_corrective_action` | **Pending Action** | Defect identified; temporary mitigation active pending major overhaul outage. |
| `not_applicable` | **Not Applicable** | Standard clause does not apply to this equipment design (e.g. economizer rules on un-economized boiler). |
