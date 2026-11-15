# Workflow 10: Industrial Tablet Factory-Floor Kiosk Experience

### WF-10: Industrial Tablet Factory-Floor Kiosk Experience

**Purpose:** Operate LuminaFM on mobile tablet hardware in hot, dimly-lit boiler rooms and utility plants; utilize $44\text{px}+$ oversized tactile touch targets; scan physical equipment QR nameplates; input numerical readings using the $64\text{px}$ glove numpad overlay; and operate physical safety rocker switches while wearing protective gloves.

**Required Role:** `Boiler Plant Operator` (`operations:daily_log`), `Maintenance Technician`, or `Plant Reliability Engineer`.

**Prerequisites:** Touch-enabled tablet device (iPad, Galaxy Tab, industrial ruggedized Android tablet) running Chrome or modern browser.

**Starting Point:** Top navigation bar **Floor Tablet Mode** trigger or direct URL `/operator`.

---

### Procedure

#### Step 1: Launch Floor Operator Kiosk Mode
- On your tablet, tap the **Floor Kiosk** button in the top navigation bar (or navigate to `/operator`).
- The interface shifts into an industrial, high-contrast dark theme optimized for factory lighting.
- The layout adapts dynamically:
  - **Tablet Portrait View** (`KIOSK-001`): Single-column stacked telemetry cards with $44\text{px}+$ buttons.
  - **Tablet Landscape View** (`KIOSK-002`): Dual-column split view with telemetry entry on the left and equipment HUD on the right.

```carousel
![Floor Kiosk Portrait Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/KIOSK-001-floor-operator-portrait.png)
<!-- slide -->
![Floor Kiosk Portrait Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/KIOSK-001-floor-operator-portrait-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Industrial Kiosk Header)**: High-visibility asset selector, sync engine status pill, and Fullscreen toggle.
- **Marker 2 (QR Scan & Telemetry Grid)**: Large touch targets for scanning equipment QR codes and viewing live gauges.
- **Marker 3 (Glove Touch Controls)**: Tactile rocker switches and quick save draft action triggers.

---

#### Step 2: Scan Physical Equipment QR Nameplate
1. In the kiosk header, tap the large button: **Scan QR Barcode** (`KIOSK-004`).
2. The `QrScannerModal` opens with a live camera viewfinder.

```carousel
![QR Scanner Modal Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/KIOSK-004-floor-qr-scanner-modal.png)
<!-- slide -->
![QR Scanner Modal Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/KIOSK-004-floor-qr-scanner-modal-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Camera Viewport)**: Aiming reticle with animated laser scanline.
- **Marker 2 (Manual Code Fallback)**: Text field allowing direct entry if QR tag is soot-covered.
- **Marker 3 (Flashlight & Controls)**: Flashlight LED toggle and cancel button.

3. *If lighting is low*: Tap the **Flashlight** button to activate the camera LED.
4. Aim the camera at the boiler metal nameplate (or tap the test tag `BLR-001`).
5. The scanner beeps, confirms recognition, and auto-populates the active equipment context to `BLR-001`.

---

#### Step 3: Enter Numerical Readings via the Glove Numpad Overlay
1. On the kiosk screen, tap the numerical display box for **Steam Header Pressure**.
2. Instead of the small system keyboard, the oversized **Glove Numpad** slides up from the bottom (`KIOSK-003`).

```carousel
![Glove Numpad Clean](file:///e:/My%20Owns/docs/user-manual/screenshots/original/KIOSK-003-floor-glove-numpad.png)
<!-- slide -->
![Glove Numpad Annotated](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/KIOSK-003-floor-glove-numpad-annotated.png)
```

**Numbered Callout Descriptions:**
- **Marker 1 (Active Telemetry Readout)**: Large monospace display reflecting entered float value and unit (`bar`).
- **Marker 2 (Tactile Keypad Matrix)**: 64px+ oversized touch keys ($0–9$, decimal `.`, backspace, clear `C`, step $\pm 0.5$).
- **Marker 3 (Preset Value Shortcuts)**: Pre-calibrated quick-tap setpoints (`0.0`, `5.0`, `10.0`, `10.5` bar).

3. Enter the reading:
   - Tap preset `10.0`, then tap the `+0.5 Step` button to reach `10.5`.
   - Or tap digits `1`, `0`, `.`, `2` to enter `10.20 bar`.
4. Observe that the display confirms value is within nominal bounds.
5. Tap the green **Confirm (OK)** button.
6. Repeat for **Flue Gas Exit Temperature** (`178.0°C`) and **Boiler Water TDS** (`2,250 ppm`).

---

#### Step 4: Operate Industrial Glove Rocker Switches
1. Scroll down to the **Physical Safety Checkpoints** card.
2. Observe the tactile **Glove Rocker Switches** (`GloveRockerSwitch`):
   - High-contrast 3D rocker styling ($48\text{px}$ touch surface).
   - Amber/Emerald glowing indicators.
3. Tap the rocker for **Sight Glass Blowdown Complete**:
   - The switch clicks into the `ON` position with visual tactile feedback.
4. Tap the rocker for **Feed Pump Lubrication Checked**:
   - The switch clicks into the `ON` position.

---

#### Step 5: Commit Shift Submission or Save Local Draft
1. If the shift reading is complete:
   - Tap the primary green button: **Commit Shift Logbook Submission**.
   - The telemetry is instantly saved to local storage and queued for synchronization.
2. *If the shift is ongoing*:
   - Tap **Quick Save Draft** to preserve in-progress values in local browser IndexedDB without submitting.

---

**Expected Result:** The operator completes full watchkeeping logging using oversized touch targets without having to remove heavy leather or thermal safety gloves.

**Common Problems & Practical Solutions:**
- *Problem*: Camera viewfinder shows black screen in QR Scanner.
  *Solution*: Ensure the browser has permission to access the tablet camera. If camera hardware is damaged, use the **Manual Asset Code Fallback Input** to type `BLR-001`.
- *Problem*: Numpad buttons not responding to touch.
  *Solution*: Ensure you are tapping firmly on the active key. All keys enforce $64\times 64\text{ px}$ boundaries for gloved accuracy.

**Related Workflows:**
- [WF-09: Desktop 2-Hourly Daily Boiler Logbook Entry](file:///e:/My%20Owns/docs/user-manual/05-workflows/09-daily-boiler-logbook.md)
- [WF-11: Offline PWA Queueing & Conflict Resolution](file:///e:/My%20Owns/docs/user-manual/05-workflows/11-offline-sync-and-conflict-resolution.md)
- [WF-12: Operational ANP Telemetry Evaluation](file:///e:/My%20Owns/docs/user-manual/05-workflows/12-operational-anp-decision-review.md)
