# Workflow 08: Inspection Walkthrough & Fault Escalation

### WF-08: Inspection Walkthrough & Fault Escalation

**Purpose:** Review certified walkthrough inspection logs, inspect individual checkpoint compliance scores and visual anomalies, evaluate observed equipment defects on the Fault History register, and escalate critical faults directly into authorized corrective maintenance work orders.

**Required Role:** `Boiler Plant Operator`, `Plant Reliability Engineer`, or `Maintenance Technician` (`work_orders:read` and `work_orders:manage`).

**Prerequisites:** Walkthrough inspections performed and logged against facility machinery.

**Starting Point:** `/inspections` (Walkthrough Inspections & Faults).

---

### Procedure

#### Step 1: Open Inspections & Faults Management
- In the left sidebar navigation, click **Inspections & Faults** (or enter `/inspections`).
- The page renders with a top metrics ribbon (`Total Inspections: 32`, `Pass Rate: 93.8%`, `Open Faults: 2`, `Escalated to WO: 6`) and a dual-tab switcher:
  1. **Inspections Tab** (`INSP-001`)
  2. **Fault History Tab** (`INSP-003`)

```carousel
![Walkthrough Inspections Table Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/INSP-001-inspections-list.png)
<!-- slide -->
![Walkthrough Inspections Table Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/INSP-001-inspections-list-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Inspection Tabs & Filters)**: Switcher between Inspections and Faults, with result filter (`PASS`, `FAIL`, `WARNING`).
- **Marker 2 (Inspections Data Table)**: Register displaying Inspection Number, Asset Code, Inspector Name, Date, Overall Result, and Score ($94\%$).
- **Marker 3 (Inspect Checklist Trigger)**: Eye icon button opening checkpoint responses modal.

---

#### Step 2: Open Inspection Detail Modal & Inspect Checkpoints
1. On row `INSP-2026-001` (Main Steam Boiler Walkthrough), click the **Inspect** button (eye icon).
2. The `InspectionDetailModal` opens (`INSP-002`).

```carousel
![Inspection Detail Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/INSP-002-inspection-detail-modal.png)
<!-- slide -->
![Inspection Detail Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/INSP-002-inspection-detail-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Modal Header)**: Inspection code (`INSP-2026-001`), asset code, inspector credentials, and timestamp.
- **Marker 2 (Score & Result Bar)**: Status strip showing Overall Result (`PASS`), compliance score ($94\%$), and inspector narrative comments.
- **Marker 3 (Checklist Item Responses)**: Scrollable item list showing verified questions, answers, and rose-highlighted anomaly rows.

3. Scroll through the verified checkpoints:
   - Checkpoint: `Sight glass gauge column clear and free of scale` $\rightarrow$ `PASS`
   - Checkpoint: `Feed pump mechanical seal weeping` $\rightarrow$ `ANOMALY: 0.2 mm packing leak` (Highlighted in red)
4. Review inspector signoff notes: `"Minor weeping noted on auxiliary feed pump packing. Main pump nominal."`
5. Click **Close** to return to the inspections table.

---

#### Step 3: Switch to the Fault History Tab
1. Click the **Fault History** tab in the top navigation bar (`INSP-003`).
2. The view shifts to the facility defect register, listing all observed mechanical and electrical abnormalities.

```carousel
![Fault History Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/INSP-003-fault-history-tab.png)
<!-- slide -->
![Fault History Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/INSP-003-fault-history-tab-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Fault History Tab Indicator)**: Active tab indicator displaying facility fault log.
- **Marker 2 (Faults Register Table)**: Columns showing Fault Code (`FLT-0042`), Target Asset, Severity pill (`Major`, `Critical`), Symptoms, and Linked Work Order.
- **Marker 3 (Dispatch WO Action Button)**: Gold action trigger (`Dispatch WO`) allowing 1-click corrective ticket escalation.

---

#### Step 4: Escalate Defect into a Corrective Work Order
1. Locate un-escalated fault `FLT-0042`:
   - Target Asset: `P-001: Multi-Stage Centrifugal Boiler Feed Pump`
   - Severity: `Critical`
   - Observed Symptoms: `Feed pump gland packing gland extrusion and thermal overheating.`
   - Linked Work Order: `No WO linked` (Slate pill)
2. On the far right of the row, click the gold button: **Dispatch WO**.
3. The system executes an atomic defect escalation transaction:
   - Spawns a new Corrective Work Order.
   - Automatically populates the target asset, priority (`urgent`), and defect symptoms into the ticket scope.
   - Updates the fault record with the generated ticket number (`WO-2026-0047`).
4. An inline confirmation toast appears: `"Work Order WO-2026-0047 created from Fault FLT-0042"`.
5. The button updates to an emerald badge: `WO Dispatched`.

---

#### Step 5: Verify Linked Work Order in Work Orders Module
1. Navigate to **Work Orders** (`/work-orders`).
2. Verify that ticket `WO-2026-0047` is present in the `open` column.
3. Open the ticket details to confirm that the fault code `FLT-0042` and symptom notes are pre-filled in the technical scope.

---

**Expected Result:** The user inspects completed walkthrough checklists, identifies equipment defects, and escalates physical faults into formal corrective work orders with traceable audit linkages.

**Common Problems & Practical Solutions:**
- *Problem*: "Dispatch WO" button is replaced with "WO Dispatched" badge.
  *Solution*: The fault has already been escalated to an active work order. Click the linked work order number to view ticket progress.
- *Problem*: Fault list displays empty state.
  *Solution*: Clear any active severity filters in the toolbar, or conduct a new walkthrough inspection that flags an anomaly.

**Related Workflows:**
- [WF-03: Asset Catalog & Dynamic Attributes](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md)
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-09: Desktop 2-Hourly Daily Boiler Logbook Entry](file:///e:/My%20Owns/docs/user-manual/05-workflows/09-daily-boiler-logbook.md)
