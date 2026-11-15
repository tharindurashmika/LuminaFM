import { Request, Response, NextFunction } from 'express';
import { attributesService } from './attributes.service';

export class AttributesController {
  async createDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, name, dataType, unitCode, description, options } = req.body;

      if (!code || !name || !dataType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'code, name, and dataType are required to define an attribute.',
          },
        });
        return;
      }

      const definition = await attributesService.createAttributeDefinition({
        code,
        name,
        dataType,
        unitCode,
        description,
        options,
      });

      res.status(201).json({
        success: true,
        data: definition,
      });
    } catch (err) {
      next(err);
    }
  }

  async listDefinitions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const definitions = await attributesService.listAttributeDefinitions();
      res.status(200).json({
        success: true,
        data: definitions,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const definition = await attributesService.getAttributeDefinition(id);
      res.status(200).json({
        success: true,
        data: definition,
      });
    } catch (err) {
      next(err);
    }
  }

  async linkCategoryAttribute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetCategoryId, attributeDefinitionId, isRequired, displayOrder, defaultValue, validationRules } =
        req.body;

      if (!assetCategoryId || !attributeDefinitionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assetCategoryId and attributeDefinitionId are required.',
          },
        });
        return;
      }

      const link = await attributesService.linkCategoryAttribute({
        assetCategoryId,
        attributeDefinitionId,
        isRequired,
        displayOrder,
        defaultValue,
        validationRules,
      });

      res.status(201).json({
        success: true,
        message: 'Attribute linked to asset category successfully.',
        data: link,
      });
    } catch (err) {
      next(err);
    }
  }

  async listCategoryAttributes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = String(req.params.categoryId);
      const attributes = await attributesService.listCategoryAttributes(categoryId);
      res.status(200).json({
        success: true,
        data: attributes,
      });
    } catch (err) {
      next(err);
    }
  }

  async setAssetAttributeValues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = String(req.params.id);
      // Support body formats: { attributes: [...] } or direct array [...] or key-value map
      const payload = req.body.attributes !== undefined ? req.body.attributes : req.body;
      const updatedBy = req.user?.userId;

      const result = await attributesService.setAssetAttributeValues(assetId, payload, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Asset dynamic attribute values updated and verified successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAssetAttributeValues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = String(req.params.id);
      const result = await attributesService.getAssetAttributeValues(assetId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryFormSchema(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = String(req.params.categoryId || req.params.id);
      const schema = await attributesService.getCategoryFormSchema(categoryId);
      res.status(200).json({
        success: true,
        data: schema,
      });
    } catch (err) {
      next(err);
    }
  }

  async publishCategoryVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = String(req.params.categoryId || req.params.id);
      const { changeNotes } = req.body;
      const snapshot = await attributesService.publishCategoryConfigurationVersion(
        categoryId,
        changeNotes,
        req.user?.userId
      );
      res.status(201).json({
        success: true,
        message: `Category configuration version ${snapshot.version} published successfully.`,
        data: snapshot,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryVersionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = String(req.params.categoryId || req.params.id);
      const history = await attributesService.getCategoryVersionHistory(categoryId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryVersionSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = String(req.params.categoryId || req.params.id);
      const version = Number(req.params.version);
      const snapshot = await attributesService.getCategoryVersionSnapshot(categoryId, version);
      res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const attributesController = new AttributesController();
