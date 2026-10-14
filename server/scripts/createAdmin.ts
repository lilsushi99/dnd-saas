/**
 * Administrative recovery: create a Director account, or reset an existing account's password.
 *
 *   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-long-password' npm run admin:create
 *
 * The password is read from the environment so it never appears in shell history arguments or logs.
 * If the email already exists, its password is reset, the role is set to Director and the account is re-activated.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config/config';
import { getPool, executeQuery, ensureDatabaseSchema } from '../database/db';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || 'System Director').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address.');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters.');

  await ensureDatabaseSchema(); // also seeds the default role matrix (INSERT IGNORE)
  const hash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const existing = await executeQuery<any>(`SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`, [email]);

  if (existing.length > 0) {
    await executeQuery(`UPDATE users SET password_hash = ?, role = 'Director', status = 'Active' WHERE id = ?`, [hash, existing[0].id]);
    console.log(`✅ Reset password and re-activated Director account for ${email}`);
  } else {
    const id = `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await executeQuery(
      `INSERT INTO users (id, name, email, password_hash, role, branch, status) VALUES (?, ?, ?, ?, 'Director', 'All Branches', 'Active')`,
      [id, name, email, hash]
    );
    console.log(`✅ Created Director account ${email} (${id})`);
  }
  await getPool().end();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
