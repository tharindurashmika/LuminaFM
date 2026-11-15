import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';

export interface CreateSiteDto {
  code: string;
  name: string;
  siteType?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

export interface UpdateSiteDto {
  code?: string;
  name?: string;
  siteType?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  isActive?: boolean;
}

export class SitesService {
  async listSites() {
    return tenantPrisma.site.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getSiteById(siteId: string) {
    const site = await tenantPrisma.site.findFirst({
      where: { id: siteId },
      include: {
        _count: {
          select: { locations: true, systems: true, assets: true },
        },
      },
    });

    if (!site) {
      throw { status: 404, code: 'SITE_NOT_FOUND', message: `Site with ID '${siteId}' not found.` };
    }

    return site;
  }

  async createSite(dto: CreateSiteDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await tenantPrisma.site.findFirst({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'SITE_EXISTS',
        message: `A site with code '${normalizedCode}' already exists in this organization.`,
      };
    }

    return tenantPrisma.site.create({
      data: {
        organizationId,
        code: normalizedCode,
        name: dto.name.trim(),
        siteType: dto.siteType?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city?.trim() || null,
        region: dto.region?.trim() || null,
        country: dto.country?.trim() || 'Sri Lanka',
        timezone: dto.timezone?.trim() || null,
      },
    });
  }

  async updateSite(siteId: string, dto: UpdateSiteDto) {
    await this.getSiteById(siteId);

    return tenantPrisma.site.update({
      where: { id: siteId },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.siteType !== undefined ? { siteType: dto.siteType } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 } : {}),
        ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2 } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteSite(siteId: string) {
    await this.getSiteById(siteId);

    await tenantPrisma.site.delete({
      where: { id: siteId },
    });

    return { success: true, message: `Site '${siteId}' deleted successfully.` };
  }
}

export const sitesService = new SitesService();

