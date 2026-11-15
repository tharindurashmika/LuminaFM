# Troubleshooting Guide: Offline Sync & Network Interruption

This guide addresses problems encountered when operating LuminaFM on mobile tablets in disconnected factory environments, managing local IndexedDB queues, resolving synchronization conflicts, and troubleshooting tablet hardware peripherals.

```carousel
![Sync Queue Drawer](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/KIOSK-005-floor-sync-queue-drawer-annotated.png)
<!-- slide -->
![QR Scanner Viewport](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/KIOSK-004-floor-qr-scanner-modal-annotated.png)
```

---

## Issue 3.1: Shift Readings Queued Offline and Not Transmitting

**Problem:** An operator completes a shift logbook submission on the floor tablet (`/operator`), but the **Sync Status Pill** in the header remains amber: `OFFLINE (1 Queued)`. The record does not appear on the central desktop dashboard.

**Possible Cause:**
1. The tablet is in an underground boiler room or concrete bunker with zero Wi-Fi or cellular signal.
2. The facility Wi-Fi requires re-authentication via an expired captive portal login.
3. The tablet's airplane mode is enabled.

**How to Resolve:**
1. **Normal Operational Behavior**: Do not panic. LuminaFM is designed for offline operation. The submission is safely stored in local browser IndexedDB (`lumina_offline_store`) with an immutable client UUID.
2. Carry the tablet back into range of the control room Wi-Fi network.
3. Check tablet settings to confirm Wi-Fi is connected and internet is accessible (open a browser tab to verify).
4. Tap the **Sync Status Pill** to open the `SyncQueueDrawer` (`KIOSK-005`).
5. Tap **Force Sync Now**.
6. The icon shifts to a spinning gold icon: `SYNCING...`, followed by an emerald checkmark: `ONLINE (All Synced)`.

**Prevention:** Ensure facility Wi-Fi access points in boiler pump rooms are operational.

**Escalation:** If the tablet has internet access but sync fails repeatedly, contact the IT network team to verify whether firewall port `443` or `/api/v1/offline-sync` is blocked.

---

## Issue 3.2: HTTP 409 Conflict Detected During Background Sync

**Problem:** When network connectivity is restored, the Sync Status Pill turns red with a shield icon: `1 CONFLICT`. The `SyncQueueDrawer` displays:
> *"Conflict Detected: Submission sub-uuid-2026-9812 conflicts with authoritative server shift log."*

**Possible Cause:**
1. Another operator logged readings for the same boiler asset during the same 2-hourly watchkeeping interval from a desktop workstation while the tablet was offline.
2. In adherence to enterprise safety rules, LuminaFM **never silently overwrites** operational records.

**How to Resolve:**
1. Tap the **Sync Status Pill** to open the `SyncQueueDrawer` (`KIOSK-005`).
2. On the conflicting item, tap the red button: **Resolve Conflict**.
3. A side-by-side comparison modal appears:
   - **Server Record**: Values entered by the other operator.
   - **Local Tablet Record**: Values recorded on your tablet.
4. Review the readings:
   - *If your tablet readings are an intended correction*: Select **Amend as Traceable Revision**. Enter an explanation (e.g. `"Recalibrated gauge reading recorded on site"`). Click Confirm.
   - *If the server record is already complete and accurate*: Select **Discard Local Duplicate**. Click Confirm.
5. The conflict clears from the queue and the pill returns to `ONLINE (Synced)`.

**Prevention:** Coordinate shift logging responsibilities so only the designated watchkeeper logs readings for an active period.

**Escalation:** Contact the `Plant Reliability Engineer` if there is a dispute regarding conflicting telemetry values.

---

## Issue 3.3: Offline Queue Items Stuck in "Retry" Exhaustion

**Problem:** An item in the `SyncQueueDrawer` displays status `FAILED` with retry count `5 / 5`. Automatic sync is paused.

**Possible Cause:**
1. Network dropouts occurred during 5 consecutive retry attempts.
2. The payload contains an unrecoverable validation error (e.g. referencing a deleted equipment asset).

**How to Resolve:**
1. Open the `SyncQueueDrawer` (`KIOSK-005`).
2. Locate the failed item and inspect the error message.
3. Tap the **Retry Item** button to trigger a fresh transmission attempt.
4. If network is stable, the retry will succeed and clear the failure state.

**Prevention:** Keep the tablet powered on and within Wi-Fi range when completing end-of-shift synchronization.

**Escalation:** If a specific submission fails repeatedly despite stable internet, have the `Organization Admin` inspect the server logs for payload deserialization errors.

---

## Issue 3.4: Camera Viewfinder Black in QR Barcode Scanner

**Problem:** In the floor kiosk (`/operator`), clicking **Scan QR Barcode** opens the `QrScannerModal` (`KIOSK-004`), but the camera viewport displays a black screen or prompts:
> *"Camera access blocked: permission denied."*

**Possible Cause:**
1. The browser's camera permission was denied by the operator or disabled in tablet settings.
2. Another application is holding an exclusive lock on the camera device.
3. The tablet hardware lacks a functioning rear-facing camera.

**How to Resolve:**
1. Check the browser address bar: tap the lock or camera icon next to the URL.
2. Set **Camera Permission** to `Allow`.
3. Tap the **Manual Asset Code Fallback Input** box on `KIOSK-004`:
   - Type the asset code directly (e.g. `BLR-001`, `P-001`).
   - Click **Submit Code**.
4. The scanner recognizes the code and loads the equipment context without requiring the optical camera.

**Prevention:** Grant permanent camera permissions to the LuminaFM domain in tablet browser settings.

**Escalation:** If tablet hardware camera is permanently defective, submit a hardware replacement request to IT.

---

## Issue 3.5: IndexedDB Storage Quota Exceeded on Tablet

**Problem:** Tapping **Commit Shift Logbook Submission** while offline displays:
> *"Browser storage quota exceeded: unable to cache offline shift payload."*

**Possible Cause:**
1. Months of historical synced logs and high-resolution photo attachments have filled the tablet's browser storage partition.

**How to Resolve:**
1. Tap the **Sync Status Pill** to open the `SyncQueueDrawer`.
2. Tap the button: **Clean Synced Items**.
3. LuminaFM purges all locally cached records that have already been confirmed committed to the central PostgreSQL database.
4. Local storage is freed immediately; new offline entries can be recorded.

**Prevention:** Tap "Clean Synced Items" at the end of each working week.

**Escalation:** If tablet storage remains critically low, inspect the tablet OS storage settings to remove downloaded media files from other apps.
