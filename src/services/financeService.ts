import { apiRequest } from './http';
import { FinanceReportFilters, FinanceAnalyticsSummary } from '../types';

export class FinanceApiService {
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    return apiRequest<T>(url, options);
  }

  public static async fetchAnalytics(filters?: FinanceReportFilters): Promise<FinanceAnalyticsSummary> {
    const query = new URLSearchParams();
    if (filters?.period) query.set('period', filters.period);
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);
    if (filters?.customDates && filters.customDates.length > 0) {
      query.set('customDates', filters.customDates.join(','));
    }
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);

    const data = await this.request<{
      success: boolean;
      analytics: FinanceAnalyticsSummary;
    }>(`/api/finance/analytics?${query.toString()}`);

    return data.analytics;
  }

  public static async fetchDashboardExportData(filters?: FinanceReportFilters): Promise<any> {
    const query = new URLSearchParams();
    if (filters?.period) query.set('period', filters.period);
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);
    if (filters?.customDates && filters.customDates.length > 0) {
      query.set('customDates', filters.customDates.join(','));
    }
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);

    const res = await this.request<{
      success: boolean;
      data: any;
    }>(`/api/finance/dashboard-export?${query.toString()}`);

    return res.data;
  }

  public static async generateReportNarrative(payload: {
    periodLabel: string;
    branchName: string;
    analytics: any;
  }): Promise<{ narrative: string; isAiGenerated: boolean }> {
    const res = await this.request<{
      success: boolean;
      narrative: string;
      isAiGenerated: boolean;
    }>('/api/ai/report-narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { narrative: res.narrative, isAiGenerated: res.isAiGenerated };
  }
}
