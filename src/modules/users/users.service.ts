import prisma from '../../lib/prisma';
import tenantPrisma from '../../tenant/tenant.client';
import { requireCurrentTenantId } from '../../tenant/tenant.context';
import { hashPassword } from '../../utils/password.utils';
import { MembershipStatus } from '@prisma/client';

export interface CreateTenantUserDto {
  email: string;
  fullName: string;
  password?: string;
  phone?: string;
  employeeCode?: string;
  jobTitle?: string;
  roleIds?: string[];
  status?: MembershipStatus;
}

export interface UpdateTenantUserDto {
  fullName?: string;
  phone?: string;
  employeeCode?: string;
  jobTitle?: string;
  status?: MembershipStatus;
  roleIds?: string[];
}

export class UsersService {
  /**
   * Lists all users belonging to the active tenant organization.
   */
  async listUsers() {
    const organizationId = requireCurrentTenantId();

    const memberships = await tenantPrisma.organizationMembership.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        membershipRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystemRole: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      organizationId,
      status: m.status,
      employeeCode: m.employeeCode,
      jobTitle: m.jobTitle,
      joinedAt: m.joinedAt,
      user: m.user,
      roles: m.membershipRoles.map((mr) => mr.role),
    }));
  }

  /**
   * Gets details of a specific user within the active tenant.
   */
  async getUserById(userId: string) {
    const organizationId = requireCurrentTenantId();

    const membership = await tenantPrisma.organizationMembership.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        membershipRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystemRole: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: `User with ID '${userId}' not found in active organization.`,
      };
    }

    return {
      membershipId: membership.id,
      organizationId,
      status: membership.status,
      employeeCode: membership.employeeCode,
      jobTitle: membership.jobTitle,
      joinedAt: membership.joinedAt,
      user: membership.user,
      roles: membership.membershipRoles.map((mr) => mr.role),
    };
  }

  /**
   * Invites or creates a new user within the active tenant organization.
   */
  async createUser(dto: CreateTenantUserDto) {
    const organizationId = requireCurrentTenantId();
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if membership already exists in this tenant
    const existingMembership = await tenantPrisma.organizationMembership.findFirst({
      where: {
        user: { email: normalizedEmail },
      },
    });

    if (existingMembership) {
      throw {
        status: 409,
        code: 'MEMBERSHIP_EXISTS',
        message: `User with email '${normalizedEmail}' is already a member of this organization.`,
      };
    }

    // Check or create global User
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const defaultPassword = dto.password || 'LuminaTemp@123';
      const passwordHash = await hashPassword(defaultPassword);

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() || null,
          passwordHash,
        },
      });
    }

    // Create Membership scoped to tenant
    const membership = await tenantPrisma.organizationMembership.create({
      data: {
        organizationId,
        userId: user.id,
        employeeCode: dto.employeeCode?.trim() || null,
        jobTitle: dto.jobTitle?.trim() || null,
        status: dto.status || 'active',
        joinedAt: new Date(),
      },
    });

    // Assign roles if specified
    if (dto.roleIds && dto.roleIds.length > 0) {
      for (const roleId of dto.roleIds) {
        await tenantPrisma.membershipRole.create({
          data: {
            organizationId,
            membershipId: membership.id,
            roleId,
          },
        });
      }
    }

    return this.getUserById(user.id);
  }

  /**
   * Updates an existing user's profile and membership attributes within the active tenant.
   */
  async updateUser(userId: string, dto: UpdateTenantUserDto) {
    const organizationId = requireCurrentTenantId();

    const membership = await tenantPrisma.organizationMembership.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: `User with ID '${userId}' not found in active organization.`,
      };
    }

    // Update global user attributes if provided
    if (dto.fullName || dto.phone !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone ? dto.phone.trim() : null } : {}),
        },
      });
    }

    // Update membership attributes
    await tenantPrisma.organizationMembership.update({
      where: { id: membership.id },
      data: {
        ...(dto.employeeCode !== undefined ? { employeeCode: dto.employeeCode } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    // Update role assignments if provided
    if (dto.roleIds !== undefined) {
      await tenantPrisma.membershipRole.deleteMany({
        where: { membershipId: membership.id },
      });

      for (const roleId of dto.roleIds) {
        await tenantPrisma.membershipRole.create({
          data: {
            organizationId,
            membershipId: membership.id,
            roleId,
          },
        });
      }
    }

    return this.getUserById(userId);
  }

  /**
   * Removes a user from the active tenant organization.
   */
  async deleteUser(userId: string) {
    const membership = await tenantPrisma.organizationMembership.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: `User with ID '${userId}' not found in active organization.`,
      };
    }

    await tenantPrisma.organizationMembership.delete({
      where: { id: membership.id },
    });

    return {
      success: true,
      message: `User with ID '${userId}' has been removed from the organization.`,
    };
  }
}

export const usersService = new UsersService();
