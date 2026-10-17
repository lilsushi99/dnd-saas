import React, { useState, useEffect } from 'react';
import { CustomerApiService } from '../../services/customerService';
import { Customer, DashboardFilters } from '../../types';

interface TopCustomersCardProps {
  branchFilter?: string;
  filters?: DashboardFilters;
  onNavigateToCrm?: () => void;
}

export const TopCustomersCard: React.FC<TopCustomersCardProps> = ({
  branchFilter = 'all',
  filters,
  onNavigateToCrm,
}) => {
  const [sortBy, setSortBy] = useState<'revenue' | 'frequency'>('revenue');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedBranch = filters?.branch && filters.branch !== 'all' ? filters.branch : branchFilter;

  const loadCustomers = () => {
    setLoading(true);
    CustomerApiService.fetchCustomers({
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
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
  };

  useEffect(() => {
    loadCustomers();

    const handleRefresh = () => {
      loadCustomers();
    };

    window.addEventListener('nexus:refresh-financials', handleRefresh);
    return () => window.removeEventListener('nexus:refresh-financials', handleRefresh);
  }, [selectedBranch, sortBy]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-xs font-sans flex flex-col justify-between h-[480px] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-gray-100 pb-3 shrink-0">
        <h3 className="font-heading text-base font-semibold text-gray-900 tracking-tight">
          Top Customers
        </h3>

        {/* Sort Switch */}
        <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl text-xs font-normal self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSortBy('revenue')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              sortBy === 'revenue'
                ? 'bg-white text-gray-900 font-medium shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setSortBy('frequency')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              sortBy === 'frequency'
                ? 'bg-white text-gray-900 font-medium shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Frequency
          </button>
        </div>
      </div>

      {/* Ranked Customer List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <i className="fa-solid fa-users text-base mb-1"></i>
            <p className="text-xs font-normal">No customer accounts registered</p>
          </div>
        ) : (
          customers.slice(0, 5).map((cust, idx) => {
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
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 transition-colors cursor-pointer"
              >
                {/* Rank Number + Avatar + Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-4 font-heading text-xs font-medium text-gray-400 text-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-gray-200/80 text-gray-700 font-heading font-medium flex items-center justify-center text-xs shrink-0">
                    {avatarText}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-medium text-xs text-gray-900 truncate">
                        {cust.name}
                      </span>
                      {cust.status === 'VIP' && (
                        <span className="px-1.5 py-0.2 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-medium">
                          VIP
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 truncate block font-normal">
                      {cust.company || cust.phone || 'Individual Client'}
                    </span>
                  </div>
                </div>

                {/* Metric Output based on Sort Switch */}
                <div className="text-right shrink-0 pl-3">
                  <div className="font-heading font-medium text-xs text-gray-900">
                    {sortBy === 'revenue' ? (
                      `₦${(cust.lifetimeRevenue || 0).toLocaleString()}`
                    ) : (
                      <span>{cust.totalVisits || 0} visits</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-normal block mt-0.5">
                    Active
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div className="border-t border-gray-100 pt-3 mt-3 text-center">
        <button
          type="button"
          onClick={() => {
            if (onNavigateToCrm) onNavigateToCrm();
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>View All Accounts in CRM</span>
          <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
};
