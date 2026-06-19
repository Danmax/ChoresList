CREATE TABLE `WellbeingCheckIn` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `recordedByParentId` CHAR(36) NOT NULL,
  `mood` VARCHAR(32) NOT NULL,
  `note` TEXT NULL,
  `supportRequested` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `WellbeingCheckIn_householdId_createdAt_idx`(`householdId`, `createdAt`),
  INDEX `WellbeingCheckIn_memberId_createdAt_idx`(`memberId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WellbeingCheckIn`
  ADD CONSTRAINT `WellbeingCheckIn_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WellbeingCheckIn_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WellbeingCheckIn_recordedByParentId_fkey` FOREIGN KEY (`recordedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
