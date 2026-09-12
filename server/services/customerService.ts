import { CustomerRepository } from '../repositories/customerRepository';
import { Customer, ActiveSubscription, CustomerFilters, SubscriptionFilters } from '../../src/types';

export class CustomerService {
  constructor(private repository: CustomerRepository) {}

  public async getCustomers(filters?: CustomerFilters): Promise<{
    customers: Customer[];
    summary: {
      totalCustomers: number;
      totalRevenue: number;
      activeSubscriptionsCount: number;
      expiringSoonCount: number;
      expiredSubscriptionsCount: number;
    };
  }> {
    const customers = await this.repository.getAllCustomers(filters);
    const allCustomers = await this.repository.getAllCustomers({});

    const totalCustomers = allCustomers.length;
    const totalRevenue = allCustomers.reduce((sum, c) => sum + c.lifetimeRevenue, 0);
    const activeSubscriptionsCount = allCustomers.filter(
      (c) => c.activeSubscription && c.activeSubscription.status === 'Active'
    ).length;
    const expiringSoonCount = allCustomers.filter(
      (c) => c.activeSubscription && c.activeSubscription.status === 'Expiring Soon'
    ).length;
    const expiredSubscriptionsCount = allCustomers.filter(
      (c) => c.status === 'Expired' || (c.activeSubscription && c.activeSubscription.status === 'Expired')
    ).length;

    return {
      customers,
      summary: {
        totalCustomers,
        totalRevenue,
        activeSubscriptionsCount,
        expiringSoonCount,
        expiredSubscriptionsCount,
      },
    };
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    return await this.repository.getCustomerById(id);
  }

  public async getActiveSubscriptions(filters?: SubscriptionFilters): Promise<ActiveSubscription[]> {
    return await this.repository.getActiveSubscriptions(filters);
  }

  public async sendWhatsAppMessage(customerId: string, message: string) {
    return {
      status: 'queued',
      channel: 'WhatsApp',
      customerId,
      message,
      deliveredAt: null,
      note: 'Messaging channel coming soon.',
    };
  }

  public async sendEmailCampaign(customerId: string, subject: string, body: string) {
    return {
      status: 'queued',
      channel: 'Email',
      customerId,
      subject,
      body,
      sentAt: null,
      note: 'Email campaign engine coming soon.',
    };
  }

  public async sendNotification(customerId: string, payload: any) {
    return {
      status: 'queued',
      channel: 'PushNotification',
      customerId,
      payload,
      sentAt: null,
      note: 'Notification system coming soon.',
    };
  }
}
