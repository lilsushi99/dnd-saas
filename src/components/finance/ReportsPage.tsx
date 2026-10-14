import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useFinanceReports } from '../../hooks/useFinanceReports';
import { exportFinanceReportToPDF } from '../../utils/exportUtils';
import { Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomSelect } from '../common/CustomSelect';
import { MultiDatePicker } from '../common/MultiDatePicker';

interface ReportsPageProps {
  branchFilter?: string;
}

const COLOR_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export const ReportsPage: React.FC<ReportsPageProps> = ({ branchFilter = 'all' }) => {
  const {
    analytics,
    loading,
    error,
    period,
    setPeriod,
    customDates,
    setCustomDates,
    branch,
    setBranch,
  } = useFinanceReports(branchFilter);

  const [dbBranches, setDbBranches] = useState<Branch[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setDbBranches(bList))
      .catch((err) => console.error('Error fetching branches in ReportsPage:', err));
  }, []);

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'last_7_days', label: 'Last Seven Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'full_year', label: 'Full Year' },
    { id: 'custom', label: 'Custom Date' },
  ];

  const branchOptions = [
    { id: 'all', label: 'All Branches' },
    ...dbBranches.map((b) => ({ id: b.name, label: b.name })),
  ];

  const formatPeriodDisplay = () => {
    if (period === 'custom') {
      if (customDates.length === 0) return 'Custom Date';
      if (customDates.length === 1) return `Date: ${customDates[0]}`;
      return `${customDates.length} Selected Dates`;
    }
    const found = periods.find((p) => p.id === period);
    return found ? found.label : period;
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const periodDisplay =
      period === 'custom' && customDates.length > 0
        ? `Custom Dates (${customDates.join('; ')})`
        : formatPeriodDisplay();

    const lines = [
      'Financial Reports & Analytics Summary',
      `Period,${periodDisplay}`,
      `Branch,${branch}`,
      `Generated Date,${new Date().toISOString().slice(0, 10)}`,
      '',
      'KPI Metrics',
      `Total Revenue (₦),${analytics.totalRevenue}`,
      `Total Expenses (₦),${analytics.totalExpenses}`,
      `Net Profit (₦),${analytics.netProfit}`,
      `Net Profit Margin (%),${analytics.netProfitMargin}%`,
      `Total Bookings,${analytics.totalBookings}`,
      `Unique Clients,${analytics.uniqueClients}`,
      '',
      'Facility Revenue Breakdown',
      'Facility,Revenue (₦),Percentage (%)',
      ...analytics.facilityRevenueBreakdown.map(
        (f) => `"${f.facility}",${f.revenue},${f.percentage}%`
      ),
      '',
      'Expense Category Breakdown',
      'Category,Amount (₦),Percentage (%)',
      ...analytics.expenseCategoryBreakdown.map(
        (c) => `"${c.category}",${c.amount},${c.percentage}%`
      ),
      '',
      'Operational Expense Items',
      'Expense Name,Category,Branch,Date,Amount (₦)',
      ...(analytics.expenseItems || []).map(
        (e) => `"${e.name}","${e.category}","${e.branch}",${e.date},${e.amount}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Report_${period}_${branch}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!analytics) return;
    const periodDisplay =
      period === 'custom' && customDates.length > 0
        ? `Custom Dates (${customDates.join('; ')})`
        : formatPeriodDisplay();

    const lines = [
      'FINANCIAL REPORTS & ANALYTICS SUMMARY',
      `Period:\t${periodDisplay}`,
      `Branch:\t${branch}`,
      `Date Generated:\t${new Date().toISOString().slice(0, 10)}`,
      '',
      'KPI METRICS',
      `Total Revenue (₦)\t${analytics.totalRevenue}`,
      `Total Expenses (₦)\t${analytics.totalExpenses}`,
      `Net Profit (₦)\t${analytics.netProfit}`,
      `Net Profit Margin (%)\t${analytics.netProfitMargin}%`,
      `Total Bookings\t${analytics.totalBookings}`,
      `Unique Clients\t${analytics.uniqueClients}`,
      '',
      'FACILITY REVENUE BREAKDOWN',
      'Facility\tRevenue (₦)\tPercentage (%)',
      ...analytics.facilityRevenueBreakdown.map(
        (f) => `${f.facility}\t${f.revenue}\t${f.percentage}%`
      ),
      '',
      'EXPENSE CATEGORY BREAKDOWN',
      'Category\tAmount (₦)\tPercentage (%)',
      ...analytics.expenseCategoryBreakdown.map(
        (c) => `${c.category}\t${c.amount}\t${c.percentage}%`
      ),
      '',
      'OPERATIONAL EXPENSE ITEMS',
      'Expense Name\tCategory\tBranch\tDate\tAmount (₦)',
      ...(analytics.expenseItems || []).map(
        (e) => `${e.name}\t${e.category}\t${e.branch}\t${e.date}\t${e.amount}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Report_${period}_${branch}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!analytics) return;
    const periodLabel = formatPeriodDisplay();
    const branchObj = branchOptions.find((b) => b.id === branch);
    const branchLabel = branchObj ? branchObj.label : branch;

    exportFinanceReportToPDF({
      periodLabel,
      branchName: branchLabel,
      analytics,
    });
  };

  const handleCustomDateClick = () => {
    setPeriod('custom');
    // If no custom dates selected yet, default to today
    if (customDates.length === 0) {
      const todayIso = new Date().toISOString().slice(0, 10);
      setCustomDates([todayIso]);
    }
    setIsCalendarOpen((prev) => !prev);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. PAGE HEADING AND EXPORT ACTIONS */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
          Report and Financial Analytics
        </h2>

        {/* EXPORT BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600"></i>
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-600"></i>
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf"></i>
            Print / PDF
          </button>
        </div>
      </div>

      {/* 2. DATE FILTERS AND CUSTOM CALENDAR */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Time Periods Pill Group */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
          {periods.map((p) => {
            const isSelected = period === p.id;
            if (p.id === 'custom') {
              return (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={handleCustomDateClick}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className="fa-regular fa-calendar-days text-[11px] text-blue-600"></i>
                    <span>{p.label}</span>
                    {isSelected && customDates.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-medium">
                        {customDates.length}
                      </span>
                    )}
                  </button>

                  {/* Multi-Date Calendar Popover */}
                  <MultiDatePicker
                    selectedDates={customDates}
                    onChange={(newDates) => setCustomDates(newDates)}
                    isOpen={isCalendarOpen}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                </div>
              );
            }

            return (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id as any);
                  setIsCalendarOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Branch Filter with CustomSelect */}
        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="text-xs font-semibold text-gray-500 shrink-0">Branch:</span>
          <div className="flex-1">
            <CustomSelect
              options={branchOptions}
              value={branch}
              onChange={(val) => setBranch(String(val))}
              className="py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center bg-white border border-gray-200 rounded-2xl">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600"></i>
          <p className="text-xs font-semibold text-gray-500 mt-3">Compiling financial analytics & ledger calculations...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold text-center">
          <i className="fa-solid fa-triangle-exclamation text-xl mb-1 block"></i>
          {error}
        </div>
      ) : !analytics ? (
        <div className="p-12 text-center text-gray-500 text-xs font-semibold">No data available.</div>
      ) : (
        <>
          {/* ANALYTICS CARDS (6 KPIs) — Clean hierarchy: heading, icon without border, metric value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Total Revenue */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <i className="fa-solid fa-sack-dollar text-xs"></i>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  ₦{analytics.totalRevenue.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* 2. Total Expenses */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Expenses</span>
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <i className="fa-solid fa-receipt text-xs"></i>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  ₦{analytics.totalExpenses.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* 3. Net Profit */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Net Profit</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <i className="fa-solid fa-chart-line text-xs"></i>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  ₦{analytics.netProfit.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* 4. Profit Margin */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Profit Margin</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <i className="fa-solid fa-percent text-xs"></i>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  {analytics.netProfitMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 5. Total Bookings */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Bookings</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <i className="fa-solid fa-calendar-check text-xs"></i>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  {analytics.totalBookings}
                </span>
              </div>
            </div>

            {/* 6. Unique Clients */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Unique Clients</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <i className="fa-solid fa-users text-xs"></i>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                  {analytics.uniqueClients}
                </span>
              </div>
            </div>
          </div>

          {/* SINGLE WIDE INTERACTIVE REVENUE ANALYTICS AREA CHART */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">
                  Revenue, Expenses & Profit Analytics
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Interactive multi-series Area Chart comparing Revenue (Blue), Expenses (Red), and Net Profit (Green)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold bg-gray-50 px-3 py-1.5 rounded-xl shrink-0">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Expenses
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Net Profit
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueVsExpensesChart}>
                  <defs>
                    <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="reportExpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="reportProfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₦${v.toLocaleString()}`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `₦${Number(value).toLocaleString()}`,
                      name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Net Profit',
                    ]}
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', color: '#FFF', fontSize: '12px', border: 'none' }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#reportRevGrad)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#reportExpGrad)" />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#reportProfGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHARTS ROW: FACILITY & EXPENSE BREAKDOWNS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facility Revenue Breakdown */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Facility Revenue Breakdown</h3>
                <p className="text-xs text-gray-500">Distribution of revenue generated by facility type</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.facilityRevenueBreakdown}
                        dataKey="revenue"
                        nameKey="facility"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {analytics.facilityRevenueBreakdown.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`₦${Number(val).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {analytics.facilityRevenueBreakdown.map((item, idx) => (
                    <div key={item.facility} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                        ></span>
                        <span className="font-medium text-gray-700 truncate max-w-[120px]">
                          {item.facility}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-medium text-gray-900">₦{item.revenue.toLocaleString()}</span>
                        <span className="text-gray-400 text-[10px] ml-1">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Expense Category Breakdown */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Expense Category Breakdown</h3>
                <p className="text-xs text-gray-500">Operational costs distribution by category</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.expenseCategoryBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {analytics.expenseCategoryBreakdown.map((_, idx) => (
                          <Cell key={`cell-cat-${idx}`} fill={COLOR_PALETTE[(idx + 3) % COLOR_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`₦${Number(val).toLocaleString()}`, 'Amount']}
                        contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', color: '#FFF', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {analytics.expenseCategoryBreakdown.map((item, idx) => (
                    <div key={item.category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLOR_PALETTE[(idx + 3) % COLOR_PALETTE.length] }}
                        ></span>
                        <span className="font-medium text-gray-700">{item.category}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-medium text-gray-900">₦{item.amount.toLocaleString()}</span>
                        <span className="text-gray-400 text-[10px] ml-1">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TABLES ROW: TOP REVENUE FACILITIES & EXPENSE ITEMS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Revenue Facilities Table */}
            <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Top Revenue Facilities</h3>
                  <p className="text-xs text-gray-500">Ranked by overall booking financial yield</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  {analytics.topFacilities.length} Facilities
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Facility Name</th>
                      <th className="py-3 px-4 text-center">Bookings Count</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {analytics.topFacilities.map((tf) => (
                      <tr key={tf.facility} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{tf.facility}</td>
                        <td className="py-3 px-4 text-center font-normal">{tf.bookingsCount}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          ₦{tf.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Items Breakdown Table */}
            <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Top Expense Items</h3>
                  <p className="text-xs text-gray-500">Operational expense entries for the selected period</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                  {(analytics.expenseItems || []).length} Expense Entries
                </span>
              </div>
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      <th className="py-3 px-4">Expense Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {(analytics.expenseItems || []).map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-normal text-gray-900">{exp.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600">
                          ₦{exp.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(!analytics.expenseItems || analytics.expenseItems.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-gray-400 text-xs font-medium">
                          No expense items found for selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
