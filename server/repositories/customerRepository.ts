import { Customer, ActiveSubscription, CustomerFilters, SubscriptionFilters, Booking } from '../../src/types';
import { executeQuery } from '../database/db';
import { auditRepository } from './auditRepository';

function formatDateToISO(val: any): string {
  if (!val) return new Date().toISOString().substring(0, 10);
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  const s = String(val).trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    return s.substring(0, 10);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s.substring(0, 10);
}

export class CustomerRepository {
  public async getNextClientId(): Promise<string> {
    const clients = await executeQuery<any>(`SELECT id FROM clients`);
    let settingsPrefix = 'CL';
    try {
      const settings = await executeQuery<any>(`SELECT client_prefix FROM business_settings LIMIT 1`);
      if (settings && settings[0]?.client_prefix) {
        settingsPrefix = settings[0].client_prefix;
      }
    } catch (e) {}

    let maxSeq = clients.length;
    for (const c of clients) {
      const match = String(c.id).match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
    const nextSeq = maxSeq + 1;
    return `${settingsPrefix}-${String(nextSeq).padStart(3, '0')}`;
  }

  public async createCustomer(data: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    status?: string;
  }): Promise<Customer> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Customer full name is required.');
    }

    const cleanName = data.name.trim();
    const cleanPhone = (data.phone || '').trim();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanCompany = (data.company || '').trim();

    // Check for duplicate customer
    if (cleanEmail) {
      const existingByEmail = await executeQuery<any>(
        `SELECT id, name FROM clients WHERE LOWER(email) = LOWER(?) LIMIT 1`,
        [cleanEmail]
      );
      if (existingByEmail && existingByEmail.length > 0) {
        throw new Error(`A customer with email "${cleanEmail}" already exists (${existingByEmail[0].name}).`);
      }
    }

    if (cleanPhone) {
      const existingByPhone = await executeQuery<any>(
        `SELECT id, name FROM clients WHERE phone = ? LIMIT 1`,
        [cleanPhone]
      );
      if (existingByPhone && existingByPhone.length > 0) {
        throw new Error(`A customer with phone number "${cleanPhone}" already exists (${existingByPhone[0].name}).`);
      }
    }

    const newId = await this.getNextClientId();
    const customerStatus = data.status || 'Active';
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await executeQuery(
      `INSERT INTO clients (id, name, phone, email, company, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, cleanName, cleanPhone, cleanEmail, cleanCompany, customerStatus, createdAt]
    );

    auditRepository.logAction({
      user: 'System Admin',
      action: 'CREATE_CUSTOMER',
      entity: 'clients',
      entityId: newId,
      newValue: { id: newId, name: cleanName, phone: cleanPhone, email: cleanEmail, company: cleanCompany },
    });

    return {
      id: newId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      company: cleanCompany,
      branchHistory: [],
      totalVisits: 0,
      lifetimeRevenue: 0,
      latestVisit: 'N/A',
      status: customerStatus as any,
      visitedFacilities: [],
      bookings: [],
    };
  }

  public async updateCustomer(
    id: string,
    updates: {
      name?: string;
      phone?: string;
      email?: string;
      company?: string;
      status?: string;
    }
  ): Promise<Customer | null> {
    const existing = await executeQuery<any>(`SELECT id, name FROM clients WHERE id = ? LIMIT 1`, [id]);
    if (!existing || existing.length === 0) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    const cleanName = updates.name !== undefined ? updates.name.trim() : null;
    const cleanPhone = updates.phone !== undefined ? updates.phone.trim() : null;
    const cleanEmail = updates.email !== undefined ? updates.email.trim().toLowerCase() : null;
    const cleanCompany = updates.company !== undefined ? updates.company.trim() : null;
    const cleanStatus = updates.status !== undefined ? updates.status : null;

    // Check duplicate email
    if (cleanEmail) {
      const dup = await executeQuery<any>(
        `SELECT id FROM clients WHERE LOWER(email) = LOWER(?) AND id != ? LIMIT 1`,
        [cleanEmail, id]
      );
      if (dup && dup.length > 0) {
        throw new Error(`Another customer with email "${cleanEmail}" already exists.`);
      }
    }

    await executeQuery(
      `UPDATE clients SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        company = COALESCE(?, company),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [cleanName, cleanPhone, cleanEmail, cleanCompany, cleanStatus, id]
    );

    // Keep bookings in sync with updated client details
    if (cleanName) {
      await executeQuery(
        `UPDATE bookings SET client_name = ? WHERE client_id = ?`,
        [cleanName, id]
      ).catch(() => {});
    }
    if (cleanPhone) {
      await executeQuery(
        `UPDATE bookings SET phone = ? WHERE client_id = ?`,
        [cleanPhone, id]
      ).catch(() => {});
    }
    if (cleanEmail) {
      await executeQuery(
        `UPDATE bookings SET email = ? WHERE client_id = ?`,
        [cleanEmail, id]
      ).catch(() => {});
    }

    auditRepository.logAction({
      user: 'System Admin',
      action: 'UPDATE_CUSTOMER',
      entity: 'clients',
      entityId: id,
      newValue: updates,
    });

    return await this.getCustomerById(id);
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    const bookings = await executeQuery<any>(`SELECT id FROM bookings WHERE client_id = ? LIMIT 1`, [id]);
    if (bookings && bookings.length > 0) {
      // Protect financial/booking records - deactivate rather than hard delete
      await executeQuery(`UPDATE clients SET status = 'Inactive' WHERE id = ?`, [id]);
      auditRepository.logAction({
        user: 'System Admin',
        action: 'DEACTIVATE_CUSTOMER',
        entity: 'clients',
        entityId: id,
        newValue: { status: 'Inactive', reason: 'Protected historical booking records' },
      });
      return true;
    }

    await executeQuery(`DELETE FROM clients WHERE id = ?`, [id]);
    auditRepository.logAction({
      user: 'System Admin',
      action: 'DELETE_CUSTOMER',
      entity: 'clients',
      entityId: id,
    });
    return true;
  }

  public async getAllCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    try {
      // Fetch clients and bookings from database
      const clientRows = await executeQuery<any>(`SELECT id, name, phone, email, company, status FROM clients`);
      const bookingRows = await executeQuery<any>(
        `SELECT id, date, client_id as clientId, client_name as clientName, phone, email, branch, facility, days_count as daysCount, time_duration as timeDuration, amount, payment_method as paymentMethod, days_used as daysUsed, days_left as daysLeft, status FROM bookings ORDER BY date DESC`
      );

      const customerMap = new Map<string, {
        id: string;
        name: string;
        phone: string;
        email?: string;
        company?: string;
        dbStatus?: string;
        bookings: Booking[];
      }>();

      for (const c of clientRows) {
        customerMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          company: c.company || '',
          dbStatus: c.status || 'Active',
          bookings: [],
        });
      }

      for (const b of bookingRows) {
        const formattedBooking: Booking = {
          id: b.id,
          date: formatDateToISO(b.date),
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
            dbStatus: 'Active',
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

        // Qualifying lifetime revenue: exclude cancelled bookings
        const lifetimeRevenue = c.bookings
          .filter((b) => b.status !== 'Cancelled')
          .reduce((sum, b) => sum + b.amount, 0);

        const latestVisit = sortedBookings[0] ? sortedBookings[0].date : 'N/A';

        const activeBooking = c.bookings.find(
          (b) => b.status === 'Active' || b.status === 'Upcoming'
        );

        let activeSub: ActiveSubscription | undefined = undefined;
        let customerStatus: Customer['status'] = (c.dbStatus as any) || 'Active';

        if (activeBooking) {
          const daysRemaining = activeBooking.daysLeft;
          const subStatus: ActiveSubscription['status'] =
            daysRemaining <= 0
              ? 'Expired'
              : daysRemaining <= 5
              ? 'Expiring Soon'
              : 'Active';

          const bookingDate = new Date(activeBooking.date);
          const endDate = new Date(bookingDate.getTime() + activeBooking.daysCount * 24 * 60 * 60 * 1000);

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
            endDate: formatDateToISO(endDate),
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
        } else if (c.dbStatus === 'Inactive') {
          customerStatus = 'Inactive';
        } else if (totalVisits === 0) {
          customerStatus = 'Active';
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
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.company && c.company.toLowerCase().includes(q))
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
        } catch (e) {}

        customersList = customersList
          .filter((c) =>
            c.branchHistory.some((bh) => {
              const bhLower = bh.toLowerCase();
              return branchTerms.some((term) => bhLower === term || bhLower.includes(term) || term.includes(bhLower));
            })
          )
          .map((c) => {
            const branchBookings = c.bookings.filter((b) => {
              const bBranch = (b.branch || '').toLowerCase();
              return branchTerms.some((term) => bBranch === term || bBranch.includes(term) || term.includes(bBranch));
            });
            const branchRevenue = branchBookings
              .filter((b) => b.status !== 'Cancelled')
              .reduce((sum, b) => sum + b.amount, 0);
            return {
              ...c,
              totalVisits: branchBookings.length,
              lifetimeRevenue: branchRevenue,
            };
          });
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
        } else if (s === 'vip') {
          customersList = customersList.filter((c) => c.status === 'VIP');
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
      throw err;
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
          const bookingDate = new Date(recentBooking.date);
          const endDate = new Date(bookingDate.getTime() + recentBooking.daysCount * 24 * 60 * 60 * 1000);

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
            endDate: formatDateToISO(endDate),
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
