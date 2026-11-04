ALTER TABLE `customer_packages` ADD COLUMN `purchasedDeliveryDays` INTEGER NULL;
ALTER TABLE `package_delivery_days` ADD COLUMN `requiresConfirmation` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `manual_deliveries`
  ADD COLUMN `status` ENUM('PENDING_PAYMENT', 'PAID', 'ACCEPTED', 'DECLINED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'DELIVERED',
  ADD COLUMN `sourcePackageId` VARCHAR(191) NULL;
CREATE INDEX `manual_deliveries_sourcePackageId_idx` ON `manual_deliveries`(`sourcePackageId`);
ALTER TABLE `manual_deliveries` ADD CONSTRAINT `manual_deliveries_sourcePackageId_fkey`
  FOREIGN KEY (`sourcePackageId`) REFERENCES `customer_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
