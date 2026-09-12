import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseFilters, ExpenseSummaryMetrics, ExpenseCategory } from '../types';
import { ExpenseApiService } from '../services/expenseService';

export function useExpenses(initialBranch: string = 'all') {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryMetrics>({
    todaysExpenses: 0,
    averageMonthlyExpenses: 0,
    totalExpenses: 0,
    payrollExpenses: 0,
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState(initialBranch);
  const [dateFilter, setDateFilter] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [category, setCategory] = useState('all');

  // Sync branch if parent filter changes
  useEffect(() => {
    setBranch(initialBranch);
  }, [initialBranch]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await ExpenseApiService.fetchCategories();
      setCategories(cats);
    } catch (err: any) {
      console.error('Failed to load expense categories', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ExpenseFilters = {
        search,
        branch,
        dateFilter,
        startDate: dateFilter === 'custom' ? startDate : undefined,
        endDate: dateFilter === 'custom' ? endDate : undefined,
        category,
      };
      const data = await ExpenseApiService.fetchExpenses(filters);
      setExpenses(data.expenses);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [search, branch, dateFilter, startDate, endDate, category]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const addExpense = async (payload: {
    name: string;
    amount: number;
    date: string;
    branch: string;
    category: string;
    description?: string;
  }) => {
    try {
      const created = await ExpenseApiService.createExpense(payload);
      await loadExpenses();
      return created;
    } catch (err: any) {
      throw err;
    }
  };

  const editExpense = async (
    id: string,
    payload: {
      name?: string;
      amount?: number;
      date?: string;
      branch?: string;
      category?: string;
      description?: string;
    }
  ) => {
    try {
      const updated = await ExpenseApiService.updateExpense(id, payload);
      await loadExpenses();
      return updated;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    expenses,
    summary,
    categories,
    loading,
    error,
    search,
    setSearch,
    branch,
    setBranch,
    dateFilter,
    setDateFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    category,
    setCategory,
    addExpense,
    editExpense,
    refresh: loadExpenses,
    refreshCategories: loadCategories,
  };
}
