# Workflow 07: Work Order Resource Tracking (Tasks, Labor, Parts)

### WF-07: Work Order Resource Tracking (Tasks, Labor, Parts)

**Purpose:** Complete ordered execution checklist items, record technician labor hours with billing rates, log spare parts consumed from stock inventory, and review automatic financial cost calculations committed against facility cost centers.

**Required Role:** `Maintenance Technician` (Execution & logging), `Plant Reliability Engineer` (Review & approval), `Organization Admin` (Financial review).

**Prerequisites:** An authorized work order ticket in `in_progress` status.

**Starting Point:** `/work-orders` (Work Orders Management).

---

### Procedure

#### Step 1: Open Work Order Detail Modal
- Navigate to `/work-orders`.
- Locate the active ticket (e.g. `WO-001: Main Steam Boiler Annual Overhaul`).
- Click **Details** (or click the card in Kanban view) to open the `WorkOrderDetailModal` (`WO-004`).

```carousel
![Work Order Detail Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/WO-004-work-order-detail-modal.png)
<!-- slide -->
![Work Order Detail Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-004-work-order-detail-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Header & Status)**: Ticket sequence number, description, and `in_progress` state indicator.
- **Marker 2 (Task Checklist Section)**: Scrollable checklist of numbered mechanical tasks.
- **Marker 3 (Labor Hours Tracking)**: Technician assignment and logged labor hours.
- **Marker 4 (Parts Inventory & Cost Ledger)**: Consumed spare parts summary and 4-column cost breakdown.

---

#### Step 2: Complete Sequential Execution Tasks
1. In the **Execution Task Checklist** section, review the tasks:
   - Task #1: `Perform mechanical and electrical LOTO isolation`
   - Task #2: `Inspect boiler fireside tubes and measure soot accumulation`
   - Task #3: `Clean burner nozzle and replace ignition electrodes`
2. As each mechanical action is performed in the plant, click the task checkbox or status toggle.
3. Observe the task status shifting from `pending` (Slate) $\rightarrow$ `in_progress` (Gold) $\rightarrow$ `completed` (Emerald).
4. Verify all mandatory tasks are marked `completed` before closing the ticket.

---

#### Step 3: Record Technician Labor Hours
1. In the **Labor Tracking** section, select the executing technician: `Marcus Vance (Mechanical Technician)`.
2. Input **Actual Hours Worked**: `6.5 Hours`.
3. Verify the billing labor rate is pre-populated: `$45.00 / Hour`.
4. The system computes internal labor spend:
   $$\text{Labor Cost} = 6.5\text{ hrs} \times \$45.00/\text{hr} = \$292.50$$
5. Click **Add Labor Entry**.

---

#### Step 4: Record Spare Parts Inventory Consumption
1. In the **Spare Parts Consumed** section, select the replacement item:
   - Part SKU: `GSK-SPIRAL-4IN-300#` (Spiral Wound Gasket, 4-inch 300#)
   - Requisitioned Quantity: `2 Units`
   - Unit Inventory Cost: `$18.50 / Unit`
2. Click **Log Part Consumption**.
3. Select any additional parts:
   - Part SKU: `NOZ-BURN-HFO-1100` (Burner Atomizer Nozzle Tip)
   - Quantity: `1 Unit`
   - Unit Cost: `$85.00`
4. The system calculates cumulative parts cost:
   $$\text{Parts Cost} = (2 \times \$18.50) + (1 \times \$85.00) = \$122.00$$

---

#### Step 5: Review Real-Time Financial Cost Ledger
1. Scroll to the **Financial Cost Breakdown** card at the bottom of the modal:
   - **Labor Cost**: `$292.50`
   - **Parts Cost**: `$122.00`
   - **Contractor Cost**: `$0.00`
   - **Total Work Order Cost**: `Bold Gold $414.50`
2. Click **Save Changes** and close the modal.
3. Navigate to **Maintenance Cost Analysis** via the sidebar or `/cost-analysis` (`COST-001`).

```carousel
![Maintenance Cost Analysis Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/COST-001-maintenance-cost-analysis.png)
<!-- slide -->
![Maintenance Cost Analysis Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/COST-001-maintenance-cost-analysis-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Executive Cost Summary)**: Total Maintenance Spend ($14,850), Planned vs Unplanned cost split, and Proactive Ratio ($72.4\%$).
- **Marker 2 (Cost Breakdown by Category)**: Proportional charts for Labor ($42\%$), Spare Parts ($38\%$), and External Contractors ($20\%$).
- **Marker 3 (Asset Cost Center Table)**: Tabular ledger ranking top facility spenders (`BLR-001`, `CHL-001`).

4. Verify that the `$414.50` expenditure has been automatically committed to the `BLR-001` asset cost center.

---

**Expected Result:** Tasks, technician labor hours, and spare parts are logged to the ticket; costs are rolled up into the financial ledger; and the facility cost analysis dashboard reflects accurate proactive maintenance ratios.

**Common Problems & Practical Solutions:**
- *Problem*: Spare part SKU not found in dropdown.
  *Solution*: Verify that the part is registered in the active inventory master table. Non-stock parts can be recorded under contractor or miscellaneous expenditure.
- *Problem*: Cannot save labor hours with error `"Labor hours cannot be negative or zero"`.
  *Solution*: Enter a positive decimal value (e.g. `0.5`, `1.0`, `4.5`).

**Related Workflows:**
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-08: Inspections & Fault Escalation](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md)
- [WF-16: Enterprise Compliance Audit](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md)
