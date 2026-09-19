-- Apply the kitchen's new policy without replacing unrelated admin settings.
INSERT INTO `settings` (`key`, `value`, `updatedAt`)
VALUES ('admin_settings', JSON_OBJECT('deliveryWindowStart', '10:00', 'deliveryWindowEnd', '18:00', 'orderCutoff', '20:00'), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `value` = JSON_SET(COALESCE(`value`, JSON_OBJECT()), '$.deliveryWindowStart', '10:00', '$.deliveryWindowEnd', '18:00', '$.orderCutoff', '20:00'),
  `updatedAt` = CURRENT_TIMESTAMP(3);

ALTER TABLE `package_delivery_days` ALTER COLUMN `deliveryWindow` SET DEFAULT '10:00 AM - 6:00 PM';

-- Preserve historical and completed deliveries; only update outstanding schedules.
UPDATE `package_delivery_days`
SET `deliveryWindow` = '10:00 AM - 6:00 PM'
WHERE `deliveryDate` >= UTC_DATE()
  AND `status` IN ('PENDING_PAYMENT', 'PAID', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'PAUSED');
