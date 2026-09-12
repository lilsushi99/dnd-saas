-- ============================================================================
-- MIGRATION: 001_add_invoice_prefix_and_settings.sql
-- Description: Adds invoice_prefix to business_settings, ensures LONGTEXT for logo/photos, and creates file_uploads
-- ============================================================================

-- 1. Ensure invoice_prefix exists in business_settings
SET @dbname = DATABASE();
SET @tablename = "business_settings";
SET @columnname = "invoice_prefix";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE business_settings ADD COLUMN invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV' AFTER tax_rate;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Ensure website and director_name exist
SET @columnname = "website";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE business_settings ADD COLUMN website VARCHAR(150) DEFAULT NULL AFTER email;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "director_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE business_settings ADD COLUMN director_name VARCHAR(100) DEFAULT NULL AFTER business_name;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Modify image storage columns to LONGTEXT
ALTER TABLE business_settings MODIFY COLUMN business_logo LONGTEXT DEFAULT NULL;
ALTER TABLE profile_settings MODIFY COLUMN profile_photo LONGTEXT DEFAULT NULL;

-- 4. Create file_uploads table if not exists
CREATE TABLE IF NOT EXISTS `file_uploads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` INT NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
