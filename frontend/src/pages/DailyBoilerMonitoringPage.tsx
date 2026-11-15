import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Gauge,
  Thermometer,
  Clock,
  Sparkles,
  FileWarning,
  Wrench,
  BellRing,
  Check,
  X,
  Camera,
  Save,
  Send,
  History,
  FileText,
  Edit3,
  Calendar,
  Eye,
  Filter,
  Scale,
} from 'lucide-react';
import {
  AssetSummary,
  ChecklistItemDefinition,
  ChecklistTemplateDefinition,
  DailyLogSubmissionResult,
  BoilerShift,
  LogbookStatus,
  DailyLogbookSummaryItem,
  DetailedDailyLogbookResponse,
  OperationalAnpExecutionResult,
} from '../types/cmms.types';
import { assetsApiService } from '../services/assets.service';
import {
  operationsApiService,
  DEFAULT_BOILER_CHECKLIST_TEMPLATE,
} from '../services/operations.service';
import { operationalAnpApiService } from '../services/operational-anp.service';
import { OperationalAnpDrawer } from '../components/decision-support/OperationalAnpDrawer';

interface FieldValidationError {
  itemCode: string;
  question: string;
  expectedType: string;
  receivedRaw: string;
  message: string;
}

interface NewObservationState {
  category: string;
  severity: string;
  observationText: string;
  attachmentUri: string;
}

interface NewPhotoState {
  fileName: string;
  storageUri: string;
  caption: string;
}

export const DailyBoilerMonitoringPage: React.FC = () => {
  // Navigation tab: 'entry' for active shift entry, 'history' for reviewing previous entries
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');

  // Boiler selection
  const [boilerAssets, setBoilerAssets] = useState<AssetSummary[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    'a1000000-0000-0000-0000-000000000001'
  );

  // Shift and 2-hourly operating period
  const [shiftName, setShiftName] = useState<string>('Shift A — Morning Watch (06:00–14:00)');
  const [shiftCode, setShiftCode] = useState<BoilerShift>('SHIFT_A');
  const [operatingPeriod, setOperatingPeriod] = useState<string>('08:00');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Template and notes
  const [template, setTemplate] = useState<ChecklistTemplateDefinition>(
    DEFAULT_BOILER_CHECKLIST_TEMPLATE
  );
  const [operatorNotes, setOperatorNotes] = useState<string>(
    'Burner firing steady; sight glass blown down and verified.'
  );
  const [autoDraftWorkOrder, setAutoDraftWorkOrder] = useState<boolean>(true);

  // Operational readings raw values
  const [rawValues, setRawValues] = useState<Record<string, string | boolean>>({
    AMBIENT_TEMP: '29.5',
    STEAM_PRESSURE: '8.5',
    FLUE_GAS_TEMP: '175.0',
    WATER_LEVEL_OK: true,
    PUMP_OPERATING_HOURS: '11420',
    BLOWDOWN_VALVE_CHECK: true,
    FIRING_FUEL_MODE: 'AUTO_MODULATING_LOW_SULFUR_DIESEL',
  });

  // Abnormal observations list
  const [observations, setObservations] = useState<
    Array<{ category: string; severity: string; observationText: string; attachmentUris: string[] }>
  >([]);
  const [newObs, setNewObs] = useState<NewObservationState>({
    category: 'COMBUSTION',
    severity: 'INFO',
    observationText: '',
    attachmentUri: '',
  });

  // Supporting photographs
  const [photographs, setPhotographs] = useState<NewPhotoState[]>([]);
  const [newPhoto, setNewPhoto] = useState<NewPhotoState>({
    fileName: '',
    storageUri: '',
    caption: '',
  });

  // UI state
  const [validationBannerError, setValidationBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Historical logbooks & review state
  const [historyList, setHistoryList] = useState<DailyLogbookSummaryItem[]>([]);
  const [historyFilterStatus, setHistoryFilterStatus] = useState<LogbookStatus | 'all'>('all');
  const [selectedLogbookDetail, setSelectedLogbookDetail] = useState<DetailedDailyLogbookResponse | null>(null);

  // Traceable amendment modal state
  const [isAmendmentOpen, setIsAmendmentOpen] = useState<boolean>(false);
  const [amendTargetReading, setAmendTargetReading] = useState<{
    readingId?: string;
    parameterCode: string;
    parameterName: string;
    currentValue: number;
    unit: string;
  } | null>(null);
  const [amendedValue, setAmendedValue] = useState<string>('');
  const [amendmentReason, setAmendmentReason] = useState<string>('');
  const [amendmentError, setAmendmentError] = useState<string | null>(null);

  // Operational ANP Decision Support Drawer
  const [activeOperationalRun, setActiveOperationalRun] = useState<OperationalAnpExecutionResult | null>(null);
  const [isAnpDrawerOpen, setIsAnpDrawerOpen] = useState<boolean>(false);

  // Load boilers and templates on mount
  useEffect(() => {
    assetsApiService.listAssets().then((allAssets) => {
      const boilers = allAssets.filter(
        (a) =>
          a.assetCategory.code.toUpperCase().includes('BOILER') ||
          a.assetCode.startsWith('BLR')
      );
      const list = boilers.length > 0 ? boilers : allAssets;
      setBoilerAssets(list);
      if (list.length > 0) {
        setSelectedAssetId(list[0].id);
      }
    });

    operationsApiService.listChecklistTemplates().then((templates) => {
      if (templates.length > 0) {
        setTemplate(templates[0]);
      }
    });

    loadPreviousEntries();
  }, []);

  const loadPreviousEntries = async () => {
    try {
      const list = await operationsApiService.listDailyLogbooks();
      setHistoryList(list);
    } catch {
      // Fallback
    }
  };

  const selectedAsset = useMemo(
    () => boilerAssets.find((a) => a.id === selectedAssetId) ?? boilerAssets[0],
    [boilerAssets, selectedAssetId]
  );

  /**
   * Client-side structural type validation across all `checklist_items`.
   */
  const fieldValidationErrors = useMemo(() => {
    const errors: Record<string, FieldValidationError> = {};

    for (const item of template.items) {
      const raw = rawValues[item.itemCode];

      // Check required presence
      if (
        item.isRequired &&
        (raw === undefined || raw === null || String(raw).trim() === '')
      ) {
        errors[item.itemCode] = {
          itemCode: item.itemCode,
          question: item.question,
          expectedType: item.responseType,
          receivedRaw: '',
          message: `Required field: Please enter a valid ${item.responseType} reading for "${item.question}".`,
        };
        continue;
      }

      // Check structural type for `number` fields
      if (item.responseType === 'number' && raw !== undefined && raw !== '') {
        const strVal = String(raw).trim();
        const isStrictNumber = /^-?\d+(\.\d+)?$/.test(strVal);
        const parsed = Number(strVal);

        if (!isStrictNumber || Number.isNaN(parsed)) {
          errors[item.itemCode] = {
            itemCode: item.itemCode,
            question: item.question,
            expectedType: 'number',
            receivedRaw: strVal,
            message: `Structural Type Error: "${item.question}" (${item.itemCode}) requires a valid numeric value${
              item.unitCode ? ` in ${item.unitCode}` : ''
            }, but received non-numeric string "${strVal}".`,
          };
        }
      }
    }

    return errors;
  }, [template.items, rawValues]);

  /**
   * Live ANP Benchmark Threshold Pre-Check
   */
  const benchmarkWarnings = useMemo(() => {
    const warnings: Record<string, string> = {};

    for (const item of template.items) {
      if (fieldValidationErrors[item.itemCode]) continue;
      const raw = rawValues[item.itemCode];

      if (item.responseType === 'number' && raw !== undefined && raw !== '') {
        const num = Number(String(raw).trim());
        if (!Number.isNaN(num)) {
          if (item.maxValue !== undefined && item.maxValue !== null && num > item.maxValue) {
            warnings[item.itemCode] = `Exceeds empirical trigger max (${item.maxValue}${
              item.unitCode ? ' ' + item.unitCode : ''
            }) — Will trigger ANP Decision Support Action`;
          } else if (
            item.minValue !== undefined &&
            item.minValue !== null &&
            num < item.minValue
          ) {
            warnings[item.itemCode] = `Below nominal range (${item.minValue}${
              item.unitCode ? ' ' + item.unitCode : ''
            }) — Will trigger ANP Decision Support Action`;
          }
        }
      }
    }

    return warnings;
  }, [template.items, rawValues, fieldValidationErrors]);

  const handleRawChange = (itemCode: string, value: string | boolean) => {
    setRawValues((prev) => ({
      ...prev,
      [itemCode]: value,
    }));
  };

  const handleNumericStep = (item: ChecklistItemDefinition, step: number) => {
    const current = Number(rawValues[item.itemCode] ?? item.minValue ?? 0);
    const updated = Math.round((current + step) * 10) / 10;
    handleRawChange(item.itemCode, String(updated));
  };

  const handleAddObservation = () => {
    if (!newObs.observationText.trim()) return;
    setObservations((prev) => [
      ...prev,
      {
        category: newObs.category,
        severity: newObs.severity,
        observationText: newObs.observationText.trim(),
        attachmentUris: newObs.attachmentUri ? [newObs.attachmentUri.trim()] : [],
      },
    ]);
    setNewObs({
      category: 'COMBUSTION',
      severity: 'INFO',
      observationText: '',
      attachmentUri: '',
    });
  };

  const handleAddPhotograph = (defaultType?: string) => {
    const caption = defaultType || newPhoto.caption || 'Shift photo checkpoint';
    const filename = `${caption.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    setPhotographs((prev) => [
      ...prev,
      {
        fileName: filename,
        storageUri: `s3://luminafm-uploads/boilers/${filename}`,
        caption,
      },
    ]);
    setNewPhoto({ fileName: '', storageUri: '', caption: '' });
  };

  // Quick Preset Handlers
  const handleApplyNominalPreset = () => {
    setValidationBannerError(null);
    setRawValues({
      AMBIENT_TEMP: '29.5',
      STEAM_PRESSURE: '8.5',
      FLUE_GAS_TEMP: '175.0',
      WATER_LEVEL_OK: true,
      PUMP_OPERATING_HOURS: '11420',
      BLOWDOWN_VALVE_CHECK: true,
      FIRING_FUEL_MODE: 'AUTO_MODULATING_LOW_SULFUR_DIESEL',
    });
  };

  const handleSimulateAnpBreachPreset = () => {
    setValidationBannerError(null);
    setRawValues({
      AMBIENT_TEMP: '33.2',
      STEAM_PRESSURE: '9.4', // Overpressure breach > 9.0 bar!
      FLUE_GAS_TEMP: '208.5', // Breaches > 190°C benchmark!
      WATER_LEVEL_OK: true,
      PUMP_OPERATING_HOURS: '12150', // Breaches >= 12000 hrs benchmark!
      BLOWDOWN_VALVE_CHECK: true,
      FIRING_FUEL_MODE: 'HIGH_FIRE_PEAK_DEMAND',
    });
  };

  // Submit Handler: supports mode 'draft' or 'completed'
  const handleSaveLogbook = async (status: LogbookStatus) => {
    setValidationBannerError(null);
    setActionSuccessMessage(null);

    // If submitting as completed, run strict structural validation on required fields
    if (status === 'completed') {
      const errorList = Object.values(fieldValidationErrors);
      if (errorList.length > 0) {
        setValidationBannerError(
          `Cannot submit completed logbook: ${errorList.length} field error(s) found. ${errorList[0].message}`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Map readings into numeric dictionary
      const readingsDict: Record<string, number> = {};
      const checklistsDict: Record<string, string | number | boolean> = {};

      for (const item of template.items) {
        const raw = rawValues[item.itemCode];
        if (item.responseType === 'number') {
          if (raw !== undefined && raw !== '') {
            readingsDict[item.itemCode.toLowerCase()] = Number(raw);
          }
        } else {
          if (raw !== undefined) {
            checklistsDict[item.itemCode] = raw;
          }
        }
      }

      const result = await operationsApiService.saveDailyLogbook({
        assetId: selectedAsset?.id ?? 'a1000000-0000-0000-0000-000000000001',
        logDate,
        shift: shiftCode,
        operatingPeriod,
        status,
        readings: readingsDict,
        checklists: checklistsDict,
        observations,
        attachments: photographs,
        operatorNotes,
        autoEvaluateAnp: true,
      });

      setActionSuccessMessage(
        status === 'completed'
          ? `Daily Logbook ${result.logNumber} successfully submitted and completed!`
          : `Draft Logbook ${result.logNumber} saved successfully.`
      );

      // If submitted as completed, run ANP evaluation and display Operational Drawer
      if (status === 'completed') {
        try {
          const signals = Object.entries(readingsDict).map(([key, val]) => ({
            key,
            value: typeof val === 'boolean' ? val : (isNaN(Number(val)) ? String(val) : Number(val)),
          }));
          const runResult = await operationalAnpApiService.processOperationalLog({
            assetId: selectedAsset?.id,
            signals,
          });
          setActiveOperationalRun(runResult);
          setIsAnpDrawerOpen(true);
        } catch {
          // Safe non-blocking display
        }
      }

      loadPreviousEntries();
    } catch (err: any) {
      setValidationBannerError(err?.message || 'Failed to save daily logbook entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Traceable Amendment Handler
  const handleOpenAmendment = (reading: {
    readingId?: string;
    parameterCode: string;
    parameterName: string;
    currentValue: number;
    unit: string;
  }) => {
    setAmendTargetReading(reading);
    setAmendedValue(String(reading.currentValue));
    setAmendmentReason('');
    setAmendmentError(null);
    setIsAmendmentOpen(true);
  };

  const handleExecuteAmendment = async () => {
    if (!amendmentReason.trim()) {
      setAmendmentError('An explicit justification reason is strictly required when amending recorded values.');
      return;
    }

    if (!selectedLogbookDetail || !amendTargetReading) return;

    try {
      const updated = await operationsApiService.amendLogbookReading(selectedLogbookDetail.id, {
        readingId: amendTargetReading.readingId,
        parameterCode: amendTargetReading.parameterCode,
        amendedValue: Number(amendedValue),
        reason: amendmentReason.trim(),
      });

      setSelectedLogbookDetail(updated);
      setIsAmendmentOpen(false);
      setActionSuccessMessage(
        `Reading for '${amendTargetReading.parameterName}' successfully amended from ${amendTargetReading.currentValue} to ${amendedValue} ${amendTargetReading.unit}.`
      );
      loadPreviousEntries();
    } catch (err: any) {
      setAmendmentError(err?.message || 'Failed to record amendment.');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await operationsApiService.getDailyLogbookById(id);
      setSelectedLogbookDetail(detail);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gold-400">
            <Flame className="w-4 h-4 text-gold-400" />
            <span>Industrial Steam Boiler • Daily Logbook &amp; Inspection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Boiler Shift Logbook &amp; Checkpoints
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manual 2-hourly shift logging, physical range guards, inspection checklists &amp; traceable amendments.
          </p>
        </div>

        {/* Tab Toggle: Live Entry vs History */}
        <div className="flex items-center gap-2 bg-midnight-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('entry')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'entry'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-indigo-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Shift Entry</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadPreviousEntries();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-midnight-950 font-bold shadow-glow-gold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Review Previous Entries ({historyList.length})</span>
          </button>

          <Link
            to="/operator"
            className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-2 bg-gold-500/15 hover:bg-gold-500/25 active:bg-gold-500/40 text-gold-300 border border-gold-500/40"
            title="Launch Dedicated Factory-Floor Tablet Kiosk Interface"
          >
            <Flame className="w-4 h-4 text-gold-400" />
            <span>Tablet Floor Kiosk</span>
          </Link>
        </div>
      </div>

      {/* Global Alerts Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-3 text-emerald-300 text-sm font-mono">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{actionSuccessMessage}</span>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="ml-auto text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {validationBannerError && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-300 text-sm font-mono">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold">Validation Warning:</strong>
            <p>{validationBannerError}</p>
          </div>
          <button
            onClick={() => setValidationBannerError(null)}
            className="ml-auto text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === 'entry' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Columns: Form Entry */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Boiler & Operating Period Selection Card */}
            <div className="lumina-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-gold-400" />
                <span>1. Boiler Selection &amp; Shift Operating Period</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Boiler Selector */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
                    Assigned Boiler
                  </label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  >
                    {boilerAssets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.assetCode} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shift Selector */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
                    Operating Shift
                  </label>
                  <select
                    value={shiftCode}
                    onChange={(e) => {
                      const code = e.target.value as BoilerShift;
                      setShiftCode(code);
                      if (code === 'SHIFT_A') setShiftName('Shift A — Morning Watch (06:00–14:00)');
                      else if (code === 'SHIFT_B') setShiftName('Shift B — Evening Watch (14:00–22:00)');
                      else setShiftName('Shift C — Night Watch (22:00–06:00)');
                    }}
                    className="w-full h-11 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SHIFT_A">Shift A — Morning (06:00–14:00)</option>
                    <option value="SHIFT_B">Shift B — Evening (14:00–22:00)</option>
                    <option value="SHIFT_C">Shift C — Night (22:00–06:00)</option>
                  </select>
                </div>

                {/* 2-Hourly Cadence Interval */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
                    2-Hourly Log Time
                  </label>
                  <select
                    value={operatingPeriod}
                    onChange={(e) => setOperatingPeriod(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="06:00">06:00 (Shift A Start)</option>
                    <option value="08:00">08:00</option>
                    <option value="10:00">10:00</option>
                    <option value="12:00">12:00</option>
                    <option value="14:00">14:00 (Shift B Start)</option>
                    <option value="16:00">16:00</option>
                    <option value="18:00">18:00</option>
                    <option value="20:00">20:00</option>
                    <option value="22:00">22:00 (Shift C Start)</option>
                    <option value="00:00">00:00 (Midnight)</option>
                    <option value="02:00">02:00</option>
                    <option value="04:00">04:00</option>
                  </select>
                </div>
              </div>

              {/* Research Baseline Banner */}
              <div className="p-3 rounded-lg bg-midnight-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Target Spec: <strong className="text-gold-300">1,100 kg/h Oil-Fired Fire-Tube Steam Boiler</strong>
                </span>
                <span className="text-slate-400">
                  Nominal Pressure: <strong className="text-emerald-400">8.0 – 9.0 bar</strong>
                </span>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplyNominalPreset}
                className="px-3 py-1.5 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Nominal Baseline Preset</span>
              </button>
              <button
                type="button"
                onClick={handleSimulateAnpBreachPreset}
                className="px-3 py-1.5 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-gold-500/40 text-xs font-mono text-gold-300 flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Trigger Flue Gas &gt;190°C Breach</span>
              </button>
            </div>

            {/* 2. Operational Readings & Checkpoints */}
            <div className="lumina-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-gold-400" />
                  <span>2. Operational Readings &amp; Checkpoints</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  * Indicates Required for Completed Submission
                </span>
              </h2>

              <div className="space-y-4">
                {template.items.map((item) => {
                  const rawVal = rawValues[item.itemCode];
                  const fieldError = fieldValidationErrors[item.itemCode];
                  const fieldWarning = benchmarkWarnings[item.itemCode];

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl bg-midnight-900 border transition-all ${
                        fieldError
                          ? 'border-rose-500/70 bg-rose-950/20'
                          : fieldWarning
                          ? 'border-gold-500/70 bg-gold-500/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400">
                              {item.itemCode}
                            </span>
                            {item.isRequired && (
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 border border-gold-500/40">
                                Required
                              </span>
                            )}
                            {item.unitCode && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-midnight-950 text-indigo-300 border border-slate-700">
                                {item.unitCode}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-slate-100 mt-1">
                            {item.question}
                          </h3>
                        </div>

                        {(item.minValue !== undefined || item.maxValue !== undefined) && (
                          <span className="text-xs font-mono text-slate-400 shrink-0">
                            Nominal: {item.minValue ?? '0'} – {item.maxValue ?? '∞'}{' '}
                            {item.unitCode ?? ''}
                          </span>
                        )}
                      </div>

                      {/* Input control */}
                      <div className="mt-3">
                        {item.responseType === 'number' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleNumericStep(item, item.unitCode === 'bar' ? -0.5 : -5)}
                              className="h-11 w-11 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-lg font-mono font-bold text-slate-200 transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={String(rawVal ?? '')}
                              onChange={(e) => handleRawChange(item.itemCode, e.target.value)}
                              placeholder={`Enter ${item.unitCode || 'reading'}...`}
                              className={`flex-1 h-11 px-3 rounded-lg bg-midnight-950 font-mono text-lg font-semibold text-slate-100 border focus:outline-none ${
                                fieldError
                                  ? 'border-rose-500 text-rose-300'
                                  : fieldWarning
                                  ? 'border-gold-500 text-gold-300'
                                  : 'border-slate-700 focus:border-indigo-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleNumericStep(item, item.unitCode === 'bar' ? 0.5 : 5)}
                              className="h-11 w-11 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-lg font-mono font-bold text-slate-200 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {(item.responseType === 'yes_no' || item.responseType === 'pass_fail') && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleRawChange(item.itemCode, true)}
                              className={`h-11 rounded-lg font-mono text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                                rawVal === true
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                  : 'bg-midnight-950 text-slate-400 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span>NORMAL / VERIFIED</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRawChange(item.itemCode, false)}
                              className={`h-11 rounded-lg font-mono text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                                rawVal === false
                                  ? 'bg-gold-500/20 text-gold-300 border-gold-500'
                                  : 'bg-midnight-950 text-slate-400 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <X className="w-4 h-4" />
                              <span>ABNORMAL / DEFECT</span>
                            </button>
                          </div>
                        )}

                        {item.responseType === 'select' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(item.options || []).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleRawChange(item.itemCode, opt)}
                                className={`p-2.5 rounded-lg font-mono text-xs border text-left truncate flex items-center justify-between transition-all ${
                                  String(rawVal) === opt
                                    ? 'bg-indigo-950 text-gold-300 border-gold-500'
                                    : 'bg-midnight-950 text-slate-300 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span className="truncate">{opt}</span>
                                {String(rawVal) === opt && <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {fieldWarning && (
                        <p className="text-xs font-mono text-gold-300 mt-2 flex items-center gap-1.5">
                          <BellRing className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                          <span>{fieldWarning}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Abnormal Observations Recorder */}
            <div className="lumina-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-gold-400" />
                <span>3. Abnormal Shift Observations</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={newObs.category}
                    onChange={(e) => setNewObs({ ...newObs, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-xs font-mono"
                  >
                    <option value="COMBUSTION">Combustion Flame / Burner</option>
                    <option value="WATER_LEVEL">Water Level / Sight Glass</option>
                    <option value="ACOUSTIC_LEAK">Acoustic Steam / Valve Leak</option>
                    <option value="REFRACTORY">Refractory / Shell Temperature</option>
                    <option value="CHEMICAL">Chemical Dosing / Softener</option>
                    <option value="GENERAL">General Operational Observation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1">Severity</label>
                  <select
                    value={newObs.severity}
                    onChange={(e) => setNewObs({ ...newObs, severity: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-xs font-mono"
                  >
                    <option value="INFO">Informational Note</option>
                    <option value="ADVISORY">Advisory / Routine Watch</option>
                    <option value="WARNING">Warning / Requires Attention</option>
                    <option value="CRITICAL">Critical / Immediate Interlock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1">Observation Details</label>
                <textarea
                  value={newObs.observationText}
                  onChange={(e) => setNewObs({ ...newObs, observationText: e.target.value })}
                  rows={2}
                  placeholder="Record qualitative shift observations (e.g. slight flame flutter, packing weep)..."
                  className="w-full p-2.5 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleAddObservation}
                disabled={!newObs.observationText.trim()}
                className="px-4 py-2 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-slate-200 transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Observation to Log</span>
              </button>

              {observations.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {observations.map((obs, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-midnight-950 border border-slate-800 flex items-start justify-between gap-3 text-xs font-mono">
                      <div>
                        <span className="font-bold text-gold-400 uppercase">[{obs.category} • {obs.severity}]</span>
                        <p className="text-slate-200 mt-0.5">{obs.observationText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setObservations(observations.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Supporting Photographs Upload */}
            <div className="lumina-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-gold-400" />
                <span>4. Supporting Photographic Evidence</span>
              </h2>

              <p className="text-xs text-slate-400">
                Attach visual evidence of the sight glass level, flame sight port, stack smoke plume, or any noted leaks.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddPhotograph('Sight Glass Water Level')}
                  className="p-3 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-left text-xs font-mono text-slate-300 transition-colors flex flex-col gap-1.5"
                >
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>+ Sight Glass Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPhotograph('Burner Flame Sight Port')}
                  className="p-3 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-left text-xs font-mono text-slate-300 transition-colors flex flex-col gap-1.5"
                >
                  <Flame className="w-4 h-4 text-gold-400" />
                  <span>+ Flame Port Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPhotograph('Exhaust Chimney Plume')}
                  className="p-3 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-left text-xs font-mono text-slate-300 transition-colors flex flex-col gap-1.5"
                >
                  <Thermometer className="w-4 h-4 text-indigo-400" />
                  <span>+ Stack Plume Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPhotograph('Chemical Softener Test Strip')}
                  className="p-3 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-left text-xs font-mono text-slate-300 transition-colors flex flex-col gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>+ Softener Strip Photo</span>
                </button>
              </div>

              {photographs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                  {photographs.map((photo, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-midnight-950 border border-slate-800 text-xs font-mono relative">
                      <span className="font-semibold text-slate-200 block truncate">{photo.caption}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{photo.fileName}</span>
                      <button
                        type="button"
                        onClick={() => setPhotographs(photographs.filter((_, i) => i !== idx))}
                        className="absolute right-1.5 top-1.5 text-slate-500 hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Actions: Save Draft vs Submit Completed */}
            <div className="lumina-card p-5 space-y-4">
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1">Operator Shift Notes</label>
              <textarea
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Save Incomplete Entry as Draft */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveLogbook('draft')}
                  className="h-14 rounded-xl bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Save className="w-5 h-5 text-indigo-400" />
                  <span>Save Incomplete Draft</span>
                </button>

                {/* Submit Completed Record */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveLogbook('completed')}
                  className="h-14 rounded-xl font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-gold-500 hover:from-indigo-500 hover:to-gold-400 text-slate-950"
                >
                  <Send className="w-5 h-5 stroke-[2.2]" />
                  <span>Submit Completed Record</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Information & Guidelines */}
          <div className="lg:col-span-4 space-y-4">
            <div className="lumina-card p-5 space-y-4 sticky top-24">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <Flame className="w-4 h-4 text-gold-400" />
                <span>Operating Workflow Guidelines</span>
              </h2>

              <div className="space-y-3 text-xs font-mono text-slate-300">
                <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800 space-y-1">
                  <strong className="text-gold-400 block font-semibold">1. 2-Hourly Cadence</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Readings must be taken every 2 hours (06:00, 08:00, 10:00, 12:00, etc.) on tablet or station.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800 space-y-1">
                  <strong className="text-indigo-400 block font-semibold">2. Draft vs Completed</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Use <em>Save Incomplete Draft</em> to persist partial entries. Completed submission strictly requires all mandatory measurements.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 block font-semibold">3. Traceable Amendments</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Submitted records cannot be silently overwritten. Corrections require an explicit reason and are preserved in audit history.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Historical Logbooks & Review Previous Entries View */
        <div className="space-y-6">
          <div className="lumina-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-gold-400" />
                <span>Review Previous Shift Logbooks</span>
              </h2>

              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={historyFilterStatus}
                  onChange={(e) => setHistoryFilterStatus(e.target.value as any)}
                  className="h-9 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-xs font-mono"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed Submissions Only</option>
                  <option value="draft">Incomplete Drafts Only</option>
                </select>
              </div>
            </div>

            {historyList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-mono text-xs">
                No previous logbook records found. Create a new shift entry to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-midnight-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Log Number</th>
                      <th className="p-3">Date &amp; Period</th>
                      <th className="p-3">Shift</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">Amendments</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {historyList
                      .filter((item) => historyFilterStatus === 'all' || item.status === historyFilterStatus)
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-midnight-950/50 transition-colors">
                          <td className="p-3 font-semibold text-gold-400">{item.logNumber}</td>
                          <td className="p-3 text-slate-300">{item.logDate} • {item.operatingPeriod}</td>
                          <td className="p-3 text-slate-400">{item.shift}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                item.status === 'completed'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                item.overallResult === 'pass'
                                  ? 'text-emerald-400'
                                  : item.overallResult === 'fail'
                                  ? 'text-rose-400'
                                  : 'text-gold-400'
                              }`}
                            >
                              {item.overallResult || '—'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">
                            {item.amendmentsCount > 0 ? (
                              <span className="text-gold-300 font-bold">{item.amendmentsCount} amended</span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleViewDetail(item.id)}
                              className="px-3 py-1.5 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-xs text-indigo-300 font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View &amp; Amend</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Selected Logbook Drawer / Card */}
          {selectedLogbookDetail && (
            <div className="lumina-card p-6 space-y-6 border border-gold-500/40 shadow-glow-gold">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gold-400">
                      {selectedLogbookDetail.logNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        selectedLogbookDetail.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-indigo-950 text-indigo-300'
                      }`}
                    >
                      {selectedLogbookDetail.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mt-1">
                    {selectedLogbookDetail.assetCode} — {selectedLogbookDetail.assetName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Recorded on {selectedLogbookDetail.logDate} at {selectedLogbookDetail.operatingPeriod} • {selectedLogbookDetail.shift}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const signals = selectedLogbookDetail.readings.map((r) => ({
                          key: r.parameterCode,
                          value: r.value,
                          unit: r.unit,
                        }));
                        const runResult = await operationalAnpApiService.processOperationalLog({
                          assetId: selectedLogbookDetail.assetId,
                          signals,
                        });
                        setActiveOperationalRun(runResult);
                        setIsAnpDrawerOpen(true);
                      } catch (err: any) {
                        alert(`Failed to analyze logbook with ANP: ${err?.message || 'Unknown error'}`);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    ANP Decision Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLogbookDetail(null)}
                    className="text-xs font-mono text-slate-400 hover:text-slate-200"
                  >
                    ✕ Close Details
                  </button>
                </div>
              </div>

              {/* Operational Readings Table with Traceable Amendment Button */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-slate-300">
                  Recorded Operational Readings
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-midnight-950 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Reading Value</th>
                        <th className="p-2.5">Unit</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Notes</th>
                        <th className="p-2.5 text-right">Traceable Correction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedLogbookDetail.readings.map((reading) => (
                        <tr key={reading.id} className="hover:bg-midnight-950/40">
                          <td className="p-2.5 font-semibold text-slate-200">{reading.parameterName}</td>
                          <td className="p-2.5 text-slate-100 font-bold text-sm">
                            {reading.value}{' '}
                            {reading.isAmended && (
                              <span className="text-[10px] text-gold-400 font-normal">(Amended)</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400">{reading.unit}</td>
                          <td className="p-2.5">
                            {reading.inNominalRange ? (
                              <span className="text-emerald-400">Normal</span>
                            ) : (
                              <span className="text-gold-400 font-bold">Deviation</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate">
                            {reading.notes || '—'}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenAmendment({
                                  readingId: reading.id,
                                  parameterCode: reading.parameterCode,
                                  parameterName: reading.parameterName,
                                  currentValue: reading.value,
                                  unit: reading.unit,
                                })
                              }
                              className="px-2.5 py-1 rounded bg-midnight-950 hover:bg-slate-800 border border-gold-500/40 text-gold-300 text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Amend Value</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Traceable Amendments History Table */}
              {selectedLogbookDetail.amendments.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-mono uppercase font-bold text-gold-400 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span>Traceable Amendments Audit Trail (No Silent Overwrites)</span>
                  </h4>

                  <div className="space-y-2">
                    {selectedLogbookDetail.amendments.map((amend) => (
                      <div
                        key={amend.id}
                        className="p-3 rounded-lg bg-midnight-950 border border-gold-500/30 text-xs font-mono space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-gold-300">
                            {amend.parameterName}: {amend.originalValue} {amend.unit} &rarr;{' '}
                            {amend.amendedValue} {amend.unit}
                          </span>
                          <span className="text-slate-400">{new Date(amend.amendedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300">
                          <strong className="text-slate-400">Justification Reason:</strong> &ldquo;{amend.reason}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Traceable Amendment Modal Dialog */}
      {isAmendmentOpen && amendTargetReading && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="lumina-card p-6 max-w-lg w-full space-y-4 border border-gold-500/60 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gold-400" />
                <span>Traceable Reading Amendment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAmendmentOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {amendmentError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500 text-rose-300 text-xs font-mono">
                {amendmentError}
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-midnight-950 border border-slate-800 space-y-1">
                <span className="text-slate-400">Target Measurement:</span>
                <p className="text-sm font-bold text-slate-100">
                  {amendTargetReading.parameterName} ({amendTargetReading.parameterCode})
                </p>
                <span className="text-slate-400">Current Value:</span>{' '}
                <strong className="text-gold-300">{amendTargetReading.currentValue} {amendTargetReading.unit}</strong>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Corrected Amended Value</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amendedValue}
                  onChange={(e) => setAmendedValue(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-base font-bold focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Mandatory Justification Reason <span className="text-gold-400">*</span>
                </label>
                <textarea
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this record is being amended (e.g., operator keyed 9.4 instead of 8.4 due to gauge parallax, cross-verified with digital sensor)..."
                  className="w-full p-2.5 rounded-lg bg-midnight-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-gold-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Preserved immutably in the PostgreSQL audit log without silently overwriting previous readings.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAmendmentOpen(false)}
                className="px-4 py-2 rounded-lg bg-midnight-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAmendment}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 text-midnight-950 font-mono font-bold text-xs uppercase tracking-wider shadow-glow-gold"
              >
                Save Traceable Amendment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operational ANP Decision Support Drawer */}
      <OperationalAnpDrawer
        runResult={activeOperationalRun}
        isOpen={isAnpDrawerOpen}
        onClose={() => setIsAnpDrawerOpen(false)}
      />
    </div>
  );
};

export default DailyBoilerMonitoringPage;
