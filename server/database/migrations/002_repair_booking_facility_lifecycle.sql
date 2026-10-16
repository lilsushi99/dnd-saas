-- ============================================================================
-- MIGRATION: 002_repair_booking_facility_lifecycle.sql
-- Description:
--   1. Adds pricing_basis to facilities (Per Day, Per Hour)
--   2. Adds duration_unit, start_time, end_time to bookings
--   3. Makes phone nullable/default-empty on clients and bookings
--   4. Updates payment_method column on bookings to allow Transfer and Cash without clipping historical values
--   5. Updates status column on bookings to allow Expiring Soon
-- ============================================================================

-- 1. Ensure pricing_basis in facilities
SET @dbname = DATABASE();
SET @tablename = "facilities";
SET @columnname = "pricing_basis";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE facilities ADD COLUMN pricing_basis VARCHAR(20) NOT NULL DEFAULT 'Per Day' AFTER default_price;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ensure all facilities have a safe default pricing_basis
UPDATE facilities SET pricing_basis = 'Per Day' WHERE pricing_basis IS NULL OR pricing_basis = '';

-- 2. Ensure duration_unit in bookings
SET @tablename = "bookings";
SET @columnname = "duration_unit";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE bookings ADD COLUMN duration_unit VARCHAR(20) NOT NULL DEFAULT 'Day' AFTER days_count;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ensure start_time and end_time exist in bookings
SET @columnname = "start_time";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE bookings ADD COLUMN start_time TIME DEFAULT '09:00:00' AFTER date;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "end_time";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE bookings ADD COLUMN end_time TIME DEFAULT '17:00:00' AFTER start_time;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Modify phone in bookings and clients to allow empty string / default ''
ALTER TABLE bookings MODIFY COLUMN phone VARCHAR(50) DEFAULT '';
ALTER TABLE clients MODIFY COLUMN phone VARCHAR(50) DEFAULT '';

-- 4. Modify payment_method to VARCHAR(50) to support Transfer and Cash alongside legacy records
ALTER TABLE bookings MODIFY COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'Transfer';

-- 5. Modify status to VARCHAR(30) to support Expiring Soon alongside Active, Upcoming, Expired, Cancelled
ALTER TABLE bookings MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Active';
