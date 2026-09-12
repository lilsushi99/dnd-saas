import React, { useState, useEffect } from 'react';
import { useOperations } from '../../hooks/useOperations';
import { NewBookingModal } from './NewBookingModal';
import { EditBookingModal } from './EditBookingModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Booking, Branch } from '../../types';
import { AdminApiService } from '../../services/adminService';

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

  useEffect(() => {
    AdminApiService.fetchBranches()
      .then((bList) => setDbBranches(bList))
      .catch((err) => console.error('Error loading branches in DailyLogger:', err));
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
    { id: 'this_month', label: `This Month (${currentMonthName})` },
    { id: prevMonthKey1, label: prevMonthName1 },
    { id: prevMonthKey2, label: prevMonthName2 },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Page Title & Receptionist Info Banner */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Reception Desk Control
            </span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
            Daily Logger & Reservation Ledger
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time client check-ins, facility allocation & payment method ledger
          </p>
        </div>

        {/* Action: New Booking */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/20 cursor-pointer self-start md:self-auto shrink-0"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>New Booking</span>
        </button>
      </div>

      {/* Metric Cards Above Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Monthly Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-xs">
              <i className="fa-solid fa-dollar-sign"></i>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
            ₦{summary.monthlyRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <i className="fa-solid fa-arrow-up-right text-[10px]"></i>
            Logged ledger total
          </span>
        </div>

        {/* Total Bookings */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xs">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
            {summary.totalBookings}
          </div>
          <span className="text-[11px] text-gray-500 font-semibold mt-1 block">
            Across selected period
          </span>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bolt"></i>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-indigo-600 tracking-tight">
            {summary.activeSubscriptions ?? summary.activeBookings}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Active client subscriptions
          </span>
        </div>

        {/* Expired Subscriptions */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Expired Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-xs">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-gray-900 tracking-tight">
            {summary.expiredSubscriptions ?? summary.expiredBookings}
          </div>
          <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
            Expired periods
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs">
        {/* Top Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Left Group: Search Client & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Client */}
            <div className="relative min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Client or ID..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* Filter Month */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="fa-regular fa-calendar-days text-xs"></i>
              </div>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer appearance-none"
              >
                {months.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-chevron-down text-[10px]"></i>
              </div>
            </div>

            {/* Filter Branch */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-building-user text-xs"></i>
              </div>
              <select
                value={branchSelect}
                onChange={(e) => setBranchSelect(e.target.value)}
                className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer appearance-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-chevron-down text-[10px]"></i>
              </div>
            </div>
          </div>

          {/* Right Group: Export CSV / Excel */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={() => exportData('csv', 'bookings')}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-file-csv text-green-600 text-sm"></i>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportData('excel', 'bookings')}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-file-excel text-emerald-600 text-sm"></i>
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
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs font-medium">
            No booking records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200/80 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200/80 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
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

              <tbody className="divide-y divide-gray-100 font-medium text-gray-800 bg-white">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="even:bg-gray-50/40 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* 1. Booking ID */}
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {booking.id}
                    </td>

                    {/* 2. Booking Date */}
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                      {booking.date}
                    </td>

                    {/* 3. Client (Client Name + Client ID ONLY, NO email) */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {booking.clientName}
                      </div>
                      <div className="mt-0.5">
                        <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-100">
                          {booking.clientId}
                        </span>
                      </div>
                    </td>

                    {/* 4. Dedicated Phone Number Column */}
                    <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap font-mono text-[11px]">
                      {booking.phone}
                    </td>

                    {/* 5. Dedicated Email Column (Optional) */}
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap text-[11px]">
                      {booking.email || <span className="text-gray-300 italic">—</span>}
                    </td>

                    {/* 6. Branch */}
                    <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                        <i className="fa-solid fa-location-dot text-[9px] text-gray-400"></i>
                        {booking.branch}
                      </span>
                    </td>

                    {/* 7. Facility */}
                    <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">
                      {booking.facility}
                    </td>

                    {/* 8. Amount Paid */}
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-heading whitespace-nowrap">
                      ₦{booking.amount.toLocaleString()}
                    </td>

                    {/* 9. Payment Method */}
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px]">
                        <i
                          className={`fa-solid ${
                            booking.paymentMethod === 'Credit Card'
                              ? 'fa-credit-card text-indigo-500'
                              : booking.paymentMethod === 'Wire Transfer'
                              ? 'fa-money-bill-transfer text-blue-500'
                              : booking.paymentMethod === 'Cash'
                              ? 'fa-money-bill text-emerald-500'
                              : 'fa-file-invoice text-amber-500'
                          } text-xs`}
                        ></i>
                        {booking.paymentMethod}
                      </span>
                    </td>

                    {/* 10. Days Used */}
                    <td className="py-2.5 px-3 text-center font-bold text-gray-700 whitespace-nowrap">
                      {booking.daysUsed}
                    </td>

                    {/* 11. Days Remaining */}
                    <td className="py-2.5 px-3 text-center font-bold text-gray-700 whitespace-nowrap">
                      {booking.daysLeft}
                    </td>

                    {/* 12. Status Badge */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          booking.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : booking.status === 'Upcoming'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            booking.status === 'Active'
                              ? 'bg-emerald-500 animate-pulse'
                              : booking.status === 'Upcoming'
                              ? 'bg-blue-500'
                              : 'bg-rose-500'
                          }`}
                        ></span>
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
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
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
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
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
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-receipt text-blue-600 text-base"></i>
                <h3 className="font-heading text-base font-bold text-gray-900">
                  Receipt: {selectedBooking.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700 mb-6">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Client Name:</span>
                <span className="font-bold text-gray-900">{selectedBooking.clientName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Client ID:</span>
                <span className="font-mono font-bold text-blue-600">{selectedBooking.clientId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Branch Location:</span>
                <span className="font-semibold">{selectedBooking.branch}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Facility Reserved:</span>
                <span className="font-semibold">{selectedBooking.facility}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Time Duration:</span>
                <span className="font-mono">{selectedBooking.timeDuration}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Total Amount:</span>
                <span className="font-heading text-base font-bold text-emerald-600">
                  ₦{selectedBooking.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Method:</span>
                <span className="font-bold text-gray-800">{selectedBooking.paymentMethod}</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert(`Printing official receipt for ${selectedBooking.id}...`);
                setSelectedBooking(null);
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-print"></i>
              <span>Print Official Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
