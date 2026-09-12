import React from 'react';
import { FacilityRecordSummary } from '../../types';

interface FacilityAnalyticsTableProps {
  records: FacilityRecordSummary[];
}

export const FacilityAnalyticsTable: React.FC<FacilityAnalyticsTableProps> = ({ records }) => {
  const totalBookings = records.reduce((sum, r) => sum + r.bookings, 0);
  const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
  const overallAverageSpend = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  const numericOccupancies = records
    .map((r) => r.occupancy)
    .filter((o): o is number => typeof o === 'number');
  const avgOccupancy =
    numericOccupancies.length > 0
      ? Number((numericOccupancies.reduce((a, b) => a + b, 0) / numericOccupancies.length).toFixed(1))
      : 'N/A';

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight">
            Facility Financial & Operational Analytics
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Aggregated system performance ledger derived automatically from Daily Logger receipts
          </p>
        </div>
      </div>

      {/* Analytics Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-bold uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4">
                Facility Name
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Total Bookings
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Total Revenue
              </th>
              <th scope="col" className="py-3 px-4">
                Branch Location
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Average Spend
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Occupancy (%)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 font-medium text-gray-800 bg-white">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-xs text-gray-400">
                  <i className="fa-solid fa-folder-open text-xl text-gray-300 mb-2 block"></i>
                  No facility records logged for the selected criteria.
                </td>
              </tr>
            ) : (
              records.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900 font-heading">
                    {r.facility}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-gray-800">
                    {r.bookings.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-heading">
                    ₦{r.revenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px]">
                      <i className="fa-solid fa-location-dot text-gray-400 text-[9px]"></i>
                      {r.branch}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-gray-800 font-heading">
                    ₦{r.averageRevenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-bold text-blue-600">
                      {typeof r.occupancy === 'number' ? `${r.occupancy}%` : r.occupancy}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* SUMMARY TOTAL ROW */}
          <tfoot className="bg-gray-100/90 border-t-2 border-gray-300 font-bold text-gray-900">
            <tr>
              <td className="py-3.5 px-4 uppercase tracking-wider text-xs font-heading">
                Total Enterprise Summary
              </td>
              <td className="py-3.5 px-4 text-right font-heading text-sm">
                {totalBookings.toLocaleString()}
              </td>
              <td className="py-3.5 px-4 text-right font-heading text-sm text-emerald-700">
                ₦{totalRevenue.toLocaleString()}
              </td>
              <td className="py-3.5 px-4 text-gray-500 font-normal text-[11px]">
                All Active Branches
              </td>
              <td className="py-3.5 px-4 text-right font-heading text-sm">
                ₦{overallAverageSpend.toLocaleString()}
              </td>
              <td className="py-3.5 px-4 text-right text-sm text-blue-700">
                {typeof avgOccupancy === 'number' ? `${avgOccupancy}%` : avgOccupancy}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
