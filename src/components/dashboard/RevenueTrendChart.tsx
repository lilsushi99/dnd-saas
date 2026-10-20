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
  const [selectedBranchTab, setSelectedBranchTab] = useState<string>('compare');
  const [chartData, setChartData] = useState<
    Array<{
      date: string;
      revenue: number;
      expenses: number;
      profit: number;
      branchRevenues?: Record<string, number>;
    }>
  >([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => {
        setBranches((bList || []).filter((b) => b.status === 'Active'));
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

  const loadChartData = () => {
    setLoading(true);
    setError(null);
    let period = 'last_30_days';
    if (timeframe === '7D') period = 'last_7_days';
    else if (timeframe === '30D') period = 'last_30_days';
    else if (timeframe === '12M') period = 'last_12_months';

    const branch =
      selectedBranchTab !== 'compare' && selectedBranchTab !== 'all'
        ? selectedBranchTab
        : undefined;

    FinanceApiService.fetchAnalytics({
      period: period as any,
      branch,
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
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load revenue trend chart:', err);
        setError(err.message || 'Failed to load revenue trend chart');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadChartData();

    const handleRefresh = () => {
      loadChartData();
    };

    window.addEventListener('nexus:refresh-financials', handleRefresh);
    return () => window.removeEventListener('nexus:refresh-financials', handleRefresh);
  }, [timeframe, selectedBranchTab]);

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
          <div className="bg-white p-3 rounded-xl shadow-lg text-xs font-sans min-w-[190px]">
            <p className="font-semibold text-gray-900 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
              <span>{label}</span>
              <span className="text-[10px] text-gray-400 font-normal">Branch Revenue</span>
            </p>
            <div className="space-y-1.5">
              {branches.map((b, idx) => {
                const color = branchColors[idx % branchColors.length].stroke;
                const rev = (dataPoint?.branchRevenues && dataPoint.branchRevenues[b.name]) || 0;
                return (
                  <div key={b.id} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 font-normal text-gray-700">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      ></span>
                      {b.name}:
                    </span>
                    <span className="font-medium text-gray-900">₦{rev.toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between gap-4 font-semibold text-gray-900">
                <span>Total:</span>
                <span>₦{(dataPoint?.revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      }

      const rev = dataPoint?.revenue || 0;
      const exp = dataPoint?.expenses || 0;

      return (
        <div className="bg-white p-3 rounded-xl shadow-lg text-xs font-sans min-w-[180px]">
          <p className="font-semibold text-gray-900 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-gray-400 font-normal">
              {selectedBranchTab === 'compare' ? 'All Branches' : selectedBranchTab}
            </span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-blue-600 font-normal">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Revenue:
              </span>
              <span className="font-medium text-gray-900">₦{rev.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-rose-600 font-normal">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Expenses:
              </span>
              <span className="font-medium text-gray-900">₦{exp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs font-sans flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
            Revenue
          </h3>
        </div>

        {/* Hub Selector and Time Selector (Identical horizontal alignment & visual control group) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hub Selector */}
          <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl text-xs font-normal">
            <button
              type="button"
              onClick={() => setSelectedBranchTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                selectedBranchTab === 'all'
                  ? 'bg-white text-gray-900 font-medium shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Hubs
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranchTab(b.name)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedBranchTab.toLowerCase() === b.name.toLowerCase() ||
                  selectedBranchTab.toLowerCase() === b.id.toLowerCase()
                    ? 'bg-white text-gray-900 font-medium shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {b.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedBranchTab('compare')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                selectedBranchTab === 'compare'
                  ? 'bg-white text-gray-900 font-medium shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Compare</span>
            </button>
          </div>

          {/* Time Selector */}
          <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl text-xs font-normal">
            {(['7D', '30D', '12M'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white text-gray-900 font-medium shadow-2xs'
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
      <div className="flex flex-wrap items-center gap-5 mb-3 text-xs font-normal text-gray-500">
        {isCompare ? (
          <>
            {branches.map((b, idx) => {
              const c = branchColors[idx % branchColors.length].stroke;
              return (
                <div key={b.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }}></span>
                  <span className="text-gray-700">{b.name}</span>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="text-gray-700">Gross Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-gray-700">Operating Expenses</span>
            </div>
          </>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-[250px] w-full min-h-[220px]">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            </div>
            <p className="text-xs font-semibold text-gray-800 mb-0.5">{error}</p>
            <p className="text-[11px] text-gray-500 mb-2.5">Data could not be refreshed for this branch selection.</p>
            <button
              onClick={loadChartData}
              className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : loading && chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-xl">
            <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-lg mb-2"></i>
            <p className="text-xs text-gray-500">Loading revenue metrics...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl">
            <p className="text-xs font-normal text-gray-500">No Revenue Data in Timeframe</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                </linearGradient>
                {branches.map((b, idx) => {
                  const color = branchColors[idx % branchColors.length].stroke;
                  return (
                    <linearGradient key={b.id} id={`colorBranch_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₦${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {isCompare ? (
                branches.map((b, idx) => {
                  const color = branchColors[idx % branchColors.length].stroke;
                  return (
                    <Area
                      key={b.id}
                      type="monotone"
                      dataKey={(item) => (item.branchRevenues ? item.branchRevenues[b.name] || 0 : 0)}
                      name={b.name}
                      stroke={color}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#colorBranch_${idx})`}
                    />
                  );
                })
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#2563EB"
                    strokeWidth={2}
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

      {/* Footer Metrics (Total Revenue, Total Expense, Net Profit, Profit Margin) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-4 mt-4 text-left">
        <div>
          <span className="text-xs font-normal text-gray-500 block">Total Revenue</span>
          <span className="text-base sm:text-lg font-medium text-gray-900 mt-1 block font-heading">
            ₦{totalRevSum.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-xs font-normal text-gray-500 block">Total Expense</span>
          <span className="text-base sm:text-lg font-medium text-gray-900 mt-1 block font-heading">
            ₦{totalExpSum.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-xs font-normal text-gray-500 block">Net Profit</span>
          <span className="text-base sm:text-lg font-medium text-gray-900 mt-1 block font-heading">
            ₦{netProfit.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-xs font-normal text-gray-500 block">Profit Margin</span>
          <span className="text-base sm:text-lg font-medium text-gray-900 mt-1 block font-heading">
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
