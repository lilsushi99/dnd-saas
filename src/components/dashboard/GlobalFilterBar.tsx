import React, { useState, useEffect, useRef } from 'react';
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
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [dbBranches, setDbBranches] = useState<Branch[]>([]);

  const branchRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((data) => setDbBranches(data))
      .catch((err) => console.error('Failed to load branches in filter bar:', err));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setShowBranchMenu(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDateMenu(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const branchOptions = [
    { id: 'all', label: 'All Branches' },
    ...dbBranches.map((b) => ({ id: b.id, label: b.name })),
  ];

  const dateRanges = [
    { id: 'last_7', label: 'Last Seven Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_30', label: 'Last 30 Days' },
    { id: 'last_12_months', label: 'Last 12 Months' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const currentBranchLabel =
    branchOptions.find((b) => b.id === filters.branch)?.label || 'All Branches';

  const currentDateLabel =
    dateRanges.find((d) => d.id === filters.dateRange)?.label ||
    (filters.dateRange === 'all' ? 'All Time' : 'Last Seven Days');

  const handleSelectDateRange = (newRange: string) => {
    setShowDateMenu(false);
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
    <div className="bg-white rounded-xl px-4 py-2.5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-3 font-sans">
      {/* Left: Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All Branches Dropdown */}
        <div className="relative" ref={branchRef}>
          <button
            type="button"
            onClick={() => {
              setShowBranchMenu(!showBranchMenu);
              setShowDateMenu(false);
              setShowExportMenu(false);
            }}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-building-user text-gray-400 text-xs"></i>
            <span>{currentBranchLabel}</span>
            <i
              className={`fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1 transition-transform ${
                showBranchMenu ? 'rotate-180' : ''
              }`}
            ></i>
          </button>

          {showBranchMenu && (
            <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg z-30 p-1.5 text-xs font-normal text-gray-700 animate-in fade-in duration-100">
              {branchOptions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onFilterChange({ ...filters, branch: b.id });
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    filters.branch === b.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{b.label}</span>
                  {filters.branch === b.id && (
                    <i className="fa-solid fa-check text-[10px] text-blue-600"></i>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Dropdown */}
        <div className="relative" ref={dateRef}>
          <button
            type="button"
            onClick={() => {
              setShowDateMenu(!showDateMenu);
              setShowBranchMenu(false);
              setShowExportMenu(false);
            }}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-regular fa-calendar-days text-gray-400 text-xs"></i>
            <span>{currentDateLabel}</span>
            <i
              className={`fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1 transition-transform ${
                showDateMenu ? 'rotate-180' : ''
              }`}
            ></i>
          </button>

          {showDateMenu && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg z-30 p-1.5 text-xs font-normal text-gray-700 animate-in fade-in duration-100">
              {dateRanges.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSelectDateRange(d.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    filters.dateRange === d.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{d.label}</span>
                  {filters.dateRange === d.id && (
                    <i className="fa-solid fa-check text-[10px] text-blue-600"></i>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Range Date Pickers (if custom selected) */}
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-700">
            <span className="text-gray-400 text-[11px]">Start:</span>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
              className="bg-transparent text-gray-900 focus:outline-none text-xs cursor-pointer font-sans"
            />
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 text-[11px]">End:</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
              className="bg-transparent text-gray-900 focus:outline-none text-xs cursor-pointer font-sans"
            />
          </div>
        )}
      </div>

      {/* Right: Export Dashboard Button */}
      <div className="relative" ref={exportRef}>
        <button
          type="button"
          onClick={() => {
            setShowExportMenu(!showExportMenu);
            setShowBranchMenu(false);
            setShowDateMenu(false);
          }}
          className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-file-export text-gray-400 text-xs"></i>
          <span>Export Dashboard</span>
          <i
            className={`fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1 transition-transform ${
              showExportMenu ? 'rotate-180' : ''
            }`}
          ></i>
        </button>

        {showExportMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg z-30 p-1.5 text-xs font-normal text-gray-700 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={() => {
                onExport('csv');
                setShowExportMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer text-gray-700"
            >
              <i className="fa-solid fa-file-csv text-emerald-600 w-4"></i>
              <span>Export as CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onExport('pdf');
                setShowExportMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer text-gray-700"
            >
              <i className="fa-solid fa-file-pdf text-rose-600 w-4"></i>
              <span>Export as PDF Report</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
