import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';

const router = Router();

router.get('/', CustomerController.getCustomers);
router.get('/subscriptions/active', CustomerController.getActiveSubscriptions);
router.get('/:id', CustomerController.getCustomerById);

// Prepared future communication API endpoints (stubs)
router.post('/:id/whatsapp', CustomerController.sendWhatsApp);
router.post('/:id/email', CustomerController.sendEmail);
router.post('/:id/notifications', CustomerController.sendNotification);

export default router;
