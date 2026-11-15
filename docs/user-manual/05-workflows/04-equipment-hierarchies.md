# Workflow 04: Dual Equipment Hierarchy Navigation

### WF-04: Dual Equipment Hierarchy Navigation

**Purpose:** Explore and verify facility equipment relationships across two complementary structural perspectives: the **Physical Location Hierarchy** (geographic placement: Site $\rightarrow$ Building $\rightarrow$ Room $\rightarrow$ Equipment) and the **System Process Loop Hierarchy** (functional engineering loops: Steam, Condensate, Chilled Water), inspecting child asset counts and upstream/downstream dependencies.

**Required Role:** Accessible to all authenticated facility personnel (`Organization Admin`, `Plant Reliability Engineer`, `Boiler Plant Operator`, `Maintenance Technician`).

**Prerequisites:** Physical facility locations and process systems mapped in the asset database.

**Starting Point:** `/hierarchies` (Equipment Hierarchies & Process DAGs).

---

### Procedure

#### Step 1: Navigate to Equipment Hierarchies
- In the left sidebar navigation, click **Equipment Hierarchies** (or enter `/hierarchies`).
- The page renders with a dual-tab switcher:
  1. **Physical Location DAG** (`HIER-001`)
  2. **System & Process Loop DAG** (`HIER-002`)

```carousel
![Physical Location DAG Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/HIER-001-hierarchy-physical-dag.png)
<!-- slide -->
![Physical Location DAG Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/HIER-001-hierarchy-physical-dag-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Hierarchy Dual-Tab Bar)**: Switcher between Physical Location DAG and Process Loop DAG.
- **Marker 2 (Interactive Tree Structure)**: Expandable/collapsible node tree representing geographic containment.
- **Marker 3 (Selected Node Inspector Card)**: Detail pane displaying selected location metadata, asset count, and child equipment list.

---

#### Step 2: Explore the Physical Location Tree
1. On the **Physical Location DAG** tab, observe the root level: `Main Campus`.
2. Click the chevron next to `Main Campus` to expand its buildings:
   - `Central Utilities Plant (CUP)`
   - `Main Hotel Tower`
   - `Banquet & Laundry Complex`
3. Click the chevron next to `Central Utilities Plant` to expand rooms:
   - `Basement Boiler Room B-01`
   - `Pump Skid Enclosure B-01`
   - `Central Chiller Plant Room`
4. Click on `Basement Boiler Room B-01`.
5. Observe the **Node Inspector Pane** on the right side:
   - Location Code: `LOC-ROOM-B01`
   - Total Assets Stationed: `2 Assets`
   - Contained Assets: `BLR-001 (Main Steam Boiler)`, `BLR-002 (Auxiliary Steam Boiler)`
   - Criticality Summary: 2 Critical equipment assets located in this room.

---

#### Step 3: Switch to the System & Process Loop Hierarchy
1. Click the **System & Process Loop DAG** tab (`HIER-002`).

```carousel
![Process Loop DAG Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/HIER-002-hierarchy-process-dag.png)
<!-- slide -->
![Process Loop DAG Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/HIER-002-hierarchy-process-dag-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Process Hierarchy Tab Indicator)**: Active tab indicator for thermodynamic process loops.
- **Marker 2 (Process System Loop Tree)**: Engineering loops: High-Pressure Steam, Condensate Return, Boiler Feedwater, Chilled Water.
- **Marker 3 (Process Loop Node Detail)**: Inspector card detailing loop design pressure, operating temperature, and associated loop assets.

---

#### Step 4: Trace Upstream & Downstream Process Dependencies
1. Expand the `High-Pressure Steam Supply System (10.5 bar)` loop node.
2. Observe child functional sub-loops:
   - `Main Steam Header Distribution Loop A`
   - `Auxiliary Steam Supply Header B`
3. Expand `Main Steam Header Distribution Loop A` to view attached machinery:
   - `BLR-001: Main High-Pressure Steam Boiler` (Generation source)
   - `PRV-001: Steam Pressure Reducing Station` (Distribution valve)
   - `CAL-001: Laundry Steam Calorifier Heat Exchanger` (End consumer)
4. Click on `BLR-001` within the process tree to inspect its functional flow metadata.

---

**Expected Result:** The user understands the physical location where the equipment resides (for physical dispatch and LOTO isolation) as well as its process loop connections (for hydraulic and thermodynamic disruption impact analysis).

**Common Problems & Practical Solutions:**
- *Problem*: Tree node does not expand when clicking on the text label.
  *Solution*: Click directly on the chevron arrow icon (`>`) adjacent to the node icon to toggle expansion.
- *Problem*: An asset appears in the Physical DAG but is missing from the Process Loop DAG.
  *Solution*: Ensure the asset record has a defined `systemLoopId` or `processCode` configured in its master metadata.

**Related Workflows:**
- [WF-03: Asset Catalog & Dynamic Attributes](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md)
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-08: Inspections & Fault Escalation](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md)
