import { ExpenseRepository } from '../repositories/expenseRepository';
import { OperationsRepository } from '../repositories/operationsRepository';
import { AdminRepository } from '../repositories/adminRepository';
import { FinanceReportFilters, FinanceAnalyticsSummary, Expense } from '../../src/types';

export class FinanceService {
  private opsRepo: OperationsRepository;
  private adminRepo: AdminRepository;

  constructor(private expenseRepo: ExpenseRepository) {
    this.opsRepo = new OperationsRepository();
    this.adminRepo = new AdminRepository();
  }

  public async getFinanceAnalytics(filters?: FinanceReportFilters): Promise<FinanceAnalyticsSummary> {
    const todayStr = new Date().toISOString().substring(0, 10);
    const period = filters?.period || 'this_month';
    const selectedBranch = filters?.branch || 'all';

    const allBookings = await this.opsRepo.getAllBookings();
    const allExpenses = await this.expenseRepo.getAllExpenses();
    const branches = await this.adminRepo.getBranches();

    // Resolve branch filtering search terms (ID or Name)
    let branchSearchTerms: string[] = [];
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'compare') {
      const sLower = selectedBranch.toLowerCase();
      branchSearchTerms.push(sLower);
      const matched = branches.find(
        (b) => b.id.toLowerCase() === sLower || b.name.toLowerCase() === sLower
      );
      if (matched) {
        branchSearchTerms.push(matched.id.toLowerCase());
        branchSearchTerms.push(matched.name.toLowerCase());
      }
    }

    // Smart date period determination
    let targetMonthStr = todayStr.substring(0, 7);
    if (period === 'this_month') {
      const currentMonthBookings = allBookings.filter((b) => b.date.startsWith(targetMonthStr));
      const currentMonthExpenses = allExpenses.filter((e) => e.date.startsWith(targetMonthStr));
      if (currentMonthBookings.length === 0 && currentMonthExpenses.length === 0) {
        // Fallback to the latest available month in DB so default landing page isn't zeroed
        const dates = [...allBookings.map((b) => b.date), ...allExpenses.map((e) => e.date)].sort().reverse();
        if (dates.length > 0) {
          targetMonthStr = dates[0].substring(0, 7);
        }
      }
    }

    const isDateInPeriod = (dateStr: string): boolean => {
      const p = String(period);
      if (p === 'today') {
        return dateStr === todayStr;
      }
      if (p === 'last_7_days' || p === '7D' || p === 'last_7') {
        const d = new Date(todayStr);
        d.setDate(d.getDate() - 7);
        const sevenDaysAgo = d.toISOString().substring(0, 10);
        return dateStr >= sevenDaysAgo && dateStr <= todayStr;
      }
      if (p === 'this_month') {
        return dateStr.startsWith(targetMonthStr);
      }
      if (p === '30D' || p === 'last_30_days' || p === 'last_30') {
        const d = new Date(todayStr);
        d.setDate(d.getDate() - 30);
        const thirtyDaysAgo = d.toISOString().substring(0, 10);
        return dateStr >= thirtyDaysAgo && dateStr <= todayStr;
      }
      if (p === 'full_year' || p === '12M' || p === 'last_12_months' || p === 'all') {
        return true;
      }
      if (p === 'custom' && filters?.startDate && filters?.endDate) {
        return dateStr >= filters.startDate && dateStr <= filters.endDate;
      }
      return true;
    };

    let filteredBookings = allBookings.filter((b) => isDateInPeriod(b.date));

    if (branchSearchTerms.length > 0) {
      filteredBookings = filteredBookings.filter((b) => {
        const bName = b.branch.toLowerCase();
        return branchSearchTerms.some((term) => bName.includes(term) || term.includes(bName));
      });
    }

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const totalBookings = filteredBookings.length;
    const uniqueClientsSet = new Set(filteredBookings.map((b) => b.clientId || b.clientName));
    const uniqueClients = uniqueClientsSet.size;
    const averageBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    // Calculate real occupancy rate from total active bookings and total capacity
    const allFacilities = await this.adminRepo.getFacilities();
    let relevantFacilities = allFacilities;
    if (branchSearchTerms.length > 0) {
      relevantFacilities = allFacilities.filter((f) => {
        const fBranchName = (f.branchName || '').toLowerCase();
        const fBranchId = (f.branchId || '').toLowerCase();
        return branchSearchTerms.some(
          (term) => fBranchName.includes(term) || term.includes(fBranchName) || fBranchId === term
        );
      });
    }
    const totalCapacity = relevantFacilities.reduce((sum, f) => sum + (f.capacity || 0), 0);
    const activeBookingsCount = allBookings.filter((b) => {
      if (b.status !== 'Active') return false;
      if (branchSearchTerms.length > 0) {
        const bName = b.branch.toLowerCase();
        return branchSearchTerms.some((term) => bName.includes(term) || term.includes(bName));
      }
      return true;
    }).length;
    const occupancyRate = totalCapacity > 0 ? Number(((activeBookingsCount / totalCapacity) * 100).toFixed(1)) : 0;

    let filteredExpenses = allExpenses.filter((e) => isDateInPeriod(e.date));

    const getEffectiveExpenseAmount = (e: Expense): number => {
      const amt = Number(e.amount || 0);
      if (
        branchSearchTerms.length > 0 &&
        (e.branch.toLowerCase() === 'both branches' || e.branch.toLowerCase() === 'all branches')
      ) {
        return amt / 2;
      }
      return amt;
    };

    if (branchSearchTerms.length > 0) {
      filteredExpenses = filteredExpenses.filter((e) => {
        const eBranch = e.branch.toLowerCase();
        if (eBranch === 'both branches' || eBranch === 'all branches') {
          return true;
        }
        return branchSearchTerms.some((term) => eBranch.includes(term) || term.includes(eBranch));
      });
    }

    const totalExpenses = filteredExpenses.reduce(
      (sum, e) => sum + getEffectiveExpenseAmount(e),
      0
    );

    const netProfit = totalRevenue - totalExpenses;
    const netProfitMargin =
      totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0;

    const dateMap = new Map<string, { revenue: number; expenses: number; branchRevenues: Record<string, number> }>();

    // Build unique dates list from available records or selected period
    const allDatesSet = new Set<string>([
      ...filteredBookings.map((b) => b.date),
      ...filteredExpenses.map((e) => e.date),
    ]);

    const periodStr = String(period);
    if (periodStr === 'last_7_days' || periodStr === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStr);
        d.setDate(d.getDate() - i);
        allDatesSet.add(d.toISOString().slice(0, 10));
      }
    } else if (period === 'this_month') {
      for (let i = 1; i <= 31; i++) {
        const dayStr = i.toString().padStart(2, '0');
        allDatesSet.add(`${targetMonthStr}-${dayStr}`);
      }
    }

    const datesList = Array.from(allDatesSet).sort();

    for (const d of datesList) {
      dateMap.set(d, { revenue: 0, expenses: 0, branchRevenues: {} });
    }

    for (const b of filteredBookings) {
      const bBranch = b.branch || 'General';
      const amt = Number(b.amount || 0);
      if (dateMap.has(b.date)) {
        const entry = dateMap.get(b.date)!;
        entry.revenue += amt;
        entry.branchRevenues[bBranch] = (entry.branchRevenues[bBranch] || 0) + amt;
      } else {
        dateMap.set(b.date, { revenue: amt, expenses: 0, branchRevenues: { [bBranch]: amt } });
      }
    }

    for (const e of filteredExpenses) {
      const amt = getEffectiveExpenseAmount(e);
      if (dateMap.has(e.date)) {
        dateMap.get(e.date)!.expenses += amt;
      } else {
        dateMap.set(e.date, { revenue: 0, expenses: amt, branchRevenues: {} });
      }
    }

    const revenueVsExpensesChart = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, val]) => ({
        period: d.slice(5),
        date: d,
        revenue: val.revenue,
        expenses: val.expenses,
        profit: val.revenue - val.expenses,
        branchRevenues: val.branchRevenues,
      }));

    const now = new Date();
    const months: string[] = [];
    const monthNames: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}`);
      monthNames.push(d.toLocaleString('default', { month: 'short' }));
    }

    const monthlyRevenueChart = months.map((m, idx) => {
      const mBookings = allBookings.filter((b) => {
        if (!b.date.startsWith(m)) return false;
        if (branchSearchTerms.length > 0) {
          const bName = b.branch.toLowerCase();
          return branchSearchTerms.some((term) => bName.includes(term) || term.includes(bName));
        }
        return true;
      });
      const mExpenses = allExpenses.filter((e) => {
        if (!e.date.startsWith(m)) return false;
        if (branchSearchTerms.length > 0) {
          const eBranch = e.branch.toLowerCase();
          if (eBranch === 'both branches' || eBranch === 'all branches') return true;
          return branchSearchTerms.some((term) => eBranch.includes(term) || term.includes(eBranch));
        }
        return true;
      });

      const rev = mBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
      const exp = mExpenses.reduce((sum, e) => sum + getEffectiveExpenseAmount(e), 0);

      return {
        month: monthNames[idx],
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
      };
    });

    const facilityMap = new Map<string, number>();
    for (const b of filteredBookings) {
      facilityMap.set(b.facility, (facilityMap.get(b.facility) || 0) + b.amount);
    }

    const facilityRevenueBreakdown = Array.from(facilityMap.entries())
      .map(([facility, revenue]) => ({
        facility,
        revenue,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const categoryMap = new Map<string, number>();
    for (const e of filteredExpenses) {
      const amt = getEffectiveExpenseAmount(e);
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + amt);
    }

    const expenseCategoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topFacilityStats = new Map<string, { count: number; revenue: number }>();
    for (const b of filteredBookings) {
      const cur = topFacilityStats.get(b.facility) || { count: 0, revenue: 0 };
      topFacilityStats.set(b.facility, {
        count: cur.count + 1,
        revenue: cur.revenue + b.amount,
      });
    }

    const topFacilities = Array.from(topFacilityStats.entries())
      .map(([facility, data]) => ({
        facility,
        bookingsCount: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topExpStats = new Map<string, { count: number; totalAmount: number }>();
    for (const e of filteredExpenses) {
      const amt = getEffectiveExpenseAmount(e);
      const cur = topExpStats.get(e.category) || { count: 0, totalAmount: 0 };
      topExpStats.set(e.category, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + amt,
      });
    }

    const topExpenseCategories = Array.from(topExpStats.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.totalAmount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const expenseItems = filteredExpenses
      .map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        amount: getEffectiveExpenseAmount(e),
        date: e.date,
        branch: e.branch,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      netProfitMargin,
      totalBookings,
      uniqueClients,
      averageBookingValue,
      occupancyRate,
      revenueVsExpensesChart,
      monthlyRevenueChart,
      facilityRevenueBreakdown,
      expenseCategoryBreakdown,
      topFacilities,
      topExpenseCategories,
      expenseItems,
    };
  }
}
