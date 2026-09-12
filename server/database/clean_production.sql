-- ============================================================================
-- WORKSPACE MANAGEMENT ERP - PRODUCTION SCHEMA DEFINITION
-- Database Engine: MySQL 8.0+ / MariaDB
-- Character Set: utf8mb4 / utf8mb4_unicode_ci
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Drop Tables Sequence
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `import_batches`;
DROP TABLE IF EXISTS `file_uploads`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `system_notifications`;
DROP TABLE IF EXISTS `ai_messages`;
DROP TABLE IF EXISTS `ai_conversations`;
DROP TABLE IF EXISTS `payroll_records`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `facility_analytics`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `booking_items`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `client_communications`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `expense_categories`;
DROP TABLE IF EXISTS `facilities`;
DROP TABLE IF EXISTS `branches`;
DROP TABLE IF EXISTS `profile_settings`;
DROP TABLE IF EXISTS `business_settings`;
DROP TABLE IF EXISTS `user_roles_permissions`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. AUTHENTICATION & USERS MODULE
-- ============================================================================

CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Director', 'Manager', 'Receptionist', 'Accountant') NOT NULL DEFAULT 'Receptionist',
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `branch` VARCHAR(100) NOT NULL DEFAULT 'All Branches',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `profile_photo` LONGTEXT DEFAULT NULL,
  `last_login` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role` VARCHAR(50) NOT NULL,
  `permissions` JSON NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_permissions_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. ADMINISTRATION & SETTINGS MODULE
-- ============================================================================

CREATE TABLE `business_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `business_name` VARCHAR(150) NOT NULL DEFAULT 'Nexus Workspace ERP',
  `director_name` VARCHAR(100) DEFAULT NULL,
  `business_logo` LONGTEXT DEFAULT NULL,
  `currency` VARCHAR(50) NOT NULL DEFAULT 'USD ($)',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC',
  `address` TEXT DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `website` VARCHAR(150) DEFAULT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English (Default)',
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `invoice_prefix` VARCHAR(20) NOT NULL DEFAULT 'INV',
  `booking_prefix` VARCHAR(20) NOT NULL DEFAULT 'BK',
  `client_prefix` VARCHAR(20) NOT NULL DEFAULT 'CL',
  `expense_prefix` VARCHAR(20) NOT NULL DEFAULT 'EXP',
  `category_prefix` VARCHAR(20) NOT NULL DEFAULT 'EC',
  `branch_code` VARCHAR(20) NOT NULL DEFAULT 'IPHIN',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profile_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `full_name` VARCHAR(100) NOT NULL DEFAULT 'System Administrator',
  `email` VARCHAR(150) NOT NULL DEFAULT 'admin@enterprise-hub.com',
  `phone` VARCHAR(50) DEFAULT NULL,
  `profile_photo` LONGTEXT DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `branches` (
  `id` VARCHAR(50) NOT NULL,
  `branch_code` VARCHAR(20) DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `location` TEXT DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branches_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `facilities` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `branch_name` VARCHAR(100) NOT NULL,
  `default_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `capacity` INT NOT NULL DEFAULT 5,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `description` TEXT DEFAULT NULL,
  `created_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_facilities_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  KEY `idx_facilities_branch_id` (`branch_id`),
  KEY `idx_facilities_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_categories` (
  `id` VARCHAR(50) NOT NULL,
  `category_ref` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expense_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. CRM & CLIENT MANAGEMENT MODULE
-- ============================================================================

CREATE TABLE `clients` (
  `id` VARCHAR(50) NOT NULL,
  `client_ref` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `company` VARCHAR(150) DEFAULT NULL,
  `status` ENUM('Active', 'Inactive', 'VIP', 'Expiring Soon', 'Expired') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clients_name` (`name`),
  KEY `idx_clients_phone` (`phone`),
  KEY `idx_clients_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_communications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `type` ENUM('Email', 'SMS', 'Call', 'Meeting', 'Note') NOT NULL DEFAULT 'Note',
  `subject` VARCHAR(255) DEFAULT NULL,
  `summary` TEXT NOT NULL,
  `direction` ENUM('Inbound', 'Outbound') NOT NULL DEFAULT 'Outbound',
  `status` VARCHAR(50) NOT NULL DEFAULT 'Logged',
  `logged_by` VARCHAR(100) DEFAULT NULL,
  `sent_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_client_communications_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  KEY `idx_client_comm_client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. OPERATIONS & DAILY LOGGER MODULE
-- ============================================================================

CREATE TABLE `bookings` (
  `id` VARCHAR(50) NOT NULL,
  `booking_ref` VARCHAR(50) DEFAULT NULL,
  `date` DATE NOT NULL,
  `start_time` TIME DEFAULT '09:00:00',
  `end_time` TIME DEFAULT '17:00:00',
  `client_id` VARCHAR(50) NOT NULL,
  `client_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `branch` VARCHAR(100) NOT NULL,
  `facility_id` VARCHAR(50) DEFAULT NULL,
  `facility` VARCHAR(100) NOT NULL,
  `days_count` INT NOT NULL DEFAULT 1,
  `time_duration` VARCHAR(100) NOT NULL DEFAULT '09:00 AM - 05:00 PM',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('Cash', 'Wire Transfer', 'Credit Card', 'Corporate Billing', 'POS Terminal') NOT NULL DEFAULT 'Wire Transfer',
  `days_used` INT NOT NULL DEFAULT 0,
  `days_left` INT NOT NULL DEFAULT 0,
  `status` ENUM('Active', 'Upcoming', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
  `created_by` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_bookings_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  KEY `idx_bookings_date` (`date`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_branch` (`branch`),
  KEY `idx_bookings_facility` (`facility`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `booking_id` VARCHAR(50) NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `total_price` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_booking_items_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscriptions` (
  `id` VARCHAR(50) NOT NULL,
  `booking_id` VARCHAR(50) DEFAULT NULL,
  `client_id` VARCHAR(50) NOT NULL,
  `facility_id` VARCHAR(50) DEFAULT NULL,
  `facility_name` VARCHAR(100) DEFAULT NULL,
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `branch_name` VARCHAR(100) DEFAULT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `days_count` INT NOT NULL DEFAULT 30,
  `days_used` INT NOT NULL DEFAULT 0,
  `days_remaining` INT NOT NULL DEFAULT 30,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Credit Card',
  `status` ENUM('Active', 'Expiring Soon', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_subscriptions_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  KEY `idx_subscriptions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. FINANCE & EXPENSES MODULE
-- ============================================================================

CREATE TABLE `expenses` (
  `id` VARCHAR(50) NOT NULL,
  `expense_ref` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `date` DATE NOT NULL,
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `branch` VARCHAR(100) NOT NULL,
  `category_id` VARCHAR(50) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('Paid', 'Approved', 'Pending', 'Rejected') NOT NULL DEFAULT 'Paid',
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'System Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_date` (`date`),
  KEY `idx_expenses_category` (`category`),
  KEY `idx_expenses_branch` (`branch`),
  KEY `idx_expenses_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` VARCHAR(50) NOT NULL,
  `reference` VARCHAR(100) NOT NULL,
  `booking_id` VARCHAR(50) DEFAULT NULL,
  `client_id` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `payment_date` DATE NOT NULL,
  `status` ENUM('Completed', 'Pending', 'Failed', 'Refunded') NOT NULL DEFAULT 'Completed',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_reference` (`reference`),
  CONSTRAINT `fk_payments_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. HR & PAYROLL MODULE FOUNDATION
-- ============================================================================

CREATE TABLE `employees` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT 'Operations',
  `position` VARCHAR(100) DEFAULT 'Staff',
  `branch_id` VARCHAR(50) DEFAULT NULL,
  `branch_name` VARCHAR(100) DEFAULT 'Main Branch',
  `hire_date` DATE DEFAULT NULL,
  `employment_status` ENUM('Full-time', 'Part-time', 'Contract', 'Inactive') NOT NULL DEFAULT 'Full-time',
  `salary_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employees_department` (`department`),
  KEY `idx_employees_status` (`employment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payroll_records` (
  `id` VARCHAR(50) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `gross_salary` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `deductions` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_salary` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('Pending', 'Paid', 'Processing') NOT NULL DEFAULT 'Pending',
  `payment_date` DATE DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_payroll_records_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. ANALYTICS & FACILITY RECORDS MODULE
-- ============================================================================

CREATE TABLE `facility_analytics` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `facility_id` VARCHAR(50) NOT NULL,
  `facility_name` VARCHAR(100) NOT NULL,
  `branch_name` VARCHAR(100) NOT NULL,
  `period` VARCHAR(20) NOT NULL,
  `total_bookings` INT NOT NULL DEFAULT 0,
  `total_revenue` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `occupancy_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_facility_period` (`facility_id`, `period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. AI ASSISTANT MODULE
-- ============================================================================

CREATE TABLE `ai_conversations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `title` VARCHAR(255) DEFAULT 'AI Chat Session',
  `prompt` TEXT DEFAULT NULL,
  `response` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_conversations_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `conversation_id` INT DEFAULT NULL,
  `sender` ENUM('user', 'assistant') NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_messages_conv` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. NOTIFICATIONS, AUDIT LOGS, FILES & IMPORT BATCHES
-- ============================================================================

CREATE TABLE `system_notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'warning', 'success', 'danger') NOT NULL DEFAULT 'info',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `related_entity` VARCHAR(50) DEFAULT NULL,
  `related_entity_id` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(50) DEFAULT '127.0.0.1',
  `entity` VARCHAR(100) DEFAULT NULL,
  `entity_id` VARCHAR(100) DEFAULT NULL,
  `previous_value` JSON DEFAULT NULL,
  `new_value` JSON DEFAULT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user` (`user`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `file_uploads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` INT NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `import_batches` (
  `id` VARCHAR(50) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `uploaded_by` VARCHAR(100) DEFAULT 'Admin',
  `total_rows` INT NOT NULL DEFAULT 0,
  `imported_rows` INT NOT NULL DEFAULT 0,
  `failed_rows` INT NOT NULL DEFAULT 0,
  `status` ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Completed',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCTION BASELINE SEED DATA (Minimum System Auth & Settings Only)
-- ============================================================================

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `branch`, `status`, `created_at`) VALUES
('USR-001', 'System Administrator', 'admin@enterprise-hub.com', '+234 801 902 1823', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Director', 'All Branches', 'Active', CURRENT_TIMESTAMP);

INSERT INTO `user_roles_permissions` (`role`, `permissions`) VALUES
('Director', '{"crm": true, "reports": true, "expenses": true, "settings": true, "dashboard": true, "dailyLogger": true, "administration": true, "facilityRecords": true}'),
('Manager', '{"crm": true, "reports": true, "expenses": true, "settings": false, "dashboard": true, "dailyLogger": true, "administration": true, "facilityRecords": true}'),
('Receptionist', '{"crm": true, "reports": false, "expenses": false, "settings": false, "dashboard": true, "dailyLogger": true, "administration": false, "facilityRecords": true}'),
('Accountant', '{"crm": false, "reports": true, "expenses": true, "settings": false, "dashboard": true, "dailyLogger": false, "administration": false, "facilityRecords": true}');

INSERT INTO `business_settings` (`id`, `business_name`, `director_name`, `business_logo`, `currency`, `timezone`, `address`, `phone`, `email`, `website`, `language`, `tax_rate`, `invoice_prefix`, `booking_prefix`, `client_prefix`, `expense_prefix`, `category_prefix`, `branch_code`) VALUES
(1, 'Workspace Management ERP', 'System Administrator', NULL, 'USD ($)', 'UTC', '102 Executive Plaza, Suite 400', '+234 801 902 1823', 'admin@enterprise-hub.com', 'https://nexuserp.com', 'English (Default)', 0.00, 'INV', 'BK', 'CL', 'EXP', 'EC', 'IPHIN');

INSERT INTO `profile_settings` (`id`, `user_id`, `full_name`, `email`, `phone`, `profile_photo`) VALUES
(1, 'USR-001', 'System Administrator', 'admin@enterprise-hub.com', '+234 801 902 1823', NULL);

COMMIT;
