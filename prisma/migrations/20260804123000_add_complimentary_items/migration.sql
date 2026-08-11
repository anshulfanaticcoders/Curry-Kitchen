-- CreateTable
CREATE TABLE `complimentary_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `complimentary_items_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_complimentary_items` (
    `packageId` VARCHAR(191) NOT NULL,
    `complimentaryItemId` VARCHAR(191) NOT NULL,

    INDEX `package_complimentary_items_complimentaryItemId_idx`(`complimentaryItemId`),
    PRIMARY KEY (`packageId`, `complimentaryItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_complimentary_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `complimentaryItemId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    INDEX `order_complimentary_items_orderItemId_idx`(`orderItemId`),
    INDEX `order_complimentary_items_complimentaryItemId_idx`(`complimentaryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `package_complimentary_items` ADD CONSTRAINT `package_complimentary_items_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_complimentary_items` ADD CONSTRAINT `package_complimentary_items_complimentaryItemId_fkey` FOREIGN KEY (`complimentaryItemId`) REFERENCES `complimentary_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_complimentary_items` ADD CONSTRAINT `order_complimentary_items_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
