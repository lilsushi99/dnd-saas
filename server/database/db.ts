import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import config from '../config/config';

const dbConfig = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.pass,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    console.log('--- MYSQL POOL CREATION DBCONFIG ---');
    console.log({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      password: dbConfig.password ? 'PASSWORD EXISTS' : 'NO PASSWORD',
    });
    console.log('------------------------------------');
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function ensureDatabaseSchema(): Promise<void> {
  try {
    // Ensure uploads directory exists on host
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const activePool = getPool();
    const conn = await activePool.getConnection();

    try {
      // 1. Check if business_settings exists
      const [tables]: any = await conn.query(`SHOW TABLES LIKE 'business_settings'`);
      if (tables && tables.length > 0) {
        // Query columns of business_settings
        const [columns]: any = await conn.query(`SHOW COLUMNS FROM business_settings`);
        const colNames = columns.map((c: any) => c.Field);

        if (!colNames.includes('tax_rate')) {
          console.log('➕ [Schema Migration] Adding tax_rate column to business_settings table...');
          await conn.query(`ALTER TABLE business_settings ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00`);
        }
        if (!colNames.includes('invoice_prefix')) {
          console.log('➕ [Schema Migration] Adding invoice_prefix column to business_settings table...');
          await conn.query(`ALTER TABLE business_settings ADD COLUMN invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV'`);
        }
        if (!colNames.includes('website')) {
          console.log('➕ [Schema Migration] Adding website column to business_settings table...');
          await conn.query(`ALTER TABLE business_settings ADD COLUMN website VARCHAR(150) DEFAULT NULL AFTER email`);
        }
        if (!colNames.includes('director_name')) {
          console.log('➕ [Schema Migration] Adding director_name column to business_settings table...');
          await conn.query(`ALTER TABLE business_settings ADD COLUMN director_name VARCHAR(100) DEFAULT NULL AFTER business_name`);
        }

        // Ensure business_logo is LONGTEXT
        await conn.query(`ALTER TABLE business_settings MODIFY COLUMN business_logo LONGTEXT DEFAULT NULL`);

        // Check if row id = 1 exists
        const [rows]: any = await conn.query(`SELECT id FROM business_settings WHERE id = 1`);
        if (!rows || rows.length === 0) {
          await conn.query(`
            INSERT INTO business_settings (id, business_name, director_name, business_logo, currency, timezone, address, phone, email, website, language, tax_rate, invoice_prefix, booking_prefix, client_prefix, expense_prefix, category_prefix, branch_code)
            VALUES (1, 'Workspace Management ERP', 'System Administrator', NULL, 'USD ($)', 'UTC', NULL, NULL, 'admin@enterprise-hub.com', NULL, 'English (Default)', 0.00, 'INV', 'BK', 'CL', 'EXP', 'EC', 'IPHIN')
          `);
        }
      }

      // 2. Check profile_settings
      const [profileTables]: any = await conn.query(`SHOW TABLES LIKE 'profile_settings'`);
      if (profileTables && profileTables.length > 0) {
        await conn.query(`ALTER TABLE profile_settings MODIFY COLUMN profile_photo LONGTEXT DEFAULT NULL`);
        const [pRows]: any = await conn.query(`SELECT id FROM profile_settings WHERE id = 1`);
        if (!pRows || pRows.length === 0) {
          await conn.query(`
            INSERT INTO profile_settings (id, user_id, full_name, email, phone, profile_photo)
            VALUES (1, 'USR-001', 'System Administrator', 'admin@enterprise-hub.com', NULL, NULL)
          `);
        }
      }

      // 3. Ensure all peripheral & foundation tables exist
      await conn.query(`
        CREATE TABLE IF NOT EXISTS file_uploads (
          id INT NOT NULL AUTO_INCREMENT,
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          file_type VARCHAR(50) NOT NULL,
          file_size INT NOT NULL,
          entity_type VARCHAR(50) DEFAULT NULL,
          uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS import_batches (
          id VARCHAR(50) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          uploaded_by VARCHAR(100) DEFAULT 'Admin',
          total_rows INT NOT NULL DEFAULT 0,
          imported_rows INT NOT NULL DEFAULT 0,
          failed_rows INT NOT NULL DEFAULT 0,
          status ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Completed',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id VARCHAR(50) NOT NULL,
          user_id VARCHAR(50) DEFAULT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(150) DEFAULT NULL,
          phone VARCHAR(50) DEFAULT NULL,
          department VARCHAR(100) DEFAULT 'Operations',
          position VARCHAR(100) DEFAULT 'Staff',
          branch_id VARCHAR(50) DEFAULT NULL,
          branch_name VARCHAR(100) DEFAULT 'Main Branch',
          hire_date DATE DEFAULT NULL,
          employment_status ENUM('Full-time', 'Part-time', 'Contract', 'Inactive') NOT NULL DEFAULT 'Full-time',
          salary_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS payroll_records (
          id VARCHAR(50) NOT NULL,
          employee_id VARCHAR(50) NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          net_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          payment_status ENUM('Pending', 'Paid', 'Processing') NOT NULL DEFAULT 'Pending',
          payment_date DATE DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS ai_messages (
          id INT NOT NULL AUTO_INCREMENT,
          conversation_id INT DEFAULT NULL,
          sender ENUM('user', 'assistant') NOT NULL,
          text TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log('✅ [Schema Verification] Verified all database tables and settings columns');
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('⚠️ [Schema Verification Warning]:', err.message);
  }
}

export async function checkDbConnection(): Promise<boolean> {
  console.log(`[MySQL Check] Attempting connection -> Host: ${dbConfig.host}, Port: ${dbConfig.port}, DB: ${dbConfig.database}, User: ${dbConfig.user}`);
  try {
    const activePool = getPool();
    const conn = await activePool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log(`✅ [MySQL Verified] Successfully executed SELECT 1 on ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Automatically run schema checks and migrations
    await ensureDatabaseSchema();
    return true;
  } catch (err: any) {
    console.error(`❌ [MySQL Connection Error] Unable to connect to ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}:`, err.message);
    console.error(`FULL CONFIG USED (Excluding Password):`, {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
    });
    return false;
  }
}

export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const activePool = getPool();
  try {
    const [rows] = await activePool.execute(sql, params);
    return rows as T[];
  } catch (err: any) {
    console.error(`❌ [MySQL Execution Error]: ${err.message}\nSQL: ${sql}`);
    throw err;
  }
}

export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const activePool = getPool();
  const connection = await activePool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err: any) {
    await connection.rollback();
    console.error('❌ [MySQL Transaction Error]:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

export function isDbActive(): boolean {
  return true;
}

export default {
  getPool,
  checkDbConnection,
  executeQuery,
  executeTransaction,
  isDbActive,
};
