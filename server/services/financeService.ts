import { ExpenseRepository } from '../repositories/expenseRepository';
import { OperationsRepository } from '../repositories/operationsRepository';
import { AdminRepository } from '../repositories/adminRepository';
import { executeQuery } from '../database/db';
import { FinanceReportFilters, FinanceAnalyticsSummary } from '../../src/types';
import {
  addDays, bookingOccupiesOn, DateRange, expenseCentsForView, fromCents, inRange, isQualifyingBooking,
  isQualifyingExpense, occupancyPercent, profitMargin, recordBelongsToBranch, resolveBranch,
  resolveDateRange, todayInTimezone, toCents, BranchRef,
} from '../domain/businessRules';

export interface BranchPerformance {
  branchId: string;
  branch: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export type AnalyticsResult = FinanceAnalyticsSummary & {
  dateRange: DateRange;
  branchPerformance: BranchPerformance[];
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export class FinanceService {
  private opsRepo = new OperationsRepository();
  private adminRepo = new AdminRepository();

  constructor(private expenseRepo: ExpenseRepository) {}

  private async getBusinessTimezone(): Promise<string> {
    const rows = await executeQuery<any>(`SELECT timezone FROM business_settings WHERE id = 1 LIMIT 1`);
    return rows[0]?.timezone || 'UTC';
  }

  /**
   * All figures come from the shared rules in server/domain/businessRules.ts.
   * Errors (bad branch, bad custom range, DB failure) propagate; nothing is defaulted to "looks fine" data.
   */
  public async getFinanceAnalytics(filters?: FinanceReportFilters, nowOverride?: Date): Promise<AnalyticsResult> {
    const [allBookings, allExpenses, allBranches, allFacilities, tz] = await Promise.all([
      this.opsRepo.getAllBookings(),
      this.expenseRepo.getAllExpenses(),
      this.adminRepo.getBranches(),
      this.adminRepo.getFacilities(),
      this.getBusinessTimezone(),
    ]);

    const today = todayInTimezone(tz, nowOverride);
    const range = resolveDateRange(filters?.period || 'all', today, { startDate: filters?.startDate, endDate: filters?.endDate, customDates: filters?.customDates });
    const branchRefs: BranchRef[] = allBranches.map((b) => ({ id: b.id, name: b.name }));
    const selected = resolveBranch(filters?.branch, branchRefs);
    const activeBranchIds = allBranches.filter((b) => b.status === 'Active').map((b) => b.id);

    const bookings = allBookings.filter(
      (b) => isQualifyingBooking(b.status) && inRange(b.date, range) && (!selected || recordBelongsToBranch({ branch: b.branch }, selected))
    );
    const expenses = allExpenses
      .filter((e) => isQualifyingExpense((e as any).status) && inRange(e.date, range))
      .map((e) => ({ e, cents: expenseCentsForView(e, selected, activeBranchIds) }))
      .filter((x) => x.cents !== 0 || !selected);

    const revenueCents = bookings.reduce((s, b) => s + toCents(b.amount), 0);
    const expenseCents = expenses.reduce((s, x) => s + x.cents, 0);
    const netCents = revenueCents - expenseCents;

    const totalBookings = bookings.length;
    const uniqueClients = new Set(bookings.map((b) => b.clientId || `name:${(b.clientName || '').toLowerCase()}`)).size;

    // ---------------------------------------------------------------- occupancy (as of the end of the range, never in the future)
    const refDate = range.end && range.end < today ? range.end : today;
    const scopedFacilities = allFacilities.filter(
      (f) => f.status === 'Active' && (!selected || f.branchId === selected.id || (f.branchName || '').toLowerCase() === selected.name.toLowerCase())
    );
    const totalCapacity = scopedFacilities.reduce((s, f) => s + (Number(f.capacity) || 0), 0);
    const facilityKeys = new Set(scopedFacilities.map((f) => `${(f.branchName || '').toLowerCase()}|${f.name.toLowerCase()}`));
    const occupied = allBookings.filter(
      (b) => bookingOccupiesOn(b, refDate) && facilityKeys.has(`${(b.branch || '').toLowerCase()}|${(b.facility || '').toLowerCase()}`)
    ).length;
    const occupancyRate = occupancyPercent(Math.min(occupied, totalCapacity), totalCapacity);

    // ---------------------------------------------------------------- time series
    const spanDays = range.start && range.end ? Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) + 1 : null;
    const bucketMonthly = !range.dates && (spanDays === null || spanDays > 92);
    const bucketOf = (d: string) => (bucketMonthly ? `${d.substring(0, 7)}-01` : d.substring(0, 10));

    const series = new Map<string, { revenue: number; expenses: number; branchRevenues: Record<string, number> }>();
    const touch = (k: string) => {
      if (!series.has(k)) series.set(k, { revenue: 0, expenses: 0, branchRevenues: {} });
      return series.get(k)!;
    };
    if (range.dates) {
      range.dates.forEach((d) => touch(d)); // only the dates the user picked
    } else if (!bucketMonthly && range.start && range.end) {
      for (let d = range.start; d <= range.end; d = addDays(d, 1)) touch(d); // continuous daily axis
    }
    for (const b of bookings) {
      const s = touch(bucketOf(b.date));
      const c = toCents(b.amount);
      s.revenue += c;
      s.branchRevenues[b.branch] = (s.branchRevenues[b.branch] || 0) + c;
    }
    for (const x of expenses) touch(bucketOf(x.e.date)).expenses += x.cents;

    const revenueVsExpensesChart = [...series.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        period: bucketMonthly ? date.slice(0, 7) : date.slice(5),
        date,
        revenue: fromCents(v.revenue),
        expenses: fromCents(v.expenses),
        profit: fromCents(v.revenue - v.expenses),
        branchRevenues: Object.fromEntries(Object.entries(v.branchRevenues).map(([k, c]) => [k, fromCents(c)])),
      }));

    // Trailing six calendar months ending in the business "today" month, same rules and branch filter.
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - i, 1));
      monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    const monthlyRevenueChart = monthKeys.map((m) => {
      const rev = allBookings
        .filter((b) => isQualifyingBooking(b.status) && b.date.startsWith(m) && (!selected || recordBelongsToBranch({ branch: b.branch }, selected)))
        .reduce((s, b) => s + toCents(b.amount), 0);
      const exp = allExpenses
        .filter((e) => isQualifyingExpense((e as any).status) && e.date.startsWith(m))
        .reduce((s, e) => s + expenseCentsForView(e, selected, activeBranchIds), 0);
      return {
        month: new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        revenue: fromCents(rev),
        expenses: fromCents(exp),
        profit: fromCents(rev - exp),
      };
    });

    // ---------------------------------------------------------------- breakdowns (all reconcile to the totals above)
    const facilityAgg = new Map<string, { count: number; cents: number }>();
    for (const b of bookings) {
      const cur = facilityAgg.get(b.facility) || { count: 0, cents: 0 };
      facilityAgg.set(b.facility, { count: cur.count + 1, cents: cur.cents + toCents(b.amount) });
    }
    const facilityRevenueBreakdown = [...facilityAgg.entries()]
      .map(([facility, v]) => ({ facility, revenue: fromCents(v.cents), percentage: pct(v.cents, revenueCents) }))
      .sort((a, b) => b.revenue - a.revenue);
    const topFacilities = [...facilityAgg.entries()]
      .map(([facility, v]) => ({ facility, bookingsCount: v.count, revenue: fromCents(v.cents) }))
      .sort((a, b) => b.revenue - a.revenue);

    const catAgg = new Map<string, { count: number; cents: number }>();
    for (const x of expenses) {
      const key = x.e.category || 'Uncategorized';
      const cur = catAgg.get(key) || { count: 0, cents: 0 };
      catAgg.set(key, { count: cur.count + 1, cents: cur.cents + x.cents });
    }
    const expenseCategoryBreakdown = [...catAgg.entries()]
      .map(([category, v]) => ({ category, amount: fromCents(v.cents), percentage: pct(v.cents, expenseCents) }))
      .sort((a, b) => b.amount - a.amount);
    const topExpenseCategories = [...catAgg.entries()]
      .map(([category, v]) => ({ category, count: v.count, totalAmount: fromCents(v.cents) }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
    const expenseItems = expenses
      .map((x) => ({ id: x.e.id, name: x.e.name, category: x.e.category, amount: fromCents(x.cents), date: x.e.date, branch: x.e.branch }))
      .sort((a, b) => b.amount - a.amount);

    // ---------------------------------------------------------------- branch performance (same rules, every branch from the DB)
    const branchPerformance: BranchPerformance[] = allBranches.map((br) => {
      const ref = { id: br.id, name: br.name };
      const rev = allBookings
        .filter((b) => isQualifyingBooking(b.status) && inRange(b.date, range) && recordBelongsToBranch({ branch: b.branch }, ref))
        .reduce((s, b) => s + toCents(b.amount), 0);
      const exp = allExpenses
        .filter((e) => isQualifyingExpense((e as any).status) && inRange(e.date, range))
        .reduce((s, e) => s + expenseCentsForView(e, ref, activeBranchIds), 0);
      return { branchId: br.id, branch: br.name, revenue: fromCents(rev), expenses: fromCents(exp), netProfit: fromCents(rev - exp), profitMargin: profitMargin(rev, rev - exp) };
    });

    return {
      totalRevenue: fromCents(revenueCents),
      totalExpenses: fromCents(expenseCents),
      netProfit: fromCents(netCents),
      netProfitMargin: profitMargin(revenueCents, netCents),
      totalBookings,
      uniqueClients,
      averageBookingValue: totalBookings > 0 ? fromCents(Math.round(revenueCents / totalBookings)) : 0,
      occupancyRate,
      revenueVsExpensesChart,
      monthlyRevenueChart,
      facilityRevenueBreakdown,
      expenseCategoryBreakdown,
      topFacilities,
      topExpenseCategories,
      expenseItems,
      dateRange: range,
      branchPerformance,
    } as AnalyticsResult;
  }
}
