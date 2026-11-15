# LuminaFM Equipment Extensibility Framework Architecture

## 1. Executive Summary & Architectural Motivation

LuminaFM was initially engineered with deep, academically validated decision support for **industrial fire-tube steam boilers** ($1,000 - 1,800\text{ kg/h}$ capacity, oil-fired), leveraging an Analytic Network Process (ANP) model derived from peer-reviewed literature and empirical expert interviews. 

As an enterprise-grade Computerized Maintenance Management System (CMMS), LuminaFM must scale across diverse industrial equipment categories—such as **chillers, cooling towers, air compressors, pumps, and electrical transformers**—without:
1. Hardcoding equipment-specific logic into core CMMS entities (`Asset`, `WorkOrder`, `InspectionRecord`, `DailyLogbook`, `User`, `Tenant`).
2. Conflating distinct thermodynamic, mechanical, and regulatory behaviors.
3. Violating scientific integrity by misapplying equipment-specific decision models (such as the dissertation boiler ANP model) to other asset classes.

The **LuminaFM Equipment Extensibility Framework** introduces a standardized, polymorphic module contract that decouples equipment-specific behaviors from core CMMS services.

```
                      +-----------------------------------+
                      |      LuminaFM Core CMMS Platform   |
                      |  (Assets, Work Orders, Security,  |
                      |   Inspections, Tenancy, RBAC)     |
                      +-----------------+-----------------+
                                        |
                            Standard Module Contract
                                        |
               +------------------------+------------------------+
               |                                                 |
+--------------v---------------+                 +---------------v--------------+
|     Boiler Equipment Module   |                 |    Chiller Equipment Module   |
| (STEAM_BOILER_FIRETUBE)      |                 | (CHILLER_WATER_COOLED)       |
| - ASME Section I / EN 12953  |                 | - AHRI 550/590 & ASHRAE 22   |
| - Steam, Flue Gas, Feedwater |                 | - CHW/CW Loops, Refrigerant  |
| - Dissertational ANP Model   |                 | - Independent RCM Model      |
|   (ANP-KINGSBURY-FIRETUBE)   |                 |   (CHILLER-RCM-ASHRAE-v1.0.0)|
+------------------------------+                 +------------------------------+
               |                                                 |
               x <-------- BLOCKED CROSS-MODULE EXECUTION ------> x
               (CrossModuleDecisionModelError strictly enforced)
```

---

## 2. Standardized Module Contract Specification

Every equipment module implements the `EquipmentModuleContract` interface defined in [`src/modules/equipment-framework/equipment-module.contract.ts`](file:///e:/My%20Owns/src/modules/equipment-framework/equipment-module.contract.ts).

The contract codifies eight core facets:

```typescript
export interface EquipmentModuleContract {
  // Identity & Governance
  readonly moduleCode: string;
  readonly name: string;
  readonly categoryCode: string;
  readonly version: string;
  readonly governingStandards: string[];

  // 1. Equipment-Specific Configuration & Specification Schema
  readonly specificationsSchema: EquipmentSpecificationSchema;

  // 2. Physical Subsystems & Hierarchy
  readonly physicalSubsystems: PhysicalSubsystemDefinition[];

  // 3. Operational Readings & Measurement Definitions
  readonly measurementPoints: MeasurementPointDefinition[];

  // 4. Inspection Walkthrough Templates
  readonly inspectionTemplates: InspectionTemplateDefinition[];

  // 5. Maintenance Task Templates
  readonly maintenanceTaskTemplates: MaintenanceTaskTemplateDefinition[];

  // 6. Decision-Support Model Association & Isolation Rules
  readonly decisionSupport: ModuleDecisionSupportAssociation;

  // 7. Equipment-Specific Dashboard Configuration
  readonly dashboardConfig: ModuleDashboardConfig;

  // 8. Specialized Equipment Reporting Configuration
  readonly reportingConfig: ModuleReportingConfig;

  // Behavioral Evaluation & Telemetry Analysis Methods
  evaluateReadings(readings: Record<string, number>): AnomalyDetectionResult[];
  calculateKpis(readings: Record<string, number>): Record<string, number>;
}
```

### Detailed Facet Breakdown

| # | Facet | Purpose | Contract Elements |
|---|---|---|---|
| **1** | **Specifications Schema** | Defines nameplate, engineering design limits, and thermodynamic ratings | `fieldCode`, `dataType`, `unit`, `required`, `validator(val)` |
| **2** | **Physical Subsystems** | Hierarchical decomposition of mechanical, thermal, electrical, and control sub-assemblies | `code`, `name`, `criticalityLevel`, `componentGroups` |
| **3** | **Measurement Points** | Defines telemetry sensors, sample frequencies, nominal ranges, alert thresholds, and associated maintenance actions | `code`, `name`, `unit`, `nominalMin`, `nominalMax`, `warningLow/High`, `criticalLow/High`, `suggestedActionOnAbnormal` |
| **4** | **Inspection Templates** | Standard operating walkthrough routines and checkpoint checks | `templateCode`, `checkpoints` (`AUDITORY`, `VISUAL`, `GAUGE_VERIFICATION`, `LEAK_CHECK`), photo required on abnormal |
| **5** | **Task Templates** | Pre-packaged preventive maintenance (PM) routines | `taskCode`, `frequencyDays`, `estimatedHours`, `requiredTrade`, `requiredParts`, `safetyProcedures` (LOTO) |
| **6** | **Decision-Support Association** | Binds validated analytic models with explicit cross-module boundaries | `frameworkType`, `modelCode`, `validationStatus`, `crossModuleReusePermitted`, `validationDisclaimer` |
| **7** | **Dashboard Configuration** | Equipment-tailored visualization blueprints | `kpis` (code, label, unit, targetMin/Max), `widgets` (`GAUGE`, `TIME_SERIES`, `METRIC_CARD`) |
| **8** | **Reporting Configuration** | Specialized compliance exports and thermodynamic audits | `reportCode`, `format` (`PDF`, `CSV`, `JSON`), `governingStandards` |

---

## 3. Strict Decision-Support Isolation & Academic Governance

### 3.1 The Academic Isolation Mandate
The dissertation Analytic Network Process (ANP) model (`ANP-KINGSBURY-FIRETUBE-v1.0.0`) was formulated specifically for **oil-fired fire-tube steam boilers** ($1,000 - 1,800\text{ kg/h}$ capacity, $10\text{ bar}$ operating pressure). The inner-dependence supermatrices, pairwise comparisons, criteria weights (e.g., combustion efficiency, water hardness, flue gas temperature), and alternative rankings (burner overhaul, chemical descaling, refractory repair) reflect the physics and failure modes of steam generation.

Transplanting this ANP model onto a **Water-Cooled Centrifugal Chiller** violates academic and operational principles:
1. **Divergent Thermodynamics**: Boilers generate vapor by combusting fuel; chillers extract thermal energy via closed-cycle fluorocarbon phase transition and compression.
2. **Inapplicable Criteria**: Flue gas $O_2$, stack loss, and blowdown TDS have no meaning on a water chiller.
3. **Misleading Risk Rankings**: In a chiller, evaporator freeze-up, oil migration, and condenser tube biological fouling are paramount; prioritizing boiler refractory or burner nozzle actions would cause operational disruption or catastrophic equipment failure.

### 3.2 Enforcement via `EquipmentModuleRegistry`
The `EquipmentModuleRegistry` ([`src/modules/equipment-framework/equipment-module.registry.ts`](file:///e:/My%20Owns/src/modules/equipment-framework/equipment-module.registry.ts)) enforces isolation at the runtime invocation layer:

```typescript
public assertDecisionModelCompatibility(moduleCode: string, requestedModelCode: string): void {
  const module = this.getModule(moduleCode);
  const decisionSupport = module.decisionSupport;

  if (decisionSupport.modelCode !== requestedModelCode) {
    if (!decisionSupport.crossModuleReusePermitted) {
      throw new CrossModuleDecisionModelError(
        `Decision model '${requestedModelCode}' cannot be applied to equipment module '${moduleCode}' (${module.name}). ` +
        `The module is bound to '${decisionSupport.modelCode}' (${decisionSupport.frameworkType}). ` +
        `Cross-module model reuse is forbidden: ${decisionSupport.validationDisclaimer}`
      );
    }
  }
}
```

Attempting to run `ANP-KINGSBURY-FIRETUBE-v1.0.0` on `CHILLER_WATER_COOLED` immediately raises a structured `CrossModuleDecisionModelError`, rejecting execution with an explanation and audit log entry.

---

## 4. Non-Boiler Demonstration: Water-Cooled Chiller Module

The `CHILLER_WATER_COOLED` module ([`src/modules/equipment-framework/modules/chiller/chiller.module.ts`](file:///e:/My%20Owns/src/modules/equipment-framework/modules/chiller/chiller.module.ts)) provides a production-grade implementation of the contract for industrial HVAC chillers ($300 - 1,500\text{ TR}$, centrifugal/screw).

### 4.1 Governing Standards
- **AHRI Standard 550/590 (I-P)**: Performance Rating of Water-Chilling and Heat Pump Water-Heating Packages.
- **ASHRAE Guideline 22-2012**: Instrumentation for Monitoring Central Chilled-Water Plant Efficiency.
- **ASHRAE Standard 15**: Safety Standard for Refrigeration Systems.

### 4.2 Subsystems & Telemetry Points
The chiller decomposes into six physical subsystems:
1. `COMPRESSOR_MOTOR`: Refrigerant compressor, suction/discharge valves, VFD motor.
2. `EVAPORATOR_CHW`: Shell-and-tube flooded heat exchanger, water box, distribution baffle.
3. `CONDENSER_CW`: Shell-and-tube water-cooled condenser, marine water boxes.
4. `OIL_LUBRICATION`: Oil separator, lubrication pump, oil cooler, dual filter bank.
5. `PURGE_SYSTEM`: Non-condensable gas purge unit, carbon canister, purge compressor.
6. `ELECTRICAL_CONTROL`: Microprocessor panel, starter cabinet, transducer loop.

#### Fourteen Key Measurement Points:
- `CHW_SUPPLY_TEMP` ($4.0 - 9.0^\circ\text{C}$, alert at $>10.0^\circ\text{C}$)
- `CHW_RETURN_TEMP` ($10.0 - 15.0^\circ\text{C}$)
- `CW_SUPPLY_TEMP` ($24.0 - 32.0^\circ\text{C}$)
- `CW_RETURN_TEMP` ($29.0 - 38.0^\circ\text{C}$)
- `EVAP_APPROACH_TEMP` ($0.5 - 2.0^\circ\text{C}$, warning at $>2.5^\circ\text{C}$, critical at $>3.5^\circ\text{C}$)
- `COND_APPROACH_TEMP` ($0.5 - 2.0^\circ\text{C}$, warning at $>2.5^\circ\text{C}$, critical at $>3.5^\circ\text{C}$ - indicates tube scaling)
- `EVAP_PRESSURE` ($2.5 - 4.5\text{ bar}$)
- `COND_PRESSURE` ($6.5 - 11.5\text{ bar}$)
- `COMPRESSOR_DISCHARGE_TEMP` ($45.0 - 75.0^\circ\text{C}$)
- `OIL_PRESSURE_DIFF` ($1.5 - 3.0\text{ bar}$, warning at $>3.5\text{ bar}$, critical at $>4.2\text{ bar}$ - indicates clogged filter)
- `OIL_SUMP_TEMP` ($40.0 - 65.0^\circ\text{C}$)
- `COMPRESSOR_RLA_PCT` ($20.0 - 100.0\%$)
- `KW_PER_TON` ($0.50 - 0.70\text{ kW/TR}$)
- `PURGE_DAILY_MINUTES` ($0 - 10\text{ min/day}$, warning at $>15\text{ min/day}$ - indicates non-condensable air ingress)

### 4.3 Thermodynamic KPI Computation
The chiller module calculates live thermodynamic performance:

$$\Delta T_{\text{CHW}} = T_{\text{CHW\_RETURN}} - T_{\text{CHW\_SUPPLY}}$$

$$\text{COP} = \frac{3.51685}{\text{kW/TR}}$$

Where $1\text{ Ton of Refrigeration (TR)} = 3.51685\text{ kW}_{\text{thermal}}$.

---

## 5. Seamless Preservation of Shared CMMS Capabilities

The Extensibility Framework ensures that all existing LuminaFM enterprise features remain 100% agnostic to equipment specifics:

```
+--------------------------------------------------------------------------+
|                        Unified Enterprise CMMS Layer                      |
|                                                                          |
|  - Multi-Tenant Row-Level Security (tenant_id context)                   |
|  - Role-Based Access Control (Operator, Reliability Eng, Lead, Admin)    |
|  - Immutable Audit Logging (Actor, IP, Tenant, Old/New Snapshot)          |
|  - Preventive Maintenance Scheduling & Work Order Generation             |
|  - Offline PWA Synchronization & IndexedDB Draft Queue                   |
|  - Digital Signatures & Regulatory PDF Dossier Generation                |
+--------------------------------------------------------------------------+
                                     ^
                                     |
              Consumes Polymorphic Module Output via Standard Adapters
                                     |
+--------------------------------------------------------------------------+
|                        Equipment Module Ecosystem                         |
|                                                                          |
|  +---------------------------+       +---------------------------------+ |
|  | Steam Boiler Module       |       | Water-Cooled Chiller Module     | |
|  | - Fire-tube combustion    |       | - Centrifugal / Screw HVAC      | |
|  | - ASME I / EN 12953       |       | - AHRI 550/590, ASHRAE 22       | |
|  | - Kingsbury ANP Model     |       | - Independent RCM Model         | |
|  +---------------------------+       +---------------------------------+ |
|                                                                          |
|  +---------------------------+       +---------------------------------+ |
|  | Cooling Tower Module      |       | Air Compressor Module           | |
|  | - Crossflow/Counterflow   |       | - Rotary Screw / Reciprocating  | |
|  | - CTI STD-201RS           |       | - ISO 8573 Compressed Air Class | |
|  +---------------------------+       +---------------------------------+ |
+--------------------------------------------------------------------------+
```

1. **Work Order Dispatch**:
   When an equipment module evaluates telemetry and detects an anomaly (e.g., `COND_APPROACH_HIGH`), it suggests a standardized `MaintenanceActionRecommendation`. The core CMMS converts this directly into a standard `WorkOrder` with trade skill, priority, and LOTO steps without needing to know chiller-specific physics.

2. **Inspection Execution**:
   The operator tablet interface loads `module.inspectionTemplates` for the asset's assigned category. Checkpoint responses map seamlessly to universal `InspectionChecklistResponse` records.

3. **Auditing & Tenancy**:
   All module evaluations, specification changes, and decision executions pass through the immutable `audit_events` pipeline with tenant isolation intact.

---

## 6. Verification and Validation Evidence

The framework is verified by automated test suites in [`tests/equipment-extensibility-framework.test.ts`](file:///e:/My%20Owns/tests/equipment-extensibility-framework.test.ts):

| Test Suite / Category | Scenarios Tested | Status |
|---|---|---|
| **Contract Completeness** | Verification of all 8 standardized facets across registered modules; rejection of modules missing facets | **PASS** |
| **Module Registry Lifecycle** | Dynamic registration, category lookup, module retrieval, duplicate protection | **PASS** |
| **Chiller Module Implementation** | Specification validation, 14 measurement points, approach temp scaling detection, oil differential pressure clog detection, thermodynamic COP calculations | **PASS** |
| **Strict Model Isolation** | Rejection of Boiler ANP model on Chiller (`CrossModuleDecisionModelError`), rejection of Chiller RCM on Boiler, authorization of valid module-model pairs | **PASS** |
| **Dynamic Future Modules** | Runtime registration of an `Induced-Draft Crossflow Cooling Tower Module` conforming to CTI STD-201RS without changing core code | **PASS** |
| **CMMS Functionality Preservation** | Universal work order generation, asset hierarchy decomposition, standardized inspection checklist formatting | **PASS** |

### Execution Metrics
- **Tests Passing**: 17 / 17 in `equipment-extensibility-framework.test.ts` (80 / 80 across all system test suites).
- **TypeScript Typecheck**: 0 errors (`npx tsc --noEmit`).
- **Frontend Production Build**: Clean build in 5.05s (`npm --prefix frontend run build`).
