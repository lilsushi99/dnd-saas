import { Customer, ActiveSubscription, CustomerFilters, SubscriptionFilters, Booking } from '../../src/types';
import { executeQuery } from '../database/db';
import { auditRepository } from './auditRepository';

export class CustomerRepository {
  public async getAllCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    try {
      // Fetch clients and bookings from database
      const clientRows = await executeQuery<any>(`SELECT id, name, phone, email, company FROM clients`);
      const bookingRows = await executeQuery<any>(
        `SELECT id, date, client_id as clientId, client_name as clientName, phone, email, branch, facility, days_count as daysCount, time_duration as timeDuration, amount, payment_method as paymentMethod, days_used as daysUsed, days_left as daysLeft, status FROM bookings ORDER BY date DESC`
      );

      const customerMap = new Map<string, {
        id: string;
        name: string;
        phone: string;
        email?: string;
        company?: string;
        bookings: Booking[];
      }>();

      for (const c of clientRows) {
        customerMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          company: c.company || '',
          bookings: [],
        });
      }

      for (const b of bookingRows) {
        const formattedBooking: Booking = {
          id: b.id,
          date: b.date ? String(b.date).substring(0, 10) : new Date().toISOString().substring(0, 10),
          clientId: b.clientId,
          clientName: b.clientName,
          phone: b.phone || '',
          email: b.email || '',
          branch: b.branch,
          facility: b.facility,
          daysCount: Number(b.daysCount || 1),
          timeDuration: b.timeDuration || '09:00 AM - 05:00 PM',
          amount: Number(b.amount || 0),
          paymentMethod: b.paymentMethod || 'Cash',
          daysUsed: Number(b.daysUsed || 0),
          daysLeft: Number(b.daysLeft || 0),
          status: b.status || 'Active',
        };

        const cId = formattedBooking.clientId || `CL-TEMP-${formattedBooking.clientName.replace(/\s+/g, '')}`;
        if (!customerMap.has(cId)) {
          customerMap.set(cId, {
            id: cId,
            name: formattedBooking.clientName,
            phone: formattedBooking.phone,
            email: formattedBooking.email,
            bookings: [],
          });
        }
        const existing = customerMap.get(cId)!;
        existing.bookings.push(formattedBooking);
        if (formattedBooking.phone && !existing.phone) existing.phone = formattedBooking.phone;
        if (formattedBooking.email && !existing.email) existing.email = formattedBooking.email;
      }

      let customersList: Customer[] = Array.from(customerMap.values()).map((c) => {
        const sortedBookings = [...c.bookings].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const branchHistory = Array.from(new Set(c.bookings.map((b) => b.branch)));
        const visitedFacilities = Array.from(new Set(c.bookings.map((b) => b.facility)));
        const totalVisits = c.bookings.length;
        const lifetimeRevenue = c.bookings.reduce((sum, b) => sum + b.amount, 0);
        const latestVisit = sortedBookings[0] ? sortedBookings[0].date : 'N/A';

        const activeBooking = c.bookings.find(
          (b) => b.status === 'Active' || b.status === 'Upcoming'
        );

        let activeSub: ActiveSubscription | undefined = undefined;
        let customerStatus: Customer['status'] = 'Inactive';

        if (activeBooking) {
          const daysRemaining = activeBooking.daysLeft;
          const subStatus: ActiveSubscription['status'] =
            daysRemaining <= 0
              ? 'Expired'
              : daysRemaining <= 5
              ? 'Expiring Soon'
              : 'Active';

          activeSub = {
            id: `SUB-${activeBooking.id}`,
            bookingId: activeBooking.id,
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            email: c.email,
            facility: activeBooking.facility,
            branch: activeBooking.branch,
            startDate: activeBooking.date,
            endDate: new Date(
              new Date(activeBooking.date).getTime() +
                activeBooking.daysCount * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .slice(0, 10),
            daysCount: activeBooking.daysCount,
            daysUsed: activeBooking.daysUsed,
            daysRemaining: daysRemaining,
            status: subStatus,
            amount: activeBooking.amount,
            paymentMethod: activeBooking.paymentMethod,
          };

          if (subStatus === 'Expiring Soon') {
            customerStatus = 'Expiring Soon';
          } else if (subStatus === 'Expired') {
            customerStatus = 'Expired';
          } else if (lifetimeRevenue >= 30000) {
            customerStatus = 'VIP';
          } else {
            customerStatus = 'Active';
          }
        } else if (c.bookings.some((b) => b.status === 'Expired')) {
          customerStatus = 'Expired';
        } else if (lifetimeRevenue >= 30000) {
          customerStatus = 'VIP';
        } else if (totalVisits > 0) {
          customerStatus = 'Inactive';
        }

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          company: c.company,
          branchHistory: branchHistory.length > 0 ? branchHistory : [],
          totalVisits,
          lifetimeRevenue,
          latestVisit,
          status: customerStatus,
          visitedFacilities,
          bookings: sortedBookings,
          activeSubscription: activeSub,
        };
      });

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        customersList = customersList.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
      }

      if (filters?.branch && filters.branch !== 'all') {
        const bLower = filters.branch.toLowerCase();
        let branchTerms: string[] = [bLower];
        try {
          const branchRows = await executeQuery<any>(`SELECT id, name FROM branches`);
          const matched = branchRows.find(
            (b: any) => b.id.toLowerCase() === bLower || b.name.toLowerCase() === bLower
          );
          if (matched) {
            branchTerms.push(matched.id.toLowerCase());
            branchTerms.push(matched.name.toLowerCase());
          }
        } catch (e) {
          // Fallback if query fails
        }

        customersList = customersList.filter((c) =>
          c.branchHistory.some((bh) => {
            const bhLower = bh.toLowerCase();
            return branchTerms.some((term) => bhLower.includes(term) || term.includes(bhLower));
          })
        );
      }

      if (filters?.status && filters.status !== 'all') {
        const s = filters.status.toLowerCase();
        if (s === 'active') {
          customersList = customersList.filter(
            (c) => c.status === 'Active' || c.status === 'VIP'
          );
        } else if (s === 'expiring soon' || s === 'expiring_soon') {
          customersList = customersList.filter((c) => c.status === 'Expiring Soon');
        } else if (s === 'expired') {
          customersList = customersList.filter(
            (c) => c.status === 'Expired' || (c.activeSubscription && c.activeSubscription.status === 'Expired')
          );
        } else if (s === 'inactive') {
          customersList = customersList.filter((c) => c.status === 'Inactive');
        } else {
          customersList = customersList.filter((c) => c.status === filters.status);
        }
      }

      if (filters?.sort) {
        if (filters.sort === 'revenue_desc') {
          customersList.sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
        } else if (filters.sort === 'revenue_asc') {
          customersList.sort((a, b) => a.lifetimeRevenue - b.lifetimeRevenue);
        } else if (filters.sort === 'visits_desc') {
          customersList.sort((a, b) => b.totalVisits - a.totalVisits);
        } else if (filters.sort === 'latest_visit') {
          customersList.sort(
            (a, b) => new Date(b.latestVisit).getTime() - new Date(a.latestVisit).getTime()
          );
        } else if (filters.sort === 'name') {
          customersList.sort((a, b) => a.name.localeCompare(b.name));
        }
      } else {
        customersList.sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
      }

      return customersList;
    } catch (err) {
      console.error('Error in getAllCustomers:', err);
      return [];
    }
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    const customers = await this.getAllCustomers();
    return customers.find((c) => c.id === id) || null;
  }

  public async getActiveSubscriptions(filters?: SubscriptionFilters): Promise<ActiveSubscription[]> {
    const customers = await this.getAllCustomers();
    let subscriptions: ActiveSubscription[] = [];

    for (const c of customers) {
      if (c.activeSubscription) {
        subscriptions.push(c.activeSubscription);
      } else {
        const recentBooking = c.bookings[0];
        if (recentBooking && recentBooking.status === 'Expired') {
          subscriptions.push({
            id: `SUB-${recentBooking.id}`,
            bookingId: recentBooking.id,
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            email: c.email,
            facility: recentBooking.facility,
            branch: recentBooking.branch,
            startDate: recentBooking.date,
            endDate: new Date(
              new Date(recentBooking.date).getTime() +
                recentBooking.daysCount * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .slice(0, 10),
            daysCount: recentBooking.daysCount,
            daysUsed: recentBooking.daysUsed,
            daysRemaining: 0,
            status: 'Expired',
            amount: recentBooking.amount,
            paymentMethod: recentBooking.paymentMethod,
          });
        }
      }
    }

    if (filters?.branch && filters.branch !== 'all') {
      const bLower = filters.branch.toLowerCase();
      subscriptions = subscriptions.filter((s) =>
        s.branch.toLowerCase().includes(bLower)
      );
    }

    if (filters?.facility && filters.facility !== 'all') {
      subscriptions = subscriptions.filter((s) => s.facility === filters.facility);
    }

    if (filters?.daysRemaining && filters.daysRemaining !== 'all') {
      if (filters.daysRemaining === 'expiring_soon') {
        subscriptions = subscriptions.filter((s) => s.daysRemaining > 0 && s.daysRemaining <= 5);
      } else if (filters.daysRemaining === 'active') {
        subscriptions = subscriptions.filter((s) => s.daysRemaining > 5);
      } else if (filters.daysRemaining === 'expired') {
        subscriptions = subscriptions.filter((s) => s.daysRemaining <= 0);
      }
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      subscriptions = subscriptions.filter(
        (s) =>
          s.customerName.toLowerCase().includes(q) ||
          s.customerId.toLowerCase().includes(q) ||
          s.facility.toLowerCase().includes(q) ||
          s.branch.toLowerCase().includes(q)
      );
    }

    return subscriptions;
  }
}
