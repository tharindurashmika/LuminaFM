import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { signToken } from '../src/utils/jwt.utils';
import { createTenantExtension } from '../src/tenant/tenant.extension';
import { runWithTenantContext } from '../src/tenant/tenant.context';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const ASSET_ID = '33333333-3333-4333-8333-333333333333';
const WORK_ORDER_ID = '44444444-4444-4444-8444-444444444444';
const ATTACHMENT_ID = '55555555-5555-4555-8555-555555555555';

const validToken = signToken({
  userId: USER_ID,
  organizationId: ORG_ID,
  email: 'reliability.engineer@luminafm.io',
});

// Mock state for database tables
const mockAuditLogs: any[] = [];
const mockAttachments: any[] = [];
const mockEntityAttachments: any[] = [];

const mockTx = {
  attachment: {
    create: vi.fn(async ({ data }: any) => {
      const record = {
        id: ATTACHMENT_ID,
        ...data,
        uploadedAt: new Date('2026-11-14T15:00:00.000Z'),
      };
      mockAttachments.push(record);
      return record;
    }),
  },
  entityAttachment: {
    create: vi.fn(async ({ data }: any) => {
      const link = {
        ...data,
      };
      mockEntityAttachments.push(link);
      return link;
    }),
  },
};

vi.mock('../src/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(async (cb: any) => cb(mockTx)),
  },
}));

vi.mock('../src/tenant/tenant.client', () => ({
  default: {
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const entry = {
          id: BigInt(mockAuditLogs.length + 1001),
          ...data,
          createdAt: new Date('2026-11-14T15:00:00.000Z'),
        };
        mockAuditLogs.push(entry);
        return entry;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockAuditLogs.filter((log) => {
          if (where?.entityType && log.entityType !== where.entityType) {
            return false;
          }
          if (where?.entityId && log.entityId !== where.entityId) {
            return false;
          }
          if (where?.action && log.action !== where.action) {
            return false;
          }
          return true;
        });
      }),
    },
    attachment: {
      findFirst: vi.fn(async ({ where }: any) => {
        return mockAttachments.find((a) => a.id === where?.id) || null;
      }),
      findMany: vi.fn(async () => mockAttachments),
      delete: vi.fn(async ({ where }: any) => {
        const idx = mockAttachments.findIndex((a) => a.id === where.id);
        if (idx >= 0) {
          return mockAttachments.splice(idx, 1)[0];
        }
        return null;
      }),
    },
    entityAttachment: {
      upsert: vi.fn(async ({ create }: any) => {
        const record = {
          ...create,
          attachment:
            mockAttachments.find((a) => a.id === create.attachmentId) || null,
        };
        mockEntityAttachments.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockEntityAttachments
          .filter((ea) => {
            if (where?.entityType && ea.entityType !== where.entityType) {
              return false;
            }
            if (where?.entityId && ea.entityId !== where.entityId) {
              return false;
            }
            return true;
          })
          .map((ea) => ({
            ...ea,
            attachment:
              mockAttachments.find((a) => a.id === ea.attachmentId) || null,
          }));
      }),
    },
  },
}));

import app from '../src/app';

describe('Audit Logs Interceptor & Evidence Attachments Domain', () => {
  beforeEach(() => {
    mockAuditLogs.length = 0;
    mockAttachments.length = 0;
    mockEntityAttachments.length = 0;
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. GLOBAL PRISMA EXTENSION INTERCEPTOR FOR AUTOMATIC AUDIT LOGGING
  // ===========================================================================
  describe('1. Automatic Prisma Extension Audit Interceptor (UPDATE & DELETE)', () => {
    function setupAuditedMockExtension() {
      const extensionDef = createTenantExtension();
      let queryExtensionObj: any;

      const mockAuditCreate = vi.fn();
      const mockAssetFindFirst = vi.fn();
      const mockWorkOrderFindFirst = vi.fn();

      const mockClient: any = {
        $extends: vi.fn((extConfig: any) => {
          queryExtensionObj = extConfig.query.$allModels;
          return mockClient;
        }),
        Asset: {
          findFirst: mockAssetFindFirst,
        },
        WorkOrder: {
          findFirst: mockWorkOrderFindFirst,
        },
        AuditLog: {
          create: mockAuditCreate,
        },
      };

      (extensionDef as any)(mockClient);

      return {
        queries: queryExtensionObj,
        mockAuditCreate,
        mockAssetFindFirst,
        mockWorkOrderFindFirst,
      };
    }

    it('should automatically log an UPDATE on `Asset` into `audit_logs` with `old_values`, `new_values`, and `user_id`', async () => {
      const { queries, mockAuditCreate, mockAssetFindFirst } =
        setupAuditedMockExtension();

      const oldAssetRecord = {
        id: ASSET_ID,
        organizationId: ORG_ID,
        assetCode: 'BLR-101',
        name: 'Primary Fire-Tube Steam Boiler',
        status: 'in_service',
        criticality: 'high',
      };

      const updatedAssetRecord = {
        ...oldAssetRecord,
        status: 'under_maintenance',
        criticality: 'critical',
      };

      mockAssetFindFirst.mockResolvedValue(oldAssetRecord);
      const mockQuery = vi.fn().mockResolvedValue(updatedAssetRecord);

      await runWithTenantContext(
        {
          organizationId: ORG_ID,
          userId: USER_ID,
          metadata: {
            ipAddress: '10.24.0.15',
            userAgent: 'LuminaFM-Tablet/2.0',
          },
        },
        async () => {
          const res = await queries.update({
            model: 'Asset',
            args: {
              where: { id: ASSET_ID },
              data: { status: 'under_maintenance', criticality: 'critical' },
            },
            query: mockQuery,
          });

          expect(res).toEqual(updatedAssetRecord);
        }
      );

      expect(mockAuditCreate).toHaveBeenCalledTimes(1);
      const auditPayload = mockAuditCreate.mock.calls[0][0].data;
      expect(auditPayload).toMatchObject({
        organizationId: ORG_ID,
        userId: USER_ID,
        action: 'UPDATE',
        entityType: 'assets',
        entityId: ASSET_ID,
        oldValues: oldAssetRecord,
        newValues: updatedAssetRecord,
        ipAddress: '10.24.0.15',
        userAgent: 'LuminaFM-Tablet/2.0',
      });
    });

    it('should automatically log a DELETE on `WorkOrder` into `audit_logs` with `old_values` and `new_values = DbNull`', async () => {
      const { queries, mockAuditCreate, mockWorkOrderFindFirst } =
        setupAuditedMockExtension();

      const existingWorkOrder = {
        id: WORK_ORDER_ID,
        organizationId: ORG_ID,
        workOrderNumber: 'WO-2026-00042',
        title: 'Emergency Burner Nozzle Replacement',
        status: 'draft',
        priority: 'urgent',
      };

      mockWorkOrderFindFirst.mockResolvedValue(existingWorkOrder);
      const mockQuery = vi.fn().mockResolvedValue(existingWorkOrder);

      await runWithTenantContext(
        {
          organizationId: ORG_ID,
          userId: USER_ID,
        },
        async () => {
          await queries.delete({
            model: 'WorkOrder',
            args: { where: { id: WORK_ORDER_ID } },
            query: mockQuery,
          });
        }
      );

      expect(mockAuditCreate).toHaveBeenCalledTimes(1);
      const auditPayload = mockAuditCreate.mock.calls[0][0].data;
      expect(auditPayload.organizationId).toBe(ORG_ID);
      expect(auditPayload.userId).toBe(USER_ID);
      expect(auditPayload.action).toBe('DELETE');
      expect(auditPayload.entityType).toBe('work_orders');
      expect(auditPayload.entityId).toBe(WORK_ORDER_ID);
      expect(auditPayload.oldValues).toEqual(existingWorkOrder);
    });
  });

  // ===========================================================================
  // 2. AUDIT LOGS REST API ENDPOINTS (`/api/audit-logs`)
  // ===========================================================================
  describe('2. Audit Logs REST API (/api/audit-logs)', () => {
    it('should create and list audit logs with BigInt id serialized safely', async () => {
      const createRes = await request(app)
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          action: 'UPDATE',
          entityType: 'assets',
          entityId: ASSET_ID,
          oldValues: { status: 'in_service' },
          newValues: { status: 'under_maintenance' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.id).toBe('1001');
      expect(createRes.body.data.entityType).toBe('assets');
      expect(createRes.body.data.userId).toBe(USER_ID);

      const listRes = await request(app)
        .get(`/api/audit-logs?entityType=assets&entityId=${ASSET_ID}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].oldValues).toEqual({ status: 'in_service' });
      expect(listRes.body.data[0].newValues).toEqual({
        status: 'under_maintenance',
      });
    });
  });

  // ===========================================================================
  // 3. MULTER EVIDENCE UPLOAD & ENTITY_ATTACHMENTS LINKING (`/api/attachments`)
  // ===========================================================================
  describe('3. Multer File Upload & Entity Attachments API (/api/attachments)', () => {
    it('should upload a broken boiler component photo via Multer, save metadata to `attachments`, and link it in `entity_attachments`', async () => {
      const fakeJpegBuffer = Buffer.from(
        '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xd9',
        'binary'
      );

      const uploadRes = await request(app)
        .post('/api/attachments')
        .set('Authorization', `Bearer ${validToken}`)
        .field('entityType', 'assets')
        .field('entityId', ASSET_ID)
        .attach('file', fakeJpegBuffer, {
          filename: 'cracked-boiler-pressure-relief-valve.jpg',
          contentType: 'image/jpeg',
        });

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.message).toContain(
        'Evidence attachment uploaded and linked to entity successfully.'
      );

      const { attachment, entityAttachment } = uploadRes.body.data;
      expect(attachment.id).toBe(ATTACHMENT_ID);
      expect(attachment.organizationId).toBe(ORG_ID);
      expect(attachment.fileName).toBe(
        'cracked-boiler-pressure-relief-valve.jpg'
      );
      expect(attachment.mimeType).toBe('image/jpeg');
      expect(attachment.storageUri).toMatch(
        /^\/uploads\/attachments\/evidence-/
      );
      expect(attachment.uploadedBy).toBe(USER_ID);
      expect(typeof attachment.fileSizeBytes).toBe('string');

      expect(entityAttachment).toEqual({
        organizationId: ORG_ID,
        attachmentId: ATTACHMENT_ID,
        entityType: 'assets',
        entityId: ASSET_ID,
      });

      // Verify querying attachments by entity (`/api/entities/assets/:entityId/attachments`)
      const entityAttachmentsRes = await request(app)
        .get(`/api/entities/assets/${ASSET_ID}/attachments`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(entityAttachmentsRes.status).toBe(200);
      expect(entityAttachmentsRes.body.data).toHaveLength(1);
      expect(entityAttachmentsRes.body.data[0].attachment.fileName).toBe(
        'cracked-boiler-pressure-relief-valve.jpg'
      );
    });

    it('should also allow linking an existing attachment to a work_order via POST /api/attachments/:id/link', async () => {
      // Seed an attachment first
      mockAttachments.push({
        id: ATTACHMENT_ID,
        organizationId: ORG_ID,
        fileName: 'boiler-flue-thermography.png',
        storageUri: '/uploads/attachments/boiler-flue-thermography.png',
        mimeType: 'image/png',
        fileSizeBytes: BigInt(4096),
        uploadedBy: USER_ID,
        uploadedAt: new Date(),
      });

      const linkRes = await request(app)
        .post(`/api/attachments/${ATTACHMENT_ID}/link`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          entityType: 'work_orders',
          entityId: WORK_ORDER_ID,
        });

      expect(linkRes.status).toBe(201);
      expect(linkRes.body.data.entityType).toBe('work_orders');
      expect(linkRes.body.data.entityId).toBe(WORK_ORDER_ID);
      expect(linkRes.body.data.attachmentId).toBe(ATTACHMENT_ID);
    });

    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(401);
    });
  });
});
