import { Router } from 'express';
import { FinanceController } from '../controllers/financeController';
import { authenticate, requirePermission, enforceBranchScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/analytics', requirePermission('reports', 'dashboard'), enforceBranchScope, FinanceController.getAnalytics);

export default router;
