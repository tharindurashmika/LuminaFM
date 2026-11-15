# Workflow 03: Asset Catalog & Dynamic Attribute Inspection

### WF-03: Asset Catalog & Dynamic Attribute Inspection

**Purpose:** Search, filter, and inspect registered facility equipment; view and modify dynamic category-specific technical attributes (JSONB); review operational meter readings; and export asset inventories to Excel-compatible CSV or JSON.

**Required Role:** Accessible to all roles for read inspection (`Organization Admin`, `Plant Reliability Engineer`, `Boiler Plant Operator`, `Maintenance Technician`). Attribute modification requires `Organization Admin` or `Plant Reliability Engineer`.

**Prerequisites:** Equipment assets seeded or registered in the tenant database.

**Starting Point:** `/assets` (Asset Master Registry).

---

### Procedure

#### Step 1: Navigate to the Asset Master Registry
- Click **Asset Registry** in the left sidebar menu (or enter `/assets`).
- The Asset Master Registry page loads with a search bar, filter pills, tabular equipment list, and summary metrics.

```carousel
![Asset Master Registry Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/ASSET-001-asset-registry-list.png)
<!-- slide -->
![Asset Master Registry Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/ASSET-001-asset-registry-list-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Filter & Search Toolbar)**: Search text input, Site selector, Equipment Category dropdown, and Operating Status filter.
- **Marker 2 (Asset Master Table)**: Tabular inventory showing Asset Code, Asset Name, Category, Criticality badge, Status badge, and Runtime hours.
- **Marker 3 (Export & Action Buttons)**: Buttons to export data (`Export CSV`, `Export JSON`) and open asset detail drawers.

---

#### Step 2: Filter Equipment by Category and Status
1. In the **Category Filter** dropdown, select `Boilers` (or `Chillers`, `Pumps`).
2. In the **Status Filter** dropdown, select `In Service`.
3. In the **Search Box**, type `BLR-001` or `Steam Boiler`.
4. Observe the table dynamically updating to show matching equipment cards.

---

#### Step 3: Open the Slide-Over Asset Detail Drawer
1. Click on the row for **BLR-001** (or click the **Inspect** button on the right edge of the row).
2. The `AssetDetailDrawer` slides out smoothly from the right viewport.
3. The underlying table is dimmed with a dark backdrop overlay.

```carousel
![Asset Detail Drawer Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/ASSET-002-asset-detail-drawer.png)
<!-- slide -->
![Asset Detail Drawer Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/ASSET-002-asset-detail-drawer-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Dimmed Table Backdrop)**: Background dimming focus on active asset inspection.
- **Marker 2 (Slide-Over Drawer Container)**: Panel header showing Asset Code (`BLR-001`), Criticality, Status, and close button (X).
- **Marker 3 (Dynamic Technical Specifications)**: JSONB attribute renderer showing category-specific engineering parameters.
- **Marker 4 (Operating Meters & WO History)**: Tabular telemetry readouts for cumulative operating runtime and linked work order tickets.

---

#### Step 4: Inspect & Edit Dynamic Technical Specifications (JSONB)
1. In the drawer, locate the **Dynamic Technical Attributes** section.
2. Review category-specific attributes:
   - **Design Pressure**: `10.5 bar`
   - **Nominal Steam Evaporation**: `1,100 kg/h`
   - **Primary Burner Fuel**: `Heavy Fuel Oil (HFO)`
   - **Heating Surface Area**: `28.4 m²`
   - **Flue Gas Economizer Fitted**: `true`
3. *If modifications are required (Engineer/Admin only)*: Click **Edit Attributes**.
4. Update the values in the inline form controls (dirty values are highlighted).
5. Click **Save Changes**. A confirmation message confirms that dynamic attributes were updated.

---

#### Step 5: Review Operating Meters & Export Inventory
1. Scroll down to the **Operating Meters** ledger in the drawer:
   - Operating Hours: `11,420.5 hrs`
   - Steam Generated: `14,850 tonnes`
   - Thermal Efficiency: `84.2%`
2. Click the **Close (X)** button or press `Escape` to dismiss the drawer.
3. In the top toolbar, click **Export to CSV**.
4. The browser automatically downloads `lumina_asset_master_YYYY-MM-DD.csv` encoded with UTF-8 BOM for Microsoft Excel compatibility.

---

**Expected Result:** The user inspects asset specifications, edits dynamic parameters, verifies operating meters, and downloads a clean Excel-ready inventory report.

**Common Problems & Practical Solutions:**
- *Problem*: "Edit Attributes" button is missing.
  *Solution*: The active role is set to Operator or Technician. Switch active persona to `Plant Reliability Engineer` or `Organization Admin` to unlock editing.
- *Problem*: CSV export opens in Excel with garbled special characters (e.g. `m²`, `°C`).
  *Solution*: LuminaFM automatically prepends a UTF-8 Byte Order Mark (`\uFEFF`) to prevent this. Ensure Excel is opening the file with standard UTF-8 delimiters.

**Related Workflows:**
- [WF-04: Dual Equipment Hierarchy Navigation](file:///e:/My%20Owns/docs/user-manual/05-workflows/04-equipment-hierarchies.md)
- [WF-05: Preventive Maintenance Scheduling](file:///e:/My%20Owns/docs/user-manual/05-workflows/05-preventive-maintenance-scheduling.md)
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
