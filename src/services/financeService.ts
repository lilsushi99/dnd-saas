import { FinanceReportFilters, FinanceAnalyticsSummary } from '../types';

export class FinanceApiService {
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  }

  public static async fetchAnalytics(filters?: FinanceReportFilters): Promise<FinanceAnalyticsSummary> {
    const query = new URLSearchParams();
    if (filters?.period) query.set('period', filters.period);
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);

    const data = await this.request<{
      success: boolean;
      analytics: FinanceAnalyticsSummary;
    }>(`/api/finance/analytics?${query.toString()}`);

    return data.analytics;
  }
}
