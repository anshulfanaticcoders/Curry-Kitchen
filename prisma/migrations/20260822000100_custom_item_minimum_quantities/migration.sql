SET @minimum_column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'custom_package_items'
    AND COLUMN_NAME = 'minQuantity'
);

SET @minimum_statement := IF(
  @minimum_column_exists = 0,
  'ALTER TABLE `custom_package_items` ADD COLUMN `minQuantity` INTEGER NOT NULL DEFAULT 1',
  'DO 0'
);

PREPARE add_minimum_quantity FROM @minimum_statement;
EXECUTE add_minimum_quantity;
DEALLOCATE PREPARE add_minimum_quantity;
