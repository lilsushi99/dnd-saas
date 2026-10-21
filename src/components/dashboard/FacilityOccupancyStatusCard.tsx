import React, { useState, useEffect } from 'react';
import { AdminApiService } from '../../services/adminService';
import { FinanceApiService } from '../../services/financeService';
import { DashboardFilters, Branch } from '../../types';

interface FacilityOccupancyStatusCardProps {
  branchFilter?: string;
  filters?: DashboardFilters;
}

interface FacilityOccupancyItem {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  occupied: number;
  capacity: number;
}

export const FacilityOccupancyStatusCard: React.FC<FacilityOccupancyStatusCardProps> = ({
  branchFilter = 'all',
  filters,
}) => {
  const [activeBranchTab, setActiveBranchTab] = useState<string>('all');
  const [facilities, setFacilities] = useState<FacilityOccupancyItem[]>([]);
  const [dbBranches, setDbBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedBranch =
    filters?.branch && filters.branch !== 'all'
      ? filters.branch
      : branchFilter !== 'all'
      ? branchFilter
      : undefined;

  const loadOccupancyData = () => {
    setLoading(true);
    setError(null);
    let period: string = 'all';
    const selectedRange = filters?.dateRange || 'this_month';
    if (selectedRange === 'last_7' || selectedRange === '7D') period = 'last_7_days';
    else if (selectedRange === 'last_30' || selectedRange === '30D') period = 'last_30_days';
    else if (selectedRange === 'this_month') period = 'this_month';
    else if (selectedRange === 'last_12_months' || selectedRange === '12M') period = 'last_12_months';
    else if (selectedRange === 'today') period = 'today';
    else if (selectedRange === 'custom') period = 'custom';
    else if (selectedRange === 'all') period = 'all';

    Promise.all([
      FinanceApiService.fetchAnalytics({
        branch: selectedBranch,
        period: period as any,
        startDate: selectedRange === 'custom' ? filters?.startDate : undefined,
        endDate: selectedRange === 'custom' ? filters?.endDate : undefined,
      }),
      AdminApiService.fetchBranches(),
    ])
      .then(([analytics, branchesData]) => {
        setDbBranches((branchesData || []).filter((b) => b.status === 'Active'));
        if (analytics.facilityOccupancy && analytics.facilityOccupancy.length > 0) {
          setFacilities(analytics.facilityOccupancy);
        } else {
          setFacilities([]);
        }
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching occupancy data:', err);
        setError(err.message || 'Failed to load occupancy data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOccupancyData();

    const handleRefresh = () => {
      loadOccupancyData();
    };

    window.addEventListener('nexus:refresh-financials', handleRefresh);
    window.addEventListener('nexus:refresh-branches', handleRefresh);
    return () => {
      window.removeEventListener('nexus:refresh-financials', handleRefresh);
      window.removeEventListener('nexus:refresh-branches', handleRefresh);
    };
  }, [selectedBranch, filters?.dateRange, filters?.startDate, filters?.endDate, branchFilter]);

  const filteredFacilities = facilities.filter((f) => {
    if (selectedBranch && selectedBranch !== 'all') return true;
    if (activeBranchTab === 'all') return true;
    const fId = (f.branchId || '').toLowerCase();
    const fName = (f.branchName || '').toLowerCase();
    const tabLower = activeBranchTab.toLowerCase();
    return fId === tabLower || fName === tabLower;
  });

  const totalOccupied = filteredFacilities.reduce((sum, item) => sum + item.occupied, 0);
  const totalCapacity = filteredFacilities.reduce((sum, item) => sum + item.capacity, 0);
  const hasCapacity = totalCapacity > 0 && filteredFacilities.length > 0;
  const overallOccupancyPct = hasCapacity ? Math.min(100, Math.round((totalOccupied / totalCapacity) * 100)) : 0;

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) {
      return {
        badgeClass: 'bg-red-50 text-red-700',
        label: 'Full',
        barClass: 'bg-red-500',
      };
    }
    if (percent >= 80) {
      return {
        badgeClass: 'bg-amber-50 text-amber-800',
        label: 'Nearly full',
        barClass: 'bg-amber-500',
      };
    }
    return {
      badgeClass: 'bg-emerald-50 text-emerald-700',
      label: 'Available',
      barClass: 'bg-emerald-500',
    };
  };

  const branchList = Array.from(new Set(facilities.map((f) => f.branchName))).filter(Boolean);

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs font-sans flex flex-col justify-between h-[480px] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3 shrink-0">
        <h3 className="font-heading text-base font-semibold text-gray-900 tracking-tight">
          Occupancy Status
        </h3>

        {/* Hub selector when global filter is 'all' */}
        {(!filters?.branch || filters.branch === 'all') && branchFilter === 'all' && branchList.length > 0 && (
          <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl text-xs font-normal self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveBranchTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeBranchTab === 'all'
                  ? 'bg-white text-gray-900 font-medium shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Hubs
            </button>
            {branchList.map((bName) => (
              <button
                key={bName}
                type="button"
                onClick={() => setActiveBranchTab(bName)}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeBranchTab === bName
                    ? 'bg-white text-gray-900 font-medium shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {bName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Capacity Indicator */}
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-heading text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
          {hasCapacity ? `${overallOccupancyPct}% Occupied` : 'No Capacity Data'}
        </span>
        <span className="text-xs font-normal text-gray-500">
          {hasCapacity ? `${totalOccupied}/${totalCapacity} capacity` : '0/0 capacity'}
        </span>
      </div>

      {/* Facility Availability Cards */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-amber-50/60 border border-amber-200/70 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5">
              <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            </div>
            <p className="text-xs font-semibold text-gray-800 mb-0.5">{error}</p>
            <p className="text-[11px] text-gray-500 mb-2.5">Occupancy data could not be loaded for this branch selection.</p>
            <button
              onClick={loadOccupancyData}
              className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : loading && facilities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-base mb-1"></i>
            <p className="text-xs font-normal">Loading facility occupancy...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <i className="fa-solid fa-building text-base mb-1"></i>
            <p className="text-xs font-normal">No facilities registered for this branch</p>
          </div>
        ) : (
          filteredFacilities.map((facility) => {
            const pct = facility.capacity > 0 ? Math.round((facility.occupied / facility.capacity) * 100) : 0;
            const { badgeClass, label, barClass } = getStatusBadge(pct);

            return (
              <div
                key={facility.id}
                className="p-3 rounded-xl bg-gray-50/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-heading font-medium text-xs text-gray-900 truncate">
                      {facility.name}
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal truncate">
                      · {facility.branchName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${badgeClass}`}>
                      {label}
                    </span>
                    <span className="text-xs font-medium text-gray-900 font-heading">
                      {facility.occupied}/{facility.capacity}
                    </span>
                  </div>
                </div>

                {/* Horizontal Capacity Bar */}
                <div className="relative w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barClass}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
