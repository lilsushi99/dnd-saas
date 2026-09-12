import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);

export default router;
