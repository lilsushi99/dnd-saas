import { useState, useEffect, useCallback } from 'react';
import { Customer, ActiveSubscription, CustomerFilters, SubscriptionFilters } from '../types';
import { CustomerApiService } from '../services/customerService';

export function useCustomers(initialBranch: string = 'all') {
  // CRM State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    activeSubscriptionsCount: 0,
    expiringSoonCount: 0,
    expiredSubscriptionsCount: 0,
  });

  // Active Subscriptions State
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);

  // Selected Customer for Profile Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Common Loading / Error State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for CRM Page
  const [crmSearch, setCrmSearch] = useState('');
  const [crmBranch, setCrmBranch] = useState(initialBranch);
  const [crmDateRange, setCrmDateRange] = useState('all');
  const [crmSort, setCrmSort] = useState<'revenue_desc' | 'revenue_asc' | 'visits_desc' | 'latest_visit' | 'name'>('revenue_desc');
  const [crmStatus, setCrmStatus] = useState('all');

  // Sync branch if global filter changes
  useEffect(() => {
    setCrmBranch(initialBranch);
    setSubBranch(initialBranch);
  }, [initialBranch]);

  // Filters for Active Subscriptions Page
  const [subBranch, setSubBranch] = useState(initialBranch);
  const [subFacility, setSubFacility] = useState('all');
  const [subDaysRemaining, setSubDaysRemaining] = useState('all');
  const [subDate, setSubDate] = useState('');
  const [subSearch, setSubSearch] = useState('');

  // Load CRM Customers Data
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: CustomerFilters = {
        search: crmSearch,
        branch: crmBranch,
        dateRange: crmDateRange,
        sort: crmSort,
        status: crmStatus,
      };
      const res = await CustomerApiService.fetchCustomers(filters);
      setCustomers(res.customers);
      setSummary({
        totalCustomers: res.summary.totalCustomers || 0,
        totalRevenue: res.summary.totalRevenue || 0,
        activeSubscriptionsCount: res.summary.activeSubscriptionsCount || 0,
        expiringSoonCount: res.summary.expiringSoonCount || 0,
        expiredSubscriptionsCount: (res.summary as any).expiredSubscriptionsCount || 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  }, [crmSearch, crmBranch, crmDateRange, crmSort, crmStatus]);

  // Load Active Subscriptions Data
  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: SubscriptionFilters = {
        branch: subBranch,
        facility: subFacility,
        daysRemaining: subDaysRemaining,
        date: subDate,
        search: subSearch,
      };
      const subs = await CustomerApiService.fetchActiveSubscriptions(filters);
      setActiveSubscriptions(subs);
    } catch (err: any) {
      setError(err.message || 'Failed to load active subscriptions');
    } finally {
      setLoading(false);
    }
  }, [subBranch, subFacility, subDaysRemaining, subDate, subSearch]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Open Drawer by Customer ID or object
  const openCustomerProfile = async (customerOrId: Customer | string) => {
    if (typeof customerOrId === 'string') {
      try {
        const fullCustomer = await CustomerApiService.fetchCustomerById(customerOrId);
        setSelectedCustomer(fullCustomer);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedCustomer(customerOrId);
    }
    setIsDrawerOpen(true);
  };

  const closeCustomerProfile = () => {
    setIsDrawerOpen(false);
    setSelectedCustomer(null);
  };

  // Export functions
  const exportCustomersData = (type: 'csv' | 'excel') => {
    const headers = [
      'Customer ID',
      'Full Name',
      'Phone Number',
      'Email',
      'Company',
      'Branches Visited',
      'Total Visits',
      'Lifetime Revenue ($)',
      'Latest Visit',
      'Status',
    ];
    const rows = customers.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.company || ''}"`,
      `"${c.branchHistory.join(', ')}"`,
      c.totalVisits,
      c.lifetimeRevenue,
      c.latestVisit,
      c.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `CRM_Customer_Directory_${new Date().toISOString().slice(0, 10)}.${
        type === 'excel' ? 'xls' : 'csv'
      }`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSubscriptionsData = (type: 'csv' | 'excel') => {
    const headers = [
      'Customer Name',
      'Customer ID',
      'Facility',
      'Branch Location',
      'Start Date',
      'End Date',
      'Days Remaining',
      'Status',
      'Amount ($)',
    ];
    const rows = activeSubscriptions.map((s) => [
      `"${s.customerName}"`,
      s.customerId,
      `"${s.facility}"`,
      `"${s.branch}"`,
      s.startDate,
      s.endDate,
      s.daysRemaining,
      s.status,
      s.amount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Active_Subscriptions_Report_${new Date().toISOString().slice(0, 10)}.${
        type === 'excel' ? 'xls' : 'csv'
      }`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    customers,
    summary,
    activeSubscriptions,
    selectedCustomer,
    isDrawerOpen,
    loading,
    error,
    // CRM filters
    crmSearch,
    setCrmSearch,
    crmBranch,
    setCrmBranch,
    crmDateRange,
    setCrmDateRange,
    crmSort,
    setCrmSort,
    crmStatus,
    setCrmStatus,
    // Subscription filters
    subBranch,
    setSubBranch,
    subFacility,
    setSubFacility,
    subDaysRemaining,
    setSubDaysRemaining,
    subDate,
    setSubDate,
    subSearch,
    setSubSearch,
    // Actions
    openCustomerProfile,
    closeCustomerProfile,
    exportCustomersData,
    exportSubscriptionsData,
    refetchCustomers: loadCustomers,
    refetchSubscriptions: loadSubscriptions,
  };
}
