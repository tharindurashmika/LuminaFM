# Module Guide: ANP Decision Governance & Scientific Validation

## 1. Overview & Purpose

The **Decision Governance** module provides scientific rigor, transparency, and version control for the Analytic Network Process (ANP) multi-criteria decision models powering LuminaFM. It preserves the original, academically validated **Kingsbury dissertation baseline model** for steam boilers ($1,000 - 1,800\text{ kg/h}$) while providing a structured framework for authorized decision administrators to propose, compare, and validate new commercial client configurations.

### Key Governance Principles
- **Baseline Immutability**: The original dissertation research configuration (`ANP-KINGSBURY-FIRETUBE-v1.0.0`) is strictly preserved as a reproducible benchmark and cannot be edited.
- **Academic Validation Isolation**: Commercial client configurations cannot claim academic validation unless formal empirical validation (literature review, expert consensus, and consistency ratios $CR < 0.10$) has been executed and reviewed.
- **Side-by-Side Model Diffing**: Evaluates criteria weight shifts and alternative ranking drift between different model iterations before approving a version for operational dispatch.
- **Transparent Expert Provenance**: Records literature references (with DOI citations) and anonymized expert profile judgments for every decision criterion.

---

## 2. Page Access & Permissions

- **Route**: `/governance`
- **Navigation Access**: Click **Decision Governance** in the left navigation sidebar.
- **Access Level**: Restricted / Protected.
- **Required Roles**: `Organization Admin` or `Plant Reliability Engineer`.
- **Required Permission**: `governance:manage`.

---

## 3. Visual Interface & Navigation Tabs

The governance interface is divided into three functional tabs:

### Tab 1: Academic Baseline Model (`GOV-001` & `GOV-002`)
Displays the foundational dissertation research configuration.

![Figure 11.1: Academic Baseline Model View](../screenshots/original/GOV-001-governance-academic-baseline.png)
*Figure 11.1: ANP Academic Baseline Governance View (1440 × 900)*

![Figure 11.2: Academic Baseline Annotated](../screenshots/annotated/GOV-001-governance-academic-baseline-annotated.png)
*Figure 11.2: Baseline Governance View with Numbered Callout Markers*

#### Callout Annotations Reference (Figure 11.2)
- **Marker 1: Governance Navigation Tabs**: 3-tab strip (`Academic Baseline`, `Version Comparison`, `Commercial Proposals`).
- **Marker 2: Kingsbury Dissertation Baseline (14 Criteria, 4 Clusters)**: Displays criteria organized into:
  1. **Performance & Energy Efficiency**: Combustion efficiency, thermal stack losses, blowdown heat recovery.
  2. **Operating Safety & Risk**: Safety valve reliability, water level control interlocks, flame failure response.
  3. **Water Quality & Chemistry**: Feedwater hardness, boiler water TDS, dissolved oxygen pitting.
  4. **Equipment Reliability**: Burner mechanical wear, refractory lining condition, feed pump cavitation.
- **Marker 3: Literature Citations & 5 Anonymized Expert Profiles**: Provenance panel displaying peer-reviewed literature citations and five expert profiles (anonymized per academic ethical clearances).
- **Marker 4: Pairwise Consistency Ratios ($CR < 0.10$)**: Mathematical validation badges verifying that all pairwise comparison matrices satisfy Saaty's consistency ratio threshold ($CR < 0.10$).

---

### Criterion Governance Detail Modal (`GOV-002`)
Clicking **Inspect Validation Details** on any criterion card opens the provenance modal.

![Figure 11.3: Criterion Governance Detail Modal](../screenshots/original/GOV-002-criterion-governance-modal.png)
*Figure 11.3: Criterion Governance Detail Dialog*

![Figure 11.4: Criterion Detail Modal Annotated](../screenshots/annotated/GOV-002-criterion-governance-modal-annotated.png)
*Figure 11.4: Criterion Detail Dialog with Numbered Callouts*

- **Marker 1: Modal Header**: Criterion title and unique code (e.g., `CRIT_COMB_EFF`).
- **Marker 2: Literature Citations & DOIs**: Verifiable academic citations from ASME, Combustion Institute, and Energy Conversion journals.
- **Marker 3: 5 Expert Judgments & Relevance Ratings**: Ratings on a $1 - 5$ scale with qualitative expert justifications and retention votes.

---

### Tab 2: Model Version Comparison Diff (`GOV-003`)
Allows reliability engineers to compare two decision models side by side.

![Figure 11.5: Model Version Comparison Diff Tab](../screenshots/original/GOV-003-governance-version-comparison.png)
*Figure 11.5: Model Version Comparison Diff View*

![Figure 11.6: Version Comparison Annotated](../screenshots/annotated/GOV-003-governance-version-comparison-annotated.png)
*Figure 11.6: Version Comparison View with Numbered Callouts*

- **Marker 1: Active Version Comparison Tab**: Confirms comparison layout mode.
- **Marker 2: Model A vs. Model B Selector**: Dropdown to select baseline model against candidate proposal.
- **Marker 3: Side-by-Side Supermatrix Weight Shifts**: Visual diff tables highlighting criteria additions, deletions, weight percentage shifts, and ranking drift for alternatives.

---

### Tab 3: Commercial Configurations & Proposals (`GOV-004` & `GOV-005`)
Enables authorized engineers to draft new equipment configurations for commercial clients.

![Figure 11.7: Commercial Configurations Tab](../screenshots/original/GOV-004-governance-commercial-proposals.png)
*Figure 11.7: Commercial Configurations Register*

![Figure 11.8: Commercial Configurations Annotated](../screenshots/annotated/GOV-004-governance-commercial-proposals-annotated.png)
*Figure 11.8: Commercial Register with Numbered Callouts*

- **Marker 1: Commercial Proposals Tab**: Highlights client model proposals view.
- **Marker 2: Commercial Models List with Disclaimers**: Displays commercial configurations clearly marked with `CONFIGURED_HEURISTIC` status and academic validation disclaimers.
- **Marker 3: Propose New Model Version Action Trigger**: Clicking **Propose New Model Version** launches the creation modal.

![Figure 11.9: Propose Model Version Modal](../screenshots/original/GOV-005-propose-model-modal.png)
*Figure 11.9: Propose Model Version Dialog*

![Figure 11.10: Propose Modal Annotated](../screenshots/annotated/GOV-005-propose-model-modal-annotated.png)
*Figure 11.10: Propose Model Dialog with Numbered Callouts*

- **Marker 1: Modal Header**: Model creation dialog.
- **Marker 2: Model Code & Base Template**: New model code and base template selector.
- **Marker 3: Engineering Justification**: Detailed rationale for proposed criteria modifications.

---

## 4. Field Reference: Model Governance Forms

### Propose Model Version Form
| Field | Purpose | Required | Format | Validation Rules | Example |
|---|---|---|---|---|---|
| `modelCode` | Unique model identifier | Yes | String | Uppercase alphanumeric with hyphens | `ANP-COLOMBO-CLIENT-v1.1.0` |
| `modelName` | Descriptive name of model configuration | Yes | String | 5–100 characters | `Colombo Grand Industrial Boiler Optimized ANP Model` |
| `baseModelId` | Existing model to fork from | Yes | UUID | Must reference valid model | `baseline-model-uuid` |
| `description` | Engineering rationale for model changes | Yes | Text | Minimum 15 characters | `Adjusted water TDS weighting to reflect brackish coastal groundwater supply.` |

### Expert Evaluation Submission Form
| Field | Purpose | Required | Format | Validation Rules | Example |
|---|---|---|---|---|---|
| `expertId` | Anonymized expert profile identifier | Yes | String | E.g., `EXP_01`, `EXP_02` | `EXP_03` |
| `criterionCode` | Target criterion being evaluated | Yes | String | Valid criterion code | `CRIT_COMB_EFF` |
| `relevanceRating`| Relevance score to maintenance priority | Yes | Integer | Scale of $1$ (Low) to $5$ (Critical) | `5` |
| `retentionVote` | Vote to keep or exclude criterion | Yes | Boolean | `true` (Keep) or `false` (Discard) | `true` |
| `qualitativeComments` | Expert technical observations | Yes | Text | Minimum 10 characters | `Essential parameter for oil-fired rotary cup burners to prevent unburned fuel loss.` |
