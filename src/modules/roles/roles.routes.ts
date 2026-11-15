import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Protect all role routes with tenant authentication
router.use(authenticateTenant);

router.get('/permissions/catalog', (req, res, next) =>
  rolesController.listPermissionsCatalog(req, res, next)
);
router.get('/', (req, res, next) => rolesController.listRoles(req, res, next));
router.get('/:id', (req, res, next) => rolesController.getRoleById(req, res, next));
router.post('/', (req, res, next) => rolesController.createRole(req, res, next));
router.patch('/:id', (req, res, next) => rolesController.updateRole(req, res, next));
router.delete('/:id', (req, res, next) => rolesController.deleteRole(req, res, next));

export default router;

