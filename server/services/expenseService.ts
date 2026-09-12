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
    return await this.repository.createExpense(data);
  }

  public async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const updated = await this.repository.updateExpense(id, updates);
    if (!updated) {
      throw new Error('Expense record not found.');
    }
    return updated;
  }

  // Category Service Methods
  public async getCategories(): Promise<ExpenseCategory[]> {
    return await this.repository.getCategories();
  }

  public async createCategory(data: { name: string; description?: string }): Promise<ExpenseCategory> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Category name is required.');
    }
    return await this.repository.createCategory(data);
  }

  public async updateCategory(id: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const updated = await this.repository.updateCategory(id, updates);
    if (!updated) {
      throw new Error('Category record not found.');
    }
    return updated;
  }

  public async deleteCategory(id: string): Promise<boolean> {
    return await this.repository.deleteCategory(id);
  }
}
