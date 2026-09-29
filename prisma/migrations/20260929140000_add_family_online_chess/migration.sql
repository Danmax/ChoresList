CREATE TABLE `FamilyChessMatch` (
  `id` CHAR(36) NOT NULL, `householdId` CHAR(36) NOT NULL, `whiteMemberId` CHAR(36) NOT NULL, `blackMemberId` CHAR(36) NOT NULL,
  `currentTurn` VARCHAR(16) NOT NULL DEFAULT 'white', `status` VARCHAR(32) NOT NULL DEFAULT 'active', `fen` VARCHAR(128) NOT NULL,
  `result` VARCHAR(32) NULL, `lastMoveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `family_chess_household_ix`(`householdId`, `status`, `lastMoveAt`), INDEX `family_chess_players_ix`(`whiteMemberId`, `blackMemberId`, `status`), PRIMARY KEY (`id`),
  CONSTRAINT `family_chess_household_fk` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `family_chess_white_fk` FOREIGN KEY (`whiteMemberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `family_chess_black_fk` FOREIGN KEY (`blackMemberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `FamilyChessMove` (
  `id` CHAR(36) NOT NULL, `matchId` CHAR(36) NOT NULL, `memberId` CHAR(36) NOT NULL, `ply` INTEGER NOT NULL,
  `san` VARCHAR(32) NOT NULL, `from` VARCHAR(2) NOT NULL, `to` VARCHAR(2) NOT NULL, `promotion` VARCHAR(8) NULL, `fen` VARCHAR(128) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `family_chess_move_ply_uq`(`matchId`, `ply`), PRIMARY KEY (`id`),
  CONSTRAINT `family_chess_move_fk` FOREIGN KEY (`matchId`) REFERENCES `FamilyChessMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
