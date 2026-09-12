import React from 'react';
import { FacilityRecordSummary } from '../../types';

interface FacilityCardProps {
  record: FacilityRecordSummary;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({ record }) => {
  const facilityIcons: Record<string, string> = {
    'Co-working Space': 'fa-building-columns',
    'Private Office Suites': 'fa-door-closed',
    'Dedicated Desk Hub': 'fa-desktop',
    'Conference Hall': 'fa-users-rectangle',
    'Executive Boardroom': 'fa-handshake',
    'Event Pavilion': 'fa-champagne-glasses',
  };

  const iconClass = facilityIcons[record.facility] || 'fa-building';

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
      {/* Top Header: Name & Icon */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
            Facility Record Card
          </span>
          <h4 className="font-heading text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {record.facility}
          </h4>
        </div>
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-sm shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-all">
          <i className={`fa-solid ${iconClass}`}></i>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
          <span className="text-[10px] text-gray-400 font-semibold block">Total Bookings</span>
          <span className="font-heading text-base font-bold text-gray-900">
            {record.bookings.toLocaleString()}
          </span>
        </div>
        <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
          <span className="text-[10px] text-gray-400 font-semibold block">Total Revenue</span>
          <span className="font-heading text-base font-bold text-emerald-600">
            ₦{record.revenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Average Revenue & Percentage breakdown */}
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Average Revenue</span>
          <span className="font-bold text-gray-900 font-heading">
            ₦{record.averageRevenue.toLocaleString()}
          </span>
        </div>

        {/* Percentage of Total Revenue bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 font-medium">% of Total Revenue</span>
            <span className="font-bold text-blue-600 font-mono">
              {record.percentageOfTotal}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(record.percentageOfTotal, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
