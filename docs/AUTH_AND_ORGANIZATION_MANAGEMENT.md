# LuminaFM - Authentication, Organization Management & White-Label Architecture

**Author**: Principal Software Architect & Senior Application Security Engineer  
**Classification**: Engineering Governance & Security Specification  
**Status**: Implemented & Verified (157 Automated Tests Passing)  
**Target Environment**: Node.js 20+, TypeScript, PostgreSQL 15+, Express, Prisma ORM  

---

## 1. Architectural Overview & Design Principles

LuminaFM is designed as a multi-tenant enterprise CMMS platform with support for both **shared multi-tenant SaaS** and **dedicated single-tenant installations**. To protect sensitive equipment data across competing industrial operators and hotel chains, the identity and organization management architecture enforces the following invariants:

1. **Decoupled User Identity & Organization Memberships**: A user exists globally once in the system (`users` table) but holds distinct memberships (`organization_memberships`) across one or more organizations.
2. **Never Trust Client-Supplied Tenant Identifiers**: The client can request an active organization during login or context switching, but the target organization is strictly verified against active database memberships before token issuance or request execution.
3. **Cryptographic Token Lifecycle with Automatic Rotation**: Sessions employ short-lived JWT access tokens (`1h`) and rotatable refresh tokens (`7d`). Using a revoked refresh token immediately flags potential token theft (replay attack defense) and revokes all active sessions for that user.
4. **Distinct Platform Identity & Immutable Fallback Branding**: Client organizations can customize their logos, brand colors, themes, date/time/number formats, and operational preferences. However, LuminaFM maintains an administrator-controlled platform fallback identity (`#0F172A` Midnight Slate and `#F59E0B` Industrial Gold) to guarantee visual and functional integrity when tenant customization is absent or partial.
5. **Secure Object Storage**: White-label logos are uploaded and stored through an isolated object storage abstraction (`LocalObjectStorageService`) enforcing strict MIME-type validation, size limits (5MB), unique collision-resistant keys, path traversal defenses, and automatic deletion of replaced legacy files.

---

## 2. Authentication & Session Lifecycle

```
             ┌──────────────────────────────────────────────────────────────┐
             │                     CLIENT USER WORKFLOW                     │
             └──────┬───────────────────────┬────────────────────────┬──────┘
                    │                       │                        │
       POST /api/auth/login   POST /api/auth/refresh   POST /api/auth/switch-org
                    │                       │                        │
                    ▼                       ▼                        ▼
      ┌────────────────────────┐  ┌────────────────────┐   ┌────────────────────┐
      │ 1. Password & Account  │  │ 2. Cryptographic   │   │ 3. Membership &    │
      │    Verification        │  │    Token Rotation  │   │    Permission      │
      │    (bcrypt + status)   │  │    & Replay Check  │   │    Resolution      │
      └─────────────┬──────────┘  └──────────┬─────────┘   └─────────┬──────────┘
                    │                        │                       │
                    └────────────────────────┼───────────────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │  ISSUED DUAL-TOKEN PAIR   │
                               │  - Access Token (1h)      │
                               │  - Refresh Token (7d)     │
                               │  - Active Org Branding    │
                               │  - Available Orgs List    │
                               └───────────────────────────┘
```

### A. Secure Login (`POST /api/auth/login`)
- **Payload**: `{ email, password, organizationCode?, organizationId? }`
- **Validation**:
  - Verifies credentials against `users.password_hash` using bcrypt.
  - Verifies that `user.is_active` is true.
  - Queries active memberships (`status = 'active'`).
  - If user belongs to multiple organizations:
    - If `organizationCode` or `organizationId` is specified, selects that membership.
    - If unspecified, defaults to the primary active membership, but returns the full `available_organizations` array so the frontend can display an organization picker.
  - Generates an `access_token` and rotatable `refresh_token`.
  - Updates `user.last_login_at`.
  - Returns user profile, active organization details with effective branding, and authorized roles and permissions.

### B. Token Renewal & Rotation (`POST /api/auth/refresh`)
- **Payload**: `{ refreshToken }` (or `X-Refresh-Token` header)
- **Rotation & Replay Attack Defense**:
  - Validates cryptographic signature of the refresh token.
  - Checks if the token has already been revoked. If a revoked token is presented, the system treats it as a compromised token, immediately revoking **all active sessions** for that user.
  - Generates a new access token and a new refresh token, marking the old refresh token as replaced/revoked.

### C. Secure Logout (`POST /api/auth/logout`)
- **Payload**: `{ refreshToken? }`
- Revokes the provided refresh token in the session registry, ensuring it can never be used to renew access.

### D. Password Recovery Flow
1. **Request Reset (`POST /api/auth/forgot-password`)**:
   - Accepts `{ email }`.
   - Generates a cryptographically random, 32-byte token with a 1-hour expiration.
   - Stores the SHA-256 hash in the password reset registry.
   - Defends against user enumeration by returning a uniform success message regardless of whether the email exists.
2. **Execute Reset (`POST /api/auth/reset-password`)**:
   - Accepts `{ token, newPassword }`.
   - Validates password length ($\ge 8$ characters).
   - Verifies and consumes the token (single-use constraint).
   - Hashes the new password with bcrypt and updates `users.password_hash`.
   - Revokes all active refresh tokens for the user, forcing re-authentication across all devices.

### E. User Invitation & Acceptance Workflow
1. **Invite User (`POST /api/auth/invite`)**:
   - Authorized administrators (`requirePermission('users:invite')`) can invite prospective users.
   - Accepts `{ email, roleIds?, jobTitle?, employeeCode? }`.
   - Checks that the user is not already an active member (prevents 409 duplicate conflicts).
   - Generates a 7-day cryptographically secure invitation token.
   - Creates a pending membership with status `'invited'`.
2. **Accept Invite (`POST /api/auth/accept-invite`)**:
   - Invitee provides `{ token, fullName, password }`.
   - Consumes the invitation token.
   - Creates or updates the user profile with the hashed password.
   - Transitions membership status from `'invited'` to `'active'`.
   - Assigns pre-configured roles via `membership_roles`.
   - Logs the user in and issues session tokens for the joined organization.

### F. Multi-Organization Switching
1. **List Organizations (`GET /api/auth/organizations`)**:
   - Returns all organizations where the user holds an active membership.
   - Includes organization code, name, logo, timezone, currency, user job title, roles, and marks the active organization with `isCurrent: true`.
2. **Switch Organization (`POST /api/auth/switch-organization`)**:
   - Accepts `{ organizationId? , organizationCode? }`.
   - Verifies the user is an active member of the target tenant.
   - Resolves the target tenant's specific roles and permissions.
   - Issues a new token pair bound to the target organization context.

---

## 3. Organization Settings & White-Label Branding System

### A. Fallback Platform Identity (`LUMINA_FALLBACK_BRANDING`)
To ensure that client white-labeling never breaks application usability or loses essential configuration, LuminaFM implements an immutable fallback system:

| Setting | Platform Fallback Default | Description |
| :--- | :--- | :--- |
| **Platform Name** | `LuminaFM` | Core system identity |
| **Platform Logo** | `/static/lumina-logo.svg` | Vector SVG facility node mark |
| **Favicon** | `/favicon.ico` | Standard favicon |
| **Primary Color** | `#0F172A` | Midnight Slate |
| **Accent Color** | `#F59E0B` | Industrial Gold |
| **Background Color** | `#0B1120` | Deep Midnight |
| **Text Color** | `#F8FAFC` | Crisp Off-White |
| **Theme** | `dark` | High-contrast plant floor theme |
| **Default Timezone** | `Asia/Colombo` | Base research environment |
| **Base Currency** | `LKR` | Base currency |
| **Date Format** | `YYYY-MM-DD` | ISO 8601 standard |
| **Time Format** | `24h` | Industrial 24-hour clock |
| **Number Format** | `.` decimal, `,` thousands | Standard financial format |
| **Work Order Priority** | `medium` | Default creation priority |
| **Maintenance Lead Time** | `7` days | Preventative schedule buffer |
| **Boiler Shift Hours** | `8` hours | Standard operating shift |

### B. White-Label Merging Algorithm (`resolveEffectiveBranding`)
When querying organization settings or public login branding, LuminaFM applies client-specific overrides on top of the fallback defaults:
$$\text{EffectiveSetting} = \text{ClientOverride} \parallel \text{PlatformFallback}$$
- If a client has not uploaded a logo, the platform logo is served.
- If a client only customizes `primaryColor`, all typography, date formats, and regional preferences gracefully retain their configured defaults.
- Public endpoint `GET /api/organization/branding/:code` allows the frontend login page to apply tenant branding *before* the user submits credentials.

### C. Secure Object Storage for Uploaded Logos (`LocalObjectStorageService`)
Located in [src/services/storage.service.ts](file:///e:/My%20Owns/src/services/storage.service.ts):
- **Directory Confinement**: Files are stored under `<rootDir>/logos/`. Any attempt to escape via `../` or `..\` is trapped and aborted with `PATH_TRAVERSAL_DETECTED`.
- **MIME-Type Whitelisting**: Strictly restricts uploads to `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, and `image/gif`. Executables, HTML scripts, and binaries are rejected.
- **Collision-Resistant Keys**: Stored files follow the pattern `logo-<tenantId>-<timestamp>-<randomHex>.<ext>`.
- **Automatic Replacement Cleanup**: When a new logo is uploaded via `POST /api/organization/logo`, the service automatically deletes the legacy logo file from disk.

---

## 4. Deployment Model Configurations

LuminaFM supports two deployment profiles via the `deploymentMode` and `deploymentSettings` fields:

1. **Shared Multi-Tenant SaaS (`saas_multitenant`)**:
   - Multiple client organizations operate on a single shared PostgreSQL database.
   - Tenant isolation is strictly enforced via Row-Level Security (`NOBYPASSRLS`) and transaction-scoped session parameters (`set_config('app.current_tenant_id', $1, true)`).
2. **Dedicated Customer Deployment (`dedicated_instance`)**:
   - Enterprise clients operating in private clouds or dedicated containers.
   - Configurable settings stored in `deployment_settings` (JSONB):
     - `dedicatedHost`: Custom domain (e.g. `kingsbury.luminafm.com`).
     - `ssoProvider`: Enterprise SAML 2.0 or OIDC integration.
     - `storageBucket`: Dedicated S3/GCS bucket URI.
     - `isolatedDatabase`: Boolean flag indicating dedicated physical database.

---

## 5. Automated Verification & Test Coverage

All authentication, organization management, branding, and tenant isolation flows are verified by **157 automated tests** executing in Vitest:

| Test Suite | File | Tests | Status | Duration |
| :--- | :--- | :---: | :---: | :---: |
| **Auth & Organization Management** | [tests/auth-and-organization-management.test.ts](file:///e:/My%20Owns/tests/auth-and-organization-management.test.ts) | 24 | **PASSED** | 4.7s |
| **Tenant Authorization & Security** | [tests/tenant-authorization-security.test.ts](file:///e:/My%20Owns/tests/tenant-authorization-security.test.ts) | 105 | **PASSED** | 105ms |
| **Tenant Extension & Mathematical Scoping** | [tests/tenant-isolation.test.ts](file:///e:/My%20Owns/tests/tenant-isolation.test.ts) | 26 | **PASSED** | 62ms |
| **Seed & Configuration Idempotency** | [tests/seed-idempotency.test.ts](file:///e:/My%20Owns/tests/seed-idempotency.test.ts) | 2 | **PASSED** | 310ms |
| **Total Automated Tests** | | **157** | **100% PASSED** | **< 6.0s** |

### Verified Test Scenarios:
1. **Login & Multi-Tenant Selection**: Verified single and multi-tenant user authentication, organization selection by code, rejection of invalid passwords, and rejection of unauthorized tenant targeting.
2. **Token Renewal & Rotation**: Verified that valid refresh tokens produce rotated token pairs and that reused/revoked refresh tokens trigger security revocation.
3. **Password Recovery**: Verified token generation, password hashing update, single-use token consumption, and automatic session revocation upon password change.
4. **User Invitation Workflow**: Verified invite token generation, 7-day expiration, duplicate invite rejection, and membership activation upon acceptance.
5. **Multi-Organization Listing & Switching**: Verified listing of active memberships and dynamic switching of active tenant context.
6. **Object Storage**: Verified secure logo upload, unique key generation, MIME filtering, anti-traversal defenses, and automatic replacement deletion.
7. **Branding & Localization**: Verified complete platform fallback defaults, deep merging of custom client branding, timezone, currency, date/number formatting, and preferences.
