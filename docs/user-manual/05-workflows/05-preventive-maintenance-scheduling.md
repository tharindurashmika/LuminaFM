# Workflow 05: Preventive Maintenance Scheduling & Work Order Dispatch

### WF-05: Preventive Maintenance Scheduling & Work Order Dispatch

**Purpose:** Review upcoming and overdue preventive maintenance (PM) routines on an interactive monthly calendar grid, inspect recurring maintenance intervals, and execute on-demand work order generation directly from scheduled PM tickets.

**Required Role:** `Plant Reliability Engineer`, `Organization Admin`, or `Maintenance Technician` (`work_orders:read` and `work_orders:manage`).

**Prerequisites:** Preventive maintenance plans and schedules configured for plant equipment.

**Starting Point:** `/maintenance-calendar` (Preventive Maintenance Planning).

---

### Procedure

#### Step 1: Navigate to Maintenance Planning & Calendar
- In the sidebar navigation menu, click **Maintenance Planning** (or enter `/maintenance-calendar`).
- The page renders with top KPI counter cards (`Total PM Schedules: 18`, `Due This Month: 6`, `Overdue PMs: 1`, `Compliance Rate: 94.4%`) and a dual-view switcher:
  1. **Calendar View** (`CAL-001`)
  2. **Schedules View** (`CAL-002`)

```carousel
![Maintenance Calendar Grid Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/CAL-001-maintenance-calendar-grid.png)
<!-- slide -->
![Maintenance Calendar Grid Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/CAL-001-maintenance-calendar-grid-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (PM Planning Metrics Bar)**: Metric summary cards showing total PM routines, active schedules, and overdue counts.
- **Marker 2 (Month Navigation & View Switcher)**: Controls to toggle between Calendar Month Grid and Tabular Schedules List.
- **Marker 3 (Interactive Month Calendar Grid)**: 7-day grid displaying scheduled maintenance events with color-coded priority dots.

---

#### Step 2: Inspect Scheduled PM Events on the Calendar Grid
1. In the **Calendar View**, locate the current month.
2. Observe scheduled PM markers on calendar days:
   - **Emerald Pill**: Low/Medium priority routines (e.g. `Weekly Sight Glass Blowdown`).
   - **Gold Pill**: High priority routines (e.g. `Monthly Burner Firing Inspection`).
   - **Rose Pill**: Critical/Overdue routines (e.g. `Quarterly SRV Pop Test`).
3. Click on any event marker (e.g., `Quarterly Burner Overhaul` on the 18th).
4. A detail popover appears displaying:
   - Target Asset: `BLR-001: Main Steam Boiler`
   - Plan Title: `Quarterly Burner Overhaul & Air-Fuel Ratio Tuning`
   - Due Date: `2026-11-18`
   - Estimated Duration: `4.0 Hours`

---

#### Step 3: Switch to the Recurring Schedules List
1. In the top-right toolbar, click the **Schedules** tab (`CAL-002`).
2. The view shifts from the grid to a structured tabular registry of all recurring PM routines.

```carousel
![Maintenance Schedules List Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/CAL-002-maintenance-schedules-list.png)
<!-- slide -->
![Maintenance Schedules List Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/CAL-002-maintenance-schedules-list-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Active Schedules Tab Header)**: Registry of recurring time-based and meter-based maintenance routines.
- **Marker 2 (Schedules Table)**: Lists Schedule Title, Equipment Asset Code, Recurrence Interval (`Every 90 Days`), and Next Due Date.
- **Marker 3 (On-Demand Dispatch Trigger)**: Action button (`Generate Work Order`) to spawn an active ticket immediately.

---

#### Step 4: Dispatch an On-Demand Work Order from a PM Routine
1. Locate the schedule for **Quarterly Burner Overhaul** (`BLR-001`).
2. Verify that its Next Due Date is approaching or current.
3. On the right side of the row, click the gold **Generate Work Order** button.
4. The system executes an atomic API call:
   - Evaluates the schedule template.
   - Generates a new Work Order sequence number (e.g. `WO-2026-0045`).
   - Populates standard task checklist items and parts requisitions from the PM plan.
   - Updates the schedule's `lastGeneratedDate` to today's timestamp.
5. An inline success notification appears: `"Work Order WO-2026-0045 generated successfully"`.

---

#### Step 5: Verify Generated Work Order in Ticket Registry
1. Click the notification link or navigate to **Work Orders** (`/work-orders`).
2. Verify that the new ticket `WO-2026-0045` appears in the `draft` or `open` column.
3. Observe that the ticket is linked directly to the parent PM plan and equipment asset.

---

**Expected Result:** The user identifies scheduled preventive maintenance tasks, reviews execution timelines, and converts a recurring schedule into an active, actionable work order with pre-filled checklists.

**Common Problems & Practical Solutions:**
- *Problem*: Calendar grid displays an empty view for the current month.
  *Solution*: Use the previous/next month navigation arrows (`<` / `>`) to navigate to the period where schedules were created.
- *Problem*: "Generate Work Order" button displays `"Already Dispatched"`.
  *Solution*: If an open work order already exists for the current PM interval, duplicate dispatch is blocked to prevent duplicate technician assignments.

**Related Workflows:**
- [WF-03: Asset Catalog & Dynamic Attributes](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md)
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-07: Work Order Resource Tracking](file:///e:/My%20Owns/docs/user-manual/05-workflows/07-work-order-resource-tracking.md)
