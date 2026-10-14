/**
 * SHARED BUSINESS RULES (single source of truth)
 * ----------------------------------------------
 * Every module (Dashboard, Reports, Facility Records, CRM, Expenses) must use these definitions.
 * Do NOT re-implement revenue / expense / occupancy / date logic in a component or a repository.
 *
 * DOCUMENTED DEFINITIONS
 *  - Qualifying booking  : any booking whose status is not 'Cancelled'.
 *  - Revenue             : SUM(bookings.amount) of qualifying bookings, recognised on bookings.date.
 *                          (The app auto-creates a 'Completed' payment equal to the booking amount, so the
 *                          payments table does not currently distinguish booked value from cash received.
 *                          If partial payments are introduced, revisit this rule here and only here.)
 *  - Qualifying expense  : any expense whose status is not 'Rejected'. (Pending expenses are included because
 *                          the UI records most expenses as 'Paid'; change EXCLUDED_EXPENSE_STATUSES to alter.)
 *  - Shared expense      : branch value 'Both Branches' / 'All Branches'. It counts ONCE in combined totals and is
 *                          split evenly (in integer cents, remainder to the first branch) across ACTIVE branches
 *                          when a single branch is selected, so per-branch figures sum to the combined total.
 *  - Occupancy           : one qualifying booking occupies ONE unit of capacity on every date from bookings.date
 *                          for days_count days. Occupied(ref date) / capacity. No booking = 0 occupied.
 *  - Occupancy status    : < 80% Available, >= 80% Nearly Full, >= 100% Full (matches existing UI legend).
 *  - Profit margin       : net profit / revenue * 100 (1 decimal); 0 when revenue <= 0.
 *  - Money               : handled as integer cents to avoid floating point drift.
 */

export const EXCLUDED_BOOKING_STATUSES = ['Cancelled'] as const;
export const EXCLUDED_EXPENSE_STATUSES = ['Rejected'] as const;
export const SHARED_BRANCH_LABELS = ['both branches', 'all branches'];

export const NEARLY_FULL_THRESHOLD = 80;
export const FULL_THRESHOLD = 100;

// ---------------------------------------------------------------- money
export function toCents(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

// ---------------------------------------------------------------- qualification
export function isQualifyingBooking(status: string | null | undefined): boolean {
  return !(EXCLUDED_BOOKING_STATUSES as readonly string[]).includes(String(status ?? ''));
}
export function isQualifyingExpense(status: string | null | undefined): boolean {
  return !(EXCLUDED_EXPENSE_STATUSES as readonly string[]).includes(String(status ?? ''));
}
export function isSharedBranchLabel(branch: string | null | undefined): boolean {
  return SHARED_BRANCH_LABELS.includes(String(branch ?? '').trim().toLowerCase());
}

// ---------------------------------------------------------------- dates
export type PeriodKey =
  | 'all' | 'today' | 'last_7_days' | 'this_month' | 'last_30_days' | 'last_12_months' | 'full_year' | 'custom';

export interface DateRange {
  /** inclusive YYYY-MM-DD, null = unbounded */
  start: string | null;
  end: string | null;
}

const PERIOD_ALIASES: Record<string, PeriodKey> = {
  all: 'all', all_time: 'all', today: 'today',
  '7d': 'last_7_days', last_7: 'last_7_days', last_7_days: 'last_7_days',
  this_month: 'this_month', month: 'this_month',
  '30d': 'last_30_days', last_30: 'last_30_days', last_30_days: 'last_30_days',
  '12m': 'last_12_months', last_12_months: 'last_12_months',
  full_year: 'full_year', year: 'full_year',
  custom: 'custom',
};

export function normalizePeriod(period: string | undefined | null): PeriodKey {
  return PERIOD_ALIASES[String(period ?? 'all').trim().toLowerCase()] ?? 'all';
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const isIsoDate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(parse(s)) === s;

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** "today" in the business time zone. Accepts IANA names ("Africa/Lagos") and "UTC+01:00" style offsets. */
export function todayInTimezone(timezone: string | undefined, now: Date = new Date()): string {
  const tz = (timezone || 'UTC').trim();
  const off = tz.match(/^(?:UTC|GMT)\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (off) {
    const sign = off[1] === '-' ? -1 : 1;
    const minutes = sign * (parseInt(off[2], 10) * 60 + parseInt(off[3] || '0', 10));
    return fmt(new Date(now.getTime() + minutes * 60000));
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    if (isIsoDate(parts)) return parts;
  } catch {
    /* fall through to UTC */
  }
  return fmt(now);
}

/**
 * Resolve a period to an inclusive date range. Never silently substitutes a different period
 * (the previous implementation jumped to "latest month with data", which fabricated figures).
 */
export function resolveDateRange(
  period: string | undefined,
  today: string,
  custom?: { startDate?: string; endDate?: string }
): DateRange {
  const key = normalizePeriod(period);
  switch (key) {
    case 'all':
      return { start: null, end: null };
    case 'today':
      return { start: today, end: today };
    case 'last_7_days':
      return { start: addDays(today, -6), end: today };
    case 'last_30_days':
      return { start: addDays(today, -29), end: today };
    case 'this_month': {
      const first = `${today.slice(0, 7)}-01`;
      const d = parse(first);
      d.setUTCMonth(d.getUTCMonth() + 1);
      d.setUTCDate(0);
      return { start: first, end: fmt(d) };
    }
    case 'last_12_months': {
      const d = parse(`${today.slice(0, 7)}-01`);
      d.setUTCMonth(d.getUTCMonth() - 11);
      return { start: fmt(d), end: today };
    }
    case 'full_year':
      return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
    case 'custom': {
      const { startDate, endDate } = custom || {};
      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        throw new Error('A valid custom date range (startDate and endDate as YYYY-MM-DD) is required.');
      }
      if (startDate > endDate) throw new Error('Custom range start date must not be after the end date.');
      return { start: startDate, end: endDate };
    }
  }
}

export function inRange(date: string, range: DateRange): boolean {
  const d = String(date).substring(0, 10);
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

// ---------------------------------------------------------------- branches
export interface BranchRef { id: string; name: string; }

/** Exact id/name match (case-insensitive). The previous fuzzy substring matching mixed up similarly named branches. */
export function resolveBranch(selected: string | undefined | null, branches: BranchRef[]): BranchRef | null {
  const s = String(selected ?? '').trim().toLowerCase();
  if (!s || s === 'all' || s === 'compare') return null;
  const found = branches.find((b) => b.id.toLowerCase() === s || b.name.toLowerCase() === s);
  if (!found) throw new Error(`Unknown branch: ${selected}`);
  return found;
}

export function recordBelongsToBranch(
  rec: { branchId?: string | null; branch?: string | null },
  branch: BranchRef
): boolean {
  if (rec.branchId && rec.branchId.toLowerCase() === branch.id.toLowerCase()) return true;
  return String(rec.branch ?? '').trim().toLowerCase() === branch.name.toLowerCase();
}

// ---------------------------------------------------------------- expenses
/**
 * Split a shared expense across branches in integer cents. Remainder cents go to the first branch (sorted by id)
 * so the allocations always add back up to the original amount exactly.
 */
export function allocateSharedExpenseCents(totalCents: number, branchIds: string[]): Map<string, number> {
  const ids = [...branchIds].sort();
  const result = new Map<string, number>();
  if (ids.length === 0) return result;
  const base = Math.trunc(totalCents / ids.length);
  let remainder = totalCents - base * ids.length;
  ids.forEach((id) => {
    result.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  });
  return result;
}

/** Cents of an expense attributable to `branch` (null = combined view: every expense counted exactly once). */
export function expenseCentsForView(
  expense: { amount: unknown; branch?: string | null; branchId?: string | null },
  branch: BranchRef | null,
  activeBranchIds: string[]
): number {
  const cents = toCents(expense.amount);
  if (!branch) return cents;
  if (isSharedBranchLabel(expense.branch)) {
    return allocateSharedExpenseCents(cents, activeBranchIds).get(branch.id) ?? 0;
  }
  return recordBelongsToBranch(expense, branch) ? cents : 0;
}

// ---------------------------------------------------------------- KPIs
export function profitMargin(revenueCents: number, netProfitCents: number): number {
  if (revenueCents <= 0) return 0;
  return Math.round((netProfitCents / revenueCents) * 1000) / 10;
}

// ---------------------------------------------------------------- occupancy
export function bookingOccupiesOn(
  booking: { date: string; daysCount?: number | null; status?: string | null },
  refDate: string
): boolean {
  if (!isQualifyingBooking(booking.status)) return false;
  const start = String(booking.date).substring(0, 10);
  const days = Math.max(1, Number(booking.daysCount) || 1);
  const end = addDays(start, days - 1);
  return refDate >= start && refDate <= end;
}

export type OccupancyStatus = 'Available' | 'Nearly Full' | 'Full';

export function occupancyPercent(occupied: number, capacity: number): number {
  if (!(capacity > 0)) return 0;
  return Math.round((occupied / capacity) * 1000) / 10;
}
export function occupancyStatus(percent: number): OccupancyStatus {
  if (percent >= FULL_THRESHOLD) return 'Full';
  if (percent >= NEARLY_FULL_THRESHOLD) return 'Nearly Full';
  return 'Available';
}
