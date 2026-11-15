# Workflow 17: Non-Boiler Extensibility (Chiller Telemetry & Isolation Guard)

### WF-17: Non-Boiler Equipment Extensibility (Chiller Telemetry & Isolation)

**Purpose:** Verify the modular extensibility framework of LuminaFM by operating the Centrifugal Water-Cooled Chiller demonstration module (`CHL-001`); inspect specialized HVAC thermodynamic telemetry (Chilled Water Delta-T $\Delta T_{\text{CHW}}$, Operating Coefficient of Performance COP, and Condenser Approach Temperature); execute automated chiller anomaly detection algorithms; and verify the **Cross-Module Model Isolation Guard**, proving that the boiler ANP model is strictly prevented from executing on non-boiler assets unless an independently validated model explicitly supports that equipment category.

**Required Role:** `Plant Reliability Engineer` or `Organization Admin` (`governance:manage` / `assets:read`).

**Prerequisites:** Chiller module registered in tenant configuration and target asset `CHL-001` present.

**Starting Point:** `/` (Executive Command Center Dashboard).

---

### Procedure

#### Step 1: Locate the Chiller Module Card on the Dashboard
- Navigate to the Executive Command Center at `/`.
- Scroll past the top KPI summary ribbon to the **Extensible Equipment Modules** section.
- Locate the **500-Ton Centrifugal Chiller Skid Card** (`ChillerModuleCard`).

```carousel
![Dashboard Overview Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/DASH-001-dashboard-overview.png)
<!-- slide -->
![Dashboard Overview Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/DASH-001-dashboard-overview-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Header Alerts & Role Scope)**: Real-time alert counter and tenant indicator.
- **Marker 2 (Core KPI Metrics Ribbon)**: Plant availability ($98.2\%$), MTBF ($720\text{ hrs}$), active work orders ($5$), and proactive ratio ($72.4\%$).
- **Marker 3 (Extensible Equipment Cards)**: Specialized equipment cards including Boiler Master BLR-001 and Centrifugal Chiller CHL-001.
- **Marker 4 (Active Alert Quick Actions)**: Direct action triggers to inspect ANP decisions or dispatch emergency work orders.

---

#### Step 2: Inspect Specialized Chiller Thermodynamic Telemetry
1. On the `CHL-001` card, inspect the HVAC-specific metrics:
   - **Chilled Water Supply Temperature**: `6.8°C` (Design: $6.7^\circ\text{C}$)
   - **Chilled Water Return Temperature**: `12.4°C` (Design: $12.2^\circ\text{C}$)
   - **Chilled Water Delta-T ($\Delta T_{\text{CHW}}$)**:
     $$\Delta T_{\text{CHW}} = 12.4^\circ\text{C} - 6.8^\circ\text{C} = 5.6^\circ\text{C}\quad (\text{Nominal: } 5.0 - 6.0^\circ\text{C})$$
   - **Operating Coefficient of Performance (COP)**: `5.42` (High-efficiency centrifugal baseline: $> 5.0$)
   - **Refrigerant Suction Pressure**: `3.15 bar (R-134a)`
   - **Condenser Water Approach Temperature**: `1.8°C` (Nominal: $< 2.5^\circ\text{C}$)
2. Verify that the metrics display specialized HVAC units of measure (`TR`, `COP`, `kW/TR`) rather than boiler thermodynamic units (`kg/h`, `bar steam`).

---

#### Step 3: Run Automated Chiller Anomaly Check
1. On the chiller card, click the blue button: **Run Chiller Anomaly Check**.
2. The system executes the chiller-specific thermodynamic rule engine:
   - Evaluates Condenser Approach Temperature vs Fouling Baseline.
   - Evaluates Chilled Water Delta-T against compressor lift curve.
3. The result appears in an inline badge:
   - Status: `NOMINAL OPERATING PROFILE` (Emerald)
   - Diagnostic Note: `"Condenser approach temperature (1.8°C) confirms clean tube bundle. Refrigerant charge nominal."`

---

#### Step 4: Test Cross-Module Isolation Guard (Boiler ANP on Chiller)
1. To test safety isolation, click the deliberate boundary test trigger:
   **Test Boiler ANP Model on Chiller**.
2. The client attempts to dispatch an operational ANP decision calculation targeting `CHL-001` using the boiler decision model code `ANP-BOILER-OPERATIONAL-V1.0`.
3. Observe the **Cross-Module Isolation Guard** in action:
   - The backend service intercepts the execution request at the module boundary.
   - The calculation is immediately halted.
   - A high-visibility security alert modal appears:
     ```
     CROSS-MODULE MODEL GOVERNANCE VIOLATION (BLOCKED)
     Error Code: CMMS_ISOLATION_ERR_403
     Detail: The requested decision model [ANP-BOILER-OPERATIONAL-V1.0] is strictly 
     bound to equipment category [boilers]. Execution against asset CHL-001 
     (category: [chillers]) is prohibited by the LuminaFM Extensibility Contract.
     Reason: Thermodynamic criteria for steam boilers (fire-tube soot accumulation, 
     flue gas exergy loss, steam quality) have no valid mathematical mapping to 
     centrifugal refrigeration vapor-compression cycles.
     ```
4. Verify that no invalid boiler work orders or contaminated decision runs were created.

---

#### Step 5: Verify Shared Platform Services Across Modules
1. Click **View Chiller in Master Registry**.
2. Observe that while the thermodynamic calculation engine is strictly isolated:
   - Asset Master record uses shared tables (`/assets`).
   - Physical location hierarchy links to `LOC-ROOM-CHILLER` (`/hierarchies`).
   - Work orders for compressor motor maintenance route through the shared state machine (`/work-orders`).
   - Financial spend rolls up into the shared facility cost ledger (`/cost-analysis`).

---

**Expected Result:** The user confirms that LuminaFM supports extensible equipment categories with specialized telemetry and diagnostics, while enforcing strict model governance barriers that prevent cross-contamination of specialized decision models.

**Common Problems & Practical Solutions:**
- *Problem*: Chiller card displays `"Module disabled by configuration"`.
  *Solution*: Verify in `organizationSettings` that `enabledModules` includes `chillers`.
- *Problem*: Test Boiler ANP Model button does not produce an error.
  *Solution*: If the error did not trigger, verify that the active database migration has applied the `categoryConstraint` check on the `decision_models` table.

**Related Workflows:**
- [WF-03: Asset Catalog & Dynamic Attributes](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md)
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
- [WF-14: ANP Model Governance & Academic Baseline Validation](file:///e:/My%20Owns/docs/user-manual/05-workflows/14-model-governance-baseline.md)
