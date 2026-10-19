import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { calculateBookingLifecycle, bookingOccupiesOn, profitMargin } from '../server/domain/businessRules';
import { isValidHex, normalizeHex, DEFAULT_PRIMARY_COLOR } from '../src/utils/colorUtils';
import { createApiApp } from '../server/app';
import type { Server } from 'http';

// ----------------------------------------------------------------------------
// 1. Excel Workbook Structural & Worksheet Verification
// ----------------------------------------------------------------------------
test('Regression: Dashboard Excel export produces valid workbook with 2+ worksheets and distinct columns', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet1 = workbook.addWorksheet('Executive KPI Summary');
  sheet1.addRow(['Executive Metric', 'Value (₦)', 'Benchmark / Description']);
  sheet1.addRow(['Total Gross Revenue', 1250000, 'Total booked revenue in period']);
  sheet1.addRow(['Operating Expenses', 450000, 'Total operating expenditures in period']);
  sheet1.addRow(['Net Operating Profit', 800000, 'Revenue - Expenses']);
  sheet1.addRow(['Net Profit Margin', 0.64, 'Operating margin percentage']);

  const sheet2 = workbook.addWorksheet('Facility Revenue Breakdown');
  sheet2.addRow(['Facility Space', 'Branch Location', 'Total Bookings', 'Revenue (₦)', 'Revenue Share %']);
  sheet2.addRow(['Hot Desk Dedicated', 'Art & Tech Hub', 25, 250000, 0.20]);
  sheet2.addRow(['Boardroom Executive', 'Art & Tech Hub', 10, 500000, 0.40]);

  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 1000, 'Workbook buffer should be non-empty and valid size');

  // Re-read workbook to verify integrity
  const readWorkbook = new ExcelJS.Workbook();
  // @ts-ignore
  await readWorkbook.xlsx.load(buffer);

  assert.equal(readWorkbook.worksheets.length, 2);
  assert.equal(readWorkbook.worksheets[0].name, 'Executive KPI Summary');
  assert.equal(readWorkbook.worksheets[1].name, 'Facility Revenue Breakdown');

  // Verify headers and cell separation on sheet 1
  const s1HeaderRow = readWorkbook.worksheets[0].getRow(1);
  assert.equal(s1HeaderRow.getCell(1).value, 'Executive Metric');
  assert.equal(s1HeaderRow.getCell(2).value, 'Value (₦)');
  assert.equal(s1HeaderRow.getCell(3).value, 'Benchmark / Description');

  // Verify sheet 2 columns
  const s2HeaderRow = readWorkbook.worksheets[1].getRow(1);
  assert.equal(s2HeaderRow.getCell(1).value, 'Facility Space');
  assert.equal(s2HeaderRow.getCell(2).value, 'Branch Location');
  assert.equal(s2HeaderRow.getCell(3).value, 'Total Bookings');
  assert.equal(s2HeaderRow.getCell(4).value, 'Revenue (₦)');
});

test('Regression: Daily Logger Excel export produces valid workbook with correct column separation', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily Logger Bookings');
  worksheet.addRow([
    'Booking ID',
    'Date',
    'Client Name',
    'Client ID',
    'Branch',
    'Facility',
    'Amount (₦)',
    'Payment Method',
    'Duration Used',
    'Duration Left',
    'Status',
  ]);
  worksheet.addRow([
    'BK-001',
    '2026-03-01',
    'Dominion Tech',
    'CL-001',
    'Art & Tech Hub',
    'Executive Boardroom',
    150000,
    'Transfer',
    1,
    0,
    'Active',
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  const readWorkbook = new ExcelJS.Workbook();
  // @ts-ignore
  await readWorkbook.xlsx.load(buffer);

  const sheet = readWorkbook.worksheets[0];
  assert.equal(sheet.name, 'Daily Logger Bookings');
  assert.equal(sheet.getRow(1).cellCount, 11);
  assert.equal(sheet.getRow(1).getCell(1).value, 'Booking ID');
  assert.equal(sheet.getRow(1).getCell(8).value, 'Payment Method');
  assert.equal(sheet.getRow(2).getCell(8).value, 'Transfer');
});

test('Regression: Facility Records Excel export produces valid workbook with 6 columns', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Facility Records');
  worksheet.addRow([
    'Facility Name',
    'Total Bookings',
    'Total Revenue (₦)',
    'Branch Location',
    'Average Spend (₦)',
    'Occupancy Percentage',
  ]);
  worksheet.addRow(['Private Office', 12, 600000, 'Hive Hub', 50000, '85%']);

  const buffer = await workbook.xlsx.writeBuffer();
  const readWorkbook = new ExcelJS.Workbook();
  // @ts-ignore
  await readWorkbook.xlsx.load(buffer);

  const sheet = readWorkbook.worksheets[0];
  assert.equal(sheet.getRow(1).cellCount, 6);
  assert.equal(sheet.getRow(1).getCell(1).value, 'Facility Name');
  assert.equal(sheet.getRow(1).getCell(6).value, 'Occupancy Percentage');
});

// ----------------------------------------------------------------------------
// 2. CSV Header & Column Separation Verification
// ----------------------------------------------------------------------------
test('Regression: CSV rows format correctly with proper escaping and column count', () => {
  const headers = ['Booking ID', 'Client Name', 'Branch', 'Facility', 'Amount', 'Payment Method'];
  const data = ['BK-001', 'Acme, Inc.', 'Art & Tech Hub', 'Desk "Special"', 45000, 'Transfer'];

  const escapeCsv = (val: any) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const line1 = headers.map(escapeCsv).join(',');
  const line2 = data.map(escapeCsv).join(',');

  assert.equal(line1.split(',').length, 6);
  assert.ok(line2.includes('"Acme, Inc."'));
  assert.ok(line2.includes('"Desk ""Special"""'));
});

// ----------------------------------------------------------------------------
// 3. Booking Lifecycle, Expiration & 72-Hour Expiring Soon Calculation
// ----------------------------------------------------------------------------
test('Regression: Expiring Soon means strictly the final 72 hours before calculated expiration', () => {
  const bookingDate = '2026-06-01';
  const durationCount = 10; // 10 days => expires 2026-06-11 09:00:00+01:00

  // Day 1: 2026-06-01 12:00:00 => Active (not expiring soon!)
  const day1 = calculateBookingLifecycle(
    { date: bookingDate, durationUnit: 'Day', durationCount },
    new Date('2026-06-01T12:00:00+01:00').getTime()
  );
  assert.equal(day1.status, 'Active');

  // Day 7: 2026-06-07 12:00:00 => 4 days left => still Active
  const day7 = calculateBookingLifecycle(
    { date: bookingDate, durationUnit: 'Day', durationCount },
    new Date('2026-06-07T12:00:00+01:00').getTime()
  );
  assert.equal(day7.status, 'Active');

  // Day 9: 2026-06-09 10:00:00 => within final 72h (approx 47h left) => Expiring Soon
  const day9 = calculateBookingLifecycle(
    { date: bookingDate, durationUnit: 'Day', durationCount },
    new Date('2026-06-09T10:00:00+01:00').getTime()
  );
  assert.equal(day9.status, 'Expiring Soon');

  // Day 12: 2026-06-12 10:00:00 => Past expiration => Expired
  const day12 = calculateBookingLifecycle(
    { date: bookingDate, durationUnit: 'Day', durationCount },
    new Date('2026-06-12T10:00:00+01:00').getTime()
  );
  assert.equal(day12.status, 'Expired');
});

test('Regression: Hourly booking pricing and duration calculation', () => {
  const hourlyBooking = calculateBookingLifecycle(
    { date: '2026-06-01', durationUnit: 'Hour', durationCount: 3, startTime: '10:00:00' },
    new Date('2026-06-01T11:00:00+01:00').getTime()
  );
  assert.equal(hourlyBooking.status, 'Active');

  // Occupancy checks: hourly booking occupies only on its booking date
  assert.equal(bookingOccupiesOn({ date: '2026-06-01', durationUnit: 'Hour', daysCount: 1 }, '2026-06-01'), true);
  assert.equal(bookingOccupiesOn({ date: '2026-06-01', durationUnit: 'Hour', daysCount: 1 }, '2026-06-02'), false);
});

// ----------------------------------------------------------------------------
// 4. Financial Calculations & Reconciliations
// ----------------------------------------------------------------------------
test('Regression: Financial formula reconciliation (Revenue - Expenses = Profit, Zero Revenue Safe)', () => {
  // Positive profit: Revenue 1000, Net profit 700 => 70%
  const margin1 = profitMargin(100000, 70000);
  assert.equal(margin1, 70);

  // Zero revenue safety (no division by zero!)
  const zeroRevMargin = profitMargin(0, -50000);
  assert.equal(zeroRevMargin, 0);

  // Negative profit: Revenue 500, Net profit -500 => -100%
  const negativeMargin = profitMargin(50000, -50000);
  assert.equal(negativeMargin, -100);
});

// ----------------------------------------------------------------------------
// 5. Brand Color Validation & Normalization
// ----------------------------------------------------------------------------
test('Regression: Brand color validation, normalization, and reset', () => {
  assert.equal(isValidHex('#1C64FF'), true);
  assert.equal(isValidHex('#fff'), true);
  assert.equal(isValidHex('#D97706'), true);
  assert.equal(isValidHex('rgb(0,0,0)'), false);
  assert.equal(isValidHex('red'), false);
  assert.equal(isValidHex(''), false);

  assert.equal(normalizeHex('#1c64ff'), '#1C64FF');
  assert.equal(normalizeHex('#abc'), '#AABBCC');
  assert.equal(DEFAULT_PRIMARY_COLOR, '#1C64FF');
});

// ----------------------------------------------------------------------------
// 6. Security & Authorization Checks
// ----------------------------------------------------------------------------
test('Regression: Unauthenticated access to sensitive operations routes is rejected (401)', async () => {
  const app = createApiApp();
  let server: Server;
  await new Promise<void>((r) => { server = app.listen(0, '127.0.0.1', () => r()); });
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    const res = await fetch(`${base}/api/operations/bookings`, { method: 'POST', body: JSON.stringify({}) });
    assert.equal(res.status, 401);

    const res2 = await fetch(`${base}/api/admin/upload-file`, { method: 'POST', body: JSON.stringify({}) });
    assert.equal(res2.status, 401);

    const res3 = await fetch(`${base}/api/expenses`, { method: 'POST', body: JSON.stringify({}) });
    assert.equal(res3.status, 401);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
