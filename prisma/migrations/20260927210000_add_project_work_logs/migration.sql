ALTER TABLE `HouseProject`
  ADD COLUMN `progressPercent` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `ProjectWorkLog` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `projectId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `note` TEXT NULL,
  `minutesWorked` INTEGER NOT NULL DEFAULT 0,
  `progressPercent` INTEGER NULL,
  `photoUrl` VARCHAR(512) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProjectWorkLog_projectId_createdAt_idx` (`projectId`, `createdAt`),
  INDEX `ProjectWorkLog_householdId_memberId_idx` (`householdId`, `memberId`),
  CONSTRAINT `ProjectWorkLog_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectWorkLog_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `HouseProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProjectWorkLog_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
