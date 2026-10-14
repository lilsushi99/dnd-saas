import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Verify working directory and load root .env using absolute path (real environment variables take precedence over .env)
const cwd = process.cwd();
const envPath = path.resolve(cwd, '.env');

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath, override: false });
  if (result.error) {
    console.error(`❌ Error reading .env file at ${envPath}:`, result.error);
  } else {
    console.log('✅ [Config] Loaded .env file');
  }
} else {
  console.warn(`⚠️ [Config Warning] .env file not found at ${envPath}`);
}


export interface AppConfig {
  env: 'development' | 'production' | 'test' | string;
  port: number;
  appName: string;
  appUrl: string;
  clientUrl: string;
  logLevel: string;
  corsOrigin: string;
  timezone: string;
  geminiApiKey: string;
  geminiModel: string;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    pass: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    sessionSecret: string;
    bcryptRounds: number;
  };
  uploads: {
    directory: string;
    maxFileSize: number;
    allowedTypes: string[];
  };
}

export function validateAndLoadConfig(): AppConfig {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' &&
      (__filename.includes('dist') || __filename.endsWith('.cjs')));

  const env = isProd ? 'production' : (process.env.NODE_ENV || 'development');
  process.env.NODE_ENV = env;

  const port = parseInt(process.env.PORT || '3000', 10);
  const appName = process.env.APP_NAME || 'Nexus ERP Enterprise';
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  const clientUrl = process.env.CLIENT_URL || `http://localhost:${port}`;

  const dbHost = process.env.DB_HOST || 'localhost';
  let rawDbPort = parseInt(process.env.DB_PORT || '3306', 10);
  if (rawDbPort === 3000 || isNaN(rawDbPort) || rawDbPort <= 0) {
    rawDbPort = 3306;
  }
  const dbPort = rawDbPort;
  const dbName = process.env.DB_NAME || 'nexus_erp';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

  const KNOWN_INSECURE_SECRETS = [
    'nexus_erp_enterprise_jwt_secret_key_2026',
    'change_this_jwt_secret_in_production',
  ];
  let jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || KNOWN_INSECURE_SECRETS.includes(jwtSecret)) {
    if (env === 'production') {
      // Fail closed: a published/default secret lets anyone forge admin tokens.
      throw new Error(
        'JWT_SECRET is missing or is a known default value. Set a long random JWT_SECRET before starting in production.'
      );
    }
    // Development/test: ephemeral per-process secret (sessions reset on restart).
    jwtSecret = crypto.randomBytes(48).toString('hex');
    console.warn('⚠️ [Config] JWT_SECRET not set; using an ephemeral development secret.');
  }
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

  const uploadDir = process.env.UPLOAD_DIRECTORY || path.join(process.cwd(), 'uploads');
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/png,image/jpeg,image/webp,application/pdf')
    .split(',')
    .map((t) => t.trim());

  const logLevel = process.env.LOG_LEVEL || 'info';
  const corsOrigin = process.env.CORS_ORIGIN || '';
  const timezone = process.env.TIMEZONE || 'UTC+01:00';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Startup validation checks
  const missingVars: string[] = [];
  if (!dbHost) missingVars.push('DB_HOST');
  if (!dbName) missingVars.push('DB_NAME');
  if (!dbUser) missingVars.push('DB_USER');
  if (!jwtSecret) missingVars.push('JWT_SECRET');
  if (!sessionSecret) missingVars.push('SESSION_SECRET');

  if (missingVars.length > 0) {
    console.warn(`⚠️ [Config Warning] Missing required environment variables in .env: ${missingVars.join(', ')}`);
  }

  // Diagnostic log output (excluding passwords)
  console.log(`--------------------------------------------------`);
  console.log(`🚀 [Config] Environment Loaded: ${env}`);
  console.log(`📌 [Config] App Name: ${appName}`);
  console.log(`🔌 [Config] Port: ${port}`);
  console.log(`🗄️  [Config] Target MySQL DB Host: ${dbHost}`);
  console.log(`🗄️  [Config] Target MySQL DB Name: ${dbName}`);
  console.log(`👤 [Config] Target MySQL DB User: ${dbUser}`);
  console.log(`🔑 [Config] DB Password Set: ${dbPass ? 'YES' : 'NO'}`);
  console.log(`🤖 [Config] Gemini AI Model Selected: ${geminiModel}`);
  console.log(`--------------------------------------------------`);

  return {
    env,
    port,
    appName,
    appUrl,
    clientUrl,
    logLevel,
    corsOrigin,
    timezone,
    geminiApiKey,
    geminiModel,
    db: {
      host: dbHost,
      port: dbPort,
      name: dbName,
      user: dbUser,
      pass: dbPass,
    },
    auth: {
      jwtSecret,
      jwtExpiresIn,
      sessionSecret,
      bcryptRounds,
    },
    uploads: {
      directory: uploadDir,
      maxFileSize,
      allowedTypes,
    },
  };
}

export const config = validateAndLoadConfig();
export default config;
