import { Request, Response, NextFunction } from 'express';

/**
 * Middleware enforcing fine-grained permission-based authorization.
 * Verifies that the authenticated user possesses the required permission(s)
 * within their verified organization membership context.
 *
 * @param requiredPermissions Single permission key or array of acceptable keys (OR condition)
 */
export function requirePermission(
  requiredPermissions: string | string[]
): (req: Request, res: Response, next: NextFunction) => void {
  const permissionsList = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before permission evaluation',
        },
      });
      return;
    }

    // Platform Superadmins bypass organization-level permission checks
    if (req.user.isPlatformAdmin) {
      next();
      return;
    }

    const userPermissions = new Set<string>(req.user.permissions ?? []);

    // Check if user has at least one of the required permissions
    const hasAccess = permissionsList.some((perm) => userPermissions.has(perm));

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Requires at least one of the following permissions: [${permissionsList.join(
            ', '
          )}]`,
          requiredPermissions: permissionsList,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware enforcing role-based authorization.
 *
 * @param requiredRoles Single role name or array of acceptable role names (OR condition)
 */
export function requireRole(
  requiredRoles: string | string[]
): (req: Request, res: Response, next: NextFunction) => void {
  const rolesList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before role evaluation',
        },
      });
      return;
    }

    if (req.user.isPlatformAdmin) {
      next();
      return;
    }

    const userRoles = new Set<string>(req.user.roles ?? []);
    const hasRoleAccess = rolesList.some((role) => userRoles.has(role));

    if (!hasRoleAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_INSUFFICIENT_ROLE',
          message: `Access denied. Requires one of the following roles: [${rolesList.join(', ')}]`,
          requiredRoles: rolesList,
        },
      });
      return;
    }

    next();
  };
}

