import React, { useState, useEffect } from 'react';
import { Facility, Branch } from '../../types';

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; branchId: string; defaultPrice?: number; capacity: number; status: 'Active' | 'Inactive' }) => Promise<void>;
  initialData?: Facility | null;
  branches: Branch[];
}

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  branches,
}) => {
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [defaultPrice, setDefaultPrice] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(5);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setBranchId(initialData.branchId);
      setDefaultPrice(initialData.defaultPrice !== undefined ? String(initialData.defaultPrice) : '');
      setCapacity(initialData.capacity || 5);
      setStatus(initialData.status);
    } else {
      setName('');
      setBranchId(branches.length > 0 ? branches[0].id : '');
      setDefaultPrice('');
      setCapacity(5);
      setStatus('Active');
    }
    setError(null);
  }, [initialData, isOpen, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branchId) {
      setError('Facility Name and Branch selection are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const priceVal = defaultPrice.trim() !== '' ? parseFloat(defaultPrice) : undefined;
      await onSubmit({
        name: name.trim(),
        branchId,
        defaultPrice: priceVal,
        capacity: Math.max(1, capacity),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fadeIn font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <i className="fa-solid fa-house-signal text-base"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-heading">
                {initialData ? 'Edit Facility' : 'Create New Facility'}
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                {initialData ? 'Modify facility parameters and rates' : 'Register a new space or room unit under a branch'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Facility Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Co-working Space Desk, Podcast Studio"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Assigned Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.location})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Each Facility belongs strictly to ONE Branch.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Default Price ($) <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                placeholder="e.g. 450.00"
                className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Optional because default pricing may be customized or negotiated during client booking.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Occupancy Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              placeholder="e.g. 20 for Co-working, 2 for Meeting Room"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Maximum concurrent bookings allowed for this facility space (e.g. Co-working: 20, Meeting Room: 2, Podcast Room: 1).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Operational Status
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  name="facilityStatus"
                  value="Active"
                  checked={status === 'Active'}
                  onChange={() => setStatus('Active')}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  name="facilityStatus"
                  value="Inactive"
                  checked={status === 'Inactive'}
                  onChange={() => setStatus('Inactive')}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Inactive
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  {initialData ? 'Save Changes' : 'Save Facility'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
