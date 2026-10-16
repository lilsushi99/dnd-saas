import React, { useState, useEffect } from 'react';
import { AdminApiService } from '../../services/adminService';
import { OperationsApiService } from '../../services/operationsService';
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

  const selectedBranch =
    filters?.branch && filters.branch !== 'all'
      ? filters.branch
      : branchFilter !== 'all'
      ? branchFilter
      : activeBranchTab;

  const loadOccupancyData = () => {
    setLoading(true);
    Promise.all([
      AdminApiService.fetchFacilities(),
      OperationsApiService.fetchBookings(),
      AdminApiService.fetchBranches(),
    ])
      .then(([dbFacs, bookingsData, branchesData]) => {
        setDbBranches(branchesData || []);
        const bookingsList = bookingsData.bookings || [];

        // Determine reference date: use end date of selected period or today
        const todayStr = new Date().toISOString().substring(0, 10);
        let refDate = todayStr;
        if (filters?.dateRange === 'custom' && filters.endDate) {
          refDate = filters.endDate < todayStr ? filters.endDate : todayStr;
        }

        // Map facilities
        const items: FacilityOccupancyItem[] = dbFacs
          .filter((f) => f.status === 'Active')
          .map((f) => {
            const fNameNorm = f.name.trim().toLowerCase();
            const fBranchIdNorm = (f.branchId || '').trim().toLowerCase();
            const fBranchNameNorm = (f.branchName || '').trim().toLowerCase();

            // Count qualifying bookings that occupy on refDate
            const occupyingBookings = bookingsList.filter((b) => {
              if (b.status === 'Cancelled') return false;

              // Check date interval occupation
              const bDateStr = String(b.date).substring(0, 10);
              const isHourly = b.durationUnit === 'Hour' || f.pricingBasis === 'Per Hour';
              let occupies = false;
              if (isHourly) {
                occupies = bDateStr === refDate;
              } else {
                const days = Math.max(1, Number(b.daysCount) || 1);
                const bStartDate = new Date(bDateStr + 'T00:00:00Z');
                const bEndDate = new Date(bStartDate.getTime() + (days - 1) * 86400000);
                const bEndStr = bEndDate.toISOString().substring(0, 10);
                occupies = refDate >= bDateStr && refDate <= bEndStr;
              }

              if (!occupies) return false;

              const bFacNorm = (b.facility || '').trim().toLowerCase();
              const bBranchNorm = (b.branch || '').trim().toLowerCase();

              const facMatch = bFacNorm === fNameNorm;
              const branchMatch =
                !bBranchNorm ||
                !fBranchNameNorm ||
                bBranchNorm === fBranchNameNorm ||
                bBranchNorm === fBranchIdNorm;

              return facMatch && branchMatch;
            });

            const facilityCapacity = Math.max(1, Number(f.capacity) || 1);
            // Cap occupied count at permitted capacity to avoid exceeding 100% per unit
            const occupiedCount = Math.min(occupyingBookings.length, facilityCapacity);

            return {
              id: f.id,
              name: f.name,
              branchId: f.branchId,
              branchName: f.branchName || 'Main Branch',
              occupied: occupiedCount,
              capacity: facilityCapacity,
            };
          });

        setFacilities(items);
      })
      .catch((err) => console.error('Error fetching occupancy data:', err))
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

  // Resolve selected branch against registered branches
  let targetBranchId: string | null = null;
  let targetBranchName: string | null = null;

  if (selectedBranch && selectedBranch !== 'all') {
    const selLower = selectedBranch.trim().toLowerCase();
    const matched = dbBranches.find(
      (b) => b.id.toLowerCase() === selLower || b.name.toLowerCase() === selLower
    );
    if (matched) {
      targetBranchId = matched.id.toLowerCase();
      targetBranchName = matched.name.toLowerCase();
    } else {
      targetBranchName = selLower;
    }
  }

  const filteredFacilities = facilities.filter((f) => {
    if (!targetBranchId && !targetBranchName) return true;
    const fId = (f.branchId || '').toLowerCase();
    const fName = (f.branchName || '').toLowerCase();

    if (targetBranchId && fId === targetBranchId) return true;
    if (targetBranchName && fName === targetBranchName) return true;
    return false;
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
        {filteredFacilities.length === 0 ? (
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
