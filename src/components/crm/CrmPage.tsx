import React, { useState, useEffect } from 'react';
import { Customer, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';

interface CrmPageProps {
  customers: Customer[];
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    activeSubscriptionsCount: number;
    expiringSoonCount: number;
    expiredSubscriptionsCount: number;
  };
  loading: boolean;
  error: string | null;
  // Filters
  search: string;
  onSearchChange: (val: string) => void;
  branch: string;
  onBranchChange: (val: string) => void;
  dateRange: string;
  onDateRangeChange: (val: string) => void;
  sort: 'revenue_desc' | 'revenue_asc' | 'visits_desc' | 'latest_visit' | 'name';
  onSortChange: (val: 'revenue_desc' | 'revenue_asc' | 'visits_desc' | 'latest_visit' | 'name') => void;
  status: string;
  onStatusChange: (val: string) => void;
  // Actions
  onOpenCustomerProfile: (customer: Customer) => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export const CrmPage: React.FC<CrmPageProps> = ({
  customers,
  summary,
  loading,
  error,
  search,
  onSearchChange,
  branch,
  onBranchChange,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  status,
  onStatusChange,
  onOpenCustomerProfile,
  onExportCSV,
  onExportExcel,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setBranches(bList))
      .catch((err) => console.error('Error fetching branches in CRM:', err));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
            Customer Directory & CRM
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete database of accounts, branch history, lifetime revenue, and active status.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
            <span>Export CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-700 text-sm"></i>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Customers */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Accounts
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-gray-900">
              {summary.totalCustomers}
            </span>
            <span className="text-xs text-gray-500 ml-2">Registered Accounts</span>
          </div>
        </div>

        {/* Total Lifetime Revenue */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Lifetime Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-sack-dollar"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-emerald-600">
              ₦{summary.totalRevenue.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 ml-2">Total Customer Spend</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Active Subscriptions
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-ticket"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-indigo-600">
              {summary.activeSubscriptionsCount}
            </span>
            <span className="text-xs text-gray-500 ml-2">Active Memberships</span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Expiring Soon
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-clock font-bold"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-amber-600">
              {summary.expiringSoonCount}
            </span>
            <span className="text-xs text-gray-500 ml-2">Expires ≤ 5 Days</span>
          </div>
        </div>

        {/* Expired Subscriptions */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Expired Subscriptions
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-calendar-xmark font-bold"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-heading text-2xl font-bold text-rose-600">
              {summary.expiredSubscriptionsCount || 0}
            </span>
            <span className="text-xs text-gray-500 ml-2">Expired Subscriptions</span>
          </div>
        </div>
      </div>

      {/* Top Toolbar (Search, Filter Branch, Filter Date, Sort) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ID, name, phone, or email..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
            />
          </div>

          {/* Filter Branch */}
          <div>
            <select
              value={branch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none cursor-pointer transition-all"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none cursor-pointer transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Customers</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired Subscriptions</option>
              <option value="Inactive">Inactive</option>
              <option value="VIP">VIP Accounts</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sort}
              onChange={(e) =>
                onSortChange(
                  e.target.value as 'revenue_desc' | 'revenue_asc' | 'visits_desc' | 'latest_visit' | 'name'
                )
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none cursor-pointer transition-all"
            >
              <option value="revenue_desc">Revenue: High to Low</option>
              <option value="revenue_asc">Revenue: Low to High</option>
              <option value="visits_desc">Visits: Most to Least</option>
              <option value="latest_visit">Latest Visit Date</option>
              <option value="name">Customer Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">
            <i className="fa-solid fa-spinner fa-spin text-lg text-blue-600 mb-2 block"></i>
            Loading customer records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 border-b border-rose-100">
            <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
            {error}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            <i className="fa-solid fa-user-slash text-2xl text-gray-300 mb-2 block"></i>
            No customers found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4 text-center">Branch History</th>
                  <th className="py-3.5 px-4 text-center">Visits</th>
                  <th className="py-3.5 px-4 text-right">Lifetime Revenue</th>
                  <th className="py-3.5 px-4 text-center">Last Visit</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCustomerProfile(c)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Customer ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                      {c.id}
                    </td>

                    {/* Full Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 group-hover:text-blue-700">
                        {c.name}
                      </div>
                      {c.company && (
                        <div className="text-[10px] text-gray-400 font-medium">{c.company}</div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-gray-600">{c.phone}</td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-gray-600 max-w-[180px] truncate">
                      {c.email || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Branch History */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center flex-wrap gap-1">
                        {c.branchHistory.slice(0, 2).map((b, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold"
                          >
                            {b}
                          </span>
                        ))}
                        {c.branchHistory.length > 2 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                            +{c.branchHistory.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Visits */}
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                      {c.totalVisits}
                    </td>

                    {/* Lifetime Revenue */}
                    <td className="py-3.5 px-4 text-right font-heading font-bold text-emerald-600 text-sm">
                      ₦{c.lifetimeRevenue.toLocaleString()}
                    </td>

                    {/* Last Visit */}
                    <td className="py-3.5 px-4 text-center text-gray-600 font-medium">
                      {c.latestVisit}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'VIP'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : c.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : c.status === 'Expired'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {c.status === 'VIP' && (
                          <i className="fa-solid fa-crown text-amber-600 text-[9px]"></i>
                        )}
                        {c.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCustomerProfile(c);
                        }}
                        className="px-3 py-1 bg-white border border-gray-200 group-hover:border-blue-500 text-gray-700 group-hover:text-blue-600 rounded-lg text-xs font-bold transition-all shadow-2xs hover:bg-blue-50 cursor-pointer"
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
