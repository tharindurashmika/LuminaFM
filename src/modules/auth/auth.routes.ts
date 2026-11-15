import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// =============================================================================
// 1. PUBLIC AUTHENTICATION & RECOVERY ROUTES
// =============================================================================
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/refresh-token', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));
router.post('/accept-invite', (req, res, next) => authController.acceptInvite(req, res, next));

// =============================================================================
// 2. AUTHENTICATED USER & ORGANIZATION SWITCHING ROUTES
// =============================================================================
router.get('/me', authenticateTenant, (req, res, next) =>
  authController.getMe(req, res, next)
);

router.get('/organizations', authenticateTenant, (req, res, next) =>
  authController.getOrganizations(req, res, next)
);

router.post('/switch-organization', authenticateTenant, (req, res, next) =>
  authController.switchOrganization(req, res, next)
);

router.post(
  '/invite',
  authenticateTenant,
  requirePermission(['users:invite', 'users:create', 'admin:manage']),
  (req, res, next) => authController.inviteUser(req, res, next)
);

export default router;
