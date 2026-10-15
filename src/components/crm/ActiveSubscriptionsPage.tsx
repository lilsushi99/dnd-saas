import React, { useState, useEffect } from 'react';
import { ActiveSubscription, Customer, Branch, Facility } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

interface ActiveSubscriptionsPageProps {
  subscriptions: ActiveSubscription[];
  loading: boolean;
  error: string | null;
  // Filters
  branch: string;
  onBranchChange: (val: string) => void;
  facility: string;
  onFacilityChange: (val: string) => void;
  daysRemaining: string;
  onDaysRemainingChange: (val: string) => void;
  date: string;
  onDateChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  // Actions
  onSelectCustomer: (customerId: string) => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export const ActiveSubscriptionsPage: React.FC<ActiveSubscriptionsPageProps> = ({
  subscriptions,
  loading,
  error,
  branch,
  onBranchChange,
  facility,
  onFacilityChange,
  daysRemaining,
  onDaysRemainingChange,
  date,
  onDateChange,
  search,
  onSearchChange,
  onSelectCustomer,
  onExportCSV,
  onExportExcel,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setBranches(bList))
      .catch((err) => console.error('Error fetching branches:', err));

    AdminApiService.fetchFacilities()
      .then((fList) => setFacilities(fList))
      .catch((err) => console.error('Error fetching facilities:', err));
  }, []);

  const activeCount = subscriptions.filter((s) => s.status === 'Active').length;
  const expiringSoonCount = subscriptions.filter((s) => s.status === 'Expiring Soon').length;
  const expiredCount = subscriptions.filter((s) => s.status === 'Expired').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Active Subscriptions & Pass Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time tracking of active customer bookings, contract duration, and expiration alerts.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-medium transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
            <span>Export CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-medium transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-700 text-sm"></i>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/70 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-800">
                Active Passes
              </span>
              <div className="text-xl font-semibold text-emerald-950">
                {activeCount} Subscriptions
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
            Green Status
          </span>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-800">
                Expiring Soon (≤ 5 Days)
              </span>
              <div className="text-xl font-semibold text-amber-950">
                {expiringSoonCount} Subscriptions
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
            Orange Status
          </span>
        </div>

        <div className="bg-rose-50/70 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <i className="fa-solid fa-circle-xmark"></i>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-rose-800">
                Expired Subscriptions
              </span>
              <div className="text-xl font-semibold text-rose-950">
                {expiredCount} Subscriptions
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-medium">
            Red Status
          </span>
        </div>
      </div>

      {/* Top Filters (Branch, Facility, Days Remaining, Date, Search) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search customer, ID, facility..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
            />
          </div>

          {/* Filter Branch */}
          <div>
            <CustomSelect
              options={[
                { id: 'all', label: 'All Branches' },
                ...branches.map((b) => ({ id: b.name, label: b.name })),
              ]}
              value={branch}
              onChange={(val) => onBranchChange(String(val))}
              placeholder="All Branches"
              className="!py-2 !px-3"
            />
          </div>

          {/* Filter Facility */}
          <div>
            <CustomSelect
              options={[
                { id: 'all', label: 'All Facilities' },
                ...facilities.map((f) => ({ id: f.name, label: f.name })),
              ]}
              value={facility}
              onChange={(val) => onFacilityChange(String(val))}
              placeholder="All Facilities"
              className="!py-2 !px-3"
            />
          </div>

          {/* Filter Days Remaining */}
          <div>
            <CustomSelect
              options={[
                { id: 'all', label: 'All Expirations' },
                { id: 'expiring_soon', label: 'Expiring Soon (≤ 5 Days)' },
                { id: 'active', label: 'Active (> 5 Days)' },
                { id: 'expired', label: 'Expired (0 Days)' },
              ]}
              value={daysRemaining}
              onChange={(val) => onDaysRemainingChange(String(val))}
              placeholder="All Expirations"
              className="!py-2 !px-3"
            />
          </div>

          {/* Filter Date */}
          <div>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Subscription Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">
            <i className="fa-solid fa-spinner fa-spin text-lg text-blue-600 mb-2 block"></i>
            Loading active subscriptions...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 border-b border-rose-100">
            <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
            {error}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            <i className="fa-solid fa-file-contract text-2xl text-gray-300 mb-2 block"></i>
            No active subscriptions found for current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Facility</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">End Date</th>
                  <th className="py-3.5 px-4 text-center">Days Remaining</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => onSelectCustomer(sub.customerId)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 group-hover:text-blue-700">
                        {sub.customerName}
                      </div>
                      <div className="text-[10px] text-blue-600 font-mono font-medium">
                        {sub.customerId}
                      </div>
                    </td>

                    {/* Facility */}
                    <td className="py-3.5 px-4 font-medium text-gray-900">{sub.facility}</td>

                    {/* Branch */}
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{sub.branch}</td>

                    {/* Start Date */}
                    <td className="py-3.5 px-4 text-gray-600">{sub.startDate}</td>

                    {/* End Date */}
                    <td className="py-3.5 px-4 font-medium text-gray-900">{sub.endDate}</td>

                    {/* Days Remaining */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-sm font-semibold ${
                          sub.daysRemaining <= 0
                            ? 'text-rose-600'
                            : sub.daysRemaining <= 5
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {sub.daysRemaining} Days
                      </span>
                    </td>

                    {/* Colored Status Badges: Green (Active), Orange (Expiring Soon), Red (Expired) - borderless soft pills */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          sub.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : sub.status === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sub.status === 'Active'
                              ? 'bg-emerald-500'
                              : sub.status === 'Expiring Soon'
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-rose-500'
                          }`}
                        />
                        {sub.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(sub.customerId);
                        }}
                        className="px-3 py-1 bg-white border border-gray-200 group-hover:border-blue-500 text-gray-700 group-hover:text-blue-600 rounded-lg text-xs font-medium transition-all shadow-2xs hover:bg-blue-50 cursor-pointer"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
