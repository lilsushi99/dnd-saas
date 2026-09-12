import React, { useState, useEffect } from 'react';
import { AdminApiService } from '../../services/adminService';
import { OperationsApiService } from '../../services/operationsService';
import { Facility, Booking } from '../../types';

interface FacilityOccupancyStatusCardProps {
  branchFilter?: string;
}

interface FacilityOccupancyItem {
  id: string;
  name: string;
  branchName: string;
  occupied: number;
  capacity: number;
  type: string;
  hourlyRate: number;
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
      .then(([dbFacs, bookingsData, dbBranches]) => {
        const bookingsList = bookingsData.bookings || [];

        // Build a comprehensive facility map
        const facilityMap = new Map<string, FacilityOccupancyItem>();

        // 1. Add all configured facilities from DB
        dbFacs.forEach((f) => {
          const key = `${f.name.toLowerCase()}_${(f.branchName || '').toLowerCase()}`;
          facilityMap.set(key, {
            id: f.id,
            name: f.name,
            branchName: f.branchName || 'Primary Hub',
            occupied: 0,
            capacity: f.capacity || 10,
            type: 'Facility Unit',
            hourlyRate: f.defaultPrice || 0,
          });
        });

        // 2. Scan bookings for any additional active facility spaces
        bookingsList.forEach((b) => {
          if (!b.facility) return;
          const key = `${b.facility.toLowerCase()}_${(b.branch || '').toLowerCase()}`;
          if (!facilityMap.has(key)) {
            // Find if there is an existing facility with close name matching
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
                type: 'Facility Unit',
                hourlyRate: Math.round(b.amount / (b.daysCount || 1)) || 5000,
              });
            }
          }
        });

        // 3. Count active bookings for each facility
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

  // Calculate branch totals
  const totalOccupied = filteredFacilities.reduce((sum, item) => sum + item.occupied, 0);
  const totalCapacity = filteredFacilities.reduce((sum, item) => sum + item.capacity, 0);
  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const getStatusColor = (percent: number) => {
    if (percent >= 100) {
      return {
        bar: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 border-red-200',
        label: 'FULL',
        dot: 'bg-red-500',
      };
    }
    if (percent >= 80) {
      return {
        bar: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        label: 'NEARLY FULL',
        dot: 'bg-amber-500',
      };
    }
    return {
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'AVAILABLE',
      dot: 'bg-emerald-500',
    };
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans flex flex-col justify-between h-[480px] overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3 shrink-0">
        <div>
          <h3 className="font-heading text-base font-bold text-gray-900 tracking-tight">
            Facility Occupancy Status
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time space utilization • Ignores historical date filters
          </p>
        </div>

        {/* Branch Filter Selector if global filter is 'all' */}
        {branchFilter === 'all' && (
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveBranchTab('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeBranchTab === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Hubs
            </button>
            {Array.from(new Set(facilities.map((f) => f.branchName))).map((bName) => (
              <button
                key={bName}
                onClick={() => setActiveBranchTab(bName)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeBranchTab === bName
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {bName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Overall Occupancy Summary */}
      <div className="mb-4 bg-gray-50/80 border border-gray-200/60 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
            <i className="fa-solid fa-chart-pie"></i>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Live Total Utilization
            </span>
            <div className="text-sm font-bold text-gray-900 font-heading">
              {totalOccupied} / {totalCapacity} Units Occupied
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-extrabold font-heading text-blue-600">
            {overallOccupancyPct}%
          </span>
          <span className="text-[10px] text-gray-400 font-medium block">Capacity Load</span>
        </div>
      </div>

      {/* List of Facilities with Horizontal Progress Bars */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {filteredFacilities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-2">
              <i className="fa-solid fa-building text-sm"></i>
            </div>
            <p className="text-xs font-semibold text-gray-600">No Facilities Registered</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Facility spaces will appear here once created in Administration.</p>
          </div>
        ) : (
          filteredFacilities.map((facility) => {
            const pct = facility.capacity > 0 ? Math.round((facility.occupied / facility.capacity) * 100) : 0;
            const style = getStatusColor(pct);

            return (
              <div
                key={facility.id}
                className="p-3.5 rounded-xl border border-gray-200/70 bg-white hover:border-blue-200 hover:shadow-2xs transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-xs text-gray-900">
                        {facility.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({facility.branchName})
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">{facility.type}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                    <span className="text-xs font-bold font-mono text-gray-900">
                      {facility.occupied} / {facility.capacity}
                    </span>
                  </div>
                </div>

                {/* Horizontal Capacity Bar */}
                <div className="relative w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>Rate: ₦{facility.hourlyRate.toLocaleString()}/day</span>
                  <span>{pct}% Capacity Used</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend Footer */}
      <div className="border-t border-gray-100 pt-3 mt-4 flex flex-wrap items-center justify-between text-[11px] text-gray-500 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Green (&lt;80% Available)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Amber (&ge;80% Nearly Full)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Red (100% Full)
          </span>
        </div>
      </div>
    </div>
  );
};
