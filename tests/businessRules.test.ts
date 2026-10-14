import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents, fromCents, resolveDateRange, todayInTimezone, inRange, resolveBranch, recordBelongsToBranch,
  allocateSharedExpenseCents, expenseCentsForView, profitMargin, bookingOccupiesOn, occupancyPercent,
  occupancyStatus, isQualifyingBooking, isQualifyingExpense, isSharedBranchLabel, addDays,
} from '../server/domain/businessRules';

const branches = [
  { id: 'BR-001', name: 'Lekki Innovation Hub' },
  { id: 'BR-002', name: 'Victoria Island Hub' },
  { id: 'BR-003', name: 'London Main' },
  { id: 'BR-004', name: 'New York HQ' },
];

test('money is handled in integer cents without float drift', () => {
  assert.equal(toCents('19.99') + toCents('0.01'), 2000);
  assert.equal(toCents(0.1) + toCents(0.2), 30); // 0.1 + 0.2 !== 0.3 in floats
  assert.equal(fromCents(2000), 20);
  assert.equal(toCents('abc'), 0);
  assert.equal(toCents(null), 0);
});

test('cancelled bookings and rejected expenses do not qualify', () => {
  assert.equal(isQualifyingBooking('Cancelled'), false);
  for (const s of ['Active', 'Upcoming', 'Expired']) assert.equal(isQualifyingBooking(s), true);
  assert.equal(isQualifyingExpense('Rejected'), false);
  assert.equal(isQualifyingExpense('Paid'), true);
});

test('date ranges: inclusive boundaries and no silent substitution', () => {
  const today = '2026-10-14';
  assert.deepEqual(resolveDateRange('all', today), { start: null, end: null });
  assert.deepEqual(resolveDateRange('today', today), { start: today, end: today });
  assert.deepEqual(resolveDateRange('last_7_days', today), { start: '2026-10-08', end: today }); // exactly 7 days
  assert.deepEqual(resolveDateRange('30D', today), { start: '2026-09-15', end: today });
  assert.deepEqual(resolveDateRange('this_month', today), { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual(resolveDateRange('this_month', '2026-02-10'), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(resolveDateRange('this_month', '2028-02-10'), { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(resolveDateRange('12M', today), { start: '2025-11-01', end: today });
  assert.deepEqual(resolveDateRange('full_year', today), { start: '2026-01-01', end: '2026-12-31' });
  assert.deepEqual(resolveDateRange('unknown-value', today), { start: null, end: null });
});

test('custom range validation', () => {
  assert.deepEqual(resolveDateRange('custom', '2026-10-14', { startDate: '2026-01-01', endDate: '2026-01-31' }), { start: '2026-01-01', end: '2026-01-31' });
  assert.throws(() => resolveDateRange('custom', '2026-10-14', {}));
  assert.throws(() => resolveDateRange('custom', '2026-10-14', { startDate: '2026-02-30', endDate: '2026-03-01' }));
  assert.throws(() => resolveDateRange('custom', '2026-10-14', { startDate: '2026-03-02', endDate: '2026-03-01' }));
});

test('inRange is inclusive on both ends and tolerates datetimes', () => {
  const r = { start: '2026-10-01', end: '2026-10-31' };
  assert.equal(inRange('2026-10-01', r), true);
  assert.equal(inRange('2026-10-31', r), true);
  assert.equal(inRange('2026-09-30', r), false);
  assert.equal(inRange('2026-11-01', r), false);
  assert.equal(inRange('2026-10-15 13:00:00', r), true);
  assert.equal(inRange('1999-01-01', { start: null, end: null }), true);
});

test('timezone: business "today" can differ from UTC today', () => {
  const lateUtc = new Date('2026-10-14T23:30:00Z');
  assert.equal(todayInTimezone('UTC', lateUtc), '2026-10-14');
  assert.equal(todayInTimezone('UTC+01:00', lateUtc), '2026-10-15');
  assert.equal(todayInTimezone('Africa/Lagos', lateUtc), '2026-10-15');
  assert.equal(todayInTimezone('America/New_York', lateUtc), '2026-10-14');
  assert.equal(todayInTimezone('Not/AZone', lateUtc), '2026-10-14'); // falls back to UTC, never throws
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('branch resolution is exact, never fuzzy', () => {
  assert.equal(resolveBranch('all', branches), null);
  assert.equal(resolveBranch(undefined, branches), null);
  assert.equal(resolveBranch('br-003', branches)?.name, 'London Main');
  assert.equal(resolveBranch('london main', branches)?.id, 'BR-003');
  assert.throws(() => resolveBranch('London', branches)); // partial name must not match
  const london = branches[2];
  assert.equal(recordBelongsToBranch({ branch: 'London Main' }, london), true);
  assert.equal(recordBelongsToBranch({ branchId: 'BR-003', branch: 'old name' }, london), true);
  assert.equal(recordBelongsToBranch({ branch: 'London Main Annex' }, london), false);
});

test('shared expense allocation always reconciles to the original amount', () => {
  const ids = branches.map((b) => b.id);
  for (const total of [10000, 10001, 10002, 10003, 1, 3, 999999]) {
    const alloc = allocateSharedExpenseCents(total, ids);
    assert.equal([...alloc.values()].reduce((a, b) => a + b, 0), total, `total ${total}`);
    assert.equal(alloc.size, 4);
  }
  assert.equal(allocateSharedExpenseCents(100, []).size, 0);
});

test('shared expense counts once combined and splits per branch (no double counting)', () => {
  const ids = branches.map((b) => b.id);
  const shared = { amount: 1000, branch: 'Both Branches' };
  const own = { amount: 400, branch: 'London Main' };
  const combined = [shared, own].reduce((s, e) => s + expenseCentsForView(e, null, ids), 0);
  assert.equal(combined, 140000);
  const perBranch = branches.reduce((s, b) => s + [shared, own].reduce((t, e) => t + expenseCentsForView(e, b, ids), 0), 0);
  assert.equal(perBranch, combined); // branch figures sum to the combined figure
  assert.equal(expenseCentsForView(own, branches[0], ids), 0); // other branch's expense excluded
  assert.equal(isSharedBranchLabel('All Branches'), true);
  assert.equal(isSharedBranchLabel('London Main'), false);
});

test('profit margin: formula, zero revenue, negative profit', () => {
  assert.equal(profitMargin(100000, 25000), 25);
  assert.equal(profitMargin(300, 100), 33.3);
  assert.equal(profitMargin(100000, -50000), -50);
  assert.equal(profitMargin(0, 0), 0);
  assert.equal(profitMargin(0, -500), 0); // never Infinity / NaN / 100
});

test('occupancy: date-span based, cancelled excluded, zero capacity safe', () => {
  const b = { date: '2026-10-10', daysCount: 3, status: 'Active' };
  assert.equal(bookingOccupiesOn(b, '2026-10-09'), false);
  assert.equal(bookingOccupiesOn(b, '2026-10-10'), true);
  assert.equal(bookingOccupiesOn(b, '2026-10-12'), true);
  assert.equal(bookingOccupiesOn(b, '2026-10-13'), false);
  assert.equal(bookingOccupiesOn({ ...b, status: 'Cancelled' }, '2026-10-10'), false);
  assert.equal(bookingOccupiesOn({ date: '2026-10-10', status: 'Active' }, '2026-10-10'), true); // missing daysCount => 1 day
  assert.equal(occupancyPercent(9, 108), 8.3);
  assert.equal(occupancyPercent(5, 0), 0);
  assert.equal(occupancyPercent(0, 10), 0); // no bookings => 0, not 1
});

test('occupancy status thresholds match the dashboard legend', () => {
  assert.equal(occupancyStatus(0), 'Available');
  assert.equal(occupancyStatus(79.9), 'Available');
  assert.equal(occupancyStatus(80), 'Nearly Full');
  assert.equal(occupancyStatus(99.9), 'Nearly Full');
  assert.equal(occupancyStatus(100), 'Full');
  assert.equal(occupancyStatus(120), 'Full');
});
