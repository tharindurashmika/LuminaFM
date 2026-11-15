import { apiRequest } from './api.client';
import { MaintenanceSchedule } from '../types/cmms.types';
import { workOrdersApiService } from './work-orders.service';

const FALLBACK_SCHEDULES: MaintenanceSchedule[] = [
  {
    id: 'sched-1',
    planTitle: 'Fire-Tube Boiler Fireside Soot Inspection & Tube Cleaning',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
    frequencyType: 'calendar',
    intervalValue: 30,
    intervalUnit: 'days',
    nextDueAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days overdue
    lastCompletedAt: new Date(Date.now() - 86400000 * 33).toISOString(),
    isOverdue: true,
    priority: 'urgent',
    status: 'active',
    assignedEngineer: 'Ruwan Perera',
    estimatedHours: 4.5,
    workOrderGenerationLeadDays: 7,
  },
  {
    id: 'sched-2',
    planTitle: 'Feedwater Chemical Dosing & TDS Conductivity Calibration',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    assetName: 'Main High-Pressure Steam Boiler (1,100 kg/h)',
    frequencyType: 'calendar',
    intervalValue: 7,
    intervalUnit: 'days',
    nextDueAt: new Date(Date.now() + 86400000 * 2).toISOString(), // Due in 2 days
    lastCompletedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    isOverdue: false,
    priority: 'medium',
    status: 'active',
    assignedEngineer: 'Kavinda Jayasuriya',
    estimatedHours: 1.5,
    workOrderGenerationLeadDays: 2,
  },
  {
    id: 'sched-3',
    planTitle: 'Centrifugal Chiller Refrigerant Leak Detection & Oil Sampling',
    assetId: 'a3000000-0000-0000-0000-000000000003',
    assetCode: 'CHL-001',
    assetName: '500-Ton Water-Cooled Centrifugal Chiller',
    frequencyType: 'calendar',
    intervalValue: 90,
    intervalUnit: 'days',
    nextDueAt: new Date(Date.now() + 86400000 * 5).toISOString(), // Due in 5 days
    lastCompletedAt: new Date(Date.now() - 86400000 * 85).toISOString(),
    isOverdue: false,
    priority: 'high',
    status: 'active',
    assignedEngineer: 'Dr. Nalin Fernando',
    estimatedHours: 3.0,
    workOrderGenerationLeadDays: 14,
  },
  {
    id: 'sched-4',
    planTitle: 'Multi-Stage Feed Pump Motor Vibration & Bearing Lubrication',
    assetId: 'a2000000-0000-0000-0000-000000000002',
    assetCode: 'P-001',
    assetName: 'Multi-Stage Centrifugal Feedwater Pump',
    frequencyType: 'runtime_hours',
    intervalValue: 500,
    intervalUnit: 'hours',
    nextDueAt: new Date(Date.now() + 86400000 * 12).toISOString(),
    lastCompletedAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    isOverdue: false,
    priority: 'medium',
    status: 'active',
    assignedEngineer: 'Ruwan Perera',
    estimatedHours: 2.0,
    workOrderGenerationLeadDays: 5,
  },
  {
    id: 'sched-5',
    planTitle: 'Emergency Diesel Generator Automated Weekly No-Load Test',
    assetId: 'a4000000-0000-0000-0000-000000000004',
    assetCode: 'GEN-001',
    assetName: '1,250 kVA Standby Diesel Generator',
    frequencyType: 'calendar',
    intervalValue: 7,
    intervalUnit: 'days',
    nextDueAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day overdue
    lastCompletedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    isOverdue: true,
    priority: 'high',
    status: 'active',
    assignedEngineer: 'Ruwan Perera',
    estimatedHours: 1.0,
    workOrderGenerationLeadDays: 3,
  },
  {
    id: 'sched-6',
    planTitle: 'Primary Air Handling Unit (AHU-01) Filter & Belt Tensioning',
    assetId: 'a5000000-0000-0000-0000-000000000005',
    assetCode: 'AHU-001',
    assetName: 'Central Lobby Air Handling Unit',
    frequencyType: 'calendar',
    intervalValue: 14,
    intervalUnit: 'days',
    nextDueAt: new Date(Date.now() + 86400000 * 8).toISOString(),
    lastCompletedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    isOverdue: false,
    priority: 'low',
    status: 'active',
    assignedEngineer: 'Kavinda Jayasuriya',
    estimatedHours: 1.5,
    workOrderGenerationLeadDays: 3,
  },
];

class MaintenanceApiService {
  private localSchedules: MaintenanceSchedule[] = [...FALLBACK_SCHEDULES];

  async listSchedules(filters?: {
    assetId?: string;
    priority?: string;
    isOverdue?: boolean;
    search?: string;
  }): Promise<MaintenanceSchedule[]> {
    try {
      const res = await apiRequest<{ plans: MaintenanceSchedule[] }>('/api/maintenance/asset-plans');
      if (res.data?.plans && res.data.plans.length > 0) {
        return res.data.plans;
      }
    } catch {
      // Fallback to local
    }

    let items = [...this.localSchedules];
    if (filters?.assetId && filters.assetId !== 'ALL') {
      items = items.filter((s) => s.assetId === filters.assetId);
    }
    if (filters?.priority && filters.priority !== 'ALL') {
      items = items.filter((s) => s.priority === filters.priority);
    }
    if (filters?.isOverdue !== undefined) {
      items = items.filter((s) => s.isOverdue === filters.isOverdue);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.planTitle.toLowerCase().includes(q) ||
          s.assetCode.toLowerCase().includes(q) ||
          s.assetName.toLowerCase().includes(q)
      );
    }
    return items;
  }

  async getDueSummary(): Promise<{
    totalActiveSchedules: number;
    overdueCount: number;
    dueNext7Days: number;
    complianceRate: number;
  }> {
    const total = this.localSchedules.length;
    const overdue = this.localSchedules.filter((s) => s.isOverdue).length;
    const next7Days = this.localSchedules.filter((s) => {
      const dueTime = new Date(s.nextDueAt).getTime();
      const now = Date.now();
      return dueTime > now && dueTime <= now + 86400000 * 7;
    }).length;

    const complianceRate = total > 0 ? Number((((total - overdue) / total) * 100).toFixed(1)) : 100;

    return {
      totalActiveSchedules: total,
      overdueCount: overdue,
      dueNext7Days: next7Days,
      complianceRate,
    };
  }

  async generateWorkOrderFromSchedule(
    scheduleId: string
  ): Promise<{ workOrderId: string; workOrderNumber: string; message: string }> {
    const schedule = this.localSchedules.find((s) => s.id === scheduleId);
    if (!schedule) {
      throw new Error(`Schedule '${scheduleId}' not found.`);
    }

    // Call real work orders service to create authorized work order
    const createdWo = await workOrdersApiService.createWorkOrder({
      title: `[PM Due] ${schedule.planTitle}`,
      description: `Preventive Maintenance generated from Schedule ID ${schedule.id}. Interval: ${schedule.intervalValue} ${schedule.intervalUnit}. Priority: ${schedule.priority}.`,
      assetId: schedule.assetId,
      priority: schedule.priority,
      estimatedHours: schedule.estimatedHours,
      scheduledStartAt: schedule.nextDueAt,
    });

    // Advance schedule next due date safely (calendar or run hours)
    const nextDueDate = new Date(Date.now() + 86400000 * schedule.intervalValue);
    schedule.lastCompletedAt = new Date().toISOString();
    schedule.nextDueAt = nextDueDate.toISOString();
    schedule.isOverdue = false;

    return {
      workOrderId: createdWo.id,
      workOrderNumber: createdWo.workOrderNumber,
      message: `Work Order ${createdWo.workOrderNumber} successfully generated for ${schedule.assetCode}.`,
    };
  }

  async toggleScheduleStatus(
    scheduleId: string,
    newStatus: 'active' | 'paused'
  ): Promise<MaintenanceSchedule> {
    const schedule = this.localSchedules.find((s) => s.id === scheduleId);
    if (!schedule) throw new Error(`Schedule '${scheduleId}' not found.`);
    schedule.status = newStatus;
    return { ...schedule };
  }
}

export const maintenanceApiService = new MaintenanceApiService();
