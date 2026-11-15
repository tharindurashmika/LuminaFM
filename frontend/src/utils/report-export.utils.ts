/**
 * LuminaFM Regulatory-Grade Decision Support & Reporting Export Utilities
 * Provides:
 * 1. RFC 4180 Excel-compatible CSV exports with UTF-8 BOM and multi-section audit blocks.
 * 2. High-fidelity printable PDF/HTML document generators with tenant branding,
 *    mathematical limit supermatrix formulation, cryptographic reproducibility hashes,
 *    and strict classification distinguishing Measured, Calculated, Benchmark, and Expert data.
 */

import {
  DecisionReportingSummary,
  OperationalAbnormalityItem,
  PreventiveMaintenanceItem,
  WorkOrderPerformanceMetrics,
  DataClassificationType,
} from '../types/reporting.types';
import { DetailedDailyLogbookResponse, InspectionHistoryRecord } from '../types/cmms.types';

// =============================================================================
// CSV & EXCEL GENERATION UTILITIES
// =============================================================================

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export interface CsvSection {
  title: string;
  classification?: DataClassificationType;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Exports multiple tabular sections into a single Excel-compatible CSV file.
 * Includes UTF-8 BOM (\uFEFF) to guarantee correct multi-language and numerical display in Microsoft Excel.
 */
export function exportMultiSectionToCsv(
  reportTitle: string,
  sections: CsvSection[],
  fileNamePrefix: string = 'lumina_audit_report'
): void {
  const lines: string[] = [];

  // Report Header
  lines.push(escapeCsvCell(`LuminaFM Enterprise CMMS & Decision Support Audit Report`));
  lines.push(escapeCsvCell(`TITLE: ${reportTitle}`));
  lines.push(escapeCsvCell(`GENERATED_AT: ${new Date().toISOString()}`));
  lines.push('');

  for (const section of sections) {
    const classTag = section.classification
      ? ` [CLASSIFICATION: ${section.classification.toUpperCase()}]`
      : '';
    lines.push(`=== ${section.title.toUpperCase()}${classTag} ===`);
    lines.push(section.headers.map(escapeCsvCell).join(','));

    for (const row of section.rows) {
      lines.push(row.map(escapeCsvCell).join(','));
    }
    lines.push(''); // Blank separator row between sections
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  link.setAttribute('href', url);
  link.setAttribute('download', `${fileNamePrefix}_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// SPECIALIZED EXCEL / CSV REPORT GENERATORS
// =============================================================================

/**
 * Generates an Excel CSV export for an ANP Multi-Criteria Decision Run,
 * clearly segmenting Measured Readings, Calculated Supermatrix Priorities,
 * Configured Benchmarks, and Expert Recommendations.
 */
export function exportDecisionRunToCsv(run: DecisionReportingSummary): void {
  const sections: CsvSection[] = [
    {
      title: 'Run Metadata & Reproducibility Audit',
      headers: ['Property', 'Value', 'Classification'],
      rows: [
        ['Decision Run ID', run.decisionRunId, 'CALCULATED'],
        ['Asset Identifier', `${run.assetCode} - ${run.assetName}`, 'MEASURED'],
        ['ANP Model Code', run.decisionModelCode, 'CALCULATED'],
        ['ANP Model Version', `v${run.decisionModelVersion}`, 'CALCULATED'],
        ['Validation Status', run.validationStatus, 'EXPERT'],
        ['Academic Validation Level', run.academicValidationLevel, 'EXPERT'],
        ['Execution Timestamp', run.evaluatedAt, 'MEASURED'],
        ['Deterministic Audit Hash', run.deterministicHash, 'CALCULATED'],
        ['Composite Risk Score', run.compositeRiskScore.toFixed(4), 'CALCULATED'],
        ['Recommended Priority', run.recommendedPriority.toUpperCase(), 'CALCULATED'],
        ['Top Ranked Alternative', `${run.topAlternative.name} (${run.topAlternative.code})`, 'EXPERT'],
        ['Top Alternative ANP Weight', `${(run.topAlternative.relativeWeightPercentage).toFixed(2)}%`, 'CALCULATED'],
      ],
    },
    {
      title: 'Ranked Maintenance Recommendations (Kingsbury Dissertation Topology)',
      classification: 'expert',
      headers: [
        'Rank',
        'Alternative Code',
        'Maintenance Strategy',
        'Priority Value (pa)',
        'Relative Weight %',
        'Safety Tier',
        'Review Status',
        'Suggested Priority',
      ],
      rows: run.recommendations.map((rec) => [
        rec.rank,
        rec.alternativeCode,
        rec.alternativeName,
        rec.priorityValue.toFixed(4),
        `${rec.relativeWeightPercentage.toFixed(2)}%`,
        rec.safetyTier,
        rec.reviewStatus,
        rec.suggestedPriority.toUpperCase(),
      ]),
    },
    {
      title: 'Criteria Attribution & Measured Deviations',
      classification: 'calculated',
      headers: [
        'Criterion Code',
        'Criterion Description',
        'Cluster',
        'Measured Value',
        'Configured Benchmark Threshold',
        'Unit',
        'Contribution Weight %',
      ],
      rows: run.criteriaContributions.map((c) => [
        c.criterionCode,
        c.criterionName,
        c.clusterCode,
        String(c.measuredValue),
        c.benchmarkValue,
        c.unit,
        `${c.contributionPercentage.toFixed(1)}%`,
      ]),
    },
  ];

  if (run.safetyAlerts && run.safetyAlerts.length > 0) {
    sections.push({
      title: 'Independent Safety Escalations (Non-ANP Deterministic Interlocks)',
      classification: 'benchmark',
      headers: [
        'Alert ID',
        'Safety Rule',
        'Parameter',
        'Observed Value',
        'Safety Limit',
        'Required Emergency Action',
        'Escalated At',
      ],
      rows: run.safetyAlerts.map((sa) => [
        sa.alertId,
        sa.ruleTitle,
        sa.parameterCode,
        String(sa.observedValue),
        sa.safetyLimit,
        sa.emergencyActionRequired,
        sa.escalatedAt,
      ]),
    });
  }

  exportMultiSectionToCsv(
    `ANP Decision Run Audit Snapshot - ${run.decisionModelCode} (${run.assetCode})`,
    sections,
    `anp_decision_${run.assetCode.toLowerCase()}`
  );
}

/**
 * Generates an Excel CSV export for Operational Abnormalities and Safety Alerts.
 */
export function exportAbnormalitiesToCsv(abnormalities: OperationalAbnormalityItem[]): void {
  const sections: CsvSection[] = [
    {
      title: 'Operational Parameter Abnormalities & Excursions',
      headers: [
        'ID',
        'Asset Code',
        'Asset Name',
        'Severity',
        'Parameter',
        'Measured Value',
        'Configured Benchmark',
        'Unit',
        'Deviation Description',
        'Thematic Action',
        'Detected At',
        'Acknowledged',
        'Acknowledged By',
        'Acknowledged At',
        'Linked Work Order',
      ],
      rows: abnormalities.map((ab) => [
        ab.id,
        ab.assetCode,
        ab.assetName,
        ab.severity,
        ab.parameterName,
        String(ab.measuredValue),
        `${ab.benchmarkOperator} ${ab.benchmarkThreshold}`,
        ab.unit,
        ab.deviationDescription,
        ab.thematicAction,
        ab.detectedAt,
        ab.acknowledged ? 'YES' : 'NO',
        ab.acknowledgedBy || 'UNACKNOWLEDGED',
        ab.acknowledgedAt || '',
        ab.linkedWorkOrderNumber || '',
      ]),
    },
  ];

  exportMultiSectionToCsv(
    'Facility Operational Abnormalities & Threshold Breaches',
    sections,
    'lumina_abnormalities_report'
  );
}

/**
 * Generates an Excel CSV export for Daily Shift Logbooks and Measured Readings.
 */
export function exportDailyLogbookToCsv(logbook: DetailedDailyLogbookResponse): void {
  const sections: CsvSection[] = [
    {
      title: 'Daily Logbook Shift Overview',
      headers: ['Property', 'Value'],
      rows: [
        ['Log Number', logbook.logNumber],
        ['Asset', `${logbook.assetCode} - ${logbook.assetName}`],
        ['Log Date', logbook.logDate],
        ['Shift', logbook.shift],
        ['Operating Period', logbook.operatingPeriod],
        ['Status', logbook.status],
        ['Recorded Operator', logbook.operatorName || 'System'],
        ['Created Timestamp', logbook.createdAt],
      ],
    },
    {
      title: 'Measured Operational Readings (Calibrated Physical Instruments)',
      classification: 'measured',
      headers: [
        'Parameter Code',
        'Parameter Description',
        'Measured Value',
        'Unit',
        'Nominal Range',
        'Physical Range',
        'In Nominal Range?',
        'Benchmark Breached?',
        'Amended?',
        'Timestamp',
      ],
      rows: logbook.readings.map((r) => [
        r.parameterCode,
        r.parameterName,
        r.value,
        r.unit,
        `${r.nominalRange.min} - ${r.nominalRange.max}`,
        `${r.physicalRange.min} - ${r.physicalRange.max}`,
        r.inNominalRange ? 'PASS' : 'DEVIATION',
        r.benchmarkBreached ? 'BREACHED' : 'NORMAL',
        r.isAmended ? `AMENDED (${r.amendmentCount})` : 'ORIGINAL',
        r.recordedAt,
      ]),
    },
    {
      title: 'Visual & Mechanical Inspection Checklist Responses',
      classification: 'measured',
      headers: ['Checkpoint Code', 'Checkpoint Name', 'Response', 'Status', 'Notes'],
      rows: logbook.checklists.map((c) => [
        c.checkpointCode,
        c.name,
        String(c.responseValue),
        c.resultStatus.toUpperCase(),
        c.notes || '',
      ]),
    },
  ];

  if (logbook.amendments && logbook.amendments.length > 0) {
    sections.push({
      title: 'Traceable Audit Amendments (Non-Destructive Correction Trail)',
      headers: [
        'Parameter',
        'Original Value',
        'Amended Value',
        'Unit',
        'Reason for Amendment',
        'Amended By',
        'Amended At',
      ],
      rows: logbook.amendments.map((a) => [
        a.parameterName,
        a.originalValue,
        a.amendedValue,
        a.unit,
        a.reason,
        a.amendedByName || a.amendedBy,
        a.amendedAt,
      ]),
    });
  }

  exportMultiSectionToCsv(
    `Boiler Daily Shift Logbook - ${logbook.logNumber} (${logbook.assetCode})`,
    sections,
    `logbook_${logbook.logNumber.toLowerCase()}`
  );
}

// =============================================================================
// HIGH-FIDELITY PRINTABLE PDF GENERATION
// =============================================================================

export interface PrintableReportOptions {
  title: string;
  subtitle: string;
  organizationName?: string;
  organizationLogo?: string | null;
  reportType: 'anp_decision' | 'boiler_logbook' | 'regulatory_dossier' | 'preventive_maintenance';
  decisionRun?: DecisionReportingSummary;
  abnormalities?: OperationalAbnormalityItem[];
  logbook?: DetailedDailyLogbookResponse;
  pmItems?: PreventiveMaintenanceItem[];
  metrics?: WorkOrderPerformanceMetrics;
}

/**
 * Builds a standalone, beautiful HTML document styled with Tailwind/KaTeX-grade
 * typography and opens it in a printable window with auto-print capability.
 */
export function openPrintableReportWindow(options: PrintableReportOptions): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the printable PDF report.');
    return;
  }

  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const orgName = options.organizationName || 'Lumina Facility Services';
  const logoHtml = options.organizationLogo
    ? `<img src="${options.organizationLogo}" alt="${orgName}" class="h-10 w-auto object-contain" />`
    : `<div class="brand-badge"><span class="brand-text">LUMINA</span><span class="brand-gold">FM</span></div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${options.title} - LuminaFM Audit Document</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 20mm 15mm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 11pt;
      margin: 0;
      padding: 24px;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-badge {
      font-weight: 800;
      letter-spacing: -0.05em;
      font-size: 22pt;
    }
    .brand-text { color: #0f172a; }
    .brand-gold { color: #d97706; }
    .report-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .report-subtitle {
      font-size: 10pt;
      color: #475569;
      margin: 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .meta-item label {
      display: block;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-item span {
      font-size: 10pt;
      font-weight: 600;
      color: #0f172a;
      word-break: break-all;
    }
    /* Classification Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      font-family: monospace;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .badge-measured { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .badge-calculated { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .badge-benchmark { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-expert { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .badge-alert { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-pass { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

    /* Section Styling */
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin: 20px 0 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .progress-bar-bg {
      background: #e2e8f0;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-bar-fill {
      background: #4338ca;
      height: 100%;
    }
    .gold-bar-fill {
      background: #d97706;
    }
    /* Signature Block */
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 36px;
      page-break-inside: avoid;
    }
    .signature-box {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 16px;
      background: #f8fafc;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 36px;
      margin-bottom: 8px;
    }
    .footer-note {
      font-size: 8pt;
      color: #64748b;
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
    }
    .unvalidated-warning {
      background: #fffbeb;
      border: 2px solid #f59e0b;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      color: #92400e;
      font-size: 9.5pt;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div>
      <div class="report-title">${options.title}</div>
      <div class="report-subtitle">${options.subtitle}</div>
    </div>
    <div style="text-align: right;">
      ${logoHtml}
      <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">${orgName}</div>
    </div>
  </div>

  ${buildReportContent(options)}

  <div class="signature-grid">
    <div class="signature-box">
      <div style="font-size: 9pt; font-weight: 700; color: #334155;">CHIEF PLANT RELIABILITY ENGINEER</div>
      <div class="sign-line"></div>
      <div style="display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;">
        <span>Signed Name / Seal</span>
        <span>Date: ____ / ____ / ________</span>
      </div>
    </div>
    <div class="signature-box">
      <div style="font-size: 9pt; font-weight: 700; color: #334155;">CERTIFIED BOILER & PRESSURE VESSEL INSPECTOR</div>
      <div class="sign-line"></div>
      <div style="display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;">
        <span>Inspector Certification #</span>
        <span>Date: ____ / ____ / ________</span>
      </div>
    </div>
  </div>

  <div class="footer-note">
    <span>LuminaFM Enterprise CMMS | Automated Regulatory Compliance Record</span>
    <span>Generated: ${generatedAt}</span>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function buildReportContent(options: PrintableReportOptions): string {
  const { decisionRun, abnormalities, logbook, pmItems } = options;

  if (options.reportType === 'anp_decision' && decisionRun) {
    const isUnvalidated = !decisionRun.isValidated;
    return `
      ${
        isUnvalidated
          ? `<div class="unvalidated-warning">
              ⚠️ REGULATORY NOTICE: This decision run originates from a draft or unvalidated model configuration.
              Under facility operating standards, outputs are ADVISORY ONLY and must NOT be recorded as approved maintenance decisions without formal engineering sign-off.
            </div>`
          : ''
      }
      <div class="meta-grid">
        <div class="meta-item">
          <label>Target Asset</label>
          <span>${decisionRun.assetCode} - ${decisionRun.assetName}</span>
        </div>
        <div class="meta-item">
          <label>ANP Decision Model</label>
          <span>${decisionRun.decisionModelCode} (v${decisionRun.decisionModelVersion})</span>
        </div>
        <div class="meta-item">
          <label>Validation Status</label>
          <span><span class="badge ${isUnvalidated ? 'badge-alert' : 'badge-pass'}">${decisionRun.validationStatus}</span></span>
        </div>
        <div class="meta-item">
          <label>Audit Hash</label>
          <span style="font-family: monospace; font-size: 8pt;">${decisionRun.deterministicHash.slice(0, 16)}...</span>
        </div>
      </div>

      <div class="section-title">
        <span>Ranked Maintenance Recommendations</span>
        <span class="badge badge-calculated">ANP Limit Supermatrix Weights</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">Rank</th>
            <th>Maintenance Alternative Strategy</th>
            <th style="width: 100px;">Priority (pa)</th>
            <th style="width: 100px;">Relative Wt %</th>
            <th style="width: 130px;">Safety Tier</th>
            <th style="width: 120px;">Review Status</th>
          </tr>
        </thead>
        <tbody>
          ${decisionRun.recommendations
            .map(
              (rec) => `
            <tr>
              <td style="font-weight: 700; text-align: center;">#${rec.rank}</td>
              <td>
                <div style="font-weight: 700; color: #0f172a;">${rec.alternativeName}</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">${rec.technicalWorkScope}</div>
              </td>
              <td style="font-family: monospace; font-weight: 700;">${rec.priorityValue.toFixed(4)}</td>
              <td>
                <div style="font-weight: 700;">${rec.relativeWeightPercentage.toFixed(2)}%</div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill gold-bar-fill" style="width: ${Math.min(100, rec.relativeWeightPercentage)}%;"></div>
                </div>
              </td>
              <td><span class="badge badge-expert">${rec.safetyTier}</span></td>
              <td>
                <span class="badge ${
                  rec.reviewStatus === 'APPROVED' ? 'badge-pass' : 'badge-benchmark'
                }">
                  ${rec.reviewStatus}
                </span>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="section-title">
        <span>Criteria Influence Attribution & Telemetry Deviations</span>
        <span class="badge badge-measured">Measured Instrument Signals</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Criterion Code</th>
            <th>Description & Cluster</th>
            <th style="width: 120px;">Measured Value</th>
            <th style="width: 120px;">Configured Benchmark</th>
            <th style="width: 110px;">Attribution %</th>
          </tr>
        </thead>
        <tbody>
          ${decisionRun.criteriaContributions
            .map(
              (c) => `
            <tr>
              <td style="font-family: monospace; font-weight: 700;">${c.criterionCode}</td>
              <td>
                <div style="font-weight: 600;">${c.criterionName}</div>
                <div style="font-size: 8pt; color: #64748b;">Cluster: ${c.clusterCode}</div>
              </td>
              <td><span class="badge badge-measured">${c.measuredValue} ${c.unit}</span></td>
              <td><span class="badge badge-benchmark">${c.benchmarkValue} ${c.unit}</span></td>
              <td>
                <div style="font-weight: 700;">${c.contributionPercentage.toFixed(1)}%</div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${c.contributionPercentage}%;"></div>
                </div>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  if (options.reportType === 'boiler_logbook' && logbook) {
    return `
      <div class="meta-grid">
        <div class="meta-item">
          <label>Logbook ID</label>
          <span>${logbook.logNumber}</span>
        </div>
        <div class="meta-item">
          <label>Asset</label>
          <span>${logbook.assetCode} - ${logbook.assetName}</span>
        </div>
        <div class="meta-item">
          <label>Shift / Operating Period</label>
          <span>${logbook.shift} (${logbook.operatingPeriod})</span>
        </div>
        <div class="meta-item">
          <label>Recorded By</label>
          <span>${logbook.operatorName || 'Authorized Operator'}</span>
        </div>
      </div>

      <div class="section-title">
        <span>Operational Parameter Readings</span>
        <span class="badge badge-measured">Calibrated Physical Sensors</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Measured Value</th>
            <th>Nominal Range</th>
            <th>Physical Limit</th>
            <th>Benchmark Status</th>
            <th>Traceability</th>
          </tr>
        </thead>
        <tbody>
          ${logbook.readings
            .map(
              (r) => `
            <tr>
              <td>
                <div style="font-weight: 700;">${r.parameterName}</div>
                <div style="font-size: 8pt; color: #64748b; font-family: monospace;">${r.parameterCode}</div>
              </td>
              <td><span class="badge badge-measured">${r.value} ${r.unit}</span></td>
              <td style="font-size: 9pt;">${r.nominalRange.min} - ${r.nominalRange.max} ${r.unit}</td>
              <td style="font-size: 9pt;">${r.physicalRange.min} - ${r.physicalRange.max} ${r.unit}</td>
              <td>
                <span class="badge ${r.benchmarkBreached ? 'badge-alert' : 'badge-pass'}">
                  ${r.benchmarkBreached ? 'THRESHOLD EXCURSION' : 'NOMINAL'}
                </span>
              </td>
              <td style="font-size: 8pt; color: #64748b;">
                ${r.isAmended ? `<span class="badge badge-benchmark">AMENDED (${r.amendmentCount})</span>` : 'ORIGINAL'}
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="section-title">
        <span>Operator Checklist Responses</span>
        <span class="badge badge-measured">Shift Physical Inspection</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 120px;">Checkpoint</th>
            <th>Inspection Criteria</th>
            <th style="width: 100px;">Result</th>
            <th>Notes & Observations</th>
          </tr>
        </thead>
        <tbody>
          ${logbook.checklists
            .map(
              (c) => `
            <tr>
              <td style="font-family: monospace; font-weight: 700;">${c.checkpointCode}</td>
              <td>${c.name}</td>
              <td>
                <span class="badge ${
                  c.resultStatus === 'pass' ? 'badge-pass' : c.resultStatus === 'fail' ? 'badge-alert' : 'badge-benchmark'
                }">
                  ${c.resultStatus.toUpperCase()}
                </span>
              </td>
              <td style="font-size: 9pt;">${c.notes || 'No anomaly reported'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  if (options.reportType === 'regulatory_dossier' && abnormalities) {
    return `
      <div class="section-title">
        <span>Operational Parameter Abnormalities & Compliance Excursions</span>
        <span class="badge badge-alert">Threshold Alarms</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Parameter / Severity</th>
            <th>Measured Signal</th>
            <th>Benchmark Limit</th>
            <th>Deviation Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${abnormalities
            .map(
              (ab) => `
            <tr>
              <td>
                <div style="font-weight: 700;">${ab.assetCode}</div>
                <div style="font-size: 8pt; color: #64748b;">${ab.assetName}</div>
              </td>
              <td>
                <div style="font-weight: 700;">${ab.parameterName}</div>
                <span class="badge ${ab.severity === 'CRITICAL' ? 'badge-alert' : 'badge-benchmark'}">${ab.severity}</span>
              </td>
              <td><span class="badge badge-measured">${ab.measuredValue} ${ab.unit}</span></td>
              <td><span class="badge badge-benchmark">${ab.benchmarkOperator} ${ab.benchmarkThreshold} ${ab.unit}</span></td>
              <td style="font-size: 9pt;">${ab.deviationDescription}</td>
              <td>
                <span class="badge ${ab.acknowledged ? 'badge-pass' : 'badge-alert'}">
                  ${ab.acknowledged ? `ACK: ${ab.acknowledgedBy}` : 'UNACKNOWLEDGED'}
                </span>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  if (options.reportType === 'preventive_maintenance' && pmItems) {
    return `
      <div class="section-title">
        <span>Preventive Maintenance Tracking & Overdue Compliance</span>
        <span class="badge badge-benchmark">Regulatory Calendar</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Maintenance Task</th>
            <th>Frequency</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Assigned Engineer</th>
          </tr>
        </thead>
        <tbody>
          ${pmItems
            .map(
              (pm) => `
            <tr>
              <td style="font-weight: 700;">${pm.assetCode}</td>
              <td>
                <div style="font-weight: 600;">${pm.title}</div>
                <div style="font-size: 8pt; color: #64748b;">Est: ${pm.estimatedLaborHours} hrs</div>
              </td>
              <td style="text-transform: capitalize;">${pm.frequency}</td>
              <td style="font-family: monospace;">${pm.dueDate}</td>
              <td>
                <span class="badge ${pm.isOverdue ? 'badge-alert' : 'badge-pass'}">
                  ${pm.isOverdue ? `OVERDUE (${Math.abs(pm.daysRemainingOrOverdue)}d)` : `IN ${pm.daysRemainingOrOverdue}d`}
                </span>
              </td>
              <td style="font-size: 9pt;">${pm.assignedEngineer || 'Unassigned'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  return `<p>No content specified for this report.</p>`;
}
