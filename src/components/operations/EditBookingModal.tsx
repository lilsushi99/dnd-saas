import React, { useState, useEffect } from 'react';
import { Booking, Branch, Facility } from '../../types';
import { AdminApiService } from '../../services/adminService';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSubmit: (id: string, updatedFields: Partial<Booking>) => Promise<void>;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    date: '',
    clientName: '',
    phone: '',
    email: '',
    branch: '',
    facility: '',
    timeDuration: '',
    amount: 0,
    paymentMethod: 'Wire Transfer' as 'Credit Card' | 'Wire Transfer' | 'Cash' | 'Corporate Billing',
    daysCount: 1,
    daysUsed: 1,
    status: 'Active' as 'Active' | 'Expired' | 'Upcoming',
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      AdminApiService.fetchBranches()
        .then((bList) => setBranches(bList))
        .catch((err) => console.error('Error fetching branches:', err));

      AdminApiService.fetchFacilities()
        .then((fList) => setFacilities(fList))
        .catch((err) => console.error('Error fetching facilities:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (booking) {
      setFormData({
        date: booking.date || '',
        clientName: booking.clientName || '',
        phone: booking.phone || '',
        email: booking.email || '',
        branch: booking.branch || '',
        facility: booking.facility || '',
        timeDuration: booking.timeDuration || '09:00 AM - 05:00 PM',
        amount: booking.amount || 0,
        paymentMethod: booking.paymentMethod || 'Wire Transfer',
        daysCount: booking.daysCount || 1,
        daysUsed: booking.daysUsed || 1,
        status: booking.status || 'Active',
      });
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const daysCount = Number(formData.daysCount);
      const daysUsed = Number(formData.daysUsed);
      const daysLeft = Math.max(0, daysCount - daysUsed);

      await onSubmit(booking.id, {
        ...formData,
        amount: Number(formData.amount),
        daysCount,
        daysUsed,
        daysLeft,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                {booking.id}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Permanent Booking ID</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-gray-900 mt-1">
              Edit Booking Record
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Client Details Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Client / Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Booking & Facility Details */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Facility & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Branch Location</label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none cursor-pointer transition-all"
                >
                  {formData.branch && !branches.some((b) => b.name === formData.branch) && (
                    <option value={formData.branch}>{formData.branch}</option>
                  )}
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))
                  ) : (
                    !formData.branch && <option value="">No branches found</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Facility Type</label>
                <select
                  value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none cursor-pointer transition-all"
                >
                  {formData.facility && !facilities.some((f) => f.name === formData.facility) && (
                    <option value={formData.facility}>{formData.facility}</option>
                  )}
                  {facilities.length > 0 ? (
                    facilities.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))
                  ) : (
                    !formData.facility && <option value="">No facilities found</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Booking Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Time Schedule</label>
                <input
                  type="text"
                  value={formData.timeDuration}
                  onChange={(e) => setFormData({ ...formData, timeDuration: e.target.value })}
                  placeholder="e.g. 09:00 AM - 05:00 PM"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Duration & Payment */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Payment & Duration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-bold text-emerald-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none cursor-pointer transition-all"
                >
                  <option value="Wire Transfer">Wire Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Company Cheque">Company Cheque</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                  <option value="Corporate Direct Debit">Corporate Direct Debit</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none cursor-pointer transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Total Days</label>
                <input
                  type="number"
                  min="1"
                  value={formData.daysCount}
                  onChange={(e) => setFormData({ ...formData, daysCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Days Used</label>
                <input
                  type="number"
                  min="0"
                  value={formData.daysUsed}
                  onChange={(e) => setFormData({ ...formData, daysUsed: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-gray-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Days Left (Auto)</label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700">
                  {Math.max(0, formData.daysCount - formData.daysUsed)} Days
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm shadow-blue-600/20"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-xs"></i>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
