import { cleanNonNegativeNumber, cleanStatus, cleanText } from '../domain/masterData';
import { badRequest, conflict } from '../domain/errors';
import { insertWithGeneratedId } from '../database/ids';
import { Branch, Facility, AdminUser, RolePermission, ImportSpreadsheetRow, ImportResultSummary } from '../../src/types';
import { executeQuery, executeTransaction } from '../database/db';
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
      throw err;
    }
  }

  public async getBranchById(id: string): Promise<Branch | undefined> {
    const branches = await this.getBranches();
    return branches.find((b) => b.id === id);
  }

  private async assertBranchNameFree(name: string, exceptId?: string) {
    const dup = await executeQuery<any>(`SELECT id FROM branches WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1`, [name, exceptId || '']);
    if (dup.length > 0) throw conflict(`A branch named "${name}" already exists.`);
  }

  public async createBranch(data: Omit<Branch, 'id' | 'createdDate'>, actor = 'System'): Promise<Branch> {
    const name = cleanText(data?.name, { label: 'Branch name', min: 2, max: 100, required: true })!;
    const location = cleanText(data?.location, { label: 'Location', max: 200 }) ?? '';
    const status = cleanStatus(data?.status) ?? 'Active';
    await this.assertBranchNameFree(name);
    const createdDate = new Date().toISOString().split('T')[0];

    const id = await insertWithGeneratedId('BR', 'branches', async (newId) => {
      await executeQuery(`INSERT INTO branches (id, name, location, status, created_date) VALUES (?, ?, ?, ?, ?)`, [newId, name, location, status, createdDate]);
    });
    const created: Branch = { id, name, location, status, createdDate };
    auditRepository.logAction({ user: actor, action: 'CREATE_BRANCH', entity: 'branches', entityId: id, newValue: created });
    return created;
  }

  public async updateBranch(id: string, updates: Partial<Branch>, actor = 'System'): Promise<Branch | null> {
    const current = await this.getBranchById(id);
    if (!current) return null;

    const name = cleanText(updates?.name, { label: 'Branch name', min: 2, max: 100 });
    if (updates?.name !== undefined && name === '') throw badRequest('Branch name is required.');
    const location = cleanText(updates?.location, { label: 'Location', max: 200 });
    const status = cleanStatus(updates?.status);
    if (name && name.toLowerCase() !== current.name.toLowerCase()) await this.assertBranchNameFree(name, id);

    const sets: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (location !== undefined) { sets.push('location = ?'); params.push(location); }
    if (status !== undefined) { sets.push('status = ?'); params.push(status); }

    if (sets.length > 0) {
      await executeTransaction(async (conn) => {
        await conn.execute(`UPDATE branches SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
        // Bookings, expenses, facilities and users hold the branch NAME as well as its id. Rename them together
        // so financial history stays attached to the branch instead of being orphaned under the old name.
        if (name && name !== current.name) {
          await conn.execute(`UPDATE facilities SET branch_name = ? WHERE branch_id = ?`, [name, id]);
          await conn.execute(`UPDATE bookings SET branch = ? WHERE branch_id = ? OR LOWER(branch) = LOWER(?)`, [name, id, current.name]);
          await conn.execute(`UPDATE expenses SET branch = ? WHERE branch_id = ? OR LOWER(branch) = LOWER(?)`, [name, id, current.name]);
          await conn.execute(`UPDATE users SET branch = ? WHERE branch_id = ? OR LOWER(branch) = LOWER(?)`, [name, id, current.name]);
        }
      });
    }

    const updated = await this.getBranchById(id);
    if (updated) auditRepository.logAction({ user: actor, action: 'UPDATE_BRANCH', entity: 'branches', entityId: id, previousValue: current, newValue: updated });
    return updated || null;
  }

  public async toggleBranchStatus(id: string, actor = 'System'): Promise<Branch | null> {
    const branch = await this.getBranchById(id);
    if (!branch) return null;

    const newStatus = branch.status === 'Active' ? 'Inactive' : 'Active';
    await executeQuery(`UPDATE branches SET status = ? WHERE id = ?`, [newStatus, id]);
    auditRepository.logAction({ user: actor, action: 'TOGGLE_BRANCH_STATUS', entity: 'branches', entityId: id, previousValue: { status: branch.status }, newValue: { status: newStatus } });
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
      throw err;
    }
  }

  private async countFacilityBookings(f: { name: string; branchName?: string }, id: string): Promise<number> {
    const r = await executeQuery<any>(
      `SELECT COUNT(*) AS cnt FROM bookings WHERE facility_id = ? OR (LOWER(facility) = LOWER(?) AND LOWER(branch) = LOWER(?))`,
      [id, f.name, f.branchName || '']
    );
    return Number(r[0]?.cnt || 0);
  }

  public async createFacility(data: { name: string; branchId: string; defaultPrice?: number; capacity?: number; status?: 'Active' | 'Inactive' }, actor = 'System'): Promise<Facility> {
    const name = cleanText(data?.name, { label: 'Facility name', min: 2, max: 100, required: true })!;
    const status = cleanStatus(data?.status) ?? 'Active';
    const defaultPrice = cleanNonNegativeNumber(data?.defaultPrice, 'Default price', { max: 1e9 }) ?? 0;
    const capacity = cleanNonNegativeNumber(data?.capacity, 'Capacity', { integer: true, max: 100000 }) ?? 0;
    const branch = typeof data?.branchId === 'string' ? await this.getBranchById(data.branchId) : undefined;
    if (!branch) throw badRequest('Select a valid branch for this facility.');
    if (branch.status !== 'Active') throw badRequest('Facilities can only be added to an active branch.');
    const dup = await executeQuery<any>(`SELECT id FROM facilities WHERE branch_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`, [branch.id, name]);
    if (dup.length > 0) throw conflict(`${branch.name} already has a facility named "${name}".`);
    const createdDate = new Date().toISOString().split('T')[0];

    const id = await insertWithGeneratedId('FAC', 'facilities', async (newId) => {
      await executeQuery(
        `INSERT INTO facilities (id, name, branch_id, branch_name, default_price, capacity, status, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, name, branch.id, branch.name, defaultPrice, capacity, status, createdDate]
      );
    });
    const created: Facility = { id, name, branchId: branch.id, branchName: branch.name, defaultPrice, capacity, status, createdDate };
    auditRepository.logAction({ user: actor, action: 'CREATE_FACILITY', entity: 'facilities', entityId: id, newValue: created });
    return created;
  }

  public async updateFacility(id: string, updates: Partial<Facility>, actor = 'System'): Promise<Facility | null> {
    const current = (await this.getFacilities()).find((f) => f.id === id);
    if (!current) return null;

    const name = cleanText(updates?.name, { label: 'Facility name', min: 2, max: 100 });
    if (updates?.name !== undefined && name === '') throw badRequest('Facility name is required.');
    const status = cleanStatus(updates?.status);
    const defaultPrice = cleanNonNegativeNumber(updates?.defaultPrice, 'Default price', { max: 1e9 });
    const capacity = cleanNonNegativeNumber(updates?.capacity, 'Capacity', { integer: true, max: 100000 });

    let targetBranch = { id: current.branchId, name: current.branchName };
    if (updates?.branchId && updates.branchId !== current.branchId) {
      const b = await this.getBranchById(updates.branchId);
      if (!b) throw badRequest('Select a valid branch for this facility.');
      if (b.status !== 'Active') throw badRequest('Facilities can only be moved to an active branch.');
      if ((await this.countFacilityBookings(current, id)) > 0) {
        throw conflict('This facility has booking history and cannot be moved to another branch. Create a new facility there instead.');
      }
      targetBranch = { id: b.id, name: b.name };
    }
    const finalName = name ?? current.name;
    if (finalName.toLowerCase() !== current.name.toLowerCase() || targetBranch.id !== current.branchId) {
      const dup = await executeQuery<any>(`SELECT id FROM facilities WHERE branch_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1`, [targetBranch.id, finalName, id]);
      if (dup.length > 0) throw conflict(`${targetBranch.name} already has a facility named "${finalName}".`);
    }

    await executeTransaction(async (conn) => {
      await conn.execute(
        `UPDATE facilities SET name = ?, branch_id = ?, branch_name = ?, default_price = ?, capacity = ?, status = ? WHERE id = ?`,
        [finalName, targetBranch.id, targetBranch.name, defaultPrice ?? current.defaultPrice ?? 0, capacity ?? current.capacity ?? 0, status ?? current.status, id]
      );
      // Bookings reference the facility by name: carry a rename along so history stays attached.
      if (finalName !== current.name) {
        await conn.execute(`UPDATE bookings SET facility = ? WHERE facility_id = ? OR (LOWER(facility) = LOWER(?) AND LOWER(branch) = LOWER(?))`, [finalName, id, current.name, current.branchName || '']);
      }
    });

    const updated = (await this.getFacilities()).find((f) => f.id === id) || null;
    if (updated) auditRepository.logAction({ user: actor, action: 'UPDATE_FACILITY', entity: 'facilities', entityId: id, previousValue: current, newValue: updated });
    return updated;
  }

  public async deleteFacility(id: string, actor = 'System'): Promise<boolean> {
    const deleted = (await this.getFacilities()).find((f) => f.id === id);
    if (!deleted) return false;
    const n = await this.countFacilityBookings(deleted, id);
    if (n > 0) {
      throw conflict(`"${deleted.name}" has ${n} booking${n === 1 ? '' : 's'} and cannot be deleted. Deactivate it instead to keep your history intact.`);
    }
    await executeQuery(`DELETE FROM facilities WHERE id = ?`, [id]);
    auditRepository.logAction({ user: actor, action: 'DELETE_FACILITY', entity: 'facilities', entityId: id, previousValue: deleted });
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
      throw err;
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
      throw err;
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
