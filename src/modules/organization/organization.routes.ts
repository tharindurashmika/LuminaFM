import { Router } from 'express';
import { organizationController } from './organization.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';
import { uploadLogo } from '../../middleware/upload.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// =============================================================================
// PUBLIC WHITE-LABEL & FALLBACK BRANDING ROUTES (No Auth Required)
// =============================================================================
router.get('/branding', (req, res, next) =>
  organizationController.getPublicBranding(req, res, next)
);
router.get('/branding/:code', (req, res, next) =>
  organizationController.getPublicBranding(req, res, next)
);

// =============================================================================
// AUTHENTICATED TENANT SETTINGS & LOGO MANAGEMENT
// =============================================================================
router.get('/settings', authenticateTenant, (req, res, next) =>
  organizationController.getSettings(req, res, next)
);

router.patch(
  '/settings',
  authenticateTenant,
  requirePermission(['organization:manage', 'organization:update', 'admin:manage']),
  uploadLogo.single('logo'),
  (req, res, next) => organizationController.updateSettings(req, res, next)
);

router.post(
  '/logo',
  authenticateTenant,
  requirePermission(['organization:manage', 'organization:update', 'admin:manage']),
  uploadLogo.single('logo'),
  (req, res, next) => organizationController.uploadLogo(req, res, next)
);

router.delete(
  '/logo',
  authenticateTenant,
  requirePermission(['organization:manage', 'organization:update', 'admin:manage']),
  (req, res, next) => organizationController.deleteLogo(req, res, next)
);

export default router;
