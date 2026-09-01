CREATE TABLE `business_holidays` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `createdByUserId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `business_holidays_status_startDate_endDate_idx`(`status`, `startDate`, `endDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `holiday_delivery_credits` (
  `id` VARCHAR(191) NOT NULL,
  `businessHolidayId` VARCHAR(191) NOT NULL,
  `customerPackageId` VARCHAR(191) NOT NULL,
  `originalDeliveryDayId` VARCHAR(191) NOT NULL,
  `replacementDeliveryDayId` VARCHAR(191) NOT NULL,
  `originalDeliveryDate` DATETIME(3) NOT NULL,
  `replacementDeliveryDate` DATETIME(3) NOT NULL,
  `originalMenuSummary` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `holiday_credit_original_day_key`(`businessHolidayId`, `originalDeliveryDayId`),
  INDEX `holiday_delivery_credits_customerPackageId_idx`(`customerPackageId`),
  INDEX `holiday_delivery_credits_replacementDeliveryDayId_idx`(`replacementDeliveryDayId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `holiday_delivery_credits`
  ADD CONSTRAINT `holiday_delivery_credits_businessHolidayId_fkey`
  FOREIGN KEY (`businessHolidayId`) REFERENCES `business_holidays`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `holiday_delivery_credits`
  ADD CONSTRAINT `holiday_delivery_credits_customerPackageId_fkey`
  FOREIGN KEY (`customerPackageId`) REFERENCES `customer_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
