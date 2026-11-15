# Workflow 15: Commercial Model Versioning & Version Diffing

### WF-15: Commercial Model Versioning & Version Diffing

**Purpose:** Propose commercial and site-specific variants of the ANP decision model (tailored for tropical high-humidity climates, alternative combustible fuels, or specific industrial equipment); fork safely from validated academic templates without corrupting baseline models; submit expert judgments and empirical evidence; and execute side-by-side mathematical version comparison diffs to audit weight shifts.

**Required Role:** `Plant Reliability Engineer` or `Organization Admin` (`governance:manage`).

**Prerequisites:** Access to `/governance` with an active academic baseline model.

**Starting Point:** `/governance` $\rightarrow$ **Commercial Configurations Tab** (`GOV-004`).

---

### Procedure

#### Step 1: Open the Commercial Configurations Tab
- Navigate to **Decision Governance** (`/governance`) and click the **Commercial Configurations** tab (`GOV-004`).
- The page renders existing custom proposals, validation status badges (`provisional`, `commercial_validated`, `rejected`), and action triggers.

```carousel
![Commercial Configurations Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/GOV-004-governance-commercial-proposals.png)
<!-- slide -->
![Commercial Configurations Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-004-governance-commercial-proposals-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Commercial Proposals Header)**: Panel explaining commercial variant governance and safety boundaries.
- **Marker 2 (Model Variants Registry)**: Cards displaying custom model proposals with version tags, author, and validation status.
- **Marker 3 (Propose Model Action Trigger)**: Button to launch the new model version creation dialog.

---

#### Step 2: Propose a New Model Version
1. Click the gold button: **Propose New Model Version**.
2. The `ProposeModelVersionModal` opens (`GOV-005`).

```carousel
![Propose Model Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/GOV-005-propose-model-modal.png)
<!-- slide -->
![Propose Model Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-005-propose-model-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Modal Title & Advisory)**: Notice reminding that commercial proposals fork safely from baseline templates.
- **Marker 2 (Model Code & Template Inputs)**: Form fields for uppercase model code, friendly version title, and base model template selector.
- **Marker 3 (Engineering Justification Scope)**: Multiline text area detailing operational justification and thermodynamic differences.

3. Complete the form:
   - **Proposed Model Code**: `ANP-BOILER-TROPICAL-V2.0`
   - **Version Display Name**: `High-Humidity Tropical Refinery Boiler Model`
   - **Base Model Template**: Select `Kingsbury Dissertation Baseline (Moratuwa 2018)`
   - **Engineering Justification Narrative**:
     `"Adjusting combustion air pre-heater weights to account for persistent 85%+ relative humidity and 32°C ambient intake in coastal refinery operations. Elevating moisture corrosion criteria."`
4. Click **Submit Model Proposal**.
5. The modal dismisses and the new variant appears in the registry under `provisional` status.

---

#### Step 3: Attach Expert Judgments & Empirical Evidence
1. On the new proposal card, click **Submit Expert Judgment**.
   - Select Expert: `EXP_03: Senior Reliability Engineer`.
   - Vote: `KEEP` on Flue Gas Differential.
   - Relevance: `5.0`.
   - Threshold: `> 22.0°C (Adjusted for high ambient moisture)`.
   - Click **Record Evaluation**.
2. Click **Attach Evidence**:
   - Evidence Type: `operational_log_sheet`.
   - Title: `2025 Monsoon Season Boiler Flue Gas Condensation Log`.
   - Storage URI: `uploads/vault/monsoon-flue-analysis.pdf`.
   - Click **Attach Evidence**.

---

#### Step 4: Execute Side-by-Side Model Version Comparison
1. In the top governance tab bar, click the **Model Version Comparison** tab (`GOV-003`).
2. The version diffing interface loads with two model selectors.

```carousel
![Model Version Comparison Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/GOV-003-governance-version-comparison.png)
<!-- slide -->
![Model Version Comparison Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-003-governance-version-comparison-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Model Comparison Selectors)**: Dropdown selectors for Baseline Model A and Proposal Model B.
- **Marker 2 (Cluster Weight Shift Table)**: Side-by-side comparison matrix showing weight changes ($\Delta w$).
- **Marker 3 (Criteria Delta Bar Chart)**: Visual delta bars highlighting criteria that gained or lost relative mathematical weight.

3. Select **Model A (Baseline)**: `Kingsbury Dissertation Baseline (v1.0.0)`.
4. Select **Model B (Comparison)**: `ANP-BOILER-TROPICAL-V2.0 (v2.0.0)`.
5. Click **Compare Model Versions**.

---

#### Step 5: Audit Mathematical Weight Shifts ($\Delta w$)
1. Inspect the **Weight Shift Diff Table**:
   - Criterion `C1.1 (Flue Gas Temp)`: Baseline $= 0.1420 \rightarrow$ Proposed $= 0.1850$ ($\Delta = +0.0430$, Blue upward bar).
   - Criterion `C4.1 (Parts Replacement Cost)`: Baseline $= 0.0810 \rightarrow$ Proposed $= 0.0520$ ($\Delta = -0.0290$, Amber downward bar).
2. Confirm that the total weight across all criteria still sums to exactly $1.0000$.
3. Review the **Calculated Drift Severity**: `LOW DRIFT (Max Delta < 0.050)`.
4. Click **Export Version Diff Report (PDF)** to generate a permanent audit evidence file.

---

**Expected Result:** The reliability engineer creates custom model proposals, justifies criteria changes with empirical documentation, and performs strict mathematical diffing against the baseline before requesting operational deployment.

**Common Problems & Practical Solutions:**
- *Problem*: Model Code input displays error `"Code must be uppercase alphanumeric with hyphens"`.
  *Solution*: Use format `ANP-MODULE-NAME-V#.#` (e.g. `ANP-BOILER-TROPICAL-V2.0`). Spaces and lowercase letters are rejected.
- *Problem*: Cannot select newly proposed model in Decision Reporting.
  *Solution*: Newly created proposals start in `provisional` status. They must receive formal approval via the `GovernanceApprovalModal` before they become selectable for operational decisions.

**Related Workflows:**
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
- [WF-14: ANP Model Governance & Academic Baseline Validation](file:///e:/My%20Owns/docs/user-manual/05-workflows/14-model-governance-baseline.md)
- [WF-16: Enterprise Compliance Audit](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md)
