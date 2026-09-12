import React, { useState } from 'react';
import { Logo } from '../Logo';
import { User } from '../../types';

interface SidebarProps {
  activeNavItem: string;
  onSelectNavItem: (id: string) => void;
  onLogout: () => void;
  user: User;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface SidebarMenuItem {
  id: string;
  label: string;
  iconClass: string;
  badge?: string;
  badgeType?: 'primary' | 'warning' | 'gray';
  subItems?: { id: string; label: string; iconClass: string }[];
}

export const sidebarNavigation: { title?: string; items: SidebarMenuItem[] }[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        iconClass: 'fa-solid fa-house-chimney',
      },
      {
        id: 'operations',
        label: 'Operations',
        iconClass: 'fa-solid fa-boxes-stacked',
        subItems: [
          { id: 'daily_logger', label: 'Daily Logger', iconClass: 'fa-solid fa-calendar-check' },
          { id: 'facility_records', label: 'Facility Records', iconClass: 'fa-solid fa-sheet-plastic' },
        ],
      },
      {
        id: 'customers',
        label: 'Customers',
        iconClass: 'fa-solid fa-users',
        badge: '7',
        badgeType: 'primary',
        subItems: [
          { id: 'crm', label: 'CRM', iconClass: 'fa-solid fa-address-book' },
          { id: 'communications', label: 'Communications', iconClass: 'fa-solid fa-comments' },
        ],
      },
      {
        id: 'finance',
        label: 'Finance',
        iconClass: 'fa-solid fa-wallet',
        subItems: [
          { id: 'expenses', label: 'Expenses', iconClass: 'fa-solid fa-receipt' },
          { id: 'reports', label: 'Reports & Analytics', iconClass: 'fa-solid fa-chart-pie' },
        ],
      },
      {
        id: 'administration',
        label: 'Administration',
        iconClass: 'fa-solid fa-shield-halved',
        subItems: [
          { id: 'branches', label: 'Branches', iconClass: 'fa-solid fa-code-branch' },
          { id: 'facilities', label: 'Facilities', iconClass: 'fa-solid fa-house-signal' },
          { id: 'expense_categories', label: 'Expense Categories', iconClass: 'fa-solid fa-tags' },
          { id: 'users_roles', label: 'Users & Roles', iconClass: 'fa-solid fa-users-gear' },
          { id: 'import_wizard', label: 'Import Wizard', iconClass: 'fa-solid fa-file-csv' },
        ],
      },
      {
        id: 'hr_payroll',
        label: 'HR & Payroll',
        iconClass: 'fa-solid fa-users-gear',
        badge: 'Coming Soon',
        badgeType: 'gray',
      },
      {
        id: 'settings',
        label: 'Settings',
        iconClass: 'fa-solid fa-gear',
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeNavItem,
  onSelectNavItem,
  onLogout,
  user,
  isOpenMobile,
  onCloseMobile,
}) => {
  // State for collapsible parent menus
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    operations: true,
    customers: false,
    finance: false,
    administration: false,
  });

  const toggleParent = (parentId: string) => {
    setOpenParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-gray-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100 shrink-0">
          <Logo size="md" />
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {sidebarNavigation[0].items.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isParentOpen = openParents[item.id] ?? false;

            // Check if active item matches item.id OR one of its subItems
            const isChildActive = hasSubItems && item.subItems?.some((sub) => sub.id === activeNavItem);
            const isDirectActive = activeNavItem === item.id;
            const isActive = isDirectActive || isChildActive;

            return (
              <div key={item.id} className="space-y-1">
                {/* Parent Item Button */}
                <button
                  onClick={() => {
                    if (item.badge === 'Coming Soon') {
                      alert('HR & Payroll module will be enabled in upcoming release.');
                      return;
                    }
                    if (hasSubItems) {
                      toggleParent(item.id);
                    } else {
                      onSelectNavItem(item.id);
                      onCloseMobile();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-blue-50/80 text-blue-700 font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {/* Thin vertical blue indicator bar on active item */}
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-blue-600 rounded-r-full" />
                  )}

                  <div className="flex items-center gap-3 min-w-0 pl-1">
                    <div
                      className={`w-5 h-5 flex items-center justify-center text-sm shrink-0 transition-colors ${
                        isActive
                          ? 'text-blue-600'
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    >
                      <i className={item.iconClass}></i>
                    </div>
                    <span className="truncate font-sans">{item.label}</span>
                  </div>

                  {/* Badge or Chevron */}
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight ${
                          item.badgeType === 'gray'
                            ? 'bg-gray-100 text-gray-500 font-medium'
                            : isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {hasSubItems && (
                      <i
                        className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200 ${
                          isParentOpen ? 'rotate-180 text-gray-600' : ''
                        }`}
                      ></i>
                    )}
                  </div>
                </button>

                {/* Collapsible Sub-Items */}
                {hasSubItems && isParentOpen && (
                  <div className="ml-5 pl-3 border-l border-gray-200/80 space-y-1 py-1">
                    {item.subItems?.map((sub) => {
                      const isSubActive = activeNavItem === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            onSelectNavItem(sub.id);
                            onCloseMobile();
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
                            isSubActive
                              ? 'bg-blue-50/80 text-blue-700 font-bold'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {isSubActive && (
                            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-r-full" />
                          )}
                          <i
                            className={`${sub.iconClass} text-[11px] ${
                              isSubActive ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          ></i>
                          <span className="truncate font-sans">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with User info & Logout button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-gray-200/70 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-heading font-bold flex items-center justify-center text-xs shadow-xs">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white"></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 truncate font-heading">
                  {user.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate font-sans">
                  {user.role}
                </div>
              </div>
            </div>

            {/* Logout Icon Button */}
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <i className="fa-solid fa-right-from-bracket text-sm"></i>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
