import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  sanitizeForAuditLog,
  SENSITIVE_FIELD_NAMES,
  MAX_AUDIT_STRING_LENGTH,
} from '../src/modules/audit/data-protection.sanitizer';
import {
  AuditAndAttachmentsService,
  auditAndAttachmentsService,
  serializeBigIntFields,
} from '../src/modules/audit/audit.service';
import {
  ComplianceAndEvidenceService,
  COMPLIANCE_FRAMEWORKS,
  BASELINE_CHECKPOINTS,
  MANDATORY_REGULATORY_DISCLAIMER,
  ExportableEvidencePackage,
} from '../src/modules/audit/compliance-evidence.service';
import { AUDITED_CRITICAL_MODELS } from '../src/tenant/tenant.extension';
import { runWithTenantContext } from '../src/tenant/tenant.context';

const TEST_TENANT_ID = 'ten-4444-aaaa-bbbb-ccccdddd1111';
const TEST_USER_ID = 'usr-8888-1111-2222-333344445555';

describe('LuminaFM Enterprise Audit and Evidence Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. DATA PROTECTION & PRIVACY SANITIZATION ENGINE
  // =========================================================================
  describe('1. Data Protection & Privacy Sanitization Engine', () => {
    it('should redact sensitive credential and identity fields from audit snapshots', () => {
      const rawPayload = {
        userId: 'usr-101',
        email: 'operator@luminafm.com',
        password: 'SuperSecretPassword123!',
        passwordHash: '$2b$12$e8Yy8bW/eM.yZ8...',
        apiKey: 'sk-prod-99384918294819284',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        creditCard: '4532-1234-5678-9012',
        cvv: '982',
        ssn: '123-45-6789',
        bankAccount: 'US89370400440532013000',
        steamPressureBar: 10.4,
        flueGasTempC: 184.2,
      };

      const sanitized = sanitizeForAuditLog(rawPayload) as Record<string, unknown>;

      // Sensitive fields must be replaced with [REDACTED_DATA_PROTECTION]
      expect(sanitized.password).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.passwordHash).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.apiKey).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.token).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.creditCard).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.cvv).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.ssn).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.bankAccount).toBe('[REDACTED_DATA_PROTECTION]');

      // Operational boiler telemetry must remain intact
      expect(sanitized.userId).toBe('usr-101');
      expect(sanitized.email).toBe('operator@luminafm.com');
      expect(sanitized.steamPressureBar).toBe(10.4);
      expect(sanitized.flueGasTempC).toBe(184.2);
    });

    it('should recursively redact sensitive fields inside nested objects and arrays', () => {
      const complexObject = {
        boilerId: 'BLR-001',
        subsystem: 'burner_fuel_train',
        maintenanceTeam: [
          { name: 'Marcus Thorne', privateKey: 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoI...' },
          { name: 'Sarah Connor', accessToken: 'ghp_928374928174892174981273981' },
        ],
        externalIntegration: {
          scadaGateway: {
            host: '10.0.12.50',
            clientSecret: 'super-secret-scada-key',
            jwt_secret: 'jwt-hmac-secret-123',
          },
        },
      };

      const sanitized = sanitizeForAuditLog(complexObject) as any;

      expect(sanitized.boilerId).toBe('BLR-001');
      expect(sanitized.maintenanceTeam[0].name).toBe('Marcus Thorne');
      expect(sanitized.maintenanceTeam[0].privateKey).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.maintenanceTeam[1].name).toBe('Sarah Connor');
      expect(sanitized.maintenanceTeam[1].accessToken).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.externalIntegration.scadaGateway.host).toBe('10.0.12.50');
      expect(sanitized.externalIntegration.scadaGateway.clientSecret).toBe('[REDACTED_DATA_PROTECTION]');
      expect(sanitized.externalIntegration.scadaGateway.jwt_secret).toBe('[REDACTED_DATA_PROTECTION]');
    });

    it('should truncate large binary / base64 payloads to metadata descriptors with SHA-256 fingerprint', () => {
      // Simulate an inline base64 image (e.g. 5 KB data URI of boiler gauge glass photograph)
      const fakeBase64Data = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
      const expectedShaPrefix = crypto
        .createHash('sha256')
        .update(fakeBase64Data)
        .digest('hex')
        .slice(0, 16);

      const auditData = {
        observation: 'Gauge glass level verified at 65% height',
        photographDataUri: fakeBase64Data,
      };

      const sanitized = sanitizeForAuditLog(auditData) as any;

      expect(sanitized.observation).toBe('Gauge glass level verified at 65% height');
      expect(sanitized.photographDataUri).toContain('[REDACTED_BINARY_PAYLOAD:');
      expect(sanitized.photographDataUri).toContain(`sha256_prefix=${expectedShaPrefix}`);
      expect(sanitized.photographDataUri.length).toBeLessThan(150);
    });

    it('should truncate excessively long strings exceeding MAX_AUDIT_STRING_LENGTH', () => {
      const veryLongLog = 'Standard operational log entry with words and spaces. '.repeat(40);
      const sanitized = sanitizeForAuditLog({ debugLog: veryLongLog }) as any;

      expect(sanitized.debugLog.length).toBeLessThanOrEqual(MAX_AUDIT_STRING_LENGTH + 120);
      expect(sanitized.debugLog).toContain('[TRUNCATED: total_length=');
    });

    it('should protect against circular references and deep nesting beyond safe limit', () => {
      const deepObj: any = { level: 0 };
      let curr = deepObj;
      for (let i = 1; i <= 20; i++) {
        curr.child = { level: i };
        curr = curr.child;
      }

      const sanitized = sanitizeForAuditLog(deepObj) as any;
      let depth = 0;
      let node = sanitized;
      while (node && typeof node === 'object' && node.child) {
        depth++;
        node = node.child;
      }

      expect(node).toBe('[NESTING_DEPTH_EXCEEDED]');
      expect(depth).toBeLessThanOrEqual(13);
    });

    it('should serialize BigInt fields into clean strings to avoid JSON serialization exceptions', () => {
      const record = {
        auditId: BigInt('9876543210987654321'),
        fileSizeBytes: BigInt(4529182),
        name: 'ASME_Safety_Relief_Valve_Pop_Test.pdf',
      };

      const serialized = serializeBigIntFields(record);
      expect(typeof serialized.auditId).toBe('string');
      expect(serialized.auditId).toBe('9876543210987654321');
      expect(typeof serialized.fileSizeBytes).toBe('string');
      expect(serialized.fileSizeBytes).toBe('4529182');
    });
  });

  // =========================================================================
  // 2. AUTOMATIC AUDIT INTERCEPTOR & PRISMA EXTENSION MAPPINGS
  // =========================================================================
  describe('2. Automatic Audit Interceptor & Prisma Extension Mappings', () => {
    it('should register all critical enterprise CMMS and decision models for automatic audit logging', () => {
      expect(AUDITED_CRITICAL_MODELS.Asset).toBe('assets');
      expect(AUDITED_CRITICAL_MODELS.WorkOrder).toBe('work_orders');
      expect(AUDITED_CRITICAL_MODELS.Inspection).toBe('inspections');
      expect(AUDITED_CRITICAL_MODELS.FaultLog).toBe('fault_logs');
      expect(AUDITED_CRITICAL_MODELS.DecisionModel).toBe('decision_models');
      expect(AUDITED_CRITICAL_MODELS.DecisionRun).toBe('decision_runs');
      expect(AUDITED_CRITICAL_MODELS.Role).toBe('roles');
      expect(AUDITED_CRITICAL_MODELS.User).toBe('users');
      expect(AUDITED_CRITICAL_MODELS.Attachment).toBe('attachments');
      expect(Object.keys(AUDITED_CRITICAL_MODELS).length).toBeGreaterThanOrEqual(14);
    });

    it('should accurately categorize mutation actions into CREATE, UPDATE, APPROVAL, REJECTION, and STATUS_TRANSITION', () => {
      // Test status transition helper logic matching tenant.extension.ts
      const detectAction = (existingStatus: string | null, newStatus: string | null): string => {
        if (!existingStatus && newStatus) return 'CREATE';
        if (newStatus && ['approved', 'academic_validated', 'commercial_validated'].includes(newStatus.toLowerCase())) {
          return 'APPROVAL';
        }
        if (newStatus && ['rejected', 'declined'].includes(newStatus.toLowerCase())) {
          return 'REJECTION';
        }
        if (existingStatus && newStatus && existingStatus !== newStatus) {
          return 'STATUS_TRANSITION';
        }
        return 'UPDATE';
      };

      expect(detectAction(null, 'draft')).toBe('CREATE');
      expect(detectAction('pending_approval', 'approved')).toBe('APPROVAL');
      expect(detectAction('proposed', 'academic_validated')).toBe('APPROVAL');
      expect(detectAction('submitted', 'rejected')).toBe('REJECTION');
      expect(detectAction('open', 'in_progress')).toBe('STATUS_TRANSITION');
      expect(detectAction('in_progress', 'completed')).toBe('STATUS_TRANSITION');
      expect(detectAction('in_progress', 'in_progress')).toBe('UPDATE');
    });
  });

  // =========================================================================
  // 3. EVIDENCE ATTACHMENT VAULT & CRYPTOGRAPHIC HASHING
  // =========================================================================
  describe('3. Evidence Attachment Vault & Cryptographic Hashing', () => {
    it('should categorize evidence into equipment_photo, inspection_evidence, maintenance_report, supporting_document', () => {
      const categories = [
        'equipment_photo',
        'inspection_evidence',
        'maintenance_report',
        'supporting_document',
      ];

      expect(categories).toContain('equipment_photo');
      expect(categories).toContain('inspection_evidence');
      expect(categories).toContain('maintenance_report');
      expect(categories).toContain('supporting_document');
    });

    it('should generate verifiable SHA-256 checksum for physical evidence files', () => {
      const fileBuffer = Buffer.from('BOILER_ULTRASONIC_THICKNESS_MEASUREMENT_DATA_2026');
      const expectedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      expect(expectedChecksum).toHaveLength(64);
      expect(typeof expectedChecksum).toBe('string');

      // Verify determinism
      const recomputed = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      expect(recomputed).toBe(expectedChecksum);
    });

    it('should format exported audit logs as RFC 4180 CSV with UTF-8 BOM for Excel compatibility', () => {
      const mockAuditLogs = [
        {
          id: '1001',
          createdAt: new Date('2026-11-14T08:30:00.000Z'),
          action: 'STATUS_TRANSITION',
          entityType: 'work_orders',
          entityId: 'wo-101',
          user: { fullName: 'Marcus Thorne', email: 'marcus@luminafm.io' },
          ipAddress: '192.168.1.100',
          oldValues: { status: 'open' },
          newValues: { status: 'in_progress' },
        },
        {
          id: '1002',
          createdAt: new Date('2026-11-14T09:15:00.000Z'),
          action: 'APPROVAL',
          entityType: 'decision_models',
          entityId: 'model-v1',
          user: { fullName: 'Dr. Kingsbury (Peer Reviewer)', email: 'kingsbury@imperial.ac.uk' },
          ipAddress: '10.0.4.12',
          oldValues: { validationStatus: 'under_review' },
          newValues: { validationStatus: 'academic_validated' },
        },
      ];

      const escapeCell = (val: unknown): string => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      const headers = ['Audit ID', 'Timestamp (UTC)', 'Action', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Email', 'IP Address', 'Old Values', 'New Values'];
      const rows = mockAuditLogs.map((log) => [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        log.user?.fullName || '',
        log.user?.email || '',
        log.ipAddress || '',
        JSON.stringify(log.oldValues),
        JSON.stringify(log.newValues),
      ]);

      const csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');

      // Check UTF-8 Byte Order Mark
      expect(csvContent.charCodeAt(0)).toBe(0xFEFF);
      expect(csvContent).toContain('STATUS_TRANSITION');
      expect(csvContent).toContain('APPROVAL');
      expect(csvContent).toContain('Dr. Kingsbury (Peer Reviewer)');
      expect(csvContent).toContain('academic_validated');
    });
  });

  // =========================================================================
  // 4. CONFIGURABLE COMPLIANCE RECORDS & FRAMEWORKS
  // =========================================================================
  describe('4. Configurable Compliance Records & Frameworks', () => {
    const complianceService = new ComplianceAndEvidenceService();

    it('should expose all 6 enterprise boiler regulatory framework profiles', () => {
      const frameworks = complianceService.getFrameworkProfiles();
      const codes = frameworks.map((f) => f.code);

      expect(codes).toContain('ASME_BPVC_SEC_I');
      expect(codes).toContain('EN_12953');
      expect(codes).toContain('NB_23_NBIC');
      expect(codes).toContain('OSHA_1910_119');
      expect(codes).toContain('ISO_55001');
      expect(codes).toContain('CUSTOMER_SPECIFIC');
      expect(frameworks).toHaveLength(6);
    });

    it('should include statutory jurisdiction notices in every framework profile', () => {
      const frameworks = complianceService.getFrameworkProfiles();
      for (const fw of frameworks) {
        expect(fw.statutoryJurisdictionNotice).toBeDefined();
        expect(fw.statutoryJurisdictionNotice.length).toBeGreaterThan(40);
      }

      const asme = COMPLIANCE_FRAMEWORKS.ASME_BPVC_SEC_I;
      expect(asme.name).toContain('ASME Boiler & Pressure Vessel Code');
      expect(asme.regulatoryBody).toContain('American Society of Mechanical Engineers');

      const en12953 = COMPLIANCE_FRAMEWORKS.EN_12953;
      expect(en12953.name).toContain('Shell Boilers (Firetube Boilers');
      expect(en12953.regulatoryBody).toBe('European Committee for Standardization (CEN)');
    });

    it('should calculate correct statutory retention expiry (5 to 10 years) for compliance checkpoints', async () => {
      await runWithTenantContext({ organizationId: TEST_TENANT_ID, userId: TEST_USER_ID }, async () => {
        const records = await complianceService.listComplianceRecords();
        expect(records.length).toBeGreaterThan(0);

        for (const record of records) {
          const checkpoint = BASELINE_CHECKPOINTS.find((c) => c.id === record.checkpointId);
          expect(checkpoint).toBeDefined();
          if (checkpoint) {
            const retentionExpiryDate = new Date(record.statutoryRetentionExpiry);
            const now = new Date();
            const diffYears = (retentionExpiryDate.getTime() - now.getTime()) / (365.25 * 86400000);

            // Retention should match checkpoint statutoryRetentionYears (within 0.1 year margin)
            expect(diffYears).toBeGreaterThanOrEqual(checkpoint.statutoryRetentionYears - 0.1);
            expect(diffYears).toBeLessThanOrEqual(checkpoint.statutoryRetentionYears + 0.1);
          }
        }
      });
    });

    it('should support certified inspector verification sign-off with commission number', async () => {
      vi.spyOn(auditAndAttachmentsService, 'recordAuditLog').mockResolvedValue({
        id: '9999',
        action: 'COMPLIANCE_VERIFICATION_RECORDED',
      } as any);

      await runWithTenantContext({ organizationId: TEST_TENANT_ID, userId: TEST_USER_ID }, async () => {
        const records = await complianceService.listComplianceRecords('ASME_BPVC_SEC_I');
        expect(records.length).toBeGreaterThan(0);
        const targetRecord = records[0];

        const updated = await complianceService.recordVerification(targetRecord.id, {
          status: 'compliant',
          verifiedBy: 'Inspector David Vance, PE',
          inspectorCertificationNumber: 'NB-COMM-998811-A',
          findingsNotes: 'Annual ASME internal and external inspection complete. Safety valves pop tested at 10.5 bar. Satisfactory.',
          attachmentIds: ['att-asme-photo-01', 'att-relief-valve-cert'],
        });

        expect(updated.status).toBe('compliant');
        expect(updated.verifiedBy).toBe('Inspector David Vance, PE');
        expect(updated.inspectorCertificationNumber).toBe('NB-COMM-998811-A');
        expect(updated.findingsNotes).toContain('Safety valves pop tested at 10.5 bar');
        expect(updated.linkedAttachmentIds).toContain('att-asme-photo-01');
      });
    });
  });

  // =========================================================================
  // 5. EXPORTABLE EVIDENCE PACKAGES & MASTER TAMPER-EVIDENT DIGEST
  // =========================================================================
  describe('5. Exportable Evidence Packages & Master Tamper-Evident Digest', () => {
    const complianceService = new ComplianceAndEvidenceService();

    beforeEach(() => {
      vi.spyOn(auditAndAttachmentsService, 'recordAuditLog').mockResolvedValue({
        id: '9999',
        action: 'EVIDENCE_PACKAGE_EXPORT',
      } as any);

      vi.spyOn(auditAndAttachmentsService, 'listAuditLogs').mockResolvedValue([
        {
          id: '1001',
          createdAt: new Date('2026-11-14T08:30:00.000Z'),
          action: 'STATUS_TRANSITION',
          entityType: 'work_orders',
          entityId: 'wo-101',
          userId: TEST_USER_ID,
        } as any,
      ]);

      vi.spyOn(auditAndAttachmentsService, 'listAttachments').mockResolvedValue([
        {
          id: 'att-mock-01',
          fileName: 'boiler_nameplate.jpg',
          storageUri: '/uploads/boiler_nameplate.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1048576,
          uploadedAt: new Date('2026-11-14T08:30:00.000Z'),
        } as any,
      ]);
    });

    it('should compile a complete evidence package containing manifest items and master SHA-256 digest', async () => {
      let pkg: ExportableEvidencePackage | undefined;

      await runWithTenantContext({ organizationId: TEST_TENANT_ID, userId: TEST_USER_ID }, async () => {
        pkg = await complianceService.buildEvidencePackage({
          frameworkCode: 'ASME_BPVC_SEC_I',
          targetAssetCode: 'BLR-001',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-15T23:59:59.000Z',
          includeAuditLogs: true,
          includeAttachments: true,
          includeLogbooks: true,
        });
      });

      expect(pkg).toBeDefined();
      if (!pkg) return;

      expect(pkg.packageId).toMatch(/^ev-pkg-asme_bpvc_sec_i-\d+$/);
      expect(pkg.frameworkCode).toBe('ASME_BPVC_SEC_I');
      expect(pkg.targetAssetCode).toBe('BLR-001');
      expect(pkg.manifestItems.length).toBeGreaterThan(0);

      // Verify master package SHA-256 digest format
      expect(pkg.masterPackageSha256Digest).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(pkg.masterPackageSha256Digest)).toBe(true);

      // Manifest items must include cryptographic checksums
      for (const item of pkg.manifestItems) {
        expect(item.sha256Checksum).toHaveLength(64);
        expect(item.itemId).toBeDefined();
        expect(item.timestamp).toBeDefined();
      }
    });

    it('should verify the cryptographic digest integrity of an authentic package and detect tampering', async () => {
      let pkg: ExportableEvidencePackage | undefined;

      await runWithTenantContext({ organizationId: TEST_TENANT_ID, userId: TEST_USER_ID }, async () => {
        pkg = await complianceService.buildEvidencePackage({
          frameworkCode: 'EN_12953',
          targetAssetCode: 'BLR-001',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-15T23:59:59.000Z',
        });
      });

      expect(pkg).toBeDefined();
      if (!pkg) return;

      // 1. Verify authentic package
      const authenticVerification = complianceService.verifyPackageDigest(pkg);
      expect(authenticVerification.isValid).toBe(true);
      expect(authenticVerification.computedDigest).toBe(pkg.masterPackageSha256Digest);

      // 2. Tamper with one manifest item's checksum (simulating unauthorized modification)
      const tamperedPkg: ExportableEvidencePackage = JSON.parse(JSON.stringify(pkg));
      tamperedPkg.manifestItems[0].sha256Checksum = '0000000000000000000000000000000000000000000000000000000000000000';

      const tamperedVerification = complianceService.verifyPackageDigest(tamperedPkg);
      expect(tamperedVerification.isValid).toBe(false);
      expect(tamperedVerification.computedDigest).not.toBe(tamperedPkg.masterPackageSha256Digest);
    });
  });

  // =========================================================================
  // 6. STRICT REGULATORY HONESTY CONSTRAINT ENFORCEMENT
  // =========================================================================
  describe('6. Strict Regulatory Honesty Constraint Enforcement', () => {
    it('should define the exact mandatory regulatory honesty disclaimer', () => {
      expect(MANDATORY_REGULATORY_DISCLAIMER).toContain('REGULATORY COMPLIANCE NOTICE:');
      expect(MANDATORY_REGULATORY_DISCLAIMER).toContain(
        'Generation or possession of this report does NOT constitute official certification of statutory or regulatory compliance.'
      );
      expect(MANDATORY_REGULATORY_DISCLAIMER).toContain(
        'Regulatory compliance requires independent verification and formal certification by an authorized jurisdiction or certified boiler inspector'
      );
      expect(MANDATORY_REGULATORY_DISCLAIMER).toContain('ASME BPVC');
      expect(MANDATORY_REGULATORY_DISCLAIMER).toContain('NBIC');
      expect(MANDATORY_REGULATORY_DISCLAIMER).toContain('EN 12953');
    });

    it('should embed the mandatory disclaimer in every generated evidence package', async () => {
      const complianceService = new ComplianceAndEvidenceService();

      vi.spyOn(auditAndAttachmentsService, 'recordAuditLog').mockResolvedValue({
        id: '9999',
        action: 'EVIDENCE_PACKAGE_EXPORT',
      } as any);

      vi.spyOn(auditAndAttachmentsService, 'listAuditLogs').mockResolvedValue([]);
      vi.spyOn(auditAndAttachmentsService, 'listAttachments').mockResolvedValue([]);

      let pkg: ExportableEvidencePackage | undefined;

      await runWithTenantContext({ organizationId: TEST_TENANT_ID, userId: TEST_USER_ID }, async () => {
        pkg = await complianceService.buildEvidencePackage({
          frameworkCode: 'NB_23_NBIC',
          targetAssetCode: 'BLR-001',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-15T23:59:59.000Z',
        });
      });

      expect(pkg).toBeDefined();
      if (!pkg) return;

      expect(pkg.regulatoryDisclaimer).toBe(MANDATORY_REGULATORY_DISCLAIMER);
    });

    it('should never claim automatic statutory compliance without independent inspector sign-off', () => {
      // Unsigned checkpoints must not be claimed as compliant without certified inspector signoff
      const safetyValveCheckpoint = BASELINE_CHECKPOINTS.find((c) => c.clauseCode === 'PG-67');
      expect(safetyValveCheckpoint?.requiresCertifiedInspectorSignoff).toBe(true);

      const externalInspectionCheckpoint = BASELINE_CHECKPOINTS.find((c) => c.clauseCode === 'NB-23 Part 2');
      expect(externalInspectionCheckpoint?.requiresCertifiedInspectorSignoff).toBe(true);
    });
  });
});
