import React, { useState, useEffect } from 'react';
import { CustomerApiService } from '../../services/customerService';
import { Customer } from '../../types';

interface TopCustomersCardProps {
  branchFilter?: string;
  onNavigateToCrm?: () => void;
}

export const TopCustomersCard: React.FC<TopCustomersCardProps> = ({
  branchFilter = 'all',
  onNavigateToCrm,
}) => {
  const [sortBy, setSortBy] = useState<'revenue' | 'frequency'>('revenue');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    CustomerApiService.fetchCustomers({
      branch: branchFilter !== 'all' ? branchFilter : undefined,
      sort: sortBy === 'revenue' ? 'revenue_desc' : 'visits_desc',
    })
      .then((data) => {
        setCustomers(data.customers || []);
      })
      .catch((err) => {
        console.error('Failed to load top customers:', err);
        setCustomers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [branchFilter, sortBy]);

  const colors = [
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-violet-600 text-white',
  ];

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans flex flex-col justify-between h-[480px] overflow-hidden">
      {/* Header with Switch / Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 tracking-tight">
            Top Enterprise Customers
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Key client rankings by transaction activity
          </p>
        </div>

        {/* Sort Switch: Revenue vs Frequency */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setSortBy('revenue')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              sortBy === 'revenue'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setSortBy('frequency')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              sortBy === 'frequency'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Frequency
          </button>
        </div>
      </div>

      {/* Ranked Customer List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-2">
              <i className="fa-solid fa-users text-sm"></i>
            </div>
            <p className="text-xs font-semibold text-gray-600">No Enterprise Accounts</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Client accounts will appear here once registered.</p>
          </div>
        ) : (
          customers.slice(0, 5).map((cust, idx) => {
            const avatarBg = colors[idx % colors.length];
            const avatarText = cust.name
              ? cust.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'CL';

            return (
              <div
                key={cust.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-[#F8F9FB] hover:bg-blue-50/50 hover:border-blue-100 transition-all cursor-pointer group"
              >
                {/* Rank Number + Avatar + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 font-heading text-xs font-bold text-gray-400 text-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl ${avatarBg} font-heading font-bold flex items-center justify-center text-xs shadow-xs shrink-0`}
                  >
                    {avatarText}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-xs text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                        {cust.name}
                      </span>
                      {cust.status === 'VIP' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                          VIP
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 truncate block">
                      {cust.company || cust.phone || 'Individual Client'}
                    </span>
                  </div>
                </div>

                {/* Metric Output based on Sort Switch */}
                <div className="text-right shrink-0 pl-3">
                  <div className="font-heading font-bold text-xs text-gray-900">
                    {sortBy === 'revenue' ? (
                      `₦${(cust.lifetimeRevenue || 0).toLocaleString()}`
                    ) : (
                      <span>{cust.totalVisits || 0} visits</span>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
                    <i className="fa-solid fa-arrow-up-right text-[9px]"></i>
                    Active
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div className="border-t border-gray-100 pt-3.5 mt-4 text-center">
        <button
          onClick={() => {
            if (onNavigateToCrm) onNavigateToCrm();
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>View All Accounts in CRM</span>
          <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
};
