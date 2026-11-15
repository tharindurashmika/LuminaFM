import { Request, Response, NextFunction } from 'express';
import { auditAndAttachmentsService } from './audit.service';
import {
  complianceAndEvidenceService,
  ComplianceFrameworkCode,
} from './compliance-evidence.service';

export class AuditAndAttachmentsController {
  // ===========================================================================
  // 1. AUDIT LOGS ENDPOINTS
  // ===========================================================================

  async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType =
        (req.query.entityType as string | undefined) ||
        (req.query.entity_type as string | undefined);
      const entityId =
        (req.query.entityId as string | undefined) ||
        (req.query.entity_id as string | undefined);
      const action = req.query.action as string | undefined;
      const userId =
        (req.query.userId as string | undefined) ||
        (req.query.user_id as string | undefined);
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const limitRaw = req.query.limit
        ? Number(req.query.limit)
        : undefined;

      const data = await auditAndAttachmentsService.listAuditLogs({
        entityType,
        entityId,
        action,
        userId,
        startDate,
        endDate,
        limit: limitRaw,
      });

      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async exportAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType =
        (req.query.entityType as string | undefined) ||
        (req.query.entity_type as string | undefined);
      const entityId =
        (req.query.entityId as string | undefined) ||
        (req.query.entity_id as string | undefined);
      const action = req.query.action as string | undefined;
      const userId =
        (req.query.userId as string | undefined) ||
        (req.query.user_id as string | undefined);
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const csvContent = await auditAndAttachmentsService.exportAuditLogsToCsv({
        entityType,
        entityId,
        action,
        userId,
        startDate,
        endDate,
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="lumina_audit_trail_${timestamp}.csv"`
      );
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  async createAuditLog(req: Request, res: Response, next: NextFunction) {
    try {
      const action = req.body.action;
      const entityType = req.body.entityType || req.body.entity_type;
      const entityId = req.body.entityId || req.body.entity_id;
      const oldValues =
        req.body.oldValues !== undefined
          ? req.body.oldValues
          : req.body.old_values;
      const newValues =
        req.body.newValues !== undefined
          ? req.body.newValues
          : req.body.new_values;
      const userId =
        req.body.userId || req.body.user_id || req.user?.userId || null;

      if (!action || !entityType) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Both `action` and `entityType` (`entity_type`) are required.',
        });
        return;
      }

      const data = await auditAndAttachmentsService.recordAuditLog({
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        userId,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(201).json({
        message: 'Audit log recorded successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 2. EVIDENCE ATTACHMENTS & ENTITY_ATTACHMENTS ENDPOINTS
  // ===========================================================================

  async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType =
        req.params.entityType ||
        req.body.entityType ||
        req.body.entity_type ||
        (req.query.entityType as string | undefined) ||
        (req.query.entity_type as string | undefined) ||
        null;

      const entityId =
        req.params.entityId ||
        req.body.entityId ||
        req.body.entity_id ||
        (req.query.entityId as string | undefined) ||
        (req.query.entity_id as string | undefined) ||
        null;

      // Support both Multer multipart file upload (`req.file`) and pre-signed metadata payload
      if (!req.file && (!req.body.fileName && !req.body.file_name)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message:
            'No evidence file uploaded. Provide a multipart `file` field or `fileName` and `storageUri` in the request body.',
        });
        return;
      }

      const fileName =
        req.file?.originalname || req.body.fileName || req.body.file_name;
      const storageUri = req.file
        ? `/uploads/attachments/${req.file.filename}`
        : req.body.storageUri || req.body.storage_uri;
      const mimeType =
        req.file?.mimetype || req.body.mimeType || req.body.mime_type || null;
      const fileSizeBytes =
        req.file?.size !== undefined
          ? req.file.size
          : req.body.fileSizeBytes ?? req.body.file_size_bytes ?? null;

      if (!storageUri) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '`storageUri` (`storage_uri`) is required when not uploading via multipart file.',
        });
        return;
      }

      const result = await auditAndAttachmentsService.uploadAndLinkAttachment({
        fileName,
        storageUri,
        mimeType,
        fileSizeBytes,
        uploadedBy: req.user?.userId || req.body.uploadedBy || req.body.uploaded_by || null,
        entityType,
        entityId,
      });

      res.status(201).json({
        message: result.entityAttachment
          ? 'Evidence attachment uploaded and linked to entity successfully.'
          : 'Evidence attachment uploaded successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async linkAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachmentId =
        req.params.id || req.body.attachmentId || req.body.attachment_id;
      const entityType = req.body.entityType || req.body.entity_type;
      const entityId = req.body.entityId || req.body.entity_id;

      if (!attachmentId || !entityType || !entityId) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message:
            '`attachmentId`, `entityType` (`entity_type`), and `entityId` (`entity_id`) are required.',
        });
        return;
      }

      const data = await auditAndAttachmentsService.linkAttachmentToEntity({
        attachmentId,
        entityType,
        entityId,
      });

      res.status(201).json({
        message: 'Attachment linked to entity successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async listAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const entityType =
        (req.params.entityType as string | undefined) ||
        (req.query.entityType as string | undefined) ||
        (req.query.entity_type as string | undefined);
      const entityId =
        (req.params.entityId as string | undefined) ||
        (req.query.entityId as string | undefined) ||
        (req.query.entity_id as string | undefined);

      const data = await auditAndAttachmentsService.listAttachments({
        entityType,
        entityId,
      });

      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getAttachmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await auditAndAttachmentsService.getAttachmentById(
        String(req.params.id)
      );
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const fileInfo = await auditAndAttachmentsService.getAttachmentFileForDownload(
        String(req.params.id)
      );

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Content-Security-Policy', "default-src 'none'");

      if (fileInfo.mimeType) {
        res.setHeader('Content-Type', fileInfo.mimeType);
      }
      res.download(fileInfo.absolutePath, fileInfo.fileName);
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await auditAndAttachmentsService.deleteAttachment(
        String(req.params.id)
      );
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  // ===========================================================================
  // 3. CONFIGURABLE COMPLIANCE RECORDS & EVIDENCE PACKAGES ENDPOINTS
  // ===========================================================================

  async listFrameworks(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = complianceAndEvidenceService.getFrameworkProfiles();
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async listComplianceRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const frameworkCode = req.query.framework as ComplianceFrameworkCode | undefined;
      const data = await complianceAndEvidenceService.listComplianceRecords(frameworkCode);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async recordComplianceVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { status, verifiedBy, inspectorCertificationNumber, findingsNotes, attachmentIds } = req.body;

      if (!status || !verifiedBy || !findingsNotes) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '`status`, `verifiedBy`, and `findingsNotes` are mandatory.',
        });
        return;
      }

      const data = await complianceAndEvidenceService.recordVerification(id, {
        status,
        verifiedBy,
        inspectorCertificationNumber,
        findingsNotes,
        attachmentIds,
      });

      res.status(200).json({
        message: 'Compliance verification recorded successfully in regulatory audit log.',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async buildEvidencePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        frameworkCode,
        targetAssetCode,
        startDate,
        endDate,
        includeAuditLogs,
        includeAttachments,
        includeLogbooks,
      } = req.body;

      if (!frameworkCode || !startDate || !endDate) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '`frameworkCode`, `startDate`, and `endDate` are mandatory.',
        });
        return;
      }

      const data = await complianceAndEvidenceService.buildEvidencePackage({
        frameworkCode,
        targetAssetCode,
        startDate,
        endDate,
        includeAuditLogs,
        includeAttachments,
        includeLogbooks,
      });

      res.status(201).json({
        message: 'Tamper-evident evidence package compiled successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvidencePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const data = await complianceAndEvidenceService.getEvidencePackageById(id);

      if (!data) {
        res.status(404).json({
          error: 'EVIDENCE_PACKAGE_NOT_FOUND',
          message: `Evidence package '${id}' not found.`,
        });
        return;
      }

      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async verifyEvidencePackageDigest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const pkg = await complianceAndEvidenceService.getEvidencePackageById(id);

      if (!pkg) {
        res.status(404).json({
          error: 'EVIDENCE_PACKAGE_NOT_FOUND',
          message: `Evidence package '${id}' not found.`,
        });
        return;
      }

      const result = complianceAndEvidenceService.verifyPackageDigest(pkg);
      res.status(200).json({
        packageId: id,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const auditAndAttachmentsController =
  new AuditAndAttachmentsController();
