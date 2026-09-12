import { Router } from 'express';
import { FinanceController } from '../controllers/financeController';

const router = Router();

router.get('/analytics', FinanceController.getAnalytics);

export default router;
