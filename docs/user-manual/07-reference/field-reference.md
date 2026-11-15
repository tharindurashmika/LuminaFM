# Master Field Reference Directory

This directory provides an exhaustive reference of all input fields, parameters, and form controls across LuminaFM.

## Master Field Table

| Field Name | Module / Form | Purpose | Required | Format | Validation Rules | Example Value |
|---|---|---|---|---|---|---|
| `email` | Login | User authentication account identifier | Yes | Email | Valid RFC 5322 email string | `chief.engineer@colombohotel.lk` |
| `password` | Login | Secret user credential | Yes | Password | Minimum 8 characters | `LuminaAdmin@2026` |
| `organizationCode` | Login | Tenant routing slug | No | String | Uppercase alphanumeric with hyphens | `COLOMBO-GRAND` |
| `assetCode` | Asset Master | Unique equipment identifier | Yes | String | Unique within tenant | `BLR-001` |
| `assetName` | Asset Master | Human-readable asset title | Yes | String | 3–100 characters | `Main High-Pressure Steam Boiler` |
| `categoryCode` | Asset Master | Equipment classification | Yes | Enum | Valid category code (`boilers`, `chillers`, etc.) | `boilers` |
| `siteId` | Asset Master | Facility location complex UUID | Yes | UUID | Must reference valid `Site` | `loc-site-1` |
| `status` | Asset Master | Operating availability state | Yes | Enum | `in_service`, `under_maintenance`, `standby`, `out_of_service`, `decommissioned` | `in_service` |
| `criticality` | Asset Master | Operational risk impact level | Yes | Enum | `low`, `medium`, `high`, `critical` | `critical` |
| `serialNumber` | Asset Master | Manufacturer nameplate serial | No | String | Alphanumeric | `CB-2024-98412` |
| `modelNumber` | Asset Master | Manufacturer model number | No | String | Alphanumeric | `CB-PACK-1100` |
| `operatingHours` | Asset Master | Lifetime operating runtime meter | Yes | Number | Non-decreasing positive float | `11420.5` |
| `specifications.designPressure` | Asset Master | Design working pressure rating | Yes (Boilers) | Number | $0.0 - 25.0\text{ bar}$ | `10.5` |
| `specifications.steamCapacity` | Asset Master | Rated steam generation output | Yes (Boilers) | Number | $100 - 5,000\text{ kg/h}$ | `1100` |
| `specifications.coolingCapacity` | Asset Master | Rated refrigeration capacity | Yes (Chillers) | Number | $50 - 3,000\text{ TR}$ | `500` |
| `title` | Work Orders | Ticket summary title | Yes | String | 5–120 characters | `Emergency Feedwater Pump Mechanical Seal Replacement` |
| `assetId` | Work Orders | Target equipment UUID | Yes | UUID | Must reference valid asset | `a2000000-0000-0000-0000-000000000002` |
| `priority` | Work Orders | Maintenance execution urgency | Yes | Enum | `low`, `medium`, `high`, `critical` | `high` |
| `estimatedHours` | Work Orders | Standard labor time benchmark | Yes | Number | $> 0.25$ hours | `3.5` |
| `description` | Work Orders | Scope of work & safety notes | Yes | Text | Minimum 10 characters | `Isolate suction and discharge valves. Lockout motor MCC breaker.` |
| `transitionReason` | Work Orders | Mandatory status change justification | Yes | Text | Minimum 5 characters | `Parts arrived from store; technician dispatched.` |
| `hoursWorked` | Work Orders | Actual technician labor hours | Yes | Number | $> 0.1$ hours | `4.0` |
| `hourlyRate` | Work Orders | Billing labor rate | Yes | Currency | $\ge 0$ | `45.00` |
| `partNumber` | Work Orders | Inventory spare part SKU | Yes | String | Must match active inventory part | `GSK-SPIRAL-4IN-300#` |
| `quantity` | Work Orders | Number of spare parts consumed | Yes | Integer | $\ge 1$ | `2` |
| `unitCost` | Work Orders | Spare part replacement cost | Yes | Currency | $> 0$ | `18.50` |
| `planTitle` | Maintenance Planning | Title of preventive routine | Yes | String | 5–100 characters | `Quarterly Burner Overhaul & Combustion Tune` |
| `frequencyDays` | Maintenance Planning | Recurrence interval in days | Yes | Integer | $> 0$ days | `90` |
| `nextDueDate` | Maintenance Planning | Next execution deadline | Yes | Date | ISO `YYYY-MM-DD` | `2026-11-18` |
| `shiftCode` | Boiler Logbook | Active watchkeeping shift | Yes | Enum | `SHIFT_A`, `SHIFT_B`, `SHIFT_C` | `SHIFT_A` |
| `operatingPeriod` | Boiler Logbook | 2-hourly logging interval | Yes | String | `06:00`, `08:00`, `10:00`, `12:00`, etc. | `08:00` |
| `STEAM_PRESSURE` | Boiler Logbook | Operating steam header pressure | Yes | Number | $0.0 - 15.0\text{ bar}$ (Nominal: $6.0 - 10.0$) | `8.5` |
| `FLUE_GAS_TEMP` | Boiler Logbook | Stack gas exit temperature | Yes | Number | $50.0 - 350.0^\circ\text{C}$ (Nominal: $140.0 - 190.0$) | `175.0` |
| `BOILER_WATER_TDS` | Boiler Logbook | Total dissolved solids in boiler water | Yes | Integer | $100 - 10,000\text{ ppm}$ (Nominal: $1500 - 2500$) | `2400` |
| `AMBIENT_TEMP` | Boiler Logbook | Boiler room combustion air temp | Yes | Number | $10.0 - 60.0^\circ\text{C}$ (Nominal: $20.0 - 38.0$) | `29.5` |
| `WATER_LEVEL_OK` | Boiler Logbook | Sight glass water level confirmation | Yes | Boolean | Must be confirmed `true` | `true` |
| `operatorNotes` | Boiler Logbook | Shift handover observations | No | Text | Optional notes | `Burner firing stable; sight glass blown down.` |
| `autoDraftWorkOrder` | Boiler Logbook | Automatically stage draft WO on alert | Yes | Boolean | Default: `true` | `true` |
| `mitigationNotes` | Decision & Reporting | Alert acknowledgement comments | Yes | Text | Minimum 10 characters | `Increased forced draft fan damper opening by 5%.` |
| `channelName` | Decision & Reporting | Alert notification sink name | Yes | String | 3–50 characters | `Central Control Room Slack Webhook` |
| `channelType` | Decision & Reporting | Notification protocol | Yes | Enum | `EMAIL`, `SMS_WEBHOOK`, `SLACK`, `PAGERDUTY` | `SLACK` |
| `targetEndpoint` | Decision & Reporting | Webhook URL or destination address | Yes | URI / Email | Valid URI or email | `https://hooks.slack.com/services/T00/B00/X00` |
| `minSeverity` | Decision & Reporting | Minimum dispatch trigger level | Yes | Enum | `ALL`, `WARNING_AND_CRITICAL`, `CRITICAL_ONLY` | `CRITICAL_ONLY` |
| `title` | Evidence Vault | Uploaded document title | Yes | String | 3–100 characters | `Safety Pop Valve Annual Recertification Certificate` |
| `category` | Evidence Vault | Document category | Yes | Enum | `INSPECTION_PHOTO`, `REPORT`, `STANDARDS_CLAUSE`, `TEST_REPORT` | `TEST_REPORT` |
| `classification` | Evidence Vault | Information security level | Yes | Enum | `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED` | `RESTRICTED` |
| `packageTitle` | Evidence Vault | Compliance dossier name | Yes | String | 5–120 characters | `2026 Annual Statutory Boiler Inspection Dossier` |
| `frameworkCode` | Evidence Vault | Governing regulatory standard | Yes | Enum | `ASME_SEC_I`, `NBIC_NB23`, `ISO_55001`, `OSHA_1910` | `ASME_SEC_I` |
| `dateFrom` | Evidence Vault | Beginning of audit review period | Yes | Date | ISO `YYYY-MM-DD` | `2026-01-01` |
| `dateTo` | Evidence Vault | End of audit review period | Yes | Date | ISO `YYYY-MM-DD` | `2026-11-15` |
| `modelCode` | Governance | Decision model identifier | Yes | String | Uppercase alphanumeric with hyphens | `ANP-COLOMBO-CLIENT-v1.1.0` |
| `modelName` | Governance | Descriptive name of model configuration | Yes | String | 5–100 characters | `Colombo Grand Industrial Boiler Optimized ANP Model` |
| `baseModelId` | Governance | Base template model UUID | Yes | UUID | Must reference valid model | `baseline-model-uuid` |
| `organizationName` | Settings | Tenant business entity name | Yes | String | 3–100 characters | `Colombo Grand Hospitality Group` |
| `timezone` | Settings | Operational facility timezone | Yes | Timezone | Valid IANA timezone | `Asia/Colombo` |
| `baseCurrency` | Settings | Accounting base currency | Yes | Currency | 3-letter ISO 4217 code | `LKR` |
| `showPlatformBadge` | Settings | Show 'Powered by LuminaFM' badge | Yes | Boolean | Default: `true` | `true` |
| `actionTaken` | Alert Acknowledgement Modal | Operational mitigation disposition | Yes | Enum | `dispatched_work_order`, `recalibrated`, `verified_nominal`, `monitoring` | `dispatched_work_order` |
| `minAnpPriorityScore` | Notification Channel Modal | Minimum ANP score to dispatch | Yes | Float | Range: `0.00` to `1.00` | `0.65` |
| `cooldownMinutes` | Notification Channel Modal | Alert re-dispatch throttling | Yes | Integer | Range: `0` to `1440` minutes | `30` |
| `includeAuditHash` | Notification Channel Modal | Append SHA-256 digest to webhook | Optional | Boolean | Default: `true` | `true` |
| `inspectorCertificationNumber` | Compliance Verification Modal | Statutory license / commission | Optional | String | e.g. `NB-COMM-984421` | `NB-COMM-984421` |
| `findingsNotes` | Compliance Verification Modal | Auditor technical commentary | Yes | Text | Minimum 5 characters | `Shell thickness conforms to ASME Section I PG-60.1 tolerances.` |
| `includeAuditLogs` | Evidence Package Modal | Include before/after change ledger | Optional | Boolean | Default: `true` | `true` |
| `includeAttachments` | Evidence Package Modal | Bundle cryptographic binary files | Optional | Boolean | Default: `true` | `true` |
| `evalExpertId` | Expert Evaluation Modal | Identifier of reviewing specialist | Yes | Enum | `EXP_01` through `EXP_05` | `EXP_01` |
| `evalRetentionVote` | Expert Evaluation Modal | Retention in ANP supermatrix | Yes | Boolean | `true` (Keep) / `false` (Discard) | `true` |
| `evalRelevanceRating` | Expert Evaluation Modal | Criterion importance score | Yes | Integer | Range: `1` to `5` | `5` |
| `evalThreshold` | Expert Evaluation Modal | Proposed excursion trigger | Optional | String | Valid engineering threshold | `> 12.0 bar` |
| `evidenceType` | Attach Evidence Modal | Operational evidence classification | Yes | Enum | `operational_log_sheet`, `standards_clause`, `inspection_photograph`, `test_report` | `operational_log_sheet` |
| `evidenceStorageUri` | Attach Evidence Modal | Permanent object storage link | Yes | URI | Valid storage URI or hash | `uploads/vault/blr001-scale-analysis.pdf` |
| `approvalAction` | Governance Approval Modal | Formal model signoff decision | Yes | Enum | `approved`, `rejected` | `approved` |
| `approvalValidationStatus` | Governance Approval Modal | Resulting compliance tier | Yes | Enum | `commercial_validated`, `provisional`, `rejected` | `commercial_validated` |
