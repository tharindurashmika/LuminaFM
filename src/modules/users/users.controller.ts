import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export class UsersController {
  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.listUsers();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.id);
      const user = await usersService.getUserById(userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, fullName, password, phone, employeeCode, jobTitle, roleIds, status } = req.body;

      if (!email || !fullName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and full name are required to add a user to the organization',
          },
        });
        return;
      }

      const created = await usersService.createUser({
        email,
        fullName,
        password,
        phone,
        employeeCode,
        jobTitle,
        roleIds,
        status,
      });

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.id);
      const { fullName, phone, employeeCode, jobTitle, status, roleIds } = req.body;

      const updated = await usersService.updateUser(userId, {
        fullName,
        phone,
        employeeCode,
        jobTitle,
        status,
        roleIds,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.id);
      const result = await usersService.deleteUser(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
