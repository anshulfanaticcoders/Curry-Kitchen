ALTER TABLE `seo_records`
  MODIFY `title` VARCHAR(191) NULL,
  MODIFY `description` TEXT NULL,
  ADD COLUMN `targetType` ENUM('STATIC_PAGE', 'PACKAGE') NOT NULL DEFAULT 'STATIC_PAGE',
  ADD COLUMN `packageId` VARCHAR(191) NULL,
  ADD COLUMN `ogTitle` VARCHAR(191) NULL,
  ADD COLUMN `ogDescription` TEXT NULL,
  ADD COLUMN `ogImageUrl` VARCHAR(600) NULL,
  ADD COLUMN `ogImageAlt` VARCHAR(191) NULL,
  ADD COLUMN `includeInSitemap` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `schemaEnabled` BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX `seo_records_packageId_key` ON `seo_records`(`packageId`);
CREATE INDEX `seo_records_targetType_idx` ON `seo_records`(`targetType`);

ALTER TABLE `seo_records`
  ADD CONSTRAINT `seo_records_packageId_fkey`
  FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
