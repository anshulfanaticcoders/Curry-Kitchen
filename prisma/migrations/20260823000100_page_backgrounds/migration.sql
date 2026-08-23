-- Admin-managed public-page background overrides.
CREATE TABLE `page_backgrounds` (
  `id` VARCHAR(191) NOT NULL,
  `slot` VARCHAR(191) NOT NULL,
  `imageUrl` VARCHAR(600) NOT NULL,
  `focalPoint` ENUM('LEFT', 'CENTER', 'RIGHT') NOT NULL DEFAULT 'CENTER',
  `overlay` ENUM('NONE', 'LIGHT', 'MEDIUM', 'DARK') NOT NULL DEFAULT 'DARK',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `page_backgrounds_slot_key`(`slot`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
