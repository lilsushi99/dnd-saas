/**
 * Integration tests against a REAL MySQL/MariaDB database through the real Express app.
 * Requires DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME in the environment, and DB_NAME must end in "_test"
 * (the suite wipes and re-seeds its tables). Skips (reported as skipped, not passed) if the DB is unreachable.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import { createApiApp } from '../server/app';
import config from '../server/config/config';
import { checkDbConnection, executeQuery, getPool, isUsingMemoryFallback } from '../server/database/db';
import { _resetLoginLimiterForTests } from '../server/controllers/authController';
import { todayInTimezone } from '../server/domain/businessRules';

let server: Server;
let base = '';
let dbReady = false;
const PW = 'Correct-Horse-Battery-9';

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
async function login(email: string, password = PW) {
  const r = await api('POST', '/api/auth/login', { body: { email, password } });
  return r;
}

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
  await checkDbConnection(); // re-runs schema check => re-seeds default role matrix

  const hash = await bcrypt.hash(PW, 4);
  const users: Array<[string, string, string, string, string | null, string]> = [
    ['U-DIR', 'Dora Director', 'director@test.local', 'Director', null, 'All Branches'],
    ['U-MGR', 'Max Manager', 'manager@test.local', 'Manager', null, 'All Branches'],
    ['U-REC', 'Rita Receptionist', 'rec@test.local', 'Receptionist', null, 'All Branches'],
    ['U-ACC', 'Abe Accountant', 'acc@test.local', 'Accountant', null, 'All Branches'],
    ['U-LAG', 'Lola Lagos', 'lagos@test.local', 'Manager', 'BR-A', 'Branch A'],
    ['U-OFF', 'Ola Off', 'off@test.local', 'Manager', null, 'All Branches'],
  ];
  for (const [id, name, email, role, branchId, branch] of users) {
    await executeQuery(`INSERT INTO users (id,name,email,password_hash,role,branch_id,branch,status) VALUES (?,?,?,?,?,?,?, ?)`,
      [id, name, email, hash, role, branchId, branch, id === 'U-OFF' ? 'Inactive' : 'Active']);
  }
  // plain-text legacy row (as inserted by hand in phpMyAdmin)
  await executeQuery(`INSERT INTO users (id,name,email,password_hash,role,branch,status) VALUES ('U-LEG','Legacy','legacy@test.local','legacy-plain-pw','Manager','All Branches','Active')`);

  const d = '2026-01-01';
  await executeQuery(`INSERT INTO branches (id,name,status,created_date) VALUES ('BR-A','Branch A','Active',?),('BR-B','Branch B','Active',?),('BR-C','Branch A Annex','Active',?)`, [d, d, d]);
  await executeQuery(`INSERT INTO facilities (id,name,branch_id,branch_name,capacity,status,created_date) VALUES
    ('F-1','Hot Desk','BR-A','Branch A',10,'Active',?),('F-2','Boardroom','BR-B','Branch B',4,'Active',?),('F-3','Empty Room','BR-B','Branch B',6,'Active',?)`, [d, d, d]);
  await executeQuery(`INSERT INTO expense_categories (id,name,status,created_date) VALUES ('EC-1','Rent','Active',?),('EC-2','Utilities','Active',?)`, [d, d]);
  for (const [id, n] of [['C-1', 'Ann'], ['C-2', 'Bob'], ['C-3', 'Cy']]) {
    await executeQuery(`INSERT INTO clients (id,name,phone) VALUES (?,?,?)`, [id, n, `080-${id}`]);
  }

  const today = todayInTimezone('UTC');
  const mk = async (id: string, date: string, client: string, branch: string, facility: string, amount: number, status: string, days = 1) =>
    executeQuery(`INSERT INTO bookings (id,date,client_id,client_name,phone,branch,facility,days_count,amount,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, date, client, client, '1', branch, facility, days, amount, status]);
  await mk('B-1', today, 'C-1', 'Branch A', 'Hot Desk', 1000.10, 'Active', 3);   // occupies today
  await mk('B-2', today, 'C-1', 'Branch A', 'Hot Desk', 500.20, 'Active', 1);    // same client again
  await mk('B-3', today, 'C-2', 'Branch B', 'Boardroom', 700.00, 'Active', 1);
  await mk('B-4', today, 'C-3', 'Branch B', 'Boardroom', 9999.00, 'Cancelled', 1); // must NOT count anywhere
  await mk('B-5', '2020-01-15', 'C-2', 'Branch B', 'Boardroom', 400.00, 'Expired', 1); // old data: must not leak into "this month"

  const ex = async (id: string, amt: number, date: string, branch: string, cat: string, status = 'Paid') =>
    executeQuery(`INSERT INTO expenses (id,name,amount,date,branch,category,status) VALUES (?,?,?,?,?,?,?)`, [id, id, amt, date, branch, cat, status]);
  await ex('E-1', 300.00, today, 'Branch A', 'Rent');
  await ex('E-2', 100.01, today, 'Both Branches', 'Utilities');   // shared, odd cents => exercises remainder
  await ex('E-3', 5000.00, today, 'Branch B', 'Rent', 'Rejected'); // must NOT count

  const app = createApiApp();
  await new Promise<void>((resolve) => { server = app.listen(0, '127.0.0.1', () => resolve()); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (dbReady) await getPool().end().catch(() => {});
});

const skipIfNoDb = (name: string, fn: () => Promise<void>) => test(name, async (t) => { if (!dbReady) return t.skip('database unreachable'); await fn(); });

skipIfNoDb('database connectivity, schema status and seeded role matrix', async () => {
  const h = await api('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.json.database, 'connected');
  assert.equal(h.json.schema, 'ok');
  assert.equal(JSON.stringify(h.json).includes(config.db.host), false, 'health must not leak the DB host');
  const roles = await executeQuery<any>(`SELECT role FROM user_roles_permissions ORDER BY role`);
  assert.deepEqual(roles.map((r) => r.role), ['Accountant', 'Director', 'Manager', 'Receptionist']);
});

skipIfNoDb('every protected router rejects unauthenticated requests with 401', async () => {
  for (const path of ['/api/operations/bookings', '/api/operations/facilities', '/api/operations/settings', '/api/customers', '/api/expenses', '/api/expenses/categories',
    '/api/finance/analytics', '/api/admin/branches', '/api/admin/users', '/api/admin/roles', '/api/admin/audit-logs', '/api/ai/history', '/api/auth/me']) {
    const r = await api('GET', path);
    assert.equal(r.status, 401, `${path} should be 401 but was ${r.status}`);
  }
  for (const [m, p] of [['POST', '/api/operations/bookings'], ['POST', '/api/expenses'], ['PUT', '/api/admin/roles/Manager'], ['POST', '/api/admin/users'], ['POST', '/api/admin/import/execute']]) {
    assert.equal((await api(m, p, { body: {} })).status, 401, `${m} ${p}`);
  }
  assert.equal((await api('GET', '/api/finance/analytics', { token: 'garbage.token.value' })).status, 401);
});

skipIfNoDb('login: bcrypt users work; former backdoors are gone', async () => {
  _resetLoginLimiterForTests();
  const ok = await login('director@test.local');
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  assert.equal(ok.json.user.permissions.administration, true);

  assert.equal((await login('director@test.local', 'wrong-password-123')).status, 401);
  // previous code accepted these "default" passwords for ANY user
  for (const p of ['admin123', 'password', 'password123', '123456', 'director']) {
    assert.equal((await login('director@test.local', p)).status, 401, `default password "${p}" must be rejected`);
  }
  // previous code auto-created an admin for these emails with ANY password
  for (const e of ['admin@nexuserp.com', 'admin@enterprise-hub.com', 'director@nexuserp.com']) {
    assert.equal((await login(e, 'whatever-123')).status, 401, `${e} must not be auto-provisioned`);
  }
  const n = await executeQuery<any>(`SELECT COUNT(*) AS c FROM users WHERE email IN ('admin@nexuserp.com','admin@enterprise-hub.com','director@nexuserp.com')`);
  assert.equal(Number(n[0].c), 0);
});

skipIfNoDb('legacy plain-text password is accepted once and upgraded to a bcrypt hash', async () => {
  const r = await login('legacy@test.local', 'legacy-plain-pw');
  assert.equal(r.status, 200);
  const row = await executeQuery<any>(`SELECT password_hash FROM users WHERE id='U-LEG'`);
  assert.match(row[0].password_hash, /^\$2[aby]\$/);
  assert.equal((await login('legacy@test.local', 'legacy-plain-pw')).status, 200); // still works via bcrypt
  assert.equal((await login('legacy@test.local', 'nope-nope-nope')).status, 401);
});

skipIfNoDb('brute force limiter blocks repeated failures', async () => {
  _resetLoginLimiterForTests();
  let last = 0;
  for (let i = 0; i < 9; i++) last = (await login('rec@test.local', `bad-${i}-password`)).status;
  assert.equal(last, 429);
  _resetLoginLimiterForTests();
  assert.equal((await login('rec@test.local')).status, 200);
});

skipIfNoDb('public signup is closed once users exist and never honours a requested role', async () => {
  const r = await api('POST', '/api/auth/signup', { body: { name: 'Eve', email: 'eve@test.local', password: 'Another-Long-Pass-1', role: 'Director' } });
  assert.equal(r.status, 403);
  const rows = await executeQuery<any>(`SELECT id FROM users WHERE email='eve@test.local'`);
  assert.equal(rows.length, 0);
});

skipIfNoDb('deactivated accounts cannot log in and existing tokens stop working', async () => {
  _resetLoginLimiterForTests();
  assert.equal((await login('off@test.local')).status, 403);
  const t = (await login('acc@test.local')).json.token;
  assert.equal((await api('GET', '/api/finance/analytics', { token: t })).status, 200);
  await executeQuery(`UPDATE users SET status='Inactive' WHERE id='U-ACC'`);
  assert.equal((await api('GET', '/api/finance/analytics', { token: t })).status, 403);
  await executeQuery(`UPDATE users SET status='Active' WHERE id='U-ACC'`);
});

skipIfNoDb('backend enforces role permissions, not just hidden navigation', async () => {
  _resetLoginLimiterForTests();
  const rec = (await login('rec@test.local')).json.token;
  // Receptionist: dashboard permission is ON by default; turn it OFF and the API must refuse direct calls.
  await executeQuery(`UPDATE user_roles_permissions SET permissions = JSON_SET(permissions, '$.dashboard', false) WHERE role='Receptionist'`);
  assert.equal((await api('GET', '/api/finance/analytics', { token: rec })).status, 403);
  assert.equal((await api('GET', '/api/customers', { token: rec })).status, 200); // crm still allowed
  assert.equal((await api('GET', '/api/expenses', { token: rec })).status, 403);  // expenses/reports/dashboard all off
  assert.equal((await api('GET', '/api/admin/users', { token: rec })).status, 403);
  assert.equal((await api('POST', '/api/expenses', { token: rec, body: { name: 'x', amount: 1 } })).status, 403);
  await executeQuery(`UPDATE user_roles_permissions SET permissions = JSON_SET(permissions, '$.dashboard', true) WHERE role='Receptionist'`);
  assert.equal((await api('GET', '/api/finance/analytics', { token: rec })).status, 200);
});

skipIfNoDb('unknown role / missing role row fails closed; Director can never be locked out', async () => {
  _resetLoginLimiterForTests();
  await executeQuery(`DELETE FROM user_roles_permissions WHERE role='Accountant'`);
  const acc = (await login('acc@test.local')).json.token;
  assert.equal((await api('GET', '/api/finance/analytics', { token: acc })).status, 403);
  await executeQuery(`UPDATE user_roles_permissions SET permissions='{}' WHERE role='Director'`);
  const dir = (await login('director@test.local')).json.token;
  assert.equal((await api('GET', '/api/admin/users', { token: dir })).status, 200);
  await checkDbConnection(); // restore seeded defaults for the missing Accountant row
  await executeQuery(`UPDATE user_roles_permissions SET permissions = ? WHERE role='Director'`, [JSON.stringify({ dashboard: true, dailyLogger: true, facilityRecords: true, crm: true, expenses: true, reports: true, administration: true, settings: true })]);
});

skipIfNoDb('privilege escalation is blocked: Manager cannot edit roles or create Directors', async () => {
  _resetLoginLimiterForTests();
  const mgr = (await login('manager@test.local')).json.token;
  const perms = { dashboard: true, dailyLogger: true, facilityRecords: true, crm: true, expenses: true, reports: true, administration: true, settings: true };
  assert.equal((await api('PUT', '/api/admin/roles/Manager', { token: mgr, body: { permissions: perms } })).status, 403);
  assert.equal((await api('POST', '/api/admin/users', { token: mgr, body: { name: 'Mallory', email: 'm@test.local', role: 'Director', branch: 'All Branches', status: 'Active', password: 'Some-Long-Pass-1' } })).status, 403);
  assert.equal((await api('PUT', '/api/admin/users/U-DIR', { token: mgr, body: { name: 'Hacked' } })).status, 403);
  assert.equal((await api('PATCH', '/api/admin/users/U-DIR/toggle-status', { token: mgr })).status, 403);
  const dir = await executeQuery<any>(`SELECT name, status FROM users WHERE id='U-DIR'`);
  assert.deepEqual([dir[0].name, dir[0].status], ['Dora Director', 'Active']);
});

skipIfNoDb('branch-restricted users cannot read or write other branches', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('lagos@test.local')).json.token;
  assert.equal((await api('GET', '/api/finance/analytics?branch=BR-B', { token: t })).status, 403);
  const own = await api('GET', '/api/finance/analytics?period=all&branch=BR-A', { token: t });
  assert.equal(own.status, 200);
  // No branch param => forced to their own branch, so Branch B's 700.00 must not be visible.
  const implicit = await api('GET', '/api/finance/analytics?period=all', { token: t });
  assert.equal(implicit.json.analytics.totalRevenue, 1500.3);
  assert.equal((await api('POST', '/api/expenses', { token: t, body: { name: 'x', amount: 5, branch: 'Branch B', category: 'Rent', date: '2026-01-01' } })).status, 403);
});

skipIfNoDb('invalid filters are 400s, not silent defaults or 500s', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  assert.equal((await api('GET', '/api/finance/analytics?branch=Nowhere', { token: t })).status, 400);
  assert.equal((await api('GET', '/api/finance/analytics?period=custom', { token: t })).status, 400);
  assert.equal((await api('GET', '/api/finance/analytics?period=custom&startDate=2026-02-30&endDate=2026-03-01', { token: t })).status, 400);
  assert.equal((await api('GET', '/api/finance/analytics?branch=Branch', { token: t })).status, 400); // partial name must not fuzzy-match
});

skipIfNoDb('analytics: cancelled/rejected excluded, unique clients distinct, margin and net profit correct', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  const a = (await api('GET', '/api/finance/analytics?period=all', { token: t })).json.analytics;
  // revenue: 1000.10 + 500.20 + 700.00 + 400.00 (old, Expired still counts) = 2600.30 ; cancelled 9999 excluded
  assert.equal(a.totalRevenue, 2600.3);
  assert.equal(a.totalBookings, 4);
  assert.equal(a.uniqueClients, 2, 'C-1 booked twice and C-2 twice => 2 distinct clients');
  // expenses: 300.00 + 100.01 shared once = 400.01 ; rejected 5000 excluded
  assert.equal(a.totalExpenses, 400.01);
  assert.equal(a.netProfit, 2200.29);
  assert.equal(a.netProfitMargin, Math.round((2200.29 / 2600.3) * 1000) / 10);
});

skipIfNoDb('analytics: this_month never falls back to a different month', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  const custom = (await api('GET', '/api/finance/analytics?period=custom&startDate=2019-01-01&endDate=2019-12-31', { token: t })).json.analytics;
  assert.equal(custom.totalRevenue, 0);
  assert.equal(custom.totalExpenses, 0);
  assert.equal(custom.netProfitMargin, 0, 'zero revenue => margin 0, never 100 / NaN');
  assert.equal(custom.totalBookings, 0);
  const y2020 = (await api('GET', '/api/finance/analytics?period=custom&startDate=2020-01-01&endDate=2020-01-31', { token: t })).json.analytics;
  assert.equal(y2020.totalRevenue, 400);
  const thisMonth = (await api('GET', '/api/finance/analytics?period=this_month', { token: t })).json.analytics;
  assert.equal(thisMonth.totalRevenue, 2200.3, 'old 2020 booking must not appear in this month');
});

skipIfNoDb('reconciliation: branch figures sum to combined; category breakdown sums to total expenses', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  const all = (await api('GET', '/api/finance/analytics?period=all', { token: t })).json.analytics;
  const cents = (n: number) => Math.round(n * 100);

  const sum = (k: 'revenue' | 'expenses' | 'netProfit') => all.branchPerformance.reduce((s: number, b: any) => s + cents(b[k]), 0);
  assert.equal(sum('revenue'), cents(all.totalRevenue));
  assert.equal(sum('expenses'), cents(all.totalExpenses), 'shared expense split must add back to the single combined amount');
  assert.equal(sum('netProfit'), cents(all.netProfit));
  assert.equal(all.branchPerformance.length, 3, 'branches come from the database');

  assert.equal(all.expenseCategoryBreakdown.reduce((s: number, c: any) => s + cents(c.amount), 0), cents(all.totalExpenses));
  assert.equal(all.facilityRevenueBreakdown.reduce((s: number, c: any) => s + cents(c.revenue), 0), cents(all.totalRevenue));
  assert.equal(all.expenseItems.reduce((s: number, c: any) => s + cents(c.amount), 0), cents(all.totalExpenses));
  assert.equal(all.revenueVsExpensesChart.reduce((s: number, p: any) => s + cents(p.revenue), 0), cents(all.totalRevenue));
  assert.equal(all.revenueVsExpensesChart.reduce((s: number, p: any) => s + cents(p.expenses), 0), cents(all.totalExpenses));

  // Branch A selected on its own equals its row in the comparison, and "Branch A Annex" (similar name) is not mixed in.
  const a = (await api('GET', '/api/finance/analytics?period=all&branch=BR-A', { token: t })).json.analytics;
  const rowA = all.branchPerformance.find((b: any) => b.branchId === 'BR-A');
  assert.equal(a.totalRevenue, rowA.revenue);
  assert.equal(a.totalExpenses, rowA.expenses);
  assert.equal(a.totalRevenue, 1500.3);
  assert.equal(Math.round(a.totalExpenses * 100), 30000 + 3334); // 300 own + shared 100.01 split over 3 active branches: 33.34 / 33.34 / 33.33
  const annex = all.branchPerformance.find((b: any) => b.branchId === 'BR-C');
  assert.equal(annex.revenue, 0);
});

skipIfNoDb('occupancy: derived from real bookings and capacity, zero when there are none', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  const a = (await api('GET', '/api/finance/analytics?period=this_month&branch=BR-A', { token: t })).json.analytics;
  assert.equal(a.occupancyRate, 20, '2 active bookings today (B-1 3-day span, B-2) over capacity 10');
  const b = (await api('GET', '/api/finance/analytics?period=this_month&branch=BR-B', { token: t })).json.analytics;
  assert.equal(b.occupancyRate, 10, '1 non-cancelled booking (B-4 cancelled excluded) over capacity 4+6');
  await executeQuery(`UPDATE facilities SET capacity = 0`);
  const z = (await api('GET', '/api/finance/analytics?period=this_month', { token: t })).json.analytics;
  assert.equal(z.occupancyRate, 0, 'zero capacity must not divide by zero');
  await executeQuery(`UPDATE facilities SET capacity = 10 WHERE id='F-1'`);
  await executeQuery(`UPDATE facilities SET capacity = 4 WHERE id='F-2'`);
  await executeQuery(`UPDATE facilities SET capacity = 6 WHERE id='F-3'`);
});

skipIfNoDb('database failures surface as 5xx with a generic message, never as empty "success" data', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  await executeQuery(`RENAME TABLE bookings TO bookings_bak`);
  try {
    const r = await api('GET', '/api/finance/analytics?period=all', { token: t });
    assert.equal(r.status, 500);
    assert.notEqual(r.json.success, true);
    assert.equal(/bookings|SQL|table/i.test(JSON.stringify(r.json)), false, 'no SQL/table detail leaked to the client');
    const l = await api('GET', '/api/operations/bookings', { token: t });
    assert.equal(l.status, 500, 'booking list must not pretend to be empty when the query fails');
  } finally {
    await executeQuery(`RENAME TABLE bookings_bak TO bookings`);
  }
});

skipIfNoDb('analytics: non-contiguous customDates select exactly the picked days', async () => {
  _resetLoginLimiterForTests();
  const t = (await login('director@test.local')).json.token;
  const today = todayInTimezone('UTC');
  const both = (await api('GET', `/api/finance/analytics?period=custom&customDates=${today},2020-01-15`, { token: t })).json.analytics;
  assert.equal(both.totalRevenue, 2200.3 + 400);
  const old = (await api('GET', '/api/finance/analytics?period=custom&customDates=2020-01-15', { token: t })).json.analytics;
  assert.equal(old.totalRevenue, 400);
  assert.deepEqual(old.revenueVsExpensesChart.map((p: any) => p.date), ['2020-01-15']);
  assert.equal((await api('GET', '/api/finance/analytics?period=custom&customDates=2020-13-45', { token: t })).status, 400);
});
