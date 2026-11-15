import { describe, it, expect, vi } from 'vitest';
import {
  secureWhere,
  secureOrganizationWhere,
  isTenantScoped,
  TENANT_SCOPED_MODELS,
  createTenantExtension,
} from '../src/tenant/tenant.extension';
import {
  runWithTenantContext,
  getCurrentTenantId,
  requireCurrentTenantId,
} from '../src/tenant/tenant.context';
import {
  TenantSecurityError,
  TenantContextMissingError,
  CrossTenantAccessError,
} from '../src/tenant/tenant.errors';

describe('LuminaFM Multi-Tenant Data Isolation Layer', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const ATTACKER_TENANT = '66666666-6666-6666-6666-666666666666';

  describe('1. Model Taxonomy and Tenant Scoping', () => {
    it('should classify all 47 multi-tenant business models as tenant-scoped', () => {
      expect(TENANT_SCOPED_MODELS.size).toBe(47);
      expect(isTenantScoped('Asset')).toBe(true);
      expect(isTenantScoped('WorkOrder')).toBe(true);
      expect(isTenantScoped('Location')).toBe(true);
      expect(isTenantScoped('System')).toBe(true);
      expect(isTenantScoped('Inspection')).toBe(true);
      expect(isTenantScoped('FaultLog')).toBe(true);
      expect(isTenantScoped('DecisionModel')).toBe(true);
    });

    it('should not classify global catalog models as tenant-scoped', () => {
      expect(isTenantScoped('User')).toBe(false);
      expect(isTenantScoped('Permission')).toBe(false);
      expect(isTenantScoped('Organization')).toBe(false);
    });
  });

  describe('2. Mathematical Filter Isolation (secureWhere)', () => {
    it('should inject organizationId when where clause is empty or undefined', () => {
      const resultEmpty = secureWhere({}, TENANT_A, 'Asset');
      expect(resultEmpty).toEqual({ organizationId: TENANT_A });

      const resultUndefined = secureWhere(undefined, TENANT_A, 'Asset');
      expect(resultUndefined).toEqual({ organizationId: TENANT_A });
    });

    it('should safely wrap existing query filters and organizationId inside an AND clause', () => {
      const userWhere = { status: 'in_service', criticality: 'high' };
      const result = secureWhere(userWhere, TENANT_A, 'Asset');

      expect(result).toEqual({
        AND: [{ status: 'in_service', criticality: 'high' }, { organizationId: TENANT_A }],
      });
    });

    it('should defeat OR clause bypass attacks by enclosing the entire query inside an AND clause', () => {
      // Attacker tries: WHERE (id = 'victim-asset' OR is_active = true)
      // Without AND wrapping, OR could evaluate across organizations.
      const maliciousWhere = {
        OR: [{ id: 'victim-asset-id' }, { name: 'Emergency Boiler' }],
      };

      const result = secureWhere(maliciousWhere, TENANT_A, 'Asset');

      expect(result).toEqual({
        AND: [maliciousWhere, { organizationId: TENANT_A }],
      });
    });

    it('should allow legitimate organizationId filter matching the active tenant', () => {
      const legitimateWhere = { organizationId: TENANT_A, code: 'BLR-001' };
      const result = secureWhere(legitimateWhere, TENANT_A, 'Asset');

      expect(result).toEqual({
        AND: [legitimateWhere, { organizationId: TENANT_A }],
      });
    });

    it('should throw CrossTenantAccessError when a foreign organizationId is provided in where', () => {
      const hostileWhere = { organizationId: ATTACKER_TENANT, code: 'BLR-001' };

      expect(() => secureWhere(hostileWhere, TENANT_A, 'Asset')).toThrow(
        CrossTenantAccessError
      );
    });

    it('should throw CrossTenantAccessError when a foreign organizationId is supplied via Prisma equals filter', () => {
      const hostileWhere = {
        organizationId: { equals: ATTACKER_TENANT },
      };

      expect(() => secureWhere(hostileWhere, TENANT_A, 'Asset')).toThrow(
        CrossTenantAccessError
      );
    });
  });

  describe('3. Root Organization Model Isolation (secureOrganizationWhere)', () => {
    it('should scope Organization queries to the active tenant id', () => {
      const result = secureOrganizationWhere({}, TENANT_A);
      expect(result).toEqual({ id: TENANT_A });
    });

    it('should throw CrossTenantAccessError if attempting to query another organization by id', () => {
      expect(() =>
        secureOrganizationWhere({ id: ATTACKER_TENANT }, TENANT_A)
      ).toThrow(CrossTenantAccessError);
    });

    it('should allow querying the active organization with matching id', () => {
      const result = secureOrganizationWhere({ id: TENANT_A }, TENANT_A);
      expect(result).toEqual({
        AND: [{ id: TENANT_A }, { id: TENANT_A }],
      });
    });
  });

  describe('4. AsyncLocalStorage Tenant Context Management', () => {
    it('should return undefined when outside an active tenant context', () => {
      expect(getCurrentTenantId()).toBeUndefined();
    });

    it('should throw TenantSecurityError when requireCurrentTenantId is called without context', () => {
      expect(() => requireCurrentTenantId()).toThrow(TenantSecurityError);
    });

    it('should successfully establish and resolve context within runWithTenantContext', async () => {
      await runWithTenantContext(TENANT_A, async () => {
        expect(getCurrentTenantId()).toBe(TENANT_A);
        expect(requireCurrentTenantId()).toBe(TENANT_A);
      });

      // Context must be cleanly unset after exiting callback
      expect(getCurrentTenantId()).toBeUndefined();
    });

    it('should maintain strict context isolation across concurrent asynchronous workflows', async () => {
      const executionLog: string[] = [];

      const jobA = runWithTenantContext(TENANT_A, async () => {
        executionLog.push(`start_A:${getCurrentTenantId()}`);
        await new Promise((resolve) => setTimeout(resolve, 30));
        executionLog.push(`end_A:${getCurrentTenantId()}`);
        return getCurrentTenantId();
      });

      const jobB = runWithTenantContext(TENANT_B, async () => {
        executionLog.push(`start_B:${getCurrentTenantId()}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionLog.push(`end_B:${getCurrentTenantId()}`);
        return getCurrentTenantId();
      });

      const [resultA, resultB] = await Promise.all([jobA, jobB]);

      expect(resultA).toBe(TENANT_A);
      expect(resultB).toBe(TENANT_B);
      expect(executionLog).toContain(`start_A:${TENANT_A}`);
      expect(executionLog).toContain(`end_A:${TENANT_A}`);
      expect(executionLog).toContain(`start_B:${TENANT_B}`);
      expect(executionLog).toContain(`end_B:${TENANT_B}`);
    });

    it('should reject invalid tenant IDs during context initialization', async () => {
      await expect(runWithTenantContext('', async () => {})).rejects.toThrow(
        TenantSecurityError
      );
    });
  });

  describe('5. Prisma Client Extension Query Interception', () => {
    /**
     * Helper to instantiate and unwrap the query extension handlers on a mock Prisma client.
     */
    function setupMockExtension(options?: { getTenantId?: () => string | undefined; mockClientOverrides?: any }) {
      const extensionDef = createTenantExtension(options);
      let queryExtensionObj: any;

      const mockClient: any = {
        $extends: vi.fn((extConfig: any) => {
          queryExtensionObj = extConfig.query.$allModels;
          return mockClient;
        }),
        Asset: {
          findFirst: vi.fn(),
          findFirstOrThrow: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        Organization: {
          findFirst: vi.fn(),
          findFirstOrThrow: vi.fn(),
        },
        ...options?.mockClientOverrides,
      };

      // Execute extension registration against the mock client
      (extensionDef as any)(mockClient);

      return {
        mockClient,
        queries: queryExtensionObj,
      };
    }

    it('should throw TenantContextMissingError when executing queries outside a tenant context', async () => {
      const { queries } = setupMockExtension();
      let capturedError: any;

      const mockQuery = vi.fn();
      const mockArgs = { where: { status: 'in_service' } };

      try {
        await queries.findMany({
          model: 'Asset',
          args: mockArgs,
          query: mockQuery,
        });
      } catch (err) {
        capturedError = err;
      }

      expect(capturedError).toBeInstanceOf(TenantContextMissingError);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should inject organizationId into findMany read operations', async () => {
      const { queries } = setupMockExtension({ getTenantId: () => TENANT_A });
      const mockQuery = vi.fn().mockResolvedValue([{ id: 'asset-1' }]);
      const mockArgs = { where: { status: 'in_service' } };

      await queries.findMany({
        model: 'Asset',
        args: mockArgs,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const passedArgs = mockQuery.mock.calls[0][0];
      expect(passedArgs.where).toEqual({
        AND: [{ status: 'in_service' }, { organizationId: TENANT_A }],
      });
    });

    it('should intercept findUnique and route to findFirst with tenant filter', async () => {
      const mockFindFirst = vi.fn().mockResolvedValue({ id: 'asset-1', organizationId: TENANT_A });
      const { queries } = setupMockExtension({
        getTenantId: () => TENANT_A,
        mockClientOverrides: {
          Asset: { findFirst: mockFindFirst },
        },
      });

      const result = await queries.findUnique({
        model: 'Asset',
        args: { where: { id: 'asset-1' } },
        query: vi.fn(),
      });

      expect(mockFindFirst).toHaveBeenCalledTimes(1);
      const passedArgs = mockFindFirst.mock.calls[0][0];
      expect(passedArgs.where).toEqual({
        AND: [{ id: 'asset-1' }, { organizationId: TENANT_A }],
      });
      expect(result).toEqual({ id: 'asset-1', organizationId: TENANT_A });
    });

    it('should automatically inject organizationId on create operations', async () => {
      const { queries } = setupMockExtension({ getTenantId: () => TENANT_A });
      const mockQuery = vi.fn().mockResolvedValue({ id: 'new-asset', organizationId: TENANT_A });
      const mockArgs = {
        data: {
          assetCode: 'PUMP-001',
          name: 'Feed Water Pump',
        },
      };

      await queries.create({
        model: 'Asset',
        args: mockArgs,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const passedArgs = mockQuery.mock.calls[0][0];
      expect(passedArgs.data.organizationId).toBe(TENANT_A);
    });

    it('should reject create operation if caller attempts to assign another organizationId', async () => {
      const { queries } = setupMockExtension({ getTenantId: () => TENANT_A });
      const mockQuery = vi.fn();
      const mockArgs = {
        data: {
          assetCode: 'PUMP-001',
          name: 'Feed Water Pump',
          organizationId: ATTACKER_TENANT, // Foreign tenant ID injection attempt
        },
      };

      await expect(
        queries.create({
          model: 'Asset',
          args: mockArgs,
          query: mockQuery,
        })
      ).rejects.toThrow(CrossTenantAccessError);

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should automatically inject organizationId on createMany operations across all records', async () => {
      const { queries } = setupMockExtension({ getTenantId: () => TENANT_A });
      const mockQuery = vi.fn().mockResolvedValue({ count: 2 });
      const mockArgs = {
        data: [
          { assetCode: 'MTR-001', name: 'Meter 1' },
          { assetCode: 'MTR-002', name: 'Meter 2' },
        ],
      };

      await queries.createMany({
        model: 'Asset',
        args: mockArgs,
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const passedArgs = mockQuery.mock.calls[0][0];
      expect(passedArgs.data[0].organizationId).toBe(TENANT_A);
      expect(passedArgs.data[1].organizationId).toBe(TENANT_A);
    });

    it('should block update operations attempting to reassign organizationId', async () => {
      const { queries } = setupMockExtension({ getTenantId: () => TENANT_A });
      const mockQuery = vi.fn();
      const mockArgs = {
        where: { id: 'asset-1' },
        data: {
          organizationId: ATTACKER_TENANT, // Tampering attempt
        },
      };

      await expect(
        queries.update({
          model: 'Asset',
          args: mockArgs,
          query: mockQuery,
        })
      ).rejects.toThrow(TenantSecurityError);

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should block update when target record does not belong to the active tenant', async () => {
      const mockFindFirst = vi.fn().mockResolvedValue(null); // Record doesn't exist in active tenant
      const { queries } = setupMockExtension({
        getTenantId: () => TENANT_A,
        mockClientOverrides: {
          Asset: { findFirst: mockFindFirst },
        },
      });

      await expect(
        queries.update({
          model: 'Asset',
          args: { where: { id: 'victim-asset' }, data: { name: 'Compromised Name' } },
          query: vi.fn(),
        })
      ).rejects.toThrow(TenantSecurityError);
    });

    it('should block delete when target record does not belong to the active tenant', async () => {
      const mockFindFirst = vi.fn().mockResolvedValue(null);
      const { queries } = setupMockExtension({
        getTenantId: () => TENANT_A,
        mockClientOverrides: {
          Asset: { findFirst: mockFindFirst },
        },
      });

      await expect(
        queries.delete({
          model: 'Asset',
          args: { where: { id: 'victim-asset' } },
          query: vi.fn(),
        })
      ).rejects.toThrow(TenantSecurityError);
    });

    it('should prevent direct deletion of root Organization through tenant client', async () => {
      const { queries } = setupMockExtension({ getTenantId: () => TENANT_A });

      await expect(
        queries.delete({
          model: 'Organization',
          args: { where: { id: TENANT_A } },
          query: vi.fn(),
        })
      ).rejects.toThrow(TenantSecurityError);
    });
  });
});
