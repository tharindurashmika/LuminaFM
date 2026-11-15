# LuminaFM - Requirements Traceability Matrix (RTM)
## Bi-Directional Mapping: Academic Research Baseline to Commercial CMMS Architecture

- **Primary Source**: *Development of a Software-Based Boiler Maintenance Decision-Making Tool* (Vishal Perera, University of Moratuwa, June 2025)
- **Target Implementation**: LuminaFM Commercial SaaS CMMS & ANP Decision Engine
- **Database Reference**: `cmms_schema.sql` & `prisma/schema.prisma`

---

## 1. Traceability Methodology & Schema Taxonomy

Every requirement in this matrix establishes an unbroken chain of custody from academic theory to commercial software execution:

```
[Research Source] ➔ [Requirement ID] ➔ [Software Component] ➔ [Database Schema Mapping] ➔ [Verification & Test Method]
```

### Table Reference Key:
- `ORG`: `organizations`, `users`, `organization_memberships`, `roles`, `permissions`
- `LOC`: `sites`, `location_types`, `locations`
- `SYS`: `system_categories`, `system_types`, `systems`
- `AST`: `asset_categories`, `brands`, `asset_models`, `assets`
- `EAV`: `attribute_definitions`, `category_attributes`, `asset_attribute_values`
- `MET`: `units_of_measurement`, `meter_definitions`, `asset_meters`, `meter_readings`
- `CHK`: `checklist_templates`, `checklist_items`, `inspections`, `inspection_responses`
- `PM`: `maintenance_types`, `maintenance_plans`, `maintenance_plan_tasks`, `asset_maintenance_plans`
- `WO`: `work_orders`, `work_order_tasks`, `work_order_labor`, `work_order_parts`, `work_order_status_history`
- `ANP`: `decision_models`, `decision_criteria`, `decision_alternatives`, `decision_runs`, `decision_pairwise_comparisons`*
- `AUD`: `audit_logs`, `attachments`, `entity_attachments`, `notifications`

---

## 2. Core System & Architectural Requirements

| Req ID | Requirement Description | Source (Chapter/Page) | Proposed Software Component | Database Representation | Verification & Validation Method |
|---|---|---|---|---|---|
| **SYS-01** | Support low-tech facility environments with manual data entry capability | Chap 1.2, p. 3; Chap 1.5, p. 5 | `DailyBoilerMonitoringPage.tsx`, `OperationsService` | `inspections`, `meter_readings` | Form rendering test; simulated operator shift submission |
| **SYS-02** | Case study modeling of 1,100 kg/h oil-fired fire-tube steam boiler at Kingsbury Hotel | Chap 3.6, p. 31; Chap 4.4.1, p. 55 | `seed.ts`, `AssetService` | `organizations.name = 'Kingsbury Hotel'`, `assets.capacity = 1100` | Database seed verification test; asset EAV attribute query |
| **SYS-03** | 4-tier layered architecture mapped to Component-Based Architecture (UI, App, Data Processing, Storage) | Chap 3.6, p. 31; Chap 4.6–4.7, pp. 59–60 | React UI ➔ Express Router ➔ Core Domain Service ➔ Prisma ORM | Full stack layer isolation across UI, REST API, Engine, and PostgreSQL | Architectural dependency check (no direct DB access from UI/router) |
| **SYS-04** | Dual independent physical location tree and technical engineering system tree | Chap 2.2.5, p. 10; ERD §Scope, p. 1 | `LocationTreeComponent`, `SystemTreeComponent`, `AssetService` | `locations` (`parent_id`), `systems` (`parent_id`), `assets.location_id`, `assets.system_id` | Graph cycle-detection test; multi-parent tree navigation test |
| **SYS-05** | Multi-tenant data isolation with strict tenant scoping | ERD §Important Decisions, p. 2 | `tenant.prisma.ts` Prisma Client Extension, `TenantMiddleware` | Composite foreign keys `(organization_id, id)` across all business tables | Isolation test: tenant A cannot query or mutate tenant B records |
| **SYS-06** | Secure role-based access control (RBAC) replacing hardcoded prototype credentials | Chap 5.3.1, p. 64; App C, p. 105; CMMS Req | `AuthModule`, `JwtGuard`, `RoleGuard` | `users`, `roles`, `permissions`, `role_permissions`, `membership_roles` | Authentication suite: bcrypt password verification, JWT expiration, 403 on unauthorized routes |

---

## 3. Equipment Component & Subsystem Requirements (10 Components)

| Req ID | Requirement Description | Source (Chapter/Page) | Proposed Software Component | Database Representation | Verification & Validation Method |
|---|---|---|---|---|---|
| **CMP-01** | Feed Water System - Feed Pump component tracking | Chap 2.2.5, p. 10; Chap 4.2.2, p. 39 | `AssetHierarchyModule` | `assets` (category: 'Feed Pump', parent_asset_id: Boiler) | Asset parent-child link test; component runtime aggregation |
| **CMP-02** | Feed Water System - Economizer heat recovery unit tracking | Chap 2.2.5, p. 10; Chap 4.2.2, p. 39 | `AssetHierarchyModule` | `assets` (category: 'Economizer', parent_asset_id: Boiler) | Asset hierarchy query; thermal recovery logging |
| **CMP-03** | Feed Water System - Feed Water Tank & condensate header tracking | Chap 2.2.5, p. 10; Chap 4.2.2, pp. 39–40 | `AssetHierarchyModule` | `assets` (category: 'Feed Water Tank', parent_asset_id: Boiler) | Water storage tracking; condensate return temperature validation |
| **CMP-04** | Steam System - Heat Exchanger & Fire-Tube Bundle tracking | Chap 2.2.5, p. 10; Chap 4.2.2, p. 40 | `AssetHierarchyModule` | `assets` (category: 'Heat Exchanger', parent_asset_id: Boiler) | Tube bundle inspection history; de-scaling log query |
| **CMP-05** | Exclusion of Superheater subsystem from commercial fire-tube boiler module | Chap 4.2.1, pp. 36–37; Table 4.3, p. 42 | `BoilerConfigurationValidator` | System types definition; superheater category disabled for fire-tube | Configuration validation test: rejecting superheater attachment to fire-tube boiler |
| **CMP-06** | Fuel System - Combustion Chamber & Refractory tracking | Chap 2.2.5, p. 10; Chap 4.2.2, p. 40 | `AssetHierarchyModule` | `assets` (category: 'Combustion Chamber', parent_asset_id: Boiler) | Refractory spalling log test; chamber heat inspection record |
| **CMP-07** | Fuel System - Burner Assembly (nozzle, electrodes, linkages, fuel pump) | Chap 2.2.5, p. 10; Chap 4.2.2, p. 40 | `AssetHierarchyModule` | `assets` (category: 'Burner', parent_asset_id: Boiler) | Burner operating hour aggregation; atomization inspection records |
| **CMP-08** | Fuel System - Exhaust Stack & Draft Regulators tracking | Chap 2.2.5, p. 10; Chap 4.2.2, p. 40 | `AssetHierarchyModule` | `assets` (category: 'Exhaust Stack', parent_asset_id: Boiler) | Flue velocity/temp logging; draft regulator calibration check |
| **CMP-09** | Safety System - Dual Safety Relief Valves tracking | Chap 2.2.5, p. 11; Chap 4.2.2, pp. 40–41 | `AssetHierarchyModule` | `assets` (category: 'Safety Valve', parent_asset_id: Boiler) | Popping pressure calibration test record; seat leakage check |
| **CMP-10** | Safety System - Pressure Gauges & Siphon connections tracking | Chap 2.2.5, p. 11; Chap 4.2.2, p. 41 | `AssetHierarchyModule` | `assets` (category: 'Pressure Gauge', parent_asset_id: Boiler) | Pressure gauge calibration cross-check; inspection response |
| **CMP-11** | Pressure Vessel Shell - Blowdown valves & electromechanical pressure switches | Chap 4.2.1, p. 39; Table 4.2, p. 41 | `AssetHierarchyModule` | `assets` (category: 'Boiler Shell', parent_asset_id: Boiler) | Blowdown operational verification; pressure switch trip test |

---

## 4. Validated Maintenance Activities Traceability (35 Activities)

| Activity Code | Description & Objective | Source (Chapter/Page) | Triggering Benchmark / Schedule | Database Representation (`decision_alternatives` / `maintenance_task_templates`) | Verification & Validation Method |
|---|---|---|---|---|---|
| **FPMA 1** | Replace worn mechanical pump seals | Table 4.2, p. 39; Table 4.7, p. 53 | Pump runtime $\ge 12,000$ hrs; Annual | `code: 'FPMA_1'`, category: 'Corrective/Periodic' | Seed validation; operating hour threshold trigger test |
| **FPMA 2** | Replace damaged impellers | Table 4.2, p. 39; Table 4.7, p. 53 | Feed water pressure $< 4$ bar; Annual | `code: 'FPMA_2'`, category: 'Corrective/Periodic' | Low-pressure simulation test; alert generation |
| **FPMA 3** | Lubricate and clean pump/motor bearings | Table 4.2, p. 39; Table 4.7, p. 53 | Operating temp $> 90^\circ$C; Monthly | `code: 'FPMA_3'`, category: 'Preventive' | Monthly PM schedule generation; temp excursion alert |
| **FPMA 4** | Motor Megger insulation testing | Table 4.2, p. 39; Table 4.7, p. 53 | Ampere log steady increase; Annual | `code: 'FPMA_4'`, category: 'Preventive/Periodic' | Trend analysis trigger test on ammeter logs |
| **EMA 1** | Clean soot and ash deposits from economizer | Table 4.2, p. 39; Table 4.7, p. 53 | Flue gas temp $> 190^\circ$C; Quarterly | `code: 'EMA_1'`, category: 'Preventive' | Quarterly PM generation; stack temp alert test |
| **FWTMA 1** | Desludge feed water tank bottom | Table 4.2, p. 39; Table 4.7, p. 53 | Sediment increase; Return temp $< 90^\circ$C; Annual | `code: 'FWTMA_1'`, category: 'Periodic' | Annual tank drain down task generation |
| **FWTMA 2** | Clean trap system & condensate headers | Table 4.2, p. 39; Table 4.7, p. 53 | Return hot water temp $> 90^\circ$C; Annual | `code: 'FWTMA_2'`, category: 'Preventive' | Return line steam slip temperature alert test |
| **FWTMA 3** | Replace feed tank insulation jacket | Table 4.2, p. 40; Table 4.7, p. 53 | Feed water temp $< 90^\circ$C | `code: 'FWTMA_3'`, category: 'Corrective' | Tank surface subcooling alert test |
| **FWTMA 4** | Clear clogged drainpipes and overflow ports | Table 4.2, p. 40; Table 4.7, p. 53 | Feed water flow rate $< 4$ bar; Quarterly | `code: 'FWTMA_4'`, category: 'Preventive' | Drainage capacity test; flow obstruction trigger |
| **FWTMA 5** | Water level cut-off valve repair/replace | Table 4.2, p. 40; Table 4.7, p. 53 | Sight glass level deviation; Annual | `code: 'FWTMA_5'`, category: 'Periodic/Safety' | Sight glass low/high water alarm test |
| **FWTMA 6** | Feed water non-return check valve repair | Table 4.2, p. 40; Table 4.7, p. 53 | Feed tank level anomaly; Annual | `code: 'FWTMA_6'`, category: 'Periodic/Safety' | Non-return valve backflow test simulation |
| **HEMA 1** | Chemical de-scaling ($CaCO_3$ removal) | Table 4.2, p. 40; Table 4.7, p. 53 | Steam rate $< 1100$ kg/h; Annual | `code: 'HEMA_1'`, category: 'Preventive/Periodic' | Boiler steam output drop alert test |
| **HEMA 2** | Fire tube replacement via Hydrostatic test | Table 4.2, p. 40; Table 4.7, p. 53 | Water leak detected on test; Annual | `code: 'HEMA_2'`, category: 'Periodic/Critical' | Hydro test failure $\to$ immediate critical work order |
| **HEMA 3** | Brush fire-tube internal soot surfaces | Table 4.2, p. 40; Table 4.7, p. 53 | Flue gas temp $> 190^\circ$C; Quarterly | `code: 'HEMA_3'`, category: 'Preventive' | Tube pass temperature gradient trigger test |
| **CCMA 1** | Remove ash and slag from combustion chamber | Table 4.2, p. 40; Table 4.7, p. 53 | Steam pressure $< 9$ bar; Monthly | `code: 'CCMA_1'`, category: 'Preventive' | Monthly combustion cleanout schedule test |
| **CCMA 2** | Rebe tray repair and burner alignment | Table 4.2, p. 40; Table 4.7, p. 54 | Refractory break / visual breakdown; Annual | `code: 'CCMA_2'`, category: 'Periodic' | Flame impingement walkthrough inspection log |
| **CCMA 3** | Resurface worn chamber interior refractory | Table 4.2, p. 40; Table 4.7, p. 54 | Steam temp $> 170^\circ$C | `code: 'CCMA_3'`, category: 'Corrective' | Furnace shell thermal excursion test |
| **BMA 1** | Overhaul and replace fuel spray nozzles | Table 4.2, p. 40; Table 4.7, p. 54 | Burner hrs $\ge 2000$; Flue temp $> 190^\circ$C; Annual | `code: 'BMA_1'`, category: 'Preventive/Periodic' | Runtime counter alert and flue gas trigger test |
| **BMA 2** | Replace defective burner ignition electrodes | Table 4.2, p. 40; Table 4.7, p. 54 | Visual poor spark; Annual | `code: 'BMA_2'`, category: 'Periodic' | Shift inspection response `poor_spark` trigger |
| **BMA 3** | Calibrate combustion air dampers & linkages | Table 4.2, p. 40; Table 4.7, p. 54 | Exhaust $O_2$ increase ($> 5.5\%$); Annual | `code: 'BMA_3'`, category: 'Preventive' | Excess air stoichiometric drift trigger test |
| **BMA 4** | Clean optical photocell flame detector | Table 4.2, p. 40; Table 4.7, p. 54 | Fuel overconsumption; Annual | `code: 'BMA_4'`, category: 'Preventive' | Photocell optical fouling simulation test |
| **BMA 5** | Clean fuel pump suction filter and strainer | Table 4.2, p. 40; Table 4.7, p. 54 | Steam rate $< 1100$; Steam temp $< 170^\circ$C | `code: 'BMA_5'`, category: 'Corrective' | Steam generation deficit alert test |
| **BMA 6** | Replace fuel solenoid shutoff valves | Table 4.2, p. 40; Table 4.7, p. 54 | Fuel overconsumption log | `code: 'BMA_6'`, category: 'Corrective/Safety' | Day tank volumetric drop rate trigger |
| **BMA 7** | Replace fuel atomizer misting assembly | Table 4.2, p. 40; Table 4.7, p. 54 | Visual poor spark / unburned oil; Annual | `code: 'BMA_7'`, category: 'Periodic' | Heavy oil misting failure alert test |
| **ESMA 1** | Clean soot deposits from exhaust stack | Table 4.2, p. 40; Table 4.7, p. 54 | Flue gas temp $< 190^\circ$C; Annual | `code: 'ESMA_1'`, category: 'Preventive' | Low draft velocity / stack condensation alert |
| **ESMA 2** | Overhaul draft regulators & barometric damper | Table 4.2, p. 40; Table 4.7, p. 54 | Exhaust $CO > 200$ ppm; Biannual | `code: 'ESMA_2'`, category: 'Periodic/Environmental' | Carbon monoxide emissions trigger test |
| **SVMA 1** | Replace safety relief valve springs | Table 4.2, p. 40; Table 4.7, p. 54 | Popping pressure deviation from 9.0 bar; Annual | `code: 'SVMA_1'`, category: 'Periodic/Critical' | Pop test deviation $\to$ high-priority work order |
| **SVMA 2** | Lap and polish safety valve seats | Table 4.2, p. 41; Table 4.7, p. 54 | Steam pressure drop $< 9$ bar; Annual | `code: 'SVMA_2'`, category: 'Preventive' | Continuous micro-leak pressure loss trigger |
| **SVMA 3** | Replace corroded safety valve discs | Table 4.2, p. 41; Table 4.7, p. 54 | Steam leak detected; Biannual | `code: 'SVMA_3'`, category: 'Periodic/Safety' | Visual/auditory steam leak log trigger |
| **SVMA 4** | Replace safety valve high-temp flange gaskets | Table 4.2, p. 41; Table 4.7, p. 54 | Steam leak detected; Biannual | `code: 'SVMA_4'`, category: 'Periodic/Safety' | Flange joint leak report trigger |
| **PGMA 1** | Replace damaged Bourdon tube internals | Table 4.2, p. 41; Table 4.7, p. 54 | Gauge breakdown / stuck reading; Annual | `code: 'PGMA_1'`, category: 'Periodic' | Dual-gauge discrepancy check test |
| **PGMA 2** | Clean pressure gauge siphon coil & cock | Table 4.2, p. 41; Table 4.7, p. 54 | Gauge breakdown / sluggish; Annual | `code: 'PGMA_2'`, category: 'Periodic' | Siphon coil blockage inspection response |
| **PGMA 3** | Tighten/rethread gauge impulse fittings | Table 4.2, p. 41; Table 4.7, p. 54 | Gauge port leak; Quarterly & Annual | `code: 'PGMA_3'`, category: 'Preventive/Periodic' | Quarterly gauge inspection checklist test |
| **BSMA 1** | Overhaul boiler bottom blowdown valves | Table 4.2, p. 41; Table 4.7, p. 54 | Blowdown breakdown / valve leak; Biannual | `code: 'BSMA_1'`, category: 'Periodic/Safety' | Shift blowdown failure response trigger |
| **BSMA 2** | Replace electromechanical pressure switch | Table 4.2, p. 41; Table 4.7, p. 54 | Steam pressure $> 9$ bar; Biannual | `code: 'BSMA_2'`, category: 'Periodic/Critical' | Overpressure excursion cut-off test |

---

## 5. Decision Support & Operational Data Capture Requirements

| Req ID | Requirement Description | Source (Chapter/Page) | Proposed Software Component | Database Representation | Verification & Validation Method |
|---|---|---|---|---|---|
| **DAT-01** | Structured 2-hourly shift monitoring data entry form | Chap 5.3.1, p. 64; Fig 5.3, p. 65 | `DailyBoilerMonitoringPage.tsx`, `OperationsController` | `meter_readings`, `inspections`, `inspection_responses` | Form rendering test; 2-hour interval timestamp check |
| **DAT-02** | Form-level validation preventing non-numeric inputs into decimal fields | Chap 5.3.1, p. 66; Prompt Req 1 | `Zod` validation schema, React Form state | API request payload rejection (HTTP 400 Bad Request) | Unit test: invalid string rejection ('abc' in pressure field) |
| **DAT-03** | Immediate evaluation of logged operational readings against benchmarks | Chap 4.4, p. 55; Chap 5.3.1, p. 65 | `AnpEngineService.evaluateReadings` | `decision_runs`, `notifications` | Integration test: input 195°C flue temp ➔ generates active alert |
| **DAT-04** | Active Maintenance Alerts UI component with visual severity color coding | Chap 5.3.1, p. 66; Fig 5.4, p. 66 | `ActiveMaintenanceAlerts.tsx` | `notifications.severity IN ('warning', 'critical')` | UI test: Gold accent for warning, Deep Red for critical |
| **DAT-05** | Real-time alert synchronization without requiring full browser reload | Chap 5.3.1, p. 66; Prompt Req 2 | React Query polling / WebSocket subscription | API endpoint `/api/notifications/active` | End-to-end sync test: alert appears in dashboard within 2 seconds |
| **DAT-06** | Alert triage actions: 'Acknowledge' and 'Resolve' (opens drafted work order) | Chap 5.3.1, p. 66; Fig 5.4, p. 66 | `AlertTriageModal.tsx`, `WorkOrdersService` | `notifications.status`, `work_orders` (`status = 'draft'`) | E2E test: clicking Resolve creates draft WO with linked alternative |
| **DAT-07** | Export of historical log entries and decision runs in CSV and XLSX format | Chap 5.3.1, p. 65 | `ExportService`, `HistoricalLogsPage.tsx` | Stream query on `meter_readings` + `inspection_responses` | File download verification: CSV header matching logged fields |
| **DAT-08** | Audit logging of all UPDATE and DELETE mutations on critical tables | Master Vision §3; Prompt Req 3 | `AuditLogInterceptor` Prisma Extension | `audit_logs` (`entity_name`, `entity_id`, `action`, `old_values`, `new_values`) | Unit test: updating asset name creates audit log row with diff |
| **DAT-09** | Binary file upload for maintenance evidence (Multer multipart/form-data) | Master Vision §3; Prompt Req 3 | `AttachmentsController`, `UploadMiddleware` | `attachments`, `entity_attachments` | File upload test: JPG photo uploaded, stored to disk, linked to WO |
| **DAT-10** | Mobile/tablet responsive touch targets ($\ge 44 \times 44$px) for gloved floor operators | UI Refactor Prompt Req 8 | Tailwind classes `h-12`, `p-4`, `min-h-[44px]` across forms | `DailyBoilerMonitoringPage.tsx`, `ResponsiveTable.tsx` | Automated Cypress/Playwright viewport test for touch target size |
| **DAT-11** | Responsive layout switching between full grid/table and stacked card view | UI Refactor Prompt Req 8 | Tailwind breakpoints `md:hidden`, `hidden md:table` | `AssetMasterPage.tsx`, `AlertsTable.tsx` | Viewport resize test: cards rendered below 768px, table at 1024px+ |

---

## 6. ANP Operational Data Integration & Safety Governance Traceability

| Req ID | Requirement Description | Source (Standard / Dissertation) | Software Component | Database Representation | Verification & Validation Method |
|---|---|---|---|---|---|
| **ODI-01** | Telemetry completeness & physical bounds validation ($0.0 - 1.0$ score) | Chap 4.4, p. 55; ASME BPVC Sec VII | `DataQualityValidator`, `operational-anp.service.ts` | `decision_runs.result_snapshot.dataQuality` | Unit test: `should compute data quality score and detect sensor range anomalies` |
| **ODI-02** | Synchronous hard safety interlock evaluation independent of ANP ranking | ASME BPVC Sec VII C2.300; NBIC Part 2 | `SafetyEscalationService` | `notifications` (`CRITICAL_SAFETY_ESCALATION`), `decision_runs.result_snapshot.safetyAlerts` | Unit test: `should strictly distinguish independent safety alerts from ANP recommendations` |
| **ODI-03** | Immediate escalation for LWCO trip, Overpressure, Stack Fire, Acidic pH | ASME BPVC Sec VII; Dissertation Chap 4.2 | `SafetyEscalationService` | `notifications` (`severity: 'critical'`) | Unit test: `should trigger immediate safety alert on stack temperature >= 260°C` |
| **ODI-04** | Active decision model retrieval & Limit Supermatrix power method ($W^\infty$) | Saaty (2001); Dissertation Chap 3.4 | `OperationalAnpService`, `MathematicalAnpEngine` | `decision_models`, `decision_runs` | Unit test: `should execute 10-step operational ANP pipeline on logbook submission` |
| **ODI-05** | Immutable input snapshot & SHA-256 deterministic hash recording | Dissertation Chap 5.3; Enterprise Audit | `DecisionRunRepository`, `Prisma.decisionRun` | `decision_runs.input_snapshot`, `deterministic_hash` | Unit test: `should record model version and input snapshot in decision run` |
| **ODI-06** | Ranked maintenance recommendations with Limit Supermatrix priorities ($p_a$) | Dissertation Chap 4.4, pp. 58-62 | `OperationalAnpService.generateRecommendations` | `decision_runs.result_snapshot.recommendations` | Unit test: `should rank candidate maintenance alternatives by Limit Supermatrix priority` |
| **ODI-07** | Proportional criteria attribution ($\text{propContribution}$) & root cause | Dissertation Chap 4.4, p. 60 | `OperationalAnpService.formulateCriteriaAttribution` | `recommendation.criteriaAttribution` | Unit test: `should explain criteria influencing each recommendation with percentage and root-cause` |
| **ODI-08** | Asset maintenance history context & linked telemetry readings | Dissertation Chap 5.2 | `OperationalAnpService.getAssetMaintenanceContext` | `recommendation.linkedReadings`, `maintenanceHistoryContext` | Unit test: `should link recommendations to relevant operational readings and maintenance history` |
| **ODI-09** | Human-in-the-loop engineer review, sign-off, and Work Order generation | Dissertation Chap 5.4; Enterprise CMMS | `OperationalAnpController`, `work-orders.service.ts` | `work_orders`, `decision_runs.work_order_id` | Integration test: `should allow authorized engineer to approve operational maintenance and generate approved Work Order` |
| **ODI-10** | Prohibition of automated approval for safety-critical interventions | ASME BPVC; High-hazard CMMS Safety | `OperationalAnpService.reviewRecommendation` | Exception `SAFETY_CRITICAL_INSPECTOR_JUSTIFICATION_REQUIRED` | Unit test: `should block approval of safety-critical interventions without certified engineer sign-off` |
| **ODI-11** | Bit-for-bit deterministic decision run replay ($\max \Delta p_a < 10^{-4}$) | Dissertation Chap 3.5; ISO 55000 Reproducibility | `DecisionReplayEngine.replayRun` | `ReplayDecisionRunResult` | Unit test: `should replay decision run deterministically from stored input snapshot` |
| **ODI-12** | Regression testing across Kingsbury Hotel 1,100 kg/h 4 operational scenarios | Dissertation Chap 4.4, pp. 56-63 | `tests/anp-operational-integration.test.ts` | Historical baseline test fixtures | Test: `Kingsbury 1,100 kg/h Boiler Baseline Scenarios (Vishal Perera 2025)` |
| **ODI-13** | Dedicated slide-over drawer UI with real-time attribution and replay | UI Refactor & Ergonomics | `OperationalAnpDrawer.tsx`, `DailyBoilerMonitoringPage.tsx` | React state, API client service | Frontend build: `tsc -b && vite build` (1,617 modules transformed, 0 errors) |

---

## 7. Frontend Design System & Enterprise UI/UX Traceability

| Req ID | Requirement Description | Design Standard | Software Component | Verification & Validation Method |
|---|---|---|---|---|
| **UI-01** | Midnight navy background hierarchy (`midnight-950` to `800`) | WCAG 2.1 Dark Canvas | `tailwind.config.js`, `index.css` | Unit test: `should define the midnight navy background hierarchy` |
| **UI-02** | Indigo surfaces, glow rings, and active navigation indicators | Premium Enterprise CMMS | `tailwind.config.js`, `Sidebar.tsx`, `TopNavbar.tsx` | Unit test: `should define indigo surfaces and navigation highlights` |
| **UI-03** | Restrained luxury gold accents for priority and alert markers | Saaty ANP High-Priority Tokens | `StatusBadge.tsx`, `Badge.tsx`, `ActiveMaintenanceAlerts.tsx` | Unit test: `should define restrained luxury gold accents for priority and brand markers` |
| **UI-04** | Accessible touch targets ($\ge 44 \times 44$px) for gloved floor tablet operators | Industrial Ergonomics Standard | `Button.tsx`, `Input.tsx`, `TopNavbar.tsx`, `Sidebar.tsx` | Unit test: `should enforce touch-target minimums (>= 44x44px)` |
| **UI-05** | Modular presentation component library with zero embedded business logic | Clean Component Architecture | `Button.tsx`, `Card.tsx`, `Input.tsx`, `Select.tsx`, `Badge.tsx`, `Modal.tsx`, `Tabs.tsx` | Frontend build: `tsc -b && vite build` (1,630 modules transformed, 0 errors) |
| **UI-06** | Standardized asynchronous states (`LoadingState`, `EmptyState`, `ErrorState`, `SuccessState`, `ForbiddenState`) | Enterprise Resilience Pattern | `LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `SuccessState.tsx`, `ForbiddenState.tsx` | Unit test: `Component States` suite in `tests/frontend-design-system.test.ts` |
| **UI-07** | Organization white-label branding with dynamic logo replacement and fallback | Multi-Tenant White-Label Spec | `BrandLogo.tsx`, `OrganizationSettingsPage.tsx` | Unit test: `should resolve custom client logo when logoUri is present` and `should gracefully fall back to LuminaFM` |
| **UI-08** | Role-aware navigation filtering across 4 standardized enterprise roles | RBAC Access Standard | `Sidebar.tsx`, `TopNavbar.tsx`, `AuthContext.tsx` | Unit test: `should expose all 6 navigation modules to Organization Admin` & role-specific filters |
| **UI-09** | Protected application route guards enforcing roles and permissions | Route-level Authorization | `App.tsx` (`ProtectedRoute`), `ForbiddenState.tsx` | Unit test: `should format role-based access denial in ForbiddenState correctly` |
| **UI-10** | Interactive header & sidebar role switcher for immediate demonstration | Enterprise UX Demonstrator | `TopNavbar.tsx`, `Sidebar.tsx`, `AuthContext.tsx` | Component integration verification across all 4 roles |


