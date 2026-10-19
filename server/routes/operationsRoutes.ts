import { Router } from 'express';
import { OperationsController } from '../controllers/operationsController';
import { authenticate, requirePermission, enforceBranchScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Reads are shared by several modules; writes belong to the Daily Logger.
const canReadBookings = requirePermission('dailyLogger', 'dashboard', 'crm', 'reports', 'facilityRecords');

router.get('/bookings', canReadBookings, enforceBranchScope, OperationsController.getBookings);
router.post('/bookings', requirePermission('dailyLogger'), enforceBranchScope, OperationsController.createBooking);
router.put('/bookings/:id', requirePermission('dailyLogger'), enforceBranchScope, OperationsController.updateBooking);
router.get('/facilities', requirePermission('facilityRecords', 'dashboard', 'dailyLogger'), enforceBranchScope, OperationsController.getFacilityRecords);
router.get('/clients/search', requirePermission('dailyLogger', 'crm'), OperationsController.searchClients);
router.get('/next-id', requirePermission('dailyLogger'), OperationsController.getNextBookingId);

// Business identity is displayed app-wide (any signed-in user may read it); only `settings` holders may change it.
router.get('/settings', OperationsController.getSettings);
router.put('/settings', requirePermission('settings'), OperationsController.updateSettings);
router.get('/profile', OperationsController.getProfileSettings);
router.put('/profile', OperationsController.updateProfileSettings);

// Activity Notifications
router.get('/notifications', OperationsController.getNotifications);
router.patch('/notifications/read-all', OperationsController.markAllNotificationsRead);
router.patch('/notifications/:id/read', OperationsController.markNotificationRead);

export default router;
