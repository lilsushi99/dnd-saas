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
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [occupancyRate, setOccupancyRate] = useState<number>(0);
  const [hasCapacityData, setHasCapacityData] = useState<boolean>(true);

  const loadData = () => {
    let period: string = 'all';
    if (selectedRange === 'last_7' || selectedRange === '7D') period = 'last_7_days';
    else if (selectedRange === 'last_30' || selectedRange === '30D') period = 'last_30_days';
    else if (selectedRange === 'this_month') period = 'this_month';
    else if (selectedRange === 'last_12_months' || selectedRange === '12M') period = 'last_12_months';
    else if (selectedRange === 'full_year') period = 'full_year';
    else if (selectedRange === 'today') period = 'today';
    else if (selectedRange === 'custom') period = 'custom';
    else if (selectedRange === 'all') period = 'all';

    FinanceApiService.fetchAnalytics({
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      period: period as any,
      startDate: selectedRange === 'custom' ? filters?.startDate : undefined,
      endDate: selectedRange === 'custom' ? filters?.endDate : undefined,
    })
      .then((data) => {
        const rev = data.totalRevenue || 0;
        const exp = data.totalExpenses || 0;
        const net = data.netProfit !== undefined ? data.netProfit : rev - exp;
        const margin =
          data.netProfitMargin !== undefined
            ? data.netProfitMargin
            : rev > 0
            ? Math.round(((net / rev) * 100) * 10) / 10
            : 0;

        setRevenue(rev);
        setExpenses(exp);
        setNetProfit(net);
        setProfitMargin(margin);
        setTotalBookings(data.totalBookings || 0);

        if (data.occupancyRate !== undefined && data.occupancyRate !== null && !isNaN(Number(data.occupancyRate))) {
          setOccupancyRate(Number(data.occupancyRate));
          setHasCapacityData(true);
        } else {
          setOccupancyRate(0);
          setHasCapacityData(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching overview metrics:', err);
        setRevenue(0);
        setExpenses(0);
        setNetProfit(0);
        setProfitMargin(0);
        setTotalBookings(0);
        setOccupancyRate(0);
        setHasCapacityData(false);
      });
  };

  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener('nexus:refresh-financials', handleRefresh);
    return () => window.removeEventListener('nexus:refresh-financials', handleRefresh);
  }, [selectedBranch, selectedRange, filters?.startDate, filters?.endDate]);

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val);
    if (rounded < 0) {
      return `-₦${Math.abs(rounded).toLocaleString()}`;
    }
    return `₦${rounded.toLocaleString()}`;
  };

  const getOccupancyStatus = (rate: number, hasData: boolean) => {
    if (!hasData) return { label: 'No capacity data', isPos: false, isNeutral: true };
    if (rate >= 100) return { label: 'Full', isPos: false, isNeutral: false };
    if (rate >= 80) return { label: 'Nearly full', isPos: true, isNeutral: false };
    if (rate > 0) return { label: 'Available', isPos: true, isNeutral: false };
    return { label: 'No active bookings', isPos: false, isNeutral: true };
  };

  const occStatus = getOccupancyStatus(occupancyRate, hasCapacityData);

  const metrics: (MetricCardData & { valueColor?: string })[] = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCurrency(revenue),
      change: revenue > 0 ? 'Recognized' : '₦0',
      isPositive: revenue > 0,
      isNeutral: revenue === 0,
      timeframe: 'qualifying bookings',
      iconClass: 'fa-solid fa-dollar-sign',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'expenses',
      title: 'Operating Expenses',
      value: formatCurrency(expenses),
      change: expenses > 0 ? 'Recorded' : '₦0',
      isPositive: false,
      isNeutral: true,
      timeframe: 'operating expenditures',
      iconClass: 'fa-solid fa-credit-card',
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
    },
    {
      id: 'net_profit',
      title: 'Net Profit',
      value: formatCurrency(netProfit),
      valueColor:
        netProfit > 0
          ? 'text-emerald-600'
          : netProfit < 0
          ? 'text-rose-600'
          : 'text-gray-900',
      change: `${netProfit > 0 ? '+' : ''}${profitMargin.toFixed(1)}%`,
      isPositive: netProfit > 0,
      isNeutral: netProfit === 0,
      timeframe: 'profit margin',
      iconClass: 'fa-solid fa-chart-pie',
      iconBg:
        netProfit > 0
          ? 'bg-emerald-50'
          : netProfit < 0
          ? 'bg-rose-50'
          : 'bg-gray-100',
      iconColor:
        netProfit > 0
          ? 'text-emerald-600'
          : netProfit < 0
          ? 'text-rose-600'
          : 'text-gray-600',
    },
    {
      id: 'total_bookings',
      title: 'Total Bookings',
      value: `${totalBookings.toLocaleString()}`,
      change: totalBookings > 0 ? `${totalBookings} units` : '0 units',
      isPositive: totalBookings > 0,
      isNeutral: totalBookings === 0,
      timeframe: 'qualifying records',
      iconClass: 'fa-solid fa-calendar-check',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'occupancy',
      title: 'Overall Occupancy Rate',
      value: hasCapacityData ? `${occupancyRate.toFixed(1)}%` : 'No Data',
      change: occStatus.label,
      isPositive: occStatus.isPos,
      isNeutral: occStatus.isNeutral,
      timeframe: 'capacity utilization',
      iconClass: 'fa-solid fa-building',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 font-sans">
      {metrics.map((card) => (
        <div
          key={card.id}
          className="h-full bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between overflow-hidden min-w-0"
        >
          {/* Top row: Title and Icon */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-xs font-normal text-gray-500 whitespace-normal break-words leading-snug flex-1">
              {card.title}
            </span>
            <div
              className={`w-8 h-8 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center text-xs shrink-0`}
            >
              <i className={card.iconClass}></i>
            </div>
          </div>

          {/* Middle: Value */}
          <div className="mb-2 min-w-0">
            <span
              className={`font-heading text-xl sm:text-2xl font-medium tracking-tight block truncate break-words ${
                card.valueColor || 'text-gray-900'
              }`}
            >
              {card.value}
            </span>
          </div>

          {/* Bottom row: Trend / Sub-metric indicator */}
          <div className="flex items-center gap-1.5 text-xs font-normal min-w-0">
            <span
              className={`inline-flex items-center gap-1 font-medium shrink-0 ${
                card.isNeutral
                  ? 'text-gray-500'
                  : card.isPositive
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              <i
                className={`fa-solid ${
                  card.isNeutral
                    ? 'fa-minus'
                    : card.isPositive
                    ? 'fa-arrow-up-right'
                    : 'fa-arrow-down-right'
                } text-[10px]`}
              ></i>
              {card.change}
            </span>
            <span className="text-gray-400 text-[11px] truncate">{card.timeframe}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
