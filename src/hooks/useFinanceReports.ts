import { useState, useEffect, useCallback } from 'react';
import { FinanceReportFilters, FinanceAnalyticsSummary } from '../types';
import { FinanceApiService } from '../services/financeService';

export function useFinanceReports(initialBranch: string = 'all') {
  const [analytics, setAnalytics] = useState<FinanceAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [period, setPeriod] = useState<'today' | 'last_7_days' | 'this_month' | 'custom' | 'full_year'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branch, setBranch] = useState(initialBranch);

  useEffect(() => {
    setBranch(initialBranch);
  }, [initialBranch]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: FinanceReportFilters = {
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        branch,
      };
      const data = await FinanceApiService.fetchAnalytics(filters);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, branch]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    loading,
    error,
    period,
    setPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    branch,
    setBranch,
    refresh: loadAnalytics,
  };
}
