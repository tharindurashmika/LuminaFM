# Troubleshooting Guide: Form Validation & Input Errors

This guide addresses form validation failures, data type constraints, out-of-range numerical telemetry alerts, and database uniqueness errors across LuminaFM.

```carousel
![Create Work Order Form](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-003-create-work-order-modal-annotated.png)
<!-- slide -->
![Daily Boiler Logbook Form](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/LOG-001-daily-boiler-logbook-entry-annotated.png)
```

---

## Issue 2.1: Missing Mandatory Sight Glass Water Level Confirmation

**Problem:** In the Daily Boiler Logbook (`/daily-monitoring`), the operator fills in all 2-hourly pressure and temperature readings, but the **Submit Daily Shift Logbook** button remains disabled, or clicking it triggers an error:
> *"Water level verification is mandatory before logbook submission."*

**Possible Cause:**
1. The **Sight Glass Water Level Confirmed** rocker switch was left in the `OFF` position.
2. In accordance with ASME Section I and National Board inspection rules, shift watchkeeping cannot be legally committed without physical confirmation of sight glass water level.

**How to Resolve:**
1. Physically walk to the boiler sight glass column.
2. Blow down the gauge cocks if scheduled; verify water meniscus is clearly visible and surging nominal between middle third gauge lines.
3. On the logbook screen (`LOG-001`), locate the **Safety Checkpoints** section.
4. Toggle the **Sight Glass Water Level Confirmed** switch to `ON` (switch turns Emerald Green).
5. The **Submit Daily Shift Logbook** button unlocks immediately.

**Prevention:** Make sight glass verification the first step of your 2-hourly boiler room walkthrough.

**Escalation:** If the sight glass column is cloudy, broken, or water level is lost, **do not force submission**. Initiate emergency low-water fuel cut-off verification immediately and contact the Lead Reliability Engineer.

---

## Issue 2.2: Out-of-Range Telemetry Alerts & Red Input Borders

**Problem:** While typing telemetry on the floor kiosk (`/operator`) or daily monitoring screen (`LOG-001`), an input card border flashes bright red/amber with warning text:
> *"EXCURSION: Pressure 11.45 bar exceeds MAWP limit (10.50 bar)."*

**Possible Cause:**
1. Operator entered a real plant excursion where steam header pressure, stack temperature, or boiler TDS breached safety limits.
2. Typographical error (e.g. typing `114.5` instead of `11.45` or `1.145`).

**How to Resolve:**
1. Check the physical gauge or transmitter display at the equipment.
2. *If a typographical error*: Tap the input field, use the backspace key on the Glove Numpad (`KIOSK-003`), and re-enter the correct numerical float.
3. *If a genuine plant excursion*:
   - Enter the verified measured value. LuminaFM permits recording true excursions for safety audit tracking.
   - Proceed with submission. The system will record the reading and automatically register an **Operational Abnormality** on `/reports` (`REP-002`) for engineering mitigation.

**Prevention:** Use the **Preset Quick-Tap Buttons** (`0.0`, `5.0`, `10.0`, `10.5` bar) on the Glove Numpad to prevent decimal-point typos.

**Escalation:** Report any verified steam pressure exceeding Maximum Allowable Working Pressure (MAWP) immediately to the control room.

---

## Issue 2.3: Duplicate Record Constraint (`CONFLICT / P2002`)

**Problem:** Submitting an asset creation form, custom model proposal, or equipment tag returns HTTP 409 Conflict:
> *"Error 409 CONFLICT: A record with unique field(s) 'asset_code' already exists."*

**Possible Cause:**
1. Another asset in the tenant database already uses the code (e.g. `BLR-001` or `P-001`).
2. An uppercase/lowercase variant was entered that collides with an existing record.
3. A previously decommissioned asset still occupies the unique identifier.

**How to Resolve:**
1. Change the code to an unused identifier (e.g. change `BLR-001` to `BLR-003` or `BLR-AUX-001`).
2. For model proposals, ensure the model code follows format `ANP-MODULE-CODE-V#.#` (e.g. `ANP-BOILER-TROPICAL-V2.0`).
3. Resubmit the form.

**Prevention:** Check the [Asset Master Registry](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md) search bar before creating new equipment to verify active naming conventions.

**Escalation:** If you believe an old asset should be purged to free its asset code, have the `Organization Admin` verify whether the asset can be hard-deleted or if historical work order integrity requires retaining the code.

---

## Issue 2.4: Dynamic JSONB Specification Type Mismatch (`ATTRIBUTE_VALIDATION_ERROR`)

**Problem:** In the `AssetDetailDrawer` (`ASSET-002`), clicking **Save Changes** on dynamic equipment attributes returns HTTP 400 Bad Request:
> *"Error ATTRIBUTE_VALIDATION_ERROR: Attribute 'design_pressure_bar' expected type 'number', received 'ten point five'."*

**Possible Cause:**
1. Non-numerical characters entered into a numeric float specification field.
2. Malformed JSON entered into a JSONB custom configuration field.
3. Date format does not conform to ISO 8601 (`YYYY-MM-DD`).

**How to Resolve:**
1. Re-open the **Dynamic Technical Specifications** tab in the drawer.
2. Review all fields for type conformity:
   - Numerical fields (`design_pressure_bar`, `steam_capacity_kgh`, `heating_surface_sqm`): Use digits only with an optional decimal point (e.g. `10.5`, `1100`, `28.4`).
   - Boolean toggles: Use the interactive switch (`true` / `false`).
   - Dates: Use the interactive date picker or format `YYYY-MM-DD`.
3. Click **Save Changes**.

**Prevention:** Let the dynamic renderer validate fields on-blur before clicking Save.

**Escalation:** Contact the `Plant Reliability Engineer` if a category attribute definition schema needs to be revised.

---

## Issue 2.5: Cyclic Hierarchy Dependency Error (`HIERARCHY_CYCLE_DETECTED`)

**Problem:** When restructuring equipment locations in the Equipment Hierarchy page (`/hierarchies`), saving changes fails with:
> *"Error HIERARCHY_CYCLE_DETECTED: Attempted to assign asset 'P-001' as a parent of itself or within an upstream circular loop."*

**Possible Cause:**
1. Setting an asset's parent node to a child node that already reports to that asset, creating an infinite loop in the Directed Acyclic Graph (DAG).
2. Setting an asset as its own parent.

**How to Resolve:**
1. Inspect the node relationship in the **Physical Location Tree** or **Process Loop Tree**.
2. Select a valid parent container (e.g. assign `P-001` to `Pump Skid Enclosure B-01` or `Boiler Feedwater Supply Loop`).
3. Save the hierarchy update.

**Prevention:** Structure equipment strictly in a top-down tree order: $\text{Site} \rightarrow \text{Building} \rightarrow \text{Room} \rightarrow \text{Skid} \rightarrow \text{Equipment}$.

**Escalation:** None; correcting the parent reference resolves the issue.
