import { Request, Response, NextFunction } from 'express';
import { assetsService } from './assets.service';

export class AssetsController {
  async registerAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        organization_id,
        site_id,
        location_id,
        asset_category_id,
        asset_code,
        name,
        system_id,
        brand_id,
        model_id,
        parent_asset_id,
        serial_number,
        description,
        manufacturer_date,
        installation_date,
        commissioning_date,
        warranty_expiry_date,
        expected_life_years,
        criticality,
        status,
        qr_code_value,
        image_uri,
        notes,
      } = req.body;

      if (!site_id || !location_id || !asset_category_id || !asset_code || !name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'site_id, location_id, asset_category_id, asset_code, and name are required to register an asset.',
          },
        });
        return;
      }

      const asset = await assetsService.registerAsset({
        organization_id,
        site_id,
        location_id,
        asset_category_id,
        asset_code,
        name,
        system_id,
        brand_id,
        model_id,
        parent_asset_id,
        serial_number,
        description,
        manufacturer_date,
        installation_date,
        commissioning_date,
        warranty_expiry_date,
        expected_life_years,
        criticality,
        status,
        qr_code_value,
        image_uri,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Asset registered successfully.',
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  }

  async listAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { siteId, locationId, systemId, categoryId } = req.query;
      const assets = await assetsService.listAssets({
        siteId: siteId as string | undefined,
        locationId: locationId as string | undefined,
        systemId: systemId as string | undefined,
        categoryId: categoryId as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: assets,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAssetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const asset = await assetsService.getAssetById(String(req.params.id));
      res.status(200).json({
        success: true,
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await assetsService.updateAsset(String(req.params.id), req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await assetsService.deleteAsset(String(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAssetStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, reason, notes } = req.body;
      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'status is required (e.g. in_service, under_maintenance, standby, out_of_service, decommissioned)',
          },
        });
        return;
      }

      const updated = await assetsService.updateAssetStatus(
        String(req.params.id),
        { status, reason, notes },
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: `Asset status updated to '${status}'.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getLifecycleHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await assetsService.getAssetLifecycleHistory(String(req.params.id));
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async scanQrCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = String(req.params.qrCode || req.query.code || req.body.code);
      const asset = await assetsService.getAssetByQrCode(code);
      res.status(200).json({
        success: true,
        data: asset,
      });
    } catch (err) {
      next(err);
    }
  }

  async generateQrCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await assetsService.generateAssetQrCode(String(req.params.id));
      res.status(200).json({
        success: true,
        message: 'QR code identifier generated successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const assetsController = new AssetsController();

