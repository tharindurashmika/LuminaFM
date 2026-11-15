# Troubleshooting Guide: Authentication & Access Issues

This guide addresses problems related to signing into LuminaFM, tenant routing, session expirations, and Role-Based Access Control (RBAC) permission blocks.

```carousel
![Login Screen Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/AUTH-001-login-desktop.png)
<!-- slide -->
![Role Selector Popover](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/NAV-001-topbar-role-selector-popover-annotated.png)
```

---

## Issue 1.1: Invalid Email or Password on Sign-In

**Problem:** The user inputs credentials on `/login`, clicks **Sign In to Facility**, and receives a red error banner: `"Invalid email or password combination"`.

**Possible Cause:**
1. Typographical error in email address or password string.
2. User account does not exist in the tenant database.
3. User account is deactivated or locked.

**How to Resolve:**
1. Re-type the work email address carefully (e.g. `chief.engineer@colombohotel.lk`). Verify there are no leading or trailing spaces.
2. Re-enter the password. Check Caps Lock status.
3. *For Development / Staging Environments*: Click one of the 4 **1-Click Role Simulation Buttons** (`Org Admin`, `Reliability Engineer`, `Boiler Operator`, `Maintenance Tech`) located below the submit button on `AUTH-001` to pre-populate verified test credentials.
4. Click **Sign In to Facility**.

**Prevention:** Use a facility-approved password manager. Ensure corporate single-sign-on (SSO) credentials align with your enterprise identity provider.

**Escalation:** If you cannot authenticate after 3 attempts, contact your `Organization Admin` to verify that your user account is active in the `users` table and linked to an active `organization_memberships` record.

---

## Issue 1.2: Tenant Code Mismatch or Organization Not Found

**Problem:** Upon sign-in, the system displays: `"Tenant code [ORGANIZATION_CODE] not found or inactive"`.

**Possible Cause:**
1. An incorrect or misspelled tenant code was entered into the optional **Organization Code** input field.
2. The user's account belongs to a different facility division or subsidiary.
3. The organization tenant has been set to `isActive = false` by platform administration.

**How to Resolve:**
1. On `/login`, clear the **Organization Code** field to allow the system to resolve your tenant automatically from your verified user email.
2. If manually entering a code, verify the exact uppercase identifier (e.g. `COLOMBO-GRAND`, `KINGSBURY_CMB`).
3. Click **Sign In to Facility**.

**Prevention:** Bookmark your facility's direct tenant sign-in URL or leave the tenant code input blank if your email is uniquely bound to one organization.

**Escalation:** Contact your IT Systems Administrator to confirm your facility's active organization code.

---

## Issue 1.3: 403 Forbidden Access Denied Screen

**Problem:** The user navigates to a facility module (e.g. `/cost-analysis`, `/governance`, or `/settings`) and is presented with a full-screen **Access Denied (403 Forbidden)** state:
> *"Forbidden State: You do not have permission to access this facility module. Requires role: [Organization Admin]."*

**Possible Cause:**
1. Your active RBAC persona does not possess the required role or permission key for the target route:
   - `/settings`: Requires `Organization Admin` (`org:admin`).
   - `/cost-analysis`: Requires `Organization Admin` or `Plant Reliability Engineer` (`finance:read`).
   - `/governance`: Requires `Organization Admin` or `Plant Reliability Engineer` (`governance:manage`).
2. You switched roles during testing and forgot to switch back.

**How to Resolve:**
1. Look at the **Active Role Badge** in the top navigation bar (`NAV-001`).
2. Click the badge to open the `TopNavbarRoleSelectorPopover`.
3. Select an authorized persona (e.g., switch from `Boiler Plant Operator` to `Plant Reliability Engineer` or `Organization Admin`).
4. The popover dismisses, permissions recompute immediately, and the page mounts without requiring a full page refresh.

**Prevention:** Review the [Permissions Matrix](file:///e:/My%20Owns/docs/user-manual/07-reference/permissions-matrix.md) to understand which modules your operational role is authorized to view.

**Escalation:** If your assigned job duties require permanent access to a restricted module, request that your `Organization Admin` update your role assignment in the membership directory.

---

## Issue 1.4: Session Expiration & Redirection to Login

**Problem:** While working in LuminaFM, the user clicks an action or navigates to a new tab and is abruptly returned to the `/login` portal.

**Possible Cause:**
1. The JSON Web Token (JWT) session reached its expiration limit (typically 8 to 24 hours).
2. The user was signed out by a concurrent session or browser cache clearance.
3. The server restarted and invalidated in-memory session tokens.

**How to Resolve:**
1. Re-enter your credentials on `/login`.
2. Click **Sign In to Facility**.
3. LuminaFM restores your session state and navigates back to your working view.
4. *Note for Floor Operators*: If you were using the offline floor kiosk (`/operator`), uncommitted shift drafts stored in IndexedDB are **not lost** during session expiration and will reload upon re-authenticating.

**Prevention:** Avoid clearing cookies or browser application data during an active watchkeeping shift.

**Escalation:** If sessions expire in under 15 minutes, notify IT to verify the `JWT_EXPIRY` setting in the backend environment configuration.

---

## Issue 1.5: Role Switcher Badge Not Updating UI Components

**Problem:** The user selects a new role in the top navbar popover, but the page content remains in its previous state.

**Possible Cause:**
1. Transient React state lag on a heavy data table.
2. In-flight network request completing after role transition.

**How to Resolve:**
1. Press `F5` (or `Ctrl+R`) to trigger a hard refresh of the browser window.
2. Verify that the **Active Role Badge** in the header confirms the desired persona.

**Prevention:** Allow open modals to close before switching roles in the header.

**Escalation:** None; hard refresh resolves local browser render state.
