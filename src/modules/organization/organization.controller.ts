import { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import { organizationService } from './organization.service';

export class OrganizationController {
  async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await organizationService.getSettings();
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgCode = (req.params.code || req.query.code || req.query.org || req.query.id) as
        | string
        | undefined;
      const branding = await organizationService.getPublicBranding(orgCode);
      res.status(200).json({
        success: true,
        data: branding,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        legalName,
        timezone,
        baseCurrency,
        logoUri,
        primaryColor,
        accentColor,
        backgroundColor,
        textColor,
        theme,
        fontFamily,
        locale,
        dateFormat,
        timeFormat,
        numberFormat,
        preferences,
        deploymentMode,
        deploymentSettings,
      } = req.body;

      const updated = await organizationService.updateSettings({
        name,
        legalName,
        timezone,
        baseCurrency,
        logoUri,
        primaryColor,
        accentColor,
        backgroundColor,
        textColor,
        theme,
        fontFamily,
        locale,
        dateFormat,
        timeFormat,
        numberFormat,
        preferences,
        deploymentMode,
        deploymentSettings,
      });

      res.status(200).json({
        success: true,
        message: 'Organization settings and white-label branding updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_MISSING',
            message: 'No logo file provided in request. Expecting multipart field `logo` or `file`.',
          },
        });
        return;
      }

      let fileBuffer = req.file.buffer;
      if (!fileBuffer && req.file.path) {
        fileBuffer = await fs.promises.readFile(req.file.path);
      }

      const result = await organizationService.uploadLogo(
        fileBuffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(200).json({
        success: true,
        message: 'Organization white-label logo uploaded and replaced successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLogo(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationService.deleteLogo();
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.effectiveBranding,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();
