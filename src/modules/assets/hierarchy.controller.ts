import { Request, Response, NextFunction } from 'express';
import { sitesService } from './sites.service';
import { locationsService } from './locations.service';
import { systemsService } from './systems.service';
import { assetCategoriesService } from './categories.service';
import { brandsModelsService } from './brands-models.service';

export class HierarchyController {
  // SITES
  async listSites(_req: Request, res: Response, next: NextFunction) {
    try {
      const sites = await sitesService.listSites();
      res.status(200).json({ success: true, data: sites });
    } catch (err) {
      next(err);
    }
  }

  async getSiteById(req: Request, res: Response, next: NextFunction) {
    try {
      const site = await sitesService.getSiteById(String(req.params.id));
      res.status(200).json({ success: true, data: site });
    } catch (err) {
      next(err);
    }
  }

  async createSite(req: Request, res: Response, next: NextFunction) {
    try {
      const site = await sitesService.createSite(req.body);
      res.status(201).json({ success: true, data: site });
    } catch (err) {
      next(err);
    }
  }

  async updateSite(req: Request, res: Response, next: NextFunction) {
    try {
      const site = await sitesService.updateSite(String(req.params.id), req.body);
      res.status(200).json({ success: true, data: site });
    } catch (err) {
      next(err);
    }
  }

  async deleteSite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await sitesService.deleteSite(String(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // LOCATIONS
  async listLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId } = req.query;
      const locations = await locationsService.listLocations(siteId as string | undefined);
      res.status(200).json({ success: true, data: locations });
    } catch (err) {
      next(err);
    }
  }

  async getLocationById(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await locationsService.getLocationById(String(req.params.id));
      res.status(200).json({ success: true, data: location });
    } catch (err) {
      next(err);
    }
  }

  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await locationsService.createLocation(req.body);
      res.status(201).json({ success: true, data: location });
    } catch (err) {
      next(err);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await locationsService.updateLocation(String(req.params.id), req.body);
      res.status(200).json({ success: true, data: location });
    } catch (err) {
      next(err);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await locationsService.deleteLocation(String(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // SYSTEMS
  async listSystems(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId } = req.query;
      const systems = await systemsService.listSystems(siteId as string | undefined);
      res.status(200).json({ success: true, data: systems });
    } catch (err) {
      next(err);
    }
  }

  async getSystemById(req: Request, res: Response, next: NextFunction) {
    try {
      const system = await systemsService.getSystemById(String(req.params.id));
      res.status(200).json({ success: true, data: system });
    } catch (err) {
      next(err);
    }
  }

  async createSystem(req: Request, res: Response, next: NextFunction) {
    try {
      const system = await systemsService.createSystem(req.body);
      res.status(201).json({ success: true, data: system });
    } catch (err) {
      next(err);
    }
  }

  async updateSystem(req: Request, res: Response, next: NextFunction) {
    try {
      const system = await systemsService.updateSystem(String(req.params.id), req.body);
      res.status(200).json({ success: true, data: system });
    } catch (err) {
      next(err);
    }
  }

  async deleteSystem(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemsService.deleteSystem(String(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // CATEGORIES
  async listCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await assetCategoriesService.listCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await assetCategoriesService.getCategoryById(String(req.params.id));
      res.status(200).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await assetCategoriesService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await assetCategoriesService.updateCategory(String(req.params.id), req.body);
      res.status(200).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assetCategoriesService.deleteCategory(String(req.params.id));
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // BRANDS & MODELS
  async listBrands(_req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await brandsModelsService.listBrands();
      res.status(200).json({ success: true, data: brands });
    } catch (err) {
      next(err);
    }
  }

  async createBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await brandsModelsService.createBrand(req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (err) {
      next(err);
    }
  }

  async listAssetModels(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, brandId } = req.query;
      const models = await brandsModelsService.listAssetModels(categoryId as string, brandId as string);
      res.status(200).json({ success: true, data: models });
    } catch (err) {
      next(err);
    }
  }

  async createAssetModel(req: Request, res: Response, next: NextFunction) {
    try {
      const model = await brandsModelsService.createAssetModel(req.body);
      res.status(201).json({ success: true, data: model });
    } catch (err) {
      next(err);
    }
  }
}

export const hierarchyController = new HierarchyController();

