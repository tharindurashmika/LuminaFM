# Audit Trail & Evidence Vault Modals

This guide provides an exhaustive technical reference for the regulatory compliance and evidence management overlays in LuminaFM:
1. **Evidence Upload Modal** (`EvidenceUploadModal`)
2. **Statutory Compliance Verification Modal** (`ComplianceVerificationModal`)
3. **Evidence Package Builder Modal** (`EvidencePackageModal`)

---

## 1. Evidence Upload Modal (`EvidenceUploadModal`)

### 1.1 Purpose & Role Permissions
- **Purpose**: Uploads and cryptographically registers physical maintenance evidence (equipment photographs, ultrasonic NDT thickness scans, water chemistry reports, calibration certificates) into the immutable Evidence Vault.
- **Access Route**: `/audit-evidence` $\rightarrow$ **Secure Evidence Vault Tab** (Clicking `Upload Evidence Attachment`).
- **Authorized Roles**:
  - `Organization Admin` & `Plant Reliability Engineer`: Full upload and classification rights.
  - `Maintenance Technician` & `Boiler Plant Operator`: Upload permitted for operational photos and logs.

---

### 1.2 Visual Presentation & Callout Annotations

```carousel
![Evidence Upload Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-003-evidence-upload-modal.png)
<!-- slide -->
![Evidence Upload Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-003-evidence-upload-modal-annotated.png)
```

#### Numbered Callout Descriptions

| Callout # | UI Component | Description & Operational Function |
|:---:|---|---|
| **1** | **Modal Header & Context** | Displays dialog title `"Upload Verified Evidence Attachment"` with cryptographic immutability notice. |
| **2** | **File Selector & Asset Dropdown** | Drag-and-drop file upload zone (max 25MB) and entity association selector (`assets`, `work_orders`, `inspections`). |
| **3** | **Data Classification Level** | Data sensitivity selector (`PUBLIC`, `INTERNAL_OPERATIONAL`, `CONFIDENTIAL_COMMERCIAL`, `RESTRICTED_SAFETY_CRITICAL`). |

---

### 1.3 Field-by-Field Form Specification

| Field Name | UI Input Type | Format / Constraints | Required? | Default | Description |
|---|---|---|:---:|---|---|
| **Evidence File** | File Upload (Drag & Drop) | Max 25MB (`.jpg`, `.png`, `.pdf`, `.csv`, `.json`, `.xlsx`) | **Yes** | `null` | Physical file to be hashed and stored. |
| **Evidence Category** | Select Dropdown | Enum (6 predefined categories) | **Yes** | `equipment_photo` | Regulatory classification of attachment. |
| **Target Entity Type** | Select Dropdown | Enum (`assets`, `work_orders`, `inspections`) | **Yes** | `assets` | Parent module linking the evidence. |
| **Target Entity ID** | Text Input | Monospace String (e.g. `BLR-001`, `WO-001`) | **Yes** | `BLR-001` | Specific record ID bound to attachment. |
| **Data Classification** | Select Dropdown | Enum (`PUBLIC` to `RESTRICTED`) | **Yes** | `INTERNAL` | Information governance access level. |
| **Tags** | Text Input | Comma-delimited strings | Optional | `"Boiler, Fireside"` | Searchable taxonomy metadata. |
| **Technical Notes** | Multiline Textarea | String (0–1000 chars) | Optional | `""` | Engineering context or defect description. |

#### Evidence Categories Defined

| Category Code | Label | Example Use Case |
|---|---|---|
| `equipment_photo` | Equipment Photograph | Fireside soot buildup, burner flame pattern, valve weeping. |
| `ndt_ultrasonic_scan` | Ultrasonic Thickness Scan (NDT) | Shell wall thickness gauging per National Board NBIC NB-23. |
| `water_chemistry_lab_report` | Water Chemistry Lab Analysis | External lab tests for silica, dissolved oxygen, and phosphate. |
| `annual_srv_calibration_certificate` | SRV Calibration Certificate | Authorized valve test bench pop-pressure verification sheet. |
| `hydrostatic_test_chart` | Hydrostatic Pressure Test Chart | 1.5x MAWP hold pressure curve recorded on circular chart. |
| `contractor_service_report` | Contractor Field Service Report | OEM burner technician overhaul and combustion report. |

#### Client-Side SHA-256 Hashing Workflow
1. Upon file selection, LuminaFM reads the file buffer via the browser `SubtleCrypto` API.
2. A cryptographic SHA-256 digest is generated (e.g., `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
3. The hash is submitted alongside the file payload. The server independently verifies the hash before committing the binary to object storage.

---

## 2. Statutory Compliance Verification Modal (`ComplianceVerificationModal`)

### 2.1 Purpose & Regulatory Context
- **Purpose**: Enables authorized plant engineers or certified statutory boiler inspectors to record official compliance verifications against international standards (ASME BPVC Section I, EN 12953, NB-23, OSHA 1910.119, ISO 55001).
- **Access Route**: `/audit-evidence` $\rightarrow$ **Regulatory Compliance Records Tab** (Clicking `Verify Compliance` on any clause record).
- **Authorized Roles**: Restricted strictly to `Organization Admin` and `Plant Reliability Engineer` (or certified external statutory inspectors).

---

### 2.2 Visual Presentation & Callout Annotations

```carousel
![Compliance Verification Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-005-compliance-verification-modal.png)
<!-- slide -->
![Compliance Verification Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-005-compliance-verification-modal-annotated.png)
```

#### Numbered Callout Descriptions

| Callout # | UI Component | Description & Operational Function |
|:---:|---|---|
| **1** | **Modal Header & Clause Banner** | Displays framework code (e.g. `ASME_BPVC_SEC_I • PG-60.1`), clause title, asset identifier, and statutory retention expiry. |
| **2** | **Verification Status Selector** | Dropdown setting disposition (`Compliant`, `Non-Compliant`, `Pending Corrective Action`, `Not Applicable`). |
| **3** | **Inspector Certification & Notes** | Mandatory fields for Inspector Full Name, National Board / Regulatory Commission Number, and technical findings narrative. |

---

### 2.3 Form Specification & Field Constraints

| Field Name | UI Input Type | Format / Constraints | Required? | Purpose & Audit Impact |
|---|---|---|:---:|---|
| **Verification Status** | Select Dropdown | Enum (`compliant`, `non_compliant`, `pending_corrective_action`, `not_applicable`) | **Yes** | Official regulatory finding for the clause. |
| **Verifying Engineer / Inspector** | Text Input | String (2–120 chars) | **Yes** | Legal signatory conducting verification. |
| **Inspector Certification Number** | Text Input | String (e.g. `NB-COMM-984421`) | Optional | Official National Board or government license number. |
| **Technical Findings Notes** | Multiline Textarea | String (5–2000 chars) | **Yes** | Detailed observations supporting the disposition. |

---

## 3. Evidence Package Builder Modal (`EvidencePackageModal`)

### 3.1 Purpose & Compliance Disclaimer
- **Purpose**: Compiles a tamper-evident, exportable evidence archive bundling audit logs, statutory compliance records, and cryptographic file attachments for external regulatory inspection audits.
- **Access Route**: `/audit-evidence` $\rightarrow$ **Exportable Evidence Packages Tab** (Clicking `Build Tamper-Evident Evidence Package`).
- **MANDATORY LEGAL DISCLAIMER**:
  > *"Generating a LuminaFM evidence package does not inherently confer regulatory compliance. Statutory compliance requires independent verification against applicable local jurisdiction laws, ASME/NBIC boiler inspection standards, and certified physical inspections."*

---

### 3.2 Visual Presentation & Callout Annotations

```carousel
![Evidence Package Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUDIT-007-evidence-package-builder-modal.png)
<!-- slide -->
![Evidence Package Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-007-evidence-package-builder-modal-annotated.png)
```

#### Numbered Callout Descriptions

| Callout # | UI Component | Description & Operational Function |
|:---:|---|---|
| **1** | **Modal Header & Legal Notice** | Prominent amber advisory block displaying mandatory regulatory compliance disclaimer. |
| **2** | **Framework & Scope Date Range** | Standard selector (`ASME Sec I`, `EN 12953`, `NB-23`, etc.) and ISO 8601 Date Range inputs (`startDate`, `endDate`). |
| **3** | **Included Evidence Checkboxes** | Inclusions toggles for Immutable Audit Event Trail, Verified File Attachments, and Linked Work Orders. |

---

### 3.3 Field-by-Field Form Specification

| Field Name | Input Type | Format / Constraints | Required? | Default | Description |
|---|---|---|:---:|---|---|
| **Governing Framework** | Select Dropdown | Enum (`ASME_BPVC_SEC_I`, `EN_12953`, `NB_23_NBIC`, `OSHA_1910_119`, `ISO_55001`) | **Yes** | `ASME_BPVC_SEC_I` | Target standard for audit scope. |
| **Target Equipment Asset** | Text Input / Select | String (e.g. `BLR-001`, `ALL_ASSETS`) | **Yes** | `BLR-001` | Filters package records to specific boiler or skid. |
| **Audit Period Start Date** | Date Picker | ISO 8601 (`YYYY-MM-DD`) | **Yes** | `2026-11-01` | Beginning of audit verification window. |
| **Audit Period End Date** | Date Picker | ISO 8601 (`YYYY-MM-DD`) | **Yes** | `2026-11-15` | End of audit verification window. |
| **Include Audit Event Trail** | Checkbox | Boolean | Optional | `true` | Embeds chronological before/after change logs. |
| **Include Attachments** | Checkbox | Boolean | Optional | `true` | Bundles raw SHA-256 evidence attachments. |

#### Package Output & Cryptographic Sealing
When `Generate Package` is clicked:
1. LuminaFM queries all compliance records, audit logs, and vault attachments matching the framework and date criteria.
2. A cumulative SHA-256 package manifest is generated.
3. An exportable `.zip` archive containing the audit reports, index JSON, and binary attachments is created for download.
