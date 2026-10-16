import React, { useState, useEffect, useRef } from 'react';
import { Booking, ClientSuggestion, Branch, Facility } from '../../types';
import { OperationsApiService } from '../../services/operationsService';
import { AdminApiService } from '../../services/adminService';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { CustomSelect } from '../common/CustomSelect';

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
  const [startTime, setStartTime] = useState<string>('09:00');
  const [clientName, setClientName] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [facility, setFacility] = useState<string>('');
  const [durationCount, setDurationCount] = useState<number>(1);
  const [timeDuration, setTimeDuration] = useState<string>('09:00 AM - 05:00 PM');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Transfer' | 'Cash'>('Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Authoritative Currency from System Settings
  const [currency, setCurrency] = useState<string>('₦');

  // Dynamic Branches & Facilities from DB
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);

  // Client suggestions state
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-generated Booking ID preview
  const [autoIdPreview, setAutoIdPreview] = useState<string>('');

  // Clean reset function for resetting form state after successful submission
  const resetFormState = () => {
    setDate(new Date().toISOString().substring(0, 10));
    setStartTime('09:00');
    setClientName('');
    setClientId('');
    setPhone('');
    setEmail('');
    setFacility('');
    setDurationCount(1);
    setTimeDuration('09:00 AM - 05:00 PM');
    setAmount(0);
    setPaymentMethod('Transfer');
    setSuggestions([]);
    setShowSuggestions(false);
    setFormError(null);
  };

  // Load branches, facilities, currency and preview ID dynamically when opened
  useEffect(() => {
    if (isOpen) {
      setFormError(null);

      // Load authoritative currency
      OperationsApiService.fetchSystemSettings()
        .then((s) => {
          if (s?.currency) setCurrency(s.currency);
        })
        .catch(() => {});

      AdminApiService.fetchBranches()
        .then((bList) => {
          const activeBranches = bList.filter((b) => b.status === 'Active');
          setBranches(activeBranches);
          if (activeBranches.length > 0 && !branch) {
            setBranch(activeBranches[0].name);
          }
        })
        .catch((err) => console.error('Error fetching branches:', err));

      AdminApiService.fetchFacilities()
        .then((fList) => {
          setAllFacilities(fList);
        })
        .catch((err) => console.error('Error fetching facilities:', err));

      OperationsApiService.fetchNextBookingId()
        .then((id) => setAutoIdPreview(id))
        .catch((err) => console.error('Failed to fetch next booking ID', err));
    }
  }, [isOpen]);

  // Derive eligible facilities strictly belonging to the currently selected branch
  const activeFacilities = allFacilities.filter((f) => f.status === 'Active');
  const branchFacilities = activeFacilities.filter((f) => {
    if (!branch) return true;
    const branchMatch =
      f.branchName.toLowerCase() === branch.toLowerCase() ||
      (branches.find((b) => b.name.toLowerCase() === branch.toLowerCase())?.id === f.branchId);
    return branchMatch;
  });

  // Handle branch change: clear facility if it no longer belongs to the new branch
  const handleBranchChange = (newBranchName: string) => {
    setBranch(newBranchName);
    const eligibleForNewBranch = activeFacilities.filter((f) => {
      return (
        f.branchName.toLowerCase() === newBranchName.toLowerCase() ||
        (branches.find((b) => b.name.toLowerCase() === newBranchName.toLowerCase())?.id === f.branchId)
      );
    });

    const isCurrentFacilityValid = eligibleForNewBranch.some((f) => f.name === facility);
    if (!isCurrentFacilityValid) {
      if (eligibleForNewBranch.length > 0) {
        setFacility(eligibleForNewBranch[0].name);
      } else {
        setFacility('');
      }
    }
  };

  // Determine pricing basis of the selected facility
  const selectedFacilityObj = branchFacilities.find((f) => f.name === facility);
  const isHourly = selectedFacilityObj?.pricingBasis === 'Per Hour';

  // Auto-select first facility of current branch if facility is empty and facilities exist
  useEffect(() => {
    if (branch && branchFacilities.length > 0 && !facility) {
      setFacility(branchFacilities[0].name);
    }
  }, [branch, branchFacilities, facility]);

  // Auto calculate amount and default timeDuration when facility or duration count changes
  useEffect(() => {
    const rate = selectedFacilityObj ? selectedFacilityObj.defaultPrice || 0 : 0;
    setAmount(rate * durationCount);

    if (isHourly) {
      setTimeDuration(`${startTime} (${durationCount} hour${durationCount > 1 ? 's' : ''})`);
    } else {
      setTimeDuration('09:00 AM - 05:00 PM');
    }
  }, [selectedFacilityObj, isHourly, durationCount, startTime]);

  // Handle client search input autocomplete
  const handleClientNameChange = async (val: string) => {
    setClientName(val);
    // User typed a new/different name -> clear previously selected customer ID so bookings do not share customer IDs
    setClientId('');

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

  // Close suggestions dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('Please enter Client Name.');
      return;
    }
    if (!branch.trim()) {
      setFormError('Please select a Branch.');
      return;
    }
    if (!facility.trim()) {
      setFormError('Please select an active Facility.');
      return;
    }
    if (durationCount <= 0) {
      setFormError(`Duration must be at least 1 ${isHourly ? 'hour' : 'day'}.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      // Pass duration in correct unit
      const daysCountEquivalent = isHourly ? Math.max(1, Math.ceil(durationCount / 24)) : durationCount;

      await onSubmit({
        date,
        clientName: clientName.trim(),
        clientId: clientId.trim(), // If empty, backend creates a fresh client ID
        phone: phone.trim(),
        email: email.trim(),
        branch,
        facility,
        daysCount: daysCountEquivalent,
        timeDuration,
        amount,
        paymentMethod,
        daysUsed: 1,
        daysLeft: daysCountEquivalent,
        status: 'Active',
        pricingBasis: isHourly ? 'Per Hour' : 'Per Day',
        durationUnit: isHourly ? 'Hour' : 'Day',
        durationCount,
        startTime: `${startTime}:00`,
      });

      // Reset form state ONLY after successful submission
      resetFormState();
      onClose();
    } catch (err: any) {
      console.error(err);
      // Preserve form state on error so user can fix and retry
      setFormError(err.message || 'Failed to save booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchOptions = branches.map((b) => ({
    id: b.name,
    label: b.name,
  }));

  const facilityOptions = branchFacilities.map((f) => ({
    id: f.name,
    label: f.name,
    subLabel: `Capacity: ${f.capacity} • ${currency}${Number(f.defaultPrice || 0).toLocaleString()} / ${
      f.pricingBasis === 'Per Hour' ? 'hr' : 'day'
    }`,
  }));

  // Allowed payment methods restricted strictly to Transfer and Cash
  const paymentOptions = [
    { id: 'Transfer', label: 'Transfer' },
    { id: 'Cash', label: 'Cash' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-calendar-plus"></i>
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              New Reception Booking
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-xs"></i>
              <span>{formError}</span>
            </div>
          )}

          {/* Top Row: Auto ID & Booking Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Booking ID
              </label>
              <input
                type="text"
                readOnly
                value={autoIdPreview || 'Loading...'}
                className="w-full px-3.5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-mono font-medium cursor-not-allowed select-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Booking Date *
              </label>
              <CustomDatePicker
                value={date}
                onChange={setDate}
                required
              />
            </div>
          </div>

          {/* Client Selection Row with Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Client Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-user-tag text-xs"></i>
              </div>
              <input
                type="text"
                required
                placeholder="Start typing client or company name..."
                value={clientName}
                onChange={(e) => handleClientNameChange(e.target.value)}
                onFocus={() => clientName.trim() && setShowSuggestions(true)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-50 border border-gray-100 p-1">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectClientSuggestion(c)}
                    className="w-full text-left p-2.5 hover:bg-blue-50/70 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 text-xs">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {c.phone ? c.phone : 'No Phone'} • {c.email || 'No Email'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {c.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {clientId && (
              <div className="mt-1 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-[10px]"></i>
                Referencing Client ID: <span className="font-mono font-medium">{clientId}</span>
              </div>
            )}
          </div>

          {/* Contact Details Row - Phone number is NOT mandatory (No "Optional" label) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>
          </div>

          {/* Branch & Facility Row with strictly filtered facilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Branch Location
              </label>
              <CustomSelect
                options={branchOptions}
                value={branch}
                onChange={handleBranchChange}
                placeholder="Select branch"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Facility Type
              </label>
              <CustomSelect
                options={facilityOptions}
                value={facility}
                onChange={setFacility}
                placeholder={branchFacilities.length === 0 ? 'No facilities in this branch' : 'Select facility'}
              />
            </div>
          </div>

          {/* Duration & Time Range Row - Dynamic based on facility pricing basis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {isHourly ? 'Number of Hours *' : 'Number of Days *'}
              </label>
              <input
                type="number"
                min={1}
                max={isHourly ? 720 : 365}
                value={durationCount}
                onChange={(e) => setDurationCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Arrival / Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>
          </div>

          {/* Amount & Payment Method Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Total Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-400 font-medium">{currency}</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-xl text-xs font-medium text-gray-900 font-heading focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <CustomSelect
                options={paymentOptions}
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as 'Transfer' | 'Cash')}
                placeholder="Select payment method"
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
