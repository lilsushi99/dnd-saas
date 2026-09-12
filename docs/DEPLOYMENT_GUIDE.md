# DEPLOYMENT_GUIDE.md - Complete Deployment & Hosting Guide

**Project:** Nexus ERP Enterprise
**Runtime:** Node.js 18+ / Express + Vite (ESModule / CommonJS Bundle)
**Database Engine:** MySQL 8.0+ / MariaDB 10.5+

---

## 1. Overview & Architectural Blueprint

Nexus ERP Enterprise uses a centralized environment configuration module (`server/config/config.ts`) that strictly loads and validates configuration variables from `.env`.

The application connects to MySQL/MariaDB via a high-performance connection pool (`mysql2`).

---

## 2. Environment Setup (`.env`)

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

### Complete Environment Variable Reference:

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `NODE_ENV` | Application environment (`development` / `production`) | Yes | `development` |
| `PORT` | HTTP Listening Port | Yes | `3000` |
| `APP_NAME` | Public Application Display Name | No | `"Nexus ERP Enterprise"` |
| `APP_URL` | Canonical Backend Base URL | No | `http://localhost:3000` |
| `CLIENT_URL` | Frontend Origin for CORS | No | `http://localhost:3000` |
| `DB_HOST` | Hostname / IP address of MySQL Server | Conditional | `127.0.0.1` |
| `DB_PORT` | MySQL Server Network Port | Yes | `3306` |
| `DB_NAME` | MySQL Target Database Name | Conditional | `nexus_erp` |
| `DB_USER` | MySQL Administrative / App User | Conditional | `root` |
| `DB_PASSWORD` | MySQL User Password | Conditional | `secret` |
| `JWT_SECRET` | Secret Key for JWT Authentication Tokens | Yes (Prod) | `nexus_erp_enterprise_jwt_secret_key` |
| `JWT_EXPIRES_IN` | JWT Token Validity Duration | No | `24h` |
| `SESSION_SECRET` | Secret Key for Express Session Cookies | Yes (Prod) | `nexus_erp_enterprise_session_secret` |
| `BCRYPT_ROUNDS` | Password hashing iteration count | No | `10` |
| `UPLOAD_DIRECTORY` | File Storage Path | No | `uploads` |
| `MAX_FILE_SIZE` | Maximum file upload payload (bytes) | No | `5242880` (5MB) |
| `ALLOWED_FILE_TYPES` | Allowed MIME types for uploads | No | `image/png,image/jpeg,application/pdf` |
| `LOG_LEVEL` | Diagnostic logging level | No | `info` |
| `CORS_ORIGIN` | Express CORS allowed origins | No | `*` |
| `TIMEZONE` | Operating Timezone | No | `UTC+01:00` |
| `GEMINI_API_KEY` | Google Gemini AI Assistant Key | Optional | `AIzaSy...` |

---

## 3. Local Development Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Ensure `.env` contains:
```env
NODE_ENV=development
PORT=3000
```

### Step 3: Run Server in Development Mode
```bash
npm run dev
```
The server will boot on `http://localhost:3000`. In development, Vite middleware handles HMR and frontend bundling automatically.

---

## 4. Hostinger Node.js Web Hosting Deployment

Hostinger provides dedicated Node.js application hosting via cPanel / hPanel.

### Step 1: Prepare Production Build
```bash
npm run build
```
This generates:
- Frontend bundle in `dist/`
- Single-file bundled backend server in `dist/server.cjs`

### Step 2: Upload Files to Hostinger
Upload the following files and directories via FTP / File Manager to your application root (e.g. `public_html/` or `/home/username/app`):
- `dist/`
- `package.json`
- `dummy_database.sql`
- `.env` (configured with Hostinger MySQL credentials)

### Step 3: Setup Node.js Application in Hostinger hPanel
1. Navigate to **Hostinger hPanel** -> **Websites** -> **Manage** -> **Node.js**.
2. Set **Node.js Version** to `18.x` or `20.x`.
3. Set **Application Root** to `/public_html` (or your app folder).
4. Set **Application Startup File** to `dist/server.cjs`.
5. Set **Environment Variables** matching your `.env` settings.
6. Click **Run NPM Install** (or install `--production` dependencies).
7. Click **Restart Application**.

---

## 5. Shared Hosting with phpMyAdmin & MySQL Deployment

### Step 1: Create Database in phpMyAdmin
1. Log into Hostinger / cPanel phpMyAdmin.
2. Click **Databases** -> Create Database named `nexus_erp` (Collation: `utf8mb4_unicode_ci`).
3. Create a MySQL Database User and assign **ALL PRIVILEGES** to `nexus_erp`.

### Step 2: Restore / Import Schema & Seed Data
1. Select `nexus_erp` database in phpMyAdmin.
2. Go to the **Import** tab.
3. Select `dummy_database.sql`.
4. Click **Go** to restore all 18 tables, triggers, indexes, and initial data.

### Step 3: Set `.env` Database Variables
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nexus_erp
DB_USER=your_hostinger_db_user
DB_PASSWORD=your_hostinger_db_pass
```

---

## 6. Containerized Deployment (Docker / Cloud Run / Kubernetes)

### Dockerfile:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

### Build & Run Container:
```bash
docker build -t nexus-erp:latest .
docker run -d -p 3000:3000 --env-file .env nexus-erp:latest
```

---

## 7. Health Verification

Test the application health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected JSON Output:
```json
{
  "status": "ok",
  "appName": "Nexus ERP Enterprise",
  "environment": "production",
  "database": "connected",
  "host": "127.0.0.1",
  "timestamp": "2026-08-03T11:55:00.000Z"
}
```

---

*End of DEPLOYMENT_GUIDE.md*
