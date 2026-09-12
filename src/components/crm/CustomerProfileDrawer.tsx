import React, { useState } from 'react';
import { Customer } from '../../types';

interface CustomerProfileDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'bookings' | 'subscription' | 'messaging'
  >('overview');

  if (!isOpen || !customer) return null;

  const totalRevenue = customer.lifetimeRevenue;
  const visits = customer.totalVisits;
  const avgSpend = visits > 0 ? Math.round(totalRevenue / visits) : 0;
  const activeSub = customer.activeSubscription;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white border-l border-gray-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
          {/* Drawer Header */}
          <div className="p-6 border-b border-gray-200/80 bg-gray-50/70 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-heading text-xl font-bold shadow-md shadow-blue-600/20">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-bold text-gray-900 tracking-tight">
                    {customer.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      customer.status === 'VIP'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : customer.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : customer.status === 'Expiring Soon'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {customer.status === 'VIP' && (
                      <i className="fa-solid fa-crown text-amber-600 text-[10px]"></i>
                    )}
                    {customer.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-mono">
                  <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">
                    ID: {customer.id}
                  </span>
                  <span>{customer.phone}</span>
                  {customer.email && (
                    <span className="truncate max-w-[180px]">{customer.email}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-gray-200 bg-white px-6 gap-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fa-solid fa-id-card"></i>
              <span>Customer Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'bookings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fa-solid fa-clock-history"></i>
              <span>Booking History ({customer.bookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'subscription'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fa-solid fa-ticket"></i>
              <span>Active Subscription</span>
            </button>

            <button
              onClick={() => setActiveTab('messaging')}
              className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'messaging'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fa-solid fa-[#...]" style={{ display: 'none' }}></i>
              <i className="fa-solid fa-comments"></i>
              <span>Communications</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px]">
                Soon
              </span>
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                      Lifetime Revenue
                    </span>
                    <span className="font-heading text-lg font-bold text-emerald-600">
                      ₦{totalRevenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                      Total Bookings
                    </span>
                    <span className="font-heading text-lg font-bold text-gray-900">
                      {visits} Visits
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                      Avg Spend / Visit
                    </span>
                    <span className="font-heading text-lg font-bold text-blue-600">
                      ₦{avgSpend.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Information Card */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gray-400">
                    Customer Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Full Name</span>
                      <span className="font-bold text-gray-900">{customer.name}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">Company / Account</span>
                      <span className="font-semibold text-gray-800">
                        {customer.company || 'Individual Account'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">Phone Number</span>
                      <span className="font-mono font-medium text-gray-800">{customer.phone}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">Email Address</span>
                      <span className="font-medium text-gray-800">
                        {customer.email || 'Not Provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">Latest Visit</span>
                      <span className="font-medium text-gray-800">{customer.latestVisit}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[11px]">System Status</span>
                      <span className="font-bold text-emerald-600">{customer.status}</span>
                    </div>
                  </div>
                </div>

                {/* Branch History Section */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-2">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gray-400">
                    Branch History ({customer.branchHistory.length} Locations)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {customer.branchHistory.map((b, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
                      >
                        <i className="fa-solid fa-location-dot text-[10px] text-blue-500"></i>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visited Facilities Section */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-2">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gray-400">
                    Visited Facilities ({customer.visitedFacilities.length} Types)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {customer.visitedFacilities.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200"
                      >
                        <i className="fa-solid fa-building text-[10px] text-gray-400"></i>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Active Subscription Summary Card */}
                {activeSub ? (
                  <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                        Current Active Subscription
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          activeSub.status === 'Expiring Soon'
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-emerald-400 text-emerald-950'
                        }`}
                      >
                        {activeSub.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-heading text-base font-bold text-white">
                          {activeSub.facility}
                        </h4>
                        <span className="text-xs text-blue-200">{activeSub.branch}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-blue-300 block">Days Remaining</span>
                        <span className="font-heading text-xl font-bold text-amber-300">
                          {activeSub.daysRemaining} Days
                        </span>
                      </div>
                    </div>

                    {/* Expiration warning banner if expiring soon */}
                    {activeSub.daysRemaining <= 5 && (
                      <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation text-amber-300"></i>
                        <span>
                          <strong>Upcoming Expiration:</strong> Expires on {activeSub.endDate}. Action required for renewal.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-500">
                    No active subscription currently ongoing.
                  </div>
                )}
              </div>
            )}

            {/* Booking History Tab */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <h3 className="font-heading text-sm font-bold text-gray-900">
                  Full Booking Ledger History
                </h3>
                {customer.bookings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    No past bookings logged for this customer.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Booking ID</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Facility</th>
                          <th className="py-2.5 px-3">Branch</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customer.bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50/70">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                              {b.id}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">{b.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              {b.facility}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">{b.branch}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 font-heading">
                              ₦{b.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : b.status === 'Upcoming'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Active Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-4">
                <h3 className="font-heading text-sm font-bold text-gray-900">
                  Subscription & Expiration Status
                </h3>

                {activeSub ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider">
                          Active Pass / Facility
                        </span>
                        <h4 className="font-heading text-lg font-bold text-gray-900">
                          {activeSub.facility}
                        </h4>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          activeSub.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : activeSub.status === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {activeSub.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 block">Branch Location</span>
                        <span className="font-bold text-gray-900">{activeSub.branch}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Total Contract Value</span>
                        <span className="font-bold text-emerald-600 font-heading">
                          ₦{activeSub.amount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Start Date</span>
                        <span className="font-medium text-gray-800">{activeSub.startDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">End / Renewal Date</span>
                        <span className="font-bold text-gray-900">{activeSub.endDate}</span>
                      </div>
                    </div>

                    {/* Days Remaining Meter */}
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-500 font-medium">Subscription Progress</span>
                        <span className="font-bold text-blue-600">
                          {activeSub.daysRemaining} Days Left (of {activeSub.daysCount})
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            activeSub.daysRemaining <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              ((activeSub.daysCount - activeSub.daysRemaining) /
                                activeSub.daysCount) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500">
                    No active subscription pass registered.
                  </div>
                )}
              </div>
            )}

            {/* Future Communication Feature Sections (WhatsApp & Email Disabled with "Coming Soon" Badge) */}
            {activeTab === 'messaging' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
                  <i className="fa-solid fa-circle-info text-blue-600 text-base shrink-0 mt-0.5"></i>
                  <div>
                    <strong className="font-bold block text-blue-950 mb-0.5">
                      Future Communication API Integration Stubs
                    </strong>
                    The user interface and backend architecture are prepared for automated messaging, email campaigns, and push notification triggers. These channels are currently disabled pending API provider activation.
                  </div>
                </div>

                {/* WhatsApp Section */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-4 opacity-75 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <i className="fa-brands fa-whatsapp text-emerald-600 text-lg"></i>
                      <h3 className="font-heading text-sm font-bold text-gray-900">
                        WhatsApp Automated Messaging
                      </h3>
                    </div>
                    {/* Badge "Coming Soon" */}
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shadow-2xs">
                      <i className="fa-solid fa-lock text-[9px] mr-1"></i>
                      Coming Soon
                    </span>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-700">
                      Send Instant WhatsApp Message to {customer.phone}
                    </label>
                    <textarea
                      disabled
                      rows={3}
                      placeholder="Hi 👋 Your active subscription is nearing expiration. Tap to extend your pass..."
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        Prepared Endpoint: <code className="font-mono text-gray-600">POST /api/customers/:id/whatsapp</code>
                      </span>
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-xl text-xs font-bold cursor-not-allowed flex items-center gap-2"
                      >
                        <i className="fa-brands fa-whatsapp"></i>
                        <span>Send WhatsApp (Disabled)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Section */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-4 opacity-75 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-envelope text-blue-600 text-lg"></i>
                      <h3 className="font-heading text-sm font-bold text-gray-900">
                        Direct Email Campaign Broadcast
                      </h3>
                    </div>
                    {/* Badge "Coming Soon" */}
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shadow-2xs">
                      <i className="fa-solid fa-lock text-[9px] mr-1"></i>
                      Coming Soon
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        disabled
                        placeholder="[Corporate Update] Exclusive Facility Renewal Notice"
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Email Message Body
                      </label>
                      <textarea
                        disabled
                        rows={3}
                        placeholder="Dear Client, thank you for your ongoing partnership..."
                        className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        Prepared Endpoint: <code className="font-mono text-gray-600">POST /api/customers/:id/email</code>
                      </span>
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-xl text-xs font-bold cursor-not-allowed flex items-center gap-2"
                      >
                        <i className="fa-solid fa-paper-plane"></i>
                        <span>Dispatch Email (Disabled)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              Customer Account ID: <strong className="font-mono text-gray-800">{customer.id}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
