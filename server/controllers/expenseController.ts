import { Request, Response } from 'express';
import { ExpenseService } from '../services/expenseService';
import { ExpenseRepository } from '../repositories/expenseRepository';

const repo = new ExpenseRepository();
const service = new ExpenseService(repo);

export class ExpenseController {
  public static async getExpenses(req: Request, res: Response) {
    try {
      const { search, branch, dateFilter, startDate, endDate, month, category } = req.query;
      const result = await service.getExpenses({
        search: search as string,
        branch: branch as string,
        dateFilter: dateFilter as string,
        startDate: startDate as string,
        endDate: endDate as string,
        month: month as string,
        category: category as string,
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getExpenseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const expense = await service.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ success: false, error: 'Expense record not found' });
      }
      return res.json({ success: true, expense });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createExpense(req: Request, res: Response) {
    try {
      const newExpense = await service.createExpense(req.body);
      return res.status(201).json({ success: true, expense: newExpense });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async updateExpense(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await service.updateExpense(id, req.body);
      return res.json({ success: true, expense: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // --- CATEGORY ENDPOINTS ---
  public static async getCategories(req: Request, res: Response) {
    try {
      const categories = await service.getCategories();
      return res.json({ success: true, categories });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createCategory(req: Request, res: Response) {
    try {
      const category = await service.createCategory(req.body);
      return res.status(201).json({ success: true, category });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await service.updateCategory(id, req.body);
      return res.json({ success: true, category });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await service.deleteCategory(id);
      return res.json({ success });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
