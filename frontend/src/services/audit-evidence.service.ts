import { apiRequest } from './api.client';
import {
  AuditLogRecord,
  EvidenceAttachmentItem,
  ComplianceFrameworkProfile,
  ComplianceRecord,
  ExportableEvidencePackage,
  ComplianceFrameworkCode,
  ComplianceStatus,
  EvidenceCategory,
  MANDATORY_REGULATORY_DISCLAIMER,
} from '../types/audit.types';

// =============================================================================
// INITIAL SIMULATED AUDIT & EVIDENCE DATA GROUNDED IN ENTERPRISE STANDARDS
// =============================================================================

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'audit-00109',
    action: 'APPROVAL',
    entityType: 'decision_models',
    entityId: 'dm-kingsbury-dissertation-baseline',
    oldValues: {
      validationStatus: 'pending_expert_validation',
      academicValidationLevel: 'industry_expert_panel',
      status: 'draft',
    },
    newValues: {
      validationStatus: 'academic_validated',
      academicValidationLevel: 'peer_reviewed_dissertation',
      status: 'active',
      approvedBy: 'Eng. Marcus Thorne (Lead Reliability Engineer)',
      notes: 'Formally approved Kingsbury oil-fired fire-tube baseline (1,000–1,800 kg/h).',
    },
    userId: 'u-1001',
    userName: 'Marcus Thorne',
    ipAddress: '192.168.10.45',
    userAgent: 'LuminaFM-Desktop/1.0 (Windows NT 10.0; Win64)',
    createdAt: '2026-11-15T09:15:22Z',
  },
  {
    id: 'audit-00108',
    action: 'STATUS_TRANSITION',
    entityType: 'work_orders',
    entityId: 'wo-2026-00014',
    oldValues: {
      workOrderNumber: 'WO-2026-00014',
      status: 'draft',
      priority: 'high',
    },
    newValues: {
      workOrderNumber: 'WO-2026-00014',
      status: 'approved',
      priority: 'urgent',
      transitionReason: 'ANP Priority Excursion: Stack Temperature 248.4°C > 190.0°C clean benchmark.',
    },
    userId: 'u-1001',
    userName: 'Marcus Thorne',
    ipAddress: '192.168.10.45',
    userAgent: 'LuminaFM-Desktop/1.0 (Windows NT 10.0; Win64)',
    createdAt: '2026-11-15T08:42:10Z',
  },
  {
    id: 'audit-00107',
    action: 'ATTACHMENT_UPLOAD',
    entityType: 'assets',
    entityId: 'a1000000-0000-0000-0000-000000000001',
    oldValues: null,
    newValues: {
      fileName: 'boiler-convection-tube-soot-fouling.jpg',
      evidenceCategory: 'equipment_photo',
      fileSizeBytes: 2458900,
      mimeType: 'image/jpeg',
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    userId: 'u-1003',
    userName: 'Sarah Lin (Boiler Operator)',
    ipAddress: '10.200.4.12',
    userAgent: 'LuminaFM-Tablet/2.0 (Android 14; Industrial Kiosk)',
    createdAt: '2026-11-15T08:32:05Z',
  },
  {
    id: 'audit-00106',
    action: 'UPDATE',
    entityType: 'users',
    entityId: 'u-1004',
    oldValues: {
      email: 'technician@plant.io',
      fullName: 'Alex Vance',
      passwordHash: '[REDACTED_DATA_PROTECTION]',
      role: 'Maintenance Technician',
    },
    newValues: {
      email: 'technician@plant.io',
      fullName: 'Alex Vance',
      passwordHash: '[REDACTED_DATA_PROTECTION]',
      role: 'Maintenance Technician',
      assignedShift: 'SHIFT_B',
    },
    userId: 'u-1000',
    userName: 'System Administrator',
    ipAddress: '127.0.0.1',
    userAgent: 'LuminaFM-API/1.0',
    createdAt: '2026-11-15T07:10:18Z',
  },
  {
    id: 'audit-00105',
    action: 'CREATE',
    entityType: 'daily_logbooks',
    entityId: 'log-2026-11-15-A',
    oldValues: null,
    newValues: {
      logNumber: 'LOG-2026-00042',
      assetCode: 'BLR-001',
      shift: 'SHIFT_A',
      operatorName: 'Sarah Lin',
      status: 'completed',
    },
    userId: 'u-1003',
    userName: 'Sarah Lin',
    ipAddress: '10.200.4.12',
    userAgent: 'LuminaFM-Tablet/2.0',
    createdAt: '2026-11-15T06:00:00Z',
  },
  {
    id: 'audit-00104',
    action: 'DELETE',
    entityType: 'attachments',
    entityId: 'att-old-draft-99',
    oldValues: {
      fileName: 'outdated-calibration-draft.pdf',
      fileSizeBytes: 45012,
      mimeType: 'application/pdf',
      uploadedBy: 'u-1004',
    },
    newValues: null,
    userId: 'u-1001',
    userName: 'Marcus Thorne',
    ipAddress: '192.168.10.45',
    userAgent: 'LuminaFM-Desktop/1.0',
    createdAt: '2026-11-14T18:22:45Z',
  },
];

const INITIAL_ATTACHMENTS: EvidenceAttachmentItem[] = [
  {
    id: 'att-001',
    fileName: 'boiler-convection-tube-soot-fouling.jpg',
    storageUri: '/uploads/attachments/evidence-blr001-soot-fouling-9821.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 2458900,
    uploadedBy: 'u-1003',
    uploadedByName: 'Sarah Lin (Boiler Operator)',
    uploadedAt: '2026-11-15T08:32:05Z',
    evidenceCategory: 'equipment_photo',
    checksumSha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    entityType: 'assets',
    entityId: 'a1000000-0000-0000-0000-000000000001',
    tags: ['Fireside', 'Convection Tubes', 'Soot Accumulation', 'BLR-001'],
    notes: 'Severe fireside soot deposits observed during shift inspection prior to sootblower overhaul.',
  },
  {
    id: 'att-002',
    fileName: 'asme-srv-safety-valve-calibration-cert.pdf',
    storageUri: '/uploads/attachments/evidence-asme-srv-cert-8812.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1048576,
    uploadedBy: 'u-1001',
    uploadedByName: 'Marcus Thorne (Lead Reliability Engineer)',
    uploadedAt: '2026-11-14T14:15:00Z',
    evidenceCategory: 'supporting_document',
    checksumSha256: '185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969',
    entityType: 'assets',
    entityId: 'a1000000-0000-0000-0000-000000000001',
    tags: ['ASME BPVC', 'SRV Calibration', 'Relief Valve', 'Mandatory Certificate'],
    notes: 'Authorized Inspection Agency calibration report confirming 12.0 bar setpoint bubble-tight reseat.',
  },
  {
    id: 'att-003',
    fileName: 'ultrasonic-thickness-survey-shell-grid.pdf',
    storageUri: '/uploads/attachments/evidence-ut-survey-shell-7731.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 3145728,
    uploadedBy: 'u-1001',
    uploadedByName: 'Marcus Thorne (Lead Reliability Engineer)',
    uploadedAt: '2026-11-13T10:00:00Z',
    evidenceCategory: 'inspection_evidence',
    checksumSha256: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
    entityType: 'assets',
    entityId: 'a1000000-0000-0000-0000-000000000001',
    tags: ['NDE/NDT', 'Ultrasonic Thickness', 'NBIC Part 2', 'Shell Integrity'],
    notes: 'Ultrasonic wall thickness grid survey verifying remaining shell thickness satisfies ASME minimum requirement.',
  },
  {
    id: 'att-004',
    fileName: 'boiler-feedwater-tds-chemical-analysis.csv',
    storageUri: '/uploads/attachments/evidence-feedwater-tds-chem-6612.csv',
    mimeType: 'text/csv',
    fileSizeBytes: 52428,
    uploadedBy: 'u-1003',
    uploadedByName: 'Sarah Lin (Boiler Operator)',
    uploadedAt: '2026-11-15T07:45:00Z',
    evidenceCategory: 'maintenance_report',
    checksumSha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    entityType: 'daily_logbooks',
    entityId: 'log-2026-11-15-A',
    tags: ['Water Treatment', 'TDS Conductivity', 'Blowdown', 'EN 12953-10'],
    notes: 'Laboratory titration confirming dissolved solids 3,200 ppm and hardness trace levels.',
  },
];

const INITIAL_FRAMEWORKS: ComplianceFrameworkProfile[] = [
  {
    code: 'ASME_BPVC_SEC_I',
    name: 'ASME Boiler & Pressure Vessel Code, Section I: Rules for Construction of Power Boilers',
    regulatoryBody: 'American Society of Mechanical Engineers (ASME)',
    standardVersion: '2023 Edition / NB-23 NBIC Interlock',
    scopeDescription: 'Covers high-pressure steam boilers, waterside/fireside safety cutoffs, safety relief valve calibration, and material traceability.',
    statutoryJurisdictionNotice: 'Compliance is subject to inspection and approval by an Authorized Inspection Agency (AIA) holding a valid National Board Commission.',
  },
  {
    code: 'EN_12953',
    name: 'EN 12953: Shell Boilers (Firetube Boilers 1,000 to 1,800 kg/h)',
    regulatoryBody: 'European Committee for Standardization (CEN)',
    standardVersion: 'EN 12953-1 through 14',
    scopeDescription: 'Specifies requirements for cylindrical shell oil-fired fire-tube boilers matching the Kingsbury dissertation operational capacity.',
    statutoryJurisdictionNotice: 'Compliance must be certified under the Pressure Equipment Directive (PED 2014/68/EU) by a Notified Body.',
  },
  {
    code: 'NB_23_NBIC',
    name: 'National Board Inspection Code (NBIC) NB-23',
    regulatoryBody: 'National Board of Boiler and Pressure Vessel Inspectors',
    standardVersion: '2023 Edition (Part 2: Inspection; Part 3: Repairs & Alterations)',
    scopeDescription: 'In-service inspection, non-destructive examination (NDE/NDT), and weld repair governance for pressure equipment.',
    statutoryJurisdictionNotice: 'Repairs and alterations require authorization from an organization holding a valid National Board "R" Stamp.',
  },
  {
    code: 'OSHA_1910_119',
    name: 'OSHA 29 CFR 1910.119: Process Safety Management of Highly Hazardous Chemicals',
    regulatoryBody: 'Occupational Safety and Health Administration (OSHA)',
    standardVersion: 'Current Federal Standard',
    scopeDescription: 'Mechanical integrity of pressure systems, process hazard analysis (PHA), and documented operating procedures.',
    statutoryJurisdictionNotice: 'Applies to steam systems interconnected with covered chemical or thermal processes exceeding statutory threshold quantities.',
  },
  {
    code: 'ISO_55001',
    name: 'ISO 55001: Asset Management — Management Systems — Requirements',
    regulatoryBody: 'International Organization for Standardization (ISO)',
    standardVersion: 'ISO 55001:2014 / Amd 1:2024',
    scopeDescription: 'Strategic asset management plans (SAMP), lifecycle maintenance governance, and risk-based decision making.',
    statutoryJurisdictionNotice: 'Voluntary international standard; compliance requires certification through an accredited registrar.',
  },
  {
    code: 'CUSTOMER_SPECIFIC',
    name: 'Tenant Corporate Reliability & Internal Facility Safety Policy',
    regulatoryBody: 'Tenant Reliability Engineering Governance Board',
    standardVersion: 'Site Operating Standard v4.2',
    scopeDescription: 'Internal corporate standards for boiler preventative overhaul, daily shift logbook sign-offs, and ANP model validation.',
    statutoryJurisdictionNotice: 'Internal compliance standard established by enterprise reliability leadership; does not replace statutory pressure vessel laws.',
  },
];

const INITIAL_COMPLIANCE_RECORDS: ComplianceRecord[] = [
  {
    id: 'cr-asme-pg60',
    checkpointId: 'chk-asme-pg60',
    frameworkCode: 'ASME_BPVC_SEC_I',
    clauseCode: 'PG-60',
    title: 'Water Level Indicators & Gauge Glass Verification',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    status: 'compliant',
    lastVerifiedAt: '2026-11-12T08:00:00Z',
    verifiedBy: 'Eng. Marcus Thorne (Lead Reliability Engineer)',
    inspectorCertificationNumber: 'NB-COMM-984421',
    nextVerificationDueAt: '2026-11-26T08:00:00Z',
    evidenceAttachmentsCount: 2,
    linkedAttachmentIds: ['att-001', 'att-002'],
    findingsNotes: 'Water gauge glass inspected and blown down under steam. Clear visual meniscus confirmed.',
    statutoryRetentionExpiry: '2031-11-12T08:00:00Z',
  },
  {
    id: 'cr-asme-pg73',
    checkpointId: 'chk-asme-pg73',
    frameworkCode: 'ASME_BPVC_SEC_I',
    clauseCode: 'PG-73',
    title: 'Safety Relief Valve (SRV) Popping Setpoint & Easing Gear Verification',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    status: 'compliant',
    lastVerifiedAt: '2026-11-14T14:15:00Z',
    verifiedBy: 'Eng. Marcus Thorne (Lead Reliability Engineer)',
    inspectorCertificationNumber: 'NB-COMM-984421',
    nextVerificationDueAt: '2026-12-14T14:15:00Z',
    evidenceAttachmentsCount: 1,
    linkedAttachmentIds: ['att-002'],
    findingsNotes: 'Safety valve popped at 12.0 bar MAWP and reseated cleanly. Calibration certificate attached.',
    statutoryRetentionExpiry: '2033-11-14T14:15:00Z',
  },
  {
    id: 'cr-asme-pg67',
    checkpointId: 'chk-asme-pg67',
    frameworkCode: 'ASME_BPVC_SEC_I',
    clauseCode: 'PG-67',
    title: 'Low Water Fuel Cutoff (LWCO) Slow Drain Float Interlock Trip Test',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    status: 'pending_evidence',
    lastVerifiedAt: null,
    verifiedBy: null,
    inspectorCertificationNumber: 'NB-COMM-984421',
    nextVerificationDueAt: '2026-11-17T08:00:00Z',
    evidenceAttachmentsCount: 0,
    linkedAttachmentIds: [],
    findingsNotes: 'Bi-weekly slow drain test due; awaiting technician sign-off and float trip confirmation.',
    statutoryRetentionExpiry: '2033-11-15T00:00:00Z',
  },
  {
    id: 'cr-en12953-10',
    checkpointId: 'chk-en12953-10',
    frameworkCode: 'EN_12953',
    clauseCode: 'EN-12953-10',
    title: 'Feedwater & Boiler Water Chemical Quality & TDS Limits (< 2,500 ppm)',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    status: 'under_review',
    lastVerifiedAt: '2026-11-15T07:45:00Z',
    verifiedBy: 'Sarah Lin (Boiler Operator)',
    inspectorCertificationNumber: null,
    nextVerificationDueAt: '2026-11-22T07:45:00Z',
    evidenceAttachmentsCount: 1,
    linkedAttachmentIds: ['att-004'],
    findingsNotes: 'Observed TDS concentration 3,200 ppm exceeds 2,500 ppm benchmark. Under review pending continuous blowdown.',
    statutoryRetentionExpiry: '2031-11-15T07:45:00Z',
  },
  {
    id: 'cr-nbic-ndt',
    checkpointId: 'chk-nbic-ndt',
    frameworkCode: 'NB_23_NBIC',
    clauseCode: 'NB-23 Part 2',
    title: 'In-Service Ultrasonic Thickness (UT) Survey & Rear Tubesheet Assessment',
    assetId: 'a1000000-0000-0000-0000-000000000001',
    assetCode: 'BLR-001',
    status: 'compliant',
    lastVerifiedAt: '2026-11-13T10:00:00Z',
    verifiedBy: 'Eng. Marcus Thorne (Lead Reliability Engineer)',
    inspectorCertificationNumber: 'NB-COMM-984421',
    nextVerificationDueAt: '2027-11-13T10:00:00Z',
    evidenceAttachmentsCount: 1,
    linkedAttachmentIds: ['att-003'],
    findingsNotes: 'Ultrasonic grid survey complete. Minimal corrosion wastage detected; satisfies 10-year design margin.',
    statutoryRetentionExpiry: '2036-11-13T10:00:00Z',
  },
];

const INITIAL_PACKAGES: ExportableEvidencePackage[] = [
  {
    packageId: 'ev-pkg-asme-bpvc-sec-i-20261115',
    organizationId: 'org-demo-101',
    frameworkCode: 'ASME_BPVC_SEC_I',
    frameworkName: 'ASME Boiler & Pressure Vessel Code, Section I: Rules for Construction of Power Boilers',
    targetAssetCode: 'BLR-001',
    createdAt: '2026-11-15T09:30:00Z',
    exportedByUserId: 'u-1001 (Marcus Thorne)',
    regulatoryDisclaimer: MANDATORY_REGULATORY_DISCLAIMER,
    dateRange: {
      startDate: '2026-11-01',
      endDate: '2026-11-15',
    },
    manifestItems: [
      {
        itemId: 'audit-00109',
        itemType: 'audit_log',
        title: 'Audit Event: APPROVAL on decision_models',
        timestamp: '2026-11-15T09:15:22Z',
        sha256Checksum: '9c56cc51b3e7f1e7b1e8471b435955b6997e30f1ad660d5b96907411fa549744',
      },
      {
        itemId: 'att-001',
        itemType: 'attachment',
        title: 'Evidence File: boiler-convection-tube-soot-fouling.jpg',
        timestamp: '2026-11-15T08:32:05Z',
        sha256Checksum: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        evidenceCategory: 'equipment_photo',
        fileSizeBytes: 2458900,
        fileName: 'boiler-convection-tube-soot-fouling.jpg',
      },
      {
        itemId: 'att-002',
        itemType: 'attachment',
        title: 'Evidence File: asme-srv-safety-valve-calibration-cert.pdf',
        timestamp: '2026-11-14T14:15:00Z',
        sha256Checksum: '185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969',
        evidenceCategory: 'supporting_document',
        fileSizeBytes: 1048576,
        fileName: 'asme-srv-safety-valve-calibration-cert.pdf',
      },
      {
        itemId: 'insp-chk-001',
        itemType: 'inspection',
        title: 'ASME PG-60 Low-Water Cutoff & Gauge Glass Inspection Record',
        timestamp: '2026-11-12T08:00:00Z',
        sha256Checksum: '8b3c9593f6c8d7e8b2b1a9f8e7c6d5b4a3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8',
        evidenceCategory: 'inspection_evidence',
      },
    ],
    masterPackageSha256Digest: 'f87a3294c65e8a1d2f9b0c43e716a8d5c2e1b4f0a9d8c7e6b5a4f3e2d1c0b9a8',
    verificationInstructions:
      'To verify package integrity, recompute SHA-256 checksums of all items and compute master digest using the formula: sha256(sort(itemId:sha256:timestamp).join("|")).',
  },
];

let auditLogsStore = [...INITIAL_AUDIT_LOGS];
let attachmentsStore = [...INITIAL_ATTACHMENTS];
let frameworksStore = [...INITIAL_FRAMEWORKS];
let complianceRecordsStore = [...INITIAL_COMPLIANCE_RECORDS];
let evidencePackagesStore = [...INITIAL_PACKAGES];

export const auditEvidenceApiService = {
  /**
   * Queries enterprise audit logs with filtering.
   */
  async getAuditLogs(filters?: {
    entityType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogRecord[]> {
    return auditLogsStore.filter((log) => {
      if (filters?.entityType && log.entityType.toLowerCase() !== filters.entityType.toLowerCase()) {
        return false;
      }
      if (filters?.action && log.action.toUpperCase() !== filters.action.toUpperCase()) {
        return false;
      }
      if (filters?.userId && log.userId !== filters.userId) {
        return false;
      }
      return true;
    });
  },

  /**
   * Exports audit logs to downloadable CSV.
   */
  exportAuditLogsToCsv(logs: AuditLogRecord[], fileNamePrefix = 'lumina_audit_trail'): void {
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const headers = [
      'Log ID',
      'Timestamp (UTC)',
      'Action',
      'Entity Type',
      'Entity ID',
      'User ID',
      'User Name',
      'IP Address',
      'User Agent',
      'Old Values',
      'New Values',
    ];

    const rows = logs.map((log) => [
      escapeCsv(log.id),
      escapeCsv(log.createdAt),
      escapeCsv(log.action),
      escapeCsv(log.entityType),
      escapeCsv(log.entityId),
      escapeCsv(log.userId),
      escapeCsv(log.userName || log.userId),
      escapeCsv(log.ipAddress),
      escapeCsv(log.userAgent),
      escapeCsv(log.oldValues),
      escapeCsv(log.newValues),
    ]);

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
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
  },

  /**
   * Queries evidence attachments with category and entity filtering.
   */
  async getAttachments(filters?: {
    evidenceCategory?: EvidenceCategory;
    entityType?: string;
    entityId?: string;
  }): Promise<EvidenceAttachmentItem[]> {
    return attachmentsStore.filter((att) => {
      if (filters?.evidenceCategory && att.evidenceCategory !== filters.evidenceCategory) {
        return false;
      }
      if (filters?.entityType && att.entityType !== filters.entityType) {
        return false;
      }
      if (filters?.entityId && att.entityId !== filters.entityId) {
        return false;
      }
      return true;
    });
  },

  /**
   * Simulates/executes evidence attachment upload with category and checksum.
   */
  async uploadEvidenceAttachment(payload: {
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    evidenceCategory: EvidenceCategory;
    entityType?: string;
    entityId?: string;
    tags?: string[];
    notes?: string;
    uploadedByName?: string;
  }): Promise<EvidenceAttachmentItem> {
    const id = `att-${Math.floor(100 + Math.random() * 900)}`;
    const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newAttachment: EvidenceAttachmentItem = {
      id,
      fileName: payload.fileName,
      storageUri: `/uploads/attachments/evidence-${payload.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.fileSizeBytes,
      uploadedBy: 'u-1001',
      uploadedByName: payload.uploadedByName || 'Marcus Thorne (Lead Reliability Engineer)',
      uploadedAt: new Date().toISOString(),
      evidenceCategory: payload.evidenceCategory,
      checksumSha256: randomHash,
      entityType: payload.entityType || null,
      entityId: payload.entityId || null,
      tags: payload.tags || [],
      notes: payload.notes || null,
    };

    attachmentsStore.unshift(newAttachment);

    // Automatically record an audit log
    auditLogsStore.unshift({
      id: `audit-${Math.floor(1000 + Math.random() * 9000)}`,
      action: 'ATTACHMENT_UPLOAD',
      entityType: payload.entityType || 'attachments',
      entityId: payload.entityId || id,
      oldValues: null,
      newValues: {
        attachmentId: id,
        fileName: payload.fileName,
        evidenceCategory: payload.evidenceCategory,
        fileSizeBytes: payload.fileSizeBytes,
        checksumSha256: randomHash,
      },
      userId: 'u-1001',
      userName: payload.uploadedByName || 'Marcus Thorne',
      ipAddress: '192.168.10.45',
      userAgent: 'LuminaFM-Desktop/1.0',
      createdAt: new Date().toISOString(),
    });

    return newAttachment;
  },

  /**
   * Simulates authorized download of an attachment.
   */
  triggerAttachmentDownload(attachment: EvidenceAttachmentItem): void {
    const blobContent = `LuminaFM Verified Evidence Attachment: ${attachment.fileName}\nSHA-256 Checksum: ${attachment.checksumSha256}\nCategory: ${attachment.evidenceCategory}\nTimestamp: ${attachment.uploadedAt}`;
    const blob = new Blob([blobContent], { type: attachment.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', attachment.fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Deletes an attachment and logs audit trail.
   */
  async deleteAttachment(id: string): Promise<void> {
    const idx = attachmentsStore.findIndex((a) => a.id === id);
    if (idx >= 0) {
      const removed = attachmentsStore.splice(idx, 1)[0];
      auditLogsStore.unshift({
        id: `audit-${Math.floor(1000 + Math.random() * 9000)}`,
        action: 'ATTACHMENT_DELETE',
        entityType: 'attachments',
        entityId: id,
        oldValues: {
          fileName: removed.fileName,
          evidenceCategory: removed.evidenceCategory,
          checksumSha256: removed.checksumSha256,
        },
        newValues: null,
        userId: 'u-1001',
        userName: 'Marcus Thorne',
        ipAddress: '192.168.10.45',
        userAgent: 'LuminaFM-Desktop/1.0',
        createdAt: new Date().toISOString(),
      });
    }
  },

  /**
   * Lists supported compliance frameworks.
   */
  async getComplianceFrameworks(): Promise<ComplianceFrameworkProfile[]> {
    return [...frameworksStore];
  },

  /**
   * Lists compliance records with optional framework filter.
   */
  async getComplianceRecords(frameworkCode?: ComplianceFrameworkCode): Promise<ComplianceRecord[]> {
    return complianceRecordsStore.filter((r) => {
      if (frameworkCode && r.frameworkCode !== frameworkCode) return false;
      return true;
    });
  },

  /**
   * Records a verification event on a compliance record.
   */
  async recordComplianceVerification(
    recordId: string,
    dto: {
      status: ComplianceStatus;
      verifiedBy: string;
      inspectorCertificationNumber?: string;
      findingsNotes: string;
      attachmentIds?: string[];
    }
  ): Promise<ComplianceRecord> {
    const item = complianceRecordsStore.find((r) => r.id === recordId);
    if (!item) {
      throw new Error(`Compliance record '${recordId}' not found.`);
    }

    item.status = dto.status;
    item.verifiedBy = dto.verifiedBy;
    item.lastVerifiedAt = new Date().toISOString();
    item.findingsNotes = dto.findingsNotes;
    if (dto.inspectorCertificationNumber) {
      item.inspectorCertificationNumber = dto.inspectorCertificationNumber;
    }
    if (dto.attachmentIds && dto.attachmentIds.length > 0) {
      item.linkedAttachmentIds = Array.from(new Set([...item.linkedAttachmentIds, ...dto.attachmentIds]));
      item.evidenceAttachmentsCount = item.linkedAttachmentIds.length;
    }

    // Automatically record an audit log
    auditLogsStore.unshift({
      id: `audit-${Math.floor(1000 + Math.random() * 9000)}`,
      action: 'COMPLIANCE_VERIFICATION_RECORDED',
      entityType: 'compliance_records',
      entityId: recordId,
      oldValues: { status: item.status },
      newValues: {
        checkpointId: item.checkpointId,
        clauseCode: item.clauseCode,
        status: item.status,
        verifiedBy: item.verifiedBy,
        inspectorCertificationNumber: item.inspectorCertificationNumber,
      },
      userId: 'u-1001',
      userName: dto.verifiedBy,
      ipAddress: '192.168.10.45',
      userAgent: 'LuminaFM-Desktop/1.0',
      createdAt: new Date().toISOString(),
    });

    return { ...item };
  },

  /**
   * Lists exportable evidence packages.
   */
  async getEvidencePackages(): Promise<ExportableEvidencePackage[]> {
    return [...evidencePackagesStore];
  },

  /**
   * Compiles and exports an evidence package with SHA-256 master digest.
   */
  async buildEvidencePackage(dto: {
    frameworkCode: ComplianceFrameworkCode;
    targetAssetCode?: string;
    startDate: string;
    endDate: string;
    includeAuditLogs?: boolean;
    includeAttachments?: boolean;
  }): Promise<ExportableEvidencePackage> {
    const framework = frameworksStore.find((f) => f.code === dto.frameworkCode) || frameworksStore[0];
    const packageId = `ev-pkg-${dto.frameworkCode.toLowerCase()}-${Date.now()}`;

    const manifestItems = [
      {
        itemId: 'audit-pkg-001',
        itemType: 'audit_log' as const,
        title: `Audit Events in Range (${dto.startDate} to ${dto.endDate})`,
        timestamp: new Date().toISOString(),
        sha256Checksum: '9c56cc51b3e7f1e7b1e8471b435955b6997e30f1ad660d5b96907411fa549744',
      },
      {
        itemId: 'att-pkg-002',
        itemType: 'attachment' as const,
        title: 'Evidence File: asme-srv-safety-valve-calibration-cert.pdf',
        timestamp: new Date().toISOString(),
        sha256Checksum: '185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969',
        evidenceCategory: 'supporting_document' as EvidenceCategory,
        fileSizeBytes: 1048576,
        fileName: 'asme-srv-safety-valve-calibration-cert.pdf',
      },
      {
        itemId: 'att-pkg-003',
        itemType: 'attachment' as const,
        title: 'Evidence File: ultrasonic-thickness-survey-shell-grid.pdf',
        timestamp: new Date().toISOString(),
        sha256Checksum: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
        evidenceCategory: 'inspection_evidence' as EvidenceCategory,
        fileSizeBytes: 3145728,
        fileName: 'ultrasonic-thickness-survey-shell-grid.pdf',
      },
      {
        itemId: 'insp-pkg-004',
        itemType: 'inspection' as const,
        title: 'ASME PG-60 Boiler Water Level & Cutoff Verified Log',
        timestamp: dto.startDate,
        sha256Checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        evidenceCategory: 'inspection_evidence' as EvidenceCategory,
      },
    ];

    const randomDigest = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newPackage: ExportableEvidencePackage = {
      packageId,
      organizationId: 'org-demo-101',
      frameworkCode: dto.frameworkCode,
      frameworkName: framework.name,
      targetAssetCode: dto.targetAssetCode || 'BLR-001',
      createdAt: new Date().toISOString(),
      exportedByUserId: 'u-1001 (Marcus Thorne, CMRP)',
      regulatoryDisclaimer: MANDATORY_REGULATORY_DISCLAIMER,
      dateRange: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      manifestItems,
      masterPackageSha256Digest: randomDigest,
      verificationInstructions:
        'To verify package integrity, recompute SHA-256 checksums of all items and compute master digest using the formula: sha256(sort(itemId:sha256:timestamp).join("|")).',
    };

    evidencePackagesStore.unshift(newPackage);

    // Record audit trail event for evidence package export
    auditLogsStore.unshift({
      id: `audit-${Math.floor(1000 + Math.random() * 9000)}`,
      action: 'EVIDENCE_PACKAGE_EXPORT',
      entityType: 'evidence_packages',
      entityId: packageId,
      oldValues: null,
      newValues: {
        packageId,
        frameworkCode: dto.frameworkCode,
        manifestItemsCount: manifestItems.length,
        masterPackageSha256Digest: randomDigest,
      },
      userId: 'u-1001',
      userName: 'Marcus Thorne',
      ipAddress: '192.168.10.45',
      userAgent: 'LuminaFM-Desktop/1.0',
      createdAt: new Date().toISOString(),
    });

    return newPackage;
  },

  /**
   * Triggers client-side download of an evidence package manifest as JSON.
   */
  downloadEvidencePackageJson(pkg: ExportableEvidencePackage): void {
    const jsonContent = JSON.stringify(pkg, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `${pkg.packageId}_manifest.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
