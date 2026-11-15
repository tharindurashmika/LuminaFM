# Workflow 01: User Authentication & Role Switching

### WF-01: User Authentication & Role Switching

**Purpose:** Authenticate user credentials against the organization tenant database, establish an encrypted JWT session, and switch active RBAC personas on-the-fly to test or exercise role-specific facility permissions.

**Required Role:** Accessible to all registered facility personnel (`Organization Admin`, `Plant Reliability Engineer`, `Boiler Plant Operator`, `Maintenance Technician`).

**Prerequisites:**
1. Active tenant code (e.g. `COLOMBO-GRAND`).
2. Registered user credentials in database.
3. Network connectivity to LuminaFM server.

**Starting Point:** `/login` (User Sign-In Screen).

---

### Procedure

#### Step 1: Open the LuminaFM Login Portal
- In your browser, navigate to `http://localhost:3000/login` (or facility production URL).
- The portal renders a high-contrast sign-in card with the gold LuminaFM brand crest, tenant indicator, email and password fields, and 4 quick-simulation persona buttons.

```carousel
![Login Portal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUTH-001-login-desktop.png)
<!-- slide -->
![Login Portal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/AUTH-001-login-desktop-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Header Crest)**: Official LuminaFM brand logo and tenant badge (`COLOMBO-GRAND`).
- **Marker 2 (Credentials Form)**: Work email input, password input, and tenant code routing field.
- **Marker 3 (Sign In Trigger)**: Primary blue submit button executing JWT exchange.
- **Marker 4 (1-Click Role Simulation)**: Quick login shortcuts pre-filling credentials for all 4 personas.

---

#### Step 2: Input Authentication Credentials
1. Enter your work email: `chief.engineer@colombohotel.lk`.
2. Enter your password: `••••••••••••`.
3. Enter your tenant code (optional, defaults to active tenant): `COLOMBO-GRAND`.
4. *Alternatively for testing*: Click any of the 4 quick simulation buttons:
   - **Org Admin**: Logs in as System Administrator.
   - **Reliability Engineer**: Logs in as Lead Plant Engineer.
   - **Boiler Operator**: Logs in as Floor Watchkeeping Operator.
   - **Maintenance Tech**: Logs in as Certified Mechanical Technician.

---

#### Step 3: Submit Credentials & Authenticate
- Click the **Sign In to Facility** button.
- The button enters a loading state with a spinning indicator.
- Upon verification, the server issues an HTTP-only JWT token, initializes the `AuthContext` store, and redirects the browser to the Executive Command Center at `/`.

---

#### Step 4: Verify Active Role in Top Navigation Bar
- Review the sticky header at the top right of the application.
- Observe the **Active Role Badge** rendering the current persona name in designated chromatic styling (e.g., Deep Indigo for `Plant Reliability Engineer`).

```carousel
![Top Navbar Role Selector Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/NAV-001-topbar-role-selector-popover.png)
<!-- slide -->
![Top Navbar Role Selector Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/NAV-001-topbar-role-selector-popover-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Active Role Badge)**: Shows `Plant Reliability Engineer` with chevron indicator.
- **Marker 2 (Role Menu Popover)**: Dropdown container listing all 4 system roles.
- **Marker 3 (Instant Switch Trigger)**: Single-click option updating RBAC permissions client-side.

---

#### Step 5: Switch Active RBAC Persona On-Demand
1. Click the **Active Role Badge** in the top navigation bar.
2. The `TopNavbarRoleSelectorPopover` dialog opens.
3. Click **Boiler Plant Operator**.
4. The popover dismisses immediately.
5. The navigation sidebar updates in real time: administrative routes (`/settings`, `/cost-analysis`) are hidden, and operational floor routes (`/daily-monitoring`, `/operator`) are elevated.
6. The active badge shifts to an emerald tone with the label `Boiler Plant Operator`.

---

**Expected Result:** User is successfully authenticated, tenant scope is confirmed, and the active session dynamically reflects role-specific permissions and navigation items.

**Common Problems & Practical Solutions:**
- *Problem*: Red error banner `"Invalid email or password combination"`.
  *Solution*: Verify credentials or click one of the 4 quick simulation buttons to load pre-seeded credentials.
- *Problem*: Role menu popover does not open when clicking the badge.
  *Solution*: Ensure you are clicking directly on the pill badge in the top right header. In mobile viewports, access the role switcher via the slide-out hamburger menu drawer.

**Related Workflows:**
- [WF-02: Tenant Branding & White-Label Customization](file:///e:/My%20Owns/docs/user-manual/05-workflows/02-white-label-branding.md)
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-10: Industrial Tablet Floor Kiosk Experience](file:///e:/My%20Owns/docs/user-manual/05-workflows/10-floor-kiosk-operations.md)
