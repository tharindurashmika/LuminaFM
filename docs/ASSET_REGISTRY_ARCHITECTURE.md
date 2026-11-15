# LuminaFM - Generic Asset Registry & Hierarchies Architecture

**Author**: Principal Software Architect & Senior Database Architect  
**Classification**: Engineering Governance & Architecture Specification  
**Status**: Implemented & Verified (174 Automated Tests Passing)  
**Target Environment**: Node.js 20+, TypeScript, PostgreSQL 15+, Prisma ORM  

---

## 1. Architectural Vision & Core Principles

LuminaFM's Asset Registry is built as an **extensible, multi-category industrial equipment catalog**. Rather than coupling core logic to boilers alone, the asset domain is completely generic—treating steam boilers, centrifugal chillers, industrial pumps, diesel generators, electrical transformers, and air handling units uniformly through standard entity relationships, while allowing specialized operational parameters to attach dynamically via EAV attribute schemas.

```
                                  ┌──────────────────────────────┐
                                  │      ORGANIZATION (Tenant)   │
                                  └──────────────┬───────────────┘
                                                 │ 1:N
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │         SITE (Campus)        │
                                  └──────┬────────────────┬──────┘
                                         │ 1:N            │ 1:N
                   ┌─────────────────────┘                └─────────────────────┐
                   ▼                                                            ▼
    ┌──────────────────────────────┐                             ┌──────────────────────────────┐
    │      LOCATION HIERARCHY      │                             │       SYSTEM HIERARCHY       │
    │      (Physical / Spatial)    │                             │    (Technical / Functional)  │
    ├──────────────────────────────┤                             ├──────────────────────────────┤
    │ Building A                   │                             │ Thermal Energy Utilities     │
    │   └── Floor B1               │                             │   └── Steam Distribution     │
    │         └── Plant Room 02    │                             │         └── High Pressure Loop│
    └──────────────┬───────────────┘                             └──────────────┬───────────────┘
                   │                                                            │
                   │ (Spatial Coordinate)                                       │ (Process Topology)
                   │                                                            │
                   └─────────────────────────┐        ┌─────────────────────────┘
                                             │        │
                                             ▼        ▼
                                  ┌──────────────────────────────┐
                                  │       ASSET REGISTRY         │
                                  │   (Parent-Child Assembly)    │
                                  ├──────────────────────────────┤
                                  │ [Parent] Steam Boiler #01    │
                                  │   ├── [Child] Burner Unit    │
                                  │   └── [Child] Feedwater Pump │
                                  └──────────────┬───────────────┘
                                                 │
                          ┌──────────────────────┴──────────────────────┐
                          ▼                                             ▼
           ┌──────────────────────────────┐              ┌──────────────────────────────┐
           │     CATEGORY HIERARCHY       │              │       BRAND & MODEL          │
           ├──────────────────────────────┤              ├──────────────────────────────┤
           │ Boilers                      │              │ Brand: Thermax Limited       │
           │   └── Industrial Steam Boilers│             │ Model: Combimax 1100 kg/hr   │
           └──────────────────────────────┘              └──────────────────────────────┘
```

---

## 2. Independence of Spatial Locations vs Functional Systems

Industrial facility maintenance requires two fundamentally distinct trees that must never be collapsed into a single hierarchy:

1. **Physical Location Hierarchy (`locations`)**:
   - Represents physical geographic coordinates (where a technician walks).
   - Structure: `Site -> Building -> Wing / Floor -> Room / Zone / Bay`.
   - Every location record belongs strictly to a single `site_id`.
   - Independent of what equipment or pipes pass through that space.

2. **Technical System Hierarchy (`systems`)**:
   - Represents process flow topology (how energy, fluids, or data move).
   - Structure: `Site -> Primary Utility -> Process Subsystem -> Distribution Circuit`.
   - Example: Steam Distribution Circuit may span across 3 buildings and 8 physical rooms, yet forms a single unified technical system.
   - Independent of the physical walls enclosing the equipment.

### Structural Independence Invariant
> An asset holds **two independent foreign keys**: `location_id` (mandatory spatial coordinate) and `system_id` (optional functional coordinate). Both must belong to the same `site_id` and authorized tenant. Neither hierarchy is a parent or child of the other.

---

## 3. Entity Relationships & Cross-Validation Rules

### A. Strict Site-Boundary Validation
To prevent cross-site corruption in multi-site organizations:
- `location_id`: Must exist in active tenant and verify `location.site_id === asset.site_id`.
- `system_id`: If provided, must verify `system.site_id === asset.site_id`.
- `parent_asset_id`: If provided, must verify `parentAsset.site_id === asset.site_id`. An asset at the Colombo Hotel cannot be a child component of a boiler located at the Kandy Resort.

### B. Brand & Model Category Compatibility
- `model_id`: If provided, the model's `assetCategoryId` must match the asset's `assetCategoryId`.
- If `brand_id` is also supplied, `model.brandId` must match `brand_id`.

### C. Parent-Child Equipment Assemblies
- Assets support recursive assembly trees:
  - Assembly Level 1: `Thermax Combimax Steam Boiler #01` (Root Equipment)
  - Assembly Level 2: `Feedwater Pump Assembly #01A` (`parent_asset_id: boiler.id`)
  - Assembly Level 3: `Pump Electric Motor #01A-M` (`parent_asset_id: pump.id`)
- **Deletion Protection**: An asset with registered child components cannot be deleted (`ASSET_HAS_CHILDREN`).

---

## 4. Directed Acyclic Graph (DAG) Cycle Detection

To prevent circular loops in recursive hierarchies (`Location`, `System`, `AssetCategory`, `Asset`), LuminaFM executes `validateNoHierarchyCycle()`:

$$\text{Validation}(T, P) = \begin{cases}
\text{Throw HierarchyCycleError} & \text{if } T = P \text{ (Direct Cycle)} \\
\text{Throw HierarchyCycleError} & \text{if } T \in \text{Ancestors}(P) \text{ (Indirect Cycle)} \\
\text{Success} & \text{otherwise}
\end{cases}$$

- **Complexity**: $O(1)$ direct check, $O(D)$ traversal where $D \le 100$ maximum tree depth.
- Prevents database deadlocks and infinite loops during tree recursion.

---

## 5. Equipment Status & Lifecycle History

### Supported Equipment Statuses (`AssetStatus`)
1. `in_service`: Fully operational and in active production.
2. `under_maintenance`: Taken offline for scheduled maintenance or active corrective repair.
3. `standby`: Available for immediate duty as redundancy or peak-load backup.
4. `out_of_service`: Non-operational due to unscheduled fault or failure.
5. `decommissioned`: Retired from active service.

### Lifecycle Audit Timeline (`GET /api/assets/:id/history`)
When an asset's status transitions via `PATCH /api/assets/:id/status`, LuminaFM:
1. Updates `assets.status`.
2. Automatically generates an immutable record in `audit_logs`:
   - `action`: `STATUS_CHANGE`
   - `old_values`: `{ status: oldStatus }`
   - `new_values`: `{ status: newStatus, reason, notes }`
   - `user_id`: ID of authenticated operator.
3. Compiles a unified chronological lifecycle timeline:
   - Milestone: `COMMISSIONING` (`commissioning_date`)
   - Milestone: `INSTALLATION` (`installation_date`)
   - Events: `STATUS_TRANSITION` (Chronological status change logs)
   - Events: `WORK_ORDER` (Associated preventive and corrective work orders)

---

## 6. QR Code Identification & Plant Floor Scanning

Technicians on plant floors wearing gloves need instant identification without typing UUIDs or serial numbers:

1. **Standard Identifier URI Format**:
   ```
   LUMINA://<TenantPrefix>/<SiteCode>/<AssetCode>
   Example: LUMINA://11111111/COL-01/BLR-001
   ```
2. **Instant Scan Lookup (`GET /api/assets/scan/:qrCode`)**:
   - Accepts scanned QR string, asset code, or UUID.
   - Returns the asset's active operational state, spatial location, and list of open work orders.
3. **Automated QR Generation (`POST /api/assets/:id/qr-code`)**:
   - Generates standardized QR payload and label metadata for mobile label printing.

---

## 7. REST API Endpoints Specification

| Method | Endpoint | Description | Auth & Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/sites` | List all sites in active organization | Tenant Auth |
| `POST` | `/api/sites` | Register new physical site | Tenant Auth |
| `GET` | `/api/locations` | List physical locations (filterable by `siteId`) | Tenant Auth |
| `POST` | `/api/locations` | Create location with cycle & site validation | Tenant Auth |
| `PATCH` | `/api/locations/:id` | Update location (cycle detection) | Tenant Auth |
| `GET` | `/api/systems` | List technical systems (filterable by `siteId`) | Tenant Auth |
| `POST` | `/api/systems` | Create technical system (cycle & site check) | Tenant Auth |
| `PATCH` | `/api/systems/:id` | Update technical system (cycle detection) | Tenant Auth |
| `GET` | `/api/asset-categories` | List equipment categories & subcategories | Tenant Auth |
| `POST` | `/api/asset-categories` | Create equipment category | Tenant Auth |
| `GET` | `/api/brands` | List equipment manufacturers/brands | Tenant Auth |
| `POST` | `/api/brands` | Register manufacturer/brand | Tenant Auth |
| `GET` | `/api/asset-models` | List equipment models with specs | Tenant Auth |
| `POST` | `/api/asset-models` | Create equipment model linking category & brand | Tenant Auth |
| `GET` | `/api/assets` | List registered assets with filters | Tenant Auth |
| `POST` | `/api/assets` | Register asset with cross-FK validation | Tenant Auth |
| `GET` | `/api/assets/:id` | Get asset details, assembly links, meter counts | Tenant Auth |
| `PATCH` | `/api/assets/:id` | Update asset details & parent-child links | Tenant Auth |
| `DELETE` | `/api/assets/:id` | Delete asset (prevented if children exist) | Tenant Auth |
| `PATCH` | `/api/assets/:id/status` | Transition status with audit logging | Tenant Auth |
| `GET` | `/api/assets/:id/history` | Comprehensive lifecycle history timeline | Tenant Auth |
| `GET` | `/api/assets/scan/:qrCode` | Plant floor instant QR scan lookup | Tenant Auth |
| `POST` | `/api/assets/:id/qr-code` | Auto-generate standardized QR code | Tenant Auth |
