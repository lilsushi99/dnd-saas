import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, requirePermission, requireRole } from '../middleware/auth';
import { guardRoleAssignment } from '../middleware/roleGuard';

const router = Router();
const controller = new AdminController();
router.use(authenticate);

const admin = requirePermission('administration');
// Branch/facility lists feed selectors across modules, so any signed-in module user may read them.
const canReadMasterData = requirePermission('administration', 'dashboard', 'dailyLogger', 'facilityRecords', 'crm', 'expenses', 'reports', 'settings');

// Branches routes
router.get('/branches', canReadMasterData, controller.getBranches);
router.post('/branches', admin, controller.createBranch);
router.put('/branches/:id', admin, controller.updateBranch);
router.patch('/branches/:id/toggle-status', admin, controller.toggleBranchStatus);
router.delete('/branches/:id', admin, controller.deleteBranch);

// Facilities routes
router.get('/facilities', canReadMasterData, controller.getFacilities);
router.post('/facilities', admin, controller.createFacility);
router.put('/facilities/:id', admin, controller.updateFacility);
router.delete('/facilities/:id', admin, controller.deleteFacility);

// Users & Roles routes
router.get('/users', admin, controller.getUsers);
router.post('/users', admin, guardRoleAssignment, controller.createUser);
router.put('/users/:id', admin, guardRoleAssignment, controller.updateUser);
router.patch('/users/:id/toggle-status', admin, guardRoleAssignment, controller.toggleUserStatus);
router.get('/roles', admin, controller.getRolesPermissions);
// Editing the permission matrix is Director-only: it can grant any permission to any role.
router.put('/roles/:role', requireRole('Director'), controller.updateRolePermissions);

// Import Wizard routes
router.post('/import/detect-columns', admin, controller.detectColumns);
router.post('/import/validate', admin, controller.validateImport);
router.post('/import/execute', admin, controller.executeImport);

// Audit & Uploads routes
router.get('/audit-logs', admin, controller.getAuditLogs);
router.post('/upload', controller.uploadFile);

export default router;
