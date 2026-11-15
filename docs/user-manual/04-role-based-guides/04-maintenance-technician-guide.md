# LuminaFM Role User Manual: Maintenance Technician

### Maintenance Technician Operational Manual

```carousel
![Work Orders Kanban Board Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-002-work-orders-kanban.png)
<!-- slide -->
![Work Order Detail Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-004-work-order-detail-modal-annotated.png)
```

---

## 1. Role Overview & Core Responsibilities

The **Maintenance Technician** serves as the Field Mechanical Millwright, Certified Electrical Technician, or HVAC Service Specialist. This role executes physical maintenance tickets, performs equipment overhauls, and documents labor and parts:

- **Work Order Execution**: Receiving authorized maintenance work orders, moving tickets across the Kanban lifecycle, and logging execution justifications.
- **Task Checklist Completion**: Checking off sequential technical tasks (LOTO isolation, disassembly, cleaning, seal replacement, realignment, leak testing).
- **Resource Tracking (Labor & Parts)**: Recording actual labor hours worked, logging spare parts consumed from stock inventory (gaskets, bearings, nozzles), and auditing job totals.
- **Evidence Documentation**: Capturing and uploading pre-repair and post-repair equipment photographs and test charts to the Evidence Vault.
- **Defect Escalation**: Escalating equipment faults identified during preventive rounds into corrective work orders.

---

## 2. Login & First Access

1. Navigate to `/login`.
2. Input technician credentials:
   - Email: `chief.engineer@colombohotel.lk`
   - *Quick Shortcut*: Click the **Maintenance Tech** quick-login button.
3. Click **Sign In to Facility**.
4. In the top-right header, confirm that the **Active Role Badge** renders in an Amber tone (`bg-amber-950/70 text-amber-300 border-amber-500/40`) with the label **Maintenance Technician**.
5. Navigate to **Work Orders** via the sidebar or `/work-orders`.

---

## 3. Relevant Dashboard: Work Orders Kanban Board & Resource Detail

The Maintenance Technician's primary operational workspace is the **Work Orders Kanban Board (`/work-orders`)** (`WO-002`):
- Lifecycle columns: `Draft` $\rightarrow$ `Open` $\rightarrow$ `Approved` $\rightarrow$ `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Completed`.
- Drag-and-drop ticket cards displaying equipment code, priority, title, and assigned technician.
- Filter tickets by priority (`urgent`, `high`, `medium`, `low`) or assigned technician.

```carousel
![Work Orders List View Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-001-work-orders-list.png)
<!-- slide -->
![Work Orders Kanban Board Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-002-work-orders-kanban-annotated.png)
```

**Numbered Callout Descriptions (`WO-002`):**
- **Marker 1 (Kanban Column Headers)**: Lifecycle stage headers with live card counters.
- **Marker 2 (Work Order Cards)**: Interactive cards showing WO number, asset code (`BLR-001`), priority badge, and cost total.
- **Marker 3 (Terminal States Column)**: Dedicated column displaying closed and cancelled records.

---

## 4. Accessible Modules & Navigation Scope

The Maintenance Technician has access to work execution and asset inspection modules:

| Module Name | Route | Operational Capability | Access Level |
|---|---|---|:---:|
| **Command Center** | `/` | View plant availability and operational alerts | Read-Only |
| **Asset Master** | `/assets` | Inspect equipment specs and dynamic attributes | Read-Only |
| **Equipment Hierarchies** | `/hierarchies` | Inspect physical and process locations | Read-Only |
| **Maintenance Calendar** | `/maintenance-calendar` | Inspect scheduled PM events | Read-Only |
| **Work Orders** | `/work-orders` | Execute tickets, log labor/parts, complete tasks | Full Access |
| **Inspections & Faults** | `/inspections` | Review inspection checklists, dispatch fault WOs | Full Access |
| **Boiler Logbook** | `/daily-monitoring` | Review shift entries and historical archive | Read-Only |
| **Floor Operator Kiosk** | `/operator` | Touch kiosk, QR scanner, glove numpad | Full Access |
| **Decision & Reporting** | `/reports` | Inspect ANP priorities and alert history | Read-Only |
| **Audit & Evidence** | `/audit-evidence` | Upload repair photos and calibration files | Upload Allowed |
| **Cost Analytics** | `/cost-analysis` | Financial spend analysis | **FORBIDDEN (403)** |
| **Decision Governance** | `/governance` | ANP model administration | **FORBIDDEN (403)** |
| **White-Label & Settings** | `/settings` | Corporate settings and branding | **FORBIDDEN (403)** |

---

## 5. Daily Tasks & Practical User Training

### Morning Maintenance Routine (08:00 - 12:00)
1. **Review Assigned Tickets on Kanban Board**:
   - Open `/work-orders` and switch to the **Kanban Board** (`WO-002`).
   - Locate tickets in the **Assigned** column carrying your name (e.g. `WO-001: Main Steam Boiler Annual Overhaul`).
2. **Transition Ticket to In Progress**:
   - Click the card to open `WorkOrderDetailModal` (`WO-004`).
   - Click the gold button: **Transition to IN_PROGRESS**.
   - In the mandatory reason modal, input:
     `"Commencing mechanical isolation and safety lock-out/tag-out."`
   - Click **Confirm State Transition**. The ticket moves to the **In Progress** column.
3. **Execute Physical Repair & Complete Checklists**:
   - Head to the plant floor (e.g. Basement Boiler Room B-01).
   - In the modal, check off sequential tasks as completed:
     - [x] `#1: Perform mechanical and electrical LOTO isolation`
     - [x] `#2: Inspect boiler fireside tubes and measure soot accumulation`
     - [x] `#3: Clean burner nozzle and replace ignition electrodes`
   - Observe task pills shifting from `pending` (Slate) to `completed` (Emerald).

### Afternoon Resource Logging & Closeout (13:00 - 16:30)
1. **Log Technician Labor Hours**:
   - In the **Labor Hours** section of `WorkOrderDetailModal`, select your name.
   - Enter actual hours worked: `4.5 Hours`.
   - The system computes labor cost ($4.5\text{ hrs} \times \$45.00/\text{hr} = \$202.50$).
2. **Log Consumed Spare Parts**:
   - Select consumed inventory items:
     - Part SKU: `GSK-SPIRAL-4IN-300#` | Quantity: `2` | Cost: `$18.50/ea` ($=\$37.00$).
   - Click **Log Part Consumption**.
3. **Upload Photographic Repair Evidence**:
   - Open `/audit-evidence` $\rightarrow$ **Evidence Vault** (`AUDIT-002`).
   - Click **Upload Evidence Attachment** (`AUDIT-003`).
   - Upload post-repair photo (e.g. `blr-001-post-soot-clean.jpg`).
   - Set category to `equipment_photo` and bind to Work Order `WO-001`.
4. **Transition Ticket to Completed**:
   - Return to `WorkOrderDetailModal` on `/work-orders`.
   - Click **Transition to COMPLETED**.
   - In the reason field, input:
     `"Completed fireside cleaning, new gaskets installed, passed hydrostatic leak check nominal."`
   - Click **Confirm State Transition**.
   - The ticket moves to the **Completed** column awaiting supervisory engineering signoff.

---

## 6. Important Workflows for This Role

- [**WF-06: Work Order Execution & Lifecycle**](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md): Moving tickets across the state machine.
- [**WF-07: Work Order Resource Tracking (Tasks, Labor, Parts)**](file:///e:/My%20Owns/docs/user-manual/05-workflows/07-work-order-resource-tracking.md): Logging hours, parts, and costs.
- [**WF-08: Inspection Walkthrough & Fault Escalation**](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md): Escalating defects into work orders.
- [**WF-16: Enterprise Compliance Audit**](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md): Uploading evidence photographs to the vault.

---

## 7. Restricted Operations & Common Errors

### Restricted Operations
- **Closing Work Orders (`completed` $\rightarrow$ `closed`)**: Technicians **cannot execute final ticket closure**. Once a technician marks a ticket `completed`, it must be reviewed and closed by a `Plant Reliability Engineer` or `Organization Admin` to verify quality and financial accuracy.
- **Forbidden Modules**: Attempting to navigate to `/cost-analysis`, `/governance`, or `/settings` triggers the `ForbiddenState` (HTTP 403 Forbidden).
- **PM Plan Modification**: Technicians cannot modify recurring PM schedules or delete asset records.

### Common Errors & Solutions
- *Error*: `"Forbidden: You do not have permission to transition ticket to CLOSED"`.
  *Solution*: Final ticket closure requires supervisory engineering authority. Once you transition the ticket to `completed`, notify the Plant Reliability Engineer to execute final signoff.
- *Error*: `"State transition requires non-empty justification"`.
  *Solution*: Enter at least 5 characters into the justification text area explaining what mechanical repair was performed before confirming the transition.
- *Error*: `"Labor hours must be greater than zero"`.
  *Solution*: Enter a positive decimal number (e.g. `2.0`, `4.5`) in the labor hours input.
