import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import config from '../config/config';

const dbConfig: mysql.PoolOptions = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.pass,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

let pool: mysql.Pool | null = null;
let isUsingMemory = false;

export const schemaStatus: { ok: boolean | null; error: string | null } = { ok: null, error: null };

/**
 * The in-memory SQLite database is a DEVELOPMENT-ONLY convenience (e.g. AI Studio previews with no MySQL).
 * It must be explicitly enabled and can never run in production: silently swapping to a throwaway database
 * makes every "Saved" confirmation a lie, because the data disappears on restart.
 */
export function isMemoryFallbackAllowed(): boolean {
  return process.env.ALLOW_MEMORY_DB === 'true' && config.env !== 'production' && process.env.NODE_ENV !== 'production';
}
export function isUsingMemoryFallback(): boolean {
  return isUsingMemory;
}
let memoryDb: any = null;

function getMemoryDb(): any {
  if (memoryDb) return memoryDb;

  if (!DatabaseSync) {
    throw new Error('Database engine unavailable');
  }

  memoryDb = new DatabaseSync(':memory:');

  // Register SQL helper functions
  memoryDb.function('now', () => new Date().toISOString().replace('T', ' ').slice(0, 19));
  memoryDb.function('curdate', () => new Date().toISOString().slice(0, 10));
  memoryDb.function('unix_timestamp', () => Math.floor(Date.now() / 1000));

  // Initialize schema and seed data from dummy_database.sql
  try {
    const dummySqlPath = path.join(process.cwd(), 'dummy_database.sql');
    if (fs.existsSync(dummySqlPath)) {
      const rawSql = fs.readFileSync(dummySqlPath, 'utf8');
      let cleaned = rawSql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/ENGINE=InnoDB[^;]*/gi, '')
        .replace(/DEFAULT CHARSET=[^\s;]+/gi, '')
        .replace(/COLLATE=[^\s;]+/gi, '')
        .replace(/COLLATE [^\s,\)]+/gi, '')
        .replace(/INT NOT NULL AUTO_INCREMENT/gi, 'INTEGER')
        .replace(/INT AUTO_INCREMENT/gi, 'INTEGER')
        .replace(/AUTO_INCREMENT/gi, '')
        .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '')
        .replace(/,\s*(UNIQUE\s+)?KEY\s+`[^`]+`\s*\([^\)]+\)/gi, '')
        .replace(/,\s*CONSTRAINT\s+`[^`]+`\s+FOREIGN\s+KEY\s*\([^\)]+\)\s+REFERENCES\s+`[^`]+`\s*\([^\)]+\)(\s+ON\s+DELETE\s+[A-Z]+)?/gi, '')
        .replace(/ENUM\([^\)]+\)/gi, 'TEXT')
        .replace(/JSON/gi, 'TEXT')
        .replace(/LONGTEXT/gi, 'TEXT');

      const statements = cleaned
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('SET ') && !s.startsWith('START ') && !s.startsWith('COMMIT'));

      for (const stmt of statements) {
        try {
          memoryDb.exec(stmt);
        } catch (stmtErr: any) {
          // Ignore individual duplicate/format errors
        }
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [Memory DB] Failed to load dummy_database.sql, creating minimal schema:', err.message);
  }

  // Ensure peripheral and extension tables & columns exist
  try {
    memoryDb.exec(`
      ALTER TABLE business_settings ADD COLUMN director_name TEXT DEFAULT 'Dominion';
    `);
  } catch (e) {}
  try {
    memoryDb.exec(`
      ALTER TABLE business_settings ADD COLUMN website TEXT DEFAULT 'https://nexuserp.com';
    `);
  } catch (e) {}
  try {
    memoryDb.exec(`
      ALTER TABLE business_settings ADD COLUMN tax_rate REAL DEFAULT 0.00;
    `);
  } catch (e) {}
  try {
    memoryDb.exec(`
      ALTER TABLE business_settings ADD COLUMN invoice_prefix TEXT DEFAULT 'INV';
    `);
  } catch (e) {}

  memoryDb.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      uploaded_by TEXT DEFAULT 'Admin',
      total_rows INT NOT NULL DEFAULT 0,
      imported_rows INT NOT NULL DEFAULT 0,
      failed_rows INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department TEXT DEFAULT 'Operations',
      position TEXT DEFAULT 'Staff',
      branch_id TEXT,
      branch_name TEXT DEFAULT 'Main Branch',
      hire_date DATE,
      employment_status TEXT NOT NULL DEFAULT 'Full-time',
      salary_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payroll_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      net_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      payment_date DATE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT DEFAULT 'default',
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure default administrator / director accounts exist
  try {
    const adminHash = bcrypt.hashSync('admin123', 10);
    memoryDb.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, branch, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'USR-001',
      'Dominion',
      'director@nexuserp.com',
      '+1 (555) 019-2834',
      adminHash,
      'Director',
      'All Branches',
      'Active',
      '2025-01-01 00:00:00'
    );

    memoryDb.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, branch, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'USR-000',
      'System Administrator',
      'admin@enterprise-hub.com',
      '+1 (555) 019-2835',
      adminHash,
      'Director',
      'All Branches',
      'Active',
      '2025-01-01 00:00:00'
    );

    // Ensure business_settings has director_name, tax_rate, invoice_prefix, website
    memoryDb.exec(`
      UPDATE business_settings
      SET director_name = COALESCE(director_name, 'Dominion'),
          website = COALESCE(website, 'https://nexuserp.com'),
          tax_rate = COALESCE(tax_rate, 0.00),
          invoice_prefix = COALESCE(invoice_prefix, 'INV')
      WHERE id = 1;
    `);
  } catch (seedErr: any) {
    console.warn('⚠️ [Memory DB] Seeding default admin account notice:', seedErr.message);
  }

  console.log('✅ [Memory DB] Successfully initialized in-memory database with schema & seed data');
  return memoryDb;
}

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function ensureDatabaseSchema(): Promise<void> {
  // Ensure uploads directory exists on host
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  if (isUsingMemory) {
    getMemoryDb();
    return;
  }

  try {
    const activePool = getPool();
    const conn = await activePool.getConnection();

    try {
      const [tables]: any = await conn.query(`SHOW TABLES LIKE 'business_settings'`);
      if (tables && tables.length > 0) {
        const [columns]: any = await conn.query(`SHOW COLUMNS FROM business_settings`);
        const colNames = columns.map((c: any) => c.Field);

        if (!colNames.includes('tax_rate')) {
          await conn.query(`ALTER TABLE business_settings ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`);
        }
        if (!colNames.includes('invoice_prefix')) {
          await conn.query(`ALTER TABLE business_settings ADD COLUMN invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV'`);
        }
        if (!colNames.includes('website')) {
          await conn.query(`ALTER TABLE business_settings ADD COLUMN website VARCHAR(150) DEFAULT NULL AFTER email`);
        }
        if (!colNames.includes('director_name')) {
          await conn.query(`ALTER TABLE business_settings ADD COLUMN director_name VARCHAR(100) DEFAULT NULL AFTER business_name`);
        }
        await conn.query(`ALTER TABLE business_settings MODIFY COLUMN business_logo LONGTEXT DEFAULT NULL`);
      }
      const { runMigrations } = await import('./migrations');
      await runMigrations(conn);

      // Seed the default role matrix. INSERT IGNORE never overwrites a customised role.
      const { DEFAULT_ROLE_PERMISSIONS } = await import('../middleware/auth');
      for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        await conn.query(`INSERT IGNORE INTO user_roles_permissions (role, permissions) VALUES (?, ?)`, [role, JSON.stringify(perms)]);
      }
      schemaStatus.ok = true;
      schemaStatus.error = null;
      console.log('✅ [Schema Verification] Verified all database tables and settings columns');
    } finally {
      conn.release();
    }
  } catch (err: any) {
    schemaStatus.ok = false;
    schemaStatus.error = err.message;
    console.error('❌ [Schema Verification FAILED]:', err.message);
  }
}

export async function checkDbConnection(): Promise<boolean> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  try {
    const activePool = getPool();
    const conn = await Promise.race([
      activePool.getConnection(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout to MySQL')), 8000)
      ),
    ]);

    await conn.query('SELECT 1');
    conn.release();
    console.log(`✅ [MySQL Verified] Connected to ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    isUsingMemory = false;
    await ensureDatabaseSchema();
    return true;
  } catch (err: any) {
    if (isMemoryFallbackAllowed()) {
      console.warn(`⚠️ [DEV ONLY] MySQL offline (${err.message}). ALLOW_MEMORY_DB=true => using a NON-PERSISTENT in-memory database. Data will be lost on restart.`);
      isUsingMemory = true;
      getMemoryDb();
      return true;
    }
    console.error(`❌ [MySQL] Connection failed: ${err.message}`);
    return false;
  }
}

function sanitizeSql(sql: string): string {
  let s = sql.trim();
  // Handle CAST(... AS CHAR) in SQLite
  s = s.replace(/CAST\((.*?)\s+AS\s+CHAR\)/gi, 'CAST($1 AS TEXT)');
  return s;
}

export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!isUsingMemory) {
    try {
      const activePool = getPool();
      const [rows] = await activePool.execute(sql, params);
      return rows as T[];
    } catch (err: any) {
      if (isMemoryFallbackAllowed() && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
        console.warn(`⚠️ [DEV ONLY] MySQL disconnected (${err.message}) — falling back to NON-PERSISTENT in-memory database`);
        isUsingMemory = true;
      } else {
        throw err;
      }
    }
  }

  // In-memory SQLite execution
  const mem = getMemoryDb();
  const cleanedSql = sanitizeSql(sql);
  const safeParams = params.map((p) => (p === undefined ? null : p instanceof Date ? p.toISOString() : p));
  const upper = cleanedSql.toUpperCase();

  if (
    upper.startsWith('SELECT') ||
    upper.startsWith('PRAGMA') ||
    upper.startsWith('EXPLAIN') ||
    upper.includes(' RETURNING ')
  ) {
    try {
      const rows = mem.prepare(cleanedSql).all(...safeParams);
      return rows as T[];
    } catch (qErr: any) {
      console.error(`❌ [Memory DB Query Error]: ${qErr.message}\nSQL: ${cleanedSql}`);
      throw qErr;
    }
  }

  try {
    mem.prepare(cleanedSql).run(...safeParams);
    return [] as T[];
  } catch (runErr: any) {
    console.error(`❌ [Memory DB Exec Error]: ${runErr.message}\nSQL: ${cleanedSql}`);
    throw runErr;
  }
}

export async function executeTransaction<T>(
  callback: (connection: any) => Promise<T>
): Promise<T> {
  if (!isUsingMemory) {
    try {
      const activePool = getPool();
      const connection = await activePool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (err: any) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (err: any) {
      if (isMemoryFallbackAllowed() && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        isUsingMemory = true;
      } else {
        throw err;
      }
    }
  }

  // SQLite transaction
  const mem = getMemoryDb();
  mem.exec('BEGIN TRANSACTION');
  try {
    const mockConn = {
      execute: async (sql: string, params: any[] = []) => {
        const cleaned = sanitizeSql(sql);
        const safeParams = (params || []).map((p) =>
          p === undefined ? null : p instanceof Date ? p.toISOString() : p
        );
        const upper = cleaned.toUpperCase();
        if (upper.startsWith('SELECT')) {
          const rows = mem.prepare(cleaned).all(...safeParams);
          return [rows, []];
        }
        const res = mem.prepare(cleaned).run(...safeParams);
        return [res, []];
      },
      query: async (sql: string, params: any[] = []) => {
        const cleaned = sanitizeSql(sql);
        const safeParams = (params || []).map((p) =>
          p === undefined ? null : p instanceof Date ? p.toISOString() : p
        );
        const rows = mem.prepare(cleaned).all(...safeParams);
        return [rows, []];
      },
    };
    const result = await callback(mockConn);
    mem.exec('COMMIT');
    return result;
  } catch (err: any) {
    mem.exec('ROLLBACK');
    console.error('❌ [Memory Transaction Error]:', err.message);
    throw err;
  }
}

export function isDbActive(): boolean {
  return pool !== null || isUsingMemory;
}

export default {
  getPool,
  checkDbConnection,
  executeQuery,
  executeTransaction,
  isDbActive,
};
