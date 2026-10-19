import { useState, useEffect, useCallback } from 'react';
import { Booking, DailyLoggerSummary, FacilityRecordSummary, ClientSuggestion } from '../types';
import { OperationsApiService } from '../services/operationsService';

export function useOperations(branchFilter: string = 'all') {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<DailyLoggerSummary>({
    monthlyRevenue: 0,
    totalBookings: 0,
    activeBookings: 0,
    expiredBookings: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
  });
  const [facilityRecords, setFacilityRecords] = useState<FacilityRecordSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Daily Logger & Facility Records
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [branchSelect, setBranchSelect] = useState<string>(branchFilter);
  const [dateFilter, setDateFilter] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Sync branchSelect if global filter changes
  useEffect(() => {
    setBranchSelect(branchFilter);
  }, [branchFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const resolvedMonth = monthFilter === 'this_month' ? currentMonthKey : (monthFilter === 'all' ? undefined : monthFilter);

      const [bookingsRes, facilitiesRes] = await Promise.all([
        OperationsApiService.fetchBookings({
          branch: branchSelect,
          month: resolvedMonth,
          search: searchTerm,
        }),
        OperationsApiService.fetchFacilityRecords({
          branch: branchSelect,
          dateFilter,
          startDate: dateFilter === 'custom' ? startDate : undefined,
          endDate: dateFilter === 'custom' ? endDate : undefined,
        }),
      ]);

      setBookings(bookingsRes.bookings);
      setSummary(bookingsRes.summary);
      setFacilityRecords(facilitiesRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load operations data');
    } finally {
      setLoading(false);
    }
  }, [branchSelect, monthFilter, searchTerm, dateFilter, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addBooking = async (newBooking: Omit<Booking, 'id' | 'createdAt'>) => {
    try {
      const created = await OperationsApiService.createBooking(newBooking);
      await loadData();
      window.dispatchEvent(new CustomEvent('nexus:refresh-financials'));
      return created;
    } catch (err: any) {
      console.error('Error creating booking:', err.message);
      throw err;
    }
  };

  const editBooking = async (id: string, updatedFields: Partial<Booking>) => {
    try {
      const updated = await OperationsApiService.updateBooking(id, updatedFields);
      await loadData();
      window.dispatchEvent(new CustomEvent('nexus:refresh-financials'));
      return updated;
    } catch (err: any) {
      console.error('Error updating booking:', err.message);
      throw err;
    }
  };

  const exportData = async (type: 'csv' | 'excel', target: 'bookings' | 'facilities') => {
    if (target === 'bookings') {
      if (type === 'excel') {
        const { exportDailyLoggerToExcel } = await import('../utils/excelExportUtils');
        await exportDailyLoggerToExcel(bookings, {
          branchLabel: branchSelect === 'all' ? 'All Branches' : branchSelect,
          dateLabel: monthFilter === 'all' ? 'All Time' : monthFilter,
          currencySymbol: '₦',
        });
        return;
      }

      const headers = [
        'Booking ID',
        'Date',
        'Client Name',
        'Client ID',
        'Branch',
        'Facility',
        'Amount (₦)',
        'Payment Method',
        'Days Used',
        'Days Left',
        'Status',
      ];
      const rows = bookings.map((b) => [
        `"${b.id}"`,
        `"${b.date}"`,
        `"${(b.clientName || '').replace(/"/g, '""')}"`,
        `"${b.clientId}"`,
        `"${(b.branch || '').replace(/"/g, '""')}"`,
        `"${(b.facility || '').replace(/"/g, '""')}"`,
        b.amount,
        `"${b.paymentMethod || 'Cash'}"`,
        b.daysUsed ?? 0,
        b.daysLeft ?? 0,
        `"${b.status || 'Active'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Daily_Logger_Bookings_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      if (type === 'excel') {
        const { exportFacilityRecordsToExcel } = await import('../utils/excelExportUtils');
        let dateLabel = 'This Month';
        if (dateFilter === 'last_7_days' || dateFilter === 'last_7') dateLabel = 'Last 7 Days';
        else if (dateFilter === 'last_30_days' || dateFilter === 'last_30') dateLabel = 'Last 30 Days';
        else if (dateFilter === 'all') dateLabel = 'All Time';
        else if (dateFilter === 'custom') dateLabel = `Custom (${startDate} to ${endDate})`;

        await exportFacilityRecordsToExcel(facilityRecords, {
          branchLabel: branchSelect === 'all' ? 'All Branches' : branchSelect,
          dateLabel,
          currencySymbol: '₦',
        });
        return;
      }

      const headers = [
        'Facility Name',
        'Total Bookings',
        'Total Revenue (₦)',
        'Branch Location',
        'Average Spend (₦)',
        'Occupancy Rate (%)',
        'Status',
      ];
      const rows = facilityRecords.map((f) => [
        `"${(f.facility || '').replace(/"/g, '""')}"`,
        f.bookings,
        f.revenue,
        `"${(f.branch || '').replace(/"/g, '""')}"`,
        f.averageRevenue,
        `${f.occupancy}%`,
        `"${f.status || 'Operational'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Facility_Records_Report_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return {
    bookings,
    summary,
    facilityRecords,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    monthFilter,
    setMonthFilter,
    branchSelect,
    setBranchSelect,
    dateFilter,
    setDateFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    addBooking,
    editBooking,
    exportData,
    refetch: loadData,
  };
}
