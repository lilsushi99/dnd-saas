import React, { useState, useEffect } from 'react';
import { useOperations } from '../../hooks/useOperations';
import { FacilityAnalyticsTable } from './FacilityAnalyticsTable';
import { Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';

interface FacilityRecordsProps {
  branchFilter?: string;
}

export const FacilityRecords: React.FC<FacilityRecordsProps> = ({ branchFilter = 'all' }) => {
  const {
    facilityRecords,
    loading,
    error,
    branchSelect,
    setBranchSelect,
    dateFilter,
    setDateFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    exportData,
  } = useOperations(branchFilter);

  const [dbBranches, setDbBranches] = useState<Branch[]>([]);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setDbBranches(bList))
      .catch((err) => console.error('Error loading branches in FacilityRecords:', err));
  }, []);

  const branches = [
    { id: 'all', label: 'All Branches (Global)' },
    ...dbBranches.map((b) => ({ id: b.id, label: b.name })),
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Title */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Facility Records & Yield Sheets
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-generated from Daily Logger check-ins. No manual entry required.
          </p>
        </div>

        {/* Informational Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 self-start md:self-auto">
          <i className="fa-solid fa-sync text-emerald-600 text-xs animate-spin"></i>
          <span>Synced with Database</span>
        </div>
      </div>

      {/* Unified Filters Bar */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider pr-2 border-r border-gray-200">
            <i className="fa-solid fa-filter text-blue-600 text-xs"></i>
            <span>Sheet Filters</span>
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-building-user text-xs"></i>
            </div>
            <select
              value={branchSelect}
              onChange={(e) => setBranchSelect(e.target.value)}
              className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer appearance-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-regular fa-calendar-days text-xs"></i>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer appearance-none"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
              <option value="all">All Time</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>

          {/* Custom Date Inputs when Custom Range is selected */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
              />
            </div>
          )}

        </div>

        {/* Right Export Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => exportData('excel', 'facilities')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-sm"></i>
            <span>Export Facility Sheet</span>
          </button>
        </div>
      </div>

      {/* Analytics Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-xs">
          <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-xl mb-2"></i>
          <span>Computing facility analytics from Daily Logger...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      ) : (
        <FacilityAnalyticsTable records={facilityRecords} />
      )}
    </div>
  );
};
