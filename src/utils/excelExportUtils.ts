import ExcelJS from 'exceljs';
import { Booking, FacilityRecordSummary, FinanceAnalyticsSummary } from '../types';

export interface ExportMetadataOptions {
  branchLabel?: string;
  dateLabel?: string;
  currencySymbol?: string;
  businessName?: string;
}

const triggerDownload = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const headerStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' },
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E293B' } }, // slate-800
  alignment: { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true },
  border: {
    top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
  },
};

const totalsStyle = {
  font: { bold: true, color: { argb: 'FF0F172A' }, size: 10, name: 'Calibri' },
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } },
  border: {
    top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double' as const, color: { argb: 'FF0F172A' } },
  },
};

// ============================================================================
// 1. Facility Records Export (Section B)
// ============================================================================
export const exportFacilityRecordsToExcel = async (
  records: FacilityRecordSummary[],
  options: ExportMetadataOptions = {}
) => {
  const currency = options.currencySymbol || '₦';
  const branchLabel = options.branchLabel || 'All Branches';
  const dateLabel = options.dateLabel || 'All Time';
  const businessName = options.businessName || 'Nexus Enterprise ERP';
  const exportDate = new Date().toISOString().slice(0, 10);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Facility Records', {
    views: [{ showGridLines: true }],
  });

  // Metadata block
  worksheet.addRow([`${businessName.toUpperCase()} — FACILITY PERFORMANCE RECORDS`]);
  worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  worksheet.addRow([
    `Branch Scope: ${branchLabel}  |  Reporting Period: ${dateLabel}  |  Currency: ${currency}  |  Generated: ${exportDate}`,
  ]);
  worksheet.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  worksheet.addRow([]); // Blank spacer

  // Table Columns
  // 1. Facility Name, 2. Total Bookings, 3. Total Revenue, 4. Branch Location, 5. Average Spend, 6. Occupancy Percentage
  const headerRow = worksheet.addRow([
    'Facility Name',
    'Total Bookings',
    `Total Revenue (${currency})`,
    'Branch Location',
    `Average Spend (${currency})`,
    'Occupancy Percentage',
  ]);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    Object.assign(cell, headerStyle);
  });

  worksheet.columns = [
    { width: 30 }, // Facility Name
    { width: 16 }, // Total Bookings
    { width: 22 }, // Total Revenue
    { width: 26 }, // Branch Location
    { width: 20 }, // Average Spend
    { width: 22 }, // Occupancy Percentage
  ];

  let totalBookingsSum = 0;
  let totalRevenueSum = 0;
  const numericOccupancies: number[] = [];

  records.forEach((r) => {
    totalBookingsSum += r.bookings;
    totalRevenueSum += r.revenue;
    const occNum = typeof r.occupancy === 'number' ? r.occupancy : parseFloat(String(r.occupancy || '0'));
    if (!isNaN(occNum)) numericOccupancies.push(occNum);

    const row = worksheet.addRow([
      r.facility,
      r.bookings,
      r.revenue,
      r.branch,
      r.averageRevenue,
      occNum / 100, // Excel percentage format
    ]);

    row.height = 20;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = `${currency}#,##0.00`;
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = `${currency}#,##0.00`;
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(6).numFmt = '0.0%';
  });

  // Totals Row
  const overallAvgSpend = totalBookingsSum > 0 ? Math.round(totalRevenueSum / totalBookingsSum) : 0;
  const avgOccupancy =
    numericOccupancies.length > 0
      ? numericOccupancies.reduce((a, b) => a + b, 0) / numericOccupancies.length
      : 0;

  const totalRow = worksheet.addRow([
    'Total / Overall Average',
    totalBookingsSum,
    totalRevenueSum,
    `${records.length} Facilities`,
    overallAvgSpend,
    avgOccupancy / 100,
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    Object.assign(cell, totalsStyle);
    if (colNumber === 2) cell.numFmt = '#,##0';
    if (colNumber === 3) cell.numFmt = `${currency}#,##0.00`;
    if (colNumber === 5) cell.numFmt = `${currency}#,##0.00`;
    if (colNumber === 6) cell.numFmt = '0.0%';
  });

  await triggerDownload(workbook, `Facility_Records_Export_${exportDate}.xlsx`);
};

// ============================================================================
// 2. Daily Logger Excel Export (Section C)
// ============================================================================
export const exportDailyLoggerToExcel = async (
  bookings: Booking[],
  options: ExportMetadataOptions = {}
) => {
  const currency = options.currencySymbol || '₦';
  const branchLabel = options.branchLabel || 'All Branches';
  const dateLabel = options.dateLabel || 'All Time';
  const businessName = options.businessName || 'Nexus Enterprise ERP';
  const exportDate = new Date().toISOString().slice(0, 10);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Daily Logger Bookings', {
    views: [{ showGridLines: true }],
  });

  // Metadata block
  worksheet.addRow([`${businessName.toUpperCase()} — DAILY LOGGER BOOKINGS RECORD`]);
  worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  worksheet.addRow([
    `Branch: ${branchLabel}  |  Period: ${dateLabel}  |  Currency: ${currency}  |  Generated: ${exportDate}`,
  ]);
  worksheet.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  worksheet.addRow([]); // Blank spacer

  const headers = [
    'Booking ID',
    'Date',
    'Client Name',
    'Client ID',
    'Branch',
    'Facility',
    `Amount (${currency})`,
    'Payment Method',
    'Duration Used',
    'Duration Left',
    'Status',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    Object.assign(cell, headerStyle);
  });

  worksheet.columns = [
    { width: 16 }, // Booking ID
    { width: 14 }, // Date
    { width: 26 }, // Client Name
    { width: 16 }, // Client ID
    { width: 24 }, // Branch
    { width: 24 }, // Facility
    { width: 18 }, // Amount
    { width: 18 }, // Payment Method
    { width: 14 }, // Duration Used
    { width: 14 }, // Duration Left
    { width: 16 }, // Status
  ];

  let totalRevenue = 0;

  bookings.forEach((b) => {
    const amt = Number(b.amount || 0);
    totalRevenue += amt;

    const row = worksheet.addRow([
      b.id,
      b.date,
      b.clientName,
      b.clientId,
      b.branch,
      b.facility,
      amt,
      b.paymentMethod || 'Cash',
      b.daysUsed ?? 0,
      b.daysLeft ?? 0,
      b.status || 'Active',
    ]);

    row.height = 20;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(7).numFmt = `${currency}#,##0.00`;
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(10).numFmt = '#,##0';
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Totals Row
  const totalRow = worksheet.addRow([
    'Total Summary',
    `${bookings.length} Bookings`,
    '',
    '',
    '',
    '',
    totalRevenue,
    '',
    '',
    '',
    '',
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    Object.assign(cell, totalsStyle);
    if (colNumber === 7) cell.numFmt = `${currency}#,##0.00`;
  });

  await triggerDownload(workbook, `Daily_Logger_Bookings_${exportDate}.xlsx`);
};

// ============================================================================
// 3. Dashboard Spreadsheet Export (Section D - Multi-Sheet Report)
// ============================================================================
export interface DashboardExportDataPayload {
  metadata: {
    branchScope: string;
    reportingPeriod: string;
    currency: string;
    generatedAt: string;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalBookings: number;
    uniqueClients?: number;
    averageBookingValue?: number;
    overallOccupancy: number;
  };
  facilityRevenueBreakdown?: Array<{
    facility: string;
    branch: string;
    bookingsCount: number;
    revenue: number;
    percentage: number;
  }>;
  expenseCategoryBreakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  topCustomers?: Array<{
    id: string;
    name: string;
    company: string;
    status: string;
    bookingsCount: number;
    totalSpend: number;
  }>;
  facilityUtilization?: Array<{
    facility: string;
    branch: string;
    capacity: number;
    occupied: number;
    rate: number;
  }>;
  dailySummary: Array<{
    date: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    totalBookings: number;
    occupancyPercentage: number;
    topCustomers: string;
  }>;
  expenses: Array<{
    date: string;
    branch: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod: string;
  }>;
}

export const exportDashboardToExcel = async (
  data: DashboardExportDataPayload,
  businessName = 'Nexus Enterprise ERP'
) => {
  const currency = data.metadata.currency || '₦';
  const exportDate = new Date().toISOString().slice(0, 10);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // SHEET 1: Executive KPI Summary
  // --------------------------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Executive KPI Summary', {
    views: [{ showGridLines: true }],
  });

  sheet1.addRow([`${businessName.toUpperCase()} — EXECUTIVE PERFORMANCE AUDIT`]);
  sheet1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  sheet1.addRow([
    `Branch Scope: ${data.metadata.branchScope}  |  Period: ${data.metadata.reportingPeriod}  |  Currency: ${currency}  |  Generated: ${data.metadata.generatedAt}`,
  ]);
  sheet1.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  sheet1.addRow([]);

  const head1 = sheet1.addRow(['Executive Metric', `Value (${currency})`, 'Benchmark / Description']);
  head1.height = 26;
  head1.eachCell((c) => Object.assign(c, headerStyle));
  sheet1.columns = [{ width: 34 }, { width: 22 }, { width: 32 }];

  const kpis = [
    ['Total Gross Revenue', data.metadata.totalRevenue, 'Total booked revenue in period'],
    ['Operating Expenses', data.metadata.totalExpenses, 'Total operating expenditures in period'],
    ['Net Operating Profit', data.metadata.netProfit, 'Revenue - Expenses'],
    ['Net Profit Margin', data.metadata.profitMargin / 100, 'Operating margin percentage'],
    ['Total Bookings Count', data.metadata.totalBookings, 'Total bookings processed'],
    ['Unique Enterprise Clients', data.metadata.uniqueClients ?? 0, 'Distinct customer accounts'],
    ['Average Booking Value', data.metadata.averageBookingValue ?? 0, 'Average revenue per booking'],
    ['Average Space Occupancy', data.metadata.overallOccupancy / 100, 'Capacity utilization rate'],
  ];

  kpis.forEach(([label, val, desc], idx) => {
    const row = sheet1.addRow([label, val, desc]);
    row.height = 20;
    row.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    if (idx === 3 || idx === 7) {
      row.getCell(2).numFmt = '0.0%';
    } else if (idx === 4 || idx === 5) {
      row.getCell(2).numFmt = '#,##0';
    } else {
      row.getCell(2).numFmt = `${currency}#,##0.00`;
    }
  });

  // --------------------------------------------------------------------------
  // SHEET 2: Facility Revenue Breakdown
  // --------------------------------------------------------------------------
  const sheet2 = workbook.addWorksheet('Facility Revenue Breakdown', {
    views: [{ showGridLines: true }],
  });

  sheet2.addRow([`${businessName.toUpperCase()} — FACILITY REVENUE BREAKDOWN`]);
  sheet2.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
  sheet2.addRow([`Scope: ${data.metadata.branchScope}  |  Period: ${data.metadata.reportingPeriod}`]);
  sheet2.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  sheet2.addRow([]);

  const head2 = sheet2.addRow(['Facility Space', 'Branch Location', 'Total Bookings', `Revenue (${currency})`, 'Revenue Share %']);
  head2.height = 26;
  head2.eachCell((c) => Object.assign(c, headerStyle));
  sheet2.columns = [{ width: 30 }, { width: 24 }, { width: 16 }, { width: 20 }, { width: 18 }];

  let sumFacBookings = 0;
  let sumFacRevenue = 0;

  (data.facilityRevenueBreakdown || []).forEach((f) => {
    sumFacBookings += f.bookingsCount;
    sumFacRevenue += f.revenue;

    const row = sheet2.addRow([
      f.facility,
      f.branch,
      f.bookingsCount,
      f.revenue,
      f.percentage / 100,
    ]);
    row.height = 20;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = `${currency}#,##0.00`;
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = '0.0%';
  });

  const totRow2 = sheet2.addRow([
    'Total Summary',
    `${(data.facilityRevenueBreakdown || []).length} Facilities`,
    sumFacBookings,
    sumFacRevenue,
    1,
  ]);
  totRow2.height = 24;
  totRow2.eachCell((c, col) => {
    Object.assign(c, totalsStyle);
    if (col === 3) c.numFmt = '#,##0';
    if (col === 4) c.numFmt = `${currency}#,##0.00`;
    if (col === 5) c.numFmt = '100.0%';
  });

  // --------------------------------------------------------------------------
  // SHEET 3: Operating Expenses Breakdown
  // --------------------------------------------------------------------------
  const sheet3 = workbook.addWorksheet('Operating Expenses Breakdown', {
    views: [{ showGridLines: true }],
  });

  sheet3.addRow([`${businessName.toUpperCase()} — OPERATING EXPENSES BREAKDOWN`]);
  sheet3.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
  sheet3.addRow([`Scope: ${data.metadata.branchScope}  |  Period: ${data.metadata.reportingPeriod}  |  Total: ${currency}${data.metadata.totalExpenses.toLocaleString()}`]);
  sheet3.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  sheet3.addRow([]);

  // Category summary
  const subHead3A = sheet3.addRow(['Expense Category Summary', '', '', '']);
  subHead3A.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
  const head3A = sheet3.addRow(['Category', `Amount (${currency})`, 'Share of Operating Expenses %', 'Transaction Count']);
  head3A.height = 24;
  head3A.eachCell((c) => Object.assign(c, headerStyle));
  sheet3.columns = [{ width: 28 }, { width: 22 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 32 }];

  let sumExpCat = 0;
  (data.expenseCategoryBreakdown || []).forEach((c) => {
    sumExpCat += c.amount;
    const row = sheet3.addRow([c.category, c.amount, c.percentage / 100, c.count]);
    row.height = 20;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(2).numFmt = `${currency}#,##0.00`;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = '0.0%';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = '#,##0';
  });

  const totCatRow = sheet3.addRow(['Total Operating Expenses', sumExpCat, 1, (data.expenses || []).length]);
  totCatRow.height = 24;
  totCatRow.eachCell((c, col) => {
    Object.assign(c, totalsStyle);
    if (col === 2) c.numFmt = `${currency}#,##0.00`;
    if (col === 3) c.numFmt = '100.0%';
    if (col === 4) c.numFmt = '#,##0';
  });

  sheet3.addRow([]);
  sheet3.addRow([]);

  // Detailed Expense Transactions
  const subHead3B = sheet3.addRow(['Itemized Expense Transactions', '', '', '', '', '']);
  subHead3B.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
  const head3B = sheet3.addRow(['Date / Time', 'Branch', 'Category', 'Description', `Amount (${currency})`, 'Payment Method']);
  head3B.height = 24;
  head3B.eachCell((c) => Object.assign(c, headerStyle));

  (data.expenses || []).forEach((e) => {
    const row = sheet3.addRow([
      e.date,
      e.branch || 'Global',
      e.category || 'General',
      e.description || '-',
      e.amount,
      e.paymentMethod || 'Transfer',
    ]);
    row.height = 20;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = `${currency}#,##0.00`;
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // --------------------------------------------------------------------------
  // SHEET 4: Top Enterprise Customers
  // --------------------------------------------------------------------------
  const sheet4 = workbook.addWorksheet('Top Enterprise Customers', {
    views: [{ showGridLines: true }],
  });

  sheet4.addRow([`${businessName.toUpperCase()} — TOP ENTERPRISE CUSTOMERS`]);
  sheet4.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
  sheet4.addRow([`Scope: ${data.metadata.branchScope}  |  Period: ${data.metadata.reportingPeriod}`]);
  sheet4.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  sheet4.addRow([]);

  const head4 = sheet4.addRow(['Customer ID', 'Customer Name', 'Company / Account', 'Total Bookings', `Total Spend (${currency})`, 'Account Status']);
  head4.height = 26;
  head4.eachCell((c) => Object.assign(c, headerStyle));
  sheet4.columns = [{ width: 16 }, { width: 28 }, { width: 28 }, { width: 16 }, { width: 22 }, { width: 16 }];

  let sumCustSpend = 0;
  let sumCustBookings = 0;

  (data.topCustomers || []).forEach((c) => {
    sumCustSpend += c.totalSpend;
    sumCustBookings += c.bookingsCount;

    const row = sheet4.addRow([
      c.id,
      c.name,
      c.company || 'Enterprise Account',
      c.bookingsCount,
      c.totalSpend,
      c.status || 'Active',
    ]);
    row.height = 20;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = `${currency}#,##0.00`;
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const totRow4 = sheet4.addRow([
    'Total Summary',
    `${(data.topCustomers || []).length} Customers`,
    '',
    sumCustBookings,
    sumCustSpend,
    '',
  ]);
  totRow4.height = 24;
  totRow4.eachCell((c, col) => {
    Object.assign(c, totalsStyle);
    if (col === 4) c.numFmt = '#,##0';
    if (col === 5) c.numFmt = `${currency}#,##0.00`;
  });

  // --------------------------------------------------------------------------
  // SHEET 5: Facility Utilization & Capacity
  // --------------------------------------------------------------------------
  const sheet5 = workbook.addWorksheet('Facility Utilization & Capacity', {
    views: [{ showGridLines: true }],
  });

  sheet5.addRow([`${businessName.toUpperCase()} — FACILITY UTILIZATION & CAPACITY`]);
  sheet5.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
  sheet5.addRow([`Scope: ${data.metadata.branchScope}  |  Period: ${data.metadata.reportingPeriod}`]);
  sheet5.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  sheet5.addRow([]);

  const head5 = sheet5.addRow(['Facility Space', 'Branch Location', 'Total Capacity', 'Bookings in Period', 'Space Utilization Rate %']);
  head5.height = 26;
  head5.eachCell((c) => Object.assign(c, headerStyle));
  sheet5.columns = [{ width: 30 }, { width: 24 }, { width: 16 }, { width: 20 }, { width: 26 }];

  let sumCapacity = 0;
  let sumOccupied = 0;

  (data.facilityUtilization || []).forEach((u) => {
    sumCapacity += u.capacity;
    sumOccupied += u.occupied;

    const row = sheet5.addRow([
      u.facility,
      u.branch,
      u.capacity,
      u.occupied,
      u.rate / 100,
    ]);
    row.height = 20;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = '0.0%';
  });

  const avgUtil = sumCapacity > 0 ? (sumOccupied / sumCapacity) : 0;
  const totRow5 = sheet5.addRow([
    'Total / Overall Average',
    `${(data.facilityUtilization || []).length} Facilities`,
    sumCapacity,
    sumOccupied,
    avgUtil,
  ]);
  totRow5.height = 24;
  totRow5.eachCell((c, col) => {
    Object.assign(c, totalsStyle);
    if (col === 3 || col === 4) c.numFmt = '#,##0';
    if (col === 5) c.numFmt = '0.0%';
  });

  // --------------------------------------------------------------------------
  // SHEET 6: Daily Operational Summary
  // --------------------------------------------------------------------------
  const sheet6 = workbook.addWorksheet('Daily Operational Summary', {
    views: [{ showGridLines: true }],
  });

  sheet6.addRow([`${businessName.toUpperCase()} — DAILY OPERATIONAL SUMMARY`]);
  sheet6.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF1E293B' } };
  sheet6.addRow([`Scope: ${data.metadata.branchScope}  |  Period: ${data.metadata.reportingPeriod}  |  Currency: ${currency}`]);
  sheet6.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  sheet6.addRow([]);

  const head6 = sheet6.addRow([
    'Date',
    `Revenue (${currency})`,
    `Operating Expenses (${currency})`,
    `Net Profit (${currency})`,
    'Total Bookings',
    'Overall Occupancy %',
    'Top Customers',
  ]);
  head6.height = 26;
  head6.eachCell((c) => Object.assign(c, headerStyle));
  sheet6.columns = [
    { width: 16 },
    { width: 20 },
    { width: 22 },
    { width: 20 },
    { width: 16 },
    { width: 22 },
    { width: 36 },
  ];

  let sumDayRev = 0;
  let sumDayExp = 0;
  let sumDayBook = 0;
  const occRates: number[] = [];

  (data.dailySummary || []).forEach((d) => {
    sumDayRev += d.revenue;
    sumDayExp += d.expenses;
    sumDayBook += d.totalBookings;
    occRates.push(d.occupancyPercentage);

    const row = sheet6.addRow([
      d.date,
      d.revenue,
      d.expenses,
      d.netProfit,
      d.totalBookings,
      d.occupancyPercentage / 100,
      d.topCustomers || '-',
    ]);
    row.height = 20;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(2).numFmt = `${currency}#,##0.00`;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = `${currency}#,##0.00`;
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).numFmt = `${currency}#,##0.00`;
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(6).numFmt = '0.0%';
  });

  const avgDayOcc = occRates.length > 0 ? occRates.reduce((a, b) => a + b, 0) / occRates.length : 0;
  const totRow6 = sheet6.addRow([
    'Period Total / Average',
    sumDayRev,
    sumDayExp,
    sumDayRev - sumDayExp,
    sumDayBook,
    avgDayOcc / 100,
    '-',
  ]);
  totRow6.height = 24;
  totRow6.eachCell((c, col) => {
    Object.assign(c, totalsStyle);
    if ([2, 3, 4].includes(col)) c.numFmt = `${currency}#,##0.00`;
    if (col === 5) c.numFmt = '#,##0';
    if (col === 6) c.numFmt = '0.0%';
  });

  await triggerDownload(workbook, `Nexus_Dashboard_Report_${exportDate}.xlsx`);
};

// ============================================================================
// 4. Reports & Analytics Excel Export (Section I)
// ============================================================================
export const exportFinanceReportToExcel = async (
  analytics: FinanceAnalyticsSummary,
  options: ExportMetadataOptions = {}
) => {
  const currency = options.currencySymbol || '₦';
  const branchLabel = options.branchLabel || 'All Branches';
  const dateLabel = options.dateLabel || 'All Time';
  const businessName = options.businessName || 'Nexus Enterprise ERP';
  const exportDate = new Date().toISOString().slice(0, 10);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName;
  workbook.created = new Date();

  // Sheet 1: Financial & KPI Summary
  const s1 = workbook.addWorksheet('Executive Summary', { views: [{ showGridLines: true }] });
  s1.addRow([`${businessName.toUpperCase()} — FINANCIAL & OPERATIONAL AUDIT`]);
  s1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  s1.addRow([`Scope: ${branchLabel}  |  Period: ${dateLabel}  |  Exported: ${exportDate}`]);
  s1.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  s1.addRow([]);

  const kpiHeaders = ['KPI Metric', `Value (${currency})`, 'Reference / Unit'];
  const rKpi = s1.addRow(kpiHeaders);
  rKpi.height = 24;
  rKpi.eachCell((c) => Object.assign(c, headerStyle));
  s1.columns = [{ width: 32 }, { width: 22 }, { width: 26 }];

  const kpiData = [
    ['Total Gross Revenue', analytics.totalRevenue, 'Total booked revenue'],
    ['Operating Expenses', analytics.totalExpenses, 'Operational expenditures'],
    ['Net Operating Profit', analytics.netProfit, 'Revenue - Expenses'],
    ['Net Profit Margin', analytics.netProfitMargin / 100, 'Percentage return'],
    ['Total Qualifying Bookings', analytics.totalBookings, 'Individual bookings'],
    ['Unique Enterprise Clients', analytics.uniqueClients, 'Distinct customers'],
    ['Average Booking Value', analytics.averageBookingValue, 'Revenue / Bookings'],
    ['Overall Space Utilization', analytics.occupancyRate / 100, 'Capacity utilization'],
  ];

  kpiData.forEach((item, idx) => {
    const row = s1.addRow(item);
    row.height = 20;
    row.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' } };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    if (idx === 3 || idx === 7) {
      row.getCell(2).numFmt = '0.0%';
    } else if (idx === 4 || idx === 5) {
      row.getCell(2).numFmt = '#,##0';
    } else {
      row.getCell(2).numFmt = `${currency}#,##0.00`;
    }
  });

  // Sheet 2: Facility Revenue Breakdown
  const s2 = workbook.addWorksheet('Facility Performance', { views: [{ showGridLines: true }] });
  s2.addRow(['FACILITY PERFORMANCE & REVENUE BREAKDOWN']);
  s2.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
  s2.addRow([`Scope: ${branchLabel}  |  Period: ${dateLabel}`]);
  s2.addRow([]);

  const rFacHead = s2.addRow(['Facility Space', `Revenue (${currency})`, 'Revenue Share %', 'Bookings Count']);
  rFacHead.height = 24;
  rFacHead.eachCell((c) => Object.assign(c, headerStyle));
  s2.columns = [{ width: 32 }, { width: 20 }, { width: 18 }, { width: 18 }];

  (analytics.facilityRevenueBreakdown || []).forEach((f) => {
    const row = s2.addRow([f.facility, f.revenue, f.percentage / 100, '-']);
    row.height = 20;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(2).numFmt = `${currency}#,##0.00`;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = '0.0%';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Sheet 3: Expense Category Breakdown
  const s3 = workbook.addWorksheet('Expense Categories', { views: [{ showGridLines: true }] });
  s3.addRow(['EXPENSE CATEGORY BREAKDOWN']);
  s3.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
  s3.addRow([`Scope: ${branchLabel}  |  Period: ${dateLabel}`]);
  s3.addRow([]);

  const rCatHead = s3.addRow(['Expense Category', `Amount (${currency})`, 'Share of Budget %']);
  rCatHead.height = 24;
  rCatHead.eachCell((c) => Object.assign(c, headerStyle));
  s3.columns = [{ width: 32 }, { width: 22 }, { width: 22 }];

  (analytics.expenseCategoryBreakdown || []).forEach((c) => {
    const row = s3.addRow([c.category, c.amount, c.percentage / 100]);
    row.height = 20;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(2).numFmt = `${currency}#,##0.00`;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(3).numFmt = '0.0%';
  });

  // Sheet 4: Detailed Expense Transactions
  const s4 = workbook.addWorksheet('Detailed Expenses', { views: [{ showGridLines: true }] });
  s4.addRow(['DETAILED OPERATING EXPENSE TRANSACTIONS']);
  s4.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
  s4.addRow([`Scope: ${branchLabel}  |  Period: ${dateLabel}`]);
  s4.addRow([]);

  const rExpHead = s4.addRow(['Expense Item', 'Category', 'Branch', 'Date', `Amount (${currency})`]);
  rExpHead.height = 24;
  rExpHead.eachCell((c) => Object.assign(c, headerStyle));
  s4.columns = [{ width: 32 }, { width: 24 }, { width: 24 }, { width: 16 }, { width: 20 }];

  (analytics.expenseItems || []).forEach((e) => {
    const row = s4.addRow([e.name, e.category, e.branch, e.date, e.amount]);
    row.height = 20;
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = `${currency}#,##0.00`;
  });

  await triggerDownload(workbook, `Financial_Analytics_Report_${exportDate}.xlsx`);
};

// ============================================================================
// 5. Reports & Analytics Clean CSV Export (Section I)
// ============================================================================
export const exportFinanceReportToCSV = (
  analytics: FinanceAnalyticsSummary,
  options: ExportMetadataOptions = {}
) => {
  const currency = options.currencySymbol || '₦';
  const branchLabel = options.branchLabel || 'All Branches';
  const dateLabel = options.dateLabel || 'All Time';
  const exportDate = new Date().toISOString().slice(0, 10);

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows: string[][] = [
    ['NEXUS ERP — FINANCIAL REPORTS & ANALYTICS AUDIT'],
    ['Branch Scope', branchLabel],
    ['Reporting Period', dateLabel],
    ['Currency', currency],
    ['Generated Date', exportDate],
    [],
    ['1. EXECUTIVE KPI SUMMARY'],
    ['Metric', 'Value', 'Reference'],
    ['Total Gross Revenue', `${analytics.totalRevenue}`, `Amount in ${currency}`],
    ['Total Operating Expenses', `${analytics.totalExpenses}`, `Amount in ${currency}`],
    ['Net Profit', `${analytics.netProfit}`, `Amount in ${currency}`],
    ['Net Profit Margin', `${analytics.netProfitMargin.toFixed(1)}%`, 'Profit / Revenue'],
    ['Total Bookings Count', `${analytics.totalBookings}`, 'Qualifying Bookings'],
    ['Unique Enterprise Clients', `${analytics.uniqueClients}`, 'Client Count'],
    ['Average Booking Value', `${analytics.averageBookingValue}`, `Amount in ${currency}`],
    ['Occupancy Utilization Rate', `${analytics.occupancyRate.toFixed(1)}%`, 'Space Utilization'],
    [],
    ['2. FACILITY REVENUE BREAKDOWN'],
    ['Facility Name', `Revenue (${currency})`, 'Revenue Share (%)'],
  ];

  (analytics.facilityRevenueBreakdown || []).forEach((f) => {
    rows.push([f.facility, `${f.revenue}`, `${f.percentage}%`]);
  });

  rows.push([]);
  rows.push(['3. OPERATING EXPENSE CATEGORIES']);
  rows.push(['Category Name', `Amount (${currency})`, 'Share of Budget (%)']);

  (analytics.expenseCategoryBreakdown || []).forEach((c) => {
    rows.push([c.category, `${c.amount}`, `${c.percentage}%`]);
  });

  rows.push([]);
  rows.push(['4. OPERATING EXPENSE ITEMS']);
  rows.push(['Expense Item Name', 'Category', 'Branch', 'Date', `Amount (${currency})`]);

  (analytics.expenseItems || []).forEach((e) => {
    rows.push([e.name, e.category, e.branch, e.date, `${e.amount}`]);
  });

  const csvContent = rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Financial_Report_${exportDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
