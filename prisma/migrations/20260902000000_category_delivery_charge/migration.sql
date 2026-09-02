-- Per-category delivery charge; NULL falls back to the global admin-settings charge.
ALTER TABLE `package_categories` ADD COLUMN `deliveryCharge` DECIMAL(10, 2) NULL;
