import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticate, requirePermission, enforceBranchScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Reads: CRM directory, daily logger, or dashboard
const canReadCustomers = requirePermission('crm', 'dailyLogger', 'dashboard');
const canManageCustomers = requirePermission('crm');

router.get('/', canReadCustomers, enforceBranchScope, CustomerController.getCustomers);
router.post('/', requirePermission('crm', 'dailyLogger'), enforceBranchScope, CustomerController.createCustomer);
router.get('/subscriptions/active', canReadCustomers, enforceBranchScope, CustomerController.getActiveSubscriptions);
router.get('/:id', canReadCustomers, enforceBranchScope, CustomerController.getCustomerById);
router.put('/:id', requirePermission('crm', 'dailyLogger'), enforceBranchScope, CustomerController.updateCustomer);
router.delete('/:id', canManageCustomers, enforceBranchScope, CustomerController.deleteCustomer);

// Prepared future communication API endpoints (stubs)
router.post('/:id/whatsapp', canManageCustomers, enforceBranchScope, CustomerController.sendWhatsApp);
router.post('/:id/email', canManageCustomers, enforceBranchScope, CustomerController.sendEmail);
router.post('/:id/notifications', canManageCustomers, enforceBranchScope, CustomerController.sendNotification);

export default router;
