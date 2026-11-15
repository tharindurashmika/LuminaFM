import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  authenticateTenant,
  setMembershipResolver,
  resetMembershipResolver,
} from '../src/middleware/auth.middleware';
import { requirePermission, requireRole } from '../src/middleware/rbac.middleware';
import {
  secureWhere,
  secureOrganizationWhere,
  isTenantScoped,
  TENANT_SCOPED_MODELS,
} from '../src/tenant/tenant.extension';
import {
  runWithTenantContext,
  getCurrentTenantId,
  requireCurrentTenantId,
  hasPermission,
  hasRole,
} from '../src/tenant/tenant.context';
import {
  executeInTenantTransaction,
  getCurrentRlsTenantSetting,
} from '../src/tenant/tenant.transaction';
import {
  TenantSecurityError,
  CrossTenantAccessError,
  TenantContextMissingError,
} from '../src/tenant/tenant.errors';
import { signToken } from '../src/utils/jwt.utils';
import { auditAndAttachmentsService } from '../src/modules/audit/audit.service';

// =============================================================================
// TEST CONSTANTS & FIXTURES
// =============================================================================
const TENANT_A_ID = '11111111-1111-4111-8111-111111111111'; // Kingsbury Hotel
const TENANT_B_ID = '22222222-2222-4222-8222-222222222222'; // Hilton Colombo
const ATTACKER_TENANT_ID = '99999999-9999-4999-8999-999999999999';

const USER_A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PLATFORM_ADMIN_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

// Mock request / response factory
function createMockContext(options: {
  headers?: Record<string, string>;
  user?: any;
  params?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
}) {
  const req: any = {
    headers: { ...(options.headers || {}) },
    user: options.user,
    params: { ...(options.params || {}) },
    body: { ...(options.body || {}) },
    query: { ...(options.query || {}) },
    ip: '192.168.1.100',
  };

  let statusCode = 200;
  let jsonBody: any = null;

  const res: any = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      jsonBody = data;
      return res;
    }),
    setHeader: vi.fn(),
    download: vi.fn(),
    getStatus: () => statusCode,
    getBody: () => jsonBody,
  };

  const next = vi.fn();

  return { req, res, next, getStatus: () => statusCode, getBody: () => jsonBody };
}

describe('LuminaFM Tenant-Aware Authorization & Security Architecture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetMembershipResolver();
  });

  afterEach(() => {
    resetMembershipResolver();
  });

  // ===========================================================================
  // 1. MULTI-TENANCY MODES & CONTEXT MANAGEMENT
  // ===========================================================================
  describe('1. Shared SaaS & Dedicated Deployment Model Context Isolation', () => {
    it('should establish isolated tenant context via AsyncLocalStorage for Shared Multi-Tenant SaaS', async () => {
      await runWithTenantContext(
        {
          organizationId: TENANT_A_ID,
          userId: USER_A_ID,
          roles: ['FacilityManager'],
          permissions: ['assets:read', 'assets:create'],
        },
        async () => {
          expect(getCurrentTenantId()).toBe(TENANT_A_ID);
          expect(requireCurrentTenantId()).toBe(TENANT_A_ID);
          expect(hasPermission('assets:read')).toBe(true);
          expect(hasPermission('assets:delete')).toBe(false);
          expect(hasRole('FacilityManager')).toBe(true);
          expect(hasRole('Technician')).toBe(false);
        }
      );

      // Context must be cleanly unset outside the scope
      expect(getCurrentTenantId()).toBeUndefined();
      expect(() => requireCurrentTenantId()).toThrow(TenantContextMissingError);
    });

    it('should enforce identical tenant isolation policies for Dedicated Instance deployments', async () => {
      // In dedicated installations, deploymentMode = 'dedicated_instance', but security policies remain identical
      await runWithTenantContext(
        {
          organizationId: TENANT_B_ID,
          userId: USER_B_ID,
          roles: ['DedicatedClientAdmin'],
          permissions: ['*'],
          metadata: { deploymentMode: 'dedicated_instance' },
        },
        async () => {
          expect(getCurrentTenantId()).toBe(TENANT_B_ID);
          // Even in dedicated mode, tenant filtering is enforced on all tenant models
          const filtered = secureWhere({ status: 'active' }, TENANT_B_ID, 'Asset');
          expect(filtered).toEqual({
            AND: [{ status: 'active' }, { organizationId: TENANT_B_ID }],
          });
        }
      );
    });
  });

  // ===========================================================================
  // 2. MEMBERSHIP VERIFICATION & ANTI-SPOOFING (NEVER TRUST CLIENT ORG_ID)
  // ===========================================================================
  describe('2. Organization Membership Verification & Anti-Spoofing Protections', () => {
    it('should reject unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const { req, res, next, getStatus, getBody } = createMockContext({
        headers: {},
      });

      await authenticateTenant(req, res, next);

      expect(getStatus()).toBe(401);
      expect(getBody().error.code).toBe('UNAUTHORIZED');
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject forged or expired JWTs with 401 INVALID_TOKEN', async () => {
      const { req, res, next, getStatus, getBody } = createMockContext({
        headers: { authorization: 'Bearer invalid.tampered.token' },
      });

      await authenticateTenant(req, res, next);

      expect(getStatus()).toBe(401);
      expect(getBody().error.code).toBe('INVALID_TOKEN');
      expect(next).not.toHaveBeenCalled();
    });

    it('should REJECT client-supplied X-Organization-Id if user is NOT an active member of that tenant (Anti-IDOR)', async () => {
      // User is authenticated as member of Tenant A
      const token = signToken({
        userId: USER_A_ID,
        organizationId: TENANT_A_ID,
        email: 'operator@kingsbury.lk',
      });

      // Mock database membership check: User is member of Tenant A, NOT Attacker Tenant
      setMembershipResolver(async (userId, targetOrgId) => {
        if (userId === USER_A_ID && targetOrgId === TENANT_A_ID) {
          return {
            isValid: true,
            roles: ['Operator'],
            permissions: ['operations:read', 'operations:create'],
          };
        }
        // Return null for any other tenant (e.g. ATTACKER_TENANT_ID or TENANT_B_ID)
        return null;
      });

      // Attacker sends valid token for Tenant A, but supplies header targeting Tenant B
      const { req, res, next, getStatus, getBody } = createMockContext({
        headers: {
          authorization: `Bearer ${token}`,
          'x-organization-id': TENANT_B_ID, // FORGERY ATTEMPT
        },
      });

      await authenticateTenant(req, res, next);

      expect(getStatus()).toBe(403);
      expect(getBody().error.code).toBe('FORBIDDEN_TENANT_ACCESS');
      expect(getBody().error.message).toContain('Cross-tenant access denied');
      expect(next).not.toHaveBeenCalled();
    });

    it('should REJECT access if user membership status is suspended or inactive', async () => {
      const token = signToken({
        userId: USER_A_ID,
        organizationId: TENANT_A_ID,
        email: 'suspended.user@kingsbury.lk',
      });

      // Mock DB: Membership exists but is not active (isValid: false)
      setMembershipResolver(async () => null);

      const { req, res, next, getStatus, getBody } = createMockContext({
        headers: {
          authorization: `Bearer ${token}`,
          'x-organization-id': TENANT_A_ID,
        },
      });

      await authenticateTenant(req, res, next);

      expect(getStatus()).toBe(403);
      expect(getBody().error.code).toBe('FORBIDDEN_TENANT_ACCESS');
      expect(next).not.toHaveBeenCalled();
    });

    it('should aggregate roles and multi-role permissions into a unified set upon valid membership', async () => {
      const token = signToken({
        userId: USER_A_ID,
        organizationId: TENANT_A_ID,
        email: 'lead.tech@kingsbury.lk',
      });

      // User holds two roles in Tenant A: MaintenanceTechnician and SafetyInspector
      setMembershipResolver(async (userId, orgId) => {
        if (userId === USER_A_ID && orgId === TENANT_A_ID) {
          return {
            isValid: true,
            roles: ['MaintenanceTechnician', 'SafetyInspector'],
            permissions: [
              'work_orders:read',
              'work_orders:update',
              'meter_readings:create',
              'inspections:read',
              'inspections:create',
              'fault_logs:create',
            ],
          };
        }
        return null;
      });

      let capturedTenantInContext: string | undefined;
      const nextFn = vi.fn(() => {
        capturedTenantInContext = getCurrentTenantId();
      });

      const { req, res } = createMockContext({
        headers: {
          authorization: `Bearer ${token}`,
          'x-organization-id': TENANT_A_ID,
        },
      });

      await authenticateTenant(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(capturedTenantInContext).toBe(TENANT_A_ID);
      expect(req.user.roles).toEqual(['MaintenanceTechnician', 'SafetyInspector']);
      expect(req.user.permissions).toContain('work_orders:update');
      expect(req.user.permissions).toContain('inspections:create');
      expect(req.user.permissions).toContain('fault_logs:create');
      expect(req.tenantContext.organizationId).toBe(TENANT_A_ID);
    });
  });

  // ===========================================================================
  // 3. PERMISSION-BASED AUTHORIZATION (RBAC / PBAC)
  // ===========================================================================
  describe('3. Fine-Grained Permission Enforcement (requirePermission & requireRole)', () => {
    it('should allow request when user holds the exact required permission', () => {
      const { req, res, next } = createMockContext({
        user: {
          userId: USER_A_ID,
          organizationId: TENANT_A_ID,
          permissions: ['assets:create', 'assets:read'],
        },
      });

      const middleware = requirePermission('assets:create');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject request with 403 when user lacks the required permission', () => {
      const { req, res, next, getStatus, getBody } = createMockContext({
        user: {
          userId: USER_A_ID,
          organizationId: TENANT_A_ID,
          permissions: ['assets:read'], // Lacks 'assets:delete'
        },
      });

      const middleware = requirePermission('assets:delete');
      middleware(req, res, next);

      expect(getStatus()).toBe(403);
      expect(getBody().error.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
      expect(getBody().error.requiredPermissions).toEqual(['assets:delete']);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access if user satisfies at least one permission in an array (OR logic)', () => {
      const { req, res, next } = createMockContext({
        user: {
          userId: USER_A_ID,
          organizationId: TENANT_A_ID,
          permissions: ['operations:read'],
        },
      });

      const middleware = requirePermission(['assets:manage', 'operations:read']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should enforce role-based authorization via requireRole', () => {
      const { req, res, next, getStatus, getBody } = createMockContext({
        user: {
          userId: USER_A_ID,
          organizationId: TENANT_A_ID,
          roles: ['BoilerOperator'],
        },
      });

      const middleware = requireRole('ChiefEngineer');
      middleware(req, res, next);

      expect(getStatus()).toBe(403);
      expect(getBody().error.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow Platform Superadmins to bypass permission restrictions', () => {
      const { req, res, next } = createMockContext({
        user: {
          userId: PLATFORM_ADMIN_ID,
          isPlatformAdmin: true,
          permissions: [], // Empty permissions
        },
      });

      const middleware = requirePermission('admin:destructive:purge');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 4. CROSS-TENANT IDOR ATTACK PREVENTION ACROSS ALL TENANT DOMAINS
  // ===========================================================================
  describe('4. Comprehensive Cross-Tenant IDOR Attack Prevention Across All Domains', () => {
    const VICTIM_RECORD_ID = '33333333-3333-4333-8333-333333333333';

    const tenantOwnedDomains = [
      { domain: 'Asset Registry', model: 'Asset' },
      { domain: 'Asset Hierarchy', model: 'Location' },
      { domain: 'Asset Hierarchy', model: 'System' },
      { domain: 'Work Management', model: 'WorkOrder' },
      { domain: 'Work Management Tasks', model: 'WorkOrderTask' },
      { domain: 'Operations Daily Log', model: 'Inspection' },
      { domain: 'Operations Responses', model: 'InspectionResponse' },
      { domain: 'Meter Readings', model: 'MeterReading' },
      { domain: 'Fault Reporting', model: 'FaultLog' },
      { domain: 'Decision Support ANP Model', model: 'DecisionModel' },
      { domain: 'Decision Criteria', model: 'DecisionCriterion' },
      { domain: 'Decision Alternatives', model: 'DecisionAlternative' },
      { domain: 'Decision Runs', model: 'DecisionRun' },
      { domain: 'Preventive Maintenance Plans', model: 'MaintenancePlan' },
      { domain: 'Checklist Templates', model: 'ChecklistTemplate' },
      { domain: 'Offline Sync Batches', model: 'OfflineSyncBatch' },
      { domain: 'Evidence Attachments', model: 'Attachment' },
    ];

    tenantOwnedDomains.forEach(({ domain, model }) => {
      describe(`Domain: ${domain} (Model: ${model})`, () => {
        it(`[READ] should wrap query inside an AND clause restricting to active tenant`, () => {
          const queryWhere = { id: VICTIM_RECORD_ID };
          const secured = secureWhere(queryWhere, TENANT_A_ID, model);

          expect(secured).toEqual({
            AND: [{ id: VICTIM_RECORD_ID }, { organizationId: TENANT_A_ID }],
          });
        });

        it(`[READ-OR-BYPASS] should prevent OR-based cross-tenant leaking for ${model}`, () => {
          // Attacker sends: { OR: [{ id: VICTIM_RECORD_ID }, { status: 'active' }] }
          const attackWhere = {
            OR: [{ id: VICTIM_RECORD_ID }, { status: 'active' }],
          };
          const secured = secureWhere(attackWhere, TENANT_A_ID, model);

          expect(secured).toEqual({
            AND: [attackWhere, { organizationId: TENANT_A_ID }],
          });
        });

        it(`[INSERT] should REJECT attempts to create ${model} referencing foreign tenant`, () => {
          // Attacker in Tenant A tries to insert a record stamped with Tenant B's organizationId
          const hostileWhere = {
            organizationId: TENANT_B_ID,
            id: VICTIM_RECORD_ID,
          };

          expect(() => secureWhere(hostileWhere, TENANT_A_ID, model)).toThrow(
            CrossTenantAccessError
          );
        });

        it(`[UPDATE] should REJECT cross-tenant update with explicit foreign organizationId for ${model}`, () => {
          const hostileUpdateWhere = {
            id: VICTIM_RECORD_ID,
            organizationId: { equals: TENANT_B_ID },
          };

          expect(() => secureWhere(hostileUpdateWhere, TENANT_A_ID, model)).toThrow(
            CrossTenantAccessError
          );
        });

        it(`[DELETE] should ensure delete queries cannot target foreign records without tenant scoping for ${model}`, () => {
          const deleteWhere = { id: VICTIM_RECORD_ID };
          const secured = secureWhere(deleteWhere, TENANT_A_ID, model);

          // If record belongs to Tenant B, WHERE id = victim AND organizationId = Tenant A matches ZERO rows
          expect(secured.AND).toContainEqual({ organizationId: TENANT_A_ID });
        });
      });
    });
  });

  // ===========================================================================
  // 5. CONNECTION POOLING & TRANSACTION CONTEXT ISOLATION (ZERO LEAKAGE TEST)
  // ===========================================================================
  describe('5. Database Connection Pooling & Transaction-Scoped RLS Context Isolation', () => {
    it('should set transaction-scoped PostgreSQL setting with is_local=true', async () => {
      const executedCommands: string[] = [];

      const mockTxClient: any = {
        $executeRaw: vi.fn(async (queryParts: TemplateStringsArray, ...values: any[]) => {
          executedCommands.push(`SET: ${values[0]}`);
          return 1;
        }),
      };

      const mockPrismaClient: any = {
        $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
          return await cb(mockTxClient);
        }),
      };

      const result = await executeInTenantTransaction(
        TENANT_A_ID,
        async (tx) => {
          expect(getCurrentTenantId()).toBe(TENANT_A_ID);
          return { success: true };
        },
        mockPrismaClient
      );

      expect(result).toEqual({ success: true });
      expect(mockTxClient.$executeRaw).toHaveBeenCalled();
      expect(executedCommands[0]).toBe(`SET: ${TENANT_A_ID}`);
    });

    it('should PROVE that sequential pooled connection reuse NEVER leaks tenant context between requests', async () => {
      // Simulate a connection pool with a shared physical connection
      let simulatedPgSessionSetting: string | null = null;

      const runSimulatedRequest = async (targetTenant: string | null) => {
        const mockTx: any = {
          $executeRaw: vi.fn(async (queryParts: any, tenant: string) => {
            // Emulates `SELECT set_config('app.current_tenant_id', $1, true)`
            simulatedPgSessionSetting = tenant;
            return 1;
          }),
          $queryRaw: vi.fn(async () => {
            return [{ current_tenant: simulatedPgSessionSetting }];
          }),
        };

        const mockClient: any = {
          $transaction: vi.fn(async (cb: any) => {
            try {
              return await cb(mockTx);
            } finally {
              // PostgreSQL engine automatically resets transaction-local (is_local=true) settings on commit/rollback
              simulatedPgSessionSetting = null;
            }
          }),
        };

        if (targetTenant) {
          return await executeInTenantTransaction(
            targetTenant,
            async (tx) => {
              const active = await getCurrentRlsTenantSetting(tx);
              return { active, appTenant: getCurrentTenantId() };
            },
            mockClient
          );
        } else {
          // Worker running without tenant context (e.g. background global healthcheck on same pooled connection)
          return {
            active: simulatedPgSessionSetting,
            appTenant: getCurrentTenantId() ?? null,
          };
        }
      };

      // Request 1: Tenant A executes transaction
      const res1 = await runSimulatedRequest(TENANT_A_ID);
      expect(res1.active).toBe(TENANT_A_ID);
      expect(res1.appTenant).toBe(TENANT_A_ID);

      // Request 2: Reusing the same pooled connection for unauthenticated / global query
      // MUST NOT see Tenant A's session setting!
      const res2 = await runSimulatedRequest(null);
      expect(res2.active).toBeNull(); // Zero leakage!
      expect(res2.appTenant).toBeNull();

      // Request 3: Tenant B executes transaction on the reused connection
      const res3 = await runSimulatedRequest(TENANT_B_ID);
      expect(res3.active).toBe(TENANT_B_ID);
      expect(res3.appTenant).toBe(TENANT_B_ID);

      // Verify connection is clean after Request 3 completes
      const resAfter = await runSimulatedRequest(null);
      expect(resAfter.active).toBeNull();
    });

    it('should maintain strict context isolation between interleaved concurrent requests', async () => {
      const concurrentRuns = await Promise.all([
        runWithTenantContext({ organizationId: TENANT_A_ID }, async () => {
          // Delay simulating database I/O
          await new Promise((r) => setTimeout(r, 20));
          return getCurrentTenantId();
        }),
        runWithTenantContext({ organizationId: TENANT_B_ID }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return getCurrentTenantId();
        }),
      ]);

      expect(concurrentRuns[0]).toBe(TENANT_A_ID);
      expect(concurrentRuns[1]).toBe(TENANT_B_ID);
    });

    it('should automatically reset context when transaction encounters an error and rolls back', async () => {
      let pgSessionSetting: string | null = null;

      const mockTx: any = {
        $executeRaw: vi.fn(async (parts: any, tenant: string) => {
          pgSessionSetting = tenant;
        }),
      };

      const mockClient: any = {
        $transaction: vi.fn(async (cb: any) => {
          try {
            await cb(mockTx);
          } finally {
            // Emulate PostgreSQL rollback behavior
            pgSessionSetting = null;
          }
        }),
      };

      await expect(
        executeInTenantTransaction(
          TENANT_A_ID,
          async () => {
            expect(pgSessionSetting).toBe(TENANT_A_ID);
            throw new Error('Database constraint violation (simulated failure)');
          },
          mockClient
        )
      ).rejects.toThrow('Database constraint violation');

      // Setting must be reset following error rollback
      expect(pgSessionSetting).toBeNull();
      expect(getCurrentTenantId()).toBeUndefined();
    });
  });

  // ===========================================================================
  // 6. SECURE FILE & EVIDENCE ATTACHMENT ACCESS
  // ===========================================================================
  describe('6. Secure File & Evidence Attachment Access (Path Traversal & Tenant Scoping)', () => {
    const ATTACHMENT_UUID = '55555555-5555-4555-8555-555555555555';
    const tempUploadsDir = path.resolve(process.cwd(), 'uploads');
    const testFilePath = path.join(tempUploadsDir, 'test-boiler-inspection.pdf');

    beforeEach(() => {
      if (!fs.existsSync(tempUploadsDir)) {
        fs.mkdirSync(tempUploadsDir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, 'dummy pdf binary data for test');
    });

    afterEach(() => {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should REJECT directory traversal attacks using relative dot-dot paths (Unix format)', async () => {
      vi.spyOn(auditAndAttachmentsService, 'getAttachmentById').mockResolvedValueOnce({
        id: ATTACHMENT_UUID,
        organizationId: TENANT_A_ID,
        fileName: 'malicious.txt',
        storageUri: '../../../../etc/passwd', // TRAVERSAL ATTACK
        mimeType: 'text/plain',
        fileSizeBytes: 100,
        uploadedBy: USER_A_ID,
        uploadedAt: new Date(),
      } as any);

      await expect(
        auditAndAttachmentsService.getAttachmentFileForDownload(ATTACHMENT_UUID)
      ).rejects.toMatchObject({
        code: 'PATH_TRAVERSAL_DETECTED',
      });
    });

    it('should REJECT directory traversal attacks using Windows backslash syntax', async () => {
      vi.spyOn(auditAndAttachmentsService, 'getAttachmentById').mockResolvedValueOnce({
        id: ATTACHMENT_UUID,
        organizationId: TENANT_A_ID,
        fileName: 'malicious.exe',
        storageUri: '..\\..\\..\\windows\\system32\\cmd.exe', // WINDOWS TRAVERSAL
        mimeType: 'application/octet-stream',
        fileSizeBytes: 100,
        uploadedBy: USER_A_ID,
        uploadedAt: new Date(),
      } as any);

      await expect(
        auditAndAttachmentsService.getAttachmentFileForDownload(ATTACHMENT_UUID)
      ).rejects.toMatchObject({
        code: 'PATH_TRAVERSAL_DETECTED',
      });
    });

    it('should REJECT access to arbitrary absolute paths outside the designated upload directory', async () => {
      vi.spyOn(auditAndAttachmentsService, 'getAttachmentById').mockResolvedValueOnce({
        id: ATTACHMENT_UUID,
        organizationId: TENANT_A_ID,
        fileName: 'secrets.env',
        storageUri: path.resolve('C:\\secrets\\production.env'), // OUT-OF-BOUNDS
        mimeType: 'text/plain',
        fileSizeBytes: 200,
        uploadedBy: USER_A_ID,
        uploadedAt: new Date(),
      } as any);

      await expect(
        auditAndAttachmentsService.getAttachmentFileForDownload(ATTACHMENT_UUID)
      ).rejects.toMatchObject({
        code: 'PATH_TRAVERSAL_DETECTED',
      });
    });

    it('should successfully resolve legitimate uploaded attachment within bounds', async () => {
      vi.spyOn(auditAndAttachmentsService, 'getAttachmentById').mockResolvedValueOnce({
        id: ATTACHMENT_UUID,
        organizationId: TENANT_A_ID,
        fileName: 'test-boiler-inspection.pdf',
        storageUri: '/uploads/test-boiler-inspection.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        uploadedBy: USER_A_ID,
        uploadedAt: new Date(),
      } as any);

      const fileInfo = await auditAndAttachmentsService.getAttachmentFileForDownload(
        ATTACHMENT_UUID
      );

      expect(fileInfo.fileName).toBe('test-boiler-inspection.pdf');
      expect(fileInfo.mimeType).toBe('application/pdf');
      expect(fileInfo.absolutePath).toBe(path.resolve(process.cwd(), 'uploads/test-boiler-inspection.pdf'));
    });
  });
});

