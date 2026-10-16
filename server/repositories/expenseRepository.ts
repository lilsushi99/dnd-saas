import { cleanColor, cleanStatus, cleanText, pickDefaultColor, DEFAULT_CATEGORY_COLOR } from '../domain/masterData';
import { badRequest, conflict } from '../domain/errors';
import { insertWithGeneratedId } from '../database/ids';
import { Expense, ExpenseFilters, ExpenseSummaryMetrics, ExpenseCategory } from '../../src/types';
import { executeQuery, executeTransaction } from '../database/db';
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

export class ExpenseRepository {
  // --- CATEGORIES MANAGEMENT ---
  public async getCategories(): Promise<ExpenseCategory[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, description, color, status, created_date as createdDate FROM expense_categories ORDER BY id ASC`
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        color: r.color || DEFAULT_CATEGORY_COLOR,
        status: (r.status || 'Active') as 'Active' | 'Inactive',
        createdDate: formatDateToISO(r.createdDate) || new Date().toISOString().split('T')[0],
      }));
    } catch (err) {
      console.error('Error fetching expense categories:', err);
      throw err;
    }
  }

  private async assertCategoryNameFree(name: string, exceptId?: string) {
    const dup = await executeQuery<any>(`SELECT id FROM expense_categories WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1`, [name, exceptId || '']);
    if (dup.length > 0) throw conflict(`A category named "${name}" already exists.`);
  }

  public async createCategory(data: { name: string; description?: string; color?: string; status?: 'Active' | 'Inactive' }, actor = 'System'): Promise<ExpenseCategory> {
    const name = cleanText(data?.name, { label: 'Category name', min: 2, max: 100, required: true })!;
    const description = cleanText(data?.description, { label: 'Description', max: 500 }) ?? '';
    const status = cleanStatus(data?.status) ?? 'Active';
    await this.assertCategoryNameFree(name);
    const existing = await this.getCategories();
    const color = cleanColor(data?.color) ?? pickDefaultColor(existing.map((c) => c.color || ''));
    const createdDate = new Date().toISOString().split('T')[0];

    const id = await insertWithGeneratedId('EC', 'expense_categories', async (newId) => {
      await executeQuery(
        `INSERT INTO expense_categories (id, name, description, color, status, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, name, description, color, status, createdDate]
      );
    });
    const created: ExpenseCategory = { id, name, description, color, status, createdDate };
    auditRepository.logAction({ user: actor, action: 'CREATE_EXPENSE_CATEGORY', entity: 'expense_categories', entityId: id, newValue: created });
    return created;
  }

  public async updateCategory(id: string, updates: Partial<ExpenseCategory>, actor = 'System'): Promise<ExpenseCategory | null> {
    const current = (await this.getCategories()).find((c) => c.id === id);
    if (!current) return null;

    const name = cleanText(updates?.name, { label: 'Category name', min: 2, max: 100 });
    if (updates?.name !== undefined && name === '') throw badRequest('Category name is required.');
    const description = cleanText(updates?.description, { label: 'Description', max: 500 });
    const color = cleanColor(updates?.color);
    const status = cleanStatus(updates?.status);
    if (name && name.toLowerCase() !== current.name.toLowerCase()) await this.assertCategoryNameFree(name, id);

    const sets: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (color !== undefined) { sets.push('color = ?'); params.push(color); }
    if (status !== undefined) { sets.push('status = ?'); params.push(status); }

    if (sets.length > 0) {
      await executeTransaction(async (conn) => {
        await conn.execute(`UPDATE expense_categories SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
        // Expenses reference their category by name, so a rename must carry them along or history is orphaned.
        if (name && name !== current.name) {
          await conn.execute(`UPDATE expenses SET category = ? WHERE category_id = ? OR LOWER(category) = LOWER(?)`, [name, id, current.name]);
          await conn.execute(`UPDATE expenses SET category_id = ? WHERE category_id IS NULL AND LOWER(category) = LOWER(?)`, [id, name]);
        }
      });
    }

    const updated = (await this.getCategories()).find((c) => c.id === id) || null;
    if (updated) auditRepository.logAction({ user: actor, action: 'UPDATE_EXPENSE_CATEGORY', entity: 'expense_categories', entityId: id, previousValue: current, newValue: updated });
    return updated;
  }

  public async deleteCategory(id: string, actor = 'System'): Promise<boolean> {
    const deleted = (await this.getCategories()).find((c) => c.id === id);
    if (!deleted) return false;

    const used = await executeQuery<any>(`SELECT COUNT(*) AS cnt FROM expenses WHERE category_id = ? OR LOWER(category) = LOWER(?)`, [id, deleted.name]);
    const n = Number(used[0]?.cnt || 0);
    if (n > 0) {
      throw conflict(`"${deleted.name}" is used by ${n} expense record${n === 1 ? '' : 's'} and cannot be deleted. Deactivate it instead to keep your history intact.`);
    }
    await executeQuery(`DELETE FROM expense_categories WHERE id = ?`, [id]);
    auditRepository.logAction({ user: actor, action: 'DELETE_EXPENSE_CATEGORY', entity: 'expense_categories', entityId: id, previousValue: deleted });
    return true;
  }

  // --- EXPENSE RECORDS MANAGEMENT ---
  public async getAllExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, name, amount, date, branch, category, description, status, created_by as createdBy, created_at as createdAt FROM expenses ORDER BY date DESC`
      );

      let list: Expense[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        amount: Number(r.amount || 0),
        date: formatDateToISO(r.date),
        branch: r.branch || '',
        category: r.category || '',
        description: r.description || '',
        status: (r.status || 'Paid') as 'Paid' | 'Pending',
        createdBy: r.createdBy || 'Admin',
        createdAt: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt)) : new Date().toISOString(),
      }));

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (e) =>
            e.id.toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            (e.description && e.description.toLowerCase().includes(q)) ||
            (e.createdBy && e.createdBy.toLowerCase().includes(q))
        );
      }

      if (filters?.branch && filters.branch !== 'all') {
        const bLower = filters.branch.toLowerCase();
        list = list.filter((e) => {
          const eBranch = e.branch.toLowerCase();
          if (eBranch === bLower) return true;
          if (eBranch === 'both branches' || eBranch === 'all branches') {
            return true;
          }
          return false;
        });
      }

      if (filters?.category && filters.category !== 'all') {
        list = list.filter((e) => e.category.toLowerCase() === filters.category!.toLowerCase());
      }

      if (filters?.dateFilter) {
        const timezone = await this.getBusinessTimezone();
        let todayStr = new Date().toISOString().substring(0, 10);
        try {
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          todayStr = formatter.format(new Date());
        } catch (e) {}
        const todayDate = new Date(todayStr);

        switch (filters.dateFilter) {
          case 'today':
            list = list.filter((e) => e.date === todayStr);
            break;
          case 'last_7_days': {
            const sevenDaysAgo = new Date(todayDate);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            list = list.filter((e) => {
              const d = new Date(e.date);
              return d >= sevenDaysAgo && d <= todayDate;
            });
            break;
          }
          case 'this_month': {
            const monthStr = todayStr.substring(0, 7);
            list = list.filter((e) => e.date.startsWith(monthStr));
            break;
          }
          case 'last_12_months': {
            const twelveMonthsAgo = new Date(todayDate);
            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
            list = list.filter((e) => {
              const d = new Date(e.date);
              return d >= twelveMonthsAgo && d <= todayDate;
            });
            break;
          }
          case 'custom': {
            if (filters.startDate) {
              list = list.filter((e) => e.date >= filters.startDate!);
            }
            if (filters.endDate) {
              list = list.filter((e) => e.date <= filters.endDate!);
            }
            break;
          }
          default:
            if (filters.month && filters.month !== 'all') {
              list = list.filter((e) => e.date.startsWith(filters.month!));
            }
            break;
        }
      } else if (filters?.month && filters.month !== 'all') {
        list = list.filter((e) => e.date.startsWith(filters.month!));
      }

      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return list;
    } catch (err) {
      console.error('Error fetching expenses:', err);
      throw err;
    }
  }

  public async getExpenseById(id: string): Promise<Expense | null> {
    const expenses = await this.getAllExpenses();
    return expenses.find((e) => e.id === id) || null;
  }

  public async createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'createdBy' | 'status'> & { createdBy?: string }): Promise<Expense> {
    const all = await this.getAllExpenses();
    const count = all.length + 1;
    const year = new Date().getFullYear();
    if (data.branch && !['both branches', 'all branches'].includes(data.branch.trim().toLowerCase())) {
      const branchRows = await executeQuery<any>(
        `SELECT id, name, status FROM branches WHERE LOWER(id) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1`,
        [data.branch, data.branch]
      );
      if (branchRows.length > 0 && branchRows[0].status === 'Inactive') {
        throw new Error(`Cannot create expense for deactivated branch "${branchRows[0].name}".`);
      }
    }

    const newExpense: Expense = {
      id: newId,
      name: data.name,
      amount: Number(data.amount),
      date: data.date,
      branch: data.branch,
      category: data.category || '',
      description: data.description || '',
      status: 'Paid',
      createdBy: data.createdBy || 'Admin',
      createdAt: new Date().toISOString(),
    };

    await executeQuery(
      `INSERT INTO expenses (id, name, amount, date, branch, category, description, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newExpense.id,
        newExpense.name,
        newExpense.amount,
        newExpense.date,
        newExpense.branch,
        newExpense.category,
        newExpense.description,
        newExpense.status,
        newExpense.createdBy,
        newExpense.createdAt.replace('T', ' ').replace('Z', ''),
      ]
    );

    auditRepository.logAction({
      user: newExpense.createdBy,
      action: 'CREATE_EXPENSE',
      entity: 'expenses',
      entityId: newExpense.id,
      newValue: newExpense,
    });

    return newExpense;
  }

  public async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    await executeQuery(
      `UPDATE expenses SET name = COALESCE(?, name), amount = COALESCE(?, amount), category = COALESCE(?, category), branch = COALESCE(?, branch), description = COALESCE(?, description), date = COALESCE(?, date) WHERE id = ?`,
      [
        updates.name || null,
        updates.amount !== undefined ? Number(updates.amount) : null,
        updates.category || null,
        updates.branch || null,
        updates.description || null,
        updates.date || null,
        id,
      ]
    );

    const updated = await this.getExpenseById(id);
    if (updated) {
      auditRepository.logAction({
        user: 'System Admin',
        action: 'UPDATE_EXPENSE',
        entity: 'expenses',
        entityId: id,
        newValue: updated,
      });
    }
    return updated || null;
  }

  public async getBusinessTimezone(): Promise<string> {
    try {
      const rows = await executeQuery<any>(`SELECT timezone FROM business_settings LIMIT 1`);
      return rows[0]?.timezone || 'UTC';
    } catch (e) {
      return 'UTC';
    }
  }

  public async deleteExpense(id: string): Promise<boolean> {
    const existing = await this.getExpenseById(id);
    if (!existing) return false;

    await executeQuery(`DELETE FROM expenses WHERE id = ?`, [id]);

    auditRepository.logAction({
      user: 'System Admin',
      action: 'DELETE_EXPENSE',
      entity: 'expenses',
      entityId: id,
      previousValue: existing,
    });

    return true;
  }

  public async getSummaryMetrics(filters?: ExpenseFilters): Promise<ExpenseSummaryMetrics> {
    const isSingleBranch = filters?.branch && filters.branch !== 'all' && filters.branch.toLowerCase() !== 'both branches';

    const todayExpensesList = await this.getAllExpenses({ ...filters, dateFilter: 'today' });
    const todaysExpenses = todayExpensesList.reduce((sum, e) => {
      const isSplit = e.branch.toLowerCase() === 'both branches' || e.branch.toLowerCase() === 'all branches';
      if (isSingleBranch && isSplit) {
        return sum + Number(e.amount) / 2;
      }
      return sum + Number(e.amount);
    }, 0);

    const allList = await this.getAllExpenses({ branch: filters?.branch, category: filters?.category });
    const uniqueMonths = new Set(allList.map((e) => e.date.substring(0, 7)));
    const totalAllExpenses = allList.reduce((sum, e) => {
      const isSplit = e.branch.toLowerCase() === 'both branches' || e.branch.toLowerCase() === 'all branches';
      if (isSingleBranch && isSplit) {
        return sum + Number(e.amount) / 2;
      }
      return sum + Number(e.amount);
    }, 0);
    const monthCount = Math.max(1, uniqueMonths.size);
    const averageMonthlyExpenses = Math.round(totalAllExpenses / monthCount);

    const filteredList = await this.getAllExpenses(filters);
    const totalExpenses = filteredList.reduce((sum, e) => {
      const isSplit = e.branch.toLowerCase() === 'both branches' || e.branch.toLowerCase() === 'all branches';
      if (isSingleBranch && isSplit) {
        return sum + Number(e.amount) / 2;
      }
      return sum + Number(e.amount);
    }, 0);

    // Business rule: Payroll processing module is not yet operational.
    // Ordinary expenses or payroll-labeled categories must not masquerade as payroll processing.
    // Payroll metric is set to 0 with a 'Coming Soon' indicator.
    const payrollExpenses = 0;

    return {
      todaysExpenses,
      averageMonthlyExpenses,
      totalExpenses,
      payrollExpenses,
    };
  }
}
