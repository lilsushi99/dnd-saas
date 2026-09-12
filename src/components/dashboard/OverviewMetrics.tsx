import React, { useState, useEffect } from 'react';
import { MetricCardData, DashboardFilters } from '../../types';
import { FinanceApiService } from '../../services/financeService';

interface OverviewMetricsProps {
  branchFilter?: string;
  filters?: DashboardFilters;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  branchFilter = 'all',
  filters,
}) => {
  const selectedBranch = filters?.branch || branchFilter;
  const selectedRange = filters?.dateRange || 'this_month';

  const [revenue, setRevenue] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  const [netProfit, setNetProfit] = useState<number>(0);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [occupancyRate, setOccupancyRate] = useState<string>('0.0');

  useEffect(() => {
    let period: string = 'all';
    if (selectedRange === 'last_7' || selectedRange === '7D') period = 'last_7_days';
    else if (selectedRange === 'last_30' || selectedRange === '30D') period = 'last_30_days';
    else if (selectedRange === 'this_month') period = 'this_month';
    else if (selectedRange === 'last_12_months' || selectedRange === '12M') period = 'full_year';
    else if (selectedRange === 'today') period = 'today';
    else if (selectedRange === 'custom') period = 'custom';
    else if (selectedRange === 'all') period = 'all';

    FinanceApiService.fetchAnalytics({
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      period: period as any,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    })
      .then((data) => {
        setRevenue(data.totalRevenue || 0);
        setExpenses(data.totalExpenses || 0);
        setNetProfit(data.netProfit || 0);
        setTotalBookings(data.totalBookings || 0);
        const occ = data.occupancyRate !== undefined ? Number(data.occupancyRate).toFixed(1) : (data.totalBookings > 0 ? (Math.min(100, (data.totalBookings / 30) * 100)).toFixed(1) : '0.0');
        setOccupancyRate(occ);
      })
      .catch((err) => {
        console.error('Error fetching overview metrics:', err);
        setRevenue(0);
        setExpenses(0);
        setNetProfit(0);
        setTotalBookings(0);
        setOccupancyRate('0.0');
      });
  }, [selectedBranch, selectedRange, filters?.startDate, filters?.endDate]);

  const formatCurrency = (val: number) =>
    `₦${Math.round(val).toLocaleString()}`;

  const metrics: MetricCardData[] = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCurrency(revenue),
      change: revenue > 0 ? '+100%' : '0.0%',
      isPositive: true,
      timeframe: 'vs previous period',
      iconClass: 'fa-solid fa-dollar-sign',
      iconBg: 'bg-blue-50 border border-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'expenses',
      title: 'Operating Expenses',
      value: formatCurrency(expenses),
      change: expenses > 0 ? '+100%' : '0.0%',
      isPositive: expenses === 0,
      timeframe: 'vs previous period',
      iconClass: 'fa-solid fa-credit-card',
      iconBg: 'bg-slate-50 border border-slate-200/80',
      iconColor: 'text-slate-600',
    },
    {
      id: 'net_profit',
      title: 'Net Profit',
      value: formatCurrency(netProfit),
      change: netProfit >= 0 ? '+0.0%' : '-100%',
      isPositive: netProfit >= 0,
      timeframe: 'vs previous period',
      iconClass: 'fa-solid fa-chart-pie',
      iconBg: 'bg-emerald-50 border border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'total_bookings',
      title: 'Total Bookings',
      value: `${totalBookings.toLocaleString()}`,
      change: totalBookings > 0 ? `+${totalBookings}` : '0',
      isPositive: true,
      timeframe: 'total recorded',
      iconClass: 'fa-solid fa-calendar-check',
      iconBg: 'bg-indigo-50 border border-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'occupancy',
      title: 'Overall Occupancy Rate',
      value: `${occupancyRate}%`,
      change: 'Active status',
      isPositive: true,
      timeframe: 'utilization',
      iconClass: 'fa-solid fa-building',
      iconBg: 'bg-amber-50 border border-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 font-sans">
      {metrics.map((card) => (
        <div
          key={card.id}
          className="h-full bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden min-w-0"
        >
          {/* Top row: Title and Icon */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-500 whitespace-normal break-words leading-snug flex-1">
              {card.title}
            </span>
            <div
              className={`w-8 h-8 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform`}
            >
              <i className={card.iconClass}></i>
            </div>
          </div>

          {/* Middle: Value */}
          <div className="mb-2 min-w-0">
            <span className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight block truncate break-words">
              {card.value}
            </span>
          </div>

          {/* Bottom row: Trend indicator */}
          <div className="flex items-center gap-1.5 text-xs font-medium min-w-0">
            <span
              className={`inline-flex items-center gap-1 font-bold shrink-0 ${
                card.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              <i
                className={`fa-solid ${
                  card.isPositive ? 'fa-arrow-up-right' : 'fa-arrow-down-right'
                } text-[10px]`}
              ></i>
              {card.change}
            </span>
            <span className="text-gray-400 text-[11px] truncate">
              {card.timeframe}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
