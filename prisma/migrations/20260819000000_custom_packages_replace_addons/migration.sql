-- Add-ons and complimentary items are removed from the product entirely and
-- replaced by customer-built custom packages.
--
-- DELIBERATELY NOT DROPPED: `order_addons` and `order_complimentary_items`.
-- Those rows are historical records of what was actually sold. No application
-- code reads them any more, but dropping them destroys sales history and cannot
-- be rolled back. Drop them in a follow-up migration once the data is confirmed
-- expendable.
--
-- Every statement here is idempotent. This has to run against databases built
-- by `prisma db push` (dev) as well as by migration history (prod), so nothing
-- may assume a constraint or column is present, and a re-run after a partial
-- failure must not error.

-- The FK into `addons` has to go before `addons` can be dropped, even though
-- the `order_addons` table itself stays. MySQL has no DROP FOREIGN KEY IF
-- EXISTS, hence the information_schema guard.
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_addons'
      AND CONSTRAINT_NAME = 'order_addons_addonId_fkey'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @stmt := IF(
    @fk_exists > 0,
    'ALTER TABLE `order_addons` DROP FOREIGN KEY `order_addons_addonId_fkey`',
    'DO 0'
);
PREPARE drop_fk FROM @stmt;
EXECUTE drop_fk;
DEALLOCATE PREPARE drop_fk;

-- Catalogue + join tables: pure configuration, safe to drop.
DROP TABLE IF EXISTS `cart_item_addons`;
DROP TABLE IF EXISTS `package_addons`;
DROP TABLE IF EXISTS `package_complimentary_items`;
DROP TABLE IF EXISTS `addons`;
DROP TABLE IF EXISTS `complimentary_items`;

-- The server-side cart was never written to; the live cart is client-side.
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `carts`;

-- `menu_items` had a model and server actions but zero callers.
DROP TABLE IF EXISTS `menu_items`;

-- Custom packages ---------------------------------------------------------

-- Marks the hidden Package rows materialised for each custom order, so a future
-- "restore archived packages" feature can never resurrect them into the storefront.
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'packages'
      AND COLUMN_NAME = 'isCustom'
);
SET @stmt := IF(
    @col_exists = 0,
    'ALTER TABLE `packages` ADD COLUMN `isCustom` BOOLEAN NOT NULL DEFAULT false',
    'DO 0'
);
PREPARE add_col FROM @stmt;
EXECUTE add_col;
DEALLOCATE PREPARE add_col;

CREATE TABLE IF NOT EXISTS `custom_package_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `unitLabel` VARCHAR(191) NOT NULL DEFAULT 'oz',
    `pricePerUnit` DECIMAL(10, 2) NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custom_package_items_slug_key`(`slug`),
    INDEX `custom_package_items_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
