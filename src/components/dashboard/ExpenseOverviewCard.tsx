import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardFilters } from '../../types';
import { FinanceApiService } from '../../services/financeService';

interface ExpenseOverviewCardProps {
  branchFilter?: string;
  filters?: DashboardFilters;
}

interface ExpenseCategoryData {
  name: string;
  value: number;
  color: string;
}

const PALETTE = [
  '#2563EB', '#0284C7', '#7C3AED', '#D97706', '#10B981',
  '#06B6D4', '#059669', '#DC2626', '#8B5CF6', '#EC4899',
];

export const ExpenseOverviewCard: React.FC<ExpenseOverviewCardProps> = ({
  branchFilter = 'all',
  filters,
}) => {
  const selectedBranch = filters?.branch || branchFilter;
  const selectedRange = filters?.dateRange || 'this_month';

  const [categories, setCategories] = useState<ExpenseCategoryData[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);

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
        setTotalExpense(data.totalExpenses || 0);
        if (data.expenseCategoryBreakdown && data.expenseCategoryBreakdown.length > 0) {
          const mapped = data.expenseCategoryBreakdown.map((item, idx) => ({
            name: item.category,
            value: item.amount,
            color: PALETTE[idx % PALETTE.length],
          }));
          setCategories(mapped);
        } else {
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load expense category overview:', err);
        setCategories([]);
        setTotalExpense(0);
      });
  }, [selectedBranch, selectedRange, filters?.startDate, filters?.endDate]);

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans flex flex-col justify-between h-full min-h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-3">
        <div>
          <h3 className="font-heading text-sm font-bold text-gray-900 leading-none flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Expense Overview
          </h3>
          <p className="text-[11px] font-medium text-gray-500 mt-1">
            Categorized operational expenditure breakdown
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
            Total Operating Expenses
          </span>
          <span className="text-sm font-bold text-gray-900 font-mono">
            ₦{totalExpense.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Pie Chart & Center Metric */}
      <div className="relative flex-1 flex items-center justify-center min-h-[190px]">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-2">
              <i className="fa-solid fa-receipt text-base"></i>
            </div>
            <p className="text-xs font-semibold text-gray-600">No Expenses Recorded</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Operating expenses for this timeframe are currently zero.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Expense']}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '11px',
                    padding: '8px 12px',
                  }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Categories
              </span>
              <span className="text-xs font-bold text-gray-900 font-heading">
                {categories.length} Items
              </span>
            </div>
          </>
        )}
      </div>

      {/* Custom Category Grid Legend */}
      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
          {categories.map((item, idx) => {
            const percent = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : '0';
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] font-medium text-gray-700 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="text-right shrink-0 pl-1">
                  <span className="text-[11px] font-bold text-gray-900 font-mono block leading-none">
                    ₦{item.value.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
