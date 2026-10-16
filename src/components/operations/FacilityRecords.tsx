import React, { useState, useEffect, useRef } from 'react';
import { useOperations } from '../../hooks/useOperations';
import { FacilityAnalyticsTable } from './FacilityAnalyticsTable';
import { Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomDatePicker } from '../common/CustomDatePicker';

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

  // Custom Dropdown toggle states
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const loadBranches = () => {
    AdminApiService.fetchBranches()
      .then((bList) => setDbBranches(bList))
      .catch((err) => console.error('Error loading branches in FacilityRecords:', err));
  };

  useEffect(() => {
    loadBranches();

    const handleRefresh = () => {
      loadBranches();
    };

    window.addEventListener('nexus:refresh-branches', handleRefresh);
    return () => window.removeEventListener('nexus:refresh-branches', handleRefresh);
  }, []);

  const activeBranches = dbBranches.filter((b) => b.status === 'Active');
  const inactiveBranches = dbBranches.filter((b) => b.status === 'Inactive');

  const branches = [
    { id: 'all', label: 'All Branches', isInactive: false },
    ...activeBranches.map((b) => ({ id: b.id, label: b.name, name: b.name, isInactive: false })),
    ...inactiveBranches.map((b) => ({ id: b.id, label: `${b.name} (Inactive)`, name: b.name, isInactive: true })),
  ];

  const dateOptions = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const currentBranch = branches.find(
    (b) => b.id === branchSelect || b.label === branchSelect || (b as any).name === branchSelect
  );
  const currentBranchLabel = currentBranch ? currentBranch.label : (branchSelect === 'all' ? 'All Branches' : branchSelect);

  const currentDateLabel =
    dateOptions.find((d) => d.id === dateFilter)?.label || 'This Month';

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Facility Records
          </h2>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter Custom Dropdown */}
          <div className="relative" ref={branchRef}>
            <button
              type="button"
              onClick={() => {
                setShowBranchMenu(!showBranchMenu);
                setShowDateMenu(false);
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
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-30 p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                {branches.map((b) => {
                  const isSelected =
                    branchSelect === b.id ||
                    branchSelect === b.label ||
                    branchSelect === (b as any).name;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBranchSelect(b.id);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : b.isInactive
                          ? 'hover:bg-gray-50 text-gray-500 italic'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {b.label}
                        {b.isInactive && (
                          <i className="fa-solid fa-ban text-[10px] text-gray-400 not-italic"></i>
                        )}
                      </span>
                      {isSelected && (
                        <i className="fa-solid fa-check text-[10px] text-blue-600"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Filter Custom Dropdown */}
          <div className="relative" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setShowDateMenu(!showDateMenu);
                setShowBranchMenu(false);
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
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-30 p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                {dateOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDateFilter(opt.id);
                      setShowDateMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                      dateFilter === opt.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {dateFilter === opt.id && (
                      <i className="fa-solid fa-check text-[10px] text-blue-600"></i>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Date Inputs when Custom Range is selected */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <CustomDatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                placeholder="Start Date"
                className="w-36"
              />
              <span className="text-xs text-gray-400 font-medium">to</span>
              <CustomDatePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
                placeholder="End Date"
                className="w-36"
              />
            </div>
          )}
        </div>

        {/* Right Export Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => exportData('excel', 'facilities')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
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
