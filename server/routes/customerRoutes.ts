import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticate, requirePermission, enforceBranchScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const canReadCustomers = requirePermission('crm', 'dashboard');

router.get('/', canReadCustomers, enforceBranchScope, CustomerController.getCustomers);
router.get('/subscriptions/active', requirePermission('crm'), enforceBranchScope, CustomerController.getActiveSubscriptions);
router.get('/:id', requirePermission('crm'), CustomerController.getCustomerById);

// Prepared future communication API endpoints (stubs)
router.post('/:id/whatsapp', requirePermission('crm'), CustomerController.sendWhatsApp);
router.post('/:id/email', requirePermission('crm'), CustomerController.sendEmail);
router.post('/:id/notifications', requirePermission('crm'), CustomerController.sendNotification);

export default router;
