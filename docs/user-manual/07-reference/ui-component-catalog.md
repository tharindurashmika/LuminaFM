# UI Component Catalog & Design System Reference

This catalog documents the reusable UI components implemented across LuminaFM. Built with **React 18**, **TypeScript**, and **Tailwind CSS**, these components enforce accessible contrast, midnight navy aesthetics, restrained gold accents, and minimum $44 \times 44\text{px}$ touch targets.

---

## 1. Core Design System Components (`frontend/src/components/ui/`)

### A. Button (`Button.tsx`)
Standard enterprise button with loading spinners and icon support.
- **Variants**:
  - `primary`: Solid indigo background (`bg-indigo-600 hover:bg-indigo-500 text-white`).
  - `secondary`: Midnight surface with subtle border (`bg-midnight-900 border-slate-700 text-slate-200`).
  - `gold`: Premium gold accent (`bg-gold-500 hover:bg-gold-400 text-midnight-950 font-semibold`).
  - `danger`: High-urgency red (`bg-red-600 hover:bg-red-500 text-white`).
  - `ghost`: Transparent with hover highlight (`hover:bg-midnight-900 text-slate-300`).
- **Touch Target**: Minimum height $44\text{px}$ on medium/large sizes.

### B. Card (`Card.tsx`)
Midnight navy surface container with indigo border highlights.
- **Subcomponents**: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Classes**: `bg-midnight-900/80 border border-slate-800/80 rounded-2xl shadow-xl`.

### C. Input (`Input.tsx`)
High-contrast text and numerical input field.
- **Features**: Label, error message rendering, helper text, and optional prefix/suffix icons.
- **Validation State**: Renders a red border and error text when validation fails.
- **Touch Target**: Minimum height $44\text{px}$.

### D. Select (`Select.tsx`)
Accessible dropdown select component.
- **Features**: Label, validation state, placeholder, and option list rendering.
- **Touch Target**: Minimum height $44\text{px}$.

### E. Status Badges (`StatusBadge.tsx`)
Color-coded domain pills for equipment and workflow states.
- **AssetStatusBadge**:
  - `in_service`: Emerald pill (`bg-emerald-950/80 text-emerald-300 border-emerald-500/40`).
  - `under_maintenance`: Amber pill (`bg-amber-950/80 text-amber-300 border-amber-500/40`).
  - `standby`: Indigo pill (`bg-indigo-950 text-indigo-300 border-indigo-500/40`).
  - `out_of_service`: Red pill (`bg-red-950/80 text-red-300 border-red-500/40`).
- **WorkOrderStatusBadge**:
  - `draft`, `open`, `approved`, `assigned`, `in_progress`, `completed`, `closed`.
- **CriticalityBadge**:
  - `low`, `medium`, `high`, `critical`.
- **PriorityBadge**:
  - `low`, `medium`, `high`, `critical`.

### F. Data Classification Badge (`DataClassificationBadge.tsx`)
Displays information security classification tiers:
- `PUBLIC`: Slate pill.
- `INTERNAL`: Indigo pill.
- `CONFIDENTIAL`: Gold pill.
- `RESTRICTED`: Crimson red pill.

### G. State Indicators
- **LoadingState (`LoadingState.tsx`)**: Full-container animated spinner with status title and description.
- **EmptyState (`EmptyState.tsx`)**: Clean empty-state container with icon, explanatory message, and call-to-action button.
- **ErrorState (`ErrorState.tsx`)**: High-visibility error card with retry trigger.
- **SuccessState (`SuccessState.tsx`)**: Dismissible green success notification banner.
- **ForbiddenState (`ForbiddenState.tsx`)**: 403 access barrier banner displaying required roles and permissions.

### H. Modal (`Modal.tsx`)
Accessible modal dialog with dimmed backdrop, escape key listener, and focus trapping.
- **Props**: `isOpen`, `onClose`, `title`, `description`, `size` (`sm`, `md`, `lg`, `xl`, `full`), `footer`.

### I. Tabs (`Tabs.tsx`)
Accessible tab strip navigation with active indicator bar and count badges.

---

## 2. Specialized Industrial Domain Components

### A. Glove Numpad (`GloveNumpad.tsx`)
- **Location**: `components/floor/GloveNumpad.tsx`
- **Purpose**: Pop-up floating keypad for operators wearing protective gloves.
- **Key Dimensions**: $64 \times 64\text{px}$ touch targets.
- **Keys**: Digits $0 - 9$, Decimal Point (`.`), Backspace ($\leftarrow$), Clear (`C`), and quick preset buttons.

### B. Glove Rocker Switch (`GloveRockerSwitch.tsx`)
- **Location**: `components/floor/GloveRockerSwitch.tsx`
- **Purpose**: Bipolar mechanical rocker switch control for physical equipment walkthroughs.
- **States**: `Normal` (Emerald) vs. `Abnormal` (Red/Gold).
- **Target Size**: $56 \times 96\text{px}$.

### C. Industrial QR Scanner Modal (`QrScannerModal.tsx`)
- **Location**: `components/floor/QrScannerModal.tsx`
- **Purpose**: Real-time camera barcode scanner with targeting reticle and manual asset code fallback.

### D. Offline Sync Queue Drawer (`SyncQueueDrawer.tsx`)
- **Location**: `components/floor/SyncQueueDrawer.tsx`
- **Purpose**: Slide-over drawer displaying pending IndexedDB queue items, sync timestamps, and conflict diffs.

### E. Operational ANP Drawer (`OperationalAnpDrawer.tsx`)
- **Location**: `components/decision-support/OperationalAnpDrawer.tsx`
- **Purpose**: Slide-over inspection drawer displaying live ANP supermatrix calculations, criteria influences, and sensitivity sliders.
