import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticateTenant } from '../../middleware/auth.middleware';

const router = Router();

// Protect all user routes with tenant authentication
router.use(authenticateTenant);

router.get('/', (req, res, next) => usersController.listUsers(req, res, next));
router.get('/:id', (req, res, next) => usersController.getUserById(req, res, next));
router.post('/', (req, res, next) => usersController.createUser(req, res, next));
router.patch('/:id', (req, res, next) => usersController.updateUser(req, res, next));
router.delete('/:id', (req, res, next) => usersController.deleteUser(req, res, next));

export default router;

