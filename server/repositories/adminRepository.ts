import { cleanNonNegativeNumber, cleanStatus, cleanText } from '../domain/masterData';
import { badRequest, conflict } from '../domain/errors';
import { insertWithGeneratedId } from '../database/ids';
import { Branch, Facility, AdminUser, RolePermission, ImportSpreadsheetRow, ImportResultSummary } from '../../src/types';
import { executeQuery, executeTransaction } from '../database/db';
import { auditRepository } from './auditRepository';
import { DEFAULT_ROLE_PERMISSIONS } from '../middleware/auth';

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

  public async countBranchDependencies(id: string, branchName: string): Promise<{
    facilities: number;
    bookings: number;
    expenses: number;
    users: number;
    total: number;
  }> {
    const [facRows, bkRows, expRows, usrRows] = await Promise.all([
      executeQuery<any>(`SELECT COUNT(*) AS cnt FROM facilities WHERE branch_id = ? OR LOWER(branch_name) = LOWER(?)`, [id, branchName]),
      executeQuery<any>(`SELECT COUNT(*) AS cnt FROM bookings WHERE branch_id = ? OR LOWER(branch) = LOWER(?)`, [id, branchName]),
      executeQuery<any>(`SELECT COUNT(*) AS cnt FROM expenses WHERE branch_id = ? OR LOWER(branch) = LOWER(?)`, [id, branchName]),
      executeQuery<any>(`SELECT COUNT(*) AS cnt FROM users WHERE branch_id = ? OR LOWER(branch) = LOWER(?)`, [id, branchName]),
    ]);
    const facilities = Number(facRows[0]?.cnt || 0);
    const bookings = Number(bkRows[0]?.cnt || 0);
    const expenses = Number(expRows[0]?.cnt || 0);
    const users = Number(usrRows[0]?.cnt || 0);
    return {
      facilities,
      bookings,
      expenses,
      users,
      total: facilities + bookings + expenses + users,
    };
  }

  public async deleteBranch(id: string, actor = 'System'): Promise<boolean> {
    const branch = await this.getBranchById(id);
    if (!branch) return false;

    const deps = await this.countBranchDependencies(id, branch.name);
    if (deps.total > 0) {
      const parts: string[] = [];
      if (deps.facilities > 0) parts.push(`${deps.facilities} facilit${deps.facilities === 1 ? 'y' : 'ies'}`);
      if (deps.bookings > 0) parts.push(`${deps.bookings} booking${deps.bookings === 1 ? '' : 's'}`);
      if (deps.expenses > 0) parts.push(`${deps.expenses} expense${deps.expenses === 1 ? '' : 's'}`);
      if (deps.users > 0) parts.push(`${deps.users} assigned user${deps.users === 1 ? '' : 's'}`);

      throw conflict(
        `"${branch.name}" has ${parts.join(', ')} and cannot be permanently deleted. Deactivate it instead to keep historical records intact.`
      );
    }

    await executeQuery(`DELETE FROM branches WHERE id = ?`, [id]);
    auditRepository.logAction({
      user: actor,
      action: 'DELETE_BRANCH',
      entity: 'branches',
      entityId: id,
      previousValue: branch,
    });
    return true;
  }

  // --- FACILITIES ---
  public async getFacilities(): Promise<Facility[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, branch_id as branchId, branch_name as branchName, default_price as defaultPrice, capacity, status, created_date as createdDate, pricing_basis as pricingBasis FROM facilities ORDER BY created_at DESC`
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
        pricingBasis: (r.pricingBasis === 'Per Hour' ? 'Per Hour' : 'Per Day') as 'Per Hour' | 'Per Day',
      }));
    } catch (err) {
      console.error('Error fetching facilities:', err);
      throw err;
    }
  }

  private async countFacilityDependencies(f: { name: string; branchName?: string }, id: string): Promise<number> {
    const [bk, sub] = await Promise.all([
      executeQuery<any>(
        `SELECT COUNT(*) AS cnt FROM bookings WHERE facility_id = ? OR (LOWER(facility) = LOWER(?) AND LOWER(branch) = LOWER(?))`,
        [id, f.name, f.branchName || '']
      ),
      executeQuery<any>(
        `SELECT COUNT(*) AS cnt FROM subscriptions WHERE facility_id = ? OR LOWER(facility_name) = LOWER(?)`,
        [id, f.name]
      ),
    ]);
    return Number(bk[0]?.cnt || 0) + Number(sub[0]?.cnt || 0);
  }

  public async createFacility(data: { name: string; branchId: string; defaultPrice?: number; capacity?: number; status?: 'Active' | 'Inactive'; pricingBasis?: 'Per Hour' | 'Per Day' }, actor = 'System'): Promise<Facility> {
    const name = cleanText(data?.name, { label: 'Facility name', min: 2, max: 100, required: true })!;
    const status = cleanStatus(data?.status) ?? 'Active';
    const defaultPrice = cleanNonNegativeNumber(data?.defaultPrice, 'Default price', { max: 1e9 }) ?? 0;
    const capacity = cleanNonNegativeNumber(data?.capacity, 'Capacity', { integer: true, max: 100000 }) ?? 0;
    const pricingBasis = data?.pricingBasis === 'Per Hour' ? 'Per Hour' : 'Per Day';
    const branch = typeof data?.branchId === 'string' ? await this.getBranchById(data.branchId) : undefined;
    if (!branch) throw badRequest('Select a valid branch for this facility.');
    if (branch.status !== 'Active') throw badRequest('Facilities can only be added to an active branch.');
    const dup = await executeQuery<any>(`SELECT id FROM facilities WHERE branch_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`, [branch.id, name]);
    if (dup.length > 0) throw conflict(`${branch.name} already has a facility named "${name}".`);
    const createdDate = new Date().toISOString().split('T')[0];

    const id = await insertWithGeneratedId('FAC', 'facilities', async (newId) => {
      await executeQuery(
        `INSERT INTO facilities (id, name, branch_id, branch_name, default_price, capacity, status, created_date, pricing_basis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, name, branch.id, branch.name, defaultPrice, capacity, status, createdDate, pricingBasis]
      );
    });
    const created: Facility = { id, name, branchId: branch.id, branchName: branch.name, defaultPrice, capacity, status, createdDate, pricingBasis };
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
    const pricingBasis = updates?.pricingBasis ? (updates.pricingBasis === 'Per Hour' ? 'Per Hour' : 'Per Day') : (current.pricingBasis || 'Per Day');

    let targetBranch = { id: current.branchId, name: current.branchName };
    if (updates?.branchId && updates.branchId !== current.branchId) {
      const b = await this.getBranchById(updates.branchId);
      if (!b) throw badRequest('Select a valid branch for this facility.');
      if (b.status !== 'Active') throw badRequest('Facilities can only be moved to an active branch.');
      if ((await this.countFacilityDependencies(current, id)) > 0) {
        throw conflict('This facility has historical booking/subscription records and cannot be moved to another branch. Create a new facility there instead.');
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
        `UPDATE facilities SET name = ?, branch_id = ?, branch_name = ?, default_price = ?, capacity = ?, status = ?, pricing_basis = ? WHERE id = ?`,
        [finalName, targetBranch.id, targetBranch.name, defaultPrice ?? current.defaultPrice ?? 0, capacity ?? current.capacity ?? 0, status ?? current.status, pricingBasis, id]
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
    const n = await this.countFacilityDependencies(deleted, id);
    if (n > 0) {
      throw conflict(`"${deleted.name}" has ${n} historical booking/subscription record${n === 1 ? '' : 's'} and cannot be deleted. Deactivate it instead to keep your history intact.`);
    }
    await executeQuery(`DELETE FROM facilities WHERE id = ?`, [id]);
    auditRepository.logAction({ user: actor, action: 'DELETE_FACILITY', entity: 'facilities', entityId: id, previousValue: deleted });
    return true;
  }

  // --- USERS & ROLES ---
  public async getUsers(): Promise<AdminUser[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, email, role, branch, branch_id as branchId, profile_photo as profilePhoto, status, created_at as createdAt FROM users ORDER BY created_at DESC`
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        branch: r.branch || 'All Branches',
        branchId: r.branchId || null,
        profilePhoto: r.profilePhoto || null,
        status: (r.status || 'Active') as 'Active' | 'Inactive',
        createdAt: r.createdAt ? String(r.createdAt).substring(0, 10) : new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Error fetching users:', err);
      throw err;
    }
  }

  private async assertEmailFree(email: string, exceptId?: string) {
    const dup = await executeQuery<any>(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1`, [email, exceptId || '']);
    if (dup.length > 0) throw conflict(`A user with email "${email}" already exists.`);
  }

  private async resolveBranchInfo(branchNameOrId?: string): Promise<{ branchId: string | null; branchName: string }> {
    if (!branchNameOrId || branchNameOrId.trim() === '' || branchNameOrId.trim().toLowerCase() === 'all branches') {
      return { branchId: null, branchName: 'All Branches' };
    }
    const b = branchNameOrId.trim();
    const rows = await executeQuery<any>(`SELECT id, name FROM branches WHERE id = ? OR LOWER(name) = LOWER(?) LIMIT 1`, [b, b]);
    if (rows && rows.length > 0) {
      return { branchId: rows[0].id, branchName: rows[0].name };
    }
    return { branchId: null, branchName: b };
  }

  public async createUser(data: Omit<AdminUser, 'id' | 'createdAt'>, actor = 'System'): Promise<AdminUser> {
    const name = cleanText(data?.name, { label: 'User name', min: 2, max: 100, required: true })!;
    const email = cleanText(data?.email, { label: 'Email', min: 5, max: 150, required: true })!.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw badRequest('Please enter a valid work email address.');
    }
    await this.assertEmailFree(email);

    const validRoles = ['Director', 'Manager', 'Receptionist', 'Accountant'];
    const role = (validRoles.includes(data?.role) ? data.role : 'Manager') as AdminUser['role'];
    const status = cleanStatus(data?.status) ?? 'Active';
    const { branchId, branchName } = await this.resolveBranchInfo(data?.branch);
    const createdAt = new Date().toISOString().split('T')[0];

    const id = await insertWithGeneratedId('USR', 'users', async (newId) => {
      await executeQuery(
        `INSERT INTO users (id, name, email, phone, password_hash, role, branch_id, branch, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          name,
          email,
          null,
          '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a',
          role,
          branchId,
          branchName,
          status,
          createdAt,
        ]
      );
    });

    const newUser: AdminUser = {
      id,
      name,
      email,
      role,
      branch: branchName,
      branchId,
      status,
      createdAt,
    };

    auditRepository.logAction({
      user: actor,
      action: 'CREATE_USER',
      entity: 'users',
      entityId: id,
      newValue: newUser,
    });

    return newUser;
  }

  public async updateUser(
    id: string,
    updates: Partial<AdminUser>,
    actor = 'System',
    actorId?: string
  ): Promise<AdminUser | null> {
    const currentRows = await executeQuery<any>(
      `SELECT id, name, email, role, branch, branch_id AS branchId, status FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    const current = currentRows[0];
    if (!current) return null;

    let newName = current.name;
    if (updates.name !== undefined) {
      newName = cleanText(updates.name, { label: 'User name', min: 2, max: 100, required: true })!;
    }

    let newEmail = current.email;
    if (updates.email !== undefined) {
      newEmail = cleanText(updates.email, { label: 'Email', min: 5, max: 150, required: true })!.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw badRequest('Please enter a valid work email address.');
      }
      if (newEmail !== current.email.toLowerCase()) {
        await this.assertEmailFree(newEmail, id);
      }
    }

    let newRole = current.role;
    if (updates.role !== undefined) {
      const validRoles = ['Director', 'Manager', 'Receptionist', 'Accountant'];
      if (!validRoles.includes(updates.role)) throw badRequest('Invalid role specified.');
      newRole = updates.role;
    }

    let newStatus = current.status;
    if (updates.status !== undefined) {
      newStatus = cleanStatus(updates.status) ?? current.status;
    }

    // Safety checks on deactivation and demotion
    if (newStatus === 'Inactive' && current.status === 'Active') {
      if (actorId && actorId === id) {
        throw badRequest('You cannot deactivate your own account.');
      }
      if (current.role === 'Director') {
        const activeDirs = await executeQuery<any>(
          `SELECT COUNT(*) AS cnt FROM users WHERE role = 'Director' AND status = 'Active'`
        );
        if (Number(activeDirs[0]?.cnt || 0) <= 1) {
          throw badRequest('Cannot deactivate the last active Director account. Doing so would lock out the organization.');
        }
      }
    }

    if (newRole !== 'Director' && current.role === 'Director' && current.status === 'Active') {
      const activeDirs = await executeQuery<any>(
        `SELECT COUNT(*) AS cnt FROM users WHERE role = 'Director' AND status = 'Active'`
      );
      if (Number(activeDirs[0]?.cnt || 0) <= 1) {
        throw badRequest('Cannot reassign the last active Director account. Doing so would lock out the organization.');
      }
    }

    let branchId = current.branchId;
    let branchName = current.branch;
    if (updates.branch !== undefined) {
      const resolved = await this.resolveBranchInfo(updates.branch);
      branchId = resolved.branchId;
      branchName = resolved.branchName;
    }

    await executeQuery(
      `UPDATE users SET name = ?, email = ?, role = ?, branch_id = ?, branch = ?, status = ? WHERE id = ?`,
      [newName, newEmail, newRole, branchId, branchName, newStatus, id]
    );

    const updated: AdminUser = {
      id,
      name: newName,
      email: newEmail,
      role: newRole,
      branch: branchName,
      branchId,
      status: newStatus,
      createdAt: current.created_at ? String(current.created_at).substring(0, 10) : new Date().toISOString().split('T')[0],
    };

    auditRepository.logAction({
      user: actor,
      action: 'UPDATE_USER',
      entity: 'users',
      entityId: id,
      previousValue: current,
      newValue: updated,
    });

    return updated;
  }

  public async toggleUserStatus(id: string, actor = 'System', actorId?: string): Promise<AdminUser | null> {
    const currentRows = await executeQuery<any>(
      `SELECT id, name, email, role, branch, branch_id AS branchId, status FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    const user = currentRows[0];
    if (!user) return null;

    if (actorId && actorId === id) {
      throw badRequest('You cannot deactivate your own account.');
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';

    if (user.role === 'Director' && newStatus === 'Inactive') {
      const activeDirs = await executeQuery<any>(
        `SELECT COUNT(*) AS cnt FROM users WHERE role = 'Director' AND status = 'Active'`
      );
      if (Number(activeDirs[0]?.cnt || 0) <= 1) {
        throw badRequest('Cannot deactivate the last active Director account. Doing so would lock out the organization.');
      }
    }

    await executeQuery(`UPDATE users SET status = ? WHERE id = ?`, [newStatus, id]);

    const updated: AdminUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch || 'All Branches',
      branchId: user.branchId || null,
      status: newStatus,
      createdAt: user.created_at ? String(user.created_at).substring(0, 10) : new Date().toISOString().split('T')[0],
    };

    auditRepository.logAction({
      user: actor,
      action: 'TOGGLE_USER_STATUS',
      entity: 'users',
      entityId: id,
      previousValue: { status: user.status },
      newValue: { status: newStatus },
    });

    return updated;
  }

  public async getRolesPermissions(): Promise<RolePermission[]> {
    try {
      const STANDARD_ROLES: Array<'Director' | 'Manager' | 'Receptionist' | 'Accountant'> = ['Director', 'Manager', 'Receptionist', 'Accountant'];
      const rows = await executeQuery<any>(`SELECT role, permissions FROM user_roles_permissions`);
      const map = new Map<string, any>();
      for (const r of rows) {
        let perms = r.permissions;
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch (e) {}
        }
        map.set(r.role, perms);
      }

      const result: RolePermission[] = [];
      for (const role of STANDARD_ROLES) {
        let perms = map.get(role);
        if (!perms) {
          perms = { ...DEFAULT_ROLE_PERMISSIONS[role] };
          await executeQuery(`INSERT INTO user_roles_permissions (role, permissions) VALUES (?, ?)`, [role, JSON.stringify(perms)]).catch(() => {});
        }
        result.push({
          role,
          permissions: perms,
        });
      }
      return result;
    } catch (err) {
      console.error('Error fetching roles permissions:', err);
      throw err;
    }
  }

  public async updateRolePermissions(
    role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant',
    permissions: RolePermission['permissions'],
    actor = 'System'
  ): Promise<RolePermission | null> {
    const jsonStr = JSON.stringify(permissions);

    const existing = await executeQuery<any>(`SELECT id, permissions FROM user_roles_permissions WHERE role = ? LIMIT 1`, [role]);
    if (existing && existing.length > 0) {
      await executeQuery(`UPDATE user_roles_permissions SET permissions = ? WHERE role = ?`, [jsonStr, role]);
    } else {
      await executeQuery(`INSERT INTO user_roles_permissions (role, permissions) VALUES (?, ?)`, [role, jsonStr]);
    }

    auditRepository.logAction({
      user: actor,
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
