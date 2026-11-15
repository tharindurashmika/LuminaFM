# Workflow 02: Tenant Branding & White-Label Customization

### WF-02: Tenant Branding & White-Label Customization

**Purpose:** Configure white-label organization branding by uploading a custom corporate logo, previewing header integration in real time, configuring regional facility localization (timezone and currency), and inspecting cloud deployment architecture.

**Required Role:** `Organization Admin` (Restricted: other roles cannot access `/settings`).

**Prerequisites:**
1. Authenticated session as `Organization Admin`.
2. Corporate logo image file in SVG or PNG format (recommended: transparent background, max 2MB).

**Starting Point:** `/settings` (Organization & White-Label Settings).

---

### Procedure

#### Step 1: Navigate to Organization Settings
- From the sidebar navigation menu, click **Organization Settings** (or enter URL `/settings`).
- The page loads with 3 sub-tabs:
  1. **White-Label Branding** (`SET-001`)
  2. **Regional & Localization** (`SET-002`)
  3. **Deployment Architecture** (`SET-003`)

```carousel
![White-Label Branding Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/SET-001-organization-branding-settings.png)
<!-- slide -->
![White-Label Branding Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/SET-001-organization-branding-settings-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Settings Tabs Bar)**: Switcher between Branding, Localization, and Deployment.
- **Marker 2 (Client Logo Uploader)**: Drag-and-drop file upload zone and preset selection pills.
- **Marker 3 (Live Header Preview)**: Real-time visual mockup showing how the logo renders in the sticky navbar.

---

#### Step 2: Upload Custom Corporate Logo
1. On the **White-Label Branding** tab, locate the **Corporate Logo Upload** card.
2. Click the upload target box or drag a logo file into the dropzone.
3. *Alternative*: Select one of the pre-loaded enterprise presets:
   - **Lumina Standard**: Default gold and navy technical crest.
   - **Apex Manufacturing**: High-contrast geometric red logo.
   - **Global Energy**: Emerald green leaf and power motif.
4. Observe the **Live Navbar Header Preview** box immediately re-rendering the brand asset.
5. Toggle the **Show 'Powered by LuminaFM' Platform Badge** switch based on commercial contract requirements.
6. Click **Save Branding Configuration**. A green confirmation banner confirms persistence.

---

#### Step 3: Configure Regional & Localization Preferences
1. Click the **Regional & Localization** tab (`SET-002`).

```carousel
![Localization Settings Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/SET-002-organization-localization-settings.png)
<!-- slide -->
![Localization Settings Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/SET-002-organization-localization-settings-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Localization Tab Header)**: Operational region configuration panel.
- **Marker 2 (Timezone & Currency Form)**: Dropdowns for operational IANA timezone and ISO 4217 currency.
- **Marker 3 (Save Changes Action)**: Primary button committing regional settings to tenant profile.

2. Set **Facility Timezone**: Select `Asia/Colombo (UTC+05:30)` from the IANA timezone dropdown.
3. Set **Accounting Base Currency**: Select `LKR (Sri Lankan Rupee)` or `USD ($)`.
4. Set **Date Display Format**: Choose `YYYY-MM-DD (ISO 8601)` or `DD/MM/YYYY`.
5. Click **Save Localization Settings**.

---

#### Step 4: Verify Deployment Architecture & Connection Pool
1. Click the **Deployment Architecture** tab (`SET-003`).

```carousel
![Deployment Architecture Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/SET-003-organization-deployment-settings.png)
<!-- slide -->
![Deployment Architecture Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/SET-003-organization-deployment-settings-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Deployment Tab)**: Infrastructure hosting model indicator.
- **Marker 2 (Tenant Model Card)**: Status card displaying `Shared Multi-Tenant SaaS` vs `Dedicated Customer Deployment`.
- **Marker 3 (Database Pool Health)**: Real-time telemetry on active PostgreSQL connection pool and read replica status.

2. Inspect the **Deployment Model Badge**: Confirms `Dedicated Enterprise Cloud Instance`.
3. Review PostgreSQL Connection Pool metrics: `Active: 4 | Idle: 16 | Max: 50`.
4. Verify that Object Storage persistence confirms encrypted S3/GCS bucket connectivity.

---

**Expected Result:** The custom corporate logo replaces the default platform crest across the top navigation bar, report exports, and print layouts; regional timestamps reflect the facility timezone; and currency symbols align with the accounting ledger.

**Common Problems & Practical Solutions:**
- *Problem*: Uploaded logo appears distorted or stretched in the header.
  *Solution*: Use an image with a horizontal aspect ratio (between 3:1 and 4:1) with a transparent background. SVG format is recommended.
- *Problem*: Settings tab displays `"403 Forbidden: Organization Admin role required"`.
  *Solution*: Use the TopNavbar role switcher to change your active role to `Organization Admin`.

**Related Workflows:**
- [WF-01: User Authentication & Role Switching](file:///e:/My%20Owns/docs/user-manual/05-workflows/01-user-auth-and-rbac.md)
- [WF-16: Enterprise Compliance Audit](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md)
