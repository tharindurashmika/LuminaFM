# Workflow 11: Offline PWA Queueing & Conflict Resolution

### WF-11: Offline PWA Queueing & Conflict Resolution

**Purpose:** Ensure uninterrupted shift watchkeeping in shielded underground boiler basements and concrete pump vaults where Wi-Fi or cellular connectivity drops; store submissions safely in local client IndexedDB queues; monitor real-time sync indicators; execute automatic idempotent background synchronization upon network recovery; and resolve submission conflicts using non-destructive traceable revision workflows.

**Required Role:** `Boiler Plant Operator`, `Maintenance Technician`, or `Plant Reliability Engineer`.

**Prerequisites:** Floor kiosk open in a modern PWA-capable browser (Chrome, Edge, Safari) with IndexedDB enabled.

**Starting Point:** `/operator` (Floor Operator Kiosk Mode).

---

### Procedure

#### Step 1: Simulate or Enter Disconnected Offline State
- Carry the tablet into an underground utility basement, or simulate network loss by toggling browser DevTools to `Offline` (or enabling Airplane Mode on tablet).
- Observe the **Sync Status Pill** in the top-right header updating immediately:
  - From: `ONLINE (Synced)` (Emerald)
  - To: `OFFLINE (Local Queue)` (Amber WiFi-Off icon)

```carousel
![Sync Queue Drawer Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/KIOSK-005-floor-sync-queue-drawer.png)
<!-- slide -->
![Sync Queue Drawer Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/KIOSK-005-floor-sync-queue-drawer-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Drawer Header & Network State)**: Slide-over drawer header displaying connection status and pending count.
- **Marker 2 (IndexedDB Submission Queue)**: Scrollable list of pending submissions showing submission UUID, timestamp, event type, and retry count.
- **Marker 3 (Queue Actions & Conflict Tools)**: Buttons to trigger `Force Sync Now`, clean synced cache, or launch conflict resolution diffs.

---

#### Step 2: Complete Shift Logbook Submission While Offline
1. On the kiosk screen, input shift readings (Steam Pressure: `9.2 bar`, Flue Temp: `180°C`, TDS: `2,100 ppm`).
2. Toggle the Sight Glass Level switch to `ON`.
3. Tap **Commit Shift Logbook Submission**.
4. The system detects offline mode:
   - Generates an immutable client submission UUID (`sub-uuid-2026-9812`).
   - Writes the full payload to the local browser IndexedDB store (`lumina_offline_store`).
   - An amber notification appears: `"Record saved offline in local queue. Will sync automatically upon reconnection."`
5. The Sync Status Pill updates: `OFFLINE (1 Pending)`.

---

#### Step 3: Open the Offline Sync Queue Drawer
1. Tap the **Sync Status Pill** in the header.
2. The `SyncQueueDrawer` slides out (`KIOSK-005`).
3. Inspect the queued record:
   - Event Type: `BOILER_LOGBOOK_CREATE`
   - Client Submission ID: `sub-uuid-2026-9812`
   - Target Asset: `BLR-001`
   - Status: `queued` (Blue Clock)
   - Retries: `0 / 5`
   - Timestamp: Recorded at exact offline entry time.

---

#### Step 4: Reconnect Network & Observe Automatic Sync
1. Return to the control room or disable Airplane Mode (reconnecting to facility Wi-Fi).
2. The browser ServiceWorker immediately detects the `online` event.
3. The Sync Status Pill shifts to a spinning gold icon: `SYNCING...`
4. The offline sync engine dispatches the payload via `POST /api/v1/offline-sync/submit` with idempotent headers.
5. The central PostgreSQL database receives and commits the record.
6. The queue status updates to `synced` (Emerald Checkmark).
7. The pill updates to: `ONLINE (All Synced)`.

---

#### Step 5: Resolve Operational Conflicts (If Detected)
If another operator entered conflicting shift telemetry while the tablet was disconnected:
1. The server returns HTTP 409 Conflict.
2. LuminaFM **never silently overwrites** conflicting records.
3. In the `SyncQueueDrawer`, the item is flagged with a rose shield: `CONFLICT DETECTED`.
4. Tap **Resolve Conflict**.
5. The conflict resolution dialog compares:
   - **Server Authoritative Record**: Values already committed in database.
   - **Local Tablet Record**: Values stored on your offline tablet.
6. Choose one of two non-destructive resolution actions:
   - **Amend as Traceable Revision**: Appends your reading as an explicit second observation note linked to the original shift entry.
   - **Discard Local Duplicate**: Purges the local submission if you confirm the other operator already recorded the verified readings.
7. Tap **Confirm Resolution**. The queue clears and synchronization completes.

---

**Expected Result:** Zero data loss during network blackouts; telemetry is stored securely on device storage, automatically synchronized upon reconnection, and conflicts are resolved traceably without data destruction.

**Common Problems & Practical Solutions:**
- *Problem*: Queued items remain in `retry` status after reconnecting.
  *Solution*: Open the Sync Queue Drawer and tap **Force Sync Now**. Check whether your facility Wi-Fi requires an authenticated captive portal login.
- *Problem*: Browser prompts `"Storage quota exceeded"`.
  *Solution*: Tap **Clean Synced Items** in the Sync Queue Drawer to purge successfully synchronized records from the local tablet cache.

**Related Workflows:**
- [WF-09: Desktop 2-Hourly Daily Boiler Logbook Entry](file:///e:/My%20Owns/docs/user-manual/05-workflows/09-daily-boiler-logbook.md)
- [WF-10: Industrial Tablet Floor Kiosk Experience](file:///e:/My%20Owns/docs/user-manual/05-workflows/10-floor-kiosk-operations.md)
- [WF-16: Enterprise Compliance Audit](file:///e:/My%20Owns/docs/user-manual/05-workflows/16-compliance-audit-and-evidence-package.md)
