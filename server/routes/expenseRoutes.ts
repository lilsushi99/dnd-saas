import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authenticate, requirePermission, enforceBranchScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const canReadExpenses = requirePermission('expenses', 'dashboard', 'reports');

// Category Routes (Must be before /:id)
router.get('/categories', requirePermission('expenses', 'dashboard', 'reports', 'administration'), ExpenseController.getCategories);
router.post('/categories', requirePermission('administration'), ExpenseController.createCategory);
router.put('/categories/:id', requirePermission('administration'), ExpenseController.updateCategory);
router.delete('/categories/:id', requirePermission('administration'), ExpenseController.deleteCategory);

// Expense Routes
router.get('/', canReadExpenses, enforceBranchScope, ExpenseController.getExpenses);
router.post('/', requirePermission('expenses'), enforceBranchScope, ExpenseController.createExpense);
router.get('/:id', canReadExpenses, ExpenseController.getExpenseById);
router.put('/:id', requirePermission('expenses'), enforceBranchScope, ExpenseController.updateExpense);

export default router;
