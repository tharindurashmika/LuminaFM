# Workflow 06: Work Order Execution & Lifecycle State Machine

### WF-06: Work Order Execution & Lifecycle State Machine

**Purpose:** Initiate authorized maintenance tickets, manage task flows across List and Kanban board views, execute strict state-machine status transitions, and enforce regulatory non-repudiation by recording mandatory technical justifications for all state changes.

**Required Role:** `Plant Reliability Engineer`, `Organization Admin`, or `Maintenance Technician` (`work_orders:manage`).

**Prerequisites:** Equipment assets registered in the tenant database.

**Starting Point:** `/work-orders` (Work Orders Management).

---

### Procedure

#### Step 1: Open the Work Orders Management Page
- In the left sidebar navigation, click **Work Orders** (or enter `/work-orders`).
- The page renders with a top metrics ribbon (`Total Orders: 24`, `In Progress: 5`, `High/Critical: 3`), search and filter controls, and a view mode toggle:
  1. **Tabular List View** (`WO-001`)
  2. **Interactive Kanban Board** (`WO-002`)

```carousel
![Work Orders List View Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-001-work-orders-list.png)
<!-- slide -->
![Work Orders List View Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-001-work-orders-list-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (View Switcher Toolbar)**: Toggle buttons for Tabular List view and Kanban Board view.
- **Marker 2 (Filter & Search Bar)**: Search text input, Status filter, Priority filter, and column sort triggers.
- **Marker 3 (Work Orders Data Table)**: Comprehensive table displaying WO Number, Target Asset, Title, Priority badge, Status badge, Assigned Tech, and Action trigger.

---

#### Step 2: Create a New Authorized Work Order
1. In the top-right toolbar, click the **+ New Work Order** button.
2. The `CreateWorkOrderModal` opens (`WO-003`).

```carousel
![Create Work Order Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-003-create-work-order-modal.png)
<!-- slide -->
![Create Work Order Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-003-create-work-order-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Modal Header)**: Dialog title `"Create Authorized Facility Work Order"`.
- **Marker 2 (Title & Scope Inputs)**: Form fields for summary title and detailed mechanical scope description.
- **Marker 3 (Priority & Labor Inputs)**: Priority dropdown selector and estimated labor hours input.
- **Marker 4 (Submit Trigger)**: Primary blue button submitting creation payload.

3. Complete the form:
   - **Work Order Title**: `Feedwater Pump P-001 Mechanical Seal Overhaul`
   - **Technical Scope**: `Isolate suction/discharge manual valves. Lockout motor circuit breaker at MCC-01. Replace mechanical seal cartridge and align coupling.`
   - **Priority**: Select `urgent` (or `high`).
   - **Estimated Labor (Hours)**: Enter `3.5`.
4. Click **Create Work Order**.
5. The modal dismisses and the new ticket is created in `draft` status with sequence number `WO-2026-0046`.

---

#### Step 3: Switch to the Interactive Kanban Board
1. In the view mode toolbar, click **Kanban Board** (`WO-002`).
2. The view shifts to 6 lifecycle columns:
   - `Draft` $\rightarrow$ `Open` $\rightarrow$ `Approved` $\rightarrow$ `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Completed`

```carousel
![Work Orders Kanban Board Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-002-work-orders-kanban.png)
<!-- slide -->
![Work Orders Kanban Board Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-002-work-orders-kanban-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Kanban Column Headers)**: Colored status headers with live card counters.
- **Marker 2 (Work Order Cards)**: Touch-draggable cards rendering WO number, asset code, priority pill, title, and cost total.
- **Marker 3 (Terminal States Column)**: Dedicated column displaying closed and cancelled records.

---

#### Step 4: Open Work Order Detail & State Machine Controls
1. Click on the card for **WO-2026-0046** in the Kanban board (or click **Details** in the List view).
2. The `WorkOrderDetailModal` opens (`WO-004`).

```carousel
![Work Order Detail Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-004-work-order-detail-modal.png)
<!-- slide -->
![Work Order Detail Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-004-work-order-detail-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Header & Context)**: WO number, title, and target asset (`P-001`).
- **Marker 2 (State Machine & Action Bar)**: Shows Current State (`draft`) and dynamic transition triggers (`Transition to OPEN`, `Transition to CANCELLED`).
- **Marker 3 (Task Checklist)**: Ordered operational checklist items.
- **Marker 4 (Cost Ledger)**: Financial cost summary.

---

#### Step 5: Execute State Machine Transition with Mandatory Justification
1. In the **Allowed State Transitions** box, click the gold button: **Transition to OPEN**.
2. The `WorkOrderStatusTransitionModal` appears.
3. In the **Transition Notes / Justification Reason** field, input:
   `"Verified work scope with operations; ready for maintenance planner review."`
4. Click **Confirm State Transition**.
5. The modal dismisses. The work order state updates to `open`.
6. Repeat the process to transition through the required lifecycle:
   - `open` $\rightarrow$ `approved`: Reason: `"Approved by Reliability Engineer."`
   - `approved` $\rightarrow$ `assigned`: Reason: `"Assigned to Senior Mechanical Technician John Doe."`
   - `assigned` $\rightarrow$ `in_progress`: Reason: `"Technician on site; isolation confirmed."`
   - `in_progress` $\rightarrow$ `completed`: Reason: `"Seal installed, pump test run nominal."`
   - `completed` $\rightarrow$ `closed`: Reason: `"Supervisory signoff complete."`

---

**Expected Result:** The work order advances systematically through each validated lifecycle state, with all transitions and user justifications permanently preserved in the audit log.

**Common Problems & Practical Solutions:**
- *Problem*: Clicking a transition button displays `"Transition rejected: invalid next state"`.
  *Solution*: LuminaFM enforces a strict finite state machine. A ticket cannot skip states (e.g. `draft` directly to `completed` is blocked). Follow the sequential progression.
- *Problem*: Cannot transition from `completed` to `closed`.
  *Solution*: The `closed` terminal state requires `Organization Admin` or `Plant Reliability Engineer` privileges. Technicians cannot close tickets without supervisory signoff.

**Related Workflows:**
- [WF-05: Preventive Maintenance Scheduling](file:///e:/My%20Owns/docs/user-manual/05-workflows/05-preventive-maintenance-scheduling.md)
- [WF-07: Work Order Resource Tracking](file:///e:/My%20Owns/docs/user-manual/05-workflows/07-work-order-resource-tracking.md)
- [WF-08: Inspections & Fault Escalation](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md)
