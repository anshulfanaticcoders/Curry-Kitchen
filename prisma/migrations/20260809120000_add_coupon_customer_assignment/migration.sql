-- AlterTable
ALTER TABLE `coupons` ADD COLUMN `customerId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `coupons_customerId_idx` ON `coupons`(`customerId`);

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
