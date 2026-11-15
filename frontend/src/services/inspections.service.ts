import { apiRequest } from './api.client';
import { InspectionHistoryRecord, FaultHistoryRecord } from '../types/cmms.types';
import { workOrdersApiService } from './work-orders.service';

const FALLBACK_INSPECTIONS: InspectionHistoryRecord[] = [
  {
    id: 'insp-1',
    inspectionNumber: 'INSP-2026-00101',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
    inspectorName: 'Kavinda Jayasuriya',
    inspectedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    overallResult: 'conditional',
    checklistName: 'Boiler Daily Shift & Safety Checklist',
    scorePercentage: 88,
    abnormalCount: 1,
    notes: 'Flue gas temperature running slightly elevated at 205°C (benchmark <= 190°C). Water level glass clean.',
    responses: [
      { question: 'Steam drum operating pressure within 6.0 - 8.0 bar limit?', answer: '7.8 bar (PASS)', isAnomaly: false, itemCode: 'CHK-PRESS' },
      { question: 'Low Water Cutoff (LWCO) float chamber blowdown verified?', answer: 'Yes - Burner trip confirmed', isAnomaly: false, itemCode: 'CHK-LWCO' },
      { question: 'Flue gas stack temperature within 140 - 190°C nominal range?', answer: '205°C (HIGH - Soot warning)', isAnomaly: true, itemCode: 'CHK-FLUE' },
      { question: 'Feedwater pump differential pressure adequate?', answer: '12.2 bar (PASS)', isAnomaly: false, itemCode: 'CHK-PUMP' },
      { question: 'Flame scanner sight glass clean and signal stable?', answer: 'Pass - 94% signal', isAnomaly: false, itemCode: 'CHK-FLAME' },
    ],
  },
  {
    id: 'insp-2',
    inspectionNumber: 'INSP-2026-00098',
    assetId: 'a2000000-0000-0000-0000-000000000002',
    assetCode: 'P-001',
    assetName: 'Multi-Stage Centrifugal Feedwater Pump',
    inspectorName: 'Ruwan Perera',
    inspectedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    overallResult: 'pass',
    checklistName: 'Rotating Equipment Daily Vibration & Gland Checklist',
    scorePercentage: 100,
    abnormalCount: 0,
    notes: 'Bearing temperature normal at 48°C. Gland leakage within acceptable drip limits.',
    responses: [
      { question: 'Drive-end bearing temperature < 65°C?', answer: '48.2°C (PASS)', isAnomaly: false, itemCode: 'CHK-TEMP-DE' },
      { question: 'Vibration velocity RMS < 2.8 mm/s?', answer: '1.4 mm/s (PASS)', isAnomaly: false, itemCode: 'CHK-VIB-RMS' },
      { question: 'Mechanical seal flush flow established?', answer: 'Normal circulation', isAnomaly: false, itemCode: 'CHK-FLUSH' },
    ],
  },
  {
    id: 'insp-3',
    inspectionNumber: 'INSP-2026-00092',
    assetId: 'a3000000-0000-0000-0000-000000000003',
    assetCode: 'CHL-001',
    assetName: '500-Ton Water-Cooled Centrifugal Chiller',
    inspectorName: 'Dr. Nalin Fernando',
    inspectedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    overallResult: 'pass',
    checklistName: 'Chiller Plant Energy & Pressure Ratio Weekly Log',
    scorePercentage: 96,
    abnormalCount: 0,
    notes: 'Approach temperature at 1.8°C. Oil differential pressure normal at 2.4 bar.',
    responses: [
      { question: 'Evaporator leaving chilled water temp at 7.0°C ± 0.5?', answer: '6.9°C (PASS)', isAnomaly: false, itemCode: 'CHK-CHW-LEAVE' },
      { question: 'Condenser approach temperature < 2.5°C?', answer: '1.8°C (PASS)', isAnomaly: false, itemCode: 'CHK-COND-APP' },
      { question: 'Compressor discharge superheat within 8 - 14 K?', answer: '10.5 K (PASS)', isAnomaly: false, itemCode: 'CHK-SUPERHEAT' },
    ],
  },
  {
    id: 'insp-4',
    inspectionNumber: 'INSP-2026-00085',
    assetId: 'a4000000-0000-0000-0000-000000000004',
    assetCode: 'GEN-001',
    assetName: '1,250 kVA Standby Diesel Generator',
    inspectorName: 'Ruwan Perera',
    inspectedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    overallResult: 'fail',
    checklistName: 'Standby Generator Weekly Readiness Inspection',
    scorePercentage: 75,
    abnormalCount: 2,
    notes: 'Starting battery bank 2 voltage low at 22.1V. Block heater thermostat tripped.',
    responses: [
      { question: 'Battery bank 1 & 2 float voltage > 26.5V DC?', answer: 'Bank 1: 27.2V | Bank 2: 22.1V (FAIL)', isAnomaly: true, itemCode: 'CHK-BATT-V' },
      { question: 'Engine jacket water pre-heater operational (>40°C)?', answer: 'Heater cold - Thermostat trip (FAIL)', isAnomaly: true, itemCode: 'CHK-HEATER' },
      { question: 'Fuel day tank level > 85% full?', answer: '92% full (PASS)', isAnomaly: false, itemCode: 'CHK-FUEL-LVL' },
    ],
  },
];

const FALLBACK_FAULTS: FaultHistoryRecord[] = [
  {
    id: 'flt-1',
    faultCode: 'FLT-2026-00042',
    assetId: 'a4000000-0000-0000-0000-000000000004',
    assetCode: 'GEN-001',
    assetName: '1,250 kVA Standby Diesel Generator',
    severity: 'critical',
    symptoms: 'Starting battery bank 2 failed float charge holding capacity (measured 22.1V DC). Starter motor crank relay dropped out during test.',
    reportedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    reportedByName: 'Ruwan Perera (Mechanical Tech)',
    linkedWorkOrderId: 'wo-4',
    linkedWorkOrderNumber: 'WO-2026-00004',
    resolutionStatus: 'work_order_created',
    downtimeMinutes: 0,
    notes: 'Work Order WO-2026-00004 dispatched for immediate battery cell conductance test and charger replacement.',
  },
  {
    id: 'flt-2',
    faultCode: 'FLT-2026-00039',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
    severity: 'high',
    symptoms: 'Stack exhaust gas temperature excursion to 215°C under 70% firing rate. Indicates fireside tube soot deposition.',
    reportedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    reportedByName: 'Kavinda Jayasuriya (Operator)',
    linkedWorkOrderId: 'wo-1',
    linkedWorkOrderNumber: 'WO-2026-00001',
    resolutionStatus: 'work_order_created',
    downtimeMinutes: 0,
    notes: 'ANP Decision Support evaluated recommendation PMA_1 (Fireside Tube Cleaning) with 0.92 composite priority.',
  },
  {
    id: 'flt-3',
    faultCode: 'FLT-2026-00031',
    assetId: 'a2000000-0000-0000-0000-000000000002',
    assetCode: 'P-001',
    assetName: 'Multi-Stage Centrifugal Feedwater Pump',
    severity: 'medium',
    symptoms: 'Drive-end mechanical seal dripping hot demineralized water at 15 drops/min onto baseplate.',
    reportedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    reportedByName: 'Kavinda Jayasuriya (Operator)',
    linkedWorkOrderId: 'wo-2',
    linkedWorkOrderNumber: 'WO-2026-00002',
    resolutionStatus: 'work_order_created',
    downtimeMinutes: 0,
    notes: 'Seal overhaul work order issued.',
  },
  {
    id: 'flt-4',
    faultCode: 'FLT-2026-00025',
    assetId: 'a5000000-0000-0000-0000-000000000005',
    assetCode: 'AHU-001',
    assetName: 'Central Lobby Air Handling Unit',
    severity: 'low',
    symptoms: 'Supply air blower V-belt squeal upon VFD acceleration to 50 Hz. Belt deflection measured > 22mm.',
    reportedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    reportedByName: 'Ruwan Perera (Technician)',
    linkedWorkOrderId: null,
    resolutionStatus: 'resolved',
    downtimeMinutes: 45,
    notes: 'Tension adjusted and motor alignment re-checked. Sound eliminated.',
  },
];

class InspectionsApiService {
  private localInspections = [...FALLBACK_INSPECTIONS];
  private localFaults = [...FALLBACK_FAULTS];

  async listInspections(filters?: {
    assetId?: string;
    result?: string;
    search?: string;
  }): Promise<InspectionHistoryRecord[]> {
    try {
      const res = await apiRequest<{ inspections: InspectionHistoryRecord[] }>('/api/inspections');
      if (res.data?.inspections && res.data.inspections.length > 0) {
        return res.data.inspections;
      }
    } catch {
      // Fallback
    }

    let items = [...this.localInspections];
    if (filters?.assetId && filters.assetId !== 'ALL') {
      items = items.filter((i) => i.assetId === filters.assetId);
    }
    if (filters?.result && filters.result !== 'ALL') {
      items = items.filter((i) => i.overallResult === filters.result);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.inspectionNumber.toLowerCase().includes(q) ||
          i.assetCode.toLowerCase().includes(q) ||
          i.assetName.toLowerCase().includes(q) ||
          i.inspectorName.toLowerCase().includes(q)
      );
    }
    return items;
  }

  async listFaults(filters?: {
    severity?: string;
    status?: string;
    search?: string;
  }): Promise<FaultHistoryRecord[]> {
    let items = [...this.localFaults];
    if (filters?.severity && filters.severity !== 'ALL') {
      items = items.filter((f) => f.severity === filters.severity);
    }
    if (filters?.status && filters.status !== 'ALL') {
      items = items.filter((f) => f.resolutionStatus === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (f) =>
          f.faultCode.toLowerCase().includes(q) ||
          f.assetCode.toLowerCase().includes(q) ||
          f.symptoms.toLowerCase().includes(q) ||
          f.reportedByName.toLowerCase().includes(q)
      );
    }
    return items;
  }

  async createWorkOrderFromFault(
    faultId: string
  ): Promise<{ workOrderId: string; workOrderNumber: string; message: string }> {
    const fault = this.localFaults.find((f) => f.id === faultId);
    if (!fault) throw new Error(`Fault record '${faultId}' not found.`);

    const createdWo = await workOrdersApiService.createWorkOrder({
      title: `[Fault Corrective] ${fault.assetCode} - ${fault.faultCode}`,
      description: `Corrective Work Order generated from Fault Log: ${fault.symptoms}`,
      assetId: fault.assetId,
      priority: fault.severity === 'critical' ? 'urgent' : fault.severity === 'high' ? 'high' : 'medium',
      estimatedHours: 3.0,
    });

    fault.linkedWorkOrderId = createdWo.id;
    fault.linkedWorkOrderNumber = createdWo.workOrderNumber;
    fault.resolutionStatus = 'work_order_created';

    return {
      workOrderId: createdWo.id,
      workOrderNumber: createdWo.workOrderNumber,
      message: `Corrective Work Order ${createdWo.workOrderNumber} created from fault report ${fault.faultCode}.`,
    };
  }
}

export const inspectionsApiService = new InspectionsApiService();
