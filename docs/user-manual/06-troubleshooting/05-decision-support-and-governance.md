# Troubleshooting Guide: Decision Support & Model Governance

This guide addresses problems encountered when reviewing Analytic Network Process (ANP) maintenance recommendations, evaluating limit supermatrices, proposing custom model versions, and operating cross-module extensibility boundaries.

```carousel
![Decision ANP Priorities](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-001-decision-anp-priorities-annotated.png)
<!-- slide -->
![Propose Model Modal](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/GOV-005-propose-model-modal-annotated.png)
```

---

## Issue 5.1: Locked "Approve" Button on Unvalidated Model Recommendations

**Problem:** In the `RecommendationReviewModal`, an engineer reviews an ANP-generated maintenance recommendation, but the **Approve & Issue Work Order** button is greyed out. A prominent amber advisory banner warns:
> *"SECURITY & SAFETY COMPLIANCE ERROR: Unvalidated ANP outputs cannot be approved as operational maintenance decisions. Only validated models can produce approved actions."*

**Possible Cause:**
1. The active decision run was executed using a custom or commercial proposal model that has validation status `provisional` or `unvalidated_custom` rather than `academic_baseline` or `commercial_validated`.
2. Under plant safety compliance, unvalidated multi-criteria algorithms **cannot legally authorize physical maintenance interventions**.

**How to Resolve:**
1. You have two permitted operational courses of action:
   - **Option A (Exploratory Ticket)**: Click **Convert to Exploratory Draft WO**. The system generates an unapproved draft ticket requiring independent physical verification before authorization.
   - **Option B (Reject)**: Click **Reject Recommendation** with justification: `"Model unvalidated; awaiting peer-reviewed calibration."`
2. *To run operational approvals*: Ensure the active decision run is generated using the **Kingsbury Dissertation Moratuwa Baseline (v1.0.0)** or a formally validated commercial model.

**Prevention:** Only use validated model configurations for operational shift decision-making. Custom proposals should be kept for testing and diffing.

**Escalation:** Request that the `Organization Admin` and Lead Reliability Engineer review the model proposal in `/governance` and grant formal validation status.

---

## Issue 5.2: Cross-Module Model Governance Violation (`CMMS_ISOLATION_ERR_403`)

**Problem:** Attempting to run a maintenance decision evaluation on a centrifugal chiller (`CHL-001`) triggers an immediate security error dialog:
> *"CROSS-MODULE MODEL GOVERNANCE VIOLATION (BLOCKED): Error CMMS_ISOLATION_ERR_403. The requested decision model [ANP-BOILER-OPERATIONAL-V1.0] is strictly bound to equipment category [boilers]. Execution against asset CHL-001 (category: [chillers]) is prohibited by the LuminaFM Extensibility Contract."*

**Possible Cause:**
1. Attempting to evaluate a chiller asset using an ANP model formulated specifically for steam boilers.
2. The LuminaFM extensibility contract strictly isolates thermodynamic decision algorithms across machinery classes. Thermodynamic criteria for steam boilers (fire-tube soot accumulation, flue gas stack exergy, steam quality) have zero physical meaning in vapor-compression refrigeration cycles.

**How to Resolve:**
1. **Normal Protection Behavior**: The system is functioning as designed to prevent catastrophic equipment damage from misapplied decision models.
2. For chiller assets, use the dedicated **Chiller Module Diagnostics** on the Command Center (`/`) or formulate an independently validated chiller ANP model.
3. Only evaluate boiler models against certified boiler assets (`BLR-001`, `BLR-002`).

**Prevention:** Do not configure cross-category model bindings in maintenance plans.

**Escalation:** None; this is an intentional safety boundary.

---

## Issue 5.3: Pairwise Comparison Matrix Inconsistency Warning ($CR \ge 0.10$)

**Problem:** In the Decision Governance portal (`/governance`), an expert's pairwise comparison matrix displays an amber warning badge:
> *"Consistency Warning: Matrix Inconsistency Ratio CR = 0.142 exceeds the Saaty threshold (0.10). Inconsistent judgments may produce skewed supermatrix priority vectors."*

**Possible Cause:**
1. Circular or contradictory judgments were submitted during expert pairwise comparisons (e.g. Expert rated Criterion A much more important than B, B much more important than C, but C more important than A).

**How to Resolve:**
1. Open the pairwise comparison table for the affected criterion cluster.
2. Identify the highest contributor to the consistency index $\lambda_{\max}$.
3. Adjust the pairwise intensity score (e.g. reduce an extreme 9-to-1 rating to a moderate 3-to-1 rating) until the calculated ratio satisfies:
   $$CR = \frac{CI}{RI} < 0.100$$
4. The warning badge shifts to an emerald checkmark: `MATHEMATICALLY CONSISTENT`.

**Prevention:** Use Saaty's 1-to-9 fundamental scale with transitive reasoning during expert elicitation workshops.

**Escalation:** Consult with the Principal Reliability Engineer to recalibrate the expert's judgment weights.

---

## Issue 5.4: Custom Model Code Rejected on Submission

**Problem:** In the `ProposeModelVersionModal` (`GOV-005`), clicking **Submit Model Proposal** displays:
> *"Invalid Model Code format. Code must be uppercase alphanumeric with hyphens (e.g. ANP-BOILER-TROPICAL-V2.0)."*

**Possible Cause:**
1. Model code contains lowercase letters, spaces, underscores, or special characters.

**How to Resolve:**
1. Format the model code strictly using uppercase letters, numbers, and hyphens:
   - Correct: `ANP-BOILER-TROPICAL-V2.0`
   - Incorrect: `anp_boiler tropical v2.0`
2. Click **Submit Model Proposal**.

**Prevention:** Follow the standardized taxonomy convention displayed in the input field placeholder.

**Escalation:** None; correcting the code format resolves the issue.
