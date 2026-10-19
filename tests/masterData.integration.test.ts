/**
 * Stage 2 integration tests: migrations, expense categories (+colour), branches, facilities.
 * Real MariaDB/MySQL, real Express app. DB_NAME must end in "_test".
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import { createApiApp } from '../server/app';
import config from '../server/config/config';
import { checkDbConnection, executeQuery, getPool, isUsingMemoryFallback } from '../server/database/db';
import { _resetLoginLimiterForTests } from '../server/controllers/authController';
import { MIGRATIONS, runMigrations } from '../server/database/migrations';
import { CATEGORY_PALETTE } from '../server/domain/masterData';

let server: Server;
let base = '';
let dbReady = false;
const PW = 'Correct-Horse-Battery-9';
let dir = '';
let rec = '';

async function api(method: string, path: string, opts: { token?: string; body?: any } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}
const login = async (email: string) => (await api('POST', '/api/auth/login', { body: { email, password: PW } })).json.token as string;

before(async () => {
  if (!/_test$/.test(config.db.name)) {
    dbReady = false;
    return;
  }
  const connected = await checkDbConnection();
  dbReady = connected && !isUsingMemoryFallback();
  if (!dbReady) return;
  for (const t of ['payments', 'booking_items', 'subscriptions', 'bookings', 'client_communications', 'clients', 'expenses', 'expense_categories', 'facilities', 'branches', 'users', 'audit_logs']) {
    await executeQuery(`DELETE FROM ${t}`);
  }
  await executeQuery(`DELETE FROM user_roles_permissions`);
  await checkDbConnection();
  const hash = await bcrypt.hash(PW, 4);
  await executeQuery(`INSERT INTO users (id,name,email,password_hash,role,branch,status) VALUES ('U-D','Dora Director','dir@t.local',?, 'Director','All Branches','Active'),('U-R','Rita Rec','rec@t.local',?, 'Receptionist','All Branches','Active')`, [hash, hash]);
  const app = createApiApp();
  await new Promise<void>((r) => { server = app.listen(0, '127.0.0.1', () => r()); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
  _resetLoginLimiterForTests();
  dir = await login('dir@t.local');
  rec = await login('rec@t.local');
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (dbReady) await getPool().end().catch(() => {});
});
const t2 = (name: string, fn: () => Promise<void>) => test(name, async (t) => { if (!dbReady) return t.skip('database unreachable'); await fn(); });

t2('migrations are tracked, idempotent and add the colour column', async () => {
  const applied = await executeQuery<any>(`SELECT id FROM schema_migrations ORDER BY id`);
  assert.deepEqual(applied.map((r) => r.id), MIGRATIONS.map((m) => m.id));
  const cols = await executeQuery<any>(`SHOW COLUMNS FROM expense_categories LIKE 'color'`);
  assert.equal(cols.length, 1);
  assert.deepEqual(await runMigrations(getPool() as any), [], 'a second run must be a no-op');
});

t2('migration 001 gives existing categories distinct colours without touching other data', async () => {
  await executeQuery(`INSERT INTO expense_categories (id,name,status,created_date) VALUES ('X-1','Legacy A','Active','2026-01-01'),('X-2','Legacy B','Active','2026-01-01')`);
  await executeQuery(`UPDATE expense_categories SET color = '#6B7280'`);
  await executeQuery(`DELETE FROM schema_migrations WHERE id = '${MIGRATIONS[0].id}'`);
  // simulate "column did not exist yet" by dropping it, as on a pre-migration production database
  await executeQuery(`ALTER TABLE expense_categories DROP COLUMN color`);
  const ran = await runMigrations(getPool() as any);
  assert.deepEqual(ran, [MIGRATIONS[0].id]);
  const rows = await executeQuery<any>(`SELECT id,name,color FROM expense_categories ORDER BY id`);
  assert.equal(rows.length, 2, 'no records lost');
  assert.deepEqual(rows.map((r) => r.color), [CATEGORY_PALETTE[0], CATEGORY_PALETTE[1]]);
  await executeQuery(`DELETE FROM expense_categories`);
});

t2('migration 002 backfills reference ids by exact name only and never invents matches', async () => {
  await executeQuery(`INSERT INTO branches (id,name,status,created_date) VALUES ('BR-001','Lekki Hub','Active','2026-01-01')`);
  await executeQuery(`INSERT INTO expense_categories (id,name,status,created_date) VALUES ('EC-001','Rent','Active','2026-01-01')`);
  await executeQuery(`INSERT INTO expenses (id,name,amount,date,branch,category,status) VALUES ('E-1','a',10,'2026-01-01','lekki hub','RENT','Paid'),('E-2','b',10,'2026-01-01','Lekki','Rent','Paid'),('E-3','c',10,'2026-01-01','Lekki Hub','Mystery','Paid')`);
  await executeQuery(`DELETE FROM schema_migrations WHERE id = '${MIGRATIONS[1].id}'`);
  assert.deepEqual(await runMigrations(getPool() as any), [MIGRATIONS[1].id]);
  const r = await executeQuery<any>(`SELECT id, branch_id, category_id FROM expenses ORDER BY id`);
  assert.deepEqual(r.map((x) => [x.branch_id, x.category_id]), [['BR-001', 'EC-001'], [null, 'EC-001'], ['BR-001', null]]);
  for (const t of ['expenses', 'expense_categories', 'branches']) await executeQuery(`DELETE FROM ${t}`);
});

t2('categories: create, colour, validation, duplicates', async () => {
  const a = await api('POST', '/api/expenses/categories', { token: dir, body: { name: '  Rent  ', description: 'Premises' } });
  assert.equal(a.status, 201);
  assert.equal(a.json.category.name, 'Rent');
  assert.equal(a.json.category.color, CATEGORY_PALETTE[0], 'auto-assigned distinct palette colour');
  const b = await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Utilities', color: '#ff00aa' } });
  assert.equal(b.json.category.color, '#FF00AA');
  const c = await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Marketing' } });
  assert.equal(c.json.category.color, CATEGORY_PALETTE[1], 'next unused palette colour');

  const list = (await api('GET', '/api/expenses/categories', { token: dir })).json.categories;
  assert.deepEqual(list.map((x: any) => [x.name, x.color]), [['Rent', CATEGORY_PALETTE[0]], ['Utilities', '#FF00AA'], ['Marketing', CATEGORY_PALETTE[1]]]);

  assert.equal((await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'rent' } })).status, 409, 'case-insensitive duplicate');
  assert.equal((await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'X' } })).status, 400);
  assert.equal((await api('POST', '/api/expenses/categories', { token: dir, body: {} })).status, 400);
  assert.equal((await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Bad Colour', color: 'red' } })).status, 400);
  assert.equal((await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Bad Colour', color: '#12345' } })).status, 400);
  assert.equal((await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Long', description: 'x'.repeat(501) } })).status, 400);
});

t2('categories: ids never collide after deletes, and parallel creates are safe', async () => {
  const mid = (await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Temp One' } })).json.category.id;
  await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Temp Two' } });
  assert.equal((await api('DELETE', `/api/expenses/categories/${mid}`, { token: dir })).status, 200);
  const after = await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Temp Three' } });
  assert.equal(after.status, 201, 'count-based ids would have collided here');
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => api('POST', '/api/expenses/categories', { token: dir, body: { name: `Parallel ${i}` } })));
  assert.ok(results.every((r) => r.status === 201), JSON.stringify(results.map((r) => r.status)));
  const ids = (await api('GET', '/api/expenses/categories', { token: dir })).json.categories.map((x: any) => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

t2('categories: rename carries expenses along; in-use delete is refused; deactivate keeps history', async () => {
  const cats = (await api('GET', '/api/expenses/categories', { token: dir })).json.categories;
  const rent = cats.find((x: any) => x.name === 'Rent');
  await executeQuery(`INSERT INTO expenses (id,name,amount,date,branch,category,status) VALUES ('E-10','Jan rent',500,'2026-01-05','Branch X','Rent','Paid')`);

  const renamed = await api('PUT', `/api/expenses/categories/${rent.id}`, { token: dir, body: { name: 'Premises Rent', color: '#112233', description: '' } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.category.description, '', 'description can be cleared');
  const e = await executeQuery<any>(`SELECT category, category_id FROM expenses WHERE id='E-10'`);
  assert.deepEqual([e[0].category, e[0].category_id], ['Premises Rent', rent.id]);

  const del = await api('DELETE', `/api/expenses/categories/${rent.id}`, { token: dir });
  assert.equal(del.status, 409);
  assert.match(del.json.error, /1 expense record/);
  const still = (await api('GET', '/api/expenses/categories', { token: dir })).json.categories.find((x: any) => x.id === rent.id);
  assert.equal(still.name, 'Premises Rent');

  const off = await api('PUT', `/api/expenses/categories/${rent.id}`, { token: dir, body: { status: 'Inactive' } });
  assert.equal(off.json.category.status, 'Inactive');
  assert.equal(off.json.category.color, '#112233', 'colour persisted across updates');
  assert.equal((await api('PUT', `/api/expenses/categories/${rent.id}`, { token: dir, body: { name: 'marketing' } })).status, 409, 'rename onto an existing name');
  assert.equal((await api('PUT', '/api/expenses/categories/EC-999', { token: dir, body: { name: 'Nope' } })).status, 404);
  assert.equal((await api('DELETE', '/api/expenses/categories/EC-999', { token: dir })).status, 404);
});

t2('categories: administration permission required; audit log records the real user', async () => {
  assert.equal((await api('POST', '/api/expenses/categories', { token: rec, body: { name: 'Sneaky' } })).status, 403);
  const created = await api('POST', '/api/expenses/categories', { token: dir, body: { name: 'Audited' } });
  await new Promise((r) => setTimeout(r, 300));
  const rows = await executeQuery<any>(`SELECT user, action FROM audit_logs WHERE entity_id = ? AND action = 'CREATE_EXPENSE_CATEGORY'`, [created.json.category.id]);
  assert.deepEqual(rows.map((r) => r.user), ['Dora Director']);
});

t2('branches: validation, uniqueness, ids and history-safe rename', async () => {
  assert.equal((await api('POST', '/api/admin/branches', { token: dir, body: { name: 'A', location: 'x', status: 'Active' } })).status, 400);
  assert.equal((await api('POST', '/api/admin/branches', { token: dir, body: { name: 'Lekki', location: 'Lagos', status: 'Open' } })).status, 400);
  const lekki = (await api('POST', '/api/admin/branches', { token: dir, body: { name: 'Lekki', location: 'Lagos', status: 'Active' } })).json.data;
  const vi = (await api('POST', '/api/admin/branches', { token: dir, body: { name: 'Victoria Island', location: 'Lagos', status: 'Active' } })).json.data;
  assert.notEqual(lekki.id, vi.id);
  assert.equal((await api('POST', '/api/admin/branches', { token: dir, body: { name: 'lekki', location: 'Lagos', status: 'Active' } })).status, 409);
  assert.equal((await api('PUT', `/api/admin/branches/${vi.id}`, { token: dir, body: { name: 'LEKKI' } })).status, 409);
  assert.equal((await api('PUT', '/api/admin/branches/BR-404', { token: dir, body: { name: 'Ghost' } })).status, 404);
  assert.equal((await api('POST', '/api/admin/branches', { token: rec, body: { name: 'Nope Branch', location: 'x' } })).status, 403);

  const fac = (await api('POST', '/api/admin/facilities', { token: dir, body: { name: 'Hot Desk', branchId: lekki.id, capacity: 20, defaultPrice: 5000, status: 'Active' } })).json.data;
  const today = new Date().toISOString().slice(0, 10);
  await executeQuery(`INSERT INTO clients (id,name,phone) VALUES ('C-1','Ann','1')`);
  await executeQuery(`INSERT INTO bookings (id,date,client_id,client_name,phone,branch,facility,days_count,amount,status) VALUES ('B-1',?,'C-1','Ann','1','Lekki','Hot Desk',1,1000,'Active')`, [today]);
  await executeQuery(`INSERT INTO expenses (id,name,amount,date,branch,category,status) VALUES ('E-20','x',200,?, 'Lekki','Misc','Paid')`, [today]);
  await executeQuery(`UPDATE users SET branch = 'Lekki', branch_id = ? WHERE id = 'U-R'`, [lekki.id]);

  const ren = await api('PUT', `/api/admin/branches/${lekki.id}`, { token: dir, body: { name: 'Lekki Innovation Hub' } });
  assert.equal(ren.status, 200);
  assert.equal((await executeQuery<any>(`SELECT branch FROM bookings WHERE id='B-1'`))[0].branch, 'Lekki Innovation Hub');
  assert.equal((await executeQuery<any>(`SELECT branch FROM expenses WHERE id='E-20'`))[0].branch, 'Lekki Innovation Hub');
  assert.equal((await executeQuery<any>(`SELECT branch_name FROM facilities WHERE id=?`, [fac.id]))[0].branch_name, 'Lekki Innovation Hub');
  assert.equal((await executeQuery<any>(`SELECT branch FROM users WHERE id='U-R'`))[0].branch, 'Lekki Innovation Hub');

  // The point of the cascade: reports still attribute the history to the renamed branch.
  const a = (await api('GET', `/api/finance/analytics?period=all&branch=${lekki.id}`, { token: dir })).json.analytics;
  assert.equal(a.totalRevenue, 1000);
  assert.equal(a.totalExpenses, 200);
  const all = (await api('GET', '/api/finance/analytics?period=all', { token: dir })).json.analytics;
  assert.deepEqual(all.branchPerformance.map((b: any) => b.branch).sort(), ['Lekki Innovation Hub', 'Victoria Island']);
});

t2('facilities: validation, relationships, history protection', async () => {
  const branches = (await api('GET', '/api/admin/branches', { token: dir })).json.data;
  const vi = branches.find((b: any) => b.name === 'Victoria Island');
  const lekki = branches.find((b: any) => b.name === 'Lekki Innovation Hub');
  const post = (body: any) => api('POST', '/api/admin/facilities', { token: dir, body });

  assert.equal((await post({ name: 'Room', branchId: 'BR-404', capacity: 5 })).status, 400, 'unknown branch');
  assert.equal((await post({ name: 'Room', capacity: 5 })).status, 400, 'missing branch');
  assert.equal((await post({ name: 'Room', branchId: vi.id, capacity: -1 })).status, 400);
  assert.equal((await post({ name: 'Room', branchId: vi.id, capacity: 2.5 })).status, 400);
  assert.equal((await post({ name: 'Room', branchId: vi.id, capacity: 5, defaultPrice: -10 })).status, 400);
  assert.equal((await post({ name: 'Hot Desk', branchId: lekki.id, capacity: 5 })).status, 409, 'duplicate in same branch');
  const same = await post({ name: 'Hot Desk', branchId: vi.id, capacity: 8 });
  assert.equal(same.status, 201, 'same name in another branch is fine');
  assert.equal(same.json.data.branchName, 'Victoria Island');

  await api('PATCH', `/api/admin/branches/${vi.id}/toggle-status`, { token: dir });
  assert.equal((await post({ name: 'Annex', branchId: vi.id, capacity: 5 })).status, 400, 'inactive branch');
  await api('PATCH', `/api/admin/branches/${vi.id}/toggle-status`, { token: dir });

  const hot = (await api('GET', '/api/admin/facilities', { token: dir })).json.data.find((f: any) => f.branchId === lekki.id);
  const cap = await api('PUT', `/api/admin/facilities/${hot.id}`, { token: dir, body: { capacity: 30 } });
  assert.equal(cap.json.data.capacity, 30);
  assert.equal(cap.json.data.name, 'Hot Desk', 'partial update leaves other fields alone');
  assert.equal((await api('PUT', `/api/admin/facilities/${hot.id}`, { token: dir, body: { branchId: vi.id } })).status, 409, 'cannot move a facility that has bookings');
  assert.equal((await api('DELETE', `/api/admin/facilities/${hot.id}`, { token: dir })).status, 409, 'cannot delete a facility that has bookings');

  const ren = await api('PUT', `/api/admin/facilities/${hot.id}`, { token: dir, body: { name: 'Co-working Desk' } });
  assert.equal(ren.status, 200);
  assert.equal((await executeQuery<any>(`SELECT facility FROM bookings WHERE id='B-1'`))[0].facility, 'Co-working Desk');

  const empty = same.json.data;
  assert.equal((await api('DELETE', `/api/admin/facilities/${empty.id}`, { token: dir })).status, 200, 'unused facility can be deleted');
  const again = await post({ name: 'After Delete', branchId: vi.id, capacity: 3 });
  assert.equal(again.status, 201, 'ids do not collide after a delete');
  assert.equal((await api('DELETE', '/api/admin/facilities/FAC-404', { token: dir })).status, 404);
});

t2('new branches/facilities flow into analytics and occupancy; capacity edits change occupancy', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const branches = (await api('GET', '/api/admin/branches', { token: dir })).json.data;
  const lekki = branches.find((b: any) => b.name === 'Lekki Innovation Hub');
  const before = (await api('GET', `/api/finance/analytics?period=this_month&branch=${lekki.id}`, { token: dir })).json.analytics;
  assert.equal(before.occupancyRate, 3.3, '1 booking / capacity 30');
  const fac = (await api('GET', '/api/admin/facilities', { token: dir })).json.data.find((f: any) => f.branchId === lekki.id);
  await api('PUT', `/api/admin/facilities/${fac.id}`, { token: dir, body: { capacity: 10 } });
  const after = (await api('GET', `/api/finance/analytics?period=this_month&branch=${lekki.id}`, { token: dir })).json.analytics;
  assert.equal(after.occupancyRate, 10, 'capacity change flows into occupancy');
  void today;
});

t2('analytics expense breakdown carries the category colour stored in the database', async () => {
  const cats = (await api('GET', '/api/expenses/categories', { token: dir })).json.categories;
  const audited = cats.find((c: any) => c.name === 'Audited');
  await api('PUT', `/api/expenses/categories/${audited.id}`, { token: dir, body: { color: '#0A0B0C' } });
  await executeQuery(`INSERT INTO expenses (id,name,amount,date,branch,category,status) VALUES ('E-30','colour',50,'2026-02-02','Victoria Island','Audited','Paid')`);
  const a = (await api('GET', '/api/finance/analytics?period=custom&startDate=2026-02-01&endDate=2026-02-28', { token: dir })).json.analytics;
  assert.deepEqual(a.expenseCategoryBreakdown.map((c: any) => [c.category, c.color]), [['Audited', '#0A0B0C']]);
});
