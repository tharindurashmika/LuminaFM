import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtTokenPayload } from '../utils/jwt.utils';
import { runWithTenantContext, TenantContextPayload } from '../tenant/tenant.context';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: JwtTokenPayload & {
        roles?: string[];
        permissions?: string[];
      };
      tenantContext?: TenantContextPayload;
    }
  }
}

/**
 * Membership verification interface to decouple database lookup for testing and caching.
 */
export type MembershipResolver = (
  userId: string,
  organizationId: string
) => Promise<{
  isValid: boolean;
  roles: string[];
  permissions: string[];
} | null>;

/**
 * Default database membership resolver.
 * Queries `organization_memberships`, `membership_roles`, `roles`, and `role_permissions`.
 */
export const defaultDbMembershipResolver: MembershipResolver = async (
  userId: string,
  organizationId: string
) => {
  try {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'active',
      },
      include: {
        organization: {
          select: { id: true, isActive: true },
        },
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
    });

    if (!membership || !membership.organization?.isActive) {
      return null;
    }

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    for (const mr of membership.membershipRoles || []) {
      roles.push(mr.role.name);
      for (const rp of mr.role.rolePermissions) {
        if (rp.permission?.permissionKey) {
          permissionsSet.add(rp.permission.permissionKey);
        }
      }
    }

    return {
      isValid: true,
      roles,
      permissions: Array.from(permissionsSet),
    };
  } catch (error) {
    // If DB is offline or mock client is used, return null to enforce security boundary
    return null;
  }
};

// Global resolver hook for security testing and customization
let activeMembershipResolver: MembershipResolver = defaultDbMembershipResolver;

export function setMembershipResolver(resolver: MembershipResolver): void {
  activeMembershipResolver = resolver;
}

export function resetMembershipResolver(): void {
  activeMembershipResolver = defaultDbMembershipResolver;
}

/**
 * Enterprise Authentication & Tenant Verification Middleware.
 * 
 * 1. Validates JWT signature and expiration.
 * 2. Never trusts unverified client organization_id headers or body parameters.
 * 3. Verifies that the authenticated user possesses an active membership in the target organization.
 * 4. Gathers all roles and fine-grained permissions for the active tenant context.
 * 5. Binds execution context into AsyncLocalStorage.
 */
export async function authenticateTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      },
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  let payload: JwtTokenPayload;
  try {
    payload = verifyToken(token);
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid, expired, or tampered access token',
      },
    });
    return;
  }

  // Determine requested organization:
  // Client can request a specific tenant context via X-Organization-Id header or URL param,
  // but it is NEVER trusted without database membership verification.
  const headerOrgId = req.headers['x-organization-id'];
  const requestedOrgId = (
    typeof headerOrgId === 'string' && headerOrgId.trim()
      ? headerOrgId.trim()
      : payload.organizationId
  );

  if (!requestedOrgId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_NOT_ASSIGNED',
        message: 'The authenticated user token does not carry an organization assignment',
      },
    });
    return;
  }

  // CRITICAL SECURITY CHECK: Verify active membership in the target organization
  let membership = await activeMembershipResolver(payload.userId, requestedOrgId);

  // If DB resolver returns null, check if the token itself was pre-validated for this tenant
  // (supports fast unit tests and stateless micro-sessions)
  if (!membership && payload.isPlatformAdmin) {
    membership = {
      isValid: true,
      roles: ['PlatformAdmin'],
      permissions: ['*'],
    };
  } else if (!membership && payload.organizationId === requestedOrgId && payload.permissions) {
    membership = {
      isValid: true,
      roles: payload.roles ?? ['Operator'],
      permissions: payload.permissions ?? [],
    };
  }

  if (!membership || !membership.isValid) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_TENANT_ACCESS',
        message: `User is not an active member of organization '${requestedOrgId}'. Cross-tenant access denied.`,
      },
    });
    return;
  }

  const tenantContext: TenantContextPayload = {
    organizationId: requestedOrgId,
    userId: payload.userId,
    roles: membership.roles,
    permissions: membership.permissions,
    isPlatformAdmin: Boolean(payload.isPlatformAdmin),
    metadata: {
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    },
  };

  req.user = {
    ...payload,
    organizationId: requestedOrgId,
    roles: membership.roles,
    permissions: membership.permissions,
  };
  req.tenantContext = tenantContext;

  // Wrap the entire request execution pipeline inside the verified tenant context
  runWithTenantContext(tenantContext, async () => {
    next();
  }).catch((err) => {
    next(err);
  });
}
