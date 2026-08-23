SET @featured_column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'packages'
    AND COLUMN_NAME = 'isFeatured'
);

SET @featured_column_statement := IF(
  @featured_column_exists = 0,
  'ALTER TABLE `packages` ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false',
  'DO 0'
);

PREPARE add_featured_column FROM @featured_column_statement;
EXECUTE add_featured_column;
DEALLOCATE PREPARE add_featured_column;

-- Keep the existing Home section populated after this migration. Admins can
-- change these selections from Packages at any time.
UPDATE `packages`
SET `isFeatured` = true
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT `id`
    FROM `packages`
    WHERE `status` = 'ACTIVE' AND `isCustom` = false
    ORDER BY `createdAt` ASC
    LIMIT 3
  ) AS featured_candidates
);
