import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { validateNoHierarchyCycle, ForeignKeyViolationError } from './hierarchy.validator';

export interface CreateLocationDto {
  siteId: string;
  locationTypeId: string;
  parentLocationId?: string | null;
  code: string;
  name: string;
  description?: string;
  floorLabel?: string;
  areaSqm?: number;
}

export interface UpdateLocationDto {
  locationTypeId?: string;
  parentLocationId?: string | null;
  code?: string;
  name?: string;
  description?: string;
  floorLabel?: string;
  areaSqm?: number;
  isActive?: boolean;
}

export class LocationsService {
  async listLocations(siteId?: string) {
    return tenantPrisma.location.findMany({
      where: siteId ? { siteId } : {},
      include: {
        site: { select: { id: true, code: true, name: true } },
        locationType: { select: { id: true, code: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getLocationById(locationId: string) {
    const location = await tenantPrisma.location.findFirst({
      where: { id: locationId },
      include: {
        site: { select: { id: true, code: true, name: true } },
        locationType: { select: { id: true, code: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true, children: true } },
      },
    });

    if (!location) {
      throw { status: 404, code: 'LOCATION_NOT_FOUND', message: `Location with ID '${locationId}' not found.` };
    }

    return location;
  }

  async createLocation(dto: CreateLocationDto) {
    const organizationId = requireCurrentTenantId();

    // 1. Verify site exists within active tenant
    const site = await tenantPrisma.site.findFirst({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new ForeignKeyViolationError('siteId', dto.siteId, `Site '${dto.siteId}' not found in active organization.`);
    }

    // 2. Verify location type exists within active tenant (or create default)
    const locationType = await tenantPrisma.locationType.findFirst({
      where: { id: dto.locationTypeId },
    });
    if (!locationType) {
      throw new ForeignKeyViolationError(
        'locationTypeId',
        dto.locationTypeId,
        `LocationType '${dto.locationTypeId}' not found in active organization.`
      );
    }

    // 3. Verify parent location if specified (must belong to same site)
    if (dto.parentLocationId) {
      const parent = await tenantPrisma.location.findFirst({
        where: { id: dto.parentLocationId, siteId: dto.siteId },
      });
      if (!parent) {
        throw new ForeignKeyViolationError(
          'parentLocationId',
          dto.parentLocationId,
          `Parent location '${dto.parentLocationId}' not found in site '${dto.siteId}'.`
        );
      }
    }

    const normalizedCode = dto.code.trim().toUpperCase();

    return tenantPrisma.location.create({
      data: {
        organizationId,
        siteId: dto.siteId,
        locationTypeId: dto.locationTypeId,
        parentLocationId: dto.parentLocationId || null,
        code: normalizedCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        floorLabel: dto.floorLabel?.trim() || null,
        areaSqm: dto.areaSqm !== undefined ? dto.areaSqm : null,
      },
      include: {
        site: { select: { id: true, code: true, name: true } },
        locationType: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateLocation(locationId: string, dto: UpdateLocationDto) {
    const existing = await this.getLocationById(locationId);

    // Prevent circular reference if updating parentLocationId
    if (dto.parentLocationId !== undefined && dto.parentLocationId !== existing.parentLocationId) {
      await validateNoHierarchyCycle(
        'Location',
        locationId,
        dto.parentLocationId,
        async (id) => {
          const node = await tenantPrisma.location.findFirst({
            where: { id },
            select: { parentLocationId: true },
          });
          return node?.parentLocationId;
        }
      );

      if (dto.parentLocationId) {
        const parent = await tenantPrisma.location.findFirst({
          where: { id: dto.parentLocationId, siteId: existing.siteId },
        });
        if (!parent) {
          throw new ForeignKeyViolationError(
            'parentLocationId',
            dto.parentLocationId,
            `Parent location '${dto.parentLocationId}' does not belong to site '${existing.siteId}'.`
          );
        }
      }
    }

    return tenantPrisma.location.update({
      where: { id: locationId },
      data: {
        ...(dto.locationTypeId ? { locationTypeId: dto.locationTypeId } : {}),
        ...(dto.parentLocationId !== undefined ? { parentLocationId: dto.parentLocationId } : {}),
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.floorLabel !== undefined ? { floorLabel: dto.floorLabel } : {}),
        ...(dto.areaSqm !== undefined ? { areaSqm: dto.areaSqm } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteLocation(locationId: string) {
    await this.getLocationById(locationId);

    // Check if children exist
    const childCount = await tenantPrisma.location.count({
      where: { parentLocationId: locationId },
    });
    if (childCount > 0) {
      throw {
        status: 400,
        code: 'LOCATION_HAS_CHILDREN',
        message: `Cannot delete location '${locationId}'. It has ${childCount} child location(s). Reassign them first.`,
      };
    }

    await tenantPrisma.location.delete({
      where: { id: locationId },
    });

    return { success: true, message: `Location '${locationId}' deleted successfully.` };
  }
}

export const locationsService = new LocationsService();

