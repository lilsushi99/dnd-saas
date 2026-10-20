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
  /** Explicit, possibly non-contiguous set of dates (the "custom dates" picker). When present it is authoritative. */
  dates?: string[];
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
  custom?: { startDate?: string; endDate?: string; customDates?: string[] }
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
      const { startDate, endDate, customDates } = custom || {};
      if (customDates && customDates.length > 0) {
        if (customDates.length > 366 || !customDates.every(isIsoDate)) {
          throw new Error('A valid custom date range: customDates must be up to 366 dates formatted YYYY-MM-DD.');
        }
        const dates = [...new Set(customDates)].sort();
        return { start: dates[0], end: dates[dates.length - 1], dates };
      }
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
  if (range.dates) return range.dates.includes(d);
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

// ---------------------------------------------------------------- branches
export interface BranchRef { id: string; name: string; }

/** Exact id/name match (case-insensitive). The previous fuzzy substring matching mixed up similarly named branches. */
export function resolveBranch(selected: string | undefined | null, branches: BranchRef[]): BranchRef | null {
  const s = String(selected ?? '').trim().toLowerCase();
  if (
    !s ||
    s === 'all' ||
    s === 'all branches' ||
    s === 'both branches' ||
    s === 'multiple' ||
    s === 'compare' ||
    s === 'global'
  ) {
    return null;
  }
  const found = branches.find((b) => b.id.toLowerCase() === s || b.name.toLowerCase() === s);
  if (found) return found;

  // Secondary match: normalize spaces and check aliases
  const normalized = s.replace(/[^a-z0-9]/g, '');
  const fallback = branches.find((b) => {
    const bIdNorm = b.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const bNameNorm = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return bIdNorm === normalized || bNameNorm === normalized;
  });
  if (fallback) return fallback;

  // If a branch is requested that doesn't exist, throw an error to prevent silent fallbacks or unauthorized access.
  throw new Error(`Unrecognized branch filter: "${selected}". Exact match required.`);
}

export function recordBelongsToBranch(
  rec: { branchId?: string | null; branch?: string | null },
  branch: BranchRef
): boolean {
  if (rec.branchId && rec.branchId.toLowerCase() === branch.id.toLowerCase()) return true;
  const br = String(rec.branch ?? '').trim().toLowerCase();
  return br === branch.name.toLowerCase() || br === branch.id.toLowerCase();
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
  booking: {
    date: string;
    daysCount?: number | null;
    status?: string | null;
    durationUnit?: string | null;
    pricingBasis?: string | null;
  },
  refDate: string
): boolean {
  if (!isQualifyingBooking(booking.status)) return false;
  const start = String(booking.date).substring(0, 10);
  if (booking.durationUnit === 'Hour' || booking.pricingBasis === 'Per Hour') {
    // Hourly bookings occupy only on the specific single calendar date
    return refDate === start;
  }
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

// ---------------------------------------------------------------- booking lifecycle
export interface BookingLifecycleResult {
  status: 'Active' | 'Expired' | 'Upcoming' | 'Cancelled' | 'Expiring Soon';
  daysLeft: number;
  daysUsed: number;
  durationCount: number;
  durationUnit: 'Hour' | 'Day';
  startDateTime: string;
  endDateTime: string;
}

export function parseBookingStartTime(timeStr?: string | null, defaultTime = '09:00:00'): string {
  if (!timeStr) return defaultTime;
  const s = timeStr.trim();
  const match24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const h = String(parseInt(match24[1], 10)).padStart(2, '0');
    const m = match24[2];
    const sec = match24[3] || '00';
    return `${h}:${m}:${sec}`;
  }
  const match12 = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const meridian = match12[3].toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}:00`;
  }
  return defaultTime;
}

export function calculateBookingLifecycle(
  booking: {
    date: string;
    startTime?: string | null;
    timeDuration?: string | null;
    createdAt?: string | null;
    daysCount?: number | null;
    durationCount?: number | null;
    durationUnit?: 'Hour' | 'Day' | string | null;
    pricingBasis?: 'Per Hour' | 'Per Day' | string | null;
    status?: string | null;
  },
  nowMs: number = Date.now(),
  _timezone: string = 'UTC+01:00'
): BookingLifecycleResult {
  const currentStatus = String(booking.status || '').trim();
  const durationCount = Math.max(1, Number(booking.durationCount || booking.daysCount) || 1);
  const durationUnit: 'Hour' | 'Day' =
    booking.durationUnit === 'Hour' ||
    booking.pricingBasis === 'Per Hour' ||
    (typeof booking.timeDuration === 'string' && /hour/i.test(booking.timeDuration))
      ? 'Hour'
      : 'Day';

  const startTime = parseBookingStartTime(booking.startTime || booking.timeDuration, '09:00:00');
  const dateIso = String(booking.date).substring(0, 10);

  // Business timezone is UTC+01:00
  const startIso = `${dateIso}T${startTime}+01:00`;
  let startMs = new Date(startIso).getTime();
  if (isNaN(startMs)) {
    startMs = new Date(`${dateIso}T09:00:00+01:00`).getTime();
  }

  const durationMs =
    durationUnit === 'Hour'
      ? durationCount * 3600 * 1000
      : durationCount * 24 * 3600 * 1000;

  const endMs = startMs + durationMs;
  const endIso = new Date(endMs).toISOString();

  if (currentStatus === 'Cancelled') {
    return {
      status: 'Cancelled',
      daysLeft: 0,
      daysUsed: durationCount,
      durationCount,
      durationUnit,
      startDateTime: startIso,
      endDateTime: endIso,
    };
  }

  let status: 'Active' | 'Expired' | 'Upcoming' | 'Cancelled' | 'Expiring Soon';
  let daysLeft = 0;
  let daysUsed = 0;

  if (nowMs < startMs) {
    status = 'Upcoming';
    daysLeft = durationCount;
    daysUsed = 0;
  } else if (nowMs >= endMs) {
    status = 'Expired';
    daysLeft = 0;
    daysUsed = durationCount;
  } else {
    // Within paid duration
    const remainingMs = endMs - nowMs;
    const elapsedMs = nowMs - startMs;

    if (durationUnit === 'Hour') {
      status = 'Active';
      daysLeft = Math.max(1, Math.ceil(remainingMs / (24 * 3600 * 1000)));
      daysUsed = Math.min(durationCount, Math.max(1, Math.floor(elapsedMs / (3600 * 1000)) + 1));
    } else {
      // Day-based
      daysLeft = Math.max(1, Math.ceil(remainingMs / (24 * 3600 * 1000)));
      daysUsed = Math.min(durationCount, Math.max(1, Math.floor(elapsedMs / (24 * 3600 * 1000)) + 1));

      // Show Expiring Soon during the final 72 hours before expiration (for bookings lasting >= 3 days)
      if (durationCount >= 3 && remainingMs <= 72 * 3600 * 1000) {
        status = 'Expiring Soon';
      } else {
        status = 'Active';
      }
    }
  }

  return {
    status,
    daysLeft,
    daysUsed,
    durationCount,
    durationUnit,
    startDateTime: startIso,
    endDateTime: endIso,
  };
}
