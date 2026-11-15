import { Request, Response, NextFunction } from 'express';
import { rolesService } from './roles.service';

export class RolesController {
  async listRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await rolesService.listRoles();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = String(req.params.id);
      const role = await rolesService.getRoleById(roleId);
      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (err) {
      next(err);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, permissionIds } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role name is required',
          },
        });
        return;
      }

      const created = await rolesService.createRole({
        name,
        description,
        permissionIds,
      });

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = String(req.params.id);
      const { name, description, permissionIds } = req.body;

      const updated = await rolesService.updateRole(roleId, {
        name,
        description,
        permissionIds,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = String(req.params.id);
      const result = await rolesService.deleteRole(roleId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listPermissionsCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await rolesService.listPermissionsCatalog();
      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const rolesController = new RolesController();
