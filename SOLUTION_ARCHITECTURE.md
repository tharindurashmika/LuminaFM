# LuminaFM - Final Solution Architecture Specification
## Enterprise Modular Monolith Architecture, PWA Offline Strategy & Domain Governance

- **System Name**: LuminaFM (Facility Maintenance Management & Decision Support System)
- **Role**: Principal Enterprise Software Architect
- **Status**: Complete Architecture Specification • **Ready for Architectural Review**
- **Target Stack**: React 18+ (TypeScript, Vite, Tailwind CSS, PWA/ServiceWorker), Node.js (TypeScript, Express), PostgreSQL 16, Prisma ORM, Docker & Docker Compose

---

## 1. Architectural Principles & System Goals

LuminaFM is engineered to bridge academic decision science with commercial facilities management software. The architecture adheres to ten non-negotiable principles:

1. **Modular Monolith First**: Single codebase and single deployment unit containing strictly bounded, independently maintainable domain modules. Avoid microservice sprawl until team size and traffic boundaries necessitate physical decoupling.
2. **Preservation of the 4-Layer Research Model**: Uphold the four-tier architectural model documented by Vishal Perera (2025):
   - **User Interface Layer**: Presentation, client validation, offline storage, and responsive views.
   - **Application Layer**: API routing, authentication, RBAC, tenant context, and workflow orchestration.
   - **Data Processing Layer**: Decision engine core, equipment-specific drivers (Boiler ANP), benchmark deviation engine, and conflict resolution.
   - **Data Storage Layer**: Relational ACID storage (PostgreSQL), Prisma ORM, EAV metamodel, and audit interceptor.
3. **Dual Deployment Modes from a Single Codebase**:
   - `saas_multitenant`: Multi-tenant SaaS with shared database, tenant isolation via Row-Level Security / Prisma client extensions, and dynamic subdomain branding.
   - `dedicated`: Single-tenant dedicated instance for air-gapped industrial plants or strict enterprise hosting contracts.
4. **PWA-First Offline Resilience**: Full support for floor operators in underground mechanical rooms without connectivity. Offline logbook entry, local IndexedDB caching, and conflict-free background synchronization.
5. **Domain Decoupling & Pluggable Equipment Modules**: Generic CMMS operations (work orders, assets, checklists, meters) know *nothing* of boiler thermodynamics. The Boiler ANP module is an isolated pluggable driver implementing a generic decision contract (`IDecisionEngineDriver`).
6. **Future Equipment Extensibility**: Native support for onboarding chillers, diesel generators, pumps, and AHUs through metadata definitions and algorithm drivers without modifying the core schema.
7. **Strict Inward Dependency Flow**: Outer layers (UI, Controllers, Adapters) depend on inner layers (Core Domain, Interfaces). Core business logic has zero dependencies on HTTP frameworks or ORM internals.
8. **Immutable Change Traceability**: Every critical data mutation (`UPDATE`, `DELETE`) is captured via database/ORM interceptors into `audit_logs` with before/after JSON diffs.
9. **Touch-First Operator Ergonomics**: Minimum $44 \times 44\text{px}$ touch targets, high-legibility dark midnight blue (`#0B132B`) with gold (`#DDA74F`) and crimson (`#D62828`) visual cues, and responsive transformation from tables to stacked cards on portrait tablets.
10. **Zero Fabricated Science**: The platform adheres strictly to the expert-validated benchmarks and activities from the University of Moratuwa dissertation, providing an administrative configuration interface for Saaty pairwise matrices.

---

## 2. High-Level Solution Architecture

```mermaid
flowchart TB
    subgraph Layer1["1. USER INTERFACE LAYER (Client-Side PWA)"]
        direction TB
        subgraph WebApp["React 18 + TypeScript + Vite + Tailwind CSS"]
            PWA_UI["Operator Daily Logbook<br/>(Touch ≥ 44px, Midnight Blue/Gold)"]
            Dashboard_UI["Active Maintenance Alerts & KPIs<br/>(Resolve / Acknowledge)"]
            WO_UI["Work Order Management<br/>(State Machine, Labor, Parts)"]
            Asset_UI["Asset & Dual Hierarchy Trees<br/>(Location & Technical System)"]
            Admin_UI["Tenancy, Branding & ANP Model Config"]
        end
        subgraph PWA_Engine["PWA Offline Subsystem"]
            SW["Service Worker (Workbox)<br/>CacheStorage (Static Shell & Checklists)"]
            IDB[(IndexedDB Outbox Queue<br/>& Offline Log Entries)]
            SyncMgr["Sync Engine & Conflict Handler<br/>(Auto Replay & Idempotency)"]
            SW <--> IDB
            SyncMgr <--> IDB
            WebApp <--> SyncMgr
        end
    end

    subgraph Layer2["2. APPLICATION LAYER (Node.js + TypeScript Express)"]
        direction TB
        API_GW["Nginx Gateway / TLS & Rate Limiter"]
        Auth_MW["IAM Middleware (JWT, Bcrypt, Session)"]
        Tenant_MW["Tenant Resolver (Subdomain / Header / Profile)"]
        RBAC_MW["RBAC & Permission Evaluator"]
        Audit_MW["Audit Context Interceptor"]
        
        API_GW --> Auth_MW --> Tenant_MW --> RBAC_MW --> Audit_MW
        
        subgraph DomainControllers["REST API Controllers & Route Handlers"]
            C_Auth["/api/v1/auth"]
            C_Tenants["/api/v1/tenants"]
            C_Assets["/api/v1/assets"]
            C_Ops["/api/v1/operations"]
            C_WO["/api/v1/work-orders"]
            C_Decisions["/api/v1/decisions"]
            C_Attach["/api/v1/attachments"]
        end
        Audit_MW --> DomainControllers
    end

    subgraph Layer3["3. DATA PROCESSING LAYER (Core Engines & Domain Services)"]
        direction TB
        subgraph CoreCMMS["Generic CMMS Domain Services"]
            S_Asset["Asset Hierarchy & EAV Service"]
            S_Ops["Operations & Checklist Service"]
            S_WO["Work Order Lifecycle Engine"]
            S_Sync["Offline Ingestion & Idempotency Service"]
            S_Export["Export Service (CSV / XLSX)"]
        end

        subgraph DecisionEngineCore["Generic Decision Engine Platform"]
            DEC_Reg["Model Registry & Version Manager"]
            DEC_Pipe["Evaluation Pipeline & Normalizer"]
            DEC_Solver["Saaty Matrix & Eigenvector Solver"]
        end

        subgraph EquipmentPlugins["Pluggable Equipment Modules"]
            BOILER_MOD["Boiler ANP Driver (Vishal 2025)<br/>- 10 Subcomponents<br/>- 35 Codified Activities<br/>- 22 Criteria & Benchmarks<br/>- Dual Network Evaluator"]
            CHILLER_MOD["[Future] Chiller Driver (Approach Temp / Scaling)"]
            GENSET_MOD["[Future] Generator Driver (Battery / Fuel Water)"]
        end

        DomainControllers --> CoreCMMS
        DomainControllers --> DecisionEngineCore
        DecisionEngineCore <--> EquipmentPlugins
        CoreCMMS <--> DecisionEngineCore
    end

    subgraph Layer4["4. DATA STORAGE LAYER (PostgreSQL 16 + Filesystem/S3)"]
        direction TB
        PrismaExt["Prisma Client with Tenant Isolation & Audit Extension"]
        
        subgraph RelationalDB["PostgreSQL 16 Multi-Tenant Database"]
            T_Tenants["tenants, users, roles, permissions"]
            T_Hierarchies["locations, systems, sites"]
            T_Assets["assets, asset_categories, attribute_values"]
            T_Telemetry["meter_readings (Partitioned), inspections"]
            T_Work["work_orders, tasks, labor, parts"]
            T_ANP["decision_models, criteria, alternatives, runs"]
            T_Audit["audit_logs (Partitioned, Immutable)"]
        end

        subgraph StorageService["Object / File Storage"]
            LocalStorage["Local Disk Mount (Dedicated Profile)"]
            S3Storage["S3 / MinIO Object Storage (SaaS Profile)"]
        end

        CoreCMMS --> PrismaExt
        DecisionEngineCore --> PrismaExt
        PrismaExt --> RelationalDB
        DomainControllers --> StorageService
    end

    Layer1 <-->|HTTPS / REST API + WebSocket| Layer2
```

---

## 3. Domain Decomposition & Module Boundaries

The modular monolith is organized into discrete internal packages located within `src/modules/`. Each domain possesses a strict public boundary interface (`index.ts`). Internal implementations are strictly private to the module.

```
src/
├── app.ts                          # Express application setup
├── server.ts                       # Server bootstrap & lifecycle
├── config/                         # Typed environment configuration
│   ├── configuration.ts            # Environment schema (Zod)
│   └── deployment-profile.ts       # SaaS vs Dedicated configuration
├── core/                           # Shared kernel (zero business dependencies)
│   ├── errors/                     # Standard AppError, NotFoundError, etc.
│   ├── types/                      # Common Result<T>, Pagination, etc.
│   ├── middleware/                 # Global error handling, correlation ID
│   └── database/                   # Prisma client singleton & extensions
├── modules/                        # Bounded Context Modules
│   ├── platform/                   # Tenant, Site, White-Label Branding
│   ├── iam/                        # Auth, Users, Roles, Permissions, JWT
│   ├── assets/                     # Assets, Categories, EAV Metamodel, Hierarchies
│   ├── telemetry/                  # Meters, Units of Measure, Timeseries Readings
│   ├── checklists/                 # Inspection Templates, Items, Responses, Sync
│   ├── maintenance/                # Preventive Plans, Schedules, Task Templates
│   ├── work-orders/                # Work Order State Machine, Tasks, Labor, Parts
│   ├── faults/                     # Fault Logs, Root Cause, Failure History
│   ├── decision-core/              # Generic MCDM Registry, Supermatrix Solver
│   ├── equipment-boiler/           # Boiler ANP Driver, 35 Activities, 22 Criteria
│   ├── audit/                      # Immutable Audit Interceptor & Log Viewer
│   ├── attachments/                # File Upload (Multer), Storage Adapters
│   └── notifications/              # Active Alerts, WebSocket Subscriptions
└── shared/                         # Cross-cutting utilities (Zod schemas, math)
```

```mermaid
graph LR
    subgraph CorePlatform["Core Platform & Governance"]
        Platform["platform"]
        IAM["iam"]
        Audit["audit"]
    end

    subgraph GenericCMMS["Generic CMMS Business Engine"]
        Assets["assets"]
        Telemetry["telemetry"]
        Checklists["checklists"]
        Maintenance["maintenance"]
        WorkOrders["work-orders"]
        Attachments["attachments"]
        Notifications["notifications"]
    end

    subgraph DecisionScience["Decision Support Platform"]
        DecisionCore["decision-core"]
        BoilerPlugin["equipment-boiler"]
    end

    IAM --> Platform
    Assets --> Platform
    Telemetry --> Assets
    Checklists --> Assets
    Maintenance --> Assets
    WorkOrders --> Assets
    WorkOrders --> Maintenance
    WorkOrders --> Checklists
    Attachments --> WorkOrders
    Notifications --> WorkOrders

    Audit -.->|Observes Mutations| GenericCMMS
    Audit -.->|Observes Mutations| DecisionScience

    DecisionCore --> Telemetry
    DecisionCore --> Checklists
    BoilerPlugin --> DecisionCore
    BoilerPlugin -.->|Implements IDecisionEngineDriver| DecisionCore
    Notifications <-- DecisionCore
    WorkOrders <-- Notifications
```

### Module Boundary Dependency Rules

1. **The Plugin Inversion Rule**: Generic modules (`work-orders`, `checklists`, `decision-core`) must **never** import from `equipment-boiler` or any future equipment module. Equipment modules register themselves with `decision-core` at runtime via dependency injection.
2. **Public Facade Rule**: Module cross-communication occurs **only** through the module's root export (`src/modules/<domain>/index.ts`). No module may import deep internal files (e.g. `import from '../assets/internal/asset.repo'`).
3. **No Cross-Domain Database Transactions**: If an operation spans two domains (e.g. Work Order created from Maintenance Alert), the orchestrating Application Service coordinates the workflow; foreign keys validate reference integrity, but entity state mutations belong to their respective domains.
4. **Data Isolation Invariant**: All domain queries must pass through the Tenant Context extension (`tenantPrisma(req.tenantId)`). Raw, un-scoped queries (`prisma.$queryRawUnsafe`) are strictly forbidden outside automated migration scripts.

---

## 4. Dual Deployment Profile Specification

LuminaFM is delivered as a **single, unified codebase** capable of executing in two distinct runtime profiles controlled via environment configuration (`DEPLOYMENT_MODE`):

```mermaid
flowchart TD
    Codebase["Single LuminaFM Codebase<br/>(Git Repository)"]
    
    Codebase --> DockerBuild["Unified Docker Image<br/>luminafm-backend:latest"]
    
    DockerBuild --> ProfileA["Profile A: Shared Multi-Tenant SaaS<br/>(DEPLOYMENT_MODE=saas_multitenant)"]
    DockerBuild --> ProfileB["Profile B: Dedicated Customer Instance<br/>(DEPLOYMENT_MODE=dedicated)"]

    subgraph SaaS_Env["Profile A Architecture"]
        IngressA["Multi-Tenant Ingress<br/>(*.luminafm.com)"]
        SharedApp["Shared App Cluster (Stateless)"]
        SharedDB[("PostgreSQL Multi-Tenant DB<br/>Row-Level Security & Tenant Extension")]
        S3Bucket["AWS S3 / Cloudflare R2<br/>Multi-Tenant Prefix Storage"]
        IngressA --> SharedApp --> SharedDB
        SharedApp --> S3Bucket
    end

    subgraph Dedicated_Env["Profile B Architecture"]
        IngressB["Dedicated Ingress / LAN<br/>(cmms.kingsburyhotel.com)"]
        DedicatedApp["Isolated App Container"]
        DedicatedDB[("Dedicated PostgreSQL DB<br/>Single Organization Scope")]
        LocalVol["Mounted Local Volume<br/>(/var/luminafm/uploads)"]
        IngressB --> DedicatedApp --> DedicatedDB
        DedicatedApp --> LocalVol
    end

    ProfileA --> SaaS_Env
    ProfileB --> Dedicated_Env
```

### Profile Comparison Matrix

| Architectural Feature | Profile A: `saas_multitenant` | Profile B: `dedicated` |
|---|---|---|
| **Target Customers** | Small/Medium facilities, hotel chains, multi-site groups | Enterprise hospitality, defence, air-gapped plants, data sovereignty requirements |
| **Database Topology** | Single shared PostgreSQL instance; all tables scoped by `organization_id` with RLS. | Isolated PostgreSQL database instance; single tenant seeded on startup. |
| **Tenant Resolution** | Dynamic: Subdomain parsing (`kingsbury.luminafm.com`) or `X-Organization-Id` header. | Static: Environment configuration `DEDICATED_TENANT_ID` locked to single tenant. |
| **Branding & Logos** | Dynamic: Fetched from DB `organizations.branding` JSON (logo URL, colors, name). | Static or DB: Loaded from mounted branding directory or DB seed. |
| **File Storage** | AWS S3, Cloudflare R2, or MinIO with tenant bucket partitioning (`/{org_id}/...`). | Local Docker volume mount (`/app/uploads`) or on-premise NAS/NFS share. |
| **Audit Compliance** | Multi-tenant audit trail with organization-level cryptographic separation. | Dedicated audit table with optional direct syslog/SIEM export forwarding. |
| **Update Lifecycle** | Continuous deployment managed by LuminaFM cloud operations. | Scheduled maintenance windows, air-gapped image deployment, customer approval. |

---

## 5. PWA Offline Data Entry & Synchronization Protocol

Boiler plants and mechanical rooms are frequently located in reinforced sub-basements where wireless connectivity is intermittent or absent. The LuminaFM operator daily logbook is designed with a **PWA Offline-First Architecture**:

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Boiler Operator (Tablet)
    participant UI as React PWA Interface
    participant SW as Service Worker (Workbox)
    participant IDB as Local IndexedDB Outbox
    participant Sync as Background Sync Engine
    participant API as LuminaFM Backend API
    participant DB as PostgreSQL Database

    Note over Operator,IDB: Sub-Basement Offline State (No Connectivity)
    Operator->>UI: Opens 2-Hourly Daily Boiler Monitoring Form
    UI->>SW: Fetch Checklist Template & Input Bounds
    SW-->>UI: Serve cached template from CacheStorage
    Operator->>UI: Enters readings (Flue Temp: 196°C, Feed Press: 3.8 bar)
    UI->>UI: Client-Side Validation (Touch targets ≥ 44px, numeric bounds check)
    Operator->>UI: Taps "Add Current Reading"
    UI->>IDB: Generate client_log_uuid (UUIDv7) + Timestamp
    UI->>IDB: Write payload to 'offline_logs' store (status: 'pending_sync')
    UI-->>Operator: Visual Confirmation: "Saved Locally (Pending Sync)" [Amber Pill]

    Note over Operator,Sync: Operator Walks Upstairs (Connectivity Restored)
    Sync->>Sync: Detects 'online' event / Window Focus
    Sync->>IDB: Query all 'pending_sync' records ordered by client_timestamp
    loop For each pending log entry
        Sync->>API: POST /api/v1/operations/sync<br/>Header: X-Idempotency-Key: client_log_uuid
        API->>DB: Check if client_log_uuid already processed
        alt Not Processed
            API->>DB: Ingest meter_readings & inspection_responses in transaction
            API->>DB: Trigger ANP Decision Evaluation Pipeline
            API->>DB: Persist decision_run & notifications
            API-->>Sync: HTTP 201 Created (sync_status: 'synced', server_id: UUID)
            Sync->>IDB: Update record status to 'synced' (or purge from outbox)
        else Already Processed (Idempotent Retry)
            API-->>Sync: HTTP 200 OK (sync_status: 'already_processed')
            Sync->>IDB: Mark as 'synced'
        end
    end
    Sync-->>UI: Dispatch UI Event: SyncCompleted
    UI-->>Operator: Visual Confirmation: "All Shifts Synced" [Green Pill]
    UI->>UI: Render newly triggered ANP Alerts in Dashboard
```

### Conflict Resolution Strategy & Data Invariants
1. **Append-Only Timeseries Invariant**: Shift readings (`meter_readings`) and inspection checks are strictly append-only observation logs. Because operators log time-stamped chronological states, concurrent write collisions on the *same record* cannot occur.
2. **Dual Timestamping**: Every log row stores both `recorded_at` (the physical wall-clock time entered by the technician on the tablet) and `created_at` (the server-side ingestion time). ANP evaluation uses `recorded_at` for sequential trend analysis.
3. **Idempotency Guarantee**: Every offline payload generates a client-side `client_log_uuid` (UUIDv7, monotonically increasing with embedded timestamp). The API enforces a unique constraint on `(organization_id, client_log_uuid)` to eliminate duplicate submissions caused by network retries.
4. **Offline Master Data Caching**: Active checklist templates, meter definitions, and asset metadata are refreshed and cached locally whenever network connectivity is available, with a 72-hour offline Time-To-Live (TTL).

---

## 6. The Boiler ANP Decision Engine Architecture

The Boiler ANP engine is strictly isolated inside `src/modules/equipment-boiler/` and communicates with the platform through the `IDecisionEngineDriver` contract.

```mermaid
classDiagram
    class IDecisionEngineDriver {
        <<interface>>
        +getEquipmentCategory() String
        +evaluateReadings(assetId, readings) DecisionResult
        +calculatePriorities(modelId) PriorityRanking
        +validateModelStructure(config) ValidationResult
    }

    class BoilerAnpDriver {
        -subsystems: SubsystemCatalog
        -maintenanceActivities: Map~String, ActivityTemplate~
        -criteriaBenchmarks: Map~String, BenchmarkRule~
        +getEquipmentCategory() "CAT-BOILER"
        +evaluateReadings(assetId, readings) DecisionResult
        +calculatePriorities(modelId) PriorityRanking
        -evaluateDeterministicRules(readings) List~TriggeredActivity~
        -solveSupermatrix(pairwiseComparisons) SupermatrixResult
        -calculateEigenvector(matrix) Vector
        -computeConsistencyRatio(matrix) Float
    }

    class DecisionCoreService {
        -drivers: Map~String, IDecisionEngineDriver~
        +registerDriver(driver)
        +executeEvaluation(assetId, category, payload) DecisionRunResult
    }

    class DecisionRunResult {
        +UUID runId
        +UUID assetId
        +DateTime evaluatedAt
        +List~AlertPayload~ alerts
        +List~PrioritizedActivity~ rankedAlternatives
        +JSON rawSnapshot
    }

    IDecisionEngineDriver <|.. BoilerAnpDriver : implements
    DecisionCoreService o-- IDecisionEngineDriver : registry holds
    DecisionCoreService ..> DecisionRunResult : produces
```

### The Two-Tier Decision Pipeline:
1. **Tier 1 — Real-Time Deterministic Rule Engine**:
   - Executes synchronously during shift log submission ($< 50\text{ ms}$).
   - Evaluates incoming parameters against the empirical benchmarks codified in *Hardbound_Vishal.pdf* (Tables 4.8, 4.9, 4.10).
   - *Example*: If `flue_gas_temp > 190°C`, the engine immediately matches triggers for `EMA 1` (Economizer clean), `HEMA 3` (Fire-tube brushing), and `BMA 1` (Burner nozzle replacement).
   - Generates immediate active maintenance alerts with Gold/Crimson severity.
2. **Tier 2 — Multi-Criteria ANP Matrix Prioritization**:
   - Executes Saaty network synthesis across the dual network structure (Daily Operational Network vs Periodic/Preventive Network).
   - Formulates the unweighted supermatrix from expert pairwise comparison eigenvectors.
   - Normalizes columns into a stochastic weighted supermatrix.
   - Computes power iterations until convergence ($W^\infty$) to calculate global priority weights for all 35 alternatives.
   - Attaches priority rankings to generated work orders so maintenance teams execute the highest-leverage tasks first.

---

## 7. Security Architecture & RBAC Governance

```mermaid
flowchart TD
    Request["Incoming HTTPS Request"] --> Nginx["Nginx Reverse Proxy<br/>(TLS 1.3, Rate Limiting, Helmet Headers)"]
    
    Nginx --> AuthMiddleware["1. Authentication Middleware<br/>- Verify Bearer JWT (Access Token 15 min)<br/>- Refresh Token via HttpOnly Secure Cookie (7 days)"]
    
    AuthMiddleware --> TenantResolver["2. Tenant Context Resolver<br/>- Extract Subdomain / X-Organization-Id / User Token<br/>- Bind tenantId to Request AsyncLocalStorage"]
    
    TenantResolver --> RBACMiddleware["3. RBAC Authorization Guard<br/>- Query Role Permissions for Route<br/>- Validate (e.g. 'work_orders:create', 'anp:configure')"]
    
    RBACMiddleware --> InputValidation["4. Zod Input Validation<br/>- Strict schema validation & type coercion<br/>- Sanitize strings & verify decimal ranges"]
    
    InputValidation --> DomainLogic["5. Domain Service Logic"]
    
    DomainLogic --> AuditInterceptor["6. Prisma Audit Interceptor<br/>- Capture UPDATE / DELETE mutations<br/>- Compute old vs new JSON diff<br/>- Append immutable row to audit_logs"]
    
    AuditInterceptor --> PostgreSQL[("PostgreSQL Database<br/>Tenant Foreign Keys + Constraints")]
```

### Role-Based Access Control (RBAC) Matrix

| Permission Key | System Admin | Chief Engineer | Shift / Mechanical Engineer | Boiler Operator | External Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| `platform:branding:update` | 🔒 Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| `users:manage` | 🔒 Yes | 🔒 Yes (Site) | ❌ No | ❌ No | ❌ No |
| `assets:create:update` | 🔒 Yes | 🔒 Yes | 🔒 Yes | ❌ No | ❌ No |
| `operations:log:submit` | 🔒 Yes | 🔒 Yes | 🔒 Yes | 🔒 Yes | ❌ No |
| `alerts:triage:acknowledge`| 🔒 Yes | 🔒 Yes | 🔒 Yes | 🔒 Yes | ❌ No |
| `alerts:triage:resolve` | 🔒 Yes | 🔒 Yes | 🔒 Yes | ❌ No | ❌ No |
| `work_orders:approve` | 🔒 Yes | 🔒 Yes | ❌ No | ❌ No | ❌ No |
| `work_orders:execute` | 🔒 Yes | 🔒 Yes | 🔒 Yes | 🔒 Yes | ❌ No |
| `anp_model:configure` | 🔒 Yes | 🔒 Yes | ❌ No | ❌ No | ❌ No |
| `audit_logs:view` | 🔒 Yes | 🔒 Yes | 🔒 Yes | ❌ No | 🔒 Read-Only |
| `reports:export` | 🔒 Yes | 🔒 Yes | 🔒 Yes | 🔒 Yes | 🔒 Read-Only |

---

## 8. API Conventions & Standard Envelopes

All RESTful endpoints follow strict semantic versioning (`/api/v1/...`) and return deterministic response envelopes:

### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "data": {
    "id": "019318b7-6571-7000-8442-984400112233",
    "asset_id": "019318b7-6571-7000-8442-984400112200",
    "evaluated_at": "2026-11-15T08:00:00.000Z",
    "triggered_alerts": [
      {
        "code": "ALERT-FLUE-GAS-HIGH",
        "severity": "warning",
        "message": "Flue Gas Temperature (196°C) exceeds benchmark of 190°C",
        "recommended_activities": ["EMA_1", "HEMA_3", "BMA_1"]
      }
    ]
  },
  "meta": {
    "timestamp": "2026-11-15T08:00:00.124Z",
    "request_id": "req-8842-9901"
  }
}
```

### Error Envelope (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The submitted operational log contains invalid data types or out-of-bounds readings",
    "details": [
      {
        "field": "steam_pressure",
        "expected": "Decimal in range [0.0, 15.0] bar",
        "received": "string"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-11-15T08:00:00.015Z",
    "request_id": "req-8842-9902"
  }
}
```

---

## 9. Containerization Topology & Deployment Profiles

The deployment configuration provides two Docker Compose profiles within the same root `docker-compose.yml`:

```mermaid
graph TD
    subgraph SaaS_Profile["Docker Compose: Profile SaaS (--profile saas)"]
        Nginx_SaaS["Nginx Ingress (Wildcard SSL)"]
        Backend_SaaS["luminafm-backend (Replicas: 2+)"]
        Frontend_SaaS["luminafm-frontend (Nginx Static)"]
        DB_SaaS[("PostgreSQL 16 Multi-Tenant")]
        Redis_SaaS[("Redis (Pub/Sub & Supermatrix Cache)")]
        
        Nginx_SaaS --> Frontend_SaaS
        Nginx_SaaS --> Backend_SaaS
        Backend_SaaS --> DB_SaaS
        Backend_SaaS --> Redis_SaaS
    end

    subgraph Dedicated_Profile["Docker Compose: Profile Dedicated (--profile dedicated)"]
        Nginx_Ded["Nginx Local Gateway (Port 80/443)"]
        Backend_Ded["luminafm-backend (Single Instance)"]
        Frontend_Ded["luminafm-frontend (Embedded/Proxy)"]
        DB_Ded[("PostgreSQL 16 Isolated")]
        Vol_Ded[("Local Disk Volume: /var/luminafm/uploads")]
        
        Nginx_Ded --> Frontend_Ded
        Nginx_Ded --> Backend_Ded
        Backend_Ded --> DB_Ded
        Backend_Ded --> Vol_Ded
    end
```

### Docker Run Configurations:
```bash
# 1. Run Shared Multi-Tenant SaaS Profile
docker compose --profile saas up --build -d

# 2. Run Dedicated On-Premise Single-Tenant Profile (Kingsbury Hotel)
docker compose --profile dedicated up --build -d
```

---

## 10. Key Architectural Decisions Requiring Explicit User Approval

Before any application code or schema migrations are executed, the following four architectural decisions require formal sign-off:

### Decision 1: Offline Synchronization Conflict Strategy
- **Option A (Recommended)**: **Append-Only Timeseries Invariant**. Shift logs are pure historical observation points. Concurrent collisions are impossible because each shift technician logs their own timestamped observation using client UUIDv7. Replay on reconnection preserves chronological integrity.
- **Option B**: **Server Timestamp Re-anchoring**. When an offline batch arrives, the server overwrites the observation time with the arrival time. *(Rejected by Architect: Destroys physical shift validity and correlation with thermodynamic alarms)*.

### Decision 2: Decision Engine Execution Model
- **Option A (Recommended)**: **Synchronous Rule Evaluation + Async ANP Limit Solver**. Rule-based alert matching (Tables 4.8–4.10) runs synchronously within 50ms during log submission so operators immediately see active alerts. Full ANP supermatrix limit power recalculation runs asynchronously or on cached matrices.
- **Option B**: **Full Real-time Supermatrix Power Iteration on Every HTTP Request**. Compute $W^{2k+1}$ iteratively inside the HTTP request cycle. *(Risk: Potential latency spike of 200–800ms depending on node network count)*.

### Decision 3: Storage Engine for Maintenance Attachments
- **Option A (Recommended)**: **Abstracted Storage Driver (Local Volume default with S3 switch)**. Use local Docker volume mounts for Dedicated profile deployments, and AWS S3 / MinIO API for SaaS multi-tenant deployments, controlled via `STORAGE_DRIVER=local|s3`.
- **Option B**: **Database Bytea / BLOB Storage**. Store binary images directly inside PostgreSQL. *(Rejected by Architect: Bloats database backups, impairs I/O performance, and complicates replication)*.

### Decision 4: Dedicated Mode Tenancy Enforcement
- **Option A (Recommended)**: **Virtual Single-Tenant Configuration**. The dedicated deployment uses the exact same relational schema, but binds `DEDICATED_TENANT_ID` at container launch, effectively auto-scoping all operations without maintaining separate single-tenant schema variations.
- **Option B**: **Completely Separate Schema DDL for Dedicated Mode**. Strip `organization_id` entirely from dedicated builds. *(Rejected by Architect: Violates single codebase principle and doubles maintenance surface)*.

