import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardFilters, Branch } from '../../types';
import { FinanceApiService } from '../../services/financeService';
import { AdminApiService } from '../../services/adminService';

interface RevenueTrendChartProps {
  branchFilter?: string;
  filters?: DashboardFilters;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ branchFilter, filters }) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '12M'>('30D');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchTab, setSelectedBranchTab] = useState<string>('compare'); // 'compare' or branch.name / branch.id
  const [chartData, setChartData] = useState<Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    branchRevenues?: Record<string, number>;
  }>>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Load branches dynamically from the database
  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => {
        setBranches(bList || []);
      })
      .catch((err) => console.error('Failed to load branches:', err));
  }, []);

  useEffect(() => {
    if (branchFilter && branchFilter !== 'all') {
      setSelectedBranchTab(branchFilter);
    } else {
      setSelectedBranchTab('compare');
    }
  }, [branchFilter]);

  useEffect(() => {
    if (filters?.dateRange === 'last_7' || filters?.dateRange === '7D') {
      setTimeframe('7D');
    } else if (filters?.dateRange === 'last_12_months' || filters?.dateRange === '12M') {
      setTimeframe('12M');
    } else if (filters?.dateRange === 'last_30' || filters?.dateRange === 'this_month') {
      setTimeframe('30D');
    }
  }, [filters?.dateRange]);

  useEffect(() => {
    let period: string = 'all';
    if (timeframe === '7D') period = 'last_7_days';
    else if (timeframe === '30D') period = 'last_30_days';
    else if (timeframe === '12M') period = 'all';

    if (filters?.dateRange === 'all') period = 'all';
    else if (filters?.dateRange === 'this_month') period = 'this_month';
    else if (filters?.dateRange === 'custom') period = 'custom';

    const branch = selectedBranchTab !== 'compare' && selectedBranchTab !== 'all' ? selectedBranchTab : undefined;

    FinanceApiService.fetchAnalytics({
      period: period as any,
      branch,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    })
      .then((data) => {
        setTotalRevenue(data.totalRevenue || 0);
        setTotalExpenses(data.totalExpenses || 0);

        if (data.revenueVsExpensesChart && data.revenueVsExpensesChart.length > 0) {
          const formatted = data.revenueVsExpensesChart.map((item: any) => ({
            date: item.date || item.period || '',
            revenue: Number(item.revenue) || 0,
            expenses: Number(item.expenses) || 0,
            profit: Number(item.profit) || 0,
            branchRevenues: item.branchRevenues,
          }));
          setChartData(formatted);
        } else {
          setChartData([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load revenue trend chart:', err);
        setChartData([]);
        setTotalRevenue(0);
        setTotalExpenses(0);
      });
  }, [timeframe, selectedBranchTab, filters?.dateRange, filters?.startDate, filters?.endDate]);

  const branchColors = [
    { stroke: '#10B981', fill: '#10B981', name: 'Emerald' },
    { stroke: '#F59E0B', fill: '#F59E0B', name: 'Amber' },
    { stroke: '#8B5CF6', fill: '#8B5CF6', name: 'Purple' },
    { stroke: '#06B6D4', fill: '#06B6D4', name: 'Cyan' },
  ];

  const isCompare = selectedBranchTab === 'compare';

  const totalRevSum = totalRevenue;
  const totalExpSum = totalExpenses;
  const netProfit = totalRevSum - totalExpSum;
  const profitMargin = totalRevSum > 0 ? (netProfit / totalRevSum) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;

      if (isCompare && branches.length > 0) {
        return (
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-xl text-xs font-sans min-w-[190px]">
            <p className="font-bold text-gray-900 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
              <span>{label}</span>
              <span className="text-[10px] text-gray-400 font-normal">Branch Revenue</span>
            </p>
            <div className="space-y-1.5">
              {branches.map((b, idx) => {
                const color = branchColors[idx % branchColors.length].stroke;
                const rev = (dataPoint?.branchRevenues && dataPoint.branchRevenues[b.name]) || 0;
                return (
                  <div key={b.id} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                      <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: color }}></span>
                      {b.name}:
                    </span>
                    <span className="font-bold text-gray-900">₦{rev.toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between gap-4 font-bold text-gray-900">
                <span>Total Revenue:</span>
                <span>₦{(dataPoint?.revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      }

      const rev = dataPoint?.revenue || 0;
      const exp = dataPoint?.expenses || 0;

      return (
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-xl text-xs font-sans min-w-[180px]">
          <p className="font-bold text-gray-900 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              {selectedBranchTab === 'compare' ? 'All Branches' : selectedBranchTab}
            </span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs"></span>
                Revenue:
              </span>
              <span className="font-bold text-gray-900">₦{rev.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-2xs"></span>
                Expenses:
              </span>
              <span className="font-bold text-gray-900">₦{exp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight">
            Revenue & Operational Trend
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Gross revenue stream vs operational expense ledgers
          </p>
        </div>

        {/* Branch Compare Mode & Timeframe Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 min-w-0 max-w-full">
          <div className="max-w-full sm:max-w-md lg:max-w-lg overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 p-1 bg-gray-100 rounded-xl text-xs font-semibold flex items-center gap-1 shrink min-w-0">
            <button
              onClick={() => setSelectedBranchTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedBranchTab === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Hubs
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchTab(b.name)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedBranchTab === b.name
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {b.name}
              </button>
            ))}
            <button
              onClick={() => setSelectedBranchTab('compare')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                selectedBranchTab === 'compare'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fa-solid fa-code-compare text-[10px]"></i>
              <span>Compare Branches</span>
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {(['7D', '30D', '12M'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend Row */}
      <div className="flex flex-wrap items-center gap-5 mb-3 text-xs font-medium">
        {isCompare ? (
          <>
            {branches.map((b, idx) => {
              const c = branchColors[idx % branchColors.length].stroke;
              return (
                <span key={b.id} className="flex items-center gap-1.5 text-gray-800 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }}></span>
                  {b.name}
                </span>
              );
            })}
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-gray-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Revenue (Blue)
            </span>
            <span className="flex items-center gap-1.5 text-gray-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Expenses (Red)
            </span>
          </>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 sm:h-72">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl">
            <p className="text-xs font-semibold text-gray-500">No Revenue Data Recorded</p>
            <p className="text-[11px] text-gray-400 mt-1">Bookings and revenue transactions will populate this timeline.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01} />
                </linearGradient>
                {branches.map((b, idx) => {
                  const c = branchColors[idx % branchColors.length].stroke;
                  return (
                    <linearGradient key={b.id} id={`colorBranch_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c} stopOpacity={0.01} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F1F5F9"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                dy={5}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `₦${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `₦${(val / 1000).toFixed(0)}k`
                    : `₦${val}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              {isCompare ? (
                <>
                  {branches.map((b, idx) => {
                    const c = branchColors[idx % branchColors.length].stroke;
                    return (
                      <Area
                        key={b.id}
                        type="monotone"
                        dataKey={(item) => (item.branchRevenues && item.branchRevenues[b.name]) || 0}
                        name={b.name}
                        stroke={c}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#colorBranch_${idx})`}
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#DC2626"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Business Summaries */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-100 pt-4 mt-4 text-left">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Total Revenue
          </span>
          <span className="text-sm font-extrabold text-blue-600 mt-0.5 block font-heading">
            ₦{totalRevSum.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Total Expenses
          </span>
          <span className="text-sm font-extrabold text-rose-600 mt-0.5 block font-heading">
            ₦{totalExpSum.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Net Profit
          </span>
          <span className="text-sm font-extrabold text-emerald-600 mt-0.5 block font-heading">
            ₦{netProfit.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Profit Margin
          </span>
          <span className="text-sm font-extrabold text-purple-600 mt-0.5 block font-heading">
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
