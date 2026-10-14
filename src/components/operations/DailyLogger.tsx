import React, { useState, useEffect, useRef } from 'react';
import { useOperations } from '../../hooks/useOperations';
import { NewBookingModal } from './NewBookingModal';
import { EditBookingModal } from './EditBookingModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Booking, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomDatePicker } from '../common/CustomDatePicker';

interface DailyLoggerProps {
  branchFilter?: string;
}

export const DailyLogger: React.FC<DailyLoggerProps> = ({ branchFilter = 'all' }) => {
  const {
    bookings,
    summary,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    monthFilter,
    setMonthFilter,
    branchSelect,
    setBranchSelect,
    addBooking,
    editBooking,
    exportData,
  } = useOperations(branchFilter);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [dbBranches, setDbBranches] = useState<Branch[]>([]);

  // Filter dropdown toggle states
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setDbBranches(bList))
      .catch((err) => console.error('Error loading branches in DailyLogger:', err));
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setShowMonthMenu(false);
      }
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setShowBranchMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const branches = [
    { id: 'all', label: 'All Branches' },
    ...dbBranches.map((b) => ({ id: b.name, label: b.name })),
  ];

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'short', year: 'numeric' });
  const prevMonthDate1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthName1 = prevMonthDate1.toLocaleString('default', { month: 'short', year: 'numeric' });
  const prevMonthKey1 = `${prevMonthDate1.getFullYear()}-${String(prevMonthDate1.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate2 = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const prevMonthName2 = prevMonthDate2.toLocaleString('default', { month: 'short', year: 'numeric' });
  const prevMonthKey2 = `${prevMonthDate2.getFullYear()}-${String(prevMonthDate2.getMonth() + 1).padStart(2, '0')}`;

  const months = [
    { id: 'all', label: 'All Time' },
    { id: 'this_month', label: `This Month (${currentMonthName})` },
    { id: prevMonthKey1, label: prevMonthName1 },
    { id: prevMonthKey2, label: prevMonthName2 },
  ];

  const currentMonthLabel = (() => {
    const found = months.find((m) => m.id === monthFilter);
    if (found) return found.label;
    if (monthFilter && monthFilter.length === 10) {
      try {
        const d = new Date(monthFilter + 'T00:00:00');
        return isNaN(d.getTime())
          ? monthFilter
          : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return monthFilter;
      }
    }
    return 'All Time';
  })();
  const currentBranchLabel =
    branches.find((b) => b.id === branchSelect)?.label || 'All Branches';

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Local Section Header & Action */}
      <div className="bg-white rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Daily Logger
          </h2>
        </div>

        {/* Action: New Booking */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer self-start md:self-auto shrink-0 shadow-xs"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>New Booking</span>
        </button>
      </div>

      {/* KPI Cards: 4 Cards with consistent Outfit font and medium weights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-normal text-gray-500">Monthly Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-dollar-sign"></i>
            </div>
          </div>
          <div className="font-heading text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
            ₦{summary.monthlyRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400 font-normal mt-1 block">
            Logged ledger total
          </span>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-normal text-gray-500">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
          </div>
          <div className="font-heading text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
            {summary.totalBookings}
          </div>
          <span className="text-[11px] text-gray-400 font-normal mt-1 block">
            Across selected period
          </span>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-normal text-gray-500">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bolt"></i>
            </div>
          </div>
          <div className="font-heading text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
            {summary.activeSubscriptions ?? summary.activeBookings}
          </div>
          <span className="text-[11px] text-gray-400 font-normal mt-1 block">
            Active client subscriptions
          </span>
        </div>

        {/* Expired Subscriptions */}
        <div className="bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-normal text-gray-500">Expired Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
          </div>
          <div className="font-heading text-xl sm:text-2xl font-medium text-gray-900 tracking-tight">
            {summary.expiredSubscriptions ?? summary.expiredBookings}
          </div>
          <span className="text-[11px] text-gray-400 font-normal mt-1 block">
            Expired periods
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl p-6 shadow-xs">
        {/* Top Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Left Group: Search Client & Custom Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Client */}
            <div className="relative min-w-[220px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Client or ID..."
                className="w-full pl-9 pr-3.5 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>

            {/* Date Filter Custom Dropdown */}
            <div className="relative" ref={monthRef}>
              <button
                type="button"
                onClick={() => {
                  setShowMonthMenu(!showMonthMenu);
                  setShowBranchMenu(false);
                }}
                className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-regular fa-calendar-days text-gray-400 text-xs"></i>
                <span>{currentMonthLabel}</span>
                <i
                  className={`fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1 transition-transform ${
                    showMonthMenu ? 'rotate-180' : ''
                  }`}
                ></i>
              </button>

              {showMonthMenu && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl z-30 p-2 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                  <div className="space-y-1 mb-2">
                    {months.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMonthFilter(m.id);
                          setShowMonthMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                          monthFilter === m.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{m.label}</span>
                        {monthFilter === m.id && (
                          <i className="fa-solid fa-check text-[10px] text-blue-600"></i>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Or Custom Specific Date */}
                  <div className="pt-2 border-t border-gray-100">
                    <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                      Or Specific Date
                    </span>
                    <CustomDatePicker
                      value={monthFilter.length === 10 ? monthFilter : ''}
                      onChange={(dateVal) => {
                        if (dateVal) {
                          setMonthFilter(dateVal);
                        } else {
                          setMonthFilter('all');
                        }
                        setShowMonthMenu(false);
                      }}
                      placeholder="Pick a specific date..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Branch Filter Custom Dropdown */}
            <div className="relative" ref={branchRef}>
              <button
                type="button"
                onClick={() => {
                  setShowBranchMenu(!showBranchMenu);
                  setShowMonthMenu(false);
                }}
                className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-medium text-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-building-user text-gray-400 text-xs"></i>
                <span>{currentBranchLabel}</span>
                <i
                  className={`fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1 transition-transform ${
                    showBranchMenu ? 'rotate-180' : ''
                  }`}
                ></i>
              </button>

              {showBranchMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-30 p-1.5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 text-xs font-normal">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBranchSelect(b.id);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        branchSelect === b.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{b.label}</span>
                      {branchSelect === b.id && (
                        <i className="fa-solid fa-check text-[10px] text-blue-600"></i>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Group: Export CSV / Excel matching the dropdown style */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={() => exportData('csv', 'bookings')}
              className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-file-csv text-green-600 text-xs"></i>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportData('excel', 'bookings')}
              className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-file-excel text-emerald-600 text-xs"></i>
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-xl mb-2"></i>
            <span>Loading Daily Logger records...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs font-medium">
            No booking records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200/80 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    Booking ID
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    Booking Date
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap min-w-[160px]">
                    Client
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    Phone Number
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    Email
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    Branch
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">
                    Facility
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right whitespace-nowrap">
                    Amount Paid
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">
                    Payment Method
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-center whitespace-nowrap">
                    Days Used
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-center whitespace-nowrap">
                    Days Remaining
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-center whitespace-nowrap">
                    Status
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 z-20">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 font-normal text-gray-800 bg-white">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="even:bg-gray-50/40 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* 1. Booking ID */}
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600 whitespace-nowrap">
                      {booking.id}
                    </td>

                    {/* 2. Booking Date */}
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap font-normal">
                      {booking.date}
                    </td>

                    {/* 3. Client */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {booking.clientName}
                      </div>
                      <div className="mt-0.5">
                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
                          {booking.clientId}
                        </span>
                      </div>
                    </td>

                    {/* 4. Phone Number */}
                    <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap text-xs font-normal">
                      {booking.phone}
                    </td>

                    {/* 5. Email */}
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap text-xs font-normal">
                      {booking.email || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* 6. Branch */}
                    <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-normal">
                        {booking.branch}
                      </span>
                    </td>

                    {/* 7. Facility */}
                    <td className="py-2.5 px-3 font-medium text-gray-900 whitespace-nowrap">
                      {booking.facility}
                    </td>

                    {/* 8. Amount Paid */}
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900 font-heading whitespace-nowrap">
                      ₦{booking.amount.toLocaleString()}
                    </td>

                    {/* 9. Payment Method */}
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap font-normal">
                      {booking.paymentMethod}
                    </td>

                    {/* 10. Days Used */}
                    <td className="py-2.5 px-3 text-center font-normal text-gray-700 whitespace-nowrap">
                      {booking.daysUsed}
                    </td>

                    {/* 11. Days Remaining */}
                    <td className="py-2.5 px-3 text-center font-medium text-gray-900 whitespace-nowrap">
                      {booking.daysLeft}
                    </td>

                    {/* 12. Status Badge */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
                          booking.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : booking.status === 'Upcoming'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    {/* 13. Actions (Sticky Right Column) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-white group-even:bg-gray-50/40 border-l border-gray-100">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBooking(booking);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit Booking Record"
                        >
                          <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="View Booking Receipt"
                        >
                          <i className="fa-solid fa-receipt text-[10px]"></i>
                          Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Booking Modal */}
      <ErrorBoundary fallbackTitle="New Booking Form Error">
        <NewBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={async (data) => {
            await addBooking(data);
          }}
        />
      </ErrorBoundary>

      {/* Edit Booking Modal */}
      <ErrorBoundary fallbackTitle="Edit Booking Form Error">
        <EditBookingModal
          isOpen={!!editingBooking}
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSubmit={async (id, fields) => {
            await editBooking(id, fields);
          }}
        />
      </ErrorBoundary>

      {/* Booking Receipt View Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-gray-100">
            {/* Printable Receipt Container */}
            <div id="booking-receipt-print" className="space-y-4">
              {/* Receipt Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-receipt"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Payment Receipt
                    </h3>
                    <span className="font-mono text-[11px] text-gray-400">
                      {selectedBooking.id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                      selectedBooking.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : selectedBooking.status === 'Upcoming'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {selectedBooking.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
              </div>

              {/* Receipt Details Table */}
              <div className="space-y-2.5 text-xs text-gray-700 py-1">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Booking Date:</span>
                  <span className="font-medium text-gray-800">{selectedBooking.date}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Client Name:</span>
                  <span className="font-medium text-gray-900">{selectedBooking.clientName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Client ID:</span>
                  <span className="font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {selectedBooking.clientId}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Branch:</span>
                  <span className="font-medium text-gray-800">{selectedBooking.branch}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Facility:</span>
                  <span className="font-medium text-gray-900">{selectedBooking.facility}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Time Duration:</span>
                  <span className="font-normal text-gray-700">{selectedBooking.timeDuration}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-normal">Payment Method:</span>
                  <span className="font-medium text-gray-800">{selectedBooking.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Total Amount Paid:
                  </span>
                  <span className="text-lg font-semibold text-emerald-600">
                    ₦{selectedBooking.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
                >
                  <i className="fa-solid fa-print text-xs"></i>
                  <span>Print Official Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
