# Workflow 09: Desktop 2-Hourly Daily Boiler Logbook Entry

### WF-09: Desktop 2-Hourly Daily Boiler Logbook Entry

**Purpose:** Record certified 2-hourly watchkeeping shift readings for industrial steam boilers (Operating Steam Pressure, Flue Gas Exit Temperature, Boiler Water TDS, Combustion Ambient Temperature, and Sight Glass Water Level Confirmation), receive real-time color-coded limit validation alerts, attach physical inspection photos, and commit signed shift logbooks to historical archives.

**Required Role:** `Boiler Plant Operator` (`operations:daily_log`), `Plant Reliability Engineer`, or `Organization Admin`.

**Prerequisites:** Boiler asset registered in database (`BLR-001: Main High-Pressure Steam Boiler`).

**Starting Point:** `/daily-monitoring` (Daily Boiler Logbook & Monitoring).

---

### Procedure

#### Step 1: Open the Daily Boiler Logbook Portal
- In the left sidebar navigation menu, click **Daily Boiler Logbook** (or enter `/daily-monitoring`).
- The page renders with a dual-tab switcher:
  1. **Daily Log Entry Form** (`LOG-001`)
  2. **Historical Shift Archive** (`LOG-002`)

```carousel
![Daily Boiler Logbook Entry Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/LOG-001-daily-boiler-logbook-entry.png)
<!-- slide -->
![Daily Boiler Logbook Entry Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/LOG-001-daily-boiler-logbook-entry-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Header Context)**: Boiler selector (`BLR-001`), Active Shift selector (`Shift A: 06:00 - 14:00`), and Date picker.
- **Marker 2 (2-Hourly Telemetry Grid)**: Matrix of numerical input cards with real-time range indicators for Steam Pressure, Flue Gas Temp, TDS, and Ambient Temp.
- **Marker 3 (Safety Checkpoints & Photo Attachment)**: Sight glass rocker switch, burner flame stability toggle, photo upload zone, and Submit trigger.

---

#### Step 2: Select Boiler & Watchkeeping Shift
1. In the **Target Boiler** dropdown, select `BLR-001: Main High-Pressure Steam Boiler (1,100 kg/h)`.
2. In the **Watchkeeping Shift** dropdown, select `Shift A (Morning: 06:00 - 14:00)`.
3. Select the **Logging Period Interval**: `08:00 Hours`.
4. Observe the system displaying nominal engineering ranges:
   - Steam Pressure Nominal: $6.0\text{ to }10.0\text{ bar}$ (Limit: $10.5\text{ bar}$)
   - Flue Gas Temp Nominal: $140.0\text{ to }190.0^\circ\text{C}$ (Limit: $240.0^\circ\text{C}$)
   - Boiler Water TDS Nominal: $1,500\text{ to }2,500\text{ ppm}$ (Limit: $3,500\text{ ppm}$)

---

#### Step 3: Input 2-Hourly Operational Telemetry
1. In the **Steam Header Pressure** input, type `8.5`.
   - *Live Validation*: Green checkmark renders — value is within nominal bounds ($6.0–10.0\text{ bar}$).
2. In the **Flue Gas Exit Temperature** input, type `175.0`.
   - *Live Validation*: Green checkmark renders — nominal combustion efficiency confirmed.
3. In the **Boiler Water TDS** input, type `2,400`.
   - *Live Validation*: Green checkmark renders — dissolved solids nominal.
4. In the **Ambient Combustion Air Temperature** input, type `29.5`.
   - *Live Validation*: Green checkmark renders — boiler room ventilation nominal.

---

#### Step 4: Verify Safety Checkpoints & Attach Visual Evidence
1. Toggle the **Sight Glass Water Level Confirmed** switch to `TRUE` (Mandatory: verifies gauge cock blown down and level steady at center line).
2. Toggle the **Burner Flame Pattern Stable** switch to `TRUE` (Confirms no impingement on furnace crown).
3. In the **Operator Handover Notes** text area, input:
   `"Burner firing smooth on modulating high fire; chemical dosing pump nominal; water clear in sight glass."`
4. *Optional Attachment*: Click the file dropzone to attach a fireside inspection photograph (e.g. `burner-flame-0800.jpg`).

---

#### Step 5: Submit Shift Logbook & Review Historical Archive
1. Click the primary button: **Submit Daily Shift Logbook**.
2. The system executes atomic submission:
   - Writes telemetry to authoritative PostgreSQL database.
   - Computes exergy efficiency and stack thermal loss.
   - Signs logbook with logged-in operator credentials.
3. An inline success banner confirms submission: `"08:00 Shift Logbook committed successfully"`.
4. Click the **Historical Shift Archive** tab (`LOG-002`).

```carousel
![Boiler Monitoring History Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/LOG-002-boiler-monitoring-history.png)
<!-- slide -->
![Boiler Monitoring History Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/LOG-002-boiler-monitoring-history-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (History Archive Header)**: Date range filters and boiler asset selector.
- **Marker 2 (Historical Telemetry Table)**: Tabular shift entries showing timestamp, operator name, pressure, flue gas temp, and validation status.
- **Marker 3 (Export & Drilldown Actions)**: Buttons to export shift archive to CSV or drill down into hourly trend curves.

5. Verify that your new `08:00` entry appears at the top of the archive table.

---

**Expected Result:** Operational shift telemetry is validated against thermodynamic safety limits, recorded with cryptographic operator signatures, and committed to searchable facility archives.

**Common Problems & Practical Solutions:**
- *Problem*: Input card border turns bright red with alert `"EXCURSION: Pressure exceeds MAWP threshold"`.
  *Solution*: If steam pressure exceeds $10.5\text{ bar}$, verify gauge reading immediately. If real, initiate safety relief blowdown and notify lead engineer.
- *Problem*: Cannot submit logbook with error `"Water level verification is mandatory"`.
  *Solution*: The Sight Glass Water Level switch must be toggled to `TRUE` before submission can proceed (safety compliance requirement).

**Related Workflows:**
- [WF-08: Inspections & Fault Escalation](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md)
- [WF-10: Industrial Tablet Floor Kiosk Experience](file:///e:/My%20Owns/docs/user-manual/05-workflows/10-floor-kiosk-operations.md)
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
