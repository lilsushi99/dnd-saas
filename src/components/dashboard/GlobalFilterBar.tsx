import React, { useState, useEffect } from 'react';
import { DashboardFilters, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';

interface GlobalFilterBarProps {
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
  onExport: (format: 'csv' | 'pdf') => void;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onFilterChange,
  onExport,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dbBranches, setDbBranches] = useState<Branch[]>([]);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((data) => setDbBranches(data))
      .catch((err) => console.error('Failed to load branches in filter bar:', err));
  }, []);

  const branchOptions = [
    { id: 'all', label: 'All Branches (Global)' },
    ...dbBranches.map((b) => ({ id: b.id, label: b.name })),
  ];

  const dateRanges = [
    { id: 'all', label: 'All Time (Global)' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_7', label: 'Last 7 Days' },
    { id: 'last_30', label: 'Last 30 Days' },
    { id: 'last_12_months', label: 'Last 12 Months' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const handleDateRangeChange = (newRange: string) => {
    if (newRange === 'custom' && (!filters.startDate || !filters.endDate)) {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      onFilterChange({
        ...filters,
        dateRange: newRange,
        startDate: filters.startDate || thirtyDaysAgo,
        endDate: filters.endDate || today,
      });
    } else {
      onFilterChange({ ...filters, dateRange: newRange });
    }
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 mb-6 shadow-2xs flex flex-wrap items-center justify-between gap-4 font-sans">
      {/* Left Group: Primary Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider pr-2 border-r border-gray-200">
          <i className="fa-solid fa-filter text-blue-600 text-xs"></i>
          <span>Unified Filters</span>
        </div>

        {/* Branch Selector */}
        <div className="relative">
          <label className="sr-only">Branch</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-building-user text-xs"></i>
            </div>
            <select
              value={filters.branch}
              onChange={(e) =>
                onFilterChange({ ...filters, branch: e.target.value })
              }
              className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer appearance-none"
            >
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="relative">
          <label className="sr-only">Date Range</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-regular fa-calendar-days text-xs"></i>
            </div>
            <select
              value={filters.dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer appearance-none"
            >
              {dateRanges.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>

        {/* Custom Range Date Pickers */}
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 animate-in fade-in duration-150">
            <span className="text-gray-400 font-normal text-[11px]">Start:</span>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                onFilterChange({ ...filters, startDate: e.target.value })
              }
              className="bg-transparent text-gray-900 focus:outline-none text-xs font-mono cursor-pointer"
            />
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 font-normal text-[11px]">End:</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                onFilterChange({ ...filters, endDate: e.target.value })
              }
              className="bg-transparent text-gray-900 focus:outline-none text-xs font-mono cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Right Group: Global Actions (Export) */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
          >
            <i className="fa-solid fa-file-export text-gray-500"></i>
            <span>Export Dashboard</span>
            <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-1 text-xs font-medium text-gray-700">
              <button
                onClick={() => {
                  onExport('csv');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-file-csv text-green-600 w-4"></i>
                <span>Export as CSV</span>
              </button>
              <button
                onClick={() => {
                  onExport('pdf');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-file-pdf text-red-600 w-4"></i>
                <span>Export as PDF Report</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
