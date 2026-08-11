-- AlterTable
ALTER TABLE `student_verifications` ADD COLUMN `verificationType` ENUM('STUDENT', 'MILITARY') NOT NULL DEFAULT 'STUDENT';
