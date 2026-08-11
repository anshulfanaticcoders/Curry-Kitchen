CREATE TABLE `seo_records` (
  `id` VARCHAR(191) NOT NULL,
  `page` VARCHAR(191) NOT NULL,
  `path` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `indexed` BOOLEAN NOT NULL DEFAULT true,
  `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `seo_records_path_key`(`path`),
  INDEX `seo_records_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
