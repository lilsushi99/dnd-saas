-- ============================================================================
-- WORKSPACE MANAGEMENT ERP - COMPLETE DUMMY DATABASE SCHEMA & SEED DATA EXPORT
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
-- COHERENT DUMMY DATA SET (5 Interconnected Records Per Table)
-- ============================================================================

-- 1. Users (5 Records)
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `branch_id`, `branch`, `status`, `created_at`) VALUES
('USR-001', 'System Administrator', 'admin@enterprise-hub.com', '+234 801 902 1823', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Director', 'BR-001', 'Lekki Innovation Hub', 'Active', '2025-01-01 08:00:00'),
('USR-002', 'Sarah Jenkins', 's.jenkins@enterprise-hub.com', '+234 802 333 4455', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Manager', 'BR-002', 'Victoria Island Hub', 'Active', '2025-01-15 09:00:00'),
('USR-003', 'Marcus Vance', 'm.vance@enterprise-hub.com', '+234 805 444 5566', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Accountant', 'BR-003', 'London Main', 'Active', '2025-02-01 10:00:00'),
('USR-004', 'Elena Rostova', 'e.rostova@enterprise-hub.com', '+234 809 555 6677', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Receptionist', 'BR-004', 'New York HQ', 'Active', '2025-03-25 11:00:00'),
('USR-005', 'David Miller', 'd.miller@enterprise-hub.com', '+234 812 666 7788', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Manager', 'BR-005', 'Tokyo Financial Hub', 'Active', '2025-04-10 12:00:00');

-- 2. User Roles Permissions
INSERT INTO `user_roles_permissions` (`role`, `permissions`) VALUES
('Director', '{"crm": true, "reports": true, "expenses": true, "settings": true, "dashboard": true, "dailyLogger": true, "administration": true, "facilityRecords": true}'),
('Manager', '{"crm": true, "reports": true, "expenses": true, "settings": false, "dashboard": true, "dailyLogger": true, "administration": true, "facilityRecords": true}'),
('Receptionist', '{"crm": true, "reports": false, "expenses": false, "settings": false, "dashboard": true, "dailyLogger": true, "administration": false, "facilityRecords": true}'),
('Accountant', '{"crm": false, "reports": true, "expenses": true, "settings": false, "dashboard": true, "dailyLogger": false, "administration": false, "facilityRecords": true}');

-- 3. Business Settings
INSERT INTO `business_settings` (`id`, `business_name`, `director_name`, `business_logo`, `currency`, `timezone`, `address`, `phone`, `email`, `website`, `language`, `tax_rate`, `invoice_prefix`, `booking_prefix`, `client_prefix`, `expense_prefix`, `category_prefix`, `branch_code`) VALUES
(1, 'Workspace Management ERP', 'System Administrator', NULL, 'USD ($)', 'UTC', '102 Executive Plaza, Suite 400, Lagos', '+234 801 902 1823', 'admin@enterprise-hub.com', 'https://nexuserp.com', 'English (Default)', 7.50, 'INV', 'BK', 'CL', 'EXP', 'EC', 'IPHIN');

-- 4. Profile Settings
INSERT INTO `profile_settings` (`id`, `user_id`, `full_name`, `email`, `phone`, `profile_photo`) VALUES
(1, 'USR-001', 'System Administrator', 'admin@enterprise-hub.com', '+234 801 902 1823', NULL);

-- 5. Branches (5 Records)
INSERT INTO `branches` (`id`, `branch_code`, `name`, `location`, `state`, `status`, `created_date`) VALUES
('BR-001', 'IPHIN-LK', 'Lekki Innovation Hub', 'Plot 14 Admiralty Way, Lekki Phase 1', 'Lagos', 'Active', '2025-01-15'),
('BR-002', 'IPHIN-VI', 'Victoria Island Hub', '7th Floor, Victoria Heights, VI', 'Lagos', 'Active', '2025-02-01'),
('BR-003', 'IPHIN-LD', 'London Main', '12 Financial Square, Canary Wharf', 'London', 'Active', '2025-02-15'),
('BR-004', 'IPHIN-NY', 'New York HQ', '450 Lexington Ave, Manhattan', 'New York', 'Active', '2025-03-01'),
('BR-005', 'IPHIN-TK', 'Tokyo Financial Hub', 'Roppongi Hills Mori Tower, Minato-ku', 'Tokyo', 'Active', '2025-03-15');

-- 6. Facilities (5 Records)
INSERT INTO `facilities` (`id`, `name`, `branch_id`, `branch_name`, `default_price`, `capacity`, `status`, `description`, `created_date`) VALUES
('FAC-001', 'Co-working Space', 'BR-001', 'Lekki Innovation Hub', 450.00, 20, 'Active', 'Open-plan collaborative workspace desks', '2025-01-16'),
('FAC-002', 'Private Offices', 'BR-001', 'Lekki Innovation Hub', 1800.00, 5, 'Active', 'Enclosed glass office suites for teams', '2025-01-16'),
('FAC-003', 'Podcast Room', 'BR-002', 'Victoria Island Hub', 650.00, 1, 'Active', 'Acoustically isolated audio/video recording studio', '2025-02-02'),
('FAC-004', 'Meeting Room', 'BR-002', 'Victoria Island Hub', 850.00, 2, 'Active', 'High-tech conference suite with 4K AV setup', '2025-02-02'),
('FAC-005', 'Executive Boardroom', 'BR-003', 'London Main', 2500.00, 1, 'Active', 'Premium corporate board suite with video conferencing', '2025-02-16');

-- 7. Expense Categories (5 Records)
INSERT INTO `expense_categories` (`id`, `category_ref`, `name`, `description`, `status`, `created_date`) VALUES
('CAT-001', 'EC-001', 'Utilities', 'Electricity, water & diesel generator costs', 'Active', '2025-01-10'),
('CAT-002', 'EC-002', 'Internet & Bandwidth', 'Fiber optic broadband ISP charges', 'Active', '2025-01-10'),
('CAT-003', 'EC-003', 'Facility Maintenance', 'HVAC, plumbing and elevator servicing', 'Active', '2025-01-10'),
('CAT-004', 'EC-004', 'Janitorial & Cleaning', 'Sanitation supplies and cleaning services', 'Active', '2025-01-10'),
('CAT-005', 'EC-005', 'Software & Cloud', 'SaaS subscriptions and cloud hosting', 'Active', '2025-01-10');

-- 8. Clients (5 Records)
INSERT INTO `clients` (`id`, `client_ref`, `name`, `phone`, `email`, `company`, `status`, `created_at`) VALUES
('CL-IPHIN-1', 'CL-001', 'Acme Enterprise Corp', '+1 (555) 234-5678', 'billing@acme.com', 'Acme Enterprise', 'Active', '2026-08-01 08:30:00'),
('CL-IPHIN-2', 'CL-002', 'GlobalTech Systems', '+1 (555) 345-6789', 'contact@globaltech.io', 'GlobalTech', 'Active', '2026-08-01 09:15:00'),
('CL-IPHIN-3', 'CL-003', 'Vertex Holdings Group', '+44 20 7946 0912', 'accounts@vertexholdings.co.uk', 'Vertex Holdings', 'VIP', '2026-08-02 07:45:00'),
('CL-IPHIN-4', 'CL-004', 'Horizon Media Partners', '+1 (555) 987-6543', 'media@horizon.com', 'Horizon Media', 'Expiring Soon', '2026-08-05 14:20:00'),
('CL-IPHIN-5', 'CL-005', 'Apex Financial Services', '+81 3 5555 0143', 'finance@apex.jp', 'Apex Financial', 'Expired', '2026-08-10 11:00:00');

-- 9. Subscriptions (5 Records)
INSERT INTO `subscriptions` (`id`, `booking_id`, `client_id`, `facility_id`, `facility_name`, `branch_id`, `branch_name`, `start_date`, `end_date`, `days_count`, `days_used`, `days_remaining`, `amount`, `payment_method`, `status`, `created_at`) VALUES
('SUB-001', 'BK-IPHIN-2026-1', 'CL-IPHIN-1', 'FAC-001', 'Co-working Space', 'BR-001', 'Lekki Innovation Hub', '2026-09-01', '2026-09-30', 30, 10, 20, 14500.00, 'Wire Transfer', 'Active', '2026-09-01 08:30:00'),
('SUB-002', 'BK-IPHIN-2026-2', 'CL-IPHIN-2', 'FAC-002', 'Private Offices', 'BR-001', 'Lekki Innovation Hub', '2026-09-01', '2026-09-15', 15, 10, 5, 28400.00, 'Credit Card', 'Active', '2026-09-01 09:15:00'),
('SUB-003', 'BK-IPHIN-2026-3', 'CL-IPHIN-3', 'FAC-005', 'Executive Boardroom', 'BR-003', 'London Main', '2026-09-02', '2026-09-05', 3, 3, 0, 6200.00, 'Corporate Billing', 'Expired', '2026-09-02 07:45:00'),
('SUB-004', 'BK-IPHIN-2026-4', 'CL-IPHIN-4', 'FAC-003', 'Podcast Room', 'BR-002', 'Victoria Island Hub', '2026-09-08', '2026-09-12', 4, 2, 2, 2600.00, 'Wire Transfer', 'Expiring Soon', '2026-09-08 14:20:00'),
('SUB-005', 'BK-IPHIN-2026-5', 'CL-IPHIN-5', 'FAC-004', 'Meeting Room', 'BR-002', 'Victoria Island Hub', '2026-08-01', '2026-08-14', 14, 14, 0, 9800.00, 'Credit Card', 'Expired', '2026-08-01 11:00:00');

-- 10. Bookings (5 Records)
INSERT INTO `bookings` (`id`, `booking_ref`, `date`, `start_time`, `end_time`, `client_id`, `client_name`, `phone`, `email`, `branch_id`, `branch`, `facility_id`, `facility`, `days_count`, `time_duration`, `amount`, `payment_method`, `days_used`, `days_left`, `status`, `created_by`, `created_at`) VALUES
('BK-IPHIN-2026-1', 'BK-001', '2026-09-01', '09:00:00', '17:00:00', 'CL-IPHIN-1', 'Acme Enterprise Corp', '+1 (555) 234-5678', 'billing@acme.com', 'BR-001', 'Lekki Innovation Hub', 'FAC-001', 'Co-working Space', 30, '09:00 AM - 05:00 PM', 14500.00, 'Wire Transfer', 10, 20, 'Active', 'USR-001', '2026-09-01 08:30:00'),
('BK-IPHIN-2026-2', 'BK-002', '2026-09-01', '08:00:00', '18:00:00', 'CL-IPHIN-2', 'GlobalTech Systems', '+1 (555) 345-6789', 'contact@globaltech.io', 'BR-001', 'Lekki Innovation Hub', 'FAC-002', 'Private Offices', 15, '08:00 AM - 06:00 PM', 28400.00, 'Credit Card', 10, 5, 'Active', 'USR-002', '2026-09-01 09:15:00'),
('BK-IPHIN-2026-3', 'BK-003', '2026-09-02', '09:00:00', '17:00:00', 'CL-IPHIN-3', 'Vertex Holdings Group', '+44 20 7946 0912', 'accounts@vertexholdings.co.uk', 'BR-003', 'London Main', 'FAC-005', 'Executive Boardroom', 3, '09:00 AM - 05:00 PM', 6200.00, 'Corporate Billing', 3, 0, 'Expired', 'USR-003', '2026-09-02 07:45:00'),
('BK-IPHIN-2026-4', 'BK-004', '2026-09-08', '10:00:00', '20:00:00', 'CL-IPHIN-4', 'Horizon Media Partners', '+1 (555) 987-6543', 'media@horizon.com', 'BR-002', 'Victoria Island Hub', 'FAC-003', 'Podcast Room', 4, '10:00 AM - 08:00 PM', 2600.00, 'Wire Transfer', 2, 2, 'Active', 'USR-004', '2026-09-08 14:20:00'),
('BK-IPHIN-2026-5', 'BK-005', '2026-08-01', '09:00:00', '17:00:00', 'CL-IPHIN-5', 'Apex Financial Services', '+81 3 5555 0143', 'finance@apex.jp', 'BR-002', 'Victoria Island Hub', 'FAC-004', 'Meeting Room', 14, '09:00 AM - 05:00 PM', 9800.00, 'Credit Card', 14, 0, 'Expired', 'USR-005', '2026-08-01 11:00:00');

-- 11. Booking Items (Associated with Bookings)
INSERT INTO `booking_items` (`booking_id`, `item_name`, `unit_price`, `quantity`, `total_price`) VALUES
('BK-IPHIN-2026-1', 'Monthly Coworking Desk Pass', 14500.00, 1, 14500.00),
('BK-IPHIN-2026-2', 'Private Office Suite Reservation', 28400.00, 1, 28400.00),
('BK-IPHIN-2026-3', 'Executive Boardroom Daily Rate', 2066.67, 3, 6200.00),
('BK-IPHIN-2026-4', 'Podcast Recording Studio Pass', 650.00, 4, 2600.00),
('BK-IPHIN-2026-5', 'Meeting Room Hourly Package', 700.00, 14, 9800.00);

-- 12. Payments (5 Records)
INSERT INTO `payments` (`id`, `reference`, `booking_id`, `client_id`, `amount`, `payment_method`, `payment_date`, `status`, `created_at`) VALUES
('PAY-001', 'REF-2026-8001', 'BK-IPHIN-2026-1', 'CL-IPHIN-1', 14500.00, 'Wire Transfer', '2026-09-01', 'Completed', '2026-09-01 08:35:00'),
('PAY-002', 'REF-2026-8002', 'BK-IPHIN-2026-2', 'CL-IPHIN-2', 28400.00, 'Credit Card', '2026-09-01', 'Completed', '2026-09-01 09:20:00'),
('PAY-003', 'REF-2026-8003', 'BK-IPHIN-2026-3', 'CL-IPHIN-3', 6200.00, 'Corporate Billing', '2026-09-02', 'Completed', '2026-09-02 07:50:00'),
('PAY-004', 'REF-2026-8004', 'BK-IPHIN-2026-4', 'CL-IPHIN-4', 2600.00, 'Wire Transfer', '2026-09-08', 'Completed', '2026-09-08 14:25:00'),
('PAY-005', 'REF-2026-8005', 'BK-IPHIN-2026-5', 'CL-IPHIN-5', 9800.00, 'Credit Card', '2026-08-01', 'Completed', '2026-08-01 11:10:00');

-- 13. Expenses (5 Records)
INSERT INTO `expenses` (`id`, `expense_ref`, `name`, `amount`, `date`, `branch_id`, `branch`, `category_id`, `category`, `description`, `status`, `created_by`, `created_at`) VALUES
('EXP-2026-001', 'EXP-001', 'High-Speed Fiber Optics Internet', 3200.00, '2026-09-02', 'BR-001', 'Lekki Innovation Hub', 'CAT-002', 'Internet & Bandwidth', 'Monthly dedicated ISP broadband line renewal', 'Paid', 'Sarah Jenkins', '2026-09-02 09:15:00'),
('EXP-2026-002', 'EXP-002', 'HVAC Air Conditioning Servicing', 1850.00, '2026-09-03', 'BR-001', 'Lekki Innovation Hub', 'CAT-003', 'Facility Maintenance', 'Quarterly AC filter replacement and coolant refilling', 'Paid', 'David Miller', '2026-09-03 14:20:00'),
('EXP-2026-003', 'EXP-003', 'Janitorial & Hygiene Supplies', 940.00, '2026-09-04', 'BR-002', 'Victoria Island Hub', 'CAT-004', 'Janitorial & Cleaning', 'Restroom paper towels, hand sanitizers & eco-friendly detergents', 'Paid', 'Elena Rostova', '2026-09-04 11:00:00'),
('EXP-2026-004', 'EXP-004', 'Cloud ERP Hosting & Database Infra', 4500.00, '2026-09-05', 'BR-003', 'London Main', 'CAT-005', 'Software & Cloud', 'Monthly database cluster and cloud server hosting fees', 'Paid', 'System Administrator', '2026-09-05 10:00:00'),
('EXP-2026-005', 'EXP-005', 'Diesel Fuel for Generator Power', 5400.00, '2026-09-06', 'BR-002', 'Victoria Island Hub', 'CAT-001', 'Utilities', 'Diesel fuel supply for backup generator power supply', 'Paid', 'Marcus Vance', '2026-09-06 08:00:00');

-- 14. Client Communications (5 Records)
INSERT INTO `client_communications` (`client_id`, `user_id`, `type`, `subject`, `summary`, `direction`, `status`, `logged_by`, `sent_date`, `created_at`) VALUES
('CL-IPHIN-1', 'USR-001', 'Meeting', 'Onboarding & Workspace Pass', 'Completed 30-day coworking desk pass onboarding session.', 'Outbound', 'Logged', 'System Administrator', '2026-09-01 10:00:00', '2026-09-01 10:00:00'),
('CL-IPHIN-2', 'USR-002', 'Email', 'Private Suite Renewal', 'Sent 6-month private office lease extension quote.', 'Outbound', 'Logged', 'Sarah Jenkins', '2026-09-01 11:30:00', '2026-09-01 11:30:00'),
('CL-IPHIN-3', 'USR-003', 'Call', 'Boardroom Catering Confirmation', 'Confirmed AV setup and executive lunch catering order.', 'Inbound', 'Logged', 'Marcus Vance', '2026-09-02 09:00:00', '2026-09-02 09:00:00'),
('CL-IPHIN-4', 'USR-004', 'SMS', 'Podcast Room Booking Reminder', 'Sent automated SMS confirmation for recording session.', 'Outbound', 'Logged', 'Elena Rostova', '2026-09-08 10:00:00', '2026-09-08 10:00:00'),
('CL-IPHIN-5', 'USR-005', 'Note', 'Subscription Expiry Notice', 'Customer plan expired on Aug 14; follow up for renewal.', 'Outbound', 'Logged', 'David Miller', '2026-08-15 14:00:00', '2026-08-15 14:00:00');

-- 15. HR & Payroll Employees (5 Records)
INSERT INTO `employees` (`id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `department`, `position`, `branch_id`, `branch_name`, `hire_date`, `employment_status`, `salary_amount`, `created_at`) VALUES
('EMP-001', 'USR-001', 'Dominion', 'Administrator', 'admin@enterprise-hub.com', '+234 801 902 1823', 'Executive', 'Managing Director', 'BR-001', 'Lekki Innovation Hub', '2024-01-01', 'Full-time', 12000.00, '2025-01-01 08:00:00'),
('EMP-002', 'USR-002', 'Sarah', 'Jenkins', 's.jenkins@enterprise-hub.com', '+234 802 333 4455', 'Operations', 'Branch Manager', 'BR-002', 'Victoria Island Hub', '2024-03-15', 'Full-time', 8500.00, '2025-01-15 09:00:00'),
('EMP-003', 'USR-003', 'Marcus', 'Vance', 'm.vance@enterprise-hub.com', '+234 805 444 5566', 'Finance', 'Senior Accountant', 'BR-003', 'London Main', '2024-06-01', 'Full-time', 9000.00, '2025-02-01 10:00:00'),
('EMP-004', 'USR-004', 'Elena', 'Rostova', 'e.rostova@enterprise-hub.com', '+234 809 555 6677', 'Front Desk', 'Lead Receptionist', 'BR-004', 'New York HQ', '2024-08-20', 'Full-time', 5500.00, '2025-03-25 11:00:00'),
('EMP-005', 'USR-005', 'David', 'Miller', 'd.miller@enterprise-hub.com', '+234 812 666 7788', 'Facilities', 'Facility Operations Specialist', 'BR-005', 'Tokyo Financial Hub', '2024-09-10', 'Full-time', 6200.00, '2025-04-10 12:00:00');

-- 16. Payroll Records (5 Records)
INSERT INTO `payroll_records` (`id`, `employee_id`, `period_start`, `period_end`, `gross_salary`, `deductions`, `net_salary`, `payment_status`, `payment_date`, `created_at`) VALUES
('PAYROLL-001', 'EMP-001', '2026-08-01', '2026-08-31', 12000.00, 1500.00, 10500.00, 'Paid', '2026-08-31', '2026-08-31 17:00:00'),
('PAYROLL-002', 'EMP-002', '2026-08-01', '2026-08-31', 8500.00, 950.00, 7550.00, 'Paid', '2026-08-31', '2026-08-31 17:00:00'),
('PAYROLL-003', 'EMP-003', '2026-08-01', '2026-08-31', 9000.00, 1100.00, 7900.00, 'Paid', '2026-08-31', '2026-08-31 17:00:00'),
('PAYROLL-004', 'EMP-004', '2026-08-01', '2026-08-31', 5500.00, 600.00, 4900.00, 'Paid', '2026-08-31', '2026-08-31 17:00:00'),
('PAYROLL-005', 'EMP-005', '2026-08-01', '2026-08-31', 6200.00, 700.00, 5500.00, 'Paid', '2026-08-31', '2026-08-31 17:00:00');

-- 17. Facility Analytics (5 Records)
INSERT INTO `facility_analytics` (`facility_id`, `facility_name`, `branch_name`, `period`, `total_bookings`, `total_revenue`, `occupancy_rate`) VALUES
('FAC-001', 'Co-working Space', 'Lekki Innovation Hub', '2026-09', 12, 14500.00, 85.50),
('FAC-002', 'Private Offices', 'Lekki Innovation Hub', '2026-09', 5, 28400.00, 92.00),
('FAC-003', 'Podcast Room', 'Victoria Island Hub', '2026-09', 8, 2600.00, 68.00),
('FAC-004', 'Meeting Room', 'Victoria Island Hub', '2026-09', 10, 9800.00, 75.00),
('FAC-005', 'Executive Boardroom', 'London Main', '2026-09', 4, 6200.00, 80.00);

-- 18. System Notifications (5 Records)
INSERT INTO `system_notifications` (`user_id`, `title`, `message`, `type`, `is_read`, `related_entity`, `related_entity_id`, `created_at`) VALUES
('USR-001', 'New Booking Created', 'Booking BK-IPHIN-2026-1 created for Acme Enterprise Corp.', 'success', 0, 'bookings', 'BK-IPHIN-2026-1', '2026-09-01 08:30:00'),
('USR-002', 'Expense Logged', 'Expense EXP-2026-001 of $3,200 recorded for Fiber Optics Internet.', 'info', 0, 'expenses', 'EXP-2026-001', '2026-09-02 09:15:00'),
('USR-003', 'Payment Completed', 'Payment REF-2026-8003 of $6,200 received from Vertex Holdings Group.', 'success', 1, 'payments', 'PAY-003', '2026-09-02 07:50:00'),
('USR-004', 'Subscription Expiring Soon', 'Horizon Media Partners subscription expires in 2 days.', 'warning', 0, 'subscriptions', 'SUB-004', '2026-09-10 06:00:00'),
('USR-005', 'System Maintenance Scheduled', 'Quarterly server backup scheduled for Sunday 02:00 UTC.', 'info', 1, 'system', NULL, '2026-09-09 12:00:00');

-- 19. AI Conversations & Messages (5 Sessions / Messages)
INSERT INTO `ai_conversations` (`id`, `session_id`, `user_id`, `title`, `prompt`, `response`, `created_at`) VALUES
(1, 'SESS-101', 'USR-001', 'Monthly Revenue Insight', 'Summarize Q3 workspace revenue trends', 'Q3 Workspace revenue reached $61,500 across Lekki and London branches, representing a 14% month-over-month increase.', '2026-09-05 10:00:00'),
(2, 'SESS-102', 'USR-002', 'Expense Category Analysis', 'Which category generated the highest expenditure in September?', 'Software & Cloud and Utilities generated the highest expenses in September, totaling $9,900 combined.', '2026-09-06 11:30:00'),
(3, 'SESS-103', 'USR-003', 'Occupancy Forecast', 'What is the projected occupancy for Lekki Innovation Hub next month?', 'Lekki Innovation Hub is currently operating at 88.5% capacity with private offices fully booked.', '2026-09-07 14:15:00'),
(4, 'SESS-104', 'USR-004', 'Client Renewal Alerts', 'List clients with subscriptions expiring in 7 days', 'Horizon Media Partners (SUB-004) has 2 days remaining on their Podcast Room pass.', '2026-09-08 09:45:00'),
(5, 'SESS-105', 'USR-005', 'Payroll Audit Summary', 'Verify August payroll total payout across departments', 'Total net salary payout for August was $36,350 across 5 full-time staff members.', '2026-09-09 16:00:00');

INSERT INTO `ai_messages` (`conversation_id`, `sender`, `text`, `created_at`) VALUES
(1, 'user', 'Summarize Q3 workspace revenue trends', '2026-09-05 10:00:00'),
(1, 'assistant', 'Q3 Workspace revenue reached $61,500 across Lekki and London branches, representing a 14% month-over-month increase.', '2026-09-05 10:00:02'),
(2, 'user', 'Which category generated the highest expenditure in September?', '2026-09-06 11:30:00'),
(2, 'assistant', 'Software & Cloud and Utilities generated the highest expenses in September, totaling $9,900 combined.', '2026-09-06 11:30:02'),
(3, 'user', 'What is the projected occupancy for Lekki Innovation Hub next month?', '2026-09-07 14:15:00');

-- 20. Audit Logs (5 Records)
INSERT INTO `audit_logs` (`user`, `action`, `ip_address`, `entity`, `entity_id`, `previous_value`, `new_value`, `timestamp`) VALUES
('System Administrator', 'UPDATE_SETTINGS', '192.168.1.10', 'business_settings', '1', '{"business_name": "Nexus ERP"}', '{"business_name": "Workspace Management ERP"}', '2026-09-01 08:00:00'),
('Sarah Jenkins', 'CREATE_BOOKING', '192.168.1.15', 'bookings', 'BK-IPHIN-2026-1', NULL, '{"client": "Acme Enterprise Corp", "amount": 14500}', '2026-09-01 08:30:00'),
('Marcus Vance', 'CREATE_EXPENSE', '192.168.1.20', 'expenses', 'EXP-2026-001', NULL, '{"name": "Fiber Optics Internet", "amount": 3200}', '2026-09-02 09:15:00'),
('Elena Rostova', 'RECORD_COMMUNICATION', '192.168.1.25', 'client_communications', '4', NULL, '{"client_id": "CL-IPHIN-4", "type": "SMS"}', '2026-09-08 10:00:00'),
('David Miller', 'LOG_PAYROLL', '192.168.1.30', 'payroll_records', 'PAYROLL-001', NULL, '{"employee_id": "EMP-001", "net_salary": 10500}', '2026-08-31 17:00:00');

-- ============================================================================
-- END OF DUMMY DATABASE EXPORT
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
