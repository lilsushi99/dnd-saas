import { Customer, ActiveSubscription, CustomerFilters, SubscriptionFilters } from '../types';

export class CustomerApiService {
  private static async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  }

  public static async fetchCustomers(filters?: CustomerFilters): Promise<{
    customers: Customer[];
    summary: {
      totalCustomers: number;
      totalRevenue: number;
      activeSubscriptionsCount: number;
      expiringSoonCount: number;
    };
  }> {
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);
    if (filters?.dateRange && filters.dateRange !== 'all') query.set('dateRange', filters.dateRange);
    if (filters?.sort) query.set('sort', filters.sort);
    if (filters?.status && filters.status !== 'all') query.set('status', filters.status);

    const data = await this.request<{
      success: boolean;
      customers: Customer[];
      summary: {
        totalCustomers: number;
        totalRevenue: number;
        activeSubscriptionsCount: number;
        expiringSoonCount: number;
      };
    }>(`/api/customers?${query.toString()}`);

    return { customers: data.customers, summary: data.summary };
  }

  public static async fetchCustomerById(id: string): Promise<Customer> {
    const data = await this.request<{ success: boolean; customer: Customer }>(
      `/api/customers/${encodeURIComponent(id)}`
    );
    return data.customer;
  }

  public static async fetchActiveSubscriptions(
    filters?: SubscriptionFilters
  ): Promise<ActiveSubscription[]> {
    const query = new URLSearchParams();
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);
    if (filters?.facility && filters.facility !== 'all') query.set('facility', filters.facility);
    if (filters?.daysRemaining && filters.daysRemaining !== 'all') query.set('daysRemaining', filters.daysRemaining);
    if (filters?.date) query.set('date', filters.date);
    if (filters?.search) query.set('search', filters.search);

    const data = await this.request<{ success: boolean; subscriptions: ActiveSubscription[] }>(
      `/api/customers/subscriptions/active?${query.toString()}`
    );
    return data.subscriptions;
  }

  // Prepared future communication API endpoints (stubs)
  public static async sendWhatsAppMessage(customerId: string, message: string) {
    return this.request(`/api/customers/${customerId}/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  }

  public static async sendEmailCampaign(customerId: string, subject: string, body: string) {
    return this.request(`/api/customers/${customerId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
  }
}
