ALTER TABLE `EducationProject`
  ADD COLUMN `submissionTitle` VARCHAR(255) NULL,
  ADD COLUMN `submissionDescription` TEXT NULL,
  ADD COLUMN `submissionFiles` JSON NULL,
  ADD COLUMN `submittedAt` DATETIME(3) NULL;
