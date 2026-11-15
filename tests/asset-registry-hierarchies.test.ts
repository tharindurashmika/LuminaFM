import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt.utils';
import {
  validateNoHierarchyCycle,
  HierarchyCycleError,
  ForeignKeyViolationError,
} from '../src/modules/assets/hierarchy.validator';
import { assetsService } from '../src/modules/assets/assets.service';
import { locationsService } from '../src/modules/assets/locations.service';
import { systemsService } from '../src/modules/assets/systems.service';

describe('Asset Registry & Hierarchies Domain', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';
  const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const validTokenTenantA = signToken({
    userId: USER_ID,
    email: 'admin@hotelgroup.com',
    organizationId: TENANT_A_ID,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Circular Reference Prevention Algorithm (validateNoHierarchyCycle)', () => {
    it('should throw HierarchyCycleError when node is its own parent (direct cycle)', async () => {
      const mockFetch = vi.fn();
      await expect(
        validateNoHierarchyCycle('Location', 'loc-1', 'loc-1', mockFetch)
      ).rejects.toThrow(HierarchyCycleError);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should detect multi-level indirect circular references (A -> B -> C -> A)', async () => {
      // Current tree:
      // loc-root (loc-1) -> loc-child (loc-2) -> loc-grandchild (loc-3)
      const hierarchyMap: Record<string, string | null> = {
        'loc-3': 'loc-2',
        'loc-2': 'loc-1',
        'loc-1': null,
      };

      const mockFetch = vi.fn(async (id: string) => hierarchyMap[id] ?? null);

      // Attempting to make loc-1 (root) a child of loc-3 (grandchild)
      await expect(
        validateNoHierarchyCycle('Location', 'loc-1', 'loc-3', mockFetch)
      ).rejects.toThrow(HierarchyCycleError);

      expect(mockFetch).toHaveBeenCalledWith('loc-3');
      expect(mockFetch).toHaveBeenCalledWith('loc-2');
    });

    it('should allow valid hierarchy updates that do not introduce cycles', async () => {
      // Tree: loc-4 is sibling to loc-1
      const hierarchyMap: Record<string, string | null> = {
        'loc-3': 'loc-2',
        'loc-2': null,
        'loc-4': null,
      };

      const mockFetch = vi.fn(async (id: string) => hierarchyMap[id] ?? null);

      // Setting loc-2's parent to loc-4 is completely valid
      await expect(
        validateNoHierarchyCycle('Location', 'loc-2', 'loc-4', mockFetch)
      ).resolves.toBeUndefined();
    });

    it('should allow setting parent to null (making a node a root node)', async () => {
      const mockFetch = vi.fn();
      await expect(
        validateNoHierarchyCycle('Location', 'loc-2', null, mockFetch)
      ).resolves.toBeUndefined();
    });
  });

  describe('2. Asset Registration Endpoint (POST /api/assets)', () => {
    const validAssetPayload = {
      site_id: 'site-colombo',
      location_id: 'loc-boiler-room',
      asset_category_id: 'cat-boilers',
      asset_code: 'BLR-001',
      name: 'High Pressure Steam Boiler',
      criticality: 'critical',
      status: 'in_service',
      notes: 'Main boiler room unit',
    };

    it('should require authorization token', async () => {
      const res = await request(app).post('/api/assets').send(validAssetPayload);
      expect(res.status).toBe(401);
    });

    it('should validate mandatory fields (site_id, location_id, asset_category_id, asset_code, name)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({ name: 'Incomplete Asset' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully register a valid asset with all required relational IDs', async () => {
      vi.spyOn(assetsService, 'registerAsset').mockResolvedValueOnce({
        id: 'asset-blr-1',
        organizationId: TENANT_A_ID,
        siteId: 'site-colombo',
        locationId: 'loc-boiler-room',
        assetCategoryId: 'cat-boilers',
        systemId: null,
        brandId: null,
        modelId: null,
        parentAssetId: null,
        assetCode: 'BLR-001',
        name: 'High Pressure Steam Boiler',
        serialNumber: 'SN-998822',
        description: null,
        manufacturerDate: null,
        installationDate: null,
        commissioningDate: null,
        warrantyExpiryDate: null,
        expectedLifeYears: null,
        criticality: 'critical',
        status: 'in_service',
        qrCodeValue: null,
        imageUri: null,
        notes: 'Main boiler room unit',
        createdAt: new Date(),
        updatedAt: new Date(),
        site: { id: 'site-colombo', code: 'COL-01', name: 'Colombo Hotel' },
        location: { id: 'loc-boiler-room', code: 'B-01', name: 'Boiler Room' },
        assetCategory: { id: 'cat-boilers', code: 'BLR', name: 'Boilers' },
        system: null,
        brand: null,
        model: null,
        parent: null,
      });

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send(validAssetPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assetCode).toBe('BLR-001');
      expect(res.body.data.organizationId).toBe(TENANT_A_ID);
    });

    it('should return structured error when foreign key violation occurs (e.g. location belongs to another site)', async () => {
      vi.spyOn(assetsService, 'registerAsset').mockRejectedValueOnce(
        new ForeignKeyViolationError(
          'location_id',
          'loc-foreign',
          "Location 'Main Kitchen' (loc-foreign) belongs to site 'site-kandy', not the requested site 'site-colombo'."
        )
      );

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send(validAssetPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(res.body.error.field).toBe('location_id');
      expect(res.body.error.referenced_id).toBe('loc-foreign');
      expect(res.body.error.message).toContain("Location 'Main Kitchen'");
    });

    it('should return structured error when asset category foreign key does not exist', async () => {
      vi.spyOn(assetsService, 'registerAsset').mockRejectedValueOnce(
        new ForeignKeyViolationError(
          'asset_category_id',
          'cat-invalid',
          "AssetCategory with ID 'cat-invalid' does not exist in the active organization."
        )
      );

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send(validAssetPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(res.body.error.field).toBe('asset_category_id');
    });

    it('should return 409 Conflict when asset_code already exists in tenant', async () => {
      vi.spyOn(assetsService, 'registerAsset').mockRejectedValueOnce({
        status: 409,
        code: 'ASSET_CODE_EXISTS',
        message: "An asset with code 'BLR-001' already exists in this organization.",
      });

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send(validAssetPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ASSET_CODE_EXISTS');
    });
  });

  describe('3. Hierarchy Endpoints & Cycle Detection on Updates', () => {
    it('PATCH /api/locations/:id should return 400 HIERARCHY_CYCLE_DETECTED when setting descendant as parent', async () => {
      vi.spyOn(locationsService, 'updateLocation').mockRejectedValueOnce(
        new HierarchyCycleError('Location', 'loc-root', 'loc-child')
      );

      const res = await request(app)
        .patch('/api/locations/loc-root')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({ parentLocationId: 'loc-child' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HIERARCHY_CYCLE_DETECTED');
      expect(res.body.error.entity).toBe('Location');
      expect(res.body.error.target_id).toBe('loc-root');
      expect(res.body.error.attempted_parent_id).toBe('loc-child');
    });

    it('PATCH /api/systems/:id should return 400 HIERARCHY_CYCLE_DETECTED on system tree cycle', async () => {
      vi.spyOn(systemsService, 'updateSystem').mockRejectedValueOnce(
        new HierarchyCycleError('System', 'sys-hvac-root', 'sys-subsystem-1')
      );

      const res = await request(app)
        .patch('/api/systems/sys-hvac-root')
        .set('Authorization', `Bearer ${validTokenTenantA}`)
        .send({ parentSystemId: 'sys-subsystem-1' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('HIERARCHY_CYCLE_DETECTED');
      expect(res.body.error.entity).toBe('System');
    });

    it('GET /api/assets should list assets for tenant with filters', async () => {
      vi.spyOn(assetsService, 'listAssets').mockResolvedValueOnce([
        {
          id: 'asset-1',
          organizationId: TENANT_A_ID,
          siteId: 'site-colombo',
          locationId: 'loc-boiler-room',
          assetCategoryId: 'cat-boilers',
          systemId: null,
          brandId: null,
          modelId: null,
          parentAssetId: null,
          assetCode: 'BLR-001',
          name: 'Boiler 1',
          serialNumber: null,
          description: null,
          manufacturerDate: null,
          installationDate: null,
          commissioningDate: null,
          warrantyExpiryDate: null,
          expectedLifeYears: null,
          criticality: 'high',
          status: 'in_service',
          qrCodeValue: null,
          imageUri: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          site: { id: 'site-colombo', code: 'COL-01', name: 'Colombo Hotel' },
          location: { id: 'loc-boiler-room', code: 'B-01', name: 'Boiler Room' },
          assetCategory: { id: 'cat-boilers', code: 'BLR', name: 'Boilers' },
          system: null,
          brand: null,
          model: null,
        },
      ]);

      const res = await request(app)
        .get('/api/assets?siteId=site-colombo')
        .set('Authorization', `Bearer ${validTokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].assetCode).toBe('BLR-001');
    });
  });
});

