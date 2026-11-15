# Troubleshooting Guide: Evidence Vault & Upload Issues

This guide addresses problems encountered when uploading certified maintenance evidence files, calculating client-side cryptographic hashes, and compiling tamper-evident regulatory evidence dossiers.

```carousel
![Evidence Upload Modal](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-003-evidence-upload-modal-annotated.png)
<!-- slide -->
![Evidence Package Builder](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUDIT-007-evidence-package-builder-modal-annotated.png)
```

---

## Issue 6.1: File Exceeds the 25MB Maximum Upload Limit

**Problem:** In the `EvidenceUploadModal` (`AUDIT-003`), selecting a high-resolution scanned document or equipment video triggers an immediate error banner:
> *"File exceeds the 25MB maximum evidence upload limit."*

**Possible Cause:**
1. High-resolution multi-page PDF documents or raw uncompressed camera images exceed the 25MB threshold.
2. In adherence to storage optimization and object vault performance rules, single uploads cannot exceed 25 megabytes.

**How to Resolve:**
1. Compress the PDF using standard document compression utilities (e.g. Adobe Acrobat PDF Optimizer or Ghostscript) targeting 150–300 DPI.
2. For equipment photographs, convert uncompressed raw/TIFF formats to optimized JPEG or PNG formats.
3. If an evidence file is inherently large (e.g. a complete 200-page statutory boiler overhaul report), split the document into logical sections (e.g. `Part 1: Ultrasonic NDT Scans.pdf`, `Part 2: Hydrostatic Pressure Charts.pdf`).
4. Re-select the file in `AUDIT-003` and click **Calculate Hash & Upload**.

**Prevention:** Configure plant mobile cameras and diagnostic scan tools to export optimized PDFs under 15MB.

**Escalation:** If a statutory regulatory document cannot be compressed below 25MB, contact the `Organization Admin` to review object storage chunking options.

---

## Issue 6.2: Unsupported MIME Type Error (`INVALID_FILE_TYPE`)

**Problem:** Selecting a file for upload displays:
> *"Error INVALID_FILE_TYPE: Unsupported file type. Only certified document and image formats are permitted."*

**Possible Cause:**
1. The uploaded file has an unsupported or executable file extension (e.g. `.exe`, `.bat`, `.zip`, `.dmg`, `.sh`).
2. For security and anti-malware compliance, the Evidence Vault only accepts certified static file formats.

**How to Resolve:**
1. Ensure your evidence file uses an approved format:
   - **Document Formats**: `.pdf`, `.csv`, `.txt`, `.json`, `.xlsx`, `.docx`
   - **Image Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`
2. If uploading data logs, export them as standard CSV or PDF before uploading.
3. Resubmit the upload.

**Prevention:** Do not attempt to upload compressed archive containers directly; extract files and upload individual PDF reports.

**Escalation:** None; converting to an approved format resolves the error.

---

## Issue 6.3: Client-Side SHA-256 Calculation Stalls

**Problem:** Clicking **Calculate Hash & Upload** causes the spinner to spin indefinitely without transmitting the file.

**Possible Cause:**
1. The client browser is running in an insecure non-HTTPS context where the native `SubtleCrypto` Web API is restricted by browser security policies.
2. Insufficient client RAM on a low-memory mobile tablet attempting to hash a large file.

**How to Resolve:**
1. Confirm that you are accessing LuminaFM via a secure `https://` origin (or `http://localhost` for development).
2. Close other background browser tabs on the mobile tablet to free device memory.
3. Re-open the modal and re-attempt the upload.

**Prevention:** Always access enterprise CMMS portals over verified TLS/HTTPS domains.

**Escalation:** If `SubtleCrypto` is unavailable on legacy tablet hardware, contact IT to update the browser application.

---

## Issue 6.4: Mandatory Regulatory Legal Notice Blocks Package Compilation

**Problem:** In the `EvidencePackageModal` (`AUDIT-007`), the **Generate Package** button is disabled, or a prompt displays:
> *"Mandatory compliance notice must be acknowledged before compilation."*

**Possible Cause:**
1. The operator attempted to compile an evidence package without acknowledging the statutory regulatory disclaimer.
2. By law, software cannot claim automated regulatory certification; users must acknowledge that statutory compliance requires independent physical inspection.

**How to Resolve:**
1. In the modal, locate the amber **Mandatory Regulatory Compliance Notice** box.
2. Read the statutory notice:
   > *"Generating a LuminaFM evidence package does not inherently confer regulatory compliance. Statutory compliance requires independent verification against applicable local jurisdiction laws, ASME/NBIC boiler inspection standards, and certified physical inspections."*
3. Check the confirmation checkbox: **"I acknowledge that regulatory certification requires certified physical inspector signoff."**
4. The **Generate Package** button unlocks immediately. Click to compile the sealed archive.

**Prevention:** Make notice acknowledgement a standard step in your evidence preparation workflow.

**Escalation:** None; this is an intentional statutory safeguard.
