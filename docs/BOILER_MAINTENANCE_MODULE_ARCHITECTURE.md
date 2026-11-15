# LuminaFM Specialized Equipment Module: Boiler Maintenance Architecture

## 1. Executive Summary & Research Alignment

The **Specialized Boiler Maintenance Module** represents the first equipment-specific application in the LuminaFM platform. It faithfully translates and productionizes the empirical research scope, mathematical model, and operational findings of the dissertation:

> **Dissertation Title**: *Development of an Analytic Network Process (ANP) Based Maintenance Decision Support System for Industrial Oil-Fired Steam Boilers*  
> **Author**: Vishal Perera (June 2025)  
> **Empirical Baseline Facility**: The Kingsbury Hotel, Colombo, Sri Lanka  
> **Equipment Baseline**: 1,100 kg/h oil-fired fire-tube steam boiler operating at 8.0–9.0 bar gauge working pressure  

### Strict Scope & Zero-Invention Constraint
As established in the academic validation, the module is deliberately scoped to **industrial oil-fired fire-tube steam boilers** with steam generation capacities strictly between **1,000 kg/h and 1,800 kg/h**. Operating benchmarks, safety switch thresholds, inspection checkpoints, and thematic maintenance actions are preserved without synthetic or fabricated values.

The system explicitly supports the **manually collected 2-hourly logbook data approach** as the primary operating workflow, reflecting real-world plant room operations while allowing automated telemetry and sensor readings to supplement the record.

---

## 2. Equipment Typology & The 7 Physical Subsystems

The physical architecture of the fire-tube boiler is structured into **7 core engineering subsystems** comprising **11 primary component groups** (Dissertation Chapter 4.2):

```mermaid
graph TD
    Boiler["Oil-Fired Fire-Tube Boiler<br/>(1,000 - 1,800 kg/h)"]

    subgraph Subsystems["The 7 Physical Subsystems & 11 Component Groups"]
        S1["1. Feed Water System"]
        S2["2. Steam Generation System"]
        S3["3. Fuel & Combustion System"]
        S4["4. Exhaust Gas System"]
        S5["5. Water Treatment System"]
        S6["6. Safety & Instrumentation System"]
    end

    Boiler --> S1
    Boiler --> S2
    Boiler --> S3
    Boiler --> S4
    Boiler --> S5
    Boiler --> S6

    S1 --> C1["Feed Water Pump Assembly (FP)"]
    S1 --> C2["Economizer Heat Recovery Unit (E)"]
    S1 --> C3["Feed Water Storage Tank & Deaerator (FWT)"]

    S2 --> C4["Fire-Tubes & Heat Exchanger Passes (HE)"]
    S2 --> C5["Boiler Shell & Water Wall Enclosure (BS)"]

    S3 --> C6["Modulating Fuel Burner & Atomizer (B)"]
    S3 --> C7["Combustion Chamber & Refractory (CC)"]

    S4 --> C8["Exhaust Stack, Damper & Chimney Flue (ES)"]

    S5 --> C9["Water Softener & Chemical Dosing Unit (WS)"]

    S6 --> C10["Spring-Loaded Safety Relief Valves (SV)"]
    S6 --> C11["Water Level Sight Glass & Cut-Off Controls (WLC)"]
```

---

## 3. Empirical Decision Criteria & Benchmark Catalog

The empirical research establishes 10 core quantitative operational and performance parameters (Dissertation Table 4.6 & 4.7). The module validates physical instrument feasibility (rejecting impossible sensor values) and monitors empirical trigger thresholds:

| Parameter Code | Measurement Description | Engineering Unit | Nominal Operating Range | Physical Instrument Range | Empirical Trigger Threshold | Thematic Maintenance Action |
|---|---|---|---|---|---|---|
| `operating_steam_pressure` | Steam Operating Gauge Pressure | `bar` | 8.0 – 9.0 | 0.0 – 15.0 | `> 9.0 bar` | **BSMA 2**: Pressure switch calibration & limit cutout verification |
| `steam_temperature` | Main Steam Outlet Temperature | `°C` | 160.0 – 170.0 | 100.0 – 250.0 | `> 170.0 °C` | **CCMA 3**: Chamber refractory resurface & insulation inspection |
| `flue_gas_temperature` | Stack Flue Gas Temperature | `°C` | 160.0 – 185.0 | 50.0 – 350.0 | `> 190.0 °C` | **EMA 1 / HEMA 3**: Fireside sootblowing & fire-tube mechanical brush cleaning |
| `feedwater_pressure` | Feed Pump Discharge Pressure | `bar` | 4.0 – 6.0 | 0.0 – 12.0 | `< 4.0 bar` | **FPMA 2**: Pump impeller wear check & strainer blowdown |
| `feedwater_temperature` | Feed Water Tank Temperature | `°C` | 85.0 – 90.0 | 20.0 – 105.0 | `< 85.0 °C` | **FWTMA 3**: Tank insulation check & steam sparge tube check |
| `return_condensate_temperature` | Return Condensate Line Temp | `°C` | 85.0 – 90.0 | 20.0 – 105.0 | `< 85.0 °C` | **FWTMA 2**: Steam trap blow-through inspection & pipe insulation |
| `pump_operating_hours` | Feed Pump Cumulative Hours | `hrs` | 0 – 10,000 | 0 – 50,000 | `>= 12,000 hrs` | **FPMA 1**: Major overhaul: mechanical seal & bearing replacement |
| `burner_operating_hours` | Burner Firing Run Hours | `hrs` | 0 – 1,500 | 0 – 50,000 | `>= 2,000 hrs` | **BMA 1**: Burner nozzle replacement & ignition electrode alignment |
| `exhaust_gas_o2` | Flue Gas Oxygen Concentration | `%` | 3.0 – 4.5 | 0.0 – 21.0 | `> 5.5 %` | **BMA 3**: Modulating air damper linkage recalibration |
| `exhaust_gas_co` | Flue Gas Carbon Monoxide | `ppm` | 0 – 100 | 0 – 2,000 | `> 200 ppm` | **ESMA 2 / BMA 7**: Draft regulator servicing & fuel atomizer check |

---

## 4. Visual & Acoustic Walkthrough Inspection Checkpoints

In addition to numerical readings, the dissertation specifies shift walkthrough checkpoints that capture physical operating conditions during operator inspections:

```mermaid
flowchart TD
    A["Operator Shift Walkthrough"] --> B["Sight Glass Blowdown"]
    A --> C["Flame Sight Port"]
    A --> D["Acoustic Leak Check"]
    A --> E["Safety Valve Seat"]
    A --> F["Bottom Blowdown"]
    A --> G["Water Softener Test"]

    B -->|"NORMAL_CENTRELINE"| OK1["Normal Water Level"]
    B -->|"DIRTY / LOW / HIGH"| WARN1["Water Level Control Intervention"]

    C -->|"BRIGHT_YELLOW_STABLE"| OK2["Stoichiometric Combustion"]
    C -->|"DARK_SOOTY / SMOKY"| WARN2["Air-to-Fuel Ratio Deviation"]

    D -->|"NO_LEAKS"| OK3["Envelope Tight"]
    D -->|"MINOR_GLAND_WEEP / AUDIBLE"| WARN3["Packing Replacement Required"]

    E -->|"SEATED_TIGHT_NO_LEAK"| OK4["Relief Seat Intact"]
    E -->|"AUDIBLE_BLOWBY"| CRIT1["Critical Safety Valve Trip Risk"]

    F -->|"FREE_FLOW_CLEAN"| OK5["Sediment Cleared"]
    F -->|"SLUGGISH_SEDIMENT"| WARN4["Scale Sludge Accumulation"]

    G -->|"ZERO_HARDNESS"| OK6["Soft Water Verified"]
    G -->|"HARDNESS_SLIP_DETECTED"| WARN5["Resin Bed Regeneration Overdue"]
```

---

## 5. Primary Operator Workflow & Data Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Boiler Operator / Technician
    participant API as Boiler REST API
    participant BoilerSvc as BoilerService
    participant Validator as Range & Scope Validator
    participant DB as PostgreSQL (Multi-Tenant RLS)
    participant Bus as DecisionSupportEventBus
    participant ANP as ANP Decision Engine
    participant WO as WorkOrdersService

    Operator->>API: POST /api/boiler/{assetId}/shift-logs (2-hourly reading)
    API->>BoilerSvc: submitBoilerShiftLog(dto)
    BoilerSvc->>Validator: Validate physical ranges [min, max]
    alt Parameter range violated (e.g. Flue Gas > 350°C)
        Validator-->>BoilerSvc: BoilerParameterRangeViolationError
        BoilerSvc-->>API: 400 Bad Request
        API-->>Operator: Display Instrument Error
    else Valid Readings
        BoilerSvc->>BoilerSvc: Check empirical triggers (e.g. Flue Gas > 190°C)
        BoilerSvc->>DB: Persist Inspection & MeterReadings
        alt Empirical Benchmark Breached
            BoilerSvc->>Bus: emitDailyLogSubmitted(signals)
            Bus->>ANP: Evaluate ANP Network Supermatrix
            ANP-->>Bus: AnpEvaluationResult (Alternative & Priority)
        end
        BoilerSvc-->>API: 201 Created (Log details + Anomaly list)
        API-->>Operator: Display Log Confirmed & Thematic Actions
    end

    opt Operator Reports Breakdown
        Operator->>API: POST /api/boiler/{assetId}/faults
        API->>BoilerSvc: reportBoilerFault(dto)
        BoilerSvc->>DB: Insert FaultLog (Unique FLT-BLR-YYYY-XXXXX)
        alt Severity is Critical or High
            BoilerSvc->>WO: createFromFaultReport(faultLogId)
            WO->>DB: Generate Corrective Work Order
        end
        BoilerSvc-->>API: 201 Created (Fault + Linked Work Order)
        API-->>Operator: Display Fault Ticket & Work Order ID
    end
```

---

## 6. REST API Reference

All endpoints enforce tenant-level isolation via the `authenticateTenant` middleware:

### Profile & Configuration
- `GET /api/boiler/catalog/benchmarks`: Returns empirical research scope, 7 physical subsystems, 22 measurement points, and 6 walkthrough checkpoints.
- `POST /api/boiler/:assetId/profile`: Creates or updates specialized boiler profile. Validates capacity strictly within 1,000–1,800 kg/h.
- `GET /api/boiler/:assetId/profile`: Returns specifications, subsystems, measurement points, and active work order/fault counts.

### 2-Hourly Shift Logs & Operational Workflow
- `POST /api/boiler/:assetId/shift-logs`: Records 2-hourly shift data (readings, walkthrough results, operator notes). Validates physical instrument limits and checks empirical triggers.
- `GET /api/boiler/:assetId/shift-logs?date=YYYY-MM-DD`: Returns all shift logs recorded on the given date, grouped chronologically.

### Inspections & Walkthroughs
- `POST /api/boiler/:assetId/walkthrough`: Submits physical visual/acoustic walkthrough inspection. Evaluates condition as `pass`, `conditional`, or `fail`.

### Observations & Faults
- `POST /api/boiler/:assetId/observations`: Records qualitative operational notes and anomalies.
- `GET /api/boiler/:assetId/observations`: Lists shift observations chronologically.
- `POST /api/boiler/:assetId/faults`: Reports breakdown/defect. Automatically dispatches corrective work orders for high/critical severity faults.

### Lifecycle Maintenance History & Evidence
- `GET /api/boiler/:assetId/history`: Aggregates boiler specifications, work order history, fault logs, inspection records, cumulative burner/feed pump hours, and operational averages.
- `POST /api/boiler/:assetId/attachments`: Links uploaded photographic evidence (sight glass, flame port, chimney plume) to the boiler or log.
- `GET /api/boiler/:assetId/attachments`: Lists associated attachments.

---

## 7. Verification & Test Suite Summary

The module is verified with **20 dedicated unit and integration tests** in `tests/boiler-maintenance-module.test.ts`. Across the entire LuminaFM platform, all **9 test suites** and **260 tests** pass with 100% success rate:

```text
✓ tests/boiler-maintenance-module.test.ts (20 tests)
  ✓ 1. Dissertation Research Scope & Capacity Boundaries (5 tests)
  ✓ 2. The 7 Physical Subsystems & Empirical Component Hierarchy (2 tests)
  ✓ 3. 2-Hourly Shift Logging & Physical Instrument Range Validation (4 tests)
  ✓ 4. Shift Walkthrough Visual & Acoustic Inspection Checkpoints (3 tests)
  ✓ 5. Qualitative Operational Observations (1 test)
  ✓ 6. Direct Fault Reporting & Work Order Dispatch (2 tests)
  ✓ 7. Historical Maintenance Records & Lifecycle Summary (1 test)
  ✓ 8. Supporting Photographs & Evidence Attachments (1 test)
  ✓ 9. Multi-Tenant Isolation Enforcement (1 test)

Test Suites: 9 passed, 9 total
Tests:       260 passed, 260 total
Snapshots:   0 total
Time:        9.53s
TypeScript:  0 errors (npx tsc --noEmit)
```
