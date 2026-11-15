/**
 * Specialized Boiler Maintenance Module - Type Definitions
 *
 * Scope: Industrial Oil-Fired Fire-Tube Steam Boilers (1,000 - 1,800 kg/h)
 * Dissertation Baseline: Vishal Perera, June 2025.
 */

export interface BoilerSpecificationsDto {
  boilerType: 'OIL_FIRED_FIRE_TUBE' | 'FIRE_TUBE';
  steamCapacityKgPerHour: number; // Must be strictly between 1,000 and 1,800
  nominalOperatingPressureBar?: number; // e.g. 8.5 bar (nominal 8.0 - 9.0)
  designPressureBar?: number; // e.g. 10.5 bar
  safetyValveSetPressureBar?: number; // e.g. 9.0 - 10.0 bar
  fuelType: 'HEAVY_FUEL_OIL_180_CST' | 'FURNACE_OIL' | 'DIESEL_AUTO_DIESEL' | 'OIL_FIRED';
  burnerModel?: string; // e.g. 'Riello Press 140 T/G'
  heatingSurfaceAreaSqm?: number; // e.g. 24.5 m²
  feedWaterTankCapacityLiters?: number; // e.g. 3,500 L
  feedPumpModel?: string; // e.g. 'Grundfos CRN 3-19'
  waterTreatmentSpec?: string; // e.g. 'Cation exchange softener + sodium sulfite'
  economizerInstalled?: boolean;
  notes?: string;
}

export interface BoilerProfileResponse {
  assetId: string;
  assetCode: string;
  assetName: string;
  siteId: string;
  locationId: string;
  status: string;
  specifications: BoilerSpecificationsDto;
  physicalSubsystems: typeof import('./boiler.constants').BOILER_PHYSICAL_SUBSYSTEMS;
  configuredMeasurementPoints: Record<string, import('./boiler.constants').BoilerMeasurementPointDefinition>;
  walkthroughCheckpoints: typeof import('./boiler.constants').BOILER_WALKTHROUGH_CHECKPOINTS;
  recentReadingsSummary?: Record<string, number | null>;
  totalFaultsCount: number;
  openWorkOrdersCount: number;
}

export type BoilerShift = 'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C';

export interface BoilerMeasurementReadingInput {
  parameterCode: string;
  value: number;
  unit?: string;
  notes?: string;
}

export interface SubmitBoilerShiftLogDto {
  logDate: string; // YYYY-MM-DD
  shift: BoilerShift; // SHIFT_A (06:00-14:00), SHIFT_B (14:00-22:00), SHIFT_C (22:00-06:00)
  logTime: string; // e.g. '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00', '06:00'
  operatorUserId?: string;
  operatorNotes?: string;
  readings: Record<string, number> | BoilerMeasurementReadingInput[];
  walkthroughResults?: Record<string, string>;
  evidenceUris?: string[];
  autoEvaluateAnp?: boolean; // Default true
}

export interface BoilerAnomalyDetectionResult {
  parameterCode: string;
  parameterName: string;
  observedValue: number;
  unit: string;
  thresholdOperator: string;
  thresholdValue: number;
  deviationDescription: string;
  thematicMaintenanceAction: string;
  severity: 'WARNING' | 'CRITICAL';
}

export interface BoilerShiftLogResponse {
  id: string;
  assetId: string;
  logDate: string;
  shift: BoilerShift;
  logTime: string;
  loggedAt: string;
  operatorUserId?: string | null;
  readings: Record<string, { value: number; unit: string; inNominalRange: boolean }>;
  anomaliesDetected: BoilerAnomalyDetectionResult[];
  inspectionId?: string | null;
  anpEvaluationsTriggered: number;
  operatorNotes?: string | null;
}

export interface SubmitBoilerWalkthroughDto {
  inspectionDate: string; // YYYY-MM-DD
  shift: BoilerShift;
  inspectorUserId?: string;
  checkpoints: Record<string, string>; // e.g. { SIGHT_GLASS_LEVEL: 'NORMAL_CENTRELINE', BURNER_FLAME_APPEARANCE: 'BRIGHT_YELLOW_STABLE' }
  notes?: string;
  photoAttachments?: string[]; // Storage URIs
}

export interface LogBoilerObservationDto {
  observationDate?: string; // ISO or YYYY-MM-DD
  shift?: BoilerShift;
  category: 'COMBUSTION' | 'WATER_LEVEL' | 'ACOUSTIC_LEAK' | 'REFRACTORY' | 'CHEMICAL' | 'GENERAL';
  severity?: 'INFO' | 'ADVISORY' | 'WARNING';
  observationText: string;
  observerUserId?: string;
  attachmentUris?: string[];
}

export interface ReportBoilerFaultDto {
  subsystemCode: string; // e.g. 'FUEL_AND_COMBUSTION_SYSTEM', 'FEED_WATER_SYSTEM'
  componentCode?: string; // e.g. 'BURNER_ASSEMBLY', 'FEED_PUMP'
  symptom: string;
  suspectedCause?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  faultCode?: string;
  downtimeMinutes?: number;
  autoCreateWorkOrder?: boolean; // Automatically generate a work order for high/critical faults
  attachmentUris?: string[];
}

export interface BoilerMaintenanceHistoryResponse {
  assetId: string;
  assetCode: string;
  boilerName: string;
  specifications: BoilerSpecificationsDto;
  cumulativeMetrics: {
    cumulativeBurnerHours: number;
    cumulativeFeedPumpHours: number;
    averageOperatingPressureBar: number;
    averageFlueGasTempDegC: number;
    totalRecordedLogsCount: number;
  };
  workOrders: Array<{
    id: string;
    workOrderNumber: string;
    title: string;
    maintenanceType?: string;
    status: string;
    priority: string;
    actualCost: number;
    actualLaborHours: number;
    createdAt: string;
    completedAt?: string | null;
  }>;
  faultHistory: Array<{
    id: string;
    faultNumber: string;
    detectedAt: string;
    severity: string;
    status: string;
    symptom: string;
    subsystemCode?: string | null;
    downtimeMinutes?: number | null;
    resolvedAt?: string | null;
  }>;
  recentInspections: Array<{
    id: string;
    inspectionNumber: string;
    completedAt?: string | null;
    overallResult?: string | null;
    notes?: string | null;
  }>;
}

export interface AttachBoilerEvidenceDto {
  fileName: string;
  storageUri: string;
  mimeType?: string;
  fileSizeBytes?: number;
  entityType?: 'boiler' | 'shift_log' | 'inspection' | 'fault_log';
  entityId?: string; // Defaults to assetId if omitted
}

// =============================================================================
// COMPREHENSIVE DAILY LOGBOOK, INSPECTION WORKFLOW & TRACEABLE AMENDMENTS
// =============================================================================

export type LogbookStatus = 'draft' | 'completed';
export type ReadingSourceType = 'manual' | 'iot' | 'scada' | 'calculated';

export interface StoredOperationalReading {
  id: string;
  parameterCode: string;
  parameterName: string;
  value: number;
  unit: string;
  source: ReadingSourceType;
  recordedAt: string;
  operatorId?: string | null;
  operatorName?: string | null;
  notes?: string | null;
  isAmended: boolean;
  amendmentCount: number;
  nominalRange: { min: number; max: number };
  physicalRange: { min: number; max: number };
  inNominalRange: boolean;
  benchmarkBreached: boolean;
  thematicAction?: string | null;
}

export interface ChecklistResponseRecord {
  id: string;
  checklistItemId?: string;
  checkpointCode: string;
  name: string;
  responseValue: string | number | boolean;
  resultStatus: 'pass' | 'fail' | 'observation' | 'not_applicable';
  notes?: string | null;
  evidenceUri?: string | null;
}

export interface OperationalObservationRecord {
  id: string;
  category: string;
  severity: string;
  observationText: string;
  recordedAt: string;
  observerUserId?: string | null;
  attachmentUris: string[];
}

export interface TraceableAmendmentRecord {
  id: string;
  logbookId: string;
  readingId?: string;
  parameterCode: string;
  parameterName: string;
  originalValue: number;
  amendedValue: number;
  unit: string;
  reason: string; // STRICTLY MANDATORY
  amendedBy: string;
  amendedByName?: string;
  amendedAt: string;
  evidenceUri?: string | null;
}

export interface SaveDailyLogbookDto {
  assetId: string;
  logDate: string; // YYYY-MM-DD
  shift: BoilerShift; // SHIFT_A | SHIFT_B | SHIFT_C
  operatingPeriod: string; // e.g. '08:00', '10:00', '12:00', etc.
  status?: LogbookStatus; // 'draft' (incomplete ok) or 'completed' (validates required measurements)
  readings: Record<string, number> | Array<{ parameterCode: string; value: number; unit?: string; notes?: string; source?: ReadingSourceType }>;
  checklists?: Record<string, string | number | boolean>;
  observations?: Array<{
    category: string;
    severity?: string;
    observationText: string;
    attachmentUris?: string[];
  }>;
  attachments?: Array<{
    fileName: string;
    storageUri: string;
    mimeType?: string;
    caption?: string;
  }>;
  operatorNotes?: string;
  autoEvaluateAnp?: boolean; // Default true on completed submission
  clientSubmissionId?: string; // Idempotency key (UUIDv4) for safe offline retries
  baseVersion?: number; // Base version for optimistic concurrency conflict detection
}

export interface AmendLogbookReadingDto {
  readingId?: string;
  parameterCode: string;
  amendedValue: number;
  reason: string; // MANDATORY: Explicit justification for why the record is amended
  evidenceUri?: string;
}

export interface DailyLogbookFilterParams {
  assetId?: string;
  startDate?: string;
  endDate?: string;
  shift?: BoilerShift;
  status?: LogbookStatus | 'all';
  operatorId?: string;
}

export interface DailyLogbookSummaryItem {
  id: string;
  logNumber: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  status: LogbookStatus;
  shift: BoilerShift;
  operatingPeriod: string;
  logDate: string;
  recordedAt: string;
  completedAt?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  totalReadingsCount: number;
  anomaliesCount: number;
  amendmentsCount: number;
  overallResult?: string | null;
  operatorNotes?: string | null;
}

export interface DetailedDailyLogbookResponse {
  id: string;
  logNumber: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  status: LogbookStatus;
  shift: BoilerShift;
  operatingPeriod: string;
  logDate: string;
  createdAt: string;
  completedAt?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  operatorNotes?: string | null;
  overallResult?: string | null;
  readings: StoredOperationalReading[];
  checklists: ChecklistResponseRecord[];
  observations: OperationalObservationRecord[];
  attachments: Array<{
    id: string;
    fileName: string;
    storageUri: string;
    mimeType?: string;
    caption?: string;
    uploadedAt: string;
  }>;
  amendments: TraceableAmendmentRecord[];
  anomalies: BoilerAnomalyDetectionResult[];
  anpSignalsSummary?: Record<string, unknown>;
  clientSubmissionId?: string;
  isIdempotentReplay?: boolean;
  version?: number;
}

