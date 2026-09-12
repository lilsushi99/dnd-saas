import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';

const router = Router();

// Category Routes (Must be before /:id)
router.get('/categories', ExpenseController.getCategories);
router.post('/categories', ExpenseController.createCategory);
router.put('/categories/:id', ExpenseController.updateCategory);
router.delete('/categories/:id', ExpenseController.deleteCategory);

// Expense Routes
router.get('/', ExpenseController.getExpenses);
router.post('/', ExpenseController.createExpense);
router.get('/:id', ExpenseController.getExpenseById);
router.put('/:id', ExpenseController.updateExpense);

export default router;
