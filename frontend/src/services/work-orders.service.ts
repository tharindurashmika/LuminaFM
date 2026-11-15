import { apiRequest } from './api.client';
import { WorkOrderSummary, WorkOrderStatus, PriorityLevel } from '../types/cmms.types';

export interface WorkOrderDetail extends WorkOrderSummary {
  description?: string | null;
  scheduledEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  assignedUser?: { id: string; fullName: string; email: string } | null;
  tasks: Array<{
    id: string;
    description: string;
    sequenceNo: number;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    estimatedHours?: number;
    actualHours?: number;
  }>;
  laborEntries: Array<{
    id: string;
    technicianName: string;
    hours: number;
    hourlyRate: number;
    totalLaborCost: number;
    loggedAt: string;
  }>;
  partsConsumed: Array<{
    id: string;
    partNumber: string;
    partName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: WorkOrderStatus;
    toStatus: WorkOrderStatus;
    changedAt: string;
    changedByName: string;
    reason?: string | null;
  }>;
  costs: {
    laborCost: number;
    partsCost: number;
    contractorCost: number;
    totalCost: number;
  };
}

export interface CreateWorkOrderDto {
  title: string;
  description?: string;
  assetId?: string;
  priority: PriorityLevel;
  maintenanceTypeId?: string;
  scheduledStartAt?: string;
  estimatedHours?: number;
}

const FALLBACK_WORK_ORDERS: WorkOrderDetail[] = [
  {
    id: 'wo-1',
    workOrderNumber: 'WO-2026-00001',
    title: 'High-Pressure Steam Boiler Safety Valve Pop-Test & Calibration',
    description: 'Quarterly mechanical calibration of twin safety pop relief valves per ASME BPVC Section I. Check seat sealing and record pop pressure.',
    priority: 'urgent',
    status: 'in_progress',
    site: { id: 'site-1', code: 'COLOMBO-SITE', name: 'Colombo Grand Hospitality Complex' },
    asset: { id: 'a1000000-0000-0000-0000-000000000001', assetCode: 'BLR-001', name: 'Main High-Pressure Steam Boiler (1,100 kg/h)' },
    maintenanceType: { id: 'mt-1', code: 'CALIB', name: 'Regulatory Calibration' },
    scheduledStartAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    assignedUser: { id: 'u-1', fullName: 'Ruwan Perera', email: 'tech.mechanical@colombohotel.lk' },
    tasks: [
      { id: 't-1', sequenceNo: 1, description: 'Isolate safety valve test bench and connect certified master gauge', status: 'completed', estimatedHours: 1, actualHours: 0.8 },
      { id: 't-2', sequenceNo: 2, description: 'Slowly ramp pressure to 10.5 bar pop limit and record trip point', status: 'in_progress', estimatedHours: 1.5, actualHours: 1.0 },
      { id: 't-3', sequenceNo: 3, description: 'Inspect disc and seat for pitting or wire-drawing; re-seal tamper wire', status: 'pending', estimatedHours: 1 },
    ],
    laborEntries: [
      { id: 'l-1', technicianName: 'Ruwan Perera (Lead Tech)', hours: 2.5, hourlyRate: 35, totalLaborCost: 87.5, loggedAt: new Date().toISOString() },
    ],
    partsConsumed: [
      { id: 'p-1', partNumber: 'SV-SEAL-01', partName: 'High-Temp Fluorocarbon Valve O-Ring Kit', quantity: 2, unitCost: 45, totalCost: 90 },
      { id: 'p-2', partNumber: 'WIRE-SEAL-PB', partName: 'Lead Tamper Wire Inspection Seal', quantity: 1, unitCost: 12, totalCost: 12 },
    ],
    statusHistory: [
      { id: 'sh-1', fromStatus: 'draft', toStatus: 'approved', changedAt: new Date(Date.now() - 86400000).toISOString(), changedByName: 'Chief Engineer Arjun', reason: 'Approved for quarterly statutory window' },
      { id: 'sh-2', fromStatus: 'approved', toStatus: 'assigned', changedAt: new Date(Date.now() - 43200000).toISOString(), changedByName: 'Chief Engineer Arjun', reason: 'Assigned to Ruwan Perera' },
      { id: 'sh-3', fromStatus: 'assigned', toStatus: 'in_progress', changedAt: new Date(Date.now() - 7200000).toISOString(), changedByName: 'Ruwan Perera', reason: 'Test bench manifold pressurized' },
    ],
    costs: {
      laborCost: 87.5,
      partsCost: 102.0,
      contractorCost: 0,
      totalCost: 189.5,
    },
  },
  {
    id: 'wo-2',
    workOrderNumber: 'WO-2026-00002',
    title: 'Centrifugal Feedwater Pump Mechanical Seal Overhaul',
    description: 'Primary boiler feed pump showing minor gland leakage (5 drops/min). Replace tungsten carbide mechanical seal and check bearing vibration.',
    priority: 'high',
    status: 'approved',
    site: { id: 'site-1', code: 'COLOMBO-SITE', name: 'Colombo Grand Hospitality Complex' },
    asset: { id: 'a2000000-0000-0000-0000-000000000002', assetCode: 'P-001', name: 'Multi-Stage Centrifugal Feedwater Pump' },
    maintenanceType: { id: 'mt-2', code: 'PREV', name: 'Preventive Overhaul' },
    scheduledStartAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    assignedUser: { id: 'u-2', fullName: 'Kavinda Jayasuriya', email: 'operator.shift1@colombohotel.lk' },
    tasks: [
      { id: 't-21', sequenceNo: 1, description: 'Lockout/Tagout pump motor feeder breaker at MCC panel', status: 'pending', estimatedHours: 0.5 },
      { id: 't-22', sequenceNo: 2, description: 'Decouple pump from motor; extract worn mechanical seal cartridge', status: 'pending', estimatedHours: 2.0 },
      { id: 't-23', sequenceNo: 3, description: 'Install new silicon carbide seal faces and perform shaft alignment', status: 'pending', estimatedHours: 1.5 },
    ],
    laborEntries: [],
    partsConsumed: [
      { id: 'p-21', partNumber: 'SEAL-GRUND-32', partName: 'Tungsten Carbide Mechanical Cartridge Seal 32mm', quantity: 1, unitCost: 280, totalCost: 280 },
    ],
    statusHistory: [
      { id: 'sh-21', fromStatus: 'draft', toStatus: 'approved', changedAt: new Date(Date.now() - 3600000 * 5).toISOString(), changedByName: 'Dr. Nalin Fernando', reason: 'Vibration report recommended preemptive seal swap' },
    ],
    costs: {
      laborCost: 0,
      partsCost: 280.0,
      contractorCost: 0,
      totalCost: 280.0,
    },
  },
  {
    id: 'wo-3',
    workOrderNumber: 'WO-2026-00003',
    title: 'Water-Cooled Centrifugal Chiller Condenser Tube Descaling',
    description: 'Mechanical brush punch and citric acid chemical wash of 500-Ton chiller condenser tubes following thermal approach temperature rise above 2.8°C.',
    priority: 'medium',
    status: 'assigned',
    site: { id: 'site-1', code: 'COLOMBO-SITE', name: 'Colombo Grand Hospitality Complex' },
    asset: { id: 'a3000000-0000-0000-0000-000000000003', assetCode: 'CHL-001', name: '500-Ton Water-Cooled Centrifugal Chiller' },
    maintenanceType: { id: 'mt-3', code: 'PREV', name: 'Preventive Cleaning' },
    scheduledStartAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    assignedUser: { id: 'u-1', fullName: 'Ruwan Perera', email: 'tech.mechanical@colombohotel.lk' },
    tasks: [
      { id: 't-31', sequenceNo: 1, description: 'Remove water heads and inspect tubesheet for scale deposition', status: 'pending', estimatedHours: 2 },
      { id: 't-32', sequenceNo: 2, description: 'Run nylon rotary brushes through all 480 copper tubes', status: 'pending', estimatedHours: 4 },
    ],
    laborEntries: [],
    partsConsumed: [
      { id: 'p-31', partNumber: 'GASKET-HEAD-24', partName: 'Neoprene Condenser Head Gasket Set', quantity: 2, unitCost: 65, totalCost: 130 },
    ],
    statusHistory: [
      { id: 'sh-31', fromStatus: 'draft', toStatus: 'approved', changedAt: new Date(Date.now() - 86400000 * 2).toISOString(), changedByName: 'Chief Engineer Arjun' },
      { id: 'sh-32', fromStatus: 'approved', toStatus: 'assigned', changedAt: new Date(Date.now() - 86400000).toISOString(), changedByName: 'Chief Engineer Arjun' },
    ],
    costs: {
      laborCost: 0,
      partsCost: 130.0,
      contractorCost: 350.0,
      totalCost: 480.0,
    },
  },
  {
    id: 'wo-4',
    workOrderNumber: 'WO-2026-00004',
    title: 'Emergency Diesel Generator 250-Hour Periodic Service',
    description: 'Oil change, fuel filter replacement, radiator coolant density check, and 30-minute full load bank test on 1,250 kVA standby generator.',
    priority: 'high',
    status: 'completed',
    site: { id: 'site-1', code: 'COLOMBO-SITE', name: 'Colombo Grand Hospitality Complex' },
    asset: { id: 'a4000000-0000-0000-0000-000000000004', assetCode: 'GEN-001', name: '1,250 kVA Standby Diesel Generator' },
    maintenanceType: { id: 'mt-2', code: 'PREV', name: 'Preventive Overhaul' },
    scheduledStartAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    assignedUser: { id: 'u-1', fullName: 'Ruwan Perera', email: 'tech.mechanical@colombohotel.lk' },
    tasks: [
      { id: 't-41', sequenceNo: 1, description: 'Drain engine lube oil and replace spin-on oil filters', status: 'completed', estimatedHours: 1.5, actualHours: 1.2 },
      { id: 't-42', sequenceNo: 2, description: 'Replace primary/secondary fuel filters and prime fuel system', status: 'completed', estimatedHours: 1.0, actualHours: 0.9 },
      { id: 't-43', sequenceNo: 3, description: 'Simulate mains power failure and run 30-min load bank test', status: 'completed', estimatedHours: 1.5, actualHours: 1.5 },
    ],
    laborEntries: [
      { id: 'l-41', technicianName: 'Ruwan Perera', hours: 3.6, hourlyRate: 35, totalLaborCost: 126.0, loggedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
    ],
    partsConsumed: [
      { id: 'p-41', partNumber: 'OIL-15W40-DRUM', partName: 'Mobil Delvac 15W-40 Synthetic Blend (45L)', quantity: 1, unitCost: 185, totalCost: 185 },
      { id: 'p-42', partNumber: 'FILT-CUMMINS-02', partName: 'Fleetguard Dual Stage Fuel Filter Pack', quantity: 1, unitCost: 95, totalCost: 95 },
    ],
    statusHistory: [
      { id: 'sh-41', fromStatus: 'draft', toStatus: 'approved', changedAt: new Date(Date.now() - 86400000 * 6).toISOString(), changedByName: 'Chief Engineer Arjun' },
      { id: 'sh-42', fromStatus: 'approved', toStatus: 'in_progress', changedAt: new Date(Date.now() - 86400000 * 5).toISOString(), changedByName: 'Ruwan Perera' },
      { id: 'sh-43', fromStatus: 'in_progress', toStatus: 'completed', changedAt: new Date(Date.now() - 86400000 * 4).toISOString(), changedByName: 'Ruwan Perera', reason: 'Load test passed with 0.8 power factor' },
    ],
    costs: {
      laborCost: 126.0,
      partsCost: 280.0,
      contractorCost: 0,
      totalCost: 406.0,
    },
  },
];

class WorkOrdersApiService {
  private localState: WorkOrderDetail[] = [...FALLBACK_WORK_ORDERS];

  async listWorkOrders(filters?: {
    status?: string;
    priority?: string;
    assetId?: string;
    search?: string;
  }): Promise<WorkOrderSummary[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
      if (filters?.priority && filters.priority !== 'ALL') queryParams.append('priority', filters.priority);
      if (filters?.assetId && filters.assetId !== 'ALL') queryParams.append('assetId', filters.assetId);

      const res = await apiRequest<{ workOrders: WorkOrderSummary[] }>(
        `/api/work-orders?${queryParams.toString()}`
      );
      if (res.data?.workOrders && res.data.workOrders.length > 0) {
        return res.data.workOrders;
      }
    } catch {
      // Gracefully fall back to rich local state
    }

    let filtered = [...this.localState];
    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((wo) => wo.status === filters.status);
    }
    if (filters?.priority && filters.priority !== 'ALL') {
      filtered = filtered.filter((wo) => wo.priority === filters.priority);
    }
    if (filters?.assetId && filters.assetId !== 'ALL') {
      filtered = filtered.filter((wo) => wo.asset?.id === filters.assetId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (wo) =>
          wo.workOrderNumber.toLowerCase().includes(q) ||
          wo.title.toLowerCase().includes(q) ||
          wo.asset?.assetCode.toLowerCase().includes(q) ||
          wo.asset?.name.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  async getWorkOrder(id: string): Promise<WorkOrderDetail> {
    try {
      const res = await apiRequest<{ workOrder: WorkOrderDetail }>(`/api/work-orders/${id}`);
      if (res.data?.workOrder) {
        return res.data.workOrder;
      }
    } catch {
      // Fallback
    }

    const found = this.localState.find((wo) => wo.id === id);
    if (!found) {
      throw new Error(`Work order '${id}' not found in registry.`);
    }
    return found;
  }

  async createWorkOrder(dto: CreateWorkOrderDto): Promise<WorkOrderDetail> {
    const nextSeq = this.localState.length + 1;
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(nextSeq).padStart(5, '0')}`;

    const newWo: WorkOrderDetail = {
      id: `wo-${Date.now()}`,
      workOrderNumber,
      title: dto.title,
      description: dto.description || '',
      priority: dto.priority,
      status: 'draft',
      site: { id: 'site-1', code: 'COLOMBO-SITE', name: 'Colombo Grand Hospitality Complex' },
      asset: dto.assetId
        ? { id: dto.assetId, assetCode: 'AST-REF', name: 'Selected Facility Asset' }
        : null,
      maintenanceType: { id: 'mt-1', code: 'CORR', name: 'Corrective Maintenance' },
      scheduledStartAt: dto.scheduledStartAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tasks: [
        { id: `t-${Date.now()}`, sequenceNo: 1, description: 'Initial field safety risk assessment', status: 'pending', estimatedHours: dto.estimatedHours || 1 },
      ],
      laborEntries: [],
      partsConsumed: [],
      statusHistory: [
        { id: `sh-${Date.now()}`, fromStatus: 'draft', toStatus: 'draft', changedAt: new Date().toISOString(), changedByName: 'Current User', reason: 'Initial work order creation' },
      ],
      costs: {
        laborCost: 0,
        partsCost: 0,
        contractorCost: 0,
        totalCost: 0,
      },
    };

    try {
      const res = await apiRequest<{ workOrder: WorkOrderDetail }>('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (res.data?.workOrder) {
        this.localState.unshift(res.data.workOrder);
        return res.data.workOrder;
      }
    } catch {
      // Store in memory
    }

    this.localState.unshift(newWo);
    return newWo;
  }

  async transitionStatus(
    id: string,
    action: 'approve' | 'assign' | 'start' | 'hold' | 'resume' | 'complete' | 'close' | 'cancel',
    reason?: string
  ): Promise<WorkOrderDetail> {
    const statusMap: Record<string, WorkOrderStatus> = {
      approve: 'approved',
      assign: 'assigned',
      start: 'in_progress',
      hold: 'on_hold',
      resume: 'in_progress',
      complete: 'completed',
      close: 'closed',
      cancel: 'cancelled',
    };

    const targetStatus = statusMap[action];

    try {
      const res = await apiRequest<{ workOrder: WorkOrderDetail }>(`/api/work-orders/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (res.data?.workOrder) {
        return res.data.workOrder;
      }
    } catch {
      // Apply locally
    }

    const wo = this.localState.find((w) => w.id === id);
    if (!wo) throw new Error(`Work order '${id}' not found.`);

    const oldStatus = wo.status;
    wo.status = targetStatus;
    wo.statusHistory.push({
      id: `sh-${Date.now()}`,
      fromStatus: oldStatus,
      toStatus: targetStatus,
      changedAt: new Date().toISOString(),
      changedByName: 'Authorized Engineer',
      reason: reason || `Status transitioned via ${action}`,
    });

    return { ...wo };
  }
}

export const workOrdersApiService = new WorkOrdersApiService();
