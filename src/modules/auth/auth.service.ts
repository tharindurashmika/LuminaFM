import prisma from '../../lib/prisma';
import { comparePassword, hashPassword } from '../../utils/password.utils';
import { tokenService } from './token.service';
import { JwtTokenPayload } from '../../utils/jwt.utils';
import { resolveEffectiveBranding } from '../organization/branding.constants';

export interface LoginDto {
  email: string;
  password: string;
  organizationCode?: string;
  organizationId?: string;
}

export interface RegisterTenantDto {
  organizationCode: string;
  organizationName: string;
  email: string;
  password: string;
  fullName: string;
  jobTitle?: string;
  logoUri?: string;
  deploymentMode?: 'saas_multitenant' | 'dedicated_instance';
}

export interface InviteUserDto {
  email: string;
  roleIds?: string[];
  jobTitle?: string;
  employeeCode?: string;
}

export interface AcceptInviteDto {
  token: string;
  fullName: string;
  password: string;
}

export interface SwitchOrganizationDto {
  organizationId?: string;
  organizationCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  organizationId: string;
  logoUri: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    jobTitle?: string | null;
  };
  organization: {
    id: string;
    code: string;
    name: string;
    logoUri: string | null;
    branding?: any;
  };
  availableOrganizations?: Array<{
    id: string;
    code: string;
    name: string;
    logoUri: string | null;
    jobTitle?: string | null;
  }>;
  roles?: string[];
  permissions?: string[];
}

export class AuthService {
  /**
   * Helper to resolve a complete JwtTokenPayload for a user within an organization.
   */
  async resolveUserPayload(userId: string, organizationId: string): Promise<JwtTokenPayload | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            where: { organizationId, status: 'active' },
            include: {
              membershipRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive || !user.memberships || user.memberships.length === 0) {
        return null;
      }

      const membership = user.memberships[0];
      const roles: string[] = [];
      const permissionsSet = new Set<string>();

      for (const mr of membership.membershipRoles) {
        roles.push(mr.role.name);
        for (const rp of mr.role.rolePermissions) {
          if (rp.permission?.permissionKey) {
            permissionsSet.add(rp.permission.permissionKey);
          }
        }
      }

      return {
        userId: user.id,
        email: user.email,
        organizationId,
        isPlatformAdmin: user.isPlatformAdmin,
        roles,
        permissions: Array.from(permissionsSet),
      };
    } catch {
      return null;
    }
  }

  /**
   * Authenticates a user, supports multiple organizations, issues access & refresh tokens.
   */
  async login(dto: LoginDto, metadata?: { ipAddress?: string; userAgent?: string }): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { status: 'active' },
          include: {
            organization: true,
            membershipRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    if (!user.memberships || user.memberships.length === 0) {
      throw {
        status: 403,
        code: 'NO_ACTIVE_MEMBERSHIP',
        message: 'User does not belong to any active organization in LuminaFM',
      };
    }

    // Determine target organization membership
    let selectedMembership = user.memberships[0];

    if (dto.organizationId) {
      const match = user.memberships.find((m) => m.organizationId === dto.organizationId);
      if (!match) {
        throw {
          status: 403,
          code: 'MEMBERSHIP_NOT_FOUND',
          message: `User is not an active member of organization ID '${dto.organizationId}'`,
        };
      }
      selectedMembership = match;
    } else if (dto.organizationCode) {
      const match = user.memberships.find(
        (m) => m.organization.code.toLowerCase() === dto.organizationCode?.toLowerCase().trim()
      );
      if (!match) {
        throw {
          status: 403,
          code: 'MEMBERSHIP_NOT_FOUND',
          message: `User is not an active member of organization '${dto.organizationCode}'`,
        };
      }
      selectedMembership = match;
    }

    const org = selectedMembership.organization;

    // Resolve roles & permissions
    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    for (const mr of selectedMembership.membershipRoles) {
      roles.push(mr.role.name);
      for (const rp of mr.role.rolePermissions) {
        if (rp.permission?.permissionKey) {
          permissionsSet.add(rp.permission.permissionKey);
        }
      }
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userPayload: JwtTokenPayload = {
      userId: user.id,
      email: user.email,
      organizationId: org.id,
      isPlatformAdmin: user.isPlatformAdmin,
      roles,
      permissions: Array.from(permissionsSet),
    };

    // Generate rotated token pair (access token + refresh token)
    const tokens = await tokenService.generateTokenPair(userPayload, metadata);

    const availableOrganizations = user.memberships.map((m) => ({
      id: m.organization.id,
      code: m.organization.code,
      name: m.organization.name,
      logoUri: m.organization.logoUri,
      jobTitle: m.jobTitle,
    }));

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: user.id,
      organizationId: org.id,
      logoUri: org.logoUri,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        jobTitle: selectedMembership.jobTitle,
      },
      organization: {
        id: org.id,
        code: org.code,
        name: org.name,
        logoUri: org.logoUri,
        branding: resolveEffectiveBranding(org),
      },
      availableOrganizations,
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  /**
   * Onboards a new tenant organization with an initial admin user.
   */
  async registerTenant(dto: RegisterTenantDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const hashedPassword = await hashPassword(dto.password);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          code: dto.organizationCode.trim(),
          name: dto.organizationName.trim(),
          logoUri: dto.logoUri || null,
          deploymentMode: (dto.deploymentMode as any) || 'saas_multitenant',
        },
      });

      // 2. Create or find User
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: { passwordHash: hashedPassword },
          })
        : await tx.user.create({
            data: {
              email: normalizedEmail,
              fullName: dto.fullName.trim(),
              passwordHash: hashedPassword,
            },
          });

      // 3. Create Default Admin Role
      const adminRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: 'Administrator',
          description: 'Full administrative access to all facility CMMS modules',
          isSystemRole: true,
        },
      });

      // 4. Create Membership
      const membership = await tx.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          jobTitle: dto.jobTitle || 'Facility Administrator',
          status: 'active',
          joinedAt: new Date(),
        },
      });

      // 5. Assign Admin Role to Membership
      await tx.membershipRole.create({
        data: {
          organizationId: org.id,
          membershipId: membership.id,
          roleId: adminRole.id,
        },
      });

      return { user, org, membership, adminRole };
    });

    const userPayload: JwtTokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.org.id,
      isPlatformAdmin: result.user.isPlatformAdmin,
      roles: ['Administrator'],
      permissions: ['*'],
    };

    const tokens = await tokenService.generateTokenPair(userPayload);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: result.user.id,
      organizationId: result.org.id,
      logoUri: result.org.logoUri,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        jobTitle: result.membership.jobTitle,
      },
      organization: {
        id: result.org.id,
        code: result.org.code,
        name: result.org.name,
        logoUri: result.org.logoUri,
        branding: resolveEffectiveBranding(result.org),
      },
      availableOrganizations: [
        {
          id: result.org.id,
          code: result.org.code,
          name: result.org.name,
          logoUri: result.org.logoUri,
          jobTitle: result.membership.jobTitle,
        },
      ],
      roles: ['Administrator'],
      permissions: ['*'],
    };
  }

  /**
   * Renews access token using a valid, unrevoked refresh token with automatic rotation.
   */
  async renewToken(rawRefreshToken: string) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw { status: 400, code: 'TOKEN_REQUIRED', message: 'Refresh token is required' };
    }

    return tokenService.rotateRefreshToken(rawRefreshToken, (userId, organizationId) =>
      this.resolveUserPayload(userId, organizationId)
    );
  }

  /**
   * Logs out a session by revoking the refresh token.
   */
  async logout(rawRefreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (rawRefreshToken) {
      await tokenService.revokeRefreshToken(rawRefreshToken);
    }
    return {
      success: true,
      message: 'Logged out successfully. Session invalidated.',
    };
  }

  /**
   * Requests a password reset link/token.
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      // Security: Avoid account enumeration
      return {
        success: true,
        message: 'If the provided email is associated with an active account, a password reset link has been dispatched.',
      };
    }

    const { resetToken } = await tokenService.createPasswordResetToken(user.id);

    return {
      success: true,
      message: 'If the provided email is associated with an active account, a password reset link has been dispatched.',
      resetToken, // Returned for dev/test verification
    };
  }

  /**
   * Resets password using a verified reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!token || !newPassword || newPassword.length < 8) {
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Token and new password (minimum 8 characters) are required',
      };
    }

    const { userId } = await tokenService.consumePasswordResetToken(token);
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Security: Invalidate all existing active sessions on password change
    await tokenService.revokeAllUserTokens(userId);

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Lists all organizations the authenticated user belongs to.
   */
  async getUserOrganizations(userId: string, currentOrgId?: string) {
    const memberships = await prisma.organizationMembership.findMany({
      where: { userId, status: 'active' },
      include: {
        organization: true,
        membershipRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      organizationId: m.organization.id,
      code: m.organization.code,
      name: m.organization.name,
      legalName: m.organization.legalName,
      logoUri: m.organization.logoUri,
      timezone: m.organization.timezone,
      baseCurrency: m.organization.baseCurrency,
      deploymentMode: m.organization.deploymentMode,
      jobTitle: m.jobTitle,
      employeeCode: m.employeeCode,
      joinedAt: m.joinedAt,
      roles: m.membershipRoles.map((mr) => mr.role.name),
      isCurrent: m.organization.id === currentOrgId,
      branding: resolveEffectiveBranding(m.organization),
    }));
  }

  /**
   * Switches the active organization context for a multi-organization user.
   */
  async switchOrganization(
    userId: string,
    dto: SwitchOrganizationDto
  ): Promise<AuthResponse> {
    const organizations = await this.getUserOrganizations(userId);

    let target = organizations.find((o) => {
      if (dto.organizationId && o.organizationId === dto.organizationId) return true;
      if (dto.organizationCode && o.code.toLowerCase() === dto.organizationCode.toLowerCase().trim())
        return true;
      return false;
    });

    if (!target) {
      throw {
        status: 403,
        code: 'FORBIDDEN_TENANT_ACCESS',
        message: 'User does not belong to the requested organization or membership is inactive',
      };
    }

    const userPayload = await this.resolveUserPayload(userId, target.organizationId);
    if (!userPayload) {
      throw {
        status: 403,
        code: 'FORBIDDEN_TENANT_ACCESS',
        message: 'Unable to resolve roles or permissions for target organization',
      };
    }

    const tokens = await tokenService.generateTokenPair(userPayload);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId,
      organizationId: target.organizationId,
      logoUri: target.logoUri,
      user: {
        id: userId,
        email: user?.email || '',
        fullName: user?.fullName || '',
        jobTitle: target.jobTitle,
      },
      organization: {
        id: target.organizationId,
        code: target.code,
        name: target.name,
        logoUri: target.logoUri,
        branding: target.branding,
      },
      availableOrganizations: organizations.map((o) => ({
        id: o.organizationId,
        code: o.code,
        name: o.name,
        logoUri: o.logoUri,
        jobTitle: o.jobTitle,
      })),
      roles: userPayload.roles,
      permissions: userPayload.permissions,
    };
  }

  /**
   * Invites a new user to join the active organization.
   */
  async inviteUser(
    dto: InviteUserDto,
    organizationId: string,
    invitedById?: string
  ): Promise<{ success: boolean; message: string; invitation: any }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if membership already active
    const existing = await prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        user: { email: normalizedEmail },
        status: 'active',
      },
    });

    if (existing) {
      throw {
        status: 409,
        code: 'MEMBERSHIP_EXISTS',
        message: `User with email '${normalizedEmail}' is already an active member of this organization.`,
      };
    }

    // Generate invitation token
    const tokenRecord = await tokenService.createInvitationToken({
      organizationId,
      email: normalizedEmail,
      roleIds: dto.roleIds,
      jobTitle: dto.jobTitle,
      employeeCode: dto.employeeCode,
      invitedById,
    });

    // Check or create placeholder User & Membership with 'invited' status
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: normalizedEmail.split('@')[0],
          isActive: true,
        },
      });
    }

    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      create: {
        organizationId,
        userId: user.id,
        jobTitle: dto.jobTitle || 'Invited Member',
        employeeCode: dto.employeeCode || null,
        status: 'invited',
      },
      update: {
        status: 'invited',
        jobTitle: dto.jobTitle || 'Invited Member',
        employeeCode: dto.employeeCode || null,
      },
    });

    return {
      success: true,
      message: `Invitation successfully created for '${normalizedEmail}'.`,
      invitation: {
        invitationId: tokenRecord.invitationId,
        email: normalizedEmail,
        expiresAt: tokenRecord.expiresAt,
        inviteToken: tokenRecord.inviteToken,
      },
    };
  }

  /**
   * Accepts an invitation, sets up user profile & password, and activates membership.
   */
  async acceptInvite(dto: AcceptInviteDto): Promise<AuthResponse> {
    if (!dto.token || !dto.password || dto.password.length < 8) {
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Valid invitation token and password (minimum 8 characters) are required',
      };
    }

    const invitation = await tokenService.consumeInvitationToken(dto.token);
    const passwordHash = await hashPassword(dto.password);

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: invitation.email },
      create: {
        email: invitation.email,
        fullName: dto.fullName.trim(),
        passwordHash,
        isActive: true,
      },
      update: {
        fullName: dto.fullName.trim(),
        passwordHash,
        isActive: true,
      },
    });

    // Activate membership
    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
      create: {
        organizationId: invitation.organizationId,
        userId: user.id,
        jobTitle: invitation.jobTitle || 'Team Member',
        employeeCode: invitation.employeeCode || null,
        status: 'active',
        joinedAt: new Date(),
      },
      update: {
        status: 'active',
        joinedAt: new Date(),
        jobTitle: invitation.jobTitle || undefined,
        employeeCode: invitation.employeeCode || undefined,
      },
    });

    // Assign roles from invitation
    if (invitation.roleIds && invitation.roleIds.length > 0) {
      for (const roleId of invitation.roleIds) {
        try {
          await prisma.membershipRole.upsert({
            where: {
              organizationId_membershipId_roleId: {
                organizationId: invitation.organizationId,
                membershipId: membership.id,
                roleId,
              },
            },
            create: {
              organizationId: invitation.organizationId,
              membershipId: membership.id,
              roleId,
            },
            update: {},
          });
        } catch {
          // Ignore duplicate role assignment
        }
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
    });

    const userPayload = (await this.resolveUserPayload(user.id, invitation.organizationId)) || {
      userId: user.id,
      email: user.email,
      organizationId: invitation.organizationId,
      roles: ['Operator'],
      permissions: [],
    };

    const tokens = await tokenService.generateTokenPair(userPayload);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: user.id,
      organizationId: invitation.organizationId,
      logoUri: org?.logoUri || null,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        jobTitle: membership.jobTitle,
      },
      organization: {
        id: org?.id || invitation.organizationId,
        code: org?.code || 'ORG',
        name: org?.name || 'Organization',
        logoUri: org?.logoUri || null,
        branding: resolveEffectiveBranding(org),
      },
      roles: userPayload.roles,
      permissions: userPayload.permissions,
    };
  }
}

export const authService = new AuthService();
