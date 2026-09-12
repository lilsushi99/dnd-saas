import { Expense, ExpenseFilters, ExpenseSummaryMetrics, ExpenseCategory } from '../types';

export class ExpenseApiService {
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || (!data.success && data.success !== undefined)) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  }

  public static async fetchExpenses(filters?: ExpenseFilters): Promise<{
    expenses: Expense[];
    summary: ExpenseSummaryMetrics;
  }> {
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);
    if (filters?.dateFilter) query.set('dateFilter', filters.dateFilter);
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);
    if (filters?.month && filters.month !== 'all') query.set('month', filters.month);
    if (filters?.category && filters.category !== 'all') query.set('category', filters.category);

    const data = await this.request<{
      success: boolean;
      expenses: Expense[];
      summary: ExpenseSummaryMetrics;
    }>(`/api/expenses?${query.toString()}`);

    return { expenses: data.expenses, summary: data.summary };
  }

  public static async createExpense(payload: {
    name: string;
    amount: number;
    date: string;
    branch: string;
    category: string;
    description?: string;
  }): Promise<Expense> {
    const data = await this.request<{
      success: boolean;
      expense: Expense;
    }>('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return data.expense;
  }

  public static async updateExpense(
    id: string,
    payload: {
      name?: string;
      amount?: number;
      date?: string;
      branch?: string;
      category?: string;
      description?: string;
    }
  ): Promise<Expense> {
    const data = await this.request<{
      success: boolean;
      expense: Expense;
    }>(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return data.expense;
  }

  // --- CATEGORY API SERVICES ---
  public static async fetchCategories(): Promise<ExpenseCategory[]> {
    const data = await this.request<{
      success: boolean;
      categories: ExpenseCategory[];
    }>('/api/expenses/categories');

    return data.categories || [];
  }

  public static async createCategory(payload: {
    name: string;
    description?: string;
  }): Promise<ExpenseCategory> {
    const data = await this.request<{
      success: boolean;
      category: ExpenseCategory;
    }>('/api/expenses/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return data.category;
  }

  public static async updateCategory(
    id: string,
    payload: Partial<ExpenseCategory>
  ): Promise<ExpenseCategory> {
    const data = await this.request<{
      success: boolean;
      category: ExpenseCategory;
    }>(`/api/expenses/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return data.category;
  }

  public static async deleteCategory(id: string): Promise<boolean> {
    const data = await this.request<{
      success: boolean;
    }>(`/api/expenses/categories/${id}`, {
      method: 'DELETE',
    });

    return data.success;
  }
}
