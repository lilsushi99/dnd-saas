import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authenticate, requirePermission, enforceBranchScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Category Routes (Must be before /:id)
// Reading categories is allowed for any module that reads financial master data
const canReadCategories = requirePermission('administration', 'expenses', 'reports', 'dashboard');
// Managing categories is an administration action
const canManageCategories = requirePermission('administration');

router.get('/categories', canReadCategories, ExpenseController.getCategories);
router.post('/categories', canManageCategories, ExpenseController.createCategory);
router.put('/categories/:id', canManageCategories, ExpenseController.updateCategory);
router.delete('/categories/:id', canManageCategories, ExpenseController.deleteCategory);

// Expense Routes
const canReadExpenses = requirePermission('expenses', 'reports', 'dashboard');
const canManageExpenses = requirePermission('expenses');

router.get('/', canReadExpenses, enforceBranchScope, ExpenseController.getExpenses);
router.post('/', canManageExpenses, enforceBranchScope, ExpenseController.createExpense);
router.get('/:id', canReadExpenses, enforceBranchScope, ExpenseController.getExpenseById);
router.put('/:id', canManageExpenses, enforceBranchScope, ExpenseController.updateExpense);
router.delete('/:id', canManageExpenses, enforceBranchScope, ExpenseController.deleteExpense);

export default router;
