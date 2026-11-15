import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, organizationCode, organizationId } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        });
        return;
      }

      const result = await authService.login(
        { email, password, organizationCode, organizationId },
        {
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
          userAgent: req.headers['user-agent'],
        }
      );

      res.status(200).json({
        success: true,
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          user_id: result.userId,
          organization_id: result.organizationId,
          logo_uri: result.logoUri,
          user: result.user,
          organization: result.organization,
          available_organizations: result.availableOrganizations,
          roles: result.roles,
          permissions: result.permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        organizationCode,
        organizationName,
        email,
        password,
        fullName,
        jobTitle,
        logoUri,
        deploymentMode,
      } = req.body;

      if (!organizationCode || !organizationName || !email || !password || !fullName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizationCode, organizationName, email, password, and fullName are required',
          },
        });
        return;
      }

      const result = await authService.registerTenant({
        organizationCode,
        organizationName,
        email,
        password,
        fullName,
        jobTitle,
        logoUri,
        deploymentMode,
      });

      res.status(201).json({
        success: true,
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          user_id: result.userId,
          organization_id: result.organizationId,
          logo_uri: result.logoUri,
          user: result.user,
          organization: result.organization,
          available_organizations: result.availableOrganizations,
          roles: result.roles,
          permissions: result.permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.body.refreshToken || req.body.refresh_token || (req.headers['x-refresh-token'] as string);

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'refreshToken is required in body or x-refresh-token header',
          },
        });
        return;
      }

      const result = await authService.renewToken(refreshToken);

      res.status(200).json({
        success: true,
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          organization_id: result.organizationId,
          user_id: result.userId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.body.refreshToken || req.body.refresh_token || (req.headers['x-refresh-token'] as string);

      const result = await authService.logout(refreshToken);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email address is required',
          },
        });
        return;
      }

      const result = await authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.resetToken ? { reset_token: result.resetToken } : undefined,
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword, new_password } = req.body;
      const pwd = newPassword || new_password;

      if (!token || !pwd) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Reset token and newPassword are required',
          },
        });
        return;
      }

      const result = await authService.resetPassword(token, pwd);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const orgs = await authService.getUserOrganizations(
        userId,
        req.tenantContext?.organizationId
      );

      res.status(200).json({
        success: true,
        data: orgs,
      });
    } catch (err) {
      next(err);
    }
  }

  async switchOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { organizationId, organization_id, organizationCode, organization_code } = req.body;
      const targetId = organizationId || organization_id;
      const targetCode = organizationCode || organization_code;

      if (!targetId && !targetCode) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either organizationId or organizationCode is required',
          },
        });
        return;
      }

      const result = await authService.switchOrganization(userId, {
        organizationId: targetId,
        organizationCode: targetCode,
      });

      res.status(200).json({
        success: true,
        message: `Successfully switched to organization '${result.organization.name}'.`,
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          user_id: result.userId,
          organization_id: result.organizationId,
          organization: result.organization,
          roles: result.roles,
          permissions: result.permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenantContext?.organizationId;
      if (!organizationId) {
        res.status(403).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Active organization context required' },
        });
        return;
      }

      const { email, roleIds, role_ids, jobTitle, job_title, employeeCode, employee_code } =
        req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email is required for user invitation' },
        });
        return;
      }

      const result = await authService.inviteUser(
        {
          email,
          roleIds: roleIds || role_ids,
          jobTitle: jobTitle || job_title,
          employeeCode: employeeCode || employee_code,
        },
        organizationId,
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.invitation,
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, fullName, full_name, password } = req.body;
      const name = fullName || full_name;

      if (!token || !name || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'token, fullName, and password are required',
          },
        });
        return;
      }

      const result = await authService.acceptInvite({
        token,
        fullName: name,
        password,
      });

      res.status(200).json({
        success: true,
        message: 'Invitation accepted and account activated successfully.',
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          user_id: result.userId,
          organization_id: result.organizationId,
          user: result.user,
          organization: result.organization,
          roles: result.roles,
          permissions: result.permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user,
          tenant_context: req.tenantContext,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
