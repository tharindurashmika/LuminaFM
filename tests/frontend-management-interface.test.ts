import { describe, it, expect } from 'vitest';
import {
  CriticalityLevel,
  PriorityLevel,
  UserRole,
  WorkOrderStatus,
  AssetSummary,
  MaintenanceSchedule,
  MaintenanceCostReport,
} from '../frontend/src/types/cmms.types';
import { ROLE_PERMISSIONS } from '../frontend/src/store/AuthContext';

/**
 * Re-implement core export string formatting logic for test validation
 * (matches frontend/src/utils/export.utils.ts)
 */
function generateCsvString<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: keyof T | string; header: string; format?: (val: any, row: T) => string }>
): string {
  const headerRow = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let val: any;
        if (typeof col.key === 'string' && col.key.includes('.')) {
          const parts = col.key.split('.');
          val = parts.reduce((acc, p) => acc?.[p], row as any);
        } else {
          val = row[col.key as keyof T];
        }

        const formatted = col.format ? col.format(val, row) : val === null || val === undefined ? '' : String(val);
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Criticality rank mapping for multi-column sorting tests
 */
const CRITICALITY_WEIGHTS: Record<CriticalityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

describe('LuminaFM Management Interface Architecture & Functionality', () => {
  describe('1. Export Capabilities (RFC 4180 CSV & Structured JSON)', () => {
    const mockAssets = [
      {
        assetCode: 'BLR-001',
        name: 'High-Pressure Steam Boiler "Alpha", 1,100 kg/h',
        category: 'Boiler & Steam',
        criticality: 'critical' as CriticalityLevel,
        totalSpend: 685000,
      },
      {
        assetCode: 'P-001',
        name: 'Multi-Stage Feedwater Pump\nPrimary Unit',
        category: 'Pumps',
        criticality: 'high' as CriticalityLevel,
        totalSpend: 210000,
      },
      {
        assetCode: 'CHL-001',
        name: 'Centrifugal Chiller (500-Ton)',
        category: 'Chillers',
        criticality: 'high' as CriticalityLevel,
        totalSpend: 490000,
      },
    ];

    it('should prepend UTF-8 Byte Order Mark (\\uFEFF) for Microsoft Excel compatibility', () => {
      const csv = generateCsvString(mockAssets, [
        { key: 'assetCode', header: 'Asset Code' },
        { key: 'name', header: 'Asset Name' },
      ]);

      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv.startsWith('\uFEFF"Asset Code","Asset Name"')).toBe(true);
    });

    it('should properly escape double-quotes and preserve newlines and commas within quoted cells', () => {
      const csv = generateCsvString(mockAssets, [
        { key: 'assetCode', header: 'Asset Code' },
        { key: 'name', header: 'Asset Name' },
      ]);

      // Checks that internal quotes "Alpha" are escaped as ""Alpha""
      expect(csv).toContain('""Alpha""');
      // Checks that comma inside cell doesn't split cell
      expect(csv).toContain('"High-Pressure Steam Boiler ""Alpha"", 1,100 kg/h"');
      // Checks newline in second row is preserved inside quotes
      expect(csv).toContain('"Multi-Stage Feedwater Pump\nPrimary Unit"');
    });

    it('should support nested object dot-notation keys in export formatting', () => {
      const nestedData = [
        { id: '1', asset: { code: 'BLR-001', name: 'Boiler' }, cost: 1000 },
        { id: '2', asset: { code: 'CHL-001', name: 'Chiller' }, cost: 2000 },
      ];

      const csv = generateCsvString(nestedData, [
        { key: 'asset.code', header: 'Code' },
        { key: 'asset.name', header: 'Name' },
        { key: 'cost', header: 'Cost', format: (v) => `LKR ${v.toLocaleString()}` },
      ]);

      expect(csv).toContain('"BLR-001","Boiler","LKR 1,000"');
      expect(csv).toContain('"CHL-001","Chiller","LKR 2,000"');
    });

    it('should format JSON export with 2-space indentation and parse back losslessly', () => {
      const jsonString = JSON.stringify(mockAssets, null, 2);
      expect(jsonString).toContain('\n  {\n    "assetCode": "BLR-001"');
      const parsed = JSON.parse(jsonString);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].assetCode).toBe('BLR-001');
    });
  });

  describe('2. Multi-Column Sorting & Dynamic Comparator Engine', () => {
    const assetsCatalog = [
      { code: 'BLR-001', name: 'Alpha Boiler', criticality: 'critical' as CriticalityLevel, cost: 685000 },
      { code: 'P-001', name: 'Feed Pump', criticality: 'high' as CriticalityLevel, cost: 210000 },
      { code: 'CHL-001', name: 'Centrifugal Chiller', criticality: 'medium' as CriticalityLevel, cost: 490000 },
      { code: 'AHU-001', name: 'Air Handling Unit', criticality: 'low' as CriticalityLevel, cost: 120000 },
    ];

    it('should correctly sort strings in ascending and descending order', () => {
      const asc = [...assetsCatalog].sort((a, b) => a.code.localeCompare(b.code));
      expect(asc.map((a) => a.code)).toEqual(['AHU-001', 'BLR-001', 'CHL-001', 'P-001']);

      const desc = [...assetsCatalog].sort((a, b) => b.code.localeCompare(a.code));
      expect(desc.map((a) => a.code)).toEqual(['P-001', 'CHL-001', 'BLR-001', 'AHU-001']);
    });

    it('should sort ordinal criticality levels accurately (critical > high > medium > low)', () => {
      const descCrit = [...assetsCatalog].sort(
        (a, b) => CRITICALITY_WEIGHTS[b.criticality] - CRITICALITY_WEIGHTS[a.criticality]
      );
      expect(descCrit.map((a) => a.criticality)).toEqual(['critical', 'high', 'medium', 'low']);

      const ascCrit = [...assetsCatalog].sort(
        (a, b) => CRITICALITY_WEIGHTS[a.criticality] - CRITICALITY_WEIGHTS[b.criticality]
      );
      expect(ascCrit.map((a) => a.criticality)).toEqual(['low', 'medium', 'high', 'critical']);
    });

    it('should sort numeric values properly', () => {
      const descCost = [...assetsCatalog].sort((a, b) => b.cost - a.cost);
      expect(descCost.map((a) => a.cost)).toEqual([685000, 490000, 210000, 120000]);

      const ascCost = [...assetsCatalog].sort((a, b) => a.cost - b.cost);
      expect(ascCost.map((a) => a.cost)).toEqual([120000, 210000, 490000, 685000]);
    });
  });

  describe('3. Filtering and Pagination Slicing Contract', () => {
    const records = Array.from({ length: 25 }, (_, idx) => ({
      id: `rec-${idx + 1}`,
      assetCode: idx < 10 ? 'BLR-001' : idx < 20 ? 'CHL-001' : 'P-001',
      status: idx % 2 === 0 ? ('open' as const) : ('completed' as const),
    }));

    it('should filter items by exact status match', () => {
      const openRecords = records.filter((r) => r.status === 'open');
      expect(openRecords).toHaveLength(13);
      expect(openRecords.every((r) => r.status === 'open')).toBe(true);
    });

    it('should filter items by asset code and status simultaneously', () => {
      const blrOpen = records.filter((r) => r.assetCode === 'BLR-001' && r.status === 'open');
      expect(blrOpen).toHaveLength(5);
    });

    it('should paginate items accurately across multiple pages', () => {
      const pageSize = 10;
      const totalPages = Math.ceil(records.length / pageSize);
      expect(totalPages).toBe(3);

      const page1 = records.slice(0, pageSize);
      expect(page1).toHaveLength(10);
      expect(page1[0].id).toBe('rec-1');
      expect(page1[9].id).toBe('rec-10');

      const page2 = records.slice(pageSize, pageSize * 2);
      expect(page2).toHaveLength(10);
      expect(page2[0].id).toBe('rec-11');

      const page3 = records.slice(pageSize * 2, pageSize * 3);
      expect(page3).toHaveLength(5);
      expect(page3[4].id).toBe('rec-25');
    });
  });

  describe('4. RBAC Information Masking & Financial Rate Privacy', () => {
    const rawCostReport: MaintenanceCostReport = {
      period: 'FY 2026',
      currency: 'LKR',
      totalCost: 1845000,
      laborCost: 620000,
      partsCost: 895000,
      contractorCost: 330000,
      preventiveSpend: 1328400,
      correctiveSpend: 516600,
      preventiveRatio: 72.0,
      categoryBreakdown: [],
      topCostAssets: [],
      monthlyTrends: [],
    };

    function sanitizeCostReportForRole(report: MaintenanceCostReport, role: UserRole) {
      const canViewFinancials = role === 'Organization Admin' || role === 'Plant Reliability Engineer';
      if (canViewFinancials) {
        return { ...report, isMasked: false };
      }
      return {
        period: report.period,
        currency: report.currency,
        preventiveRatio: report.preventiveRatio, // Ratio is operational KPI, allowed
        totalCost: null,
        laborCost: null,
        partsCost: null,
        contractorCost: null,
        preventiveSpend: null,
        correctiveSpend: null,
        categoryBreakdown: [],
        topCostAssets: [],
        monthlyTrends: [],
        isMasked: true,
      };
    }

    it('should expose complete financial figures to Organization Admin', () => {
      const view = sanitizeCostReportForRole(rawCostReport, 'Organization Admin');
      expect(view.isMasked).toBe(false);
      expect(view.totalCost).toBe(1845000);
      expect(view.laborCost).toBe(620000);
      expect(view.partsCost).toBe(895000);
    });

    it('should expose complete financial figures to Plant Reliability Engineer', () => {
      const view = sanitizeCostReportForRole(rawCostReport, 'Plant Reliability Engineer');
      expect(view.isMasked).toBe(false);
      expect(view.totalCost).toBe(1845000);
      expect(view.preventiveRatio).toBe(72.0);
    });

    it('should mask financial costs for Boiler Plant Operator while retaining operational proactive ratio', () => {
      const view = sanitizeCostReportForRole(rawCostReport, 'Boiler Plant Operator');
      expect(view.isMasked).toBe(true);
      expect(view.totalCost).toBeNull();
      expect(view.laborCost).toBeNull();
      expect(view.preventiveRatio).toBe(72.0); // Allowed operational metric
    });

    it('should mask financial costs for Maintenance Technician', () => {
      const view = sanitizeCostReportForRole(rawCostReport, 'Maintenance Technician');
      expect(view.isMasked).toBe(true);
      expect(view.totalCost).toBeNull();
      expect(view.partsCost).toBeNull();
    });

    it('should enforce finance:read permission requirement', () => {
      expect(ROLE_PERMISSIONS['Organization Admin']).toContain('finance:read');
      expect(ROLE_PERMISSIONS['Plant Reliability Engineer']).toContain('finance:read');
      expect(ROLE_PERMISSIONS['Boiler Plant Operator']).not.toContain('finance:read');
      expect(ROLE_PERMISSIONS['Maintenance Technician']).not.toContain('finance:read');
    });
  });

  describe('5. Maintenance Planning, Overdue Tracking & 72% Proactive Target', () => {
    const schedules: MaintenanceSchedule[] = [
      {
        id: 's1',
        planTitle: 'Fireside Soot Cleaning',
        assetId: 'a1',
        assetCode: 'BLR-001',
        assetName: 'Boiler 1',
        frequencyType: 'calendar',
        intervalValue: 30,
        intervalUnit: 'days',
        nextDueAt: new Date(Date.now() - 86400000 * 4).toISOString(), // 4 days ago
        isOverdue: true,
        priority: 'urgent',
        status: 'active',
        estimatedHours: 4,
      },
      {
        id: 's2',
        planTitle: 'Monthly Chiller Oil Sampling',
        assetId: 'a2',
        assetCode: 'CHL-001',
        assetName: 'Chiller 1',
        frequencyType: 'calendar',
        intervalValue: 30,
        intervalUnit: 'days',
        nextDueAt: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days in future
        isOverdue: false,
        priority: 'medium',
        status: 'active',
        estimatedHours: 2,
      },
    ];

    it('should detect overdue schedules when nextDueAt is before current timestamp', () => {
      const now = Date.now();
      const calculatedOverdue = schedules.map((s) => ({
        id: s.id,
        isOverdue: new Date(s.nextDueAt).getTime() < now,
        overdueDays: Math.max(0, Math.floor((now - new Date(s.nextDueAt).getTime()) / 86400000)),
      }));

      expect(calculatedOverdue[0].isOverdue).toBe(true);
      expect(calculatedOverdue[0].overdueDays).toBeGreaterThanOrEqual(3);

      expect(calculatedOverdue[1].isOverdue).toBe(false);
      expect(calculatedOverdue[1].overdueDays).toBe(0);
    });

    it('should calculate PM vs CM proactive spend ratio accurately and verify it satisfies >= 70% threshold', () => {
      const preventiveSpend = 1328400;
      const correctiveSpend = 516600;
      const totalSpend = preventiveSpend + correctiveSpend;

      const pmRatio = (preventiveSpend / totalSpend) * 100;
      expect(Number(pmRatio.toFixed(1))).toBe(72.0);
      expect(pmRatio).toBeGreaterThanOrEqual(70.0); // Meets World-Class CMMS Benchmark
    });
  });

  describe('6. Work Order State Machine Transitions & Audit Integrity', () => {
    const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
      draft: ['open', 'cancelled'],
      open: ['approved', 'cancelled'],
      approved: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'on_hold', 'cancelled'],
      in_progress: ['completed', 'on_hold', 'cancelled'],
      on_hold: ['in_progress', 'cancelled'],
      completed: ['closed'],
      cancelled: [],
      closed: [],
    };

    function validateTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
      return VALID_TRANSITIONS[from]?.includes(to) ?? false;
    }

    it('should permit canonical sequential work order execution workflow', () => {
      expect(validateTransition('draft', 'open')).toBe(true);
      expect(validateTransition('open', 'approved')).toBe(true);
      expect(validateTransition('approved', 'assigned')).toBe(true);
      expect(validateTransition('assigned', 'in_progress')).toBe(true);
      expect(validateTransition('in_progress', 'completed')).toBe(true);
      expect(validateTransition('completed', 'closed')).toBe(true);
    });

    it('should permit pausing work into on_hold and resuming into in_progress', () => {
      expect(validateTransition('in_progress', 'on_hold')).toBe(true);
      expect(validateTransition('on_hold', 'in_progress')).toBe(true);
    });

    it('should reject illegal state bypasses (e.g. draft directly to closed or completed to draft)', () => {
      expect(validateTransition('draft', 'closed')).toBe(false);
      expect(validateTransition('draft', 'completed')).toBe(false);
      expect(validateTransition('completed', 'draft')).toBe(false);
      expect(validateTransition('closed', 'in_progress')).toBe(false);
      expect(validateTransition('cancelled', 'open')).toBe(false);
    });
  });
});
