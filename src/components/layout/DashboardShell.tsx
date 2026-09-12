import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { FloatingAIAssistant } from '../common/FloatingAIAssistant';
import { ToastProvider } from '../../context/ToastContext';
import { ToastContainer } from '../common/ToastContainer';
import { GlobalFilterBar } from '../dashboard/GlobalFilterBar';
import { OverviewMetrics } from '../dashboard/OverviewMetrics';
import { RevenueTrendChart } from '../dashboard/RevenueTrendChart';
import { ExpenseOverviewCard } from '../dashboard/ExpenseOverviewCard';
import { FacilityOccupancyStatusCard } from '../dashboard/FacilityOccupancyStatusCard';
import { TopCustomersCard } from '../dashboard/TopCustomersCard';
import { DailyLogger } from '../operations/DailyLogger';
import { FacilityRecords } from '../operations/FacilityRecords';
import { CrmPage } from '../crm/CrmPage';
import { CommunicationsPage } from '../crm/CommunicationsPage';
import { CustomerProfileDrawer } from '../crm/CustomerProfileDrawer';
import { ExpensesPage } from '../finance/ExpensesPage';
import { ReportsPage } from '../finance/ReportsPage';
import { BranchesPage } from '../administration/BranchesPage';
import { FacilitiesPage } from '../administration/FacilitiesPage';
import { UsersRolesPage } from '../administration/UsersRolesPage';
import { ImportWizardPage } from '../administration/ImportWizardPage';
import { SettingsPage } from '../administration/SettingsPage';
import { ExpenseCategoriesPage } from '../administration/ExpenseCategoriesPage';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useCustomers } from '../../hooks/useCustomers';
import { User, DashboardFilters } from '../../types';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';
import { FinanceApiService } from '../../services/financeService';

interface DashboardShellProps {
  user: User;
  onLogout: () => void;
  activeNavItem: string;
  onSelectNavItem: (id: string) => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  user,
  onLogout,
  activeNavItem,
  onSelectNavItem,
}) => {
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    branch: 'all',
    dateRange: 'all',
    compareBranches: false,
  });

  const customerState = useCustomers(filters.branch);

  const getPageTitle = (id: string) => {
    switch (id) {
      case 'dashboard':
        return 'Executive Dashboard';
      case 'daily_logger':
      case 'bookings':
        return 'Daily Logger Workspace';
      case 'facility_records':
        return 'Facility Records & Yield Sheet';
      case 'crm':
      case 'crm_accounts':
      case 'customers':
        return 'CRM Customer Directory';
      case 'communications':
        return 'Communications Centre';
      case 'inventory':
        return 'Inventory Management';
      case 'logistics':
        return 'Logistics & Supply';
      case 'leads':
        return 'Lead Pipeline';
      case 'support':
        return 'Customer Support';
      case 'ledger':
        return 'General Ledger';
      case 'expenses':
        return 'Expenses Management';
      case 'reports':
        return 'Reports & Analytics';
      case 'invoices':
        return 'Invoices & Billing';
      case 'payments':
        return 'Payment Gateways';
      case 'branches':
        return 'Branches Management';
      case 'facilities':
        return 'Facilities & Spaces';
      case 'expense_categories':
        return 'Expense Categories Administration';
      case 'users_roles':
      case 'user_mgmt':
      case 'roles':
        return 'Users & Roles Administration';
      case 'import_wizard':
        return 'Excel & CSV Import Wizard';
      case 'logs':
        return 'System Logs';
      case 'settings':
        return 'Settings';
      default:
        return 'Executive Dashboard';
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    let kpis = {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      activeBookings: 0,
      occupancyRate: 0,
    };

    try {
      let period: 'today' | 'last_7_days' | 'this_month' | 'custom' | 'full_year' = 'this_month';
      if (filters.dateRange === 'last_7' || filters.dateRange === '7D') period = 'last_7_days';
      else if (filters.dateRange === 'last_12_months' || filters.dateRange === '12M') period = 'full_year';

      const analytics = await FinanceApiService.fetchAnalytics({
        branch: filters.branch !== 'all' ? filters.branch : undefined,
        period,
      });

      kpis = {
        totalRevenue: analytics.totalRevenue || 0,
        totalExpenses: analytics.totalExpenses || 0,
        netProfit: analytics.netProfit || 0,
        profitMargin: analytics.netProfitMargin || 0,
        activeBookings: analytics.totalBookings || 0,
        occupancyRate: analytics.totalBookings > 0 ? Math.min(100, Math.round((analytics.totalBookings / 30) * 100)) : 0,
      };
    } catch (e) {
      console.error('Failed to load export metrics from database:', e);
    }

    const exportData = {
      filters,
      kpis,
    };

    if (format === 'csv') {
      exportToCSV(exportData);
    } else {
      exportToPDF(exportData);
    }
  };

  const isMainDashboard = activeNavItem === 'dashboard';
  const isDailyLogger = activeNavItem === 'daily_logger' || activeNavItem === 'bookings';
  const isFacilityRecords = activeNavItem === 'facility_records';
  const isCrm = activeNavItem === 'crm' || activeNavItem === 'crm_accounts' || activeNavItem === 'customers';
  const isCommunications = activeNavItem === 'communications';
  const isExpenses = activeNavItem === 'expenses';
  const isReports = activeNavItem === 'reports';
  const isBranches = activeNavItem === 'branches';
  const isFacilities = activeNavItem === 'facilities';
  const isExpenseCategories = activeNavItem === 'expense_categories';
  const isUsersRoles = activeNavItem === 'users_roles' || activeNavItem === 'user_mgmt' || activeNavItem === 'roles';
  const isImportWizard = activeNavItem === 'import_wizard';
  const isSettings = activeNavItem === 'settings';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans flex flex-col">
        {/* Global Toast Container */}
        <ToastContainer />

        {/* Sidebar Navigation */}
        <Sidebar
          activeNavItem={activeNavItem}
          onSelectNavItem={onSelectNavItem}
          onLogout={onLogout}
          user={user}
          isOpenMobile={isOpenMobileSidebar}
          onCloseMobile={() => setIsOpenMobileSidebar(false)}
        />

        {/* Main Content Workspace */}
        <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
          {/* Top Navigation */}
          <TopNavbar
            pageTitle={getPageTitle(activeNavItem)}
            user={user}
            onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
            onLogout={onLogout}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
            onNavigate={(id) => onSelectNavItem(id)}
          />

          {/* Dashboard Content Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col">
            <ErrorBoundary fallbackTitle="Module Render Error">
              {/* Global Filter Bar (Unified Filter Row) for Main Dashboard */}
              {isMainDashboard && (
                <GlobalFilterBar
                  filters={filters}
                  onFilterChange={setFilters}
                  onExport={handleExport}
                />
              )}

            {isMainDashboard ? (
              <div className="space-y-6">
                {/* Row One: Overview Metric Cards (5 Cards) */}
                <OverviewMetrics branchFilter={filters.branch} filters={filters} />

                {/* Row Two: Revenue Trend Chart (60%) + Expense Overview Pie Chart (40%) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-7 h-full">
                    <RevenueTrendChart branchFilter={filters.branch} filters={filters} />
                  </div>
                  <div className="lg:col-span-5 h-full">
                    <ExpenseOverviewCard branchFilter={filters.branch} filters={filters} />
                  </div>
                </div>

                {/* Row Three: Facility Occupancy Status Widget (Left) + Top Customers Card (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-7 h-full">
                    <FacilityOccupancyStatusCard branchFilter={filters.branch} />
                  </div>
                  <div className="lg:col-span-5 h-full">
                    <TopCustomersCard
                      branchFilter={filters.branch}
                      onNavigateToCrm={() => onSelectNavItem('crm')}
                    />
                  </div>
                </div>
              </div>
            ) : isDailyLogger ? (
              <DailyLogger branchFilter={filters.branch} />
            ) : isFacilityRecords ? (
              <FacilityRecords branchFilter={filters.branch} />
            ) : isCrm ? (
              <CrmPage
                customers={customerState.customers}
                summary={customerState.summary}
                loading={customerState.loading}
                error={customerState.error}
                search={customerState.crmSearch}
                onSearchChange={customerState.setCrmSearch}
                branch={customerState.crmBranch}
                onBranchChange={customerState.setCrmBranch}
                dateRange={customerState.crmDateRange}
                onDateRangeChange={customerState.setCrmDateRange}
                sort={customerState.crmSort}
                onSortChange={customerState.setCrmSort}
                status={customerState.crmStatus}
                onStatusChange={customerState.setCrmStatus}
                onOpenCustomerProfile={customerState.openCustomerProfile}
                onExportCSV={() => customerState.exportCustomersData('csv')}
                onExportExcel={() => customerState.exportCustomersData('excel')}
              />
            ) : isCommunications ? (
              <CommunicationsPage />
            ) : isExpenses ? (
              <ExpensesPage branchFilter={filters.branch} />
            ) : isReports ? (
              <ReportsPage branchFilter={filters.branch} />
            ) : isBranches ? (
              <BranchesPage />
            ) : isFacilities ? (
              <FacilitiesPage />
            ) : isExpenseCategories ? (
              <ExpenseCategoriesPage />
            ) : isUsersRoles ? (
              <UsersRolesPage />
            ) : isImportWizard ? (
              <ImportWizardPage />
            ) : isSettings ? (
              <SettingsPage user={user} onLogout={onLogout} />
            ) : (
              /* Sub-module View Container Shell */
              <div className="flex-1 bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-14 flex flex-col items-center justify-center text-center shadow-2xs relative overflow-hidden min-h-[420px]">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

                <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-6 shadow-xs">
                    <i className="fa-solid fa-cubes-stacked"></i>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-100">
                    <i className="fa-solid fa-cube text-[10px]"></i>
                    {getPageTitle(activeNavItem)} Module
                  </div>

                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-2">
                    {getPageTitle(activeNavItem)} Workspace
                  </h3>

                  <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    This workspace is connected to the unified filter bar. Select{' '}
                    <strong className="text-blue-600 font-semibold cursor-pointer" onClick={() => onSelectNavItem('crm')}>
                      CRM Directory
                    </strong>{' '}
                    or{' '}
                    <strong className="text-blue-600 font-semibold cursor-pointer" onClick={() => onSelectNavItem('active_subscriptions')}>
                      Active Subscriptions
                    </strong>{' '}
                    in the sidebar to inspect the Customer module.
                  </p>

                  <button
                    onClick={() => onSelectNavItem('dashboard')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
                  >
                    <i className="fa-solid fa-house-chimney text-xs"></i>
                    <span>Return to Main Dashboard</span>
                  </button>
                </div>
              </div>
            )}
            </ErrorBoundary>
          </main>
        </div>

        {/* Customer Profile Side Drawer */}
        <CustomerProfileDrawer
          customer={customerState.selectedCustomer}
          isOpen={customerState.isDrawerOpen}
          onClose={customerState.closeCustomerProfile}
        />

        {/* Global Search Modal */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectNav={(id) => onSelectNavItem(id)}
        />

        {/* Floating AI Business Assistant Widget */}
        <FloatingAIAssistant
          isOpen={isAIAssistantOpen}
          onToggle={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
          userName={user.name}
          onSelectNav={(id) => onSelectNavItem(id)}
        />
      </div>
    </ToastProvider>
  );
};
