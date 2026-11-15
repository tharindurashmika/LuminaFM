import { Router } from 'express';
import { assetsController } from './assets.controller';
import { hierarchyController } from './hierarchy.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Enforce multi-tenancy middleware on all asset & hierarchy endpoints
router.use(authenticateTenant);

// --- SITES ---
router.get('/sites', (req, res, next) => hierarchyController.listSites(req, res, next));
router.get('/sites/:id', (req, res, next) => hierarchyController.getSiteById(req, res, next));
router.post('/sites', (req, res, next) => hierarchyController.createSite(req, res, next));
router.patch('/sites/:id', (req, res, next) => hierarchyController.updateSite(req, res, next));
router.delete('/sites/:id', (req, res, next) => hierarchyController.deleteSite(req, res, next));

// --- LOCATIONS ---
router.get('/locations', (req, res, next) => hierarchyController.listLocations(req, res, next));
router.get('/locations/:id', (req, res, next) => hierarchyController.getLocationById(req, res, next));
router.post('/locations', (req, res, next) => hierarchyController.createLocation(req, res, next));
router.patch('/locations/:id', (req, res, next) => hierarchyController.updateLocation(req, res, next));
router.delete('/locations/:id', (req, res, next) => hierarchyController.deleteLocation(req, res, next));

// --- SYSTEMS ---
router.get('/systems', (req, res, next) => hierarchyController.listSystems(req, res, next));
router.get('/systems/:id', (req, res, next) => hierarchyController.getSystemById(req, res, next));
router.post('/systems', (req, res, next) => hierarchyController.createSystem(req, res, next));
router.patch('/systems/:id', (req, res, next) => hierarchyController.updateSystem(req, res, next));
router.delete('/systems/:id', (req, res, next) => hierarchyController.deleteSystem(req, res, next));

// --- ASSET CATEGORIES ---
router.get('/asset-categories', (req, res, next) => hierarchyController.listCategories(req, res, next));
router.get('/asset-categories/:id', (req, res, next) => hierarchyController.getCategoryById(req, res, next));
router.post('/asset-categories', (req, res, next) => hierarchyController.createCategory(req, res, next));
router.patch('/asset-categories/:id', (req, res, next) => hierarchyController.updateCategory(req, res, next));
router.delete('/asset-categories/:id', (req, res, next) => hierarchyController.deleteCategory(req, res, next));

// --- BRANDS & MODELS ---
router.get('/brands', (req, res, next) => hierarchyController.listBrands(req, res, next));
router.post('/brands', (req, res, next) => hierarchyController.createBrand(req, res, next));
router.get('/asset-models', (req, res, next) => hierarchyController.listAssetModels(req, res, next));
router.post('/asset-models', (req, res, next) => hierarchyController.createAssetModel(req, res, next));

// --- ASSETS (CORE REGISTRY) ---
router.get('/assets', (req, res, next) => assetsController.listAssets(req, res, next));
router.get('/assets/scan/:qrCode', (req, res, next) => assetsController.scanQrCode(req, res, next));
router.get('/assets/:id', (req, res, next) => assetsController.getAssetById(req, res, next));
router.post('/assets', (req, res, next) => assetsController.registerAsset(req, res, next));
router.patch('/assets/:id', (req, res, next) => assetsController.updateAsset(req, res, next));
router.delete('/assets/:id', (req, res, next) => assetsController.deleteAsset(req, res, next));

// --- ASSET STATUS, LIFECYCLE & QR IDENTIFICATION ---
router.patch('/assets/:id/status', (req, res, next) =>
  assetsController.updateAssetStatus(req, res, next)
);
router.post('/assets/:id/status', (req, res, next) =>
  assetsController.updateAssetStatus(req, res, next)
);
router.get('/assets/:id/history', (req, res, next) =>
  assetsController.getLifecycleHistory(req, res, next)
);
router.get('/assets/:id/lifecycle-history', (req, res, next) =>
  assetsController.getLifecycleHistory(req, res, next)
);
router.post('/assets/:id/qr-code', (req, res, next) =>
  assetsController.generateQrCode(req, res, next)
);
router.get('/assets/:id/qr-code', (req, res, next) =>
  assetsController.generateQrCode(req, res, next)
);

export default router;

