CREATE TABLE `FamilyChessEmote` (
  `id` CHAR(36) NOT NULL,
  `matchId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `emoji` VARCHAR(16) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `FamilyChessEmote_matchId_createdAt_idx` (`matchId`, `createdAt`),
  CONSTRAINT `FamilyChessEmote_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `FamilyChessMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FamilyChessEmote_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
