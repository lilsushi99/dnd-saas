# MIGRATION_GUIDE.md - Database Connection, Migration & Restoration Guide

**Project:** Nexus ERP Enterprise
**Target RDBMS:** MySQL 8.0+ / MariaDB 10.5+
**Backup SQL File:** `/dummy_database.sql`

---

## 1. Overview

This document provides step-by-step instructions for:
1. Setting up MySQL locally or on remote servers (Hostinger, AWS RDS, Cloud SQL).
2. Importing & restoring the entire enterprise database schema and seed data from `dummy_database.sql`.
3. Running database migrations.
4. Troubleshooting MySQL connection issues.

---

## 2. Setting Up Database Connection in `.env`

All database settings are centralized in `server/config/config.ts` and read directly from `.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nexus_erp
DB_USER=root
DB_PASSWORD=your_secure_password
```

> **Database Connection:**
> Provide valid MySQL connection credentials in `.env` to connect to your MySQL database instance.

---

## 3. Restoring / Seeding from `dummy_database.sql`

The repository includes `/dummy_database.sql`, which contains full SQL DDL (CREATE TABLE) and DML (INSERT seed records) for all 18 enterprise tables:
- `users` & `user_roles_permissions`
- `bookings` & `payments`
- `expenses` & `expense_categories`
- `customers` & `customer_orders`
- `business_settings`, `audit_logs`, `inventory_items`, etc.

### Method A: Import via phpMyAdmin (Hostinger / cPanel / Shared Hosting)

1. Access phpMyAdmin from your web hosting dashboard.
2. Click **Databases** -> **Create Database**:
   - Database name: `nexus_erp`
   - Collation: `utf8mb4_unicode_ci`
3. Click on the newly created database `nexus_erp` in the left panel.
4. Go to the **Import** tab.
5. Under **File to import**, click **Choose File** and select `/dummy_database.sql` from your project folder.
6. Set Format to **SQL**.
7. Click **Go** at the bottom right.
8. Verify that all 18 tables are generated and populated with initial seed records.

### Method B: Import via MySQL Command Line Tool (CLI)

```bash
# 1. Connect to MySQL server and create database
mysql -h 127.0.0.1 -P 3306 -u root -p -e "CREATE DATABASE IF NOT EXISTS nexus_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import dummy_database.sql into nexus_erp
mysql -h 127.0.0.1 -P 3306 -u root -p nexus_erp < dummy_database.sql
```

### Method C: Import via MySQL Workbench or DBeaver

1. Open MySQL Workbench / DBeaver and connect to your server.
2. Create schema `nexus_erp`.
3. File -> Open SQL Script -> Select `/dummy_database.sql`.
4. Execute full script (Ctrl+Shift+Enter / Cmd+Enter).

---

## 4. Database Schema Structure & Tables

| Table Name | Description | Key Fields |
|---|---|---|
| `users` | System users, staff, admins | `id`, `email`, `password_hash`, `role`, `status` |
| `user_roles_permissions` | RBAC permission matrix | `role`, `permissions` (JSON) |
| `bookings` | Coworking space bookings & desk logs | `id`, `client_name`, `facility`, `days_count`, `status` |
| `payments` | Financial payment transactions | `id`, `reference`, `booking_id`, `amount`, `payment_method` |
| `expenses` | Operating expenses & receipts | `id`, `category`, `amount`, `vendor`, `status` |
| `expense_categories` | Expense taxonomy | `id`, `category_code`, `category_name`, `budget_limit` |
| `customers` | CRM client accounts | `id`, `name`, `email`, `company`, `tier` |
| `customer_orders` | CRM orders & purchases | `id`, `customer_id`, `total_amount`, `payment_status` |
| `business_settings` | Global ERP settings & prefixes | `id`, `business_name`, `currency`, `branch_code` |
| `audit_logs` | Enterprise audit trail | `id`, `user`, `action`, `entity`, `created_at` |

---

## 5. Migration Strategy for New Database Changes

To alter or expand the database schema safely in production:

1. Add your SQL migration scripts in `/server/database/migrations/` (e.g. `001_add_index.sql`).
2. Run migrations using MySQL CLI or phpMyAdmin SQL query window.
3. Update corresponding repository classes under `/server/repositories/` and models under `/server/models/`.

---

## 6. Connection Troubleshooting Checklist

- **Error:** `ECONNREFUSED 127.0.0.1:3306`
  - **Fix:** Verify MySQL service is running (`sudo service mysql status` or XAMPP / MAMP control panel).
- **Error:** `ER_ACCESS_DENIED_ERROR`
  - **Fix:** Double check `DB_USER` and `DB_PASSWORD` in `.env`.
- **Error:** `ER_BAD_DB_ERROR`
  - **Fix:** Ensure database `nexus_erp` was created before running the application.

---

*End of MIGRATION_GUIDE.md*
