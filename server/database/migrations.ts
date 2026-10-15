/**
 * Tracked, idempotent, ADDITIVE migrations. Each runs once (recorded in schema_migrations) and every step first
 * checks the current schema, so it is safe on a database that already has some of the columns.
 * Nothing here drops, truncates or rewrites business records. A failing migration is NOT recorded, so it is
 * retried on the next start and surfaces in /api/health (schema: failed).
 */
import { CATEGORY_PALETTE, DEFAULT_CATEGORY_COLOR } from '../domain/masterData';

type Conn = { query: (sql: string, params?: any[]) => Promise<any> };

async function tableExists(c: Conn, t: string) {
  const [r]: any = await c.query(`SHOW TABLES LIKE ?`, [t]);
  return r.length > 0;
}
async function columnExists(c: Conn, t: string, col: string) {
  const [r]: any = await c.query(`SHOW COLUMNS FROM \`${t}\` LIKE ?`, [col]);
  return r.length > 0;
}
async function indexExists(c: Conn, t: string, idx: string) {
  const [r]: any = await c.query(`SHOW INDEX FROM \`${t}\` WHERE Key_name = ?`, [idx]);
  return r.length > 0;
}
async function addColumnIfMissing(c: Conn, t: string, col: string, ddl: string) {
  if (!(await columnExists(c, t, col))) await c.query(`ALTER TABLE \`${t}\` ADD COLUMN \`${col}\` ${ddl}`);
}
async function addIndexIfMissing(c: Conn, t: string, idx: string, cols: string) {
  if (!(await indexExists(c, t, idx))) await c.query(`ALTER TABLE \`${t}\` ADD INDEX \`${idx}\` (${cols})`);
}

export interface Migration { id: string; description: string; up: (c: Conn) => Promise<void> }

export const MIGRATIONS: Migration[] = [
  {
    id: '001_expense_category_color',
    description: 'Adds expense_categories.color and gives existing categories distinct default colours',
    async up(c) {
      if (!(await tableExists(c, 'expense_categories'))) return;
      const had = await columnExists(c, 'expense_categories', 'color');
      await addColumnIfMissing(c, 'expense_categories', 'color', `VARCHAR(7) NOT NULL DEFAULT '${DEFAULT_CATEGORY_COLOR}'`);
      if (!had) {
        const [rows]: any = await c.query(`SELECT id FROM expense_categories ORDER BY id ASC`);
        for (let i = 0; i < rows.length; i++) {
          await c.query(`UPDATE expense_categories SET color = ? WHERE id = ?`, [CATEGORY_PALETTE[i % CATEGORY_PALETTE.length], rows[i].id]);
        }
      }
    },
  },
  {
    id: '002_reference_columns_and_backfill',
    description: 'Adds category_id/branch_id/facility_id reference columns + indexes and backfills them by exact (case-insensitive) name match',
    async up(c) {
      if (await tableExists(c, 'expenses')) {
        await addColumnIfMissing(c, 'expenses', 'category_id', 'VARCHAR(50) DEFAULT NULL');
        await addColumnIfMissing(c, 'expenses', 'branch_id', 'VARCHAR(50) DEFAULT NULL');
        await addIndexIfMissing(c, 'expenses', 'idx_expenses_category_id', '`category_id`');
        await addIndexIfMissing(c, 'expenses', 'idx_expenses_branch_id', '`branch_id`');
        await c.query(`UPDATE expenses e JOIN expense_categories ec ON LOWER(ec.name) = LOWER(e.category) SET e.category_id = ec.id WHERE e.category_id IS NULL`);
        await c.query(`UPDATE expenses e JOIN branches b ON LOWER(b.name) = LOWER(e.branch) SET e.branch_id = b.id WHERE e.branch_id IS NULL`);
      }
      if (await tableExists(c, 'bookings')) {
        await addColumnIfMissing(c, 'bookings', 'branch_id', 'VARCHAR(50) DEFAULT NULL');
        await addColumnIfMissing(c, 'bookings', 'facility_id', 'VARCHAR(50) DEFAULT NULL');
        await addIndexIfMissing(c, 'bookings', 'idx_bookings_branch_id', '`branch_id`');
        await addIndexIfMissing(c, 'bookings', 'idx_bookings_facility_id', '`facility_id`');
        await addIndexIfMissing(c, 'bookings', 'idx_bookings_date', '`date`');
        await c.query(`UPDATE bookings k JOIN branches b ON LOWER(b.name) = LOWER(k.branch) SET k.branch_id = b.id WHERE k.branch_id IS NULL`);
        await c.query(
          `UPDATE bookings k JOIN facilities f ON LOWER(f.name) = LOWER(k.facility) AND LOWER(f.branch_name) = LOWER(k.branch)
           SET k.facility_id = f.id WHERE k.facility_id IS NULL`
        );
      }
    },
  },
];

export async function runMigrations(c: Conn): Promise<string[]> {
  await c.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(100) NOT NULL PRIMARY KEY, description VARCHAR(255) DEFAULT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`
  );
  const [done]: any = await c.query(`SELECT id FROM schema_migrations`);
  const applied = new Set(done.map((r: any) => r.id));
  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    await m.up(c); // throws => not recorded => retried next start and reported by /api/health
    await c.query(`INSERT INTO schema_migrations (id, description) VALUES (?, ?)`, [m.id, m.description]);
    ran.push(m.id);
    console.log(`✅ [Migration] Applied ${m.id}`);
  }
  return ran;
}
