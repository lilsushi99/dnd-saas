import React, { useState, useEffect } from 'react';
import { Booking, Branch, Facility } from '../../types';
import { AdminApiService } from '../../services/adminService';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { CustomSelect } from '../common/CustomSelect';

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
    status: 'Active' as 'Active' | 'Expired' | 'Upcoming' | 'Cancelled',
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

  const branchOptions = branches.map((b) => ({
    id: b.name,
    label: b.name,
  }));

  const facilityOptions = facilities.map((f) => ({
    id: f.name,
    label: f.name,
    subLabel: `Capacity: ${f.capacity} • ₦${f.defaultPrice.toLocaleString()}/day`,
  }));

  const paymentOptions = [
    { id: 'Wire Transfer', label: 'Wire Transfer' },
    { id: 'Credit Card', label: 'Credit Card' },
    { id: 'Cash', label: 'Cash' },
    { id: 'Corporate Billing', label: 'Corporate Billing' },
  ];

  const statusOptions = [
    { id: 'Active', label: 'Active' },
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Expired', label: 'Expired' },
    { id: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                {booking.id}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mt-1">
              Edit Booking Record
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Customer Information */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Client Name *</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Facility & Location */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Facility & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Branch Location</label>
                <CustomSelect
                  options={branchOptions}
                  value={formData.branch}
                  onChange={(val) => setFormData({ ...formData, branch: val })}
                  placeholder="Select branch"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Facility Type</label>
                <CustomSelect
                  options={facilityOptions}
                  value={formData.facility}
                  onChange={(val) => setFormData({ ...formData, facility: val })}
                  placeholder="Select facility"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Booking Date</label>
                <CustomDatePicker
                  value={formData.date}
                  onChange={(val) => setFormData({ ...formData, date: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time Schedule</label>
                <input
                  type="text"
                  value={formData.timeDuration}
                  onChange={(e) => setFormData({ ...formData, timeDuration: e.target.value })}
                  placeholder="e.g. 09:00 AM - 05:00 PM"
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Payment & Duration */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Payment & Duration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-emerald-600 font-heading focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
                <CustomSelect
                  options={paymentOptions}
                  value={formData.paymentMethod}
                  onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                <CustomSelect
                  options={statusOptions}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Total Days</label>
                <input
                  type="number"
                  min="1"
                  value={formData.daysCount}
                  onChange={(e) => setFormData({ ...formData, daysCount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Days Used</label>
                <input
                  type="number"
                  min="0"
                  value={formData.daysUsed}
                  onChange={(e) => setFormData({ ...formData, daysUsed: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Days Left</label>
                <div className="px-3.5 py-2.5 bg-gray-100 rounded-xl text-xs font-medium text-gray-700">
                  {Math.max(0, formData.daysCount - formData.daysUsed)} Days
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
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
