import React, { useState, useEffect } from 'react';
import { AdminApiService } from '../../services/adminService';
import { OperationsApiService } from '../../services/operationsService';

interface FacilityOccupancyStatusCardProps {
  branchFilter?: string;
}

interface FacilityOccupancyItem {
  id: string;
  name: string;
  branchName: string;
  occupied: number;
  capacity: number;
}

export const FacilityOccupancyStatusCard: React.FC<FacilityOccupancyStatusCardProps> = ({
  branchFilter = 'all',
}) => {
  const [activeBranchTab, setActiveBranchTab] = useState<string>('all');
  const [facilities, setFacilities] = useState<FacilityOccupancyItem[]>([]);

  useEffect(() => {
    Promise.all([
      AdminApiService.fetchFacilities(),
      OperationsApiService.fetchBookings(),
      AdminApiService.fetchBranches(),
    ])
      .then(([dbFacs, bookingsData]) => {
        const bookingsList = bookingsData.bookings || [];
        const facilityMap = new Map<string, FacilityOccupancyItem>();

        dbFacs.forEach((f) => {
          const key = `${f.name.toLowerCase()}_${(f.branchName || '').toLowerCase()}`;
          facilityMap.set(key, {
            id: f.id,
            name: f.name,
            branchName: f.branchName || 'Primary Hub',
            occupied: 0,
            capacity: f.capacity || 10,
          });
        });

        bookingsList.forEach((b) => {
          if (!b.facility) return;
          const key = `${b.facility.toLowerCase()}_${(b.branch || '').toLowerCase()}`;
          if (!facilityMap.has(key)) {
            const existingKey = Array.from(facilityMap.keys()).find(
              (k) => k.startsWith(b.facility.toLowerCase()) || b.facility.toLowerCase().startsWith(k.split('_')[0])
            );
            if (!existingKey) {
              facilityMap.set(key, {
                id: `FAC-GEN-${b.id}`,
                name: b.facility,
                branchName: b.branch || 'Global Hub',
                occupied: 0,
                capacity: 10,
              });
            }
          }
        });

        const items = Array.from(facilityMap.values()).map((item) => {
          const itemKeyNorm = item.name.toLowerCase();
          const itemBranchNorm = item.branchName.toLowerCase();

          const activeBookings = bookingsList.filter((b) => {
            if (b.status !== 'Active') return false;
            const bFacNorm = (b.facility || '').toLowerCase();
            const bBranchNorm = (b.branch || '').toLowerCase();

            const isFacMatch =
              bFacNorm === itemKeyNorm ||
              bFacNorm.includes(itemKeyNorm) ||
              itemKeyNorm.includes(bFacNorm);

            const isBranchMatch =
              !bBranchNorm ||
              !itemBranchNorm ||
              bBranchNorm === itemBranchNorm ||
              bBranchNorm.includes(itemBranchNorm) ||
              itemBranchNorm.includes(bBranchNorm);

            return isFacMatch && isBranchMatch;
          });

          return {
            ...item,
            occupied: activeBookings.length,
          };
        });

        setFacilities(items);
      })
      .catch((err) => console.error('Error fetching occupancy data:', err));
  }, []);

  const selectedBranch = branchFilter !== 'all' ? branchFilter : activeBranchTab;

  const filteredFacilities = facilities.filter((f) => {
    if (selectedBranch === 'all') return true;
    const sel = selectedBranch.toLowerCase();
    const fBranch = f.branchName.toLowerCase();
    return (
      fBranch.includes(sel) ||
      sel.includes(fBranch) ||
      (sel === 'br-001' && fBranch.includes('lekki')) ||
      (sel === 'br-002' && fBranch.includes('victoria')) ||
      (sel === 'br-003' && fBranch.includes('london')) ||
      (sel === 'br-004' && fBranch.includes('new york'))
    );
  });

  const totalOccupied = filteredFacilities.reduce((sum, item) => sum + item.occupied, 0);
  const totalCapacity = filteredFacilities.reduce((sum, item) => sum + item.capacity, 0);
  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

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

        {/* Hub selector */}
        {branchFilter === 'all' && branchList.length > 0 && (
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

      {/* Simpler Capacity Indicator */}
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-heading text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
          {overallOccupancyPct}% Occupied
        </span>
        <span className="text-xs font-normal text-gray-500">
          {totalOccupied}/{totalCapacity} capacity
        </span>
      </div>

      {/* Facility Availability Cards */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
        {filteredFacilities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <i className="fa-solid fa-building text-base mb-1"></i>
            <p className="text-xs font-normal">No facilities registered</p>
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
