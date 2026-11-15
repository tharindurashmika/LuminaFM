import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  QrCode,
  Gauge,
  Thermometer,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Send,
  Camera,
  Mic,
  Maximize2,
  Minimize2,
  Clock,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Wrench,
  RotateCcw,
  Layers,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { operationsApiService } from '../services/operations.service';
import { operationalAnpApiService } from '../services/operational-anp.service';
import { GloveNumpad } from '../components/floor/GloveNumpad';
import { GloveRockerSwitch } from '../components/floor/GloveRockerSwitch';
import { QrScannerModal } from '../components/floor/QrScannerModal';
import { SyncStatusIndicator, SyncStatusState } from '../components/floor/SyncStatusIndicator';
import { SyncQueueDrawer } from '../components/floor/SyncQueueDrawer';
import { offlineSyncService, generateUUID } from '../services/offline-sync.service';
import { OperationalAnpDrawer } from '../components/decision-support/OperationalAnpDrawer';
import {
  BoilerShift,
  DailyLogSubmissionResult,
  OperationalAnpExecutionResult,
} from '../types/cmms.types';

// Telemetry field specification with industrial benchmarks
interface TelemetryFieldDef {
  key: string;
  name: string;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  presets: number[];
  stepDelta: number;
  helpText: string;
}

const TELEMETRY_FIELDS: TelemetryFieldDef[] = [
  {
    key: 'STEAM_PRESSURE',
    name: 'Main Steam Header Operating Pressure',
    unit: 'bar',
    nominalMin: 6.0,
    nominalMax: 10.0,
    presets: [7.0, 8.0, 8.5, 9.0, 10.0],
    stepDelta: 0.1,
    helpText: 'Design maximum working pressure: 10.5 bar. Safety valve pop setting: 10.8 bar.',
  },
  {
    key: 'FLUE_GAS_TEMP',
    name: 'Flue Gas Stack Exit Temperature',
    unit: '°C',
    nominalMin: 140.0,
    nominalMax: 190.0,
    presets: [160.0, 175.0, 185.0, 195.0, 205.0],
    stepDelta: 1.0,
    helpText: 'Temperatures > 190°C indicate fireside tube soot fouling and thermal efficiency loss.',
  },
  {
    key: 'BOILER_WATER_TDS',
    name: 'Boiler Water Dissolved Solids (TDS)',
    unit: 'ppm',
    nominalMin: 1500,
    nominalMax: 2500,
    presets: [1800, 2100, 2400, 2700, 3000],
    stepDelta: 50,
    helpText: 'Continuous blowdown maintains TDS between 1,500 and 2,500 ppm to avoid steam carryover.',
  },
  {
    key: 'AMBIENT_TEMP',
    name: 'Boiler Plant Room Ambient Temperature',
    unit: '°C',
    nominalMin: 20.0,
    nominalMax: 38.0,
    presets: [28.0, 30.0, 32.0, 35.0],
    stepDelta: 0.5,
    helpText: 'Monitors burner forced-draft fan combustion air intake temperature.',
  },
  {
    key: 'PUMP_OPERATING_HOURS',
    name: 'Feedwater Pump Cumulative Operating Hours',
    unit: 'hrs',
    nominalMin: 0,
    nominalMax: 12000,
    presets: [11200, 11400, 11420, 11500],
    stepDelta: 10,
    helpText: 'Planned mechanical seal and bearing overhaul at 12,000 hours benchmark.',
  },
];

const PRESET_OBSERVATIONS = [
  'Burner modulation smooth & stable on auto',
  'Water level glass blown down — clean meniscus',
  'Fireside soot excursion noted on stack',
  'Feed pump seal packing minor drip (5 dpm)',
  'Bottom blowdown valve operated for 10s',
  'Chemical dosing day tank replenished',
];

const LOCAL_STORAGE_DRAFT_KEY = 'lumina_operator_draft_shift_v1';

export const FloorOperatorPage: React.FC = () => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();

  // Screen / Mode State
  const [isGloveMode, setIsGloveMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>('synced');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [queuePendingCount, setQueuePendingCount] = useState<number>(0);
  const [queueConflictCount, setQueueConflictCount] = useState<number>(0);

  // Subscribe to offline synchronization engine
  useEffect(() => {
    if (organization?.id && user?.id) {
      offlineSyncService.setSessionScope(organization.id, user.id);
    }

    const unsubscribe = offlineSyncService.onStatusChange((engineStatus) => {
      setSyncStatus(
        engineStatus.state === 'conflict'
          ? 'conflict'
          : engineStatus.state === 'syncing'
          ? 'syncing'
          : !engineStatus.isOnline
          ? 'offline'
          : 'synced'
      );
      setQueuePendingCount(engineStatus.pendingCount);
      setQueueConflictCount(engineStatus.conflictCount);
      if (engineStatus.lastSyncAt) {
        setLastSavedTime(engineStatus.lastSyncAt);
      }
    });

    return unsubscribe;
  }, [organization, user]);

  // Active Equipment Target
  const [selectedAsset, setSelectedAsset] = useState<{
    id: string;
    code: string;
    name: string;
    capacity: string;
    location: string;
  }>({
    id: 'a1000000-0000-0000-0000-000000000001',
    code: 'BLR-001',
    name: 'Main High-Pressure Steam Boiler',
    capacity: '1,100 kg/h',
    location: 'Basement Boiler Room B-01',
  });

  // Shift & Operating Period
  const [shiftCode, setShiftCode] = useState<BoilerShift>('SHIFT_A');
  const [operatingPeriod, setOperatingPeriod] = useState<string>('08:00');
  const [operatingMode, setOperatingMode] = useState<string>('AUTO_MODULATING');

  // Telemetry Readings
  const [telemetryValues, setTelemetryValues] = useState<Record<string, string>>({
    STEAM_PRESSURE: '8.5',
    FLUE_GAS_TEMP: '175.0',
    BOILER_WATER_TDS: '2200',
    AMBIENT_TEMP: '30.0',
    PUMP_OPERATING_HOURS: '11420',
  });

  // Active Numpad Target
  const [activeNumpadField, setActiveNumpadField] = useState<TelemetryFieldDef | null>(null);

  // Safety Checklist Rocker States
  const [checklistResponses, setChecklistResponses] = useState<Record<string, string | boolean>>({
    DRUM_WATER_LEVEL: true,
    LWCO_FLOAT_TEST: 'pass',
    FLAME_SCANNER_CHECK: 'pass',
    BLOWDOWN_VALVE_PURGE: 'pass',
    PUMP_SEAL_VIBRATION: 'pass',
  });

  // Observations & Photos
  const [selectedObservations, setSelectedObservations] = useState<string[]>([
    'Burner modulation smooth & stable on auto',
    'Water level glass blown down — clean meniscus',
  ]);
  const [customNote, setCustomNote] = useState<string>('');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);

  // Submission & Results
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<DailyLogSubmissionResult | null>(null);
  const [operationalAnpResult, setOperationalAnpResult] = useState<OperationalAnpExecutionResult | null>(null);
  const [isAnpDrawerOpen, setIsAnpDrawerOpen] = useState<boolean>(false);

  // Auto-Save Draft to Local Storage
  const triggerAutosave = useCallback(() => {
    setSyncStatus('saving');
    const draftPayload = {
      assetId: selectedAsset.id,
      assetCode: selectedAsset.code,
      shiftCode,
      operatingPeriod,
      operatingMode,
      telemetryValues,
      checklistResponses,
      selectedObservations,
      customNote,
      capturedPhotoUri,
      savedAt: new Date().toLocaleTimeString(),
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, JSON.stringify(draftPayload));
      offlineSyncService.saveDraft({
        draftId: `draft_${selectedAsset.id}_${shiftCode}_${operatingPeriod}`,
        assetId: selectedAsset.id,
        assetCode: selectedAsset.code,
        shift: shiftCode,
        logDate: new Date().toISOString().split('T')[0],
        data: draftPayload,
      });
      setTimeout(() => {
        setSyncStatus('synced');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }, 300);
    } catch {
      setSyncStatus('offline');
    }
  }, [
    selectedAsset,
    shiftCode,
    operatingPeriod,
    operatingMode,
    telemetryValues,
    checklistResponses,
    selectedObservations,
    customNote,
    capturedPhotoUri,
  ]);

  // Debounced Auto-Save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAutosave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [triggerAutosave]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // QR Scan Handler
  const handleScanSuccess = (code: string, name: string, id: string) => {
    setSelectedAsset({
      id,
      code,
      name,
      capacity: code.includes('BLR-002') ? '1,400 kg/h' : '1,100 kg/h',
      location: 'Basement Boiler Room B-01',
    });
  };

  // Observation Tag Toggle
  const toggleObservationTag = (tag: string) => {
    setSelectedObservations((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Simulated Voice Note Dictation
  const handleToggleVoiceDictation = () => {
    if (isRecordingAudio) {
      setIsRecordingAudio(false);
      const transcribed = 'Burner modulation responding rapidly to hotel steam load change. Water level verified.';
      setCustomNote((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
    } else {
      setIsRecordingAudio(true);
      setTimeout(() => {
        setIsRecordingAudio(false);
        const transcribed = 'Flue gas stack running clear, sight glass blowdown verified normal.';
        setCustomNote((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
      }, 2500);
    }
  };

  // Simulated Camera Photo Capture
  const handleCapturePhoto = () => {
    setCapturedPhotoUri(
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%230F172A"/><circle cx="150" cy="100" r="50" fill="%23D97706" opacity="0.8"/><text x="150" y="105" font-family="monospace" font-size="12" fill="%23FFFFFF" text-anchor="middle">BOILER SIGHT GLASS PHOTO</text><text x="150" y="130" font-family="monospace" font-size="9" fill="%23D4AF37" text-anchor="middle">WATER MENISCUS OK • 8.5 BAR</text></svg>'
    );
  };

  // Submission Workflow
  const handleSubmitShiftEntry = async () => {
    setIsSubmitting(true);
    setSyncStatus('syncing');

    try {
      const responsesPayload = [
        {
          itemCode: 'AMBIENT_TEMP',
          value: parseFloat(telemetryValues.AMBIENT_TEMP) || 30.0,
        },
        {
          itemCode: 'STEAM_PRESSURE',
          value: parseFloat(telemetryValues.STEAM_PRESSURE) || 8.5,
        },
        {
          itemCode: 'FLUE_GAS_TEMP',
          value: parseFloat(telemetryValues.FLUE_GAS_TEMP) || 175.0,
        },
        {
          itemCode: 'WATER_LEVEL_OK',
          value: checklistResponses.DRUM_WATER_LEVEL === true || checklistResponses.DRUM_WATER_LEVEL === 'pass',
        },
        {
          itemCode: 'PUMP_OPERATING_HOURS',
          value: parseFloat(telemetryValues.PUMP_OPERATING_HOURS) || 11420,
        },
        {
          itemCode: 'BLOWDOWN_VALVE_CHECK',
          value: checklistResponses.BLOWDOWN_VALVE_PURGE === 'pass',
        },
        {
          itemCode: 'FIRING_FUEL_MODE',
          value: operatingMode,
        },
      ];

      const allNotes = [
        ...selectedObservations,
        customNote ? `[Operator Note]: ${customNote}` : '',
      ]
        .filter(Boolean)
        .join('; ');

      const submissionPayload: import('../types/cmms.types').DailyLogSubmissionPayload = {
        assetId: selectedAsset.id,
        checklistTemplateId: 'c1000000-0000-0000-0000-000000000001',
        shiftName: shiftCode,
        notes: allNotes,
        recordedAt: new Date().toISOString(),
        autoDraftWorkOrder: true,
        responses: responsesPayload,
      };

      const submissionId = generateUUID();

      // Enqueue to offline synchronization engine for idempotency and offline queue resilience
      offlineSyncService.enqueueSubmission({
        clientSubmissionId: submissionId,
        entityType: 'daily_logbook',
        tenantId: organization?.id || 'tenant-colombo',
        userId: user?.id || 'user-floor-1',
        assetId: selectedAsset.id,
        assetCode: selectedAsset.code,
        title: `Shift ${shiftCode} Logbook (${selectedAsset.code})`,
        payload: {
          assetId: selectedAsset.id,
          logDate: new Date().toISOString().split('T')[0],
          shift: shiftCode,
          operatingPeriod,
          status: 'completed',
          readings: {
            ambient_temp: parseFloat(telemetryValues.AMBIENT_TEMP) || 30.0,
            operating_steam_pressure: parseFloat(telemetryValues.STEAM_PRESSURE) || 8.5,
            flue_gas_stack_temperature: parseFloat(telemetryValues.FLUE_GAS_TEMP) || 175.0,
            boiler_water_tds: parseFloat(telemetryValues.BOILER_WATER_TDS) || 2200,
            feedwater_pump_hours: parseFloat(telemetryValues.PUMP_OPERATING_HOURS) || 11420,
          },
          checklists: checklistResponses,
          operatorNotes: allNotes,
          autoEvaluateAnp: true,
        },
        baseVersion: 1,
      });

      if (capturedPhotoUri) {
        offlineSyncService.saveOfflineAttachment({
          clientSubmissionId: submissionId,
          fileName: `sight-glass-${Date.now()}.png`,
          mimeType: 'image/png',
          dataUri: capturedPhotoUri,
        });
      }

      const result = await operationsApiService.submitDailyLog(submissionPayload);
      setSubmissionResult(result);

      // Trigger ANP Decision Engine Snapshot in Background
      const anpRun = await operationalAnpApiService.processOperationalLog({
        assetId: selectedAsset.id,
        signals: [
          { key: 'STEAM_PRESSURE', value: parseFloat(telemetryValues.STEAM_PRESSURE) || 8.5, unit: 'bar' },
          { key: 'FLUE_GAS_TEMP', value: parseFloat(telemetryValues.FLUE_GAS_TEMP) || 175.0, unit: '°C' },
          { key: 'BOILER_WATER_TDS', value: parseFloat(telemetryValues.BOILER_WATER_TDS) || 2200, unit: 'ppm' },
          { key: 'AMBIENT_TEMP', value: parseFloat(telemetryValues.AMBIENT_TEMP) || 30.0, unit: '°C' },
          { key: 'WATER_LEVEL_OK', value: checklistResponses.DRUM_WATER_LEVEL === true },
        ],
      });
      setOperationalAnpResult(anpRun);

      setSyncStatus('synced');
      localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
    } catch (err) {
      console.error('Submission failed:', err);
      setSyncStatus('offline');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-midnight-950 text-slate-100 flex flex-col ${isGloveMode ? 'glove-accessible-mode' : ''}`}>
      {/* =====================================================================
          1. TOP INDUSTRIAL OPERATOR BAR (Touch-First, High Contrast)
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-midnight-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Exit to Dashboard & Equipment Nameplate */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            title="Exit Floor Mode to Dashboard"
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-2xl bg-midnight-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center gap-2 text-xs font-mono font-bold transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gold-400" />
            <span className="hidden sm:inline">Exit Kiosk</span>
          </Link>

          {/* Boiler Asset Banner */}
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Flame className="h-5 w-5 text-gold-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold font-mono text-white tracking-tight">
                  {selectedAsset.code}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gold-500/20 text-gold-300 border border-gold-400/40">
                  {selectedAsset.capacity}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-xs">
                {selectedAsset.name} • {selectedAsset.location}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: QR Scanner, Sync Status, Glove Mode & Fullscreen */}
        <div className="flex items-center gap-2.5">
          {/* Quick QR Barcode Scanner Trigger (≥ 44x44px) */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            aria-label="Scan Equipment QR Tag"
            className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-gold-500/15 hover:bg-gold-500/25 active:bg-gold-500/40 text-gold-300 border border-gold-500/40 text-xs sm:text-sm font-mono font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <QrCode className="h-5 w-5 text-gold-400" />
            <span className="hidden md:inline">Scan QR Tag</span>
          </button>

          {/* Sync & Connectivity Status Indicator */}
          <SyncStatusIndicator
            status={syncStatus}
            lastSavedAt={lastSavedTime}
            pendingCount={queuePendingCount}
            conflictCount={queueConflictCount}
            onClick={() => setIsSyncDrawerOpen(true)}
            onForceSync={() => offlineSyncService.processQueue()}
          />

          {/* Glove Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsGloveMode((prev) => !prev)}
            title="Toggle PPE / Glove Touch Sensitivity"
            className={`min-h-[44px] px-3 py-2 rounded-2xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
              isGloveMode
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-glow-gold'
                : 'bg-midnight-900 text-slate-400 border-slate-700'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-gold-400" />
            <span className="hidden lg:inline">{isGloveMode ? 'GLOVE MODE ON' : 'GLOVE MODE'}</span>
          </button>

          {/* Fullscreen Kiosk Mode */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-midnight-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN CONTENT (Responsive Split: iPad Landscape, Portrait, Mobile)
         ===================================================================== */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 max-w-7xl mx-auto w-full space-y-6 pb-28">
        {/* Step Indicator & Operator Metadata Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-midnight-900/90 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Logged Operator
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  Certified Shift Lead
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-white font-mono">
                {user?.fullName || 'Kavinda Jayasuriya'} • #{organization?.code || 'COLOMBO-HOTEL'}
              </p>
            </div>
          </div>

          {/* Shift Segmented Pills (1-Tap Fast Selection) */}
          <div className="flex items-center gap-1.5 bg-midnight-950 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
            {(
              [
                { code: 'SHIFT_A', label: 'Shift A (06:00-14:00)' },
                { code: 'SHIFT_B', label: 'Shift B (14:00-22:00)' },
                { code: 'SHIFT_C', label: 'Shift C (22:00-06:00)' },
              ] as const
            ).map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => setShiftCode(s.code)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  shiftCode === s.code
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Responsive Layout: Telemetry Entry on Left, Checklist & Notes on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* =================================================================
              COLUMN 1: GLOVE-FRIENDLY TELEMETRY CONSOLE
             ================================================================= */}
          <section className="space-y-4" aria-labelledby="telemetry-section-title">
            <div className="flex items-center justify-between px-1">
              <h2 id="telemetry-section-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Gauge className="h-5 w-5 text-indigo-400" />
                <span>Operational Gauge Telemetry</span>
              </h2>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                Tap number to open glove numpad
              </span>
            </div>

            {/* Firing & Modulation Mode Selector */}
            <div className="p-4 rounded-2xl bg-midnight-900/90 border border-slate-800 space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Burner Modulation &amp; Firing State
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'AUTO_MODULATING', label: 'Auto (Normal)' },
                  { value: 'LOW_FIRE_HOLD', label: 'Low Fire' },
                  { value: 'HIGH_FIRE_PEAK', label: 'Peak Fire' },
                  { value: 'STANDBY_BANKED', label: 'Standby' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setOperatingMode(mode.value)}
                    className={`min-h-[48px] px-2 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      operatingMode === mode.value
                        ? 'bg-gold-500 text-midnight-950 border-gold-300 shadow-glow-gold'
                        : 'bg-midnight-950 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Large-Format Telemetry Cards */}
            <div className="space-y-3.5">
              {TELEMETRY_FIELDS.map((field) => {
                const curVal = telemetryValues[field.key] || '0';
                const numVal = parseFloat(curVal);
                const isOutOfSpec =
                  !isNaN(numVal) && (numVal < field.nominalMin || numVal > field.nominalMax);

                return (
                  <div
                    key={field.key}
                    className={`p-4 sm:p-5 rounded-3xl bg-midnight-900/95 border-2 transition-all space-y-3 ${
                      isOutOfSpec
                        ? 'border-red-500/80 bg-red-950/20 shadow-glow-gold'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Header & Benchmark Alert */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                          {field.name}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          Nominal: {field.nominalMin} to {field.nominalMax} {field.unit}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isOutOfSpec ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-500/60 uppercase animate-pulse flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Excursion
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Normal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Giant Digital Readout Button (Opens Glove Numpad) */}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveNumpadField(field)}
                        title="Tap to adjust value via tactile keypad"
                        className="flex-1 min-h-[64px] px-4 py-2 rounded-2xl bg-midnight-950 hover:bg-slate-800 active:bg-indigo-900 border border-slate-700/80 flex items-baseline justify-between transition-all group"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-mono font-bold text-white group-hover:text-gold-300 transition-colors">
                            {curVal}
                          </span>
                          <span className="text-base font-mono font-semibold text-gold-400">
                            {field.unit}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-indigo-400 underline decoration-indigo-400/40">
                          Edit
                        </span>
                      </button>

                      {/* Quick Glove Increment / Decrement Steppers (≥ 48x48px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(0, numVal - field.stepDelta);
                            setTelemetryValues((prev) => ({
                              ...prev,
                              [field.key]: parseFloat(next.toFixed(2)).toString(),
                            }));
                          }}
                          aria-label={`Decrease ${field.name} by ${field.stepDelta}`}
                          className="min-h-[52px] min-w-[52px] rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-lg font-mono font-bold flex items-center justify-center"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = numVal + field.stepDelta;
                            setTelemetryValues((prev) => ({
                              ...prev,
                              [field.key]: parseFloat(next.toFixed(2)).toString(),
                            }));
                          }}
                          aria-label={`Increase ${field.name} by ${field.stepDelta}`}
                          className="min-h-[52px] min-w-[52px] rounded-2xl bg-indigo-950 hover:bg-indigo-900 active:bg-indigo-800 text-gold-400 border border-indigo-700 text-lg font-mono font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Preset Chips (1-Tap Selection) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">
                        Presets:
                      </span>
                      {field.presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setTelemetryValues((prev) => ({
                              ...prev,
                              [field.key]: preset.toString(),
                            }))
                          }
                          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                            numVal === preset
                              ? 'bg-gold-500 text-midnight-950 border-gold-300 font-bold'
                              : 'bg-midnight-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {preset} {field.unit}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =================================================================
              COLUMN 2: 1-TAP SAFETY CHECKLIST & OBSERVATIONS
             ================================================================= */}
          <section className="space-y-4" aria-labelledby="checklist-section-title">
            <div className="flex items-center justify-between px-1">
              <h2 id="checklist-section-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span>Physical Safety Inspection Checklist</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">Zero Typing Rockers</span>
            </div>

            {/* Checklist Rocker Cards */}
            <div className="space-y-3">
              <GloveRockerSwitch
                label="Drum Sight Glass Water Level Verified?"
                subtext="Meniscus visible at 50% glass mark; blowdown column clean"
                value={checklistResponses.DRUM_WATER_LEVEL}
                mode="yes_no"
                onChange={(val) =>
                  setChecklistResponses((prev) => ({ ...prev, DRUM_WATER_LEVEL: val }))
                }
              />

              <GloveRockerSwitch
                label="Low Water Cutoff (LWCO) Float Chamber Blowdown"
                subtext="Burner cutoff circuit tripped and automatic reset confirmed"
                value={checklistResponses.LWCO_FLOAT_TEST}
                mode="pass_conditional_fail"
                onChange={(val) =>
                  setChecklistResponses((prev) => ({ ...prev, LWCO_FLOAT_TEST: val }))
                }
              />

              <GloveRockerSwitch
                label="Flame Scanner Sight Glass & Optical Signal"
                subtext="Scanner optic clean; flame signal strength > 90%"
                value={checklistResponses.FLAME_SCANNER_CHECK}
                mode="pass_conditional_fail"
                onChange={(val) =>
                  setChecklistResponses((prev) => ({ ...prev, FLAME_SCANNER_CHECK: val }))
                }
              />

              <GloveRockerSwitch
                label="Bottom Blowdown Valve Operability & Sediment Flush"
                subtext="Intermittent bottom blowdown valve opened for 10s flush"
                value={checklistResponses.BLOWDOWN_VALVE_PURGE}
                mode="pass_conditional_fail"
                onChange={(val) =>
                  setChecklistResponses((prev) => ({ ...prev, BLOWDOWN_VALVE_PURGE: val }))
                }
              />

              <GloveRockerSwitch
                label="Feedwater Pump Mechanical Seal & Bearing Vibration"
                subtext="Multi-stage centrifugal pump gland leakage < 10 drops/min"
                value={checklistResponses.PUMP_SEAL_VIBRATION}
                mode="pass_conditional_fail"
                onChange={(val) =>
                  setChecklistResponses((prev) => ({ ...prev, PUMP_SEAL_VIBRATION: val }))
                }
              />
            </div>

            {/* Rapid Observation Preset Chips (1-Tap Note Entry) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-midnight-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  1-Tap Floor Observation Tags
                </span>
                <span className="text-[11px] font-mono text-gold-400">Tap to toggle</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESET_OBSERVATIONS.map((obs) => {
                  const isSelected = selectedObservations.includes(obs);
                  return (
                    <button
                      key={obs}
                      type="button"
                      onClick={() => toggleObservationTag(obs)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-medium border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 font-semibold shadow-md'
                          : 'bg-midnight-950 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {obs}
                    </button>
                  );
                })}
              </div>

              {/* Dictation & Free-Text Note Input with Large Touch Button */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-notes-input" className="text-xs font-mono text-slate-400 uppercase">
                    Custom Observation / Anomaly Notes
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleVoiceDictation}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                      isRecordingAudio
                        ? 'bg-red-600 text-white border-red-400 animate-pulse'
                        : 'bg-midnight-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Mic className="h-4 w-4 text-gold-400" />
                    <span>{isRecordingAudio ? 'LISTENING (SPEAK)...' : 'DICTATE NOTE'}</span>
                  </button>
                </div>
                <textarea
                  id="custom-notes-input"
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Optional voice-dictated or typed abnormal observation..."
                  className="w-full text-sm bg-midnight-950 border border-slate-700/80 rounded-2xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Camera Photo Attachment Simulation */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-midnight-950 hover:bg-slate-800 active:bg-indigo-900 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-2 transition-all"
                >
                  <Camera className="h-5 w-5 text-gold-400" />
                  <span>{capturedPhotoUri ? 'RETAKE PHOTO' : 'SNAP GAUGE / FLAME PHOTO'}</span>
                </button>

                {capturedPhotoUri && (
                  <div className="flex items-center gap-2 bg-midnight-950 p-1.5 rounded-xl border border-slate-700">
                    <img
                      src={capturedPhotoUri}
                      alt="Captured Sight Glass"
                      className="w-12 h-10 object-cover rounded-lg border border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setCapturedPhotoUri(null)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-rose-400 hover:text-rose-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================================
          3. STICKY BOTTOM ACTION DOCK (Glove Accessible, ≥ 56px primary target)
         ===================================================================== */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-midnight-950/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Draft Save Button */}
          <button
            type="button"
            onClick={triggerAutosave}
            className="min-h-[52px] sm:min-h-[56px] px-4 sm:px-6 rounded-2xl bg-midnight-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-mono font-bold flex items-center gap-2 transition-all shrink-0"
          >
            <Save className="h-5 w-5 text-gold-400" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>

          {/* Center Summary Indicator */}
          <div className="text-center hidden md:block">
            <span className="text-xs font-mono text-slate-400">
              Shift {shiftCode} &bull; {selectedAsset.code} &bull; Readings: 5 Verified
            </span>
          </div>

          {/* Primary Submit Button (≥ 56px Height, High-Contrast Glow) */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitShiftEntry}
            className="flex-1 sm:flex-initial min-h-[52px] sm:min-h-[56px] px-6 sm:px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 font-mono">
                <RotateCcw className="h-5 w-5 animate-spin" /> Submitting...
              </span>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Submit Shift Logbook</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* =====================================================================
          4. SUBMISSION SUCCESS MODAL & ANP TRIGGER SUMMARY
         ===================================================================== */}
      {submissionResult && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/90 backdrop-blur-md p-4"
        >
          <div className="w-full max-w-lg bg-midnight-900 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <Check className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Shift Logbook Recorded Successfully
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">
                {submissionResult.summary.inspectionNumber}
              </h2>
              <p className="text-xs text-slate-400">
                Logged by {user?.fullName || 'Kavinda Jayasuriya'} • {selectedAsset.code} • {new Date().toLocaleTimeString()}
              </p>
            </div>

            {/* ANP Multi-Criteria Evaluation Preview */}
            {submissionResult.decisionSupport?.isBreached && (
              <div className="p-4 rounded-2xl bg-midnight-950 border border-gold-500/40 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-gold-400 font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>ANP Decision Engine Advisory Triggered</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {submissionResult.decisionSupport.evaluation?.recommendedAction}
                </p>
                {submissionResult.decisionSupport.draftedWorkOrder && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-indigo-300">
                    Draft Corrective Work Order created: <strong>{submissionResult.decisionSupport.draftedWorkOrder.workOrderNumber}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              {operationalAnpResult && (
                <button
                  type="button"
                  onClick={() => setIsAnpDrawerOpen(true)}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-colors"
                >
                  View ANP Ranking
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSubmissionResult(null);
                  navigate('/');
                }}
                className={`min-h-[48px] px-4 py-2.5 rounded-2xl bg-midnight-950 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold font-mono transition-colors ${
                  !operationalAnpResult ? 'col-span-2' : ''
                }`}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glove Numpad Dialog */}
      {activeNumpadField && (
        <GloveNumpad
          isOpen={!!activeNumpadField}
          title={activeNumpadField.name}
          itemCode={activeNumpadField.key}
          unit={activeNumpadField.unit}
          currentValue={telemetryValues[activeNumpadField.key] || '0'}
          minValue={activeNumpadField.nominalMin}
          maxValue={activeNumpadField.nominalMax}
          presets={activeNumpadField.presets}
          onConfirm={(newVal) => {
            setTelemetryValues((prev) => ({
              ...prev,
              [activeNumpadField.key]: newVal,
            }));
            setActiveNumpadField(null);
          }}
          onClose={() => setActiveNumpadField(null)}
        />
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* ANP Drawer */}
      <OperationalAnpDrawer
        runResult={operationalAnpResult}
        isOpen={isAnpDrawerOpen}
        onClose={() => setIsAnpDrawerOpen(false)}
      />

      {/* Offline Sync Queue & Conflict Resolution Drawer */}
      <SyncQueueDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
      />
    </div>
  );
};
