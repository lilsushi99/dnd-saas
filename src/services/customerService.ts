import { Customer, ActiveSubscription, CustomerFilters, SubscriptionFilters } from '../types';
import { ApiClient } from './apiClient';

export class CustomerApiService {
  public static async fetchCustomers(filters?: CustomerFilters): Promise<{
    customers: Customer[];
    summary: {
      totalCustomers: number;
      totalRevenue: number;
      activeSubscriptionsCount: number;
      expiringSoonCount: number;
      expiredSubscriptionsCount?: number;
    };
  }> {
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.branch && filters.branch !== 'all') query.set('branch', filters.branch);
    if (filters?.dateRange && filters.dateRange !== 'all') query.set('dateRange', filters.dateRange);
    if (filters?.sort) query.set('sort', filters.sort);
    if (filters?.status && filters.status !== 'all') query.set('status', filters.status);

    const data = await ApiClient.request<{
      success: boolean;
      customers: Customer[];
      summary: {
        totalCustomers: number;
        totalRevenue: number;
        activeSubscriptionsCount: number;
        expiringSoonCount: number;
        expiredSubscriptionsCount?: number;
      };
    }>(`/api/customers?${query.toString()}`);

    return { customers: data.customers, summary: data.summary };
  }

  public static async fetchCustomerById(id: string): Promise<Customer> {
    const data = await ApiClient.request<{ success: boolean; customer: Customer }>(
      `/api/customers/${encodeURIComponent(id)}`
    );
    return data.customer;
  }

  public static async createCustomer(customerData: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    status?: string;
  }): Promise<Customer> {
    const data = await ApiClient.request<{ success: boolean; customer: Customer }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return data.customer;
  }

  public static async updateCustomer(
    id: string,
    updates: {
      name?: string;
      phone?: string;
      email?: string;
      company?: string;
      status?: string;
    }
  ): Promise<Customer> {
    const data = await ApiClient.request<{ success: boolean; customer: Customer }>(
      `/api/customers/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return data.customer;
  }

  public static async deleteCustomer(id: string): Promise<boolean> {
    const data = await ApiClient.request<{ success: boolean }>(
      `/api/customers/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    );
    return data.success;
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

    const data = await ApiClient.request<{ success: boolean; subscriptions: ActiveSubscription[] }>(
      `/api/customers/subscriptions/active?${query.toString()}`
    );
    return data.subscriptions;
  }

  // Prepared future communication API endpoints (stubs)
  public static async sendWhatsAppMessage(customerId: string, message: string) {
    return ApiClient.request(`/api/customers/${customerId}/whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  public static async sendEmailCampaign(customerId: string, subject: string, body: string) {
    return ApiClient.request(`/api/customers/${customerId}/email`, {
      method: 'POST',
      body: JSON.stringify({ subject, body }),
    });
  }
}
