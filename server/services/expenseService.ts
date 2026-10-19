import { notFound } from '../domain/errors';
import { ExpenseRepository } from '../repositories/expenseRepository';
import { Expense, ExpenseFilters, ExpenseSummaryMetrics, ExpenseCategory } from '../../src/types';

export class ExpenseService {
  constructor(private repository: ExpenseRepository) {}

  public async getExpenses(filters?: ExpenseFilters): Promise<{
    expenses: Expense[];
    summary: ExpenseSummaryMetrics;
  }> {
    const expenses = await this.repository.getAllExpenses(filters);
    const summary = await this.repository.getSummaryMetrics(filters);

    return {
      expenses,
      summary,
    };
  }

  public async getExpenseById(id: string): Promise<Expense | null> {
    return await this.repository.getExpenseById(id);
  }

  public async createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'createdBy' | 'status'> & { createdBy?: string }): Promise<Expense> {
    if (!data.name || !data.amount || !data.date || !data.branch) {
      throw new Error('Expense Name, Amount, Date, and Branch are required fields.');
    }
    const created = await this.repository.createExpense(data);
    try {
      const { executeQuery } = await import('../database/db');
      await executeQuery(
        `INSERT INTO system_notifications (title, message, type, is_read, created_at) VALUES (?, ?, 'info', 0, NOW())`,
        ['Expense Recorded', `Expense of ₦${Number(created.amount || 0).toLocaleString()} recorded for ${created.name}.`]
      );
    } catch {
      // Non-fatal
    }
    return created;
  }

  public async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const updated = await this.repository.updateExpense(id, updates);
    if (!updated) {
      throw new Error('Expense record not found.');
    }
    return updated;
  }

  public async deleteExpense(id: string): Promise<boolean> {
    return await this.repository.deleteExpense(id);
  }

  // Category Service Methods
  public async getCategories(): Promise<ExpenseCategory[]> {
    return await this.repository.getCategories();
  }

  public async createCategory(data: { name: string; description?: string; color?: string; status?: 'Active' | 'Inactive' }, actor = 'System'): Promise<ExpenseCategory> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Category name is required.');
    }
    return await this.repository.createCategory(data, actor);
  }

  public async updateCategory(id: string, updates: Partial<ExpenseCategory>, actor = 'System'): Promise<ExpenseCategory> {
    const updated = await this.repository.updateCategory(id, updates, actor);
    if (!updated) {
      throw notFound('Category record not found.');
    }
    return updated;
  }

  public async deleteCategory(id: string, actor = 'System'): Promise<boolean> {
    const ok = await this.repository.deleteCategory(id, actor);
    if (!ok) throw notFound('Category record not found.');
    return ok;
  }
}
