# Workflow 12: Operational ANP Telemetry Evaluation & Action Review

### WF-12: Operational ANP Telemetry Evaluation & Action Review

**Purpose:** Evaluate multi-criteria Analytic Network Process (ANP) decision runs; inspect limit supermatrix priority vectors across maintenance alternatives (Burner Tuning, Chemical Descaling, SRV Recertification, Refractory Repair); examine telemetry signal inputs classified into Measured, Calculated, Benchmark, and Expert categories; perform real-time sensitivity analysis; and execute formal engineering review in the `RecommendationReviewModal`, strictly enforcing the safety rule that **unvalidated ANP outputs cannot be approved as operational maintenance decisions**.

**Required Role:** `Plant Reliability Engineer` or `Organization Admin` (`governance:manage` / `work_orders:manage`).

**Prerequisites:** Operational shift telemetry logged and an active ANP decision run generated.

**Starting Point:** `/reports` (Decision Support & Reporting) or `/` (Executive Command Center).

---

### Procedure

#### Step 1: Open the Decision Support & Reporting Portal
- In the sidebar navigation menu, click **Decision & Reporting** (or enter `/reports`).
- The page renders with 4 sub-tabs:
  1. **ANP Maintenance Priorities** (`REP-001`)
  2. **Operational Abnormalities** (`REP-002`)
  3. **Historical Trends** (`REP-004`)
  4. **Alert Channels & Export** (`REP-005`)

```carousel
![ANP Maintenance Priorities Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/REP-001-decision-anp-priorities.png)
<!-- slide -->
![ANP Maintenance Priorities Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-001-decision-anp-priorities-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Decision Run Selector & Provenance)**: Active Run ID (`RUN-2026-11-15-001`), Model Version (`v1.0.0`), Provenance badge (`Dissertation Baseline`), and Calculation Date.
- **Marker 2 (Alternative Priority Rankings)**: Normalized horizontal bar charts ranking maintenance interventions by priority score ($w_i$).
- **Marker 3 (Review & Action Triggers)**: Action buttons (`Review Action`, `Inspect Supermatrix`, `Export Decision PDF`).

---

#### Step 2: Inspect Alternative Priority Vectors & Eigenvalues
1. On the **ANP Maintenance Priorities** tab, inspect the ranked alternatives:
   - **Alternative 1**: `Convection Pass Soot Blow & Chemical Tube Descaling` — Score: `0.3842` (Rank #1, Urgent)
   - **Alternative 2**: `Burner Servicing & Air-Fuel Ratio Combustion Tuning` — Score: `0.2915` (Rank #2, High)
   - **Alternative 3**: `Safety Relief Valve Annual Recertification` — Score: `0.1820` (Rank #3, Medium)
   - **Alternative 4**: `Furnace Refractory & Casing Thermal Insulation Repair` — Score: `0.1423` (Rank #4, Low)
2. Review the mathematical convergence metadata:
   - Convergence State: `LIMIT_CONVERGED` (Power method converged in 14 iterations).
   - Inconsistency Ratio: `CR = 0.048` ($< 0.10$ threshold, satisfying Saaty consistency criteria).

---

#### Step 3: Inspect Telemetry Signal Snapshot & Data Classifications
1. Click the button: **Inspect ANP Decision Matrix**.
2. The `OperationalAnpDrawer` slides open.
3. Scroll to the **Telemetry Inputs Snapshot** table:
   - Observe strict chromatic data classification tags:
     - `[MEASURED]`: Flue Gas Exit Temp = `210.0°C`, Boiler Steam Output = `920 kg/h`.
     - `[CALCULATED]`: Flue Gas Differential $\Delta T_{\text{flue}} = +35.0^\circ\text{C}$, Exergy Loss = `12.4%`.
     - `[BENCHMARK]`: Max Flue Temp Threshold $= 190.0^\circ\text{C}$, Minimum Steam Quality $= 98.0\%$.
     - `[EXPERT]`: Expert Panel Descaling Priority Threshold $= 0.35$.
4. Verify that measured values are clearly separated from calculated model outputs.

---

#### Step 4: Perform Dynamic Sensitivity Perturbation
1. In the `OperationalAnpDrawer`, scroll to **Interactive Cluster Sensitivity Sliders**.
2. Locate the cluster sliders:
   - Cluster 1: `Operational Reliability (Weight: 0.35)`
   - Cluster 2: `Energy & Thermodynamic Efficiency (Weight: 0.30)`
   - Cluster 3: `Process Safety & Risk (Weight: 0.25)`
   - Cluster 4: `Economic & Asset Life (Weight: 0.10)`
3. Drag the **Process Safety & Risk** slider upward from `0.25` to `0.45`.
4. Observe the client-side matrix recalculating immediately:
   - `Safety Relief Valve Recertification` rises in priority rank from #3 to #2.
5. Click **Reset Sliders to Baseline** to restore verified dissertation weights.
6. Close the drawer.

---

#### Step 5: Execute Formal Recommendation Review
1. On the main page, locate the #1 ranked recommendation: `Chemical Tube Descaling`.
2. Click the gold button: **Review Action**.
3. The `RecommendationReviewModal` opens.
4. **Validation Check**:
   - *If the active model is unvalidated (`isValidated === false`)*: A prominent amber advisory banner warns that unvalidated ANP outputs cannot be approved. The `Approve` button is disabled. The engineer can only `Reject` or `Convert to Draft Work Order`.
   - *If the active model is validated (`isValidated === true`)*: An emerald confirmation banner confirms Kingsbury dissertation baseline validation. The `Approve & Issue Work Order` button is unlocked.
5. In the **Reviewing Engineer Name** input, enter: `Eng. Marcus Thorne (Lead Reliability Engineer)`.
6. In the **Engineering Justification** textarea, input (minimum 15 characters):
   `"Confirmed fireside convection pass thermal resistance excursion (+35°C stack delta). Certified physical inspection requires descaling intervention."`
7. Click **Approve & Issue Work Order**.
8. The recommendation transitions to `APPROVED`, an authorized Work Order is automatically generated, and the event is written to the immutable audit trail.

---

**Expected Result:** The reliability engineer transparently reviews multi-criteria ANP decision logic, verifies mathematical convergence, perturbs sensitivity weights, and executes certified signoff converting validated recommendations into active work orders.

**Common Problems & Practical Solutions:**
- *Problem*: Approve button is greyed out with warning `"Unvalidated Model Advisory"`.
  *Solution*: The active decision run was generated by a commercial proposal that has not completed formal validation. Under plant safety policy, you cannot approve unvalidated actions. Convert the recommendation to an exploratory draft work order or switch to the validated baseline model.
- *Problem*: Justification error: `"Minimum 15 characters required"`.
  *Solution*: Enter a detailed engineering rationale detailing on-site observation before clicking Approve.

**Related Workflows:**
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-13: Operational Alert Acknowledgment & Routing](file:///e:/My%20Owns/docs/user-manual/05-workflows/13-operational-alerts-and-channels.md)
- [WF-14: ANP Model Governance & Academic Baseline Validation](file:///e:/My%20Owns/docs/user-manual/05-workflows/14-model-governance-baseline.md)
