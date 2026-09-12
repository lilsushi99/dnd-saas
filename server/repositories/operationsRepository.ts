import fs from 'fs';
import path from 'path';
import { Booking, ClientSuggestion, SystemSettings, FacilityRecordSummary } from '../../src/types';
import config from '../config/config';
import { executeQuery, executeTransaction } from '../database/db';
import { auditRepository } from './auditRepository';

function persistBase64Image(dataUri?: string, prefix = 'img'): string {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
    return dataUri || '';
  }
  try {
    const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUri;
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : (mimeType.split('/')[1] || 'png');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const uniqueFileName = `${prefix}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${uniqueFileName}`;
  } catch (err) {
    console.error('Error persisting base64 image:', err);
    return dataUri;
  }
}

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

export class OperationsRepository {
  public async getBookings(filters?: {
    branch?: string;
    month?: string;
    search?: string;
  }): Promise<Booking[]> {
    try {
      let sql = `SELECT id, date, client_id as clientId, client_name as clientName, phone, email, branch, facility, days_count as daysCount, time_duration as timeDuration, amount, payment_method as paymentMethod, days_used as daysUsed, days_left as daysLeft, status, created_at as createdAt FROM bookings`;
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Branch filter resolution
      if (filters?.branch && filters.branch !== 'all' && filters.branch.trim() !== '') {
        const b = filters.branch.trim();
        // Lookup branch ID / Name in database to resolve aliases (e.g. BR-003 -> London Main)
        const branchRows = await executeQuery<any>(
          `SELECT id, name FROM branches WHERE id = ? OR name = ?`,
          [b, b]
        );
        if (branchRows && branchRows.length > 0) {
          const matchedName = branchRows[0].name;
          const matchedId = branchRows[0].id;
          whereConditions.push(`(branch = ? OR branch = ? OR branch LIKE ?)`);
          params.push(matchedId, matchedName, `%${matchedName}%`);
        } else {
          whereConditions.push(`(branch = ? OR branch LIKE ?)`);
          params.push(b, `%${b}%`);
        }
      }

      // Month filter resolution
      if (filters?.month && filters.month !== 'all' && filters.month.trim() !== '') {
        let m = filters.month.trim();
        if (m === 'this_month') {
          const now = new Date();
          m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        whereConditions.push(`CAST(date AS CHAR) LIKE ?`);
        params.push(`${m}%`);
      }

      // Search filter resolution
      if (filters?.search && filters.search.trim() !== '') {
        const s = `%${filters.search.trim()}%`;
        whereConditions.push(
          `(id LIKE ? OR client_name LIKE ? OR client_id LIKE ? OR phone LIKE ? OR email LIKE ? OR facility LIKE ? OR branch LIKE ?)`
        );
        params.push(s, s, s, s, s, s, s);
      }

      if (whereConditions.length > 0) {
        sql += ` WHERE ` + whereConditions.join(' AND ');
      }

      sql += ` ORDER BY date DESC, created_at DESC`;

      const rows = await executeQuery<any>(sql, params);
      return rows.map((r) => {
        let statusVal: 'Active' | 'Expired' | 'Upcoming' = 'Active';
        if (r.status === 'Expired') statusVal = 'Expired';
        else if (r.status === 'Upcoming') statusVal = 'Upcoming';
        else statusVal = 'Active';

        return {
          id: r.id,
          date: formatDateToISO(r.date),
          clientId: r.clientId,
          clientName: r.clientName,
          phone: r.phone || '',
          email: r.email || '',
          branch: r.branch || '',
          facility: r.facility || '',
          daysCount: Number(r.daysCount || 1),
          timeDuration: r.timeDuration || '09:00 AM - 05:00 PM',
          amount: Number(r.amount || 0),
          paymentMethod: r.paymentMethod || 'Cash',
          daysUsed: Number(r.daysUsed || 0),
          daysLeft: Number(r.daysLeft || 0),
          status: statusVal,
          createdAt: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt)) : new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('Error fetching bookings:', err);
      return [];
    }
  }

  public async getAllBookings(): Promise<Booking[]> {
    return this.getBookings();
  }

  public async getSettings(): Promise<SystemSettings> {
    try {
      const rows = await executeQuery<any>(`SELECT * FROM business_settings WHERE id = 1`);

      if (rows && rows.length > 0) {
        const r = rows[0];
        let taxNum = 0;
        if (r.tax_rate !== undefined && r.tax_rate !== null && r.tax_rate !== '') {
          taxNum = Number(String(r.tax_rate).replace(/[^0-9.]/g, '')) || 0;
        }

        return {
          businessName: r.business_name || '',
          directorName: r.director_name || '',
          businessLogo: r.business_logo || '',
          currency: r.currency || '',
          timeZone: r.timezone || '',
          address: r.address || '',
          phone: r.phone || '',
          email: r.email || '',
          website: r.website || '',
          language: r.language || '',
          taxRate: taxNum,
          invoicePrefix: r.invoice_prefix || '',
          bookingPrefix: r.booking_prefix || '',
          clientPrefix: r.client_prefix || '',
          expensePrefix: r.expense_prefix || '',
          categoryPrefix: r.category_prefix || '',
          branchCode: r.branch_code || '',
        };
      }
    } catch (err) {
      console.error('Error fetching business settings:', err);
    }
    return {
      businessName: '',
      directorName: '',
      businessLogo: '',
      currency: '',
      timeZone: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      language: '',
      taxRate: 0,
      invoicePrefix: '',
      bookingPrefix: '',
      clientPrefix: '',
      expensePrefix: '',
      categoryPrefix: '',
      branchCode: '',
    };
  }

  public async updateSettings(newSettings: Partial<SystemSettings>): Promise<SystemSettings> {
    const existing = await executeQuery<any>(`SELECT id FROM business_settings WHERE id = 1`);
    const taxRateVal = newSettings.taxRate !== undefined && newSettings.taxRate !== null ? `${newSettings.taxRate}%` : '0%';
    const logoToSave = persistBase64Image(newSettings.businessLogo, 'logo');

    if (!existing || existing.length === 0) {
      await executeQuery(
        `INSERT INTO business_settings (id, business_name, director_name, business_logo, currency, timezone, address, phone, email, website, language, tax_rate, invoice_prefix, booking_prefix, client_prefix, expense_prefix, category_prefix, branch_code)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newSettings.businessName ?? '',
          newSettings.directorName ?? '',
          logoToSave,
          newSettings.currency ?? '',
          newSettings.timeZone ?? '',
          newSettings.address ?? '',
          newSettings.phone ?? '',
          newSettings.email ?? '',
          newSettings.website ?? '',
          newSettings.language ?? '',
          taxRateVal,
          newSettings.invoicePrefix ?? '',
          newSettings.bookingPrefix ?? '',
          newSettings.clientPrefix ?? '',
          newSettings.expensePrefix ?? '',
          newSettings.categoryPrefix ?? '',
          newSettings.branchCode ?? '',
        ]
      );
    } else {
      await executeQuery(
        `UPDATE business_settings SET
         business_name = ?,
         director_name = ?,
         business_logo = ?,
         currency = ?,
         timezone = ?,
         address = ?,
         phone = ?,
         email = ?,
         website = ?,
         language = ?,
         tax_rate = ?,
         invoice_prefix = ?,
         booking_prefix = ?,
         client_prefix = ?,
         expense_prefix = ?,
         category_prefix = ?,
         branch_code = ?
         WHERE id = 1`,
        [
          newSettings.businessName ?? '',
          newSettings.directorName ?? '',
          logoToSave,
          newSettings.currency ?? '',
          newSettings.timeZone ?? '',
          newSettings.address ?? '',
          newSettings.phone ?? '',
          newSettings.email ?? '',
          newSettings.website ?? '',
          newSettings.language ?? '',
          taxRateVal,
          newSettings.invoicePrefix ?? '',
          newSettings.bookingPrefix ?? '',
          newSettings.clientPrefix ?? '',
          newSettings.expensePrefix ?? '',
          newSettings.categoryPrefix ?? '',
          newSettings.branchCode ?? '',
        ]
      );
    }

    auditRepository.logAction({
      user: 'System Admin',
      action: 'UPDATE_SETTINGS',
      entity: 'business_settings',
      entityId: '1',
      newValue: newSettings,
    });

    return await this.getSettings();
  }

  public async getProfileSettings(userId?: string): Promise<{
    profileName: string;
    profileEmail: string;
    profilePhone: string;
    profilePhoto: string;
  }> {
    try {
      if (userId) {
        const rows = await executeQuery<any>(`SELECT * FROM profile_settings WHERE user_id = ?`, [userId]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            profileName: r.full_name || '',
            profileEmail: r.email || '',
            profilePhone: r.phone || '',
            profilePhoto: r.profile_photo || '',
          };
        }
        const userRows = await executeQuery<any>(`SELECT * FROM users WHERE id = ? OR email = ?`, [userId, userId]);
        if (userRows && userRows.length > 0) {
          const u = userRows[0];
          return {
            profileName: u.name || '',
            profileEmail: u.email || '',
            profilePhone: u.phone || '',
            profilePhoto: u.profile_photo || '',
          };
        }
      } else {
        const rows = await executeQuery<any>(`SELECT * FROM profile_settings LIMIT 1`);
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            profileName: r.full_name || '',
            profileEmail: r.email || '',
            profilePhone: r.phone || '',
            profilePhoto: r.profile_photo || '',
          };
        }
      }
    } catch (err) {
      console.error('Error fetching profile settings:', err);
    }
    return {
      profileName: '',
      profileEmail: '',
      profilePhone: '',
      profilePhoto: '',
    };
  }

  public async updateProfileSettings(data: {
    userId?: string;
    profileName: string;
    profileEmail: string;
    profilePhone: string;
    profilePhoto?: string;
  }): Promise<{
    profileName: string;
    profileEmail: string;
    profilePhone: string;
    profilePhoto: string;
  }> {
    const { userId, profileName, profileEmail, profilePhone, profilePhoto } = data;
    const photoToSave = persistBase64Image(profilePhoto, 'profile');

    if (userId) {
      await executeQuery(
        `UPDATE users SET name = ?, email = ?, phone = ?, profile_photo = ? WHERE id = ?`,
        [profileName, profileEmail, profilePhone, photoToSave || null, userId]
      );
      await executeQuery(
        `INSERT INTO profile_settings (user_id, full_name, email, phone, profile_photo)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone), profile_photo = VALUES(profile_photo)`,
        [userId, profileName, profileEmail, profilePhone, photoToSave || null]
      );
    } else {
      await executeQuery(
        `UPDATE users SET name = ?, phone = ?, profile_photo = ? WHERE email = ?`,
        [profileName, profilePhone, photoToSave || null, profileEmail]
      );
      await executeQuery(
        `INSERT INTO profile_settings (user_id, full_name, email, phone, profile_photo)
         VALUES ('USR-001', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone), profile_photo = VALUES(profile_photo)`,
        [profileName, profileEmail, profilePhone, photoToSave || null]
      );
    }

    auditRepository.logAction({
      user: profileName || 'System Admin',
      action: 'UPDATE_PROFILE',
      entity: 'profile_settings',
      entityId: userId || '1',
      newValue: { profileName, profileEmail, profilePhone, profilePhoto: profilePhoto ? 'Updated' : undefined },
    });

    return await this.getProfileSettings(userId);
  }

  public async getNextBookingId(): Promise<string> {
    const bookings = await this.getAllBookings();
    const settings = await this.getSettings();
    const nextSeq = bookings.length + 1;
    const year = new Date().getFullYear();
    const prefix = settings.bookingPrefix || 'BK';
    const branchCode = settings.branchCode || 'IPHIN';
    return `${prefix}-${branchCode}-${year}-${nextSeq}`;
  }

  public async getNextClientId(): Promise<string> {
    const clients = await this.getClients();
    const settings = await this.getSettings();
    const nextSeq = clients.length + 1;
    const prefix = settings.clientPrefix || 'CL';
    const branchCode = settings.branchCode || 'IPHIN';
    return `${prefix}-${branchCode}-${nextSeq}`;
  }

  public async addBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
    const newId = await this.getNextBookingId();
    const settings = await this.getSettings();

    let finalClientId = bookingData.clientId;
    const clients = await this.getClients();
    const existingClient = clients.find(
      (c) =>
        (finalClientId && c.id.toLowerCase() === finalClientId.toLowerCase()) ||
        c.name.toLowerCase() === bookingData.clientName.toLowerCase()
    );

    if (existingClient) {
      finalClientId = existingClient.id;
    } else {
      finalClientId = await this.getNextClientId();
    }

    const newBooking: Booking = {
      ...bookingData,
      id: newId,
      clientId: finalClientId,
      createdAt: new Date().toISOString(),
    };

    await executeTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO clients (id, name, phone, email, company)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email)`,
        [
          finalClientId,
          bookingData.clientName,
          bookingData.phone,
          bookingData.email || '',
          bookingData.clientName,
        ]
      );

      await conn.execute(
        `INSERT INTO bookings (id, date, client_id, client_name, phone, email, branch, facility, days_count, time_duration, amount, payment_method, days_used, days_left, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newBooking.id,
          newBooking.date,
          newBooking.clientId,
          newBooking.clientName,
          newBooking.phone,
          newBooking.email || null,
          newBooking.branch,
          newBooking.facility,
          newBooking.daysCount,
          newBooking.timeDuration,
          newBooking.amount,
          newBooking.paymentMethod,
          newBooking.daysUsed,
          newBooking.daysLeft,
          newBooking.status,
          newBooking.createdAt.replace('T', ' ').replace('Z', ''),
        ]
      );

      const payRef = `REF-${Date.now().toString().slice(-8)}`;
      await conn.execute(
        `INSERT INTO payments (id, reference, booking_id, client_id, amount, payment_method, payment_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')`,
        [
          `PAY-${Date.now().toString().slice(-6)}`,
          payRef,
          newBooking.id,
          newBooking.clientId,
          newBooking.amount,
          newBooking.paymentMethod,
          newBooking.date,
        ]
      );
    });

    auditRepository.logAction({
      user: 'System Admin',
      action: 'CREATE_BOOKING',
      entity: 'bookings',
      entityId: newBooking.id,
      newValue: newBooking,
    });

    return newBooking;
  }

  public async updateBooking(id: string, updatedFields: Partial<Booking>): Promise<Booking> {
    const bookings = await this.getAllBookings();
    const existing = bookings.find((b) => b.id === id);
    if (!existing) {
      throw new Error(`Booking with ID ${id} not found.`);
    }

    const daysCount = updatedFields.daysCount !== undefined ? Number(updatedFields.daysCount) : existing.daysCount;
    const daysUsed = updatedFields.daysUsed !== undefined ? Number(updatedFields.daysUsed) : existing.daysUsed;
    const daysLeft = Math.max(0, daysCount - daysUsed);

    await executeQuery(
      `UPDATE bookings SET client_name = COALESCE(?, client_name), phone = COALESCE(?, phone), email = COALESCE(?, email),
       branch = COALESCE(?, branch), facility = COALESCE(?, facility), days_count = ?, days_used = ?, days_left = ?,
       time_duration = COALESCE(?, time_duration), amount = COALESCE(?, amount), payment_method = COALESCE(?, payment_method),
       status = COALESCE(?, status) WHERE id = ?`,
      [
        updatedFields.clientName || null,
        updatedFields.phone || null,
        updatedFields.email || null,
        updatedFields.branch || null,
        updatedFields.facility || null,
        daysCount,
        daysUsed,
        daysLeft,
        updatedFields.timeDuration || null,
        updatedFields.amount !== undefined ? updatedFields.amount : null,
        updatedFields.paymentMethod || null,
        updatedFields.status || null,
        id,
      ]
    );

    const updatedBooking: Booking = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      daysCount,
      daysUsed,
      daysLeft,
    };

    auditRepository.logAction({
      user: 'System Admin',
      action: 'UPDATE_BOOKING',
      entity: 'bookings',
      entityId: id,
      newValue: updatedBooking,
    });

    return updatedBooking;
  }

  public async getClients(query?: string): Promise<ClientSuggestion[]> {
    try {
      const rows = await executeQuery<any>(`SELECT id, name, phone, email FROM clients`);
      let list: ClientSuggestion[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone || '',
        email: r.email || '',
      }));

      if (query) {
        const q = query.toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            c.id.toLowerCase().includes(q)
        );
      }

      return list;
    } catch (err) {
      console.error('Error fetching clients:', err);
      return [];
    }
  }

  public async getFacilityRecords(filters?: {
    branch?: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FacilityRecordSummary[]> {
    try {
      const dbFacilities = await executeQuery<any>(`
        SELECT f.id, f.name, f.branch_id, f.branch_name, f.capacity, f.default_price,
               COALESCE(b.location, f.branch_name) as branch_location,
               COALESCE(b.name, f.branch_name) as clean_branch_name
        FROM facilities f
        LEFT JOIN branches b ON f.branch_id = b.id OR f.branch_name = b.name
        ORDER BY f.name ASC
      `);

      let bookingSql = `SELECT id, date, branch, facility, days_count, amount, days_used, status FROM bookings WHERE 1=1`;
      const bookingParams: any[] = [];

      if (filters?.branch && filters.branch !== 'all' && filters.branch !== 'Both Branches') {
        const b = filters.branch.trim();
        bookingSql += ` AND (branch = ? OR branch LIKE ?)`;
        bookingParams.push(b, `%${b}%`);
      }

      if (filters?.dateFilter) {
        const todayStr = new Date().toISOString().substring(0, 10);
        const todayDate = new Date(todayStr);

        if (filters.dateFilter === 'last_7_days') {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - 7);
          bookingSql += ` AND date >= ? AND date <= ?`;
          bookingParams.push(d.toISOString().substring(0, 10), todayStr);
        } else if (filters.dateFilter === 'last_30_days') {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - 30);
          bookingSql += ` AND date >= ? AND date <= ?`;
          bookingParams.push(d.toISOString().substring(0, 10), todayStr);
        } else if (filters.dateFilter === 'this_month') {
          const monthStr = todayStr.substring(0, 7);
          bookingSql += ` AND CAST(date AS CHAR) LIKE ?`;
          bookingParams.push(`${monthStr}%`);
        } else if (filters.dateFilter === 'custom') {
          if (filters.startDate) {
            bookingSql += ` AND date >= ?`;
            bookingParams.push(filters.startDate);
          }
          if (filters.endDate) {
            bookingSql += ` AND date <= ?`;
            bookingParams.push(filters.endDate);
          }
        }
      }

      const matchingBookings = await executeQuery<any>(bookingSql, bookingParams);

      const facilityMap = new Map<string, {
        facilityName: string;
        branchName: string;
        capacity: number;
        bookings: any[];
      }>();

      for (const fac of dbFacilities) {
        const key = `${fac.name.toLowerCase()}___${(fac.clean_branch_name || '').toLowerCase()}`;
        facilityMap.set(key, {
          facilityName: fac.name,
          branchName: fac.clean_branch_name || fac.branch_name || 'Main Branch',
          capacity: Number(fac.capacity || 5),
          bookings: [],
        });
      }

      for (const bk of matchingBookings) {
        const facName = bk.facility || 'General Facility';
        const bName = bk.branch || 'Main Branch';
        const key = `${facName.toLowerCase()}___${bName.toLowerCase()}`;

        if (!facilityMap.has(key)) {
          const existingKey = Array.from(facilityMap.keys()).find(k => k.startsWith(`${facName.toLowerCase()}___`));
          if (existingKey) {
            facilityMap.get(existingKey)!.bookings.push(bk);
          } else {
            facilityMap.set(key, {
              facilityName: facName,
              branchName: bName,
              capacity: 5,
              bookings: [bk],
            });
          }
        } else {
          facilityMap.get(key)!.bookings.push(bk);
        }
      }

      let resultMapList = Array.from(facilityMap.values());

      if (filters?.branch && filters.branch !== 'all' && filters.branch !== 'Both Branches') {
        const targetBranch = filters.branch.toLowerCase();
        resultMapList = resultMapList.filter(f =>
          f.branchName.toLowerCase().includes(targetBranch) ||
          targetBranch.includes(f.branchName.toLowerCase()) ||
          f.bookings.length > 0
        );
      }

      const totalEnterpriseRev = matchingBookings.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

      return resultMapList.map(item => {
        const count = item.bookings.length;
        const revenue = item.bookings.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
        const avgSpend = count > 0 ? Math.round(revenue / count) : 0;
        const percentageOfTotal = totalEnterpriseRev > 0 ? Number(((revenue / totalEnterpriseRev) * 100).toFixed(1)) : 0;

        const activeCount = item.bookings.filter((b: any) => b.status === 'Active' || b.status === 'Upcoming').length;
        let occupancy = 0;
        if (item.capacity > 0 && count > 0) {
          occupancy = Math.min(100, Math.round((Math.max(activeCount, 1) / item.capacity) * 100));
        }

        return {
          facility: item.facilityName,
          bookings: count,
          revenue,
          branch: item.branchName,
          averageRevenue: avgSpend,
          percentageOfTotal,
          occupancy,
        };
      });
    } catch (err) {
      console.error('Error in getFacilityRecords:', err);
      return [];
    }
  }
}
