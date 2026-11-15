import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { validateNoHierarchyCycle, ForeignKeyViolationError } from './hierarchy.validator';
import { CriticalityLevel, SystemStatus } from '@prisma/client';

export interface CreateSystemDto {
  siteId: string;
  systemTypeId: string;
  parentSystemId?: string | null;
  code: string;
  name: string;
  description?: string;
  criticality?: CriticalityLevel;
  status?: SystemStatus;
}

export interface UpdateSystemDto {
  systemTypeId?: string;
  parentSystemId?: string | null;
  code?: string;
  name?: string;
  description?: string;
  criticality?: CriticalityLevel;
  status?: SystemStatus;
}

export class SystemsService {
  async listSystems(siteId?: string) {
    return tenantPrisma.system.findMany({
      where: siteId ? { siteId } : {},
      include: {
        site: { select: { id: true, code: true, name: true } },
        systemType: { select: { id: true, code: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getSystemById(systemId: string) {
    const system = await tenantPrisma.system.findFirst({
      where: { id: systemId },
      include: {
        site: { select: { id: true, code: true, name: true } },
        systemType: { select: { id: true, code: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
        _count: { select: { assets: true, children: true } },
      },
    });

    if (!system) {
      throw { status: 404, code: 'SYSTEM_NOT_FOUND', message: `System with ID '${systemId}' not found.` };
    }

    return system;
  }

  async createSystem(dto: CreateSystemDto) {
    const organizationId = requireCurrentTenantId();

    // 1. Verify site exists within active tenant
    const site = await tenantPrisma.site.findFirst({
      where: { id: dto.siteId },
    });
    if (!site) {
      throw new ForeignKeyViolationError('siteId', dto.siteId, `Site '${dto.siteId}' not found in active organization.`);
    }

    // 2. Verify system type exists within active tenant
    const systemType = await tenantPrisma.systemType.findFirst({
      where: { id: dto.systemTypeId },
    });
    if (!systemType) {
      throw new ForeignKeyViolationError(
        'systemTypeId',
        dto.systemTypeId,
        `SystemType '${dto.systemTypeId}' not found in active organization.`
      );
    }

    // 3. Verify parent system if specified (must belong to same site)
    if (dto.parentSystemId) {
      const parent = await tenantPrisma.system.findFirst({
        where: { id: dto.parentSystemId, siteId: dto.siteId },
      });
      if (!parent) {
        throw new ForeignKeyViolationError(
          'parentSystemId',
          dto.parentSystemId,
          `Parent system '${dto.parentSystemId}' not found in site '${dto.siteId}'.`
        );
      }
    }

    const normalizedCode = dto.code.trim().toUpperCase();

    return tenantPrisma.system.create({
      data: {
        organizationId,
        siteId: dto.siteId,
        systemTypeId: dto.systemTypeId,
        parentSystemId: dto.parentSystemId || null,
        code: normalizedCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        criticality: dto.criticality || 'medium',
        status: dto.status || 'active',
      },
      include: {
        site: { select: { id: true, code: true, name: true } },
        systemType: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateSystem(systemId: string, dto: UpdateSystemDto) {
    const existing = await this.getSystemById(systemId);

    // Prevent circular reference if updating parentSystemId
    if (dto.parentSystemId !== undefined && dto.parentSystemId !== existing.parentSystemId) {
      await validateNoHierarchyCycle(
        'System',
        systemId,
        dto.parentSystemId,
        async (id) => {
          const node = await tenantPrisma.system.findFirst({
            where: { id },
            select: { parentSystemId: true },
          });
          return node?.parentSystemId;
        }
      );

      if (dto.parentSystemId) {
        const parent = await tenantPrisma.system.findFirst({
          where: { id: dto.parentSystemId, siteId: existing.siteId },
        });
        if (!parent) {
          throw new ForeignKeyViolationError(
            'parentSystemId',
            dto.parentSystemId,
            `Parent system '${dto.parentSystemId}' does not belong to site '${existing.siteId}'.`
          );
        }
      }
    }

    return tenantPrisma.system.update({
      where: { id: systemId },
      data: {
        ...(dto.systemTypeId ? { systemTypeId: dto.systemTypeId } : {}),
        ...(dto.parentSystemId !== undefined ? { parentSystemId: dto.parentSystemId } : {}),
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.criticality ? { criticality: dto.criticality } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async deleteSystem(systemId: string) {
    await this.getSystemById(systemId);

    const childCount = await tenantPrisma.system.count({
      where: { parentSystemId: systemId },
    });
    if (childCount > 0) {
      throw {
        status: 400,
        code: 'SYSTEM_HAS_CHILDREN',
        message: `Cannot delete system '${systemId}'. It has ${childCount} child system(s). Reassign them first.`,
      };
    }

    await tenantPrisma.system.delete({
      where: { id: systemId },
    });

    return { success: true, message: `System '${systemId}' deleted successfully.` };
  }
}

export const systemsService = new SystemsService();

