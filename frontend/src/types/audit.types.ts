export type EvidenceCategory =
  | 'equipment_photo'
  | 'inspection_evidence'
  | 'maintenance_report'
  | 'supporting_document';

export type ComplianceFrameworkCode =
  | 'ASME_BPVC_SEC_I'
  | 'EN_12953'
  | 'NB_23_NBIC'
  | 'OSHA_1910_119'
  | 'ISO_55001'
  | 'CUSTOMER_SPECIFIC';

export type ComplianceStatus =
  | 'compliant'
  | 'pending_evidence'
  | 'non_compliant'
  | 'under_review'
  | 'exempt';

export const MANDATORY_REGULATORY_DISCLAIMER =
  'REGULATORY COMPLIANCE NOTICE: This evidence package contains operational logs, maintenance records, and attachments exported from LuminaFM. Generation or possession of this report does NOT constitute official certification of statutory or regulatory compliance. Regulatory compliance requires independent verification and formal certification by an authorized jurisdiction or certified boiler inspector against applicable local codes (e.g., ASME BPVC, NBIC, EN 12953, local pressure vessel acts) and customer site-specific safety policies.';

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string | null;
  userName?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface EvidenceAttachmentItem {
  id: string;
  fileName: string;
  storageUri: string;
  mimeType: string | null;
  fileSizeBytes: number;
  uploadedBy: string | null;
  uploadedByName?: string | null;
  uploadedAt: string;
  evidenceCategory: EvidenceCategory;
  checksumSha256?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface ComplianceFrameworkProfile {
  code: ComplianceFrameworkCode;
  name: string;
  regulatoryBody: string;
  standardVersion: string;
  scopeDescription: string;
  statutoryJurisdictionNotice: string;
}

export interface ComplianceRecord {
  id: string;
  checkpointId: string;
  frameworkCode: ComplianceFrameworkCode;
  clauseCode: string;
  title: string;
  assetId?: string | null;
  assetCode?: string | null;
  status: ComplianceStatus;
  lastVerifiedAt?: string | null;
  verifiedBy?: string | null;
  inspectorCertificationNumber?: string | null;
  nextVerificationDueAt: string;
  evidenceAttachmentsCount: number;
  linkedAttachmentIds: string[];
  findingsNotes?: string | null;
  statutoryRetentionExpiry: string;
}

export interface EvidencePackageManifestItem {
  itemId: string;
  itemType: 'audit_log' | 'inspection' | 'daily_logbook' | 'decision_run' | 'attachment';
  title: string;
  timestamp: string;
  sha256Checksum: string;
  evidenceCategory?: EvidenceCategory;
  fileSizeBytes?: number;
  fileName?: string;
  metadata?: Record<string, unknown>;
}

export interface ExportableEvidencePackage {
  packageId: string;
  organizationId: string;
  frameworkCode: ComplianceFrameworkCode;
  frameworkName: string;
  targetAssetCode?: string | null;
  createdAt: string;
  exportedByUserId: string;
  regulatoryDisclaimer: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  manifestItems: EvidencePackageManifestItem[];
  masterPackageSha256Digest: string;
  verificationInstructions: string;
}
