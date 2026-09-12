import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

const router = Router();
const controller = new AdminController();

// Branches routes
router.get('/branches', controller.getBranches);
router.post('/branches', controller.createBranch);
router.put('/branches/:id', controller.updateBranch);
router.patch('/branches/:id/toggle-status', controller.toggleBranchStatus);

// Facilities routes
router.get('/facilities', controller.getFacilities);
router.post('/facilities', controller.createFacility);
router.put('/facilities/:id', controller.updateFacility);
router.delete('/facilities/:id', controller.deleteFacility);

// Users & Roles routes
router.get('/users', controller.getUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.patch('/users/:id/toggle-status', controller.toggleUserStatus);
router.get('/roles', controller.getRolesPermissions);
router.put('/roles/:role', controller.updateRolePermissions);

// Import Wizard routes
router.post('/import/detect-columns', controller.detectColumns);
router.post('/import/validate', controller.validateImport);
router.post('/import/execute', controller.executeImport);

// Audit & Uploads routes
router.get('/audit-logs', controller.getAuditLogs);
router.post('/upload', controller.uploadFile);

export default router;
