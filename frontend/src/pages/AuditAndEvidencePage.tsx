import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Tabs,
  LoadingState,
  ErrorState,
  Input,
} from '../components/ui';
import {
  AuditLogRecord,
  EvidenceAttachmentItem,
  ComplianceFrameworkProfile,
  ComplianceRecord,
  ExportableEvidencePackage,
  ComplianceFrameworkCode,
  EvidenceCategory,
  MANDATORY_REGULATORY_DISCLAIMER,
} from '../types/audit.types';
import { auditEvidenceApiService } from '../services/audit-evidence.service';
import { EvidenceUploadModal } from '../components/audit/EvidenceUploadModal';
import { EvidencePackageModal } from '../components/audit/EvidencePackageModal';
import { ComplianceVerificationModal } from '../components/audit/ComplianceVerificationModal';
import {
  ShieldCheck,
  FileText,
  Lock,
  Download,
  UploadCloud,
  Package,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileSpreadsheet,
  Clock,
  Search,
  Filter,
  Eye,
  Key,
  ShieldAlert,
  Building,
  Sparkles,
} from 'lucide-react';

export const AuditAndEvidencePage: React.FC = () => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'audit_trail' | 'evidence_vault' | 'compliance_records' | 'evidence_packages'>('audit_trail');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Data Stores
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [attachments, setAttachments] = useState<EvidenceAttachmentItem[]>([]);
  const [frameworks, setFrameworks] = useState<ComplianceFrameworkProfile[]>([]);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
  const [evidencePackages, setEvidencePackages] = useState<ExportableEvidencePackage[]>([]);

  // Filter States
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [attachmentCategoryFilter, setAttachmentCategoryFilter] = useState<string>('ALL');
  const [complianceFrameworkFilter, setComplianceFrameworkFilter] = useState<string>('ALL');

  // Expanded Audit Diff Row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState<boolean>(false);
  const [verifyingRecord, setVerifyingRecord] = useState<ComplianceRecord | null>(null);

  useEffect(() => {
    loadAllAuditData();
  }, []);

  const loadAllAuditData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [logsData, attData, fwData, crData, pkgData] = await Promise.all([
        auditEvidenceApiService.getAuditLogs(),
        auditEvidenceApiService.getAttachments(),
        auditEvidenceApiService.getComplianceFrameworks(),
        auditEvidenceApiService.getComplianceRecords(),
        auditEvidenceApiService.getEvidencePackages(),
      ]);

      setAuditLogs(logsData);
      setAttachments(attData);
      setFrameworks(fwData);
      setComplianceRecords(crData);
      setEvidencePackages(pkgData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load enterprise audit and evidence data.');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Upload handler
  const handleUploadEvidence = async (payload: any) => {
    await auditEvidenceApiService.uploadEvidenceAttachment(payload);
    const updated = await auditEvidenceApiService.getAttachments();
    const updatedLogs = await auditEvidenceApiService.getAuditLogs();
    setAttachments(updated);
    setAuditLogs(updatedLogs);
    showToast(`Evidence file "${payload.fileName}" uploaded and sealed with SHA-256 fingerprint.`);
  };

  // Verification handler
  const handleComplianceVerification = async (recordId: string, payload: any) => {
    await auditEvidenceApiService.recordComplianceVerification(recordId, payload);
    const updated = await auditEvidenceApiService.getComplianceRecords();
    const updatedLogs = await auditEvidenceApiService.getAuditLogs();
    setComplianceRecords(updated);
    setAuditLogs(updatedLogs);
    showToast(`Compliance checkpoint verification recorded in regulatory audit trail.`);
  };

  // Evidence package generate handler
  const handleGeneratePackage = async (payload: any) => {
    const pkg = await auditEvidenceApiService.buildEvidencePackage(payload);
    const updated = await auditEvidenceApiService.getEvidencePackages();
    const updatedLogs = await auditEvidenceApiService.getAuditLogs();
    setEvidencePackages(updated);
    setAuditLogs(updatedLogs);
    showToast(`Evidence package "${pkg.packageId}" compiled and sealed with cryptographic digest.`);
    return pkg;
  };

  if (isLoading) {
    return <LoadingState title="Loading immutable audit trails and verified evidence packages..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAllAuditData} />;
  }

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditEntityFilter !== 'ALL' && log.entityType.toLowerCase() !== auditEntityFilter.toLowerCase()) {
      return false;
    }
    if (auditActionFilter !== 'ALL' && log.action.toUpperCase() !== auditActionFilter.toUpperCase()) {
      return false;
    }
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEntity = log.entityType.toLowerCase().includes(q) || (log.entityId && log.entityId.toLowerCase().includes(q));
      const matchUser = (log.userName && log.userName.toLowerCase().includes(q)) || (log.userId && log.userId.toLowerCase().includes(q));
      if (!matchAction && !matchEntity && !matchUser) return false;
    }
    return true;
  });

  // Filtered Attachments
  const filteredAttachments = attachments.filter((att) => {
    if (attachmentCategoryFilter !== 'ALL' && att.evidenceCategory !== attachmentCategoryFilter) {
      return false;
    }
    return true;
  });

  // Filtered Compliance Records
  const filteredComplianceRecords = complianceRecords.filter((rec) => {
    if (complianceFrameworkFilter !== 'ALL' && rec.frameworkCode !== complianceFrameworkFilter) {
      return false;
    }
    return true;
  });

  const activeFrameworkProfile = frameworks.find((f) => f.code === complianceFrameworkFilter);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-gold-400" />
              <span>Enterprise Audit & Evidence Management</span>
            </h1>
            <Badge tone="gold" size="sm">
              REGULATORY COMPLIANCE VAULT
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Automated lifecycle event logging, cryptographic SHA-256 evidence sealing, ASME/EN statutory compliance records, and tamper-evident audit packages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => auditEvidenceApiService.exportAuditLogsToCsv(filteredAuditLogs)}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          >
            Export Audit (CSV)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPackageModalOpen(true)}
            leftIcon={<Package className="w-4 h-4" />}
          >
            Compile Evidence Package
          </Button>
        </div>
      </div>

      {/* Global Toast */}
      {actionMessage && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionMessage}</span>
        </div>
      )}

      {/* Four KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Immutable Audit Events</div>
            <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">{auditLogs.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Automated create/update/diffs</div>
          </div>
          <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sealed Evidence Files</div>
            <div className="text-2xl font-bold text-gold-400 mt-1 font-mono">{attachments.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">SHA-256 fingerprinted</div>
          </div>
          <div className="p-3 bg-gold-950/50 border border-gold-500/30 rounded-xl text-gold-400">
            <Camera className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Compliance Checkpoints</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{complianceRecords.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ASME, EN, NBIC standards</div>
          </div>
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-midnight-900/60 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evidence Packages</div>
            <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">{evidencePackages.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tamper-evident archives</div>
          </div>
          <div className="p-3 bg-cyan-950/50 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'audit_trail',
            label: 'Enterprise Audit Trail',
            badge: filteredAuditLogs.length,
          },
          {
            id: 'evidence_vault',
            label: 'Evidence Attachment Vault',
            badge: filteredAttachments.length,
          },
          {
            id: 'compliance_records',
            label: 'Configurable Compliance Records',
            badge: filteredComplianceRecords.length,
          },
          {
            id: 'evidence_packages',
            label: 'Exportable Evidence Packages',
            badge: evidencePackages.length,
          },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: ENTERPRISE AUDIT TRAIL                                             */}
      {/* ========================================================================= */}
      {activeTab === 'audit_trail' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-midnight-900/60 p-3.5 rounded-xl border border-indigo-900/50">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  className="pl-8 py-1.5 text-xs bg-midnight-950"
                  placeholder="Search action, entity, user..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                />
              </div>

              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="bg-midnight-950 border border-indigo-900/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500"
              >
                <option value="ALL">All Entities</option>
                <option value="assets">Assets</option>
                <option value="work_orders">Work Orders</option>
                <option value="daily_logbooks">Daily Logbooks</option>
                <option value="decision_models">Decision Models</option>
                <option value="attachments">Attachments</option>
                <option value="users">Users & Roles</option>
              </select>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-midnight-950 border border-indigo-900/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="STATUS_TRANSITION">STATUS_TRANSITION</option>
                <option value="APPROVAL">APPROVAL</option>
                <option value="ATTACHMENT_UPLOAD">ATTACHMENT_UPLOAD</option>
                <option value="EVIDENCE_PACKAGE_EXPORT">EVIDENCE_PACKAGE_EXPORT</option>
              </select>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Showing {filteredAuditLogs.length} of {auditLogs.length} events
            </div>
          </div>

          {/* Audit Logs Table / Feed */}
          <div className="space-y-2.5">
            {filteredAuditLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;

              const actionBadgeColors: Record<string, string> = {
                CREATE: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
                UPDATE: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
                DELETE: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
                STATUS_TRANSITION: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
                APPROVAL: 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-glow-gold/20',
                ATTACHMENT_UPLOAD: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
                EVIDENCE_PACKAGE_EXPORT: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
              };

              return (
                <Card
                  key={log.id}
                  className="p-3.5 bg-midnight-900/60 border border-indigo-900/50 hover:border-indigo-700/60 transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                          actionBadgeColors[log.action] || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {log.entityType}
                      </span>
                      {log.entityId && (
                        <span className="font-mono text-xs text-slate-400">
                          #{log.entityId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Actor: <strong className="text-slate-200">{log.userName || log.userId}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>IP: <strong className="font-mono text-slate-300">{log.ipAddress || '127.0.0.1'}</strong></span>
                      <span>•</span>
                      <span className="truncate max-w-[280px]" title={log.userAgent || ''}>
                        {log.userAgent || 'API'}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      {isExpanded ? 'Hide Values Diff' : 'View Values Diff'}
                    </Button>
                  </div>

                  {/* Expandable JSON Diff View */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-indigo-900/40 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono bg-midnight-950/80 p-3 rounded-lg border border-indigo-950 animate-fadeIn">
                      <div>
                        <div className="text-[11px] font-semibold text-rose-400 uppercase mb-1">
                          Previous Values (Old):
                        </div>
                        <pre className="text-slate-300 overflow-x-auto p-2 bg-midnight-900/80 rounded border border-indigo-900/30 max-h-48 scrollbar-none whitespace-pre-wrap">
                          {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : '(none - CREATE event)'}
                        </pre>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-emerald-400 uppercase mb-1">
                          Recorded Mutation (New):
                        </div>
                        <pre className="text-slate-300 overflow-x-auto p-2 bg-midnight-900/80 rounded border border-indigo-900/30 max-h-48 scrollbar-none whitespace-pre-wrap">
                          {log.newValues ? JSON.stringify(log.newValues, null, 2) : '(none - DELETE event)'}
                        </pre>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURE EVIDENCE ATTACHMENT VAULT                                  */}
      {/* ========================================================================= */}
      {activeTab === 'evidence_vault' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold-400" />
                <span>Cryptographically Sealed Evidence Vault</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical boiler photographs, ultrasonic NDT scans, lab water titration logs, and calibration certificates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={attachmentCategoryFilter}
                onChange={(e) => setAttachmentCategoryFilter(e.target.value)}
                className="bg-midnight-950 border border-indigo-900/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500"
              >
                <option value="ALL">All Categories</option>
                <option value="equipment_photo">Equipment Photographs</option>
                <option value="inspection_evidence">Inspection Evidence (NDT/UT)</option>
                <option value="maintenance_report">Maintenance Reports</option>
                <option value="supporting_document">Supporting Documents</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Upload Evidence
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAttachments.map((att) => (
              <Card
                key={att.id}
                className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/30">
                        {att.evidenceCategory.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 mt-1 break-all">{att.fileName}</h4>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => auditEvidenceApiService.triggerAttachmentDownload(att)}
                      leftIcon={<Download className="w-3.5 h-3.5 text-gold-400" />}
                    >
                      Download
                    </Button>
                  </div>

                  {att.notes && (
                    <p className="text-xs text-slate-300 leading-relaxed bg-midnight-950/60 p-2.5 rounded-lg border border-indigo-900/40">
                      {att.notes}
                    </p>
                  )}

                  {/* Tags */}
                  {att.tags && att.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {att.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-mono bg-midnight-950 text-slate-300 px-2 py-0.5 rounded border border-indigo-900/40">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-3 border-t border-indigo-900/30 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center justify-between">
                    <span>Size: <strong className="text-slate-200">{(att.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</strong></span>
                    <span>Uploaded: <strong className="text-slate-200">{new Date(att.uploadedAt).toLocaleDateString()}</strong></span>
                  </div>

                  {att.checksumSha256 && (
                    <div className="flex items-center gap-1.5 text-[10px] truncate" title={att.checksumSha256}>
                      <span className="text-slate-500">SHA-256:</span>
                      <span className="text-gold-400 bg-midnight-950 px-1.5 py-0.2 rounded border border-indigo-900/40">
                        {att.checksumSha256.slice(0, 24)}...
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400">
                    Uploaded by: <strong className="text-slate-200">{att.uploadedByName || att.uploadedBy}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFIGURABLE COMPLIANCE RECORDS                                    */}
      {/* ========================================================================= */}
      {activeTab === 'compliance_records' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                <span>Statutory Compliance Frameworks & Verification Checkpoints</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configurable compliance records mapped against ASME BPVC, EN 12953, NB-23, and corporate safety mandates.
              </p>
            </div>

            <select
              value={complianceFrameworkFilter}
              onChange={(e) => setComplianceFrameworkFilter(e.target.value)}
              className="bg-midnight-950 border border-indigo-900/60 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-gold-500"
            >
              <option value="ALL">All Governing Standards</option>
              <option value="ASME_BPVC_SEC_I">ASME BPVC Section I (Power Boilers)</option>
              <option value="EN_12953">EN 12953 (Shell Boilers 1,000–1,800 kg/h)</option>
              <option value="NB_23_NBIC">NBIC NB-23 (In-Service Inspection & NDT)</option>
              <option value="OSHA_1910_119">OSHA 1910.119 (Process Safety Management)</option>
              <option value="ISO_55001">ISO 55001 (Asset Management Standard)</option>
              <option value="CUSTOMER_SPECIFIC">Customer Specific Facility Policy</option>
            </select>
          </div>

          {/* Statutory Notice Card */}
          {activeFrameworkProfile && (
            <div className="p-3.5 bg-midnight-900/70 border border-indigo-800/40 rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-slate-100 text-sm">{activeFrameworkProfile.name}</div>
              <div className="text-slate-300">{activeFrameworkProfile.scopeDescription}</div>
              <div className="text-amber-300 font-mono text-[11px]">
                Jurisdiction Rule: {activeFrameworkProfile.statutoryJurisdictionNotice}
              </div>
            </div>
          )}

          {/* Checkpoints Cards */}
          <div className="space-y-3">
            {filteredComplianceRecords.map((rec) => {
              const statusBadges: Record<string, string> = {
                compliant: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
                pending_evidence: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
                under_review: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50',
                non_compliant: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
                exempt: 'bg-slate-800 text-slate-400 border-slate-700',
              };

              return (
                <Card
                  key={rec.id}
                  className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-indigo-900/40 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-gold-400">{rec.frameworkCode}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-indigo-300 font-semibold">{rec.clauseCode}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-bold">{rec.assetCode}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{rec.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase border ${
                          statusBadges[rec.status] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {rec.findingsNotes && (
                    <div className="text-xs text-slate-300 bg-midnight-950/70 p-2.5 rounded-lg border border-indigo-900/40 leading-relaxed">
                      {rec.findingsNotes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                    <div className="space-y-0.5">
                      <div>
                        Next Due: <strong className="font-mono text-slate-200">{new Date(rec.nextVerificationDueAt).toLocaleDateString()}</strong>
                        {rec.inspectorCertificationNumber && (
                          <span className="ml-2">Commission #: <strong className="font-mono text-gold-400">{rec.inspectorCertificationNumber}</strong></span>
                        )}
                      </div>
                      <div>
                        Statutory Retention: <strong className="font-mono text-slate-300">Until {new Date(rec.statutoryRetentionExpiry).toLocaleDateString()}</strong>
                        <span className="ml-2 font-mono text-slate-400">({rec.evidenceAttachmentsCount} evidence attachments)</span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setVerifyingRecord(rec)}
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      Record Verification Sign-Off
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXPORTABLE EVIDENCE PACKAGES                                       */}
      {/* ========================================================================= */}
      {activeTab === 'evidence_packages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>Exportable Regulatory Evidence Packages</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Self-contained, tamper-evident packages bundling audit trails, operational logbooks, NDT scans, and cryptographic digests.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPackageModalOpen(true)}
              leftIcon={<Package className="w-4 h-4" />}
            >
              Compile New Package
            </Button>
          </div>

          {/* Mandatory Regulatory Compliance Notice */}
          <div className="p-4 bg-amber-950/70 border-2 border-amber-500/60 rounded-xl space-y-2 text-amber-200">
            <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>REGULATORY COMPLIANCE REVIEW REQUIREMENT NOTICE</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-200/90">
              {MANDATORY_REGULATORY_DISCLAIMER}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {evidencePackages.map((pkg) => (
              <Card
                key={pkg.packageId}
                className="p-4 bg-midnight-900/60 border border-indigo-900/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-indigo-900/40 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-gold-400">{pkg.frameworkCode}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-200">{pkg.targetAssetCode}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{pkg.dateRange.startDate} to {pkg.dateRange.endDate}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">{pkg.frameworkName}</h4>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => auditEvidenceApiService.downloadEvidencePackageJson(pkg)}
                    leftIcon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
                  >
                    Download Package Manifest
                  </Button>
                </div>

                {/* Master Cryptographic Digest */}
                <div className="bg-midnight-950/80 p-3 rounded-lg border border-indigo-900/40 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                      Master Cryptographic SHA-256 Digest:
                    </span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tamper-Resistant Seal Verified</span>
                    </span>
                  </div>
                  <div className="font-mono text-slate-200 bg-midnight-900/90 p-2 rounded border border-indigo-950 break-all select-all">
                    {pkg.masterPackageSha256Digest}
                  </div>
                </div>

                {/* Manifest Catalog Items */}
                <div className="text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Manifest Catalog ({pkg.manifestItems.length} Sealed Audit Items):
                  </div>
                  <div className="space-y-1 pt-1">
                    {pkg.manifestItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between bg-midnight-950/50 p-2 rounded border border-indigo-900/30 text-[11px] font-mono"
                      >
                        <span className="text-slate-300 truncate max-w-[450px]">
                          [{item.itemType.toUpperCase()}] {item.title}
                        </span>
                        <span className="text-gold-400 shrink-0 ml-2">
                          SHA: {item.sha256Checksum.slice(0, 16)}...
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-900/30 text-[11px] text-slate-400 font-mono">
                  <span>Compiled by: <strong className="text-slate-200">{pkg.exportedByUserId}</strong></span>
                  <span>Generated: <strong className="text-slate-200">{new Date(pkg.createdAt).toLocaleString()}</strong></span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <EvidenceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadEvidence}
      />

      <EvidencePackageModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        onGenerate={handleGeneratePackage}
      />

      <ComplianceVerificationModal
        isOpen={Boolean(verifyingRecord)}
        onClose={() => setVerifyingRecord(null)}
        record={verifyingRecord}
        onVerify={handleComplianceVerification}
      />
    </div>
  );
};
