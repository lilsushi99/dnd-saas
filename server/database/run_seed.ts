import fs from 'fs';
import path from 'path';
import { executeQuery } from './db';

async function main() {
  const sqlPath = path.join(process.cwd(), 'server', 'database', 'seed_october_2026_test_data.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // Strip line comments
  const lines = rawSql.split('\n');
  const cleanedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '';
    return line;
  });

  const fullText = cleanedLines.join('\n');
  const statements = fullText
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.toUpperCase().startsWith('START') && !s.toUpperCase().startsWith('COMMIT'));

  console.log(`Executing ${statements.length} seed statements on target database...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await executeQuery(stmt);
      console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully.`);
    } catch (err: any) {
      console.error(`✗ Error executing statement ${i + 1}:`, err.message);
      console.error('Statement excerpt:', stmt.slice(0, 150));
      process.exit(1);
    }
  }

  console.log('✓ All 9 seed blocks executed cleanly!');

  // Verify counts in each table
  console.log('\n--- VERIFYING INSERTED TEST RECORDS ---');
  const branchCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM branches WHERE id LIKE "BR-SEED-%"');
  console.log('Seed Branches Count:', branchCount[0].cnt, '(Expected: 2)');

  const facilityCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM facilities WHERE id LIKE "FAC-SEED-%"');
  console.log('Seed Facilities Count:', facilityCount[0].cnt, '(Expected: 10)');

  const clientCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM clients WHERE id LIKE "CL-SEED-%"');
  console.log('Seed Clients Count:', clientCount[0].cnt, '(Expected: 10)');

  const bookingCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM bookings WHERE id LIKE "BK-SEED-%"');
  console.log('Seed Bookings Count:', bookingCount[0].cnt, '(Expected: 20)');

  const expenseCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM expenses WHERE id LIKE "EXP-SEED-%"');
  console.log('Seed Expenses Count:', expenseCount[0].cnt, '(Expected: 14)');

  const subCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM subscriptions WHERE id LIKE "SUB-SEED-%"');
  console.log('Seed Subscriptions Count:', subCount[0].cnt, '(Expected: 8)');

  const paymentCount = await executeQuery<any>('SELECT COUNT(*) as cnt FROM payments WHERE id LIKE "PAY-SEED-%"');
  console.log('Seed Payments Count:', paymentCount[0].cnt, '(Expected: 19)');

  // Reconcile Financials
  console.log('\n--- RECONCILING FINANCIAL CALCULATIONS ---');
  const abujaRev = await executeQuery<any>('SELECT SUM(amount) as total FROM bookings WHERE branch_id = "BR-SEED-01" AND status != "Cancelled"');
  console.log('Abuja Central Hub Qualifying Revenue: ₦' + Number(abujaRev[0].total).toLocaleString('en-US', { minimumFractionDigits: 2 }));

  const phcRev = await executeQuery<any>('SELECT SUM(amount) as total FROM bookings WHERE branch_id = "BR-SEED-02" AND status != "Cancelled"');
  console.log('Port Harcourt Premier Hub Qualifying Revenue: ₦' + Number(phcRev[0].total).toLocaleString('en-US', { minimumFractionDigits: 2 }));

  const abujaExp = await executeQuery<any>('SELECT SUM(amount) as total FROM expenses WHERE branch_id = "BR-SEED-01"');
  console.log('Abuja Direct Expenses: ₦' + Number(abujaExp[0].total).toLocaleString('en-US', { minimumFractionDigits: 2 }));

  const phcExp = await executeQuery<any>('SELECT SUM(amount) as total FROM expenses WHERE branch_id = "BR-SEED-02"');
  console.log('Port Harcourt Direct Expenses: ₦' + Number(phcExp[0].total).toLocaleString('en-US', { minimumFractionDigits: 2 }));

  const sharedExp = await executeQuery<any>('SELECT SUM(amount) as total FROM expenses WHERE branch = "Both Branches" AND id LIKE "EXP-SEED-%"');
  console.log('Shared Both Branches Expenses: ₦' + Number(sharedExp[0].total).toLocaleString('en-US', { minimumFractionDigits: 2 }));

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
