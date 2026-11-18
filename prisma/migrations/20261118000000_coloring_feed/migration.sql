CREATE TABLE `ColoringPost` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `title` VARCHAR(80) NOT NULL,
  `sceneId` VARCHAR(64) NOT NULL,
  `image` MEDIUMBLOB NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ColoringPost_householdId_createdAt_id_idx` (`householdId`, `createdAt`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ColoringPost_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ColoringPost_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
