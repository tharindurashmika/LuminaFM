import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assetsService } from '../src/modules/assets/assets.service';
import { sitesService } from '../src/modules/assets/sites.service';
import { locationsService } from '../src/modules/assets/locations.service';
import { systemsService } from '../src/modules/assets/systems.service';
import { assetCategoriesService } from '../src/modules/assets/categories.service';
import { brandsModelsService } from '../src/modules/assets/brands-models.service';
import {
  validateNoHierarchyCycle,
  HierarchyCycleError,
  ForeignKeyViolationError,
} from '../src/modules/assets/hierarchy.validator';
import { runWithTenantContext } from '../src/tenant/tenant.context';
import tenantPrisma from '../src/tenant/tenant.client';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const SITE_A_ID = 'site-colombo-hotel';
const SITE_B_ID = 'site-kandy-resort';

describe('LuminaFM Generic Asset Registry & Hierarchies Domain', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. ORGANIZATIONS AND SITES
  // ===========================================================================
  describe('1. Organizations and Sites Registry', () => {
    it('should create and retrieve a site within the active organization', async () => {
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValueOnce(null); // No duplicate code
      vi.spyOn(tenantPrisma.site, 'create').mockResolvedValueOnce({
        id: SITE_A_ID,
        organizationId: TENANT_ID,
        code: 'COL-01',
        name: 'The Kingsbury Hotel Colombo',
        siteType: 'Hospitality Facility',
        addressLine1: '48 Janadhipathi Mawatha',
        addressLine2: null,
        city: 'Colombo',
        region: 'Western Province',
        country: 'Sri Lanka',
        timezone: 'Asia/Colombo',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const site = await sitesService.createSite({
          code: 'COL-01',
          name: 'The Kingsbury Hotel Colombo',
          siteType: 'Hospitality Facility',
          city: 'Colombo',
          country: 'Sri Lanka',
          timezone: 'Asia/Colombo',
        });

        expect(site.id).toBe(SITE_A_ID);
        expect(site.code).toBe('COL-01');
        expect(site.organizationId).toBe(TENANT_ID);
      });
    });

    it('should reject duplicate site codes within the same organization', async () => {
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValueOnce({
        id: 'existing-site',
        code: 'COL-01',
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        await expect(
          sitesService.createSite({
            code: 'COL-01',
            name: 'Duplicate Site',
          })
        ).rejects.toMatchObject({
          status: 409,
          code: 'SITE_EXISTS',
        });
      });
    });
  });

  // ===========================================================================
  // 2. PHYSICAL LOCATION HIERARCHIES
  // ===========================================================================
  describe('2. Physical Location Hierarchies', () => {
    it('should create a multi-level location hierarchy within a site (Building -> Floor -> Plant Room)', async () => {
      // 1. Site check passes
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValue({ id: SITE_A_ID } as any);
      vi.spyOn(tenantPrisma.locationType, 'findFirst').mockResolvedValue({ id: 'type-room' } as any);

      // Parent location exists within same site
      vi.spyOn(tenantPrisma.location, 'findFirst').mockResolvedValueOnce({
        id: 'loc-floor-b1',
        siteId: SITE_A_ID,
      } as any);

      vi.spyOn(tenantPrisma.location, 'create').mockResolvedValueOnce({
        id: 'loc-boiler-room-1',
        organizationId: TENANT_ID,
        siteId: SITE_A_ID,
        locationTypeId: 'type-room',
        parentLocationId: 'loc-floor-b1',
        code: 'B1-RM-02',
        name: 'Primary Boiler & Chiller Room',
        floorLabel: 'Basement 1',
        areaSqm: 180.5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const location = await locationsService.createLocation({
          siteId: SITE_A_ID,
          locationTypeId: 'type-room',
          parentLocationId: 'loc-floor-b1',
          code: 'B1-RM-02',
          name: 'Primary Boiler & Chiller Room',
          floorLabel: 'Basement 1',
          areaSqm: 180.5,
        });

        expect(location.id).toBe('loc-boiler-room-1');
        expect(location.parentLocationId).toBe('loc-floor-b1');
      });
    });

    it('should REJECT parent location if it belongs to a different site', async () => {
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValue({ id: SITE_A_ID } as any);
      vi.spyOn(tenantPrisma.locationType, 'findFirst').mockResolvedValue({ id: 'type-room' } as any);

      // Parent location search: returns null because siteId does not match SITE_A_ID
      vi.spyOn(tenantPrisma.location, 'findFirst').mockResolvedValueOnce(null);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        await expect(
          locationsService.createLocation({
            siteId: SITE_A_ID,
            locationTypeId: 'type-room',
            parentLocationId: 'loc-kandy-floor-1', // Foreign site parent!
            code: 'INVALID-LOC',
            name: 'Invalid Cross-Site Location',
          })
        ).rejects.toThrow(ForeignKeyViolationError);
      });
    });

    it('should detect and prevent circular references in location updates', async () => {
      // Tree: loc-root -> loc-floor -> loc-room
      const hierarchyMap: Record<string, string | null> = {
        'loc-room': 'loc-floor',
        'loc-floor': 'loc-root',
        'loc-root': null,
      };

      // Trying to make loc-root a child of loc-room -> Circular cycle!
      await expect(
        validateNoHierarchyCycle('Location', 'loc-root', 'loc-room', async (id) => hierarchyMap[id])
      ).rejects.toThrow(HierarchyCycleError);
    });
  });

  // ===========================================================================
  // 3. TECHNICAL SYSTEM HIERARCHIES (INDEPENDENT FROM PHYSICAL LOCATIONS)
  // ===========================================================================
  describe('3. Technical System Hierarchies & Independence', () => {
    it('should create independent technical systems (Thermal Utilities -> Steam Generation System)', async () => {
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValue({ id: SITE_A_ID } as any);
      vi.spyOn(tenantPrisma.systemType, 'findFirst').mockResolvedValue({ id: 'type-utility' } as any);

      vi.spyOn(tenantPrisma.system, 'findFirst').mockResolvedValueOnce({
        id: 'sys-thermal-utilities',
        siteId: SITE_A_ID,
      } as any);

      vi.spyOn(tenantPrisma.system, 'create').mockResolvedValueOnce({
        id: 'sys-steam-generation',
        organizationId: TENANT_ID,
        siteId: SITE_A_ID,
        systemTypeId: 'type-utility',
        parentSystemId: 'sys-thermal-utilities',
        code: 'SYS-STEAM-01',
        name: 'High Pressure Steam Generation System',
        criticality: 'critical',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const system = await systemsService.createSystem({
          siteId: SITE_A_ID,
          systemTypeId: 'type-utility',
          parentSystemId: 'sys-thermal-utilities',
          code: 'SYS-STEAM-01',
          name: 'High Pressure Steam Generation System',
          criticality: 'critical',
        });

        expect(system.id).toBe('sys-steam-generation');
        expect(system.parentSystemId).toBe('sys-thermal-utilities');
      });
    });

    it('should confirm physical location and technical system structures are completely independent entities', async () => {
      // Physical Location represents spatial coordinates (Room 202)
      // Technical System represents engineering process topology (Chilled Water Loop)
      expect(locationsService).not.toBe(systemsService);
      expect(typeof locationsService.createLocation).toBe('function');
      expect(typeof systemsService.createSystem).toBe('function');
    });
  });

  // ===========================================================================
  // 4. ASSET CATEGORIES AND SUBCATEGORIES
  // ===========================================================================
  describe('4. Generic Asset Categories and Subcategories', () => {
    it('should support multiple equipment categories (Boilers, Chillers, Pumps, Generators)', async () => {
      vi.spyOn(tenantPrisma.assetCategory, 'create').mockImplementation(async ({ data }: any) => {
        return {
          id: `cat-${data.code.toLowerCase()}`,
          organizationId: TENANT_ID,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const boilerCat = await assetCategoriesService.createCategory({
          code: 'BOILERS',
          name: 'Industrial Steam & Hot Water Boilers',
        });
        const chillerCat = await assetCategoriesService.createCategory({
          code: 'CHILLERS',
          name: 'Centrifugal & Absorption Water Chillers',
        });
        const pumpCat = await assetCategoriesService.createCategory({
          code: 'PUMPS',
          name: 'Fluid Circulation & Feedwater Pumps',
        });
        const genCat = await assetCategoriesService.createCategory({
          code: 'GENERATORS',
          name: 'Diesel Emergency Generators',
        });

        expect(boilerCat.code).toBe('BOILERS');
        expect(chillerCat.code).toBe('CHILLERS');
        expect(pumpCat.code).toBe('PUMPS');
        expect(genCat.code).toBe('GENERATORS');
      });
    });

    it('should allow nested subcategories (Pumps -> Feedwater Pumps)', async () => {
      vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValueOnce({
        id: 'cat-pumps',
        name: 'Pumps',
      } as any);

      vi.spyOn(tenantPrisma.assetCategory, 'create').mockResolvedValueOnce({
        id: 'cat-sub-feedwater-pumps',
        organizationId: TENANT_ID,
        parentCategoryId: 'cat-pumps',
        code: 'PUMP-FEEDWATER',
        name: 'High Pressure Feedwater Pumps',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const subCategory = await assetCategoriesService.createCategory({
          parentCategoryId: 'cat-pumps',
          code: 'PUMP-FEEDWATER',
          name: 'High Pressure Feedwater Pumps',
        });

        expect(subCategory.parentCategoryId).toBe('cat-pumps');
      });
    });
  });

  // ===========================================================================
  // 5. BRANDS AND MODELS
  // ===========================================================================
  describe('5. Equipment Brands and Models', () => {
    it('should register brands and models with technical specifications', async () => {
      vi.spyOn(tenantPrisma.brand, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(tenantPrisma.brand, 'create').mockResolvedValueOnce({
        id: 'brand-thermax',
        organizationId: TENANT_ID,
        name: 'Thermax Limited',
        website: 'https://thermaxglobal.com',
        supportContact: 'support@thermaxglobal.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.spyOn(tenantPrisma.brand, 'findFirst').mockResolvedValueOnce({ id: 'brand-thermax' } as any);
      vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValueOnce({ id: 'cat-boilers' } as any);
      vi.spyOn(tenantPrisma.assetModel, 'findFirst').mockResolvedValueOnce(null);

      vi.spyOn(tenantPrisma.assetModel, 'create').mockResolvedValueOnce({
        id: 'model-combimax-1100',
        organizationId: TENANT_ID,
        brandId: 'brand-thermax',
        assetCategoryId: 'cat-boilers',
        modelNumber: 'COMBIMAX-1100',
        modelName: 'Thermax Combimax 1100 kg/hr',
        specifications: {
          evaporativeCapacityKgHr: 1100,
          operatingPressureBar: 10.54,
          designPressureBar: 17.5,
          fuelType: 'Furnace Oil',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const brand = await brandsModelsService.createBrand({
          name: 'Thermax Limited',
          website: 'https://thermaxglobal.com',
          supportContact: 'support@thermaxglobal.com',
        });

        const model = await brandsModelsService.createAssetModel({
          brandId: brand.id,
          assetCategoryId: 'cat-boilers',
          modelNumber: 'COMBIMAX-1100',
          modelName: 'Thermax Combimax 1100 kg/hr',
          specifications: {
            evaporativeCapacityKgHr: 1100,
            operatingPressureBar: 10.54,
            designPressureBar: 17.5,
            fuelType: 'Furnace Oil',
          },
        });

        expect(model.modelNumber).toBe('COMBIMAX-1100');
        expect(model.brandId).toBe('brand-thermax');
      });
    });
  });

  // ===========================================================================
  // 6. GENERIC ASSET REGISTRY & PARENT-CHILD RELATIONSHIPS
  // ===========================================================================
  describe('6. Assets and Parent-Child Assembly Relationships', () => {
    it('should register a parent boiler asset and a child feedwater pump component', async () => {
      // 1. Setup mock parent validation
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValue({ id: SITE_A_ID, code: 'COL-01', name: 'Colombo Hotel' } as any);
      vi.spyOn(tenantPrisma.location, 'findFirst').mockResolvedValue({ id: 'loc-b1', siteId: SITE_A_ID, name: 'Boiler Room' } as any);
      vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValue({ id: 'cat-boilers', name: 'Boilers' } as any);
      vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValue(null); // No code collision

      // Parent Asset
      vi.spyOn(tenantPrisma.asset, 'create').mockResolvedValueOnce({
        id: 'asset-boiler-001',
        organizationId: TENANT_ID,
        siteId: SITE_A_ID,
        locationId: 'loc-b1',
        assetCategoryId: 'cat-boilers',
        assetCode: 'BLR-001',
        name: 'Thermax Steam Boiler 1100 kg/h',
        status: 'in_service',
        criticality: 'critical',
        parentAssetId: null,
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const parentBoiler = await assetsService.registerAsset({
          site_id: SITE_A_ID,
          location_id: 'loc-b1',
          asset_category_id: 'cat-boilers',
          asset_code: 'BLR-001',
          name: 'Thermax Steam Boiler 1100 kg/h',
          criticality: 'critical',
        });

        expect(parentBoiler.id).toBe('asset-boiler-001');

        // 2. Register Child Pump Asset linked to parentBoiler
        vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValueOnce({ id: 'cat-pumps', name: 'Pumps' } as any);
        // Parent exists within same site
        vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValueOnce({
          id: 'asset-boiler-001',
          siteId: SITE_A_ID,
          name: 'Thermax Steam Boiler 1100 kg/h',
        } as any);

        vi.spyOn(tenantPrisma.asset, 'create').mockResolvedValueOnce({
          id: 'asset-pump-001',
          organizationId: TENANT_ID,
          siteId: SITE_A_ID,
          locationId: 'loc-b1',
          assetCategoryId: 'cat-pumps',
          assetCode: 'PMP-FW-01',
          name: 'Boiler Feedwater Pump #1',
          parentAssetId: 'asset-boiler-001',
          status: 'in_service',
        } as any);

        const childPump = await assetsService.registerAsset({
          site_id: SITE_A_ID,
          location_id: 'loc-b1',
          asset_category_id: 'cat-pumps',
          parent_asset_id: 'asset-boiler-001',
          asset_code: 'PMP-FW-01',
          name: 'Boiler Feedwater Pump #1',
        });

        expect(childPump.id).toBe('asset-pump-001');
        expect(childPump.parentAssetId).toBe('asset-boiler-001');
      });
    });

    it('should REJECT parent asset if parent belongs to another site', async () => {
      vi.spyOn(tenantPrisma.site, 'findFirst').mockResolvedValue({ id: SITE_A_ID } as any);
      vi.spyOn(tenantPrisma.location, 'findFirst').mockResolvedValue({ id: 'loc-b1', siteId: SITE_A_ID } as any);
      vi.spyOn(tenantPrisma.assetCategory, 'findFirst').mockResolvedValue({ id: 'cat-pumps' } as any);

      // Parent asset belongs to SITE_B_ID (Kandy Resort)
      vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValueOnce({
        id: 'asset-kandy-boiler',
        siteId: SITE_B_ID,
        name: 'Kandy Boiler Unit',
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        await expect(
          assetsService.registerAsset({
            site_id: SITE_A_ID,
            location_id: 'loc-b1',
            asset_category_id: 'cat-pumps',
            parent_asset_id: 'asset-kandy-boiler',
            asset_code: 'PMP-CROSS-SITE',
            name: 'Cross Site Pump',
          })
        ).rejects.toThrow(ForeignKeyViolationError);
      });
    });

    it('should prevent deleting an asset that currently has child sub-assemblies', async () => {
      vi.spyOn(assetsService, 'getAssetById').mockResolvedValueOnce({
        id: 'asset-boiler-001',
        name: 'Parent Boiler',
      } as any);

      // Has 2 child pumps
      vi.spyOn(tenantPrisma.asset, 'count').mockResolvedValueOnce(2);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        await expect(assetsService.deleteAsset('asset-boiler-001')).rejects.toMatchObject({
          status: 400,
          code: 'ASSET_HAS_CHILDREN',
        });
      });
    });
  });

  // ===========================================================================
  // 7. EQUIPMENT STATUS TRANSITIONS & LIFECYCLE HISTORY
  // ===========================================================================
  describe('7. Equipment Status & Lifecycle History Tracking', () => {
    it('should update equipment status, record audit log transition, and return timeline', async () => {
      vi.spyOn(assetsService, 'getAssetById').mockResolvedValueOnce({
        id: 'asset-blr-1',
        status: 'in_service',
        notes: 'Operational',
      } as any);

      vi.spyOn(tenantPrisma.asset, 'update').mockResolvedValueOnce({
        id: 'asset-blr-1',
        status: 'under_maintenance',
        notes: 'Operational\n[Status Change]: Annual statutory boiler tube inspection',
        site: { id: SITE_A_ID, code: 'COL-01', name: 'Colombo' },
        location: { id: 'loc-1', code: 'B-01', name: 'Boiler Room' },
        assetCategory: { id: 'cat-1', code: 'BLR', name: 'Boilers' },
      } as any);

      const auditSpy = vi.spyOn(tenantPrisma.auditLog, 'create').mockResolvedValueOnce({} as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const updated = await assetsService.updateAssetStatus(
          'asset-blr-1',
          {
            status: 'under_maintenance',
            reason: 'Annual statutory boiler tube inspection',
          },
          'user-inspector-id'
        );

        expect(updated.status).toBe('under_maintenance');
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              entityType: 'Asset',
              entityId: 'asset-blr-1',
              action: 'STATUS_CHANGE',
              oldValues: { status: 'in_service' },
              newValues: expect.objectContaining({ status: 'under_maintenance' }),
            }),
          })
        );
      });
    });

    it('should compile complete lifecycle timeline including milestones, status transitions, and work orders', async () => {
      vi.spyOn(assetsService, 'getAssetById').mockResolvedValueOnce({
        id: 'asset-blr-1',
        assetCode: 'BLR-001',
        name: 'Kingsbury Boiler',
        status: 'in_service',
        criticality: 'critical',
        commissioningDate: new Date('2020-01-15'),
        installationDate: new Date('2019-12-01'),
        warrantyExpiryDate: new Date('2022-01-15'),
        expectedLifeYears: 20,
        site: { name: 'Colombo Hotel' },
        location: { name: 'Boiler Room' },
      } as any);

      vi.spyOn(tenantPrisma.auditLog, 'findMany').mockResolvedValueOnce([
        {
          createdAt: new Date('2025-05-10'),
          newValues: { status: 'under_maintenance', reason: 'Burner overhaul' },
          oldValues: { status: 'in_service' },
          userId: 'user-tech-1',
        },
      ] as any);

      vi.spyOn(tenantPrisma.workOrder, 'findMany').mockResolvedValueOnce([
        {
          id: 'wo-1',
          workOrderNumber: 'WO-2025-00100',
          title: 'Burner nozzle replacement',
          priority: 'high',
          status: 'completed',
          createdAt: new Date('2025-05-10'),
          completedAt: new Date('2025-05-11'),
        },
      ] as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const history = await assetsService.getAssetLifecycleHistory('asset-blr-1');

        expect(history.assetCode).toBe('BLR-001');
        expect(history.timeline.length).toBeGreaterThanOrEqual(4); // Commissioning, Installation, Status Transition, Work Order
        expect(history.summary.totalWorkOrders).toBe(1);
        expect(history.summary.statusTransitions).toBe(1);
      });
    });
  });

  // ===========================================================================
  // 8. QR CODE IDENTIFICATION & MOBILE/TABLET LOOKUP
  // ===========================================================================
  describe('8. QR Code Identification & Mobile Scan Lookup', () => {
    it('should generate standard formatted QR code identifier for an asset', async () => {
      vi.spyOn(assetsService, 'getAssetById').mockResolvedValueOnce({
        id: 'asset-blr-1',
        assetCode: 'BLR-001',
        name: 'Thermax Boiler',
        site: { code: 'COL-01', name: 'Colombo Hotel' },
        location: { code: 'B-01', name: 'Boiler Room' },
        assetCategory: { name: 'Industrial Boilers' },
      } as any);

      vi.spyOn(tenantPrisma.asset, 'update').mockResolvedValueOnce({
        id: 'asset-blr-1',
        assetCode: 'BLR-001',
        name: 'Thermax Boiler',
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const qrResult = await assetsService.generateAssetQrCode('asset-blr-1');

        expect(qrResult.qrCodeValue).toBe(`LUMINA://${TENANT_ID.slice(0, 8)}/COL-01/BLR-001`);
        expect(qrResult.labelDetails.siteCode).toBe('COL-01');
      });
    });

    it('should allow field operators to scan QR code and retrieve asset details and open work orders', async () => {
      const qrValue = `LUMINA://${TENANT_ID.slice(0, 8)}/COL-01/BLR-001`;

      vi.spyOn(tenantPrisma.asset, 'findFirst').mockResolvedValueOnce({
        id: 'asset-blr-1',
        assetCode: 'BLR-001',
        name: 'Thermax Boiler',
        status: 'in_service',
        qrCodeValue: qrValue,
        site: { id: SITE_A_ID, code: 'COL-01', name: 'Colombo Hotel' },
        location: { id: 'loc-1', code: 'B-01', name: 'Boiler Room' },
        assetCategory: { id: 'cat-1', code: 'BLR', name: 'Boilers' },
        system: { id: 'sys-1', code: 'STM', name: 'Steam System' },
        brand: null,
        model: null,
        assetMeters: [],
        workOrders: [
          {
            id: 'wo-open-1',
            workOrderNumber: 'WO-2026-00042',
            title: 'Routine Steam Trap Check',
            priority: 'medium',
            status: 'assigned',
          },
        ],
      } as any);

      await runWithTenantContext({ organizationId: TENANT_ID }, async () => {
        const scanned = await assetsService.getAssetByQrCode(qrValue);

        expect(scanned.id).toBe('asset-blr-1');
        expect(scanned.assetCode).toBe('BLR-001');
        expect(scanned.workOrders).toHaveLength(1);
        expect(scanned.workOrders[0].workOrderNumber).toBe('WO-2026-00042');
      });
    });
  });
});
