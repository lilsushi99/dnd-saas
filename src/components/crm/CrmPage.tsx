import React, { useState, useEffect, useRef } from 'react';
import { Customer, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomerModal } from './CustomerModal';

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
  onCreateCustomer?: (data: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    status?: string;
  }) => Promise<any>;
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
  sort,
  onSortChange,
  status,
  onStatusChange,
  onOpenCustomerProfile,
  onCreateCustomer,
  onExportCSV,
  onExportExcel,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, branch, sort, status]);

  // Dropdown states for custom filters
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const branchRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setBranches(bList))
      .catch((err) => console.error('Error fetching branches in CRM:', err));
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setShowBranchMenu(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options definitions
  const branchOptions = [
    { id: 'all', label: 'All Branches' },
    ...branches.map((b) => ({ id: b.name, label: b.name })),
  ];

  const statusOptions = [
    { id: 'all', label: 'All Statuses' },
    { id: 'Active', label: 'Active Customers' },
    { id: 'Expiring Soon', label: 'Expiring Soon' },
    { id: 'Expired', label: 'Expired Subscriptions' },
    { id: 'Inactive', label: 'Inactive' },
    { id: 'VIP', label: 'VIP Accounts' },
  ];

  const sortOptions: {
    id: 'revenue_desc' | 'revenue_asc' | 'visits_desc' | 'latest_visit' | 'name';
    label: string;
  }[] = [
    { id: 'revenue_desc', label: 'Revenue: High to Low' },
    { id: 'revenue_asc', label: 'Revenue: Low to High' },
    { id: 'visits_desc', label: 'Visits: Most to Least' },
    { id: 'latest_visit', label: 'Latest Visit Date' },
    { id: 'name', label: 'Customer Name (A-Z)' },
  ];

  const currentBranchLabel =
    branchOptions.find((b) => b.id === branch)?.label || 'All Branches';

  const currentStatusLabel =
    statusOptions.find((s) => s.id === status)?.label || 'All Statuses';

  const currentSortLabel =
    sortOptions.find((s) => s.id === sort)?.label || 'Revenue: High to Low';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* 1. Page Header (Horizontally aligned, no subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-none">
            Customer Directory and CRM
          </h1>
        </div>

        {/* Actions & Export Buttons */}
        <div className="flex items-center gap-2">
          {onCreateCustomer && (
            <button
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <i className="fa-solid fa-user-plus text-xs"></i>
              <span>New Customer</span>
            </button>
          )}

          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-600 text-xs"></i>
            <span>Export CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-file-excel text-emerald-700 text-xs"></i>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Cards Summary (5 Cards, strictly Heading -> Icon -> Metric Value, no secondary text) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Accounts */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 leading-tight">
              Total<br />Account
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-gray-900 tracking-tight block">
              {summary.totalCustomers.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Lifetime Revenue */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 leading-tight">
              Lifetime Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-sack-dollar"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-emerald-600 tracking-tight block truncate" title={`₦${summary.totalRevenue.toLocaleString()}`}>
              ₦{summary.totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 leading-tight">
              Active Subscriptions
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-ticket"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-indigo-600 tracking-tight block">
              {summary.activeSubscriptionsCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 leading-tight">
              Expiring<br />Soon
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-clock"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-amber-600 tracking-tight block">
              {summary.expiringSoonCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Expired Subscriptions */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 leading-tight">
              Expired Subscriptions
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-calendar-xmark"></i>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-rose-600 tracking-tight block">
              {(summary.expiredSubscriptionsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Top Toolbar (Search, Filter Branch, Filter Status, Sort Dropdown) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ID, name, phone, or email..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Filter Branch Custom Dropdown */}
          <div className="relative" ref={branchRef}>
            <button
              type="button"
              onClick={() => {
                setShowBranchMenu(!showBranchMenu);
                setShowStatusMenu(false);
                setShowSortMenu(false);
              }}
              className="w-full px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <i className="fa-solid fa-building-user text-gray-400 text-xs"></i>
                <span className="truncate">{currentBranchLabel}</span>
              </div>
              <i
                className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform shrink-0 ${
                  showBranchMenu ? 'rotate-180' : ''
                }`}
              ></i>
            </button>

            {showBranchMenu && (
              <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-white rounded-xl shadow-xl z-30 p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                {branchOptions.map((b) => {
                  const isSelected = branch === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onBranchChange(b.id);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="truncate">{b.label}</span>
                      {isSelected && (
                        <i className="fa-solid fa-check text-[10px] text-blue-600 shrink-0"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Status Custom Dropdown */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => {
                setShowStatusMenu(!showStatusMenu);
                setShowBranchMenu(false);
                setShowSortMenu(false);
              }}
              className="w-full px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <i className="fa-solid fa-sliders text-gray-400 text-xs"></i>
                <span className="truncate">{currentStatusLabel}</span>
              </div>
              <i
                className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform shrink-0 ${
                  showStatusMenu ? 'rotate-180' : ''
                }`}
              ></i>
            </button>

            {showStatusMenu && (
              <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-white rounded-xl shadow-xl z-30 p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                {statusOptions.map((s) => {
                  const isSelected = status === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onStatusChange(s.id);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="truncate">{s.label}</span>
                      {isSelected && (
                        <i className="fa-solid fa-check text-[10px] text-blue-600 shrink-0"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort Dropdown Custom Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowBranchMenu(false);
                setShowStatusMenu(false);
              }}
              className="w-full px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <i className="fa-solid fa-arrow-down-wide-short text-gray-400 text-xs"></i>
                <span className="truncate">{currentSortLabel}</span>
              </div>
              <i
                className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform shrink-0 ${
                  showSortMenu ? 'rotate-180' : ''
                }`}
              ></i>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-full min-w-[210px] bg-white rounded-xl shadow-xl z-30 p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                {sortOptions.map((s) => {
                  const isSelected = sort === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSortChange(s.id);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="truncate">{s.label}</span>
                      {isSelected && (
                        <i className="fa-solid fa-check text-[10px] text-blue-600 shrink-0"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Customer Directory Table */}
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
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-medium uppercase tracking-wider text-gray-500">
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
                {customers
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCustomerProfile(c)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Customer ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-600 group-hover:underline">
                      {c.id}
                    </td>

                    {/* Full Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 group-hover:text-blue-700">
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
                            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium"
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
                    <td className="py-3.5 px-4 text-center font-medium text-gray-900">
                      {c.totalVisits}
                    </td>

                    {/* Lifetime Revenue */}
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 text-sm">
                      ₦{c.lifetimeRevenue.toLocaleString()}
                    </td>

                    {/* Last Visit */}
                    <td className="py-3.5 px-4 text-center text-gray-600 font-medium">
                      {c.latestVisit}
                    </td>

                    {/* Status Badge: Filled, borderless, rounded-lg badge matching Daily Logger */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          c.status === 'VIP'
                            ? 'bg-amber-100 text-amber-800'
                            : c.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.status === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-700'
                            : c.status === 'Expired'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {c.status === 'VIP' && (
                          <i className="fa-solid fa-crown text-amber-600 text-[10px]"></i>
                        )}
                        {c.status}
                      </span>
                    </td>

                    {/* Actions: View Profile */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCustomerProfile(c);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
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

        {/* Pagination Footer */}
        {customers.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing{' '}
              <strong className="text-gray-900">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-gray-900">
                {Math.min(currentPage * pageSize, customers.length)}
              </strong>{' '}
              of <strong className="text-gray-900">{customers.length}</strong> customers
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-chevron-left mr-1"></i>
                Previous
              </button>

              <span className="px-2 text-xs font-medium text-gray-700">
                Page {currentPage} of {Math.ceil(customers.length / pageSize) || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= Math.ceil(customers.length / pageSize)}
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.ceil(customers.length / pageSize), p + 1)
                  )
                }
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <i className="fa-solid fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create New Customer Modal */}
      {isNewCustomerModalOpen && (
        <CustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          onSubmit={async (data) => {
            if (onCreateCustomer) {
              await onCreateCustomer(data);
            }
          }}
        />
      )}
    </div>
  );
};
