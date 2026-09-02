-- Customer-declared allergies captured at checkout; NULL means none declared.
ALTER TABLE `orders` ADD COLUMN `allergies` TEXT NULL;
