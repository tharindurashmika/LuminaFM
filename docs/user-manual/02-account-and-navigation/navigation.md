# Account Guide: Application Navigation & Shell

## 1. Overview & Purpose

The **LuminaFM Application Shell** provides consistent, role-aware, and accessible navigation across all facility modules. It comprises the **Top Navigation Bar** and the **Facility Operations Sidebar**, ensuring that personnel can move between operational monitoring, work order execution, and decision governance with minimal clicks.

---

## 2. Top Navigation Bar (`TopNavbar`)

The top navigation bar is pinned to the top of every screen (except the standalone kiosk view) with a backdrop blur filter:

![Figure 14.1: Top Navigation Bar & Global Controls](../screenshots/original/NAV-001-topbar-role-selector-popover.png)
*Figure 14.1: Top Navigation Bar with Role Selector Popover Open (1440 × 900)*

### Key Elements & Controls

1. **Brand Crest & Home Trigger**:
   - Displays the corporate organization logo (or LuminaFM gold crest fallback).
   - Clicking the logo navigates immediately to the Command Center (`/`).

2. **Tenant Scope Indicator**:
   - Displays the active facility name (e.g., `Colombo Grand Hospitality Group`) and organization slug (`COLOMBO-GRAND`).
   - Confirms that the session is executing within an isolated multi-tenant database partition.

3. **Critical Safety Alert Indicator**:
   - A pulsing gold/red warning pill (e.g., `BLR-001 Pressure Alert`).
   - Clicking this badge jumps directly to the urgent safety work order in `/work-orders`.

4. **Tablet Kiosk Trigger (`Tablet Kiosk`)**:
   - An accessible gold action button designed for rapid switching to the touch-first operator kiosk (`/operator`).

5. **Row-Level Security (RLS) Status Badge**:
   - Displays `RLS Isolated`, confirming that PostgreSQL Row-Level Security policies are actively enforced on all database queries.

6. **Interactive Active Role Switcher**:
   - A dropdown button displaying the current active role badge (e.g., `Organization Admin`).
   - Clicking this button opens a popover displaying all four system roles. Selecting any role instantaneously switches active permissions and updates visible sidebar menu items without requiring a page reload or re-login.

7. **User Profile & Sign-Out Button**:
   - Displays the authenticated user's full name and email address.
   - Clicking the logout icon (`LogOut`) securely clears JWT tokens and terminates the session.
   - If unsynchronized offline records exist in the browser's IndexedDB queue, the system triggers the **Logout Sync Guard Modal**, warning the user and preventing data loss.

---

## 3. Operations Sidebar (`Sidebar`)

The persistent desktop sidebar provides direct access to all 12 operational modules.

### Menu Items & Role Access Mapping

| Menu Item | Destination Route | Icon | Badges | Required Roles / Permissions |
|---|---|---|---|---|
| **Command Center** | `/` | `LayoutDashboard` | — | All Roles |
| **Asset Master** | `/assets` | `Cpu` | `12 Assets` | `assets:read` (All Roles) |
| **Equipment Hierarchy** | `/hierarchies` | `Network` | `Dual DAG` | `assets:read` (All Roles) |
| **Maintenance Calendar** | `/maintenance-calendar` | `Calendar` | `PM Due` | `work_orders:read` (All Roles) |
| **Work Management** | `/work-orders` | `ClipboardList` | `Active` | `work_orders:read` (All Roles) |
| **Inspections & Faults** | `/inspections` | `ClipboardCheck` | — | `work_orders:read` (All Roles) |
| **Boiler Logbook** | `/daily-monitoring` | `Flame` | `Shift Logs` | `operations:daily_log` (All Roles) |
| **Decision & Reporting** | `/reports` | `BarChart3` | `ANP & PM` | `work_orders:read` (All Roles) |
| **Audit & Evidence** | `/audit-evidence` | `ShieldCheck` | `ASME Vault` | `work_orders:read` (All Roles) |
| **Cost Analytics** | `/cost-analysis` | `DollarSign` | `72% PM` | `Organization Admin`, `Plant Reliability Engineer` (`finance:read`) |
| **Decision Governance** | `/governance` | `Scale` | `ANP v1` | `Organization Admin`, `Plant Reliability Engineer` (`governance:manage`) |
| **White-Label & Org** | `/settings` | `Settings` | — | `Organization Admin` (`org:admin`) |

### Sidebar Boiler Telemetry Status Card
The bottom section of the sidebar includes a live telemetry heartbeat widget:
- Displays active boiler module status (`Boiler Module v1.4`).
- Features a pulsing green/gold beacon indicating live telemetry data ingestion.
- Displays the active tenant code (`COLOMBO-GRAND`).

---

## 4. Mobile Slide-Over Navigation Drawer

On screen widths under $1024\text{px}$ (tablets in portrait and mobile phones):
- The desktop sidebar is hidden.
- Tapping the hamburger menu icon ($\equiv$) in the top navigation bar slides in an accessible drawer covering the left side of the screen.
- Tapping any navigation link or tapping outside the drawer automatically dismisses the slide-over panel.
