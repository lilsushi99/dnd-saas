import React, { useState, useEffect, useRef } from 'react';
import { Booking, ClientSuggestion, Branch, Facility } from '../../types';
import { OperationsApiService } from '../../services/operationsService';
import { AdminApiService } from '../../services/adminService';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingData: Omit<Booking, 'id' | 'createdAt'>) => Promise<void>;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [clientName, setClientName] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [facility, setFacility] = useState<string>('');
  const [daysCount, setDaysCount] = useState<number>(30);
  const [timeDuration, setTimeDuration] = useState<string>('09:00 AM - 05:00 PM');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    'Credit Card' | 'Wire Transfer' | 'Cash' | 'Corporate Billing'
  >('Wire Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Branches & Facilities from DB
  const [branches, setBranches] = useState<Branch[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  // Client suggestions state
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load branches and facilities dynamically
  useEffect(() => {
    if (isOpen) {
      AdminApiService.fetchBranches()
        .then((bList) => {
          setBranches(bList);
          if (bList.length > 0 && !branch) {
            setBranch(bList[0].name);
          }
        })
        .catch((err) => console.error('Error fetching branches:', err));

      AdminApiService.fetchFacilities()
        .then((fList) => {
          setFacilities(fList);
          if (fList.length > 0 && !facility) {
            setFacility(fList[0].name);
          }
        })
        .catch((err) => console.error('Error fetching facilities:', err));
    }
  }, [isOpen]);

  // Auto calculate amount when facility or days change
  useEffect(() => {
    const matchedFac = facilities.find((f) => f.name === facility);
    const dailyRate = matchedFac ? matchedFac.defaultPrice : 0;
    setAmount(dailyRate * daysCount);
  }, [facility, daysCount, facilities]);

  // Handle client search input autocomplete
  const handleClientNameChange = async (val: string) => {
    setClientName(val);
    if (val.trim().length >= 1) {
      try {
        const results = await OperationsApiService.searchClients(val);
        setSuggestions(Array.isArray(results) ? results : []);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Failed to search clients:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectClientSuggestion = (client: ClientSuggestion) => {
    if (!client) return;
    setClientName(client.name || '');
    setClientId(client.id || '');
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setShowSuggestions(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [autoIdPreview, setAutoIdPreview] = useState<string>('BK-IPHIN-2026-8');

  // Fetch dynamic next Booking ID when modal opens
  useEffect(() => {
    if (isOpen) {
      OperationsApiService.fetchNextBookingId()
        .then((id) => setAutoIdPreview(id))
        .catch((err) => console.error('Failed to fetch next booking ID', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !phone.trim()) {
      alert('Please fill out Client Name and Phone Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedClientId = clientId || `CL-${Math.floor(8000 + Math.random() * 1000)}`;
      await onSubmit({
        date,
        clientName: clientName.trim(),
        clientId: generatedClientId,
        phone: phone.trim(),
        email: email.trim(),
        branch,
        facility,
        daysCount,
        timeDuration,
        amount,
        paymentMethod,
        daysUsed: 1,
        daysLeft: daysCount - 1,
        status: 'Active',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-100">
              <i className="fa-solid fa-calendar-plus"></i>
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-gray-900 leading-tight">
                New Reception Booking
              </h2>
              <p className="text-xs text-gray-500">
                Log a new facility reservation into the Daily Logger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Top Row: Auto ID & Booking Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Booking ID (Auto Generated)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={autoIdPreview}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-500 cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  SYSTEM
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Booking Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Client Selection Row with Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Client Name (Autocomplete) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-user-tag text-xs"></i>
              </div>
              <input
                type="text"
                required
                placeholder="Start typing client or company name..."
                value={clientName}
                onChange={(e) => handleClientNameChange(e.target.value)}
                onFocus={() => clientName.trim() && setShowSuggestions(true)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectClientSuggestion(c)}
                    className="w-full text-left p-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-gray-900 text-xs">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {c.phone} • {c.email || 'No Email'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {c.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {clientId && (
              <div className="mt-1 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-[10px]"></i>
                Matched Client ID: <span className="font-mono font-bold">{clientId}</span>
              </div>
            )}
          </div>

          {/* Contact Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Optional Email
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Branch & Facility Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Branch Location
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer"
              >
                {branches.length > 0 ? (
                  branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))
                ) : (
                  <option value="">No branches found</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Facility Selected
              </label>
              <select
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer"
              >
                {facilities.length > 0 ? (
                  facilities.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name} (Capacity: {f.capacity} • {f.defaultPrice}/day)
                    </option>
                  ))
                ) : (
                  <option value="">No facilities found</option>
                )}
              </select>
            </div>
          </div>

          {/* Duration & Time Range Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Number of Days
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={daysCount}
                onChange={(e) => setDaysCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Time Duration (Default 9AM-5PM)
              </label>
              <input
                type="text"
                value={timeDuration}
                onChange={(e) => setTimeDuration(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Amount & Payment Method Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Total Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-bold">₦</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer"
              >
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Corporate Billing">Corporate Billing</option>
              </select>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  <span>Save Booking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
