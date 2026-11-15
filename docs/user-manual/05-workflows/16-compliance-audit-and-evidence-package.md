# Workflow 16: Enterprise Compliance Audit & Evidence Package Generation

### WF-16: Enterprise Compliance Audit & Evidence Package Generation

**Purpose:** Audit the immutable chronological event trail capturing actor identities, timestamps, IP addresses, and before/after JSON diffs; upload certified maintenance artifacts with client-side SHA-256 hashing to the Secure Evidence Vault; record statutory clause verifications (ASME Section I, NBIC NB-23, EN 12953, OSHA 1910.119, ISO 55001); and compile sealed, tamper-evident regulatory evidence packages with mandatory legal disclaimers.

**Required Role:** `Organization Admin` or `Plant Reliability Engineer` (`work_orders:read` / statutory inspection rights).

**Prerequisites:** Completed operational entries, work orders, or inspections in the tenant database.

**Starting Point:** `/audit-evidence` (Audit Trail & Evidence Vault).

---

### Procedure

#### Step 1: Inspect Immutable Audit Event Trail
- In the left sidebar navigation menu, click **Audit & Evidence** (or enter `/audit-evidence`).
- The page renders with 4 sub-tabs:
  1. **Audit Trail** (`AUDIT-001`)
  2. **Evidence Vault** (`AUDIT-002`)
  3. **Compliance Records** (`AUDIT-004`)
  4. **Evidence Packages** (`AUDIT-006`)

```carousel
![Audit Trail Table Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-001-audit-trail-table.png)
<!-- slide -->
![Audit Trail Table Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-001-audit-trail-table-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Audit Navigation Tabs)**: 4-tab switcher covering Trail, Vault, Compliance, and Packages.
- **Marker 2 (Chronological Event Table)**: Table displaying Event Timestamp, User Actor, Action Type (`UPDATE`, `STATUS_CHANGE`), Entity (`work_orders`), and Client IP.
- **Marker 3 (Before/After JSON Diff Modal)**: Expandable drawer rendering colored JSON diffs comparing old values to new values.

1. On the **Audit Trail** tab, locate recent event `EVT-0094: Work Order Status Transition`.
2. Click **View Diff**.
3. Inspect the JSON diff:
   - Old Value: `"status": "in_progress"` (Red)
   - New Value: `"status": "completed"` (Green)
   - Actor: `Marcus Vance (Maintenance Technician)`
   - Justification: `"Completed mechanical seal installation and leak check nominal."`
4. Confirm non-repudiation: all records are strictly append-only.

---

#### Step 2: Upload Certified Evidence to Secure Vault
1. Click the **Evidence Vault** tab (`AUDIT-002`).

```carousel
![Evidence Vault Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-002-evidence-vault-tab.png)
<!-- slide -->
![Evidence Upload Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-003-evidence-upload-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Vault Tab & Metric Ribbons)**: Storage metrics showing total vault items (`48`), total storage (`412 MB`), and verified SHA-256 integrity rate (`100%`).
- **Marker 2 (Evidence Vault Table)**: Table showing Document Title, Category, File Type, SHA-256 Hash excerpt, and Classification badge.
- **Marker 3 (Upload Evidence Trigger)**: Button opening the upload dialog.

2. Click **Upload Evidence Attachment**.
3. The `EvidenceUploadModal` opens (`AUDIT-003`).
4. Select the file: `BLR-001-SRV-Calibration-2026.pdf`.
5. Select Category: `annual_srv_calibration_certificate`.
6. Select Target Entity: `assets` $\rightarrow$ `BLR-001`.
7. Set Classification: `RESTRICTED_SAFETY_CRITICAL`.
8. Click **Calculate Hash & Upload**:
   - The browser calculates SHA-256 digest: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
   - Payload is transmitted and stored in object storage.

---

#### Step 3: Record Statutory Clause Verification
1. Click the **Compliance Records** tab (`AUDIT-004`).

```carousel
![Compliance Records Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-004-compliance-records-tab.png)
<!-- slide -->
![Compliance Verification Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-005-compliance-verification-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Compliance Tab Header)**: Framework selector (`ASME Sec I`, `EN 12953`, `NB-23`, `OSHA 1910.119`).
- **Marker 2 (Statutory Clauses Table)**: Regulatory clauses, target asset, retention expiry, and compliance status.
- **Marker 3 (Verify Clause Action)**: Button opening the inspector verification dialog.

2. Locate clause: `ASME BPVC Section I: PG-60.1 (Water Level Indicators & Gauge Glasses)`.
3. Click **Verify Compliance**.
4. The `ComplianceVerificationModal` opens (`AUDIT-005`):
   - Set Verification Status: `compliant`.
   - Verifying Inspector: `Eng. Marcus Thorne (Lead Reliability Engineer)`.
   - Inspector Certification Number: `NB-COMM-984421` (National Board Commission).
   - Findings Notes: `"Verified dual independent sight glasses clear, illuminated, and blown down daily."`
5. Click **Sign Off Record**.

---

#### Step 4: Build Exportable Tamper-Evident Evidence Package
1. Click the **Evidence Packages** tab (`AUDIT-006`).

```carousel
![Evidence Packages Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-006-evidence-packages-tab.png)
<!-- slide -->
![Evidence Package Builder Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-007-evidence-package-builder-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Packages Tab & Disclaimer)**: Prominent amber legal disclaimer banner.
- **Marker 2 (Compiled Packages Table)**: Historical compiled packages with manifest SHA-256 hashes and download triggers.
- **Marker 3 (Build Package Trigger)**: Button opening the package builder modal.

2. Click **Build Tamper-Evident Evidence Package**.
3. The `EvidencePackageModal` opens (`AUDIT-007`).
4. Review the **Mandatory Regulatory Legal Disclaimer**:
   > *"Generating a LuminaFM evidence package does not inherently confer regulatory compliance. Statutory compliance requires independent verification against applicable local jurisdiction laws, ASME/NBIC boiler inspection standards, and certified physical inspections."*
5. Set Governing Standard: `ASME_BPVC_SEC_I: Power Boilers`.
6. Set Target Asset: `BLR-001`.
7. Set Scope Date Range: `2026-01-01` to `2026-11-15`.
8. Check **Include Audit Event Trail** and **Include Attachments**.
9. Click **Generate Package**.

---

#### Step 5: Download & Verify Sealed Package Manifest
1. The system compiles all matching compliance logs, before/after change events, and cryptographic binaries.
2. A sealed package manifest with a cumulative SHA-256 package hash is generated:
   `PKG-2026-ASME-SEC1-BLR001.zip (SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069)`
3. Click **Download Sealed Package (.zip)**.
4. Save the package for external statutory auditors or government boiler inspectors.

---

**Expected Result:** The user audits change history, uploads verified documents, executes statutory clause signoffs with official commission numbers, and produces sealed evidence dossiers backed by cryptographic checksums.

**Common Problems & Practical Solutions:**
- *Problem*: File upload fails with `"File exceeds 25MB maximum limit"`.
  *Solution*: Compress large PDF documents or high-resolution TIFF images before uploading. The maximum single-file vault size is 25MB.
- *Problem*: Legal disclaimer prompt blocks package generation.
  *Solution*: The disclaimer is a mandatory regulatory safeguard to prevent false claims of automated regulatory compliance. You must acknowledge the notice to compile the package.

**Related Workflows:**
- [WF-03: Asset Catalog & Dynamic Attributes](file:///e:/My%20Owns/docs/user-manual/05-workflows/03-asset-catalog-and-attributes.md)
- [WF-08: Inspections & Fault Escalation](file:///e:/My%20Owns/docs/user-manual/05-workflows/08-inspections-and-fault-escalation.md)
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
