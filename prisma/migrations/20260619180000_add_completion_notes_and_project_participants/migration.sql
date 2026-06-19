ALTER TABLE `TaskCompletion`
  ADD COLUMN `completionNote` TEXT NULL;

CREATE TABLE `HouseProjectParticipant` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `projectId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `completedAt` DATETIME(3) NULL,
  `reactionEmoji` VARCHAR(32) NULL,
  `completionNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `HouseProjectParticipant_projectId_memberId_key`(`projectId`, `memberId`),
  INDEX `HouseProjectParticipant_householdId_memberId_idx`(`householdId`, `memberId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `HouseProjectParticipant` (`id`, `householdId`, `projectId`, `memberId`, `createdAt`)
SELECT UUID(), `householdId`, `id`, `assignedTo`, `createdAt`
FROM `HouseProject`
WHERE `assignedTo` IS NOT NULL;

ALTER TABLE `HouseProjectParticipant`
  ADD CONSTRAINT `HouseProjectParticipant_householdId_fkey`
    FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `HouseProjectParticipant_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `HouseProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `HouseProjectParticipant_memberId_fkey`
    FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
