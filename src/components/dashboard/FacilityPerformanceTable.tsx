import React, { useState } from 'react';
import { FacilityPerformance } from '../../types';

interface FacilityPerformanceTableProps {
  branchFilter?: string;
}

export const FacilityPerformanceTable: React.FC<FacilityPerformanceTableProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const facilities: FacilityPerformance[] = [
    {
      id: 'fac-01',
      facility: 'London Central Operations Hub',
      code: 'LND-MAIN-01',
      bookings: 384,
      revenue: '₦412,500',
      branch: 'London Main',
      status: 'Peak Load',
      utilization: 94.2,
    },
    {
      id: 'fac-02',
      facility: 'New York Financial Tech Center',
      code: 'NY-HQ-02',
      bookings: 312,
      revenue: '₦388,400',
      branch: 'New York HQ',
      status: 'Operational',
      utilization: 88.6,
    },
    {
      id: 'fac-03',
      facility: 'Tokyo Logistics & Assembly Depot',
      code: 'TK-DIST-03',
      bookings: 245,
      revenue: '₦256,100',
      branch: 'Tokyo Hub',
      status: 'Optimal',
      utilization: 82.1,
    },
    {
      id: 'fac-04',
      facility: 'Singapore Marina Bay Logistics',
      code: 'SG-BAY-04',
      bookings: 198,
      revenue: '₦184,200',
      branch: 'Singapore Hub',
      status: 'Operational',
      utilization: 76.4,
    },
    {
      id: 'fac-05',
      facility: 'Paris Enterprise Innovation Lab',
      code: 'PAR-LAB-05',
      bookings: 124,
      revenue: '₦143,300',
      branch: 'Paris Depot',
      status: 'Maintenance',
      utilization: 54.0,
    },
    {
      id: 'fac-06',
      facility: 'Co-working Dedicated Suites',
      code: 'LND-COWORK-06',
      bookings: 115,
      revenue: '₦128,900',
      branch: 'London Main',
      status: 'Optimal',
      utilization: 79.5,
    },
    {
      id: 'fac-07',
      facility: 'Executive Boardroom & Conference Suite',
      code: 'NY-EXEC-07',
      bookings: 98,
      revenue: '₦114,600',
      branch: 'New York HQ',
      status: 'Operational',
      utilization: 71.0,
    },
    {
      id: 'fac-08',
      facility: 'Media & Podcast Production Studio',
      code: 'TK-STUDIO-08',
      bookings: 87,
      revenue: '₦95,400',
      branch: 'Tokyo Hub',
      status: 'Peak Load',
      utilization: 91.3,
    },
    {
      id: 'fac-09',
      facility: 'Creative Event Pavilion',
      code: 'SG-EVENT-09',
      bookings: 74,
      revenue: '₦82,000',
      branch: 'Singapore Hub',
      status: 'Optimal',
      utilization: 68.2,
    },
    {
      id: 'fac-10',
      facility: 'Flexible Meeting & Workshop Rooms',
      code: 'PAR-MEET-10',
      bookings: 62,
      revenue: '₦68,500',
      branch: 'Paris Depot',
      status: 'Operational',
      utilization: 62.4,
    },
  ];

  const filteredFacilities = searchTerm
    ? facilities.filter(
        (f) =>
          f.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : facilities;

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans flex flex-col justify-between h-full">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight">
            Facility Performance
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Operational throughput, active bookings & branch ledger status
          </p>
        </div>

        {/* Table Search & Filter Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search facility..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all w-44"
            />
          </div>

          <button
            onClick={() => setSearchTerm('')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors text-xs"
            title="Refresh Table"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
          </button>
        </div>
      </div>

      {/* Clean Table Container with Fixed Height & Scrollbar */}
      <div className="overflow-x-auto max-h-[260px] overflow-y-auto rounded-xl border border-gray-200/80 custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-bold uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4">
                Facility Name
              </th>
              <th scope="col" className="py-3 px-4">
                Branch
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Bookings
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Revenue
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 font-medium text-gray-800 bg-white">
            {filteredFacilities.map((fac) => (
              <tr
                key={fac.id}
                className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
              >
                {/* Facility Name & Code */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 font-bold font-heading border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <i className="fa-solid fa-building text-xs"></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 leading-snug">
                        {fac.facility}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {fac.code}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Branch */}
                <td className="py-3.5 px-4 text-gray-600 font-semibold">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px]">
                    <i className="fa-solid fa-location-dot text-[10px] text-gray-400"></i>
                    {fac.branch}
                  </span>
                </td>

                {/* Bookings */}
                <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                  {fac.bookings.toLocaleString()}
                </td>

                {/* Revenue */}
                <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-heading">
                  {fac.revenue}
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      fac.status === 'Peak Load'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : fac.status === 'Operational'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : fac.status === 'Optimal'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        fac.status === 'Peak Load'
                          ? 'bg-amber-500'
                          : fac.status === 'Operational'
                          ? 'bg-blue-500'
                          : fac.status === 'Optimal'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                    ></span>
                    {fac.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer summary */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4 text-xs text-gray-500 font-sans">
        <span>Showing {filteredFacilities.length} of 10 Facilities</span>
        <div className="flex items-center gap-2">
          <button className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50">
            Previous
          </button>
          <button className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
            1
          </button>
          <button className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
