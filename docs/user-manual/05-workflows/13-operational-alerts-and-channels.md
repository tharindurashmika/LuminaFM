# Workflow 13: Operational Alert Acknowledgment & Routing

### WF-13: Operational Alert Acknowledgment & Routing

**Purpose:** Acknowledge certified operational excursions (steam pressure spikes, flue gas overheating, water TDS violations) under ASME Section I guidelines, record mandatory mitigation actions and assignee notes in the `AlertAcknowledgementModal`, configure multi-channel external alert dispatch sinks (Email, SMS Webhooks, Slack, PagerDuty), establish cooldown throttling periods, and attach cryptographic audit hashes to notification payloads.

**Required Role:** `Plant Reliability Engineer` or `Organization Admin` (`governance:manage` / `operations:daily_log`).

**Prerequisites:** Operational readings breaching configured warning or critical safety benchmarks.

**Starting Point:** `/reports` $\rightarrow$ **Operational Abnormalities Tab** (`REP-002`).

---

### Procedure

#### Step 1: Open the Operational Abnormalities Tab
- Navigate to **Decision & Reporting** (`/reports`) and click the **Operational Abnormalities** tab (`REP-002`).
- The page renders active excursion cards categorized by severity (`CRITICAL`, `WARNING`, `INFO`).

```carousel
![Operational Abnormalities Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/REP-002-operational-abnormalities-tab.png)
<!-- slide -->
![Operational Abnormalities Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-002-operational-abnormalities-tab-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Abnormalities Tab Header)**: Summary ribbon showing Active Excursions count (`2`), Unacknowledged Alerts (`1`), and MTTA (Mean Time to Acknowledge: `14 mins`).
- **Marker 2 (Excursion Alert Cards)**: Cards rendering Asset Code (`BLR-001`), Excursion Parameter, Measured Value vs Benchmark, and Severity badge (`CRITICAL EXCURSION`).
- **Marker 3 (Acknowledge Alert Trigger)**: Action button opening the statutory acknowledgement dialog.

---

#### Step 2: Open the Alert Acknowledgement Modal
1. Locate the unacknowledged critical excursion:
   - Target Asset: `BLR-001: Main Steam Boiler`
   - Parameter: `Steam Header Operating Pressure`
   - Measured Value: `11.45 bar`
   - Configured Benchmark: `> 10.50 bar`
   - Excursion Magnitude: `+0.95 bar (+9.0% over MAWP)`
2. On the alert card, click the red/gold button: **Acknowledge Alert**.
3. The `AlertAcknowledgementModal` opens (`REP-003`).

```carousel
![Alert Acknowledgement Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/REP-003-alert-acknowledgement-modal.png)
<!-- slide -->
![Alert Acknowledgement Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-003-alert-acknowledgement-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Modal Title & Severity)**: Dialog title `"Acknowledge Operational Abnormality"` with red critical excursion tag.
- **Marker 2 (Measured vs Benchmark Context)**: High-contrast data classification pills comparing measured reading to regulatory benchmark.
- **Marker 3 (Mitigation & Operator Form)**: Mandatory input fields for Operator Name, Action Taken, and Engineering Mitigation Notes.

---

#### Step 3: Complete Statutory Alert Acknowledgement
1. In the **Operator / Engineer Name** field, enter:
   `Eng. Marcus Thorne (Lead Reliability Engineer)`
2. In the **Action Taken** dropdown, select:
   `dispatched_work_order` (or `recalibrated`, `verified_nominal`, `monitoring`).
3. In the **Acknowledgement & Mitigation Notes** textarea, enter:
   `"Inspected boiler room pressure transmitter PT-101. Confirmed burner modulating motor linkage slipped on high fire. Throttled fuel valve manually and dispatched emergency Work Order WO-2026-0048 for linkage overhaul."`
4. Click **Confirm Acknowledgment**.
5. The modal dismisses. The excursion card updates from `Unacknowledged` (Red) to `Acknowledged` (Emerald), with the engineer's name and mitigation timestamp permanently displayed.

---

#### Step 4: Configure External Alert Notification Channels
1. In the top tab bar, click the **Alert Channels & Export** tab (`REP-005`).
2. The view displays active notification dispatch sinks (Email, Webhook, Slack, PagerDuty).

```carousel
![Notification Channels Tab Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/REP-005-notification-channels-tab.png)
<!-- slide -->
![Notification Channels Tab Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-005-notification-channels-tab-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Channels Tab Header)**: Registry of external notification sinks and export tools.
- **Marker 2 (Active Channels Grid)**: Cards displaying channel type, friendly name, destination URI, and active status.
- **Marker 3 (Add Channel Action Trigger)**: Button opening the channel configuration modal.

3. On the **Central Control Room Slack Webhook** card, click **Configure** (or click `+ Add Channel`).
4. The `NotificationChannelConfigModal` opens (`REP-006`).

```carousel
![Notification Channel Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/REP-006-notification-config-modal.png)
<!-- slide -->
![Notification Channel Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/REP-006-notification-config-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Modal Header & Protocol)**: Indicator for channel protocol (`SLACK`, `EMAIL`, etc.).
- **Marker 2 (Name & Destination URI)**: Fields for channel friendly label and webhook HTTPS URL.
- **Marker 3 (Severity & Cooldown Sliders)**: Filtering controls for minimum severity, ANP priority score threshold, and cooldown minutes.

---

#### Step 5: Test & Save Notification Channel Configuration
1. In the **Destination Endpoint URI** input, enter:
   `https://hooks.slack.com/services/T00/B00/X00`
2. Set **Minimum Alert Level**: Select `CRITICAL_ONLY` (to avoid notification spam).
3. Set **Min ANP Priority Score**: Enter `0.70`.
4. Set **Cooldown Period**: Enter `30 Minutes` (throttles repetitive alerts).
5. Check **Include Cryptographic Audit Hash** (Appends SHA-256 signature to webhook payload).
6. Click **Test Dispatch Ping**.
   - An inline emerald confirmation confirms: `"Test ping dispatched successfully (HTTP 200 OK)"`.
7. Click **Save Channel Configuration**.

---

**Expected Result:** The critical excursion is acknowledged with certified engineering mitigation notes; external notification sinks are verified; and high-priority alarms route to designated staff.

**Common Problems & Practical Solutions:**
- *Problem*: Test ping fails with `"Webhook returned 404 Not Found"`.
  *Solution*: Verify the destination HTTPS URL. Slack webhooks must conform to standard workspace incoming webhook URLs.
- *Problem*: Mitigation notes error: `"Field cannot be blank"`.
  *Solution*: Regulatory compliance forbids blank alert acknowledgements. Enter descriptive notes explaining what physical action was taken.

**Related Workflows:**
- [WF-06: Work Order Execution & Lifecycle](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md)
- [WF-09: Desktop 2-Hourly Daily Boiler Logbook Entry](file:///e:/My%20Owns/docs/user-manual/05-workflows/09-daily-boiler-logbook.md)
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
