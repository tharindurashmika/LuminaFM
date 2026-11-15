import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export class RolesService {
  /**
   * Lists all roles belonging to the active tenant organization.
   */
  async listRoles() {
    const roles = await tenantPrisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      description: r.description,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }));
  }

  /**
   * Gets details of a specific role within the active tenant organization.
   */
  async getRoleById(roleId: string) {
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw {
        status: 404,
        code: 'ROLE_NOT_FOUND',
        message: `Role with ID '${roleId}' not found in active organization.`,
      };
    }

    return {
      id: role.id,
      organizationId: role.organizationId,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    };
  }

  /**
   * Creates a new custom role within the active tenant.
   */
  async createRole(dto: CreateRoleDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedName = dto.name.trim();

    const existing = await tenantPrisma.role.findFirst({
      where: { name: normalizedName },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'ROLE_EXISTS',
        message: `A role with the name '${normalizedName}' already exists in this organization.`,
      };
    }

    const role = await tenantPrisma.role.create({
      data: {
        organizationId,
        name: normalizedName,
        description: dto.description?.trim() || null,
        isSystemRole: false,
      },
    });

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      for (const permissionId of dto.permissionIds) {
        await tenantPrisma.rolePermission.create({
          data: {
            organizationId,
            roleId: role.id,
            permissionId,
          },
        });
      }
    }

    return this.getRoleById(role.id);
  }

  /**
   * Updates an existing role and its permission grants.
   */
  async updateRole(roleId: string, dto: UpdateRoleDto) {
    const organizationId = requireCurrentTenantId();

    const existing = await tenantPrisma.role.findFirst({
      where: { id: roleId },
    });

    if (!existing) {
      throw {
        status: 404,
        code: 'ROLE_NOT_FOUND',
        message: `Role with ID '${roleId}' not found in active organization.`,
      };
    }

    // System roles should not have their core identity modified
    if (existing.isSystemRole && dto.name && dto.name !== existing.name) {
      throw {
        status: 400,
        code: 'SYSTEM_ROLE_PROTECTED',
        message: 'System role names cannot be renamed.',
      };
    }

    await tenantPrisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    if (dto.permissionIds !== undefined) {
      await tenantPrisma.rolePermission.deleteMany({
        where: { roleId },
      });

      for (const permissionId of dto.permissionIds) {
        await tenantPrisma.rolePermission.create({
          data: {
            organizationId,
            roleId,
            permissionId,
          },
        });
      }
    }

    return this.getRoleById(roleId);
  }

  /**
   * Deletes a custom role from the active tenant.
   */
  async deleteRole(roleId: string) {
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId },
    });

    if (!role) {
      throw {
        status: 404,
        code: 'ROLE_NOT_FOUND',
        message: `Role with ID '${roleId}' not found in active organization.`,
      };
    }

    if (role.isSystemRole) {
      throw {
        status: 400,
        code: 'SYSTEM_ROLE_PROTECTED',
        message: 'Default system roles cannot be deleted.',
      };
    }

    await tenantPrisma.role.delete({
      where: { id: roleId },
    });

    return {
      success: true,
      message: `Role '${role.name}' has been deleted from the organization.`,
    };
  }

  /**
   * Lists the global permission catalog.
   */
  async listPermissionsCatalog() {
    return prisma.permission.findMany({
      orderBy: { permissionKey: 'asc' },
    });
  }
}

export const rolesService = new RolesService();
