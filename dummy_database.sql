-- ============================================================================
-- NEXUS ERP - COMPLETE MySQL DATABASE SCHEMA & SEED DATA EXPORT
-- Database Engine: MySQL 8.0 / MariaDB
-- Character Set: utf8mb4 / utf8mb4_unicode_ci
-- Optimized for phpMyAdmin & Shared Hosting (Hostinger, cPanel, Namecheap, Bluehost, etc.)
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Drop Tables if Exists
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `file_uploads`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `system_notifications`;
DROP TABLE IF EXISTS `ai_conversations`;
DROP TABLE IF EXISTS `facility_analytics`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `booking_items`;
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

-- Enable Foreign Key checks
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
  `branch` VARCHAR(100) NOT NULL DEFAULT 'All Branches',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `profile_photo` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `business_name` VARCHAR(150) NOT NULL,
  `business_logo` TEXT DEFAULT NULL,
  `currency` VARCHAR(20) NOT NULL DEFAULT 'USD ($)',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC-05:00',
  `address` TEXT DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English (Default)',
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
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `profile_photo` VARCHAR(255) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `branches` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `location` TEXT DEFAULT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `created_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_facilities_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  KEY `idx_facilities_branch_id` (`branch_id`),
  KEY `idx_facilities_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_categories` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expense_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. CRM & CLIENT MANAGEMENT MODULE
-- ============================================================================

CREATE TABLE `clients` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `company` VARCHAR(150) DEFAULT NULL,
  `status` ENUM('Active', 'Inactive', 'VIP', 'Expiring Soon', 'Expired') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clients_name` (`name`),
  KEY `idx_clients_phone` (`phone`),
  KEY `idx_clients_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_communications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` VARCHAR(50) NOT NULL,
  `type` ENUM('Email', 'SMS', 'Call', 'Meeting', 'Note') NOT NULL DEFAULT 'Note',
  `summary` TEXT NOT NULL,
  `logged_by` VARCHAR(100) DEFAULT NULL,
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
  `date` DATE NOT NULL,
  `client_id` VARCHAR(50) NOT NULL,
  `client_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `branch` VARCHAR(100) NOT NULL,
  `facility` VARCHAR(100) NOT NULL,
  `days_count` INT NOT NULL DEFAULT 1,
  `time_duration` VARCHAR(100) NOT NULL DEFAULT '09:00 AM - 05:00 PM',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('Cash', 'Wire Transfer', 'Credit Card', 'Corporate Billing', 'POS Terminal') NOT NULL DEFAULT 'Wire Transfer',
  `days_used` INT NOT NULL DEFAULT 0,
  `days_left` INT NOT NULL DEFAULT 0,
  `status` ENUM('Active', 'Upcoming', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- ============================================================================
-- 5. FINANCE & EXPENSES MODULE
-- ============================================================================

CREATE TABLE `expenses` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `date` DATE NOT NULL,
  `branch` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('Paid', 'Approved', 'Pending', 'Rejected') NOT NULL DEFAULT 'Paid',
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'System Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
-- 6. ANALYTICS & FACILITY RECORDS MODULE
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
-- 7. AI ASSISTANT MODULE
-- ============================================================================

CREATE TABLE `ai_conversations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `prompt` TEXT NOT NULL,
  `response` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_conversations_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. NOTIFICATIONS & AUDIT LOGS MODULE
-- ============================================================================

CREATE TABLE `system_notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'warning', 'success', 'danger') NOT NULL DEFAULT 'info',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
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


-- ============================================================================
-- SEED DATA INSERTIONS
-- ============================================================================

-- 1. Users
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `branch`, `status`, `created_at`) VALUES
('USR-001', 'Alexander Wright', 'a.wright@enterprise-hub.com', '+234 803 111 2233', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Director', 'All Branches', 'Active', '2024-08-01 00:00:00'),
('USR-002', 'Sarah Jenkins', 's.jenkins@enterprise-hub.com', '+234 802 333 4455', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Manager', 'Lekki Innovation Hub', 'Active', '2025-01-15 00:00:00'),
('USR-003', 'Marcus Vance', 'm.vance@enterprise-hub.com', '+234 805 444 5566', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Accountant', 'Both Branches', 'Active', '2025-02-01 00:00:00'),
('USR-004', 'Elena Rostova', 'e.rostova@enterprise-hub.com', '+234 809 555 6677', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vj.G8F3s9a', 'Receptionist', 'Victoria Island Hub', 'Active', '2025-03-25 00:00:00');

-- 2. User Roles Permissions
INSERT INTO `user_roles_permissions` (`role`, `permissions`) VALUES
('Director', '{"crm": true, "reports": true, "expenses": true, "settings": true, "dashboard": true, "dailyLogger": true, "administration": true, "facilityRecords": true}'),
('Manager', '{"crm": true, "reports": true, "expenses": true, "settings": false, "dashboard": true, "dailyLogger": true, "administration": true, "facilityRecords": true}'),
('Receptionist', '{"crm": true, "reports": false, "expenses": false, "settings": false, "dashboard": true, "dailyLogger": true, "administration": false, "facilityRecords": true}'),
('Accountant', '{"crm": false, "reports": true, "expenses": true, "settings": false, "dashboard": true, "dailyLogger": false, "administration": false, "facilityRecords": true}');

-- 3. Business Settings
INSERT INTO `business_settings` (`id`, `business_name`, `business_logo`, `currency`, `timezone`, `address`, `phone`, `email`, `language`, `booking_prefix`, `client_prefix`, `expense_prefix`, `category_prefix`, `branch_code`) VALUES
(1, 'Hive Hub Enterprise ERP', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80', 'USD ($)', 'UTC-05:00 (Eastern Time)', '102 Executive Plaza, Suite 400, Innovation District', '+1 (555) 902-1823', 'admin@hivehuberp.com', 'English (Default)', 'BK', 'CL', 'EXP', 'EC', 'IPHIN');

-- 4. Profile Settings
INSERT INTO `profile_settings` (`id`, `user_id`, `full_name`, `email`, `phone`, `profile_photo`) VALUES
(1, 'USR-001', 'Alexander Wright', 'a.wright@enterprise-hub.com', '+1 (555) 902-1823', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80');

-- 5. Branches
INSERT INTO `branches` (`id`, `name`, `location`, `status`, `created_date`) VALUES
('BR-001', 'Lekki Innovation Hub', 'Plot 14 Admiralty Way, Lekki Phase 1, Lagos', 'Active', '2025-01-15'),
('BR-002', 'Victoria Island Hub', '7th Floor, Victoria Heights, VI, Lagos', 'Active', '2025-03-20'),
('BR-003', 'London Main', '12 Financial Square, Canary Wharf, London', 'Active', '2024-11-01'),
('BR-004', 'New York HQ', '450 Lexington Ave, Manhattan, New York', 'Active', '2024-09-10');

-- 6. Facilities
INSERT INTO `facilities` (`id`, `name`, `branch_id`, `branch_name`, `default_price`, `capacity`, `status`, `created_date`) VALUES
('FAC-001', 'Co-working Space', 'BR-001', 'Lekki Innovation Hub', 450.00, 20, 'Active', '2025-01-16'),
('FAC-002', 'Private Offices', 'BR-001', 'Lekki Innovation Hub', 1800.00, 5, 'Active', '2025-01-16'),
('FAC-003', 'Podcast Room', 'BR-002', 'Victoria Island Hub', 650.00, 1, 'Active', '2025-03-21'),
('FAC-004', 'Meeting Room', 'BR-002', 'Victoria Island Hub', 850.00, 2, 'Active', '2025-03-22'),
('FAC-005', 'Executive Office', 'BR-003', 'London Main', 2500.00, 2, 'Active', '2024-11-05'),
('FAC-006', 'Creative Design Studio', 'BR-004', 'New York HQ', 950.00, 8, 'Active', '2024-09-12');

-- 7. Expense Categories
INSERT INTO `expense_categories` (`id`, `name`, `description`, `status`, `created_date`) VALUES
('CAT-001', 'Fuel', 'Generator fuel & fleet petrol', 'Active', '2025-01-10'),
('CAT-002', 'Internet', 'Broadband, ISP & fiber optics bandwidth', 'Active', '2025-01-10'),
('CAT-003', 'Utilities', 'Electricity, water & waste services', 'Active', '2025-01-10'),
('CAT-004', 'Maintenance', 'Facility HVAC, repairs & elevator servicing', 'Active', '2025-01-10'),
('CAT-005', 'Cleaning', 'Janitorial supplies & hygiene contracts', 'Active', '2025-01-10'),
('CAT-006', 'Printing', 'Paper, toner & stationery items', 'Active', '2025-01-10'),
('CAT-007', 'Transport', 'Courier, staff logistics & travel', 'Active', '2025-01-10'),
('CAT-008', 'Rent', 'Property lease & space rental', 'Active', '2025-01-10'),
('CAT-009', 'Miscellaneous', 'Uncategorized operational expenses', 'Active', '2025-01-10');

-- 8. Clients
INSERT INTO `clients` (`id`, `name`, `phone`, `email`, `company`, `status`, `created_at`) VALUES
('CL-IPHIN-1', 'Acme Enterprise Corp', '+1 (555) 234-5678', 'billing@acme.com', 'Acme Enterprise', 'Active', '2026-08-01 08:30:00'),
('CL-IPHIN-2', 'GlobalTech Systems', '+1 (555) 345-6789', 'contact@globaltech.io', 'GlobalTech', 'Active', '2026-08-01 09:15:00'),
('CL-IPHIN-3', 'Vertex Holdings Group', '+44 20 7946 0912', 'accounts@vertexholdings.co.uk', 'Vertex Holdings', 'Active', '2026-08-02 07:45:00'),
('CL-IPHIN-4', 'Horizon Media Partners', '+1 (555) 987-6543', 'media@horizon.com', 'Horizon Media', 'Active', '2026-07-28 14:20:00'),
('CL-IPHIN-5', 'Apex Financial Services', '+81 3 5555 0143', 'finance@apex.jp', 'Apex Financial', 'Expired', '2026-07-14 11:00:00'),
('CL-IPHIN-6', 'Nexus Logistics Ltd', '+65 6789 0123', 'ops@nexuslogistics.sg', 'Nexus Logistics', 'Active', '2026-08-02 08:10:00'),
('CL-IPHIN-7', 'Aether Robotics Inc', '+1 (555) 432-1098', 'admin@aetherbotics.com', 'Aether Robotics', 'Expired', '2026-06-30 16:45:00');

-- 9. Client Communications
INSERT INTO `client_communications` (`client_id`, `type`, `summary`, `logged_by`, `created_at`) VALUES
('CL-IPHIN-1', 'Meeting', 'Initial onboarding meeting completed for 30-day desk workspace pass.', 'Sarah Jenkins', '2026-08-01 10:00:00'),
('CL-IPHIN-2', 'Email', 'Sent annual lease renewal proposal for Private Office Suites.', 'Alexander Wright', '2026-08-01 11:30:00'),
('CL-IPHIN-3', 'Call', 'Confirmed boardroom catering & AV setup requirements for VIP meeting.', 'Elena Rostova', '2026-08-02 09:00:00');

-- 10. Bookings
INSERT INTO `bookings` (`id`, `date`, `client_id`, `client_name`, `phone`, `email`, `branch`, `facility`, `days_count`, `time_duration`, `amount`, `payment_method`, `days_used`, `days_left`, `status`, `created_at`) VALUES
('BK-IPHIN-2026-1', '2026-08-01', 'CL-IPHIN-1', 'Acme Enterprise Corp', '+1 (555) 234-5678', 'billing@acme.com', 'London Main', 'Co-working Space', 30, '09:00 AM - 05:00 PM', 14500.00, 'Wire Transfer', 2, 28, 'Active', '2026-08-01 08:30:00'),
('BK-IPHIN-2026-2', '2026-08-01', 'CL-IPHIN-2', 'GlobalTech Systems', '+1 (555) 345-6789', 'contact@globaltech.io', 'New York HQ', 'Private Office Suites', 15, '08:00 AM - 06:00 PM', 28400.00, 'Credit Card', 2, 13, 'Active', '2026-08-01 09:15:00'),
('BK-IPHIN-2026-3', '2026-08-02', 'CL-IPHIN-3', 'Vertex Holdings Group', '+44 20 7946 0912', 'accounts@vertexholdings.co.uk', 'London Main', 'Executive Boardroom', 3, '09:00 AM - 05:00 PM', 6200.00, 'Corporate Billing', 1, 2, 'Active', '2026-08-02 07:45:00'),
('BK-IPHIN-2026-4', '2026-08-05', 'CL-IPHIN-4', 'Horizon Media Partners', '+1 (555) 987-6543', 'media@horizon.com', 'Tokyo Hub', 'Event Pavilion', 2, '10:00 AM - 08:00 PM', 18500.00, 'Wire Transfer', 0, 2, 'Upcoming', '2026-07-28 14:20:00'),
('BK-IPHIN-2026-5', '2026-07-15', 'CL-IPHIN-5', 'Apex Financial Services', '+81 3 5555 0143', 'finance@apex.jp', 'Tokyo Hub', 'Dedicated Desk Hub', 14, '09:00 AM - 05:00 PM', 9800.00, 'Credit Card', 14, 0, 'Expired', '2026-07-14 11:00:00'),
('BK-IPHIN-2026-6', '2026-08-02', 'CL-IPHIN-6', 'Nexus Logistics Ltd', '+65 6789 0123', 'ops@nexuslogistics.sg', 'Singapore Hub', 'Conference Hall', 5, '09:00 AM - 05:00 PM', 12400.00, 'Cash', 1, 4, 'Active', '2026-08-02 08:10:00'),
('BK-IPHIN-2026-7', '2026-07-01', 'CL-IPHIN-7', 'Aether Robotics Inc', '+1 (555) 432-1098', 'admin@aetherbotics.com', 'Paris Depot', 'Co-working Space', 30, '09:00 AM - 05:00 PM', 11200.00, 'Credit Card', 30, 0, 'Expired', '2026-06-30 16:45:00');

-- 11. Booking Items
INSERT INTO `booking_items` (`booking_id`, `item_name`, `unit_price`, `quantity`, `total_price`) VALUES
('BK-IPHIN-2026-1', 'Monthly Desk Pass', 14500.00, 1, 14500.00),
('BK-IPHIN-2026-2', 'Private Office Suite Reservation', 28400.00, 1, 28400.00),
('BK-IPHIN-2026-3', 'Executive Boardroom Hourly Rental', 2066.67, 3, 6200.00);

-- 12. Expenses
INSERT INTO `expenses` (`id`, `name`, `amount`, `date`, `branch`, `category`, `description`, `status`, `created_by`, `created_at`) VALUES
('EXP-2026-0041', 'High-Speed Fiber Optics Internet', 3200.00, '2026-08-02', 'Both Branches', 'Utilities', 'Monthly high-speed Dedicated Bandwidth ISP subscription split across facilities.', 'Paid', 'Sarah Jenkins (Finance)', '2026-08-02 09:15:00'),
('EXP-2026-0042', 'HVAC Air Conditioning Maintenance', 1850.00, '2026-08-01', 'Art & Tech Hub', 'Maintenance', 'Quarterly filter replacement and compressor tuning.', 'Paid', 'David Miller (Ops)', '2026-08-01 14:20:00'),
('EXP-2026-0043', 'Janitorial & Cleaning Supplies', 940.00, '2026-08-01', 'Hive Hub', 'Supplies', 'Eco-friendly sanitisers, paper towels, and restroom restocking.', 'Paid', 'Elena Rostova', '2026-08-01 11:00:00'),
('EXP-2026-0044', 'Facility Software Licenses (ERP/CRM)', 4500.00, '2026-07-28', 'Both Branches', 'Software', 'Cloud infrastructure hosting and security compliance licenses.', 'Paid', 'Tech Lead', '2026-07-28 10:00:00'),
('EXP-2026-0045', 'Executive Boardroom Catering', 1200.00, '2026-07-25', 'London Main', 'Operations', 'Catering services for VIP Client conference session.', 'Paid', 'Sarah Jenkins', '2026-07-25 16:00:00'),
('EXP-2026-0046', 'Digital Marketing & Social Ads', 2800.00, '2026-07-15', 'New York HQ', 'Marketing', 'Q3 digital acquisition campaign targeting tech startups.', 'Approved', 'Marketing Director', '2026-07-15 09:30:00'),
('EXP-2026-0047', 'Security Guard Payroll', 5400.00, '2026-07-01', 'Both Branches', 'Payroll', 'Monthly 24/7 access control security team payroll.', 'Paid', 'HR Dept', '2026-07-01 08:00:00');

-- 13. Payments
INSERT INTO `payments` (`id`, `reference`, `booking_id`, `client_id`, `amount`, `payment_method`, `payment_date`, `status`, `created_at`) VALUES
('PAY-001', 'REF-2026-8001', 'BK-IPHIN-2026-1', 'CL-IPHIN-1', 14500.00, 'Wire Transfer', '2026-08-01', 'Completed', '2026-08-01 08:35:00'),
('PAY-002', 'REF-2026-8002', 'BK-IPHIN-2026-2', 'CL-IPHIN-2', 28400.00, 'Credit Card', '2026-08-01', 'Completed', '2026-08-01 09:20:00'),
('PAY-003', 'REF-2026-8003', 'BK-IPHIN-2026-3', 'CL-IPHIN-3', 6200.00, 'Corporate Billing', '2026-08-02', 'Completed', '2026-08-02 07:50:00');

-- 14. Facility Analytics
INSERT INTO `facility_analytics` (`facility_id`, `facility_name`, `branch_name`, `period`, `total_bookings`, `total_revenue`, `occupancy_rate`) VALUES
('FAC-001', 'Co-working Space', 'Lekki Innovation Hub', '2026-08', 12, 14500.00, 85.50),
('FAC-002', 'Private Offices', 'Lekki Innovation Hub', '2026-08', 5, 28400.00, 92.00),
('FAC-003', 'Podcast Room', 'Victoria Island Hub', '2026-08', 8, 5200.00, 68.00),
('FAC-004', 'Meeting Room', 'Victoria Island Hub', '2026-08', 10, 8500.00, 75.00);

-- 15. System Notifications
INSERT INTO `system_notifications` (`title`, `message`, `type`, `is_read`, `created_at`) VALUES
('New Booking Created', 'Booking BK-IPHIN-2026-3 created for Vertex Holdings Group.', 'success', 0, '2026-08-02 07:45:00'),
('Expense Payment Recorded', 'Expense EXP-2026-0041 of $3,200 recorded for Internet Bandwidth.', 'info', 0, '2026-08-02 09:15:00'),
('Subscription Expiring Soon', 'Apex Financial Services subscription has expired.', 'warning', 0, '2026-07-29 00:00:00');

-- 16. Audit Logs
INSERT INTO `audit_logs` (`user`, `action`, `ip_address`, `entity`, `entity_id`, `previous_value`, `new_value`, `timestamp`) VALUES
('Alexander Wright', 'UPDATE_SETTINGS', '192.168.1.10', 'business_settings', '1', '{"business_name": "Hive Hub ERP"}', '{"business_name": "Hive Hub Enterprise ERP"}', '2026-08-01 08:00:00'),
('Sarah Jenkins', 'CREATE_BOOKING', '192.168.1.15', 'bookings', 'BK-IPHIN-2026-1', NULL, '{"client": "Acme Enterprise Corp", "amount": 14500}', '2026-08-01 08:30:00'),
('Marcus Vance', 'CREATE_EXPENSE', '192.168.1.20', 'expenses', 'EXP-2026-0041', NULL, '{"name": "Fiber Optics Internet", "amount": 3200}', '2026-08-02 09:15:00');

-- ============================================================================
-- END OF SQL DUMP
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
