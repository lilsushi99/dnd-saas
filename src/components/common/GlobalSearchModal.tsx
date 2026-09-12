import React, { useEffect, useState } from 'react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNav: (id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectNav,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open search modal
          const btn = document.querySelector('[data-search-trigger]');
          if (btn) (btn as HTMLButtonElement).click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const searchableItems = [
    // Navigation & Modules
    { id: 'dashboard', title: 'Executive Dashboard & Overview', category: 'Navigation', icon: 'fa-solid fa-house-chimney' },
    { id: 'crm', title: 'CRM Account Directory & Client Records', category: 'Sales & CRM', icon: 'fa-solid fa-address-book' },
    { id: 'daily_logger', title: 'Daily Facility Logger & Check-ins', category: 'Operations', icon: 'fa-solid fa-calendar-check' },
    { id: 'facility_records', title: 'Facility Usage Records & Logs', category: 'Operations', icon: 'fa-solid fa-sheet-plastic' },
    { id: 'expenses', title: 'Financial General Ledger & Expense Vouchers', category: 'Finance', icon: 'fa-solid fa-receipt' },
    { id: 'reports', title: 'Financial Reports & Profitability Analytics', category: 'Finance', icon: 'fa-solid fa-chart-pie' },
    { id: 'branches', title: 'Branch Locations & Regional Offices', category: 'Administration', icon: 'fa-solid fa-code-branch' },
    { id: 'facilities', title: 'Facility Directory & Asset Management', category: 'Administration', icon: 'fa-solid fa-house-signal' },
    { id: 'users_roles', title: 'Users Accounts & Security Role Matrix', category: 'Administration', icon: 'fa-solid fa-users-gear' },
    { id: 'import_wizard', title: 'Excel & CSV Data Import Wizard', category: 'Administration', icon: 'fa-solid fa-file-csv' },
    { id: 'settings', title: 'Business Settings & Administrator Profile', category: 'System Settings', icon: 'fa-solid fa-gear' },
  ];

  const filteredLinks = query.trim()
    ? searchableItems.filter(
        (link) =>
          link.title.toLowerCase().includes(query.toLowerCase()) ||
          link.category.toLowerCase().includes(query.toLowerCase())
      )
    : searchableItems;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl z-10 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Search input bar */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
          <i className="fa-solid fa-magnifying-glass text-gray-400 text-base ml-1"></i>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search modules, settings, ledgers..."
            className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Search Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-gray-50">
          <div className="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider font-sans">
            {query ? 'Search Results' : 'Recommended Navigation'}
          </div>

          {filteredLinks.length > 0 ? (
            filteredLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectNav(item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/60 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-600 group-hover:text-white text-gray-500 flex items-center justify-center text-sm transition-colors">
                    <i className={item.icon}></i>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {item.category}
                    </p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-right text-xs text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 text-xs">
              <i className="fa-solid fa-circle-nodes text-2xl text-gray-300 mb-2 block"></i>
              No matching modules or views found for "{query}"
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-sans">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">
                ↵
              </kbd>{' '}
              Select
            </span>
          </div>
          <span>Nexus Enterprise Engine</span>
        </div>
      </div>
    </div>
  );
};
