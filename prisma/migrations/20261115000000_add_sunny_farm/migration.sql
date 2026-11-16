CREATE TABLE `FarmProgress` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `state` JSON NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `FarmProgress_memberId_key` (`memberId`),
  INDEX `FarmProgress_householdId_idx` (`householdId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FarmProgress_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FarmProgress_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
