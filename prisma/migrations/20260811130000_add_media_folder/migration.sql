-- AlterTable
ALTER TABLE `media_assets` ADD COLUMN `folder` VARCHAR(191) NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE INDEX `media_assets_folder_idx` ON `media_assets`(`folder`);
