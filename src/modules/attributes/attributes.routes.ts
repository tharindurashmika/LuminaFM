import { Router } from 'express';
import { attributesController } from './attributes.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Protect all dynamic attribute routes with tenant authentication
router.use(authenticateTenant);

// --- ATTRIBUTE DEFINITIONS ---
router.post('/attributes/definitions', (req, res, next) =>
  attributesController.createDefinition(req, res, next)
);
router.get('/attributes/definitions', (req, res, next) =>
  attributesController.listDefinitions(req, res, next)
);
router.get('/attributes/definitions/:id', (req, res, next) =>
  attributesController.getDefinition(req, res, next)
);

// --- CATEGORY ATTRIBUTE MAPPINGS ---
router.post('/attributes/category-link', (req, res, next) =>
  attributesController.linkCategoryAttribute(req, res, next)
);
router.get('/attributes/categories/:categoryId', (req, res, next) =>
  attributesController.listCategoryAttributes(req, res, next)
);

// --- DYNAMIC FORM SCHEMA & VERSIONED CONFIGURATION METADATA ---
router.get('/attributes/categories/:categoryId/form-schema', (req, res, next) =>
  attributesController.getCategoryFormSchema(req, res, next)
);
router.get('/attributes/form-schema/:categoryId', (req, res, next) =>
  attributesController.getCategoryFormSchema(req, res, next)
);
router.post('/attributes/categories/:categoryId/versions', (req, res, next) =>
  attributesController.publishCategoryVersion(req, res, next)
);
router.get('/attributes/categories/:categoryId/versions', (req, res, next) =>
  attributesController.getCategoryVersionHistory(req, res, next)
);
router.get('/attributes/categories/:categoryId/versions/:version', (req, res, next) =>
  attributesController.getCategoryVersionSnapshot(req, res, next)
);

// --- ASSET ATTRIBUTE VALUES (PER ASSET ID) ---
router.post('/assets/:id/attributes', (req, res, next) =>
  attributesController.setAssetAttributeValues(req, res, next)
);
router.put('/assets/:id/attributes', (req, res, next) =>
  attributesController.setAssetAttributeValues(req, res, next)
);
router.get('/assets/:id/attributes', (req, res, next) =>
  attributesController.getAssetAttributeValues(req, res, next)
);

export default router;

