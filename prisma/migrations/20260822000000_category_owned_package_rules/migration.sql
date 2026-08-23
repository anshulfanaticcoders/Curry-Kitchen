-- Package duration and verification are category rules. Existing Package columns
-- remain as historic snapshots and compatibility fields for custom packages.
-- The guards also allow a database previously updated through `prisma db push`
-- to adopt this migration later without a duplicate-column failure.
SET @duration_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'package_categories'
    AND COLUMN_NAME = 'deliveryDayCount'
);
SET @duration_statement := IF(
  @duration_column_exists = 0,
  'ALTER TABLE `package_categories` ADD COLUMN `deliveryDayCount` INTEGER NOT NULL DEFAULT 20',
  'DO 0'
);
PREPARE add_duration_column FROM @duration_statement;
EXECUTE add_duration_column;
DEALLOCATE PREPARE add_duration_column;

SET @verification_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'package_categories'
    AND COLUMN_NAME = 'requiresVerification'
);
SET @verification_statement := IF(
  @verification_column_exists = 0,
  'ALTER TABLE `package_categories` ADD COLUMN `requiresVerification` BOOLEAN NOT NULL DEFAULT false',
  'DO 0'
);
PREPARE add_verification_column FROM @verification_statement;
EXECUTE add_verification_column;
DEALLOCATE PREPARE add_verification_column;

UPDATE `package_categories`
SET `deliveryDayCount` = 5
WHERE LOWER(`slug`) LIKE '%weekly%' OR LOWER(`slug`) LIKE '%trial%';

UPDATE `package_categories`
SET `requiresVerification` = true
WHERE LOWER(`slug`) LIKE '%student%' OR LOWER(`slug`) LIKE '%military%';
