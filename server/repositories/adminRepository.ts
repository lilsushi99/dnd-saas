import { Branch, Facility, AdminUser, RolePermission, ImportSpreadsheetRow, ImportResultSummary } from '../../src/types';
import { executeQuery } from '../database/db';
import { auditRepository } from './auditRepository';

export class AdminRepository {
  // --- BRANCHES ---
  public async getBranches(): Promise<Branch[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, location, status, created_date as createdDate FROM branches ORDER BY created_at DESC`
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        location: r.location,
        status: (r.status || 'Active') as 'Active' | 'Inactive',
        createdDate: r.createdDate || new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Error fetching branches:', err);
      return [];
    }
  }

  public async getBranchById(id: string): Promise<Branch | undefined> {
    const branches = await this.getBranches();
    return branches.find((b) => b.id === id);
  }

  public async createBranch(data: Omit<Branch, 'id' | 'createdDate'>): Promise<Branch> {
    const branches = await this.getBranches();
    const newBranch: Branch = {
      id: `BR-00${branches.length + 1}`,
      ...data,
      createdDate: new Date().toISOString().split('T')[0],
    };

    await executeQuery(
      `INSERT INTO branches (id, name, location, status, created_date) VALUES (?, ?, ?, ?, ?)`,
      [newBranch.id, newBranch.name, newBranch.location, newBranch.status, newBranch.createdDate]
    );

    auditRepository.logAction({
      user: 'System Admin',
      action: 'CREATE_BRANCH',
      entity: 'branches',
      entityId: newBranch.id,
      newValue: newBranch,
    });

    return newBranch;
  }

  public async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | null> {
    await executeQuery(
      `UPDATE branches SET name = COALESCE(?, name), location = COALESCE(?, location), status = COALESCE(?, status) WHERE id = ?`,
      [updates.name || null, updates.location || null, updates.status || null, id]
    );

    const updated = await this.getBranchById(id);
    if (updated) {
      auditRepository.logAction({
        user: 'System Admin',
        action: 'UPDATE_BRANCH',
        entity: 'branches',
        entityId: id,
        newValue: updated,
      });
    }
    return updated || null;
  }

  public async toggleBranchStatus(id: string): Promise<Branch | null> {
    const branch = await this.getBranchById(id);
    if (!branch) return null;

    const newStatus = branch.status === 'Active' ? 'Inactive' : 'Active';
    await executeQuery(`UPDATE branches SET status = ? WHERE id = ?`, [newStatus, id]);

    auditRepository.logAction({
      user: 'System Admin',
      action: 'TOGGLE_BRANCH_STATUS',
      entity: 'branches',
      entityId: id,
      previousValue: { status: branch.status },
      newValue: { status: newStatus },
    });

    branch.status = newStatus;
    return branch;
  }

  // --- FACILITIES ---
  public async getFacilities(): Promise<Facility[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, branch_id as branchId, branch_name as branchName, default_price as defaultPrice, capacity, status, created_date as createdDate FROM facilities ORDER BY created_at DESC`
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        branchId: r.branchId,
        branchName: r.branchName || '',
        defaultPrice: r.defaultPrice ? Number(r.defaultPrice) : 0,
        capacity: r.capacity ? Number(r.capacity) : 0,
        status: (r.status || 'Active') as 'Active' | 'Inactive',
        createdDate: r.createdDate || new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Error fetching facilities:', err);
      return [];
    }
  }

  public async createFacility(data: { name: string; branchId: string; defaultPrice?: number; capacity?: number; status: 'Active' | 'Inactive' }): Promise<Facility> {
    const facilities = await this.getFacilities();
    const branches = await this.getBranches();
    const branch = branches.find((b) => b.id === data.branchId);

    const newFacility: Facility = {
      id: `FAC-00${facilities.length + 1}`,
      name: data.name,
      branchId: data.branchId,
      branchName: branch ? branch.name : '',
      defaultPrice: data.defaultPrice || 0,
      capacity: data.capacity || 0,
      status: data.status,
      createdDate: new Date().toISOString().split('T')[0],
    };

    await executeQuery(
      `INSERT INTO facilities (id, name, branch_id, branch_name, default_price, capacity, status, created_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newFacility.id,
        newFacility.name,
        newFacility.branchId,
        newFacility.branchName,
        newFacility.defaultPrice,
        newFacility.capacity,
        newFacility.status,
        newFacility.createdDate,
      ]
    );

    auditRepository.logAction({
      user: 'System Admin',
      action: 'CREATE_FACILITY',
      entity: 'facilities',
      entityId: newFacility.id,
      newValue: newFacility,
    });

    return newFacility;
  }

  public async updateFacility(id: string, updates: Partial<Facility>): Promise<Facility | null> {
    let branchName: string | null = null;
    if (updates.branchId) {
      const branches = await this.getBranches();
      const b = branches.find((br) => br.id === updates.branchId);
      if (b) branchName = b.name;
    }

    await executeQuery(
      `UPDATE facilities SET name = COALESCE(?, name), branch_id = COALESCE(?, branch_id),
       branch_name = COALESCE(?, branch_name), default_price = COALESCE(?, default_price), capacity = COALESCE(?, capacity),
       status = COALESCE(?, status) WHERE id = ?`,
      [
        updates.name || null,
        updates.branchId || null,
        branchName,
        updates.defaultPrice !== undefined ? updates.defaultPrice : null,
        updates.capacity !== undefined ? updates.capacity : null,
        updates.status || null,
        id,
      ]
    );

    const facilities = await this.getFacilities();
    const updated = facilities.find((f) => f.id === id);
    if (updated) {
      auditRepository.logAction({
        user: 'System Admin',
        action: 'UPDATE_FACILITY',
        entity: 'facilities',
        entityId: id,
        newValue: updated,
      });
    }
    return updated || null;
  }

  public async deleteFacility(id: string): Promise<boolean> {
    const facilities = await this.getFacilities();
    const deleted = facilities.find((f) => f.id === id);
    if (!deleted) return false;

    await executeQuery(`DELETE FROM facilities WHERE id = ?`, [id]);

    auditRepository.logAction({
      user: 'System Admin',
      action: 'DELETE_FACILITY',
      entity: 'facilities',
      entityId: id,
      previousValue: deleted,
    });

    return true;
  }

  // --- USERS & ROLES ---
  public async getUsers(): Promise<AdminUser[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, email, role, branch, status, created_at as createdAt FROM users ORDER BY created_at DESC`
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        branch: r.branch || 'All Branches',
        status: (r.status || 'Active') as 'Active' | 'Inactive',
        createdAt: r.createdAt ? String(r.createdAt).substring(0, 10) : new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  }

  public async createUser(data: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
    const users = await this.getUsers();
    const newUser: AdminUser = {
      id: `USR-00${users.length + 1}`,
      ...data,
      createdAt: new Date().toISOString().split('T')[0],
    };

    await executeQuery(
      `INSERT INTO users (id, name, email, phone, password_hash, role, branch, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newUser.id,
        newUser.name,
        newUser.email,
        null,
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a',
        newUser.role,
        newUser.branch,
        newUser.status,
        newUser.createdAt,
      ]
    );

    auditRepository.logAction({
      user: 'System Admin',
      action: 'CREATE_USER',
      entity: 'users',
      entityId: newUser.id,
      newValue: newUser,
    });

    return newUser;
  }

  public async updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
    await executeQuery(
      `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role),
       branch = COALESCE(?, branch), status = COALESCE(?, status) WHERE id = ?`,
      [updates.name || null, updates.email || null, updates.role || null, updates.branch || null, updates.status || null, id]
    );

    const users = await this.getUsers();
    const updated = users.find((u) => u.id === id);
    if (updated) {
      auditRepository.logAction({
        user: 'System Admin',
        action: 'UPDATE_USER',
        entity: 'users',
        entityId: id,
        newValue: updated,
      });
    }
    return updated || null;
  }

  public async toggleUserStatus(id: string): Promise<AdminUser | null> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return null;

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    await executeQuery(`UPDATE users SET status = ? WHERE id = ?`, [newStatus, id]);

    auditRepository.logAction({
      user: 'System Admin',
      action: 'TOGGLE_USER_STATUS',
      entity: 'users',
      entityId: id,
      previousValue: { status: user.status },
      newValue: { status: newStatus },
    });

    user.status = newStatus;
    return user;
  }

  public async getRolesPermissions(): Promise<RolePermission[]> {
    try {
      const rows = await executeQuery<any>(`SELECT role, permissions FROM user_roles_permissions`);
      return rows.map((r) => {
        let perms = r.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) {}
        }
        return {
          role: r.role,
          permissions: perms || { dashboard: true, crm: true, dailyLogger: true, facilities: true, finance: true, admin: false },
        };
      });
    } catch (err) {
      console.error('Error fetching roles permissions:', err);
      return [];
    }
  }

  public async updateRolePermissions(role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant', permissions: RolePermission['permissions']): Promise<RolePermission | null> {
    const jsonStr = JSON.stringify(permissions);

    await executeQuery(
      `INSERT INTO user_roles_permissions (role, permissions) VALUES (?, ?) ON DUPLICATE KEY UPDATE permissions = VALUES(permissions)`,
      [role, jsonStr]
    );

    auditRepository.logAction({
      user: 'System Admin',
      action: 'UPDATE_ROLE_PERMISSIONS',
      entity: 'user_roles_permissions',
      entityId: role,
      newValue: permissions,
    });

    return { role, permissions };
  }

  // --- IMPORT WIZARD SPREADSHEET EXECUTION ---
  public async executeImport(rows: ImportSpreadsheetRow[]): Promise<ImportResultSummary> {
    let importedBookings = 0;
    let createdClients = 0;
    let revenueAdded = 0;

    const branches = await this.getBranches();
    const facilities = await this.getFacilities();

    const defaultBranchName = branches.length > 0 ? branches[0].name : 'Art & Tech Hub';
    const defaultFacilityName = facilities.length > 0 ? facilities[0].name : 'Co-working Space Desk';

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const clientName = (row.clientName || row.client || `Imported Client ${index + 1}`).toString().trim();

      let rawFacilityName = (row.facility || '').toString().trim();
      let matchedFacility = facilities.find(
        (f) => f.name.toLowerCase() === rawFacilityName.toLowerCase() || rawFacilityName.toLowerCase().includes(f.name.toLowerCase())
      );
      const facilityName = matchedFacility ? matchedFacility.name : (rawFacilityName || defaultFacilityName);

      let branchName = (row.branch || '').toString().trim();
      if (!branchName) {
        if (matchedFacility && matchedFacility.branchName) {
          branchName = matchedFacility.branchName;
        } else {
          branchName = defaultBranchName;
        }
      }

      const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount || '0').replace(/[^0-9.]/g, '')) || 500;
      const daysCount = typeof row.noOfDays === 'number' ? row.noOfDays : parseInt(String(row.noOfDays || '30').replace(/[^0-9]/g, ''), 10) || 30;
      const daysUsed = typeof row.daysUsed === 'number' ? row.daysUsed : parseInt(String(row.daysUsed || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const daysLeft = typeof row.daysLeft === 'number' ? row.daysLeft : Math.max(0, daysCount - daysUsed);
      const paymentMethod = (row.modeOfPayment || 'Wire Transfer').toString().trim();

      const existingClients = await executeQuery<any>(`SELECT id, name FROM clients WHERE LOWER(name) = LOWER(?)`, [clientName]);
      let clientId = existingClients[0]?.id;

      if (!clientId) {
        clientId = `CL-${Date.now().toString().slice(-4)}-${index + 1}`;
        const phone = '+1 (555) 000-1122';
        const email = `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@import.com`;

        await executeQuery(
          `INSERT INTO clients (id, name, phone, email, company) VALUES (?, ?, ?, ?, ?)`,
          [clientId, clientName, phone, email, clientName]
        );
        createdClients++;
      }

      const bookingId = `BK-IMP-${Date.now().toString().slice(-4)}-${index + 1}`;
      const bookingDate = (row.date && String(row.date).trim()) ? String(row.date).trim() : new Date().toISOString().split('T')[0];

      await executeQuery(
        `INSERT INTO bookings (id, date, client_id, client_name, phone, email, branch, facility, days_count, time_duration, amount, payment_method, days_used, days_left, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingId,
          bookingDate,
          clientId,
          clientName,
          '+1 (555) 000-1122',
          `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@import.com`,
          branchName,
          facilityName,
          daysCount,
          row.timeDuration || '09:00 AM - 05:00 PM',
          amount,
          paymentMethod,
          daysUsed,
          daysLeft,
          'Active',
          new Date().toISOString().replace('T', ' ').replace('Z', ''),
        ]
      );

      const payRef = `REF-IMP-${Date.now().toString().slice(-6)}-${index + 1}`;
      await executeQuery(
        `INSERT INTO payments (id, reference, booking_id, client_id, amount, payment_method, payment_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')`,
        [
          `PAY-IMP-${Date.now().toString().slice(-4)}-${index + 1}`,
          payRef,
          bookingId,
          clientId,
          amount,
          paymentMethod,
          bookingDate,
        ]
      ).catch((e) => console.error('Error inserting payment during import:', e));

      importedBookings++;
      revenueAdded += amount;
    }

    auditRepository.logAction({
      user: 'System Admin',
      action: 'EXECUTE_BULK_IMPORT',
      entity: 'bookings',
      newValue: { totalRows: rows.length, importedBookings, createdClients, revenueAdded },
    });

    return {
      totalRows: rows.length,
      importedBookings,
      createdClients,
      updatedFacilityRecords: rows.length,
      revenueAdded,
      timestamp: new Date().toISOString(),
    };
  }
}
