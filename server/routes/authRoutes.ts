import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authController.logout);

export default router;
