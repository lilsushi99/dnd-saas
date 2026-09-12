import { Router } from 'express';
import { OperationsController } from '../controllers/operationsController';

const router = Router();

router.get('/bookings', OperationsController.getBookings);
router.post('/bookings', OperationsController.createBooking);
router.put('/bookings/:id', OperationsController.updateBooking);
router.get('/facilities', OperationsController.getFacilityRecords);
router.get('/clients/search', OperationsController.searchClients);
router.get('/next-id', OperationsController.getNextBookingId);
router.get('/settings', OperationsController.getSettings);
router.put('/settings', OperationsController.updateSettings);
router.get('/profile', OperationsController.getProfileSettings);
router.put('/profile', OperationsController.updateProfileSettings);

export default router;
