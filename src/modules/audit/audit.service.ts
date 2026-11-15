import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  requireCurrentTenantId,
  getCurrentUserId,
  getTenantContext,
} from '../../tenant/tenant.context';
import { TenantSecurityError } from '../../tenant/tenant.errors';
import { Prisma } from '@prisma/client';
import { ForeignKeyViolationError } from '../assets/hierarchy.validator';
import { sanitizeForAuditLog } from './data-protection.sanitizer';

export interface CreateAuditLogDto {
  action: 'UPDATE' | 'DELETE' | 'CREATE' | 'STATUS_TRANSITION' | 'APPROVAL' | 'REJECTION' | string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogFilterParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface UploadEvidenceAttachmentDto {
  fileName: string;
  storageUri: string;
  mimeType?: string | null;
  fileSizeBytes?: number | bigint | null;
  uploadedBy?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  evidenceCategory?: 'equipment_photo' | 'inspection_evidence' | 'maintenance_report' | 'supporting_document' | string | null;
  checksumSha256?: string | null;
}

export interface LinkEntityAttachmentDto {
  attachmentId: string;
  entityType: string;
  entityId: string;
}

/**
 * Normalizes records containing Prisma `BigInt` fields (`AuditLog.id`, `Attachment.fileSizeBytes`)
 * so Express `res.json()` serializes them cleanly without BigInt serialization errors.
 */
export function serializeBigIntFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export class AuditAndAttachmentsService {
  // ===========================================================================
  // 1. AUDIT LOGS SERVICE
  // ===========================================================================

  async recordAuditLog(dto: CreateAuditLogDto) {
    const organizationId = requireCurrentTenantId();
    const ctx = getTenantContext();
    const effectiveUserId = dto.userId ?? getCurrentUserId() ?? null;
    const ipAddress =
      dto.ipAddress ??
      (typeof ctx?.metadata?.ipAddress === 'string'
        ? ctx.metadata.ipAddress
        : null);
    const userAgent =
      dto.userAgent ??
      (typeof ctx?.metadata?.userAgent === 'string'
        ? ctx.metadata.userAgent
        : null);

    const sanitizedOld =
      dto.oldValues !== undefined && dto.oldValues !== null
        ? sanitizeForAuditLog(dto.oldValues)
        : null;
    const sanitizedNew =
      dto.newValues !== undefined && dto.newValues !== null
        ? sanitizeForAuditLog(dto.newValues)
        : null;

    const created = await tenantPrisma.auditLog.create({
      data: {
        organizationId,
        userId: effectiveUserId,
        action: dto.action.trim().toUpperCase(),
        entityType: dto.entityType.trim().toLowerCase(),
        entityId: dto.entityId || null,
        oldValues:
          sanitizedOld !== null
            ? (JSON.parse(JSON.stringify(sanitizedOld)) as Prisma.InputJsonValue)
            : Prisma.DbNull,
        newValues:
          sanitizedNew !== null
            ? (JSON.parse(JSON.stringify(sanitizedNew)) as Prisma.InputJsonValue)
            : Prisma.DbNull,
        ipAddress,
        userAgent,
      },
    });

    return serializeBigIntFields(created);
  }

  async listAuditLogs(filters?: AuditLogFilterParams) {
    const take =
      filters?.limit && filters.limit > 0 && filters.limit <= 500
        ? filters.limit
        : 100;

    const logs = await tenantPrisma.auditLog.findMany({
      where: {
        ...(filters?.entityType
          ? { entityType: filters.entityType.trim().toLowerCase() }
          : {}),
        ...(filters?.entityId ? { entityId: filters.entityId } : {}),
        ...(filters?.action
          ? { action: filters.action.trim().toUpperCase() }
          : {}),
        ...(filters?.userId ? { userId: filters.userId } : {}),
        ...(filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return serializeBigIntFields(logs);
  }

  /**
   * Generates an RFC 4180 compliant CSV export of audit logs with UTF-8 BOM.
   */
  async exportAuditLogsToCsv(filters?: AuditLogFilterParams): Promise<string> {
    const logs = await this.listAuditLogs(filters);

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
      'Old Values (Sanitized)',
      'New Values (Sanitized)',
    ];

    const rows = logs.map((log: any) => [
      escapeCsv(log.id),
      escapeCsv(log.createdAt),
      escapeCsv(log.action),
      escapeCsv(log.entityType),
      escapeCsv(log.entityId),
      escapeCsv(log.userId),
      escapeCsv(log.user?.fullName || log.user?.email || ''),
      escapeCsv(log.ipAddress),
      escapeCsv(log.userAgent),
      escapeCsv(log.oldValues),
      escapeCsv(log.newValues),
    ]);

    const lines = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) => r.join(',')),
    ];

    return '\uFEFF' + lines.join('\r\n');
  }

  // ===========================================================================
  // 2. EVIDENCE ATTACHMENTS & ENTITY_ATTACHMENTS SERVICE
  // ===========================================================================

  /**
   * Saves uploaded file metadata to the `attachments` table and atomically links it
   * to the target entity (e.g. `assets`, `work_orders`, `fault_logs`, `inspections`)
   * in the `entity_attachments` table inside a single database transaction.
   */
  async uploadAndLinkAttachment(dto: UploadEvidenceAttachmentDto) {
    const organizationId = requireCurrentTenantId();
    const effectiveUserId = dto.uploadedBy ?? getCurrentUserId() ?? null;

    const normalizedEntityType = dto.entityType
      ? dto.entityType.trim().toLowerCase()
      : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Attachment metadata record
      const attachment = await tx.attachment.create({
        data: {
          organizationId,
          fileName: dto.fileName.trim(),
          storageUri: dto.storageUri.trim(),
          mimeType: dto.mimeType || null,
          fileSizeBytes:
            dto.fileSizeBytes !== undefined && dto.fileSizeBytes !== null
              ? BigInt(dto.fileSizeBytes)
              : null,
          uploadedBy: effectiveUserId,
        },
      });

      // 2. If entityType & entityId are provided, link via `entity_attachments`
      let entityLink = null;
      if (normalizedEntityType && dto.entityId) {
        entityLink = await tx.entityAttachment.create({
          data: {
            organizationId,
            attachmentId: attachment.id,
            entityType: normalizedEntityType,
            entityId: dto.entityId,
          },
        });
      }

      return {
        attachment,
        entityAttachment: entityLink,
      };
    });

    // Compute or retrieve SHA-256 checksum
    let computedChecksum = dto.checksumSha256 || null;
    if (!computedChecksum) {
      try {
        const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
        const safeUri = String(dto.storageUri || '').replace(/^[\\\/]+/, '');
        const targetPath = path.resolve(process.cwd(), safeUri);
        if (fs.existsSync(targetPath)) {
          const fileBuffer = fs.readFileSync(targetPath);
          computedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Automatically record an audit log for attachment creation
    try {
      await this.recordAuditLog({
        action: 'ATTACHMENT_UPLOAD',
        entityType: normalizedEntityType || 'attachments',
        entityId: dto.entityId || result.attachment.id,
        newValues: {
          attachmentId: result.attachment.id,
          fileName: result.attachment.fileName,
          storageUri: result.attachment.storageUri,
          mimeType: result.attachment.mimeType,
          fileSizeBytes: dto.fileSizeBytes ? Number(dto.fileSizeBytes) : null,
          evidenceCategory: dto.evidenceCategory || 'supporting_document',
          checksumSha256: computedChecksum,
        },
        userId: effectiveUserId,
      });
    } catch {
      // Non-blocking
    }

    return serializeBigIntFields({
      ...result,
      checksumSha256: computedChecksum,
    });
  }

  /**
   * Links an existing attachment to an entity (`entity_attachments`).
   */
  async linkAttachmentToEntity(dto: LinkEntityAttachmentDto) {
    const organizationId = requireCurrentTenantId();

    const attachment = await tenantPrisma.attachment.findFirst({
      where: { id: dto.attachmentId },
    });

    if (!attachment) {
      throw new ForeignKeyViolationError(
        'attachmentId',
        dto.attachmentId,
        `Attachment '${dto.attachmentId}' not found in active organization.`
      );
    }

    const normalizedEntityType = dto.entityType.trim().toLowerCase();

    const link = await tenantPrisma.entityAttachment.upsert({
      where: {
        organizationId_attachmentId_entityType_entityId: {
          organizationId,
          attachmentId: dto.attachmentId,
          entityType: normalizedEntityType,
          entityId: dto.entityId,
        },
      },
      create: {
        organizationId,
        attachmentId: dto.attachmentId,
        entityType: normalizedEntityType,
        entityId: dto.entityId,
      },
      update: {},
      include: {
        attachment: true,
      },
    });

    return serializeBigIntFields(link);
  }

  /**
   * Lists all attachments in the organization, or filtered by `entityType` and `entityId`.
   */
  async listAttachments(filters?: { entityType?: string; entityId?: string }) {
    if (filters?.entityType || filters?.entityId) {
      const links = await tenantPrisma.entityAttachment.findMany({
        where: {
          ...(filters.entityType
            ? { entityType: filters.entityType.trim().toLowerCase() }
            : {}),
          ...(filters.entityId ? { entityId: filters.entityId } : {}),
        },
        include: {
          attachment: {
            include: {
              uploadedByUser: {
                select: { id: true, email: true, fullName: true },
              },
            },
          },
        },
      });
      return serializeBigIntFields(links);
    }

    const attachments = await tenantPrisma.attachment.findMany({
      include: {
        entityAttachments: true,
        uploadedByUser: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return serializeBigIntFields(attachments);
  }

  async getAttachmentById(id: string) {
    const attachment = await tenantPrisma.attachment.findFirst({
      where: { id },
      include: {
        entityAttachments: true,
        uploadedByUser: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    if (!attachment) {
      throw {
        status: 404,
        code: 'ATTACHMENT_NOT_FOUND',
        message: `Attachment '${id}' not found in active organization.`,
      };
    }

    return serializeBigIntFields(attachment);
  }

  async deleteAttachment(id: string) {
    const existing = await this.getAttachmentById(id);
    await tenantPrisma.attachment.delete({
      where: { id },
    });

    try {
      await this.recordAuditLog({
        action: 'ATTACHMENT_DELETE',
        entityType: 'attachments',
        entityId: id,
        oldValues: existing,
        userId: getCurrentUserId() ?? null,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: `Attachment '${id}' deleted successfully.`,
    };
  }

  /**
   * Securely resolves attachment file path for downloading, enforcing tenant isolation
   * and directory traversal attack defenses.
   */
  async getAttachmentFileForDownload(id: string) {
    const attachment = await this.getAttachmentById(id);
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

    // Normalize paths to prevent directory traversal
    const uri = String(attachment.storageUri || '').trim();
    const isWindowsAbsolute = /^[a-zA-Z]:[\\\/]/.test(uri) || uri.startsWith('\\\\');

    let absolutePath: string;
    if (isWindowsAbsolute) {
      absolutePath = path.resolve(uri);
    } else {
      // Strip leading slashes to treat URL-style /uploads as relative to project uploads directory
      const relativePart = uri.replace(/^[\\\/]+/, '');
      if (
        relativePart.toLowerCase().startsWith('uploads' + path.sep) ||
        relativePart.toLowerCase().startsWith('uploads/') ||
        relativePart.toLowerCase().startsWith('uploads\\')
      ) {
        absolutePath = path.resolve(process.cwd(), relativePart);
      } else {
        absolutePath = path.resolve(uploadRoot, relativePart);
      }
    }

    const normalizedRoot = uploadRoot.toLowerCase();
    const normalizedTarget = absolutePath.toLowerCase();
    const fallbackUploads = path.resolve(process.cwd(), 'uploads').toLowerCase();

    if (!normalizedTarget.startsWith(normalizedRoot) && !normalizedTarget.startsWith(fallbackUploads)) {
      throw new TenantSecurityError(
        'Access denied: Directory traversal or out-of-bounds file access detected',
        'PATH_TRAVERSAL_DETECTED'
      );
    }

    if (!fs.existsSync(absolutePath)) {
      throw {
        status: 404,
        code: 'FILE_NOT_FOUND_ON_DISK',
        message: 'The physical file associated with this attachment could not be located on disk.',
      };
    }

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      absolutePath,
    };
  }
}

export const auditAndAttachmentsService = new AuditAndAttachmentsService();
