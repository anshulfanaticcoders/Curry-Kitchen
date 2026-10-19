ALTER TABLE `customers` ADD COLUMN `calendarRevision` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `customer_packages` ADD COLUMN `unrepresentedUsedDays` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `manual_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `deliveryDate` DATETIME(3) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `treatment` ENUM('AWAITING_RENEWAL', 'COMPLIMENTARY', 'PACKAGE', 'VOIDED') NOT NULL DEFAULT 'AWAITING_RENEWAL',
    `packageDeliveryDayId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `manual_deliveries_packageDeliveryDayId_key` (`packageDeliveryDayId`),
    INDEX `manual_deliveries_customerId_deliveryDate_idx` (`customerId`, `deliveryDate`),
    PRIMARY KEY (`id`),
    CONSTRAINT `manual_deliveries_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `manual_deliveries_packageDeliveryDayId_fkey` FOREIGN KEY (`packageDeliveryDayId`) REFERENCES `package_delivery_days` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
