import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardFilters } from '../types';

interface ExportDataParams {
  filters: DashboardFilters;
  kpis?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    activeBookings: number;
    occupancyRate: number;
  };
  topCustomers?: Array<{
    name: string;
    company: string;
    ordersCount: number;
    totalSpent: number;
    status: string;
  }>;
  expenses?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  facilities?: Array<{
    name: string;
    branchName: string;
    occupied: number;
    capacity: number;
    rate: number;
  }>;
}

const getFilterLabel = (filters: DashboardFilters) => {
  let branchName = 'All Branches (Global)';
  if (filters.branch === 'art_tech' || filters.branch === 'BR-001' || filters.branch === 'Art & Tech Hub') {
    branchName = 'Art & Tech Hub';
  } else if (filters.branch === 'hive' || filters.branch === 'BR-002' || filters.branch === 'Hive Hub') {
    branchName = 'Hive Hub';
  } else if (filters.branch === 'BR-003' || filters.branch === 'London Main') {
    branchName = 'London Main';
  }

  let dateRangeLabel = 'Last 30 Days';
  if (filters.dateRange === 'last_7' || filters.dateRange === '7D') dateRangeLabel = 'Last 7 Days';
  else if (filters.dateRange === 'this_month') dateRangeLabel = 'This Month';
  else if (filters.dateRange === 'last_12_months' || filters.dateRange === '12M') dateRangeLabel = 'Last 12 Months';
  else if (filters.dateRange === 'custom') {
    dateRangeLabel = `Custom (${filters.startDate || 'N/A'} to ${filters.endDate || 'N/A'})`;
  }

  return { branchName, dateRangeLabel };
};

// 1. Export CSV
export const exportToCSV = ({ filters, kpis, topCustomers, expenses, facilities }: ExportDataParams) => {
  const { branchName, dateRangeLabel } = getFilterLabel(filters);
  const rows: string[][] = [];

  // Header metadata
  rows.push(['NEXUS ENTERPRISE ERP - EXECUTIVE DASHBOARD EXPORT']);
  rows.push([`Generated Date:`, new Date().toLocaleDateString()]);
  rows.push([`Branch Filter:`, branchName]);
  rows.push([`Date Range:`, dateRangeLabel]);
  rows.push([]);

  // Section 1: KPI Summary
  rows.push(['1. EXECUTIVE FINANCIAL SUMMARY']);
  rows.push(['Metric', 'Value']);
  rows.push(['Total Revenue', `₦${(kpis?.totalRevenue || 0).toLocaleString()}`]);
  rows.push(['Total Operating Expenses', `₦${(kpis?.totalExpenses || 0).toLocaleString()}`]);
  rows.push(['Net Profit', `₦${(kpis?.netProfit || 0).toLocaleString()}`]);
  rows.push(['Profit Margin', `${(kpis?.profitMargin || 0).toFixed(1)}%`]);
  rows.push(['Active Bookings', `${kpis?.activeBookings || 0}`]);
  rows.push(['Average Occupancy Rate', `${kpis?.occupancyRate || 0}%`]);
  rows.push([]);

  // Section 2: Expense Breakdown
  rows.push(['2. OPERATIONAL EXPENSE CATEGORIES']);
  rows.push(['Category', 'Amount (₦)', 'Share (%)']);
  const defaultExpenses = expenses || [];
  if (defaultExpenses.length === 0) {
    rows.push(['No expense records', '₦0', '0%']);
  } else {
    defaultExpenses.forEach((exp) => {
      rows.push([exp.category, `₦${exp.amount.toLocaleString()}`, `${exp.percentage}%`]);
    });
  }
  rows.push([]);

  // Section 3: Top Enterprise Customers
  rows.push(['3. TOP ENTERPRISE CUSTOMERS']);
  rows.push(['Customer Name', 'Company / Account', 'Total Orders', 'Total Spend (₦)', 'Account Status']);
  const defaultCustomers = topCustomers || [];
  if (defaultCustomers.length === 0) {
    rows.push(['No customer records', '-', '0', '₦0', '-']);
  } else {
    defaultCustomers.forEach((cust) => {
      rows.push([cust.name, cust.company, cust.ordersCount.toString(), `₦${cust.totalSpent.toLocaleString()}`, cust.status]);
    });
  }
  rows.push([]);

  // Section 4: Facilities Occupancy
  rows.push(['4. FACILITY OCCUPANCY STATUS']);
  rows.push(['Facility Name', 'Branch', 'Occupied Units', 'Total Capacity', 'Utilization Rate (%)']);
  const defaultFacilities = facilities || [];
  if (defaultFacilities.length === 0) {
    rows.push(['No facilities registered', '-', '0', '0', '0%']);
  } else {
    defaultFacilities.forEach((fac) => {
      const ratePct = fac.capacity > 0 ? Math.round((fac.occupied / fac.capacity) * 100) : 0;
      rows.push([fac.name, fac.branchName, fac.occupied.toString(), fac.capacity.toString(), `${ratePct}%`]);
    });
  }

  // Convert to CSV Blob
  const csvContent = rows
    .map((e) => e.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Nexus_ERP_Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 2. Export PDF Executive Report
export const exportToPDF = ({ filters, kpis, topCustomers, expenses, facilities }: ExportDataParams) => {
  const { branchName, dateRangeLabel } = getFilterLabel(filters);
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  // Page Dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Primary Branding Colors
  const primaryColor = [30, 41, 59]; // slate-800
  const blueAccent = [37, 99, 235]; // blue-600
  const lightBg = [248, 250, 252]; // slate-50

  // Header Banner Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Title & Logo Symbol
  doc.setFillColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.roundedRect(margin, 6, 12, 12, 2.5, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('N', margin + 4.2, 14.5);

  doc.setFontSize(14);
  doc.text('NEXUS ENTERPRISE ERP', margin + 16, 12.5);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Executive Performance & Financial Audit Report', margin + 16, 18);

  // Date Tag on Right Header
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin, 14, { align: 'right' });

  let yPos = 36;

  // Filter Context Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 16, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Scope Filter:', margin + 4, yPos + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${branchName}`, margin + 28, yPos + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Timeframe:', margin + 100, yPos + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${dateRangeLabel}`, margin + 120, yPos + 6);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential Executive Document • Internal Audit Use Only', margin + 4, yPos + 12);

  yPos += 22;

  // Section 1: KPI Highlights Grid
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Executive Financial Summary', margin, yPos);
  yPos += 5;

  const kpiTotalRev = kpis?.totalRevenue || 0;
  const kpiExpenses = kpis?.totalExpenses || 0;
  const kpiNetProfit = kpis?.netProfit || 0;
  const kpiMargin = kpis?.profitMargin || 0;

  const kpiBoxWidth = (pageWidth - margin * 2 - 9) / 4;
  const kpiHeight = 18;

  const kpiList = [
    { label: 'Total Revenue', value: `₦${kpiTotalRev.toLocaleString()}`, color: [37, 99, 235] },
    { label: 'Total Expenses', value: `₦${kpiExpenses.toLocaleString()}`, color: [225, 29, 72] },
    { label: 'Net Profit', value: `₦${kpiNetProfit.toLocaleString()}`, color: [16, 185, 129] },
    { label: 'Profit Margin', value: `${kpiMargin.toFixed(1)}%`, color: [147, 51, 234] },
  ];

  kpiList.forEach((item, idx) => {
    const xBox = margin + idx * (kpiBoxWidth + 3);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(xBox, yPos, kpiBoxWidth, kpiHeight, 2, 2, 'FD');

    // Colored Accent bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(xBox, yPos, 1.5, kpiHeight, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), xBox + 4, yPos + 5.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(item.value, xBox + 4, yPos + 13);
  });

  yPos += kpiHeight + 10;

  // Section 2: Operational Expense Categories Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Expense Breakdown', margin, yPos);
  yPos += 3;

  const expenseRows = (expenses && expenses.length > 0
    ? expenses.map((e) => [e.category, `₦${e.amount.toLocaleString()}`, `${e.percentage}%`])
    : [['No expenses recorded', '₦0', '0%']]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Expense Category', 'Monthly Amount (₦)', 'Share of Budget (%)']],
    body: expenseRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: Top Enterprise Customers Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Top Enterprise Customers', margin, yPos);
  yPos += 3;

  const customerRows = (topCustomers && topCustomers.length > 0
    ? topCustomers.map((c) => [c.name, c.company, c.ordersCount.toString(), `₦${c.totalSpent.toLocaleString()}`, c.status])
    : [['No customer records', '-', '0', '₦0', '-']]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Key Contact', 'Organization', 'Total Orders', 'Revenue Contributed', 'Account Status']],
    body: customerRows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 4: Facility Occupancy Summary Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('4. Facility Space Utilization', margin, yPos);
  yPos += 3;

  const facilityRows = (facilities && facilities.length > 0
    ? facilities.map((f) => [
        f.name,
        f.branchName,
        `${f.occupied} / ${f.capacity}`,
        `${f.capacity > 0 ? Math.round((f.occupied / f.capacity) * 100) : 0}%`,
        `₦${f.rate}/day`,
      ])
    : [['No facilities registered', '-', '0 / 0', '0%', '₦0/day']]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['Space Name', 'Branch Location', 'Occupancy Units', 'Utilization Rate', 'Daily Rate']],
    body: facilityRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer page styling
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Nexus Enterprise ERP • Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  }

  doc.save(`Nexus_ERP_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// 3. Dedicated Financial & Operational Analytics PDF Export
export interface ExportFinancePDFParams {
  periodLabel: string;
  branchName: string;
  analytics: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    netProfitMargin: number;
    totalBookings: number;
    uniqueClients: number;
    facilityRevenueBreakdown?: Array<{ facility: string; revenue: number; percentage: number }>;
    expenseCategoryBreakdown?: Array<{ category: string; amount: number; percentage: number }>;
    topFacilities?: Array<{ facility: string; bookingsCount: number; revenue: number }>;
    expenseItems?: Array<{ id: string; name: string; category: string; amount: number; date: string; branch: string }>;
  };
  businessName?: string;
  logoUrl?: string;
  narrative?: string;
  isAiGenerated?: boolean;
}

export const exportFinanceReportToPDF = ({
  periodLabel,
  branchName,
  analytics,
  businessName = 'Nexus Enterprise ERP',
  narrative,
  isAiGenerated = false,
}: ExportFinancePDFParams) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const primaryColor = [30, 41, 59]; // slate-800
  const blueAccent = [37, 99, 235]; // blue-600
  const lightBg = [248, 250, 252]; // slate-50

  // Header Banner Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Symbol Icon
  doc.setFillColor(blueAccent[0], blueAccent[1], blueAccent[2]);
  doc.roundedRect(margin, 6, 12, 12, 2.5, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('N', margin + 4.2, 14.5);

  doc.setFontSize(13);
  doc.text(businessName.toUpperCase(), margin + 16, 12.5);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Executive Financial & Operational Analytics Audit Report', margin + 16, 18);

  // Date Tag on Right Header
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
    pageWidth - margin,
    14,
    { align: 'right' }
  );

  let yPos = 36;

  // Filter Context Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 16, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Branch Scope:', margin + 4, yPos + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${branchName}`, margin + 28, yPos + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Period:', margin + 90, yPos + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${periodLabel}`, margin + 104, yPos + 6);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential Executive Document • Internal Audit & Regulatory Compliance', margin + 4, yPos + 12);

  yPos += 22;

  // Section 1: 6 KPI Highlights Grid
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Key Financial & Operational Metrics', margin, yPos);
  yPos += 5;

  const kpiBoxWidth = (pageWidth - margin * 2 - 10) / 3;
  const kpiHeight = 16;

  const kpisList = [
    { label: 'Total Revenue', value: `₦${Number(analytics.totalRevenue || 0).toLocaleString()}`, color: [37, 99, 235] },
    { label: 'Total Expenses', value: `₦${Number(analytics.totalExpenses || 0).toLocaleString()}`, color: [225, 29, 72] },
    { label: 'Net Profit', value: `₦${Number(analytics.netProfit || 0).toLocaleString()}`, color: [16, 185, 129] },
    { label: 'Profit Margin', value: `${Number(analytics.netProfitMargin || 0).toFixed(1)}%`, color: [147, 51, 234] },
    { label: 'Total Bookings', value: `${analytics.totalBookings || 0}`, color: [234, 88, 12] },
    { label: 'Unique Clients', value: `${analytics.uniqueClients || 0}`, color: [14, 165, 233] },
  ];

  kpisList.forEach((item, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const xBox = margin + col * (kpiBoxWidth + 5);
    const yBox = yPos + row * (kpiHeight + 4);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(xBox, yBox, kpiBoxWidth, kpiHeight, 2, 2, 'FD');

    // Colored Accent bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(xBox, yBox, 1.5, kpiHeight, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), xBox + 4, yBox + 5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(item.value, xBox + 4, yBox + 12);
  });

  yPos += 2 * (kpiHeight + 4) + 6;

  // Executive Narrative Analysis Block (Section I)
  if (narrative) {
    if (yPos > pageHeight - 65) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('2. Executive Narrative Analysis', margin, yPos);

    // Badge
    const badgeText = isAiGenerated ? 'AI-ASSISTED AUDIT INSIGHTS' : 'DETERMINISTIC EXECUTIVE AUDIT';
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'bold');
    if (isAiGenerated) {
      doc.setFillColor(238, 242, 255); // indigo-50
      doc.setTextColor(79, 70, 229); // indigo-600
    } else {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setTextColor(71, 85, 105); // slate-600
    }
    const badgeWidth = doc.getTextWidth(badgeText) + 6;
    doc.roundedRect(pageWidth - margin - badgeWidth, yPos - 3.5, badgeWidth, 5, 1, 1, 'F');
    doc.text(badgeText, pageWidth - margin - badgeWidth + 3, yPos);

    yPos += 5;

    const narrativeBoxWidth = pageWidth - margin * 2;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    const splitNarrative = doc.splitTextToSize(narrative, narrativeBoxWidth - 8);
    const boxHeight = Math.max(22, splitNarrative.length * 3.8 + 8);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, narrativeBoxWidth, boxHeight, 2, 2, 'FD');

    // Left accent bar
    doc.setFillColor(isAiGenerated ? 99 : 71, isAiGenerated ? 102 : 85, isAiGenerated ? 241 : 105);
    doc.rect(margin, yPos, 1.5, boxHeight, 'F');

    doc.setTextColor(51, 65, 85);
    doc.text(splitNarrative, margin + 4, yPos + 5.5, { lineHeightFactor: 1.25 });

    yPos += boxHeight + 8;
  }

  const sectionNum = narrative ? 3 : 2;

  // Section: Facility Revenue Breakdown Table
  if (analytics.facilityRevenueBreakdown && analytics.facilityRevenueBreakdown.length > 0) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${sectionNum}. Facility Revenue Breakdown`, margin, yPos);
    yPos += 3;

    const facRows = analytics.facilityRevenueBreakdown.map((f) => [
      f.facility,
      `₦${Number(f.revenue).toLocaleString()}`,
      `${f.percentage}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Facility Space', 'Revenue (₦)', 'Contribution Share (%)']],
      body: facRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: Expense Category Breakdown Table
  if (analytics.expenseCategoryBreakdown && analytics.expenseCategoryBreakdown.length > 0) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${sectionNum + 1}. Expense Category Breakdown`, margin, yPos);
    yPos += 3;

    const expCatRows = analytics.expenseCategoryBreakdown.map((e) => [
      e.category,
      `₦${Number(e.amount).toLocaleString()}`,
      `${e.percentage}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Expense Category', 'Total Amount (₦)', 'Share of Operating Expenses (%)']],
      body: expCatRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: Operational Expense Items Table
  if (analytics.expenseItems && analytics.expenseItems.length > 0) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${sectionNum + 2}. Detailed Expense Items`, margin, yPos);
    yPos += 3;

    const expItemRows = analytics.expenseItems.map((e) => [
      e.name,
      e.category,
      e.branch,
      e.date,
      `₦${Number(e.amount).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [['Expense Item Name', 'Category', 'Branch', 'Date', 'Amount (₦)']],
      body: expItemRows,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // Footer page numbering across all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${businessName} • Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  }

  doc.save(`Executive_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
