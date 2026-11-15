# Workflow 14: ANP Model Governance & Academic Baseline Validation

### WF-14: ANP Model Governance & Academic Baseline Validation

**Purpose:** Audit the scientific lineage and mathematical formulation of LuminaFM's multi-criteria decision engine; inspect the 14 core criteria across 4 thermodynamic clusters established in the Kingsbury dissertation baseline (University of Moratuwa, 2018); verify peer-reviewed literature citations (DOIs); review evaluation profiles from 5 independent domain experts; and verify that mathematical pairwise comparison matrices maintain acceptable inconsistency ratios ($CR < 0.10$).

**Required Role:** `Plant Reliability Engineer` or `Organization Admin` (`governance:manage`).

**Prerequisites:** Authenticated session with access to the Governance module.

**Starting Point:** `/governance` (Decision Governance Portal).

---

### Procedure

#### Step 1: Open the Decision Governance Portal
- In the left sidebar navigation menu, click **Decision Governance** (or enter `/governance`).
- The page renders with a 3-tab governance switcher:
  1. **Academic Baseline** (`GOV-001`)
  2. **Model Version Comparison** (`GOV-003`)
  3. **Commercial Proposals** (`GOV-004`)

```carousel
![Academic Baseline Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/GOV-001-governance-academic-baseline.png)
<!-- slide -->
![Academic Baseline Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-001-governance-academic-baseline-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Governance Header & Citation)**: Academic citation block highlighting Kingsbury dissertation baseline (Moratuwa, 2018) and validation status (`ACADEMIC_BASELINE_VALIDATED`).
- **Marker 2 (Cluster Filter & Search Bar)**: Filtering controls for the 4 ANP decision clusters (Operational, Energy, Safety, Economics).
- **Marker 3 (14 Criteria Cards Grid)**: Grid of criteria cards displaying criterion codes, local weights, and expert retention votes.

---

#### Step 2: Filter and Inspect Criteria Clusters
1. On the **Academic Baseline** tab, observe the 4 core clusters:
   - **Cluster 1: Operational Reliability** ($w = 0.35$): Focuses on equipment availability and physical wear.
   - **Cluster 2: Energy & Thermodynamic Efficiency** ($w = 0.30$): Focuses on heat transfer and stack losses.
   - **Cluster 3: Process Safety & Regulatory Risk** ($w = 0.25$): Focuses on pressure containment and statutory compliance.
   - **Cluster 4: Economics & Asset Life** ($w = 0.10$): Focuses on lifecycle extension and parts cost.
2. In the **Cluster Filter** dropdown, select `Energy & Thermodynamic Efficiency`.
3. The grid filters to show:
   - `C1.1: Flue Gas Temperature Differential`
   - `C1.2: Boiler Thermal Efficiency & Steam Evaporation Ratio`
   - `C1.3: Total Dissolved Solids & Blowdown Heat Loss`

---

#### Step 3: Open Criterion Governance Detail Modal
1. Click on the card for **C1.1: Flue Gas Temperature Differential**.
2. The `CriterionGovernanceDetailModal` opens (`GOV-002`).

```carousel
![Criterion Governance Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/GOV-002-criterion-governance-modal.png)
<!-- slide -->
![Criterion Governance Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-002-criterion-governance-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Modal Title & Lineage)**: Displays Criterion Code (`C1.1`), cluster name, and Academic Baseline badge.
- **Marker 2 (Literature Citations & DOIs)**: Peer-reviewed research papers, journal references, authors, and external DOI links.
- **Marker 3 (5 Expert Profiles & Ratings)**: Individual evaluation cards showing 5 independent expert votes (`Keep`/`Discard`), relevance scores ($1–5$), and threshold notes.

---

#### Step 4: Verify Academic Literature Citations & DOIs
1. In the **Peer-Reviewed Scientific Lineage** section, inspect the primary citation:
   - **Title**: *"Exergy and Reliability Analysis of Industrial Fire-Tube Steam Boilers"*
   - **Authors**: `Kingsbury, M., Wickramasinghe, N., & Perera, K.`
   - **Journal**: `International Journal of Energy Research, Vol. 42, Issue 8`
   - **DOI**: `10.1002/er.4128` (Click to open academic DOI resolver).
2. Review the dissertation text excerpt:
   > *"Flue gas exit temperature serves as the primary early thermodynamic indicator of gas-side fireside fouling. A sustained temperature differential exceeding $25^\circ\text{C}$ above design baseline mandates immediate convection pass soot blowing."*

---

#### Step 5: Audit the 5 Domain Expert Ratings & Consistency Ratios
1. Scroll down to the **5 Expert Evaluation Profiles** grid:
   - **Expert 1 (Dr. M. Kingsbury - Lead Researcher)**: Retention Vote: `KEEP` | Score: `5.0 / 5.0`
   - **Expert 2 (Chief Boiler Inspector - NBIC / ASME)**: Retention Vote: `KEEP` | Score: `5.0 / 5.0`
   - **Expert 3 (Senior Plant Reliability Engineer)**: Retention Vote: `KEEP` | Score: `4.8 / 5.0`
   - **Expert 4 (Burner Systems Combustion Specialist)**: Retention Vote: `KEEP` | Score: `4.5 / 5.0`
   - **Expert 5 (Central Utilities Plant Operations Lead)**: Retention Vote: `KEEP` | Score: `4.7 / 5.0`
2. Verify that all 5 experts unanimously voted `KEEP` ($100\%$ retention consensus).
3. Verify the pairwise comparison matrix **Consistency Ratio**:
   $$CR = \frac{CI}{RI} = 0.042 < 0.10$$
   *Satisfies Thomas Saaty's analytic network process consistency standard.*
4. Click **Close (X)** to dismiss the modal.

---

**Expected Result:** The reliability engineer verifies the academic validity, literature provenance, expert consensus, and mathematical rigor backing LuminaFM's decision-support models.

**Common Problems & Practical Solutions:**
- *Problem*: External DOI link fails to resolve.
  *Solution*: The DOI link points to standard `doi.org` resolvers. In offline or air-gapped secure facility networks, external internet access may be restricted by firewall rules; refer to the local dissertation PDF in the documentation archive.
- *Problem*: Cluster weights don't sum to 1.0.
  *Solution*: The academic baseline enforces strict normalization ($\sum w_i = 1.000$). Check that you are viewing the validated baseline and not an un-normalized commercial proposal draft.

**Related Workflows:**
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
- [WF-15: Commercial Model Versioning & Diffing](file:///e:/My%20Owns/docs/user-manual/05-workflows/15-commercial-model-versioning.md)
- [WF-16: Enterprise Compliance Audit](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md)
