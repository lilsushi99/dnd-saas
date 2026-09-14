export type AuthView = 'login' | 'signup' | 'dashboard';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  organization: string;
}

export interface NavItem {
  id: string;
  label: string;
  iconClass: string;
  badge?: string;
  badgeType?: 'default' | 'primary' | 'success' | 'warning' | 'gray';
  disabled?: boolean;
  subItems?: { id: string; label: string; iconClass: string; badge?: string }[];
}

export interface NavigationSection {
  title?: string;
  items: NavItem[];
}

export interface DashboardFilters {
  branch: string;
  dateRange: string;
  compareBranches?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  timeframe: string;
  iconClass: string;
  iconBg: string;
  iconColor: string;
}

export interface FacilityPerformance {
  id: string;
  facility: string;
  code: string;
  bookings: number;
  revenue: string;
  branch: string;
  status: 'Operational' | 'Peak Load' | 'Maintenance' | 'Optimal';
  utilization: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  company: string;
  avatarText: string;
  avatarBg: string;
  revenue: string;
  revenueRaw: number;
  frequency: number; // e.g. 142 bookings
  growth: string;
  status: 'Active' | 'VIP' | 'Enterprise';
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ClientSuggestion {
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
}

export interface Booking {
  id: string;
  date: string;
  clientName: string;
  clientId: string;
  phone: string;
  email?: string;
  branch: string;
  facility: string;
  daysCount: number;
  timeDuration: string;
  amount: number;
  paymentMethod: 'Credit Card' | 'Wire Transfer' | 'Cash' | 'Corporate Billing';
  daysUsed: number;
  daysLeft: number;
  status: 'Active' | 'Expired' | 'Upcoming';
  createdAt?: string;
}

export interface DailyLoggerSummary {
  monthlyRevenue: number;
  totalBookings: number;
  activeBookings: number;
  expiredBookings: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

export interface SystemSettings {
  businessName?: string;
  directorName?: string;
  businessLogo?: string;
  favicon?: string;
  currency?: string;
  timeZone?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  language?: string;
  taxRate?: number;
  invoicePrefix?: string;
  bookingPrefix?: string;
  clientPrefix?: string;
  expensePrefix?: string;
  categoryPrefix?: string;
  branchCode?: string;
}

export interface ProfileSettings {
  userId?: string;
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  profilePhoto?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
  createdDate?: string;
}

export interface FacilityRecordSummary {
  facility: string;
  bookings: number;
  revenue: number;
  averageRevenue: number;
  percentageOfTotal: number;
  branch: string;
  occupancy: number | string;
  status?: 'Operational' | 'Peak Load' | 'Optimal' | 'Maintenance';
}

export interface ActiveSubscription {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  phone: string;
  email?: string;
  facility: string;
  branch: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  daysUsed: number;
  daysRemaining: number;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  amount: number;
  paymentMethod: string;
}

export interface CustomerSummary {
  totalCustomers: number;
  totalRevenue: number;
  activeSubscriptionsCount: number;
  expiringSoonCount: number;
  expiredSubscriptionsCount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  branchHistory: string[];
  totalVisits: number;
  lifetimeRevenue: number;
  latestVisit: string;
  status: 'Active' | 'VIP' | 'Inactive' | 'Expiring Soon' | 'Expired';
  visitedFacilities: string[];
  bookings: Booking[];
  activeSubscription?: ActiveSubscription;
}

export interface CustomerFilters {
  search?: string;
  branch?: string;
  dateRange?: string;
  sort?: 'revenue_desc' | 'revenue_asc' | 'visits_desc' | 'latest_visit' | 'name';
  status?: string;
}

export interface SubscriptionFilters {
  branch?: string;
  facility?: string;
  daysRemaining?: string;
  date?: string;
  search?: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  branch: string; // 'Art & Tech Hub' | 'Hive Hub' | 'Both Branches' | etc.
  category: string;
  description?: string;
  status: 'Paid' | 'Approved' | 'Pending';
  createdBy: string;
  createdAt: string;
}

export interface ExpenseFilters {
  search?: string;
  dateFilter?: 'today' | 'last_7_days' | 'this_month' | 'last_12_months' | 'custom' | string;
  startDate?: string;
  endDate?: string;
  branch?: string;
  month?: string;
  category?: string;
}

export interface ExpenseSummaryMetrics {
  todaysExpenses: number;
  averageMonthlyExpenses: number;
  totalExpenses: number;
  payrollExpenses: number;
}

export interface FinanceReportFilters {
  period?: 'today' | 'last_7_days' | 'this_month' | 'custom' | 'full_year';
  startDate?: string;
  endDate?: string;
  branch?: string;
}

export interface FinanceAnalyticsSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netProfitMargin: number;
  totalBookings: number;
  uniqueClients: number;
  averageBookingValue: number;
  occupancyRate?: number;
  revenueVsExpensesChart: Array<{
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
    branchRevenues?: Record<string, number>;
  }>;
  monthlyRevenueChart: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  facilityRevenueBreakdown: Array<{
    facility: string;
    revenue: number;
    percentage: number;
  }>;
  expenseCategoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topFacilities: Array<{
    facility: string;
    bookingsCount: number;
    revenue: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    count: number;
    totalAmount: number;
  }>;
  expenseItems: Array<{
    id: string;
    name: string;
    category: string;
    amount: number;
    date: string;
    branch: string;
  }>;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
}

export interface Facility {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  defaultPrice?: number;
  capacity: number;
  status: 'Active' | 'Inactive';
  createdDate: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant';
  branch: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface RolePermission {
  role: 'Director' | 'Manager' | 'Receptionist' | 'Accountant';
  permissions: {
    dashboard: boolean;
    dailyLogger: boolean;
    facilityRecords: boolean;
    crm: boolean;
    expenses: boolean;
    reports: boolean;
    administration: boolean;
    settings: boolean;
  };
}

export interface ImportSpreadsheetRow {
  sn?: string;
  date?: string;
  noOfDays?: number | string;
  timeDuration?: string;
  clientName?: string;
  facility?: string;
  amount?: number | string;
  modeOfPayment?: string;
  daysUsed?: number | string;
  daysLeft?: number | string;
  branch?: string;
  [key: string]: any;
}

export interface ColumnMappingItem {
  excelColumn: string;
  detectedField: string;
  confidence: number;
  sampleValues: string[];
}

export interface ValidationErrorItem {
  row: number;
  field: string;
  issue: string;
  severity: 'warning' | 'error';
  value: any;
}

export interface ImportResultSummary {
  totalRows: number;
  importedBookings: number;
  createdClients: number;
  updatedFacilityRecords: number;
  revenueAdded: number;
  timestamp: string;
}
