import { Router } from 'express';
import { authenticateTenant } from '../../middleware/auth.middleware';
import { uploadAttachment } from '../../middleware/upload.middleware';
import { auditAndAttachmentsController } from './audit.controller';

const router = Router();

// Enforce multi-tenant isolation & populate tenantContext (organizationId, userId, metadata)
router.use(authenticateTenant);

// ===========================================================================
// 1. AUDIT LOGS ROUTES (`audit_logs`)
// ===========================================================================
router.get('/audit-logs', (req, res, next) =>
  auditAndAttachmentsController.listAuditLogs(req, res, next)
);
router.get('/audit-logs/export', (req, res, next) =>
  auditAndAttachmentsController.exportAuditLogs(req, res, next)
);
router.post('/audit-logs', (req, res, next) =>
  auditAndAttachmentsController.createAuditLog(req, res, next)
);

// ===========================================================================
// 2. EVIDENCE ATTACHMENTS & ENTITY_ATTACHMENTS ROUTES (`attachments`, `entity_attachments`)
// ===========================================================================
router.get('/attachments', (req, res, next) =>
  auditAndAttachmentsController.listAttachments(req, res, next)
);
router.post(
  '/attachments',
  uploadAttachment.single('file'),
  (req, res, next) =>
    auditAndAttachmentsController.uploadAttachment(req, res, next)
);
router.get('/attachments/:id', (req, res, next) =>
  auditAndAttachmentsController.getAttachmentById(req, res, next)
);
router.get('/attachments/:id/download', (req, res, next) =>
  auditAndAttachmentsController.downloadAttachment(req, res, next)
);
router.delete('/attachments/:id', (req, res, next) =>
  auditAndAttachmentsController.deleteAttachment(req, res, next)
);
router.post('/attachments/:id/link', (req, res, next) =>
  auditAndAttachmentsController.linkAttachment(req, res, next)
);
router.post('/entity-attachments', (req, res, next) =>
  auditAndAttachmentsController.linkAttachment(req, res, next)
);

// Entity-scoped convenience routes (e.g. `/api/entities/assets/:entityId/attachments`)
router.get('/entities/:entityType/:entityId/attachments', (req, res, next) =>
  auditAndAttachmentsController.listAttachments(req, res, next)
);
router.post(
  '/entities/:entityType/:entityId/attachments',
  uploadAttachment.single('file'),
  (req, res, next) =>
    auditAndAttachmentsController.uploadAttachment(req, res, next)
);

// ===========================================================================
// 3. CONFIGURABLE COMPLIANCE RECORDS & EVIDENCE PACKAGES ROUTES
// ===========================================================================
router.get('/compliance/frameworks', (req, res, next) =>
  auditAndAttachmentsController.listFrameworks(req, res, next)
);
router.get('/compliance/records', (req, res, next) =>
  auditAndAttachmentsController.listComplianceRecords(req, res, next)
);
router.post('/compliance/records/:id/verify', (req, res, next) =>
  auditAndAttachmentsController.recordComplianceVerification(req, res, next)
);
router.post('/compliance/evidence-packages', (req, res, next) =>
  auditAndAttachmentsController.buildEvidencePackage(req, res, next)
);
router.get('/compliance/evidence-packages/:id', (req, res, next) =>
  auditAndAttachmentsController.getEvidencePackage(req, res, next)
);
router.post('/compliance/evidence-packages/:id/verify-digest', (req, res, next) =>
  auditAndAttachmentsController.verifyEvidencePackageDigest(req, res, next)
);

export default router;

