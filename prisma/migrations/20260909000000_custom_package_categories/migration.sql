-- Categories own the "choose one" rule and input style. Individual dishes keep
-- their own price and minimum portion, so customers can choose one dal rather
-- than being forced to buy every dal variant.
CREATE TABLE `custom_package_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `quantityControl` ENUM('COUNTER', 'INPUT') NOT NULL DEFAULT 'INPUT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `custom_package_categories_slug_key`(`slug`),
    INDEX `custom_package_categories_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `custom_package_items`
    ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `imageUrl` VARCHAR(600) NULL;

INSERT INTO `custom_package_categories`
  (`id`, `name`, `slug`, `description`, `required`, `quantityControl`, `sortOrder`, `status`, `createdAt`, `updatedAt`)
VALUES
  ('custom-category-dal', 'Dal', 'dal', 'Choose one warm dal for your plate.', false, 'INPUT', 10, 'ACTIVE', NOW(3), NOW(3)),
  ('custom-category-rice', 'Rice', 'rice', 'Choose a satisfying rice portion.', false, 'INPUT', 20, 'ACTIVE', NOW(3), NOW(3)),
  ('custom-category-breads', 'Breads', 'breads', 'Fresh breads for every tiffin.', false, 'COUNTER', 30, 'ACTIVE', NOW(3), NOW(3)),
  ('custom-category-sabzi', 'Sabzi', 'sabzi', 'Seasonal vegetable dishes made fresh.', false, 'INPUT', 40, 'ACTIVE', NOW(3), NOW(3)),
  ('custom-category-sides', 'Sides', 'sides', 'Optional fresh finishing touches.', false, 'INPUT', 50, 'ACTIVE', NOW(3), NOW(3)),
  ('custom-category-other', 'Other', 'other', 'More options for your custom tiffin.', false, 'INPUT', 60, 'ACTIVE', NOW(3), NOW(3));

UPDATE `custom_package_items`
SET `categoryId` = CASE
  WHEN LOWER(`name`) REGEXP 'roti|naan|paratha|bread' THEN 'custom-category-breads'
  WHEN LOWER(`name`) REGEXP 'rice|biryani|pulao' THEN 'custom-category-rice'
  WHEN LOWER(`name`) REGEXP 'dal|daal|lentil' THEN 'custom-category-dal'
  WHEN LOWER(`name`) REGEXP 'sabzi|sabji|vegetable|paneer' THEN 'custom-category-sabzi'
  WHEN LOWER(`name`) REGEXP 'raita|salad|pickle|dessert|sweet' THEN 'custom-category-sides'
  ELSE 'custom-category-other'
END;

-- Preserve the current storefront behaviour during the transition: groups that
-- contained a mandatory item become mandatory groups.
UPDATE `custom_package_categories` category_row
JOIN `custom_package_items` item ON item.`categoryId` = category_row.`id`
SET category_row.`required` = true
WHERE item.`required` = true;

ALTER TABLE `custom_package_items`
    MODIFY COLUMN `categoryId` VARCHAR(191) NOT NULL,
    ADD INDEX `custom_package_items_categoryId_idx`(`categoryId`),
    ADD CONSTRAINT `custom_package_items_categoryId_fkey`
      FOREIGN KEY (`categoryId`) REFERENCES `custom_package_categories`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;
