import { MaintenanceCostReport } from '../types/cmms.types';

export interface OverviewKpiMetrics {
  totalAssets: number;
  activeWorkOrders: number;
  openFaults: number;
  pmComplianceRate: number; // e.g. 96.5%
  totalMaintenanceSpendMtd: number; // in base currency
  currency: string;
  mtbfHours: number; // Mean Time Between Failures
  activeCriticalAlerts: number;
}

const FALLBACK_COST_REPORT: MaintenanceCostReport = {
  period: 'Current Fiscal Year (2026)',
  currency: 'LKR',
  totalCost: 1845000,
  laborCost: 620000,
  partsCost: 895000,
  contractorCost: 330000,
  preventiveSpend: 1328400,
  correctiveSpend: 516600,
  preventiveRatio: 72.0, // 72% PM vs 28% CM (meets industry best-practice of >70%)
  categoryBreakdown: [
    { categoryName: 'Steam Boilers & Pressure Vessels', totalCost: 685000, percentage: 37.1, workOrderCount: 14 },
    { categoryName: 'Chillers & Refrigeration Plants', totalCost: 490000, percentage: 26.6, workOrderCount: 8 },
    { categoryName: 'Emergency Diesel Generators', totalCost: 340000, percentage: 18.4, workOrderCount: 9 },
    { categoryName: 'Centrifugal Pumps & Hydronics', totalCost: 210000, percentage: 11.4, workOrderCount: 12 },
    { categoryName: 'Air Handling Units & HVAC', totalCost: 120000, percentage: 6.5, workOrderCount: 7 },
  ],
  topCostAssets: [
    { assetId: 'a1000000-0000-0000-0000-000000000001', assetCode: 'BLR-001', assetName: 'Main High-Pressure Steam Boiler (1,100 kg/h)', totalSpend: 685000, correctiveCount: 3, mtbfHours: 1420 },
    { assetId: 'a3000000-0000-0000-0000-000000000003', assetCode: 'CHL-001', assetName: '500-Ton Water-Cooled Centrifugal Chiller', totalSpend: 490000, correctiveCount: 2, mtbfHours: 2150 },
    { assetId: 'a4000000-0000-0000-0000-000000000004', assetCode: 'GEN-001', assetName: '1,250 kVA Standby Diesel Generator', totalSpend: 340000, correctiveCount: 2, mtbfHours: 890 },
    { assetId: 'a2000000-0000-0000-0000-000000000002', assetCode: 'P-001', assetName: 'Multi-Stage Centrifugal Feedwater Pump', totalSpend: 210000, correctiveCount: 4, mtbfHours: 1180 },
    { assetId: 'a5000000-0000-0000-0000-000000000005', assetCode: 'AHU-001', assetName: 'Central Lobby Air Handling Unit', totalSpend: 120000, correctiveCount: 1, mtbfHours: 3200 },
  ],
  monthlyTrends: [
    { month: 'Jan', labor: 145000, parts: 195000, total: 340000, budget: 350000 },
    { month: 'Feb', labor: 130000, parts: 180000, total: 310000, budget: 350000 },
    { month: 'Mar', labor: 160000, parts: 240000, total: 400000, budget: 350000 },
    { month: 'Apr', labor: 125000, parts: 170000, total: 295000, budget: 350000 },
    { month: 'May (MTD)', labor: 60000, parts: 110000, total: 170000, budget: 350000 },
  ],
};

const FALLBACK_KPI_METRICS: OverviewKpiMetrics = {
  totalAssets: 48,
  activeWorkOrders: 4,
  openFaults: 2,
  pmComplianceRate: 96.2,
  totalMaintenanceSpendMtd: 170000,
  currency: 'LKR',
  mtbfHours: 1768,
  activeCriticalAlerts: 1,
};

class AnalyticsApiService {
  async getMaintenanceCostReport(_period?: string): Promise<MaintenanceCostReport> {
    return FALLBACK_COST_REPORT;
  }

  async getOverviewKpiMetrics(): Promise<OverviewKpiMetrics> {
    return FALLBACK_KPI_METRICS;
  }
}

export const analyticsApiService = new AnalyticsApiService();
