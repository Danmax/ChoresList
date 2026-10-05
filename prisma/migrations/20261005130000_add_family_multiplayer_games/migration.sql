CREATE TABLE `FamilyMultiplayerMatch` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `gameKey` VARCHAR(64) NOT NULL,
  `playerOneId` CHAR(36) NOT NULL,
  `playerTwoId` CHAR(36) NOT NULL,
  `currentTurn` VARCHAR(32) NOT NULL DEFAULT 'player-one',
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `state` JSON NOT NULL,
  `result` VARCHAR(32) NULL,
  `lastMoveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `family_multiplayer_household_ix`(`householdId`, `gameKey`, `status`, `lastMoveAt`),
  INDEX `family_multiplayer_players_ix`(`playerOneId`, `playerTwoId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `family_multiplayer_household_fk` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `family_multiplayer_player_one_fk` FOREIGN KEY (`playerOneId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `family_multiplayer_player_two_fk` FOREIGN KEY (`playerTwoId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyMultiplayerMove` (
  `id` CHAR(36) NOT NULL,
  `matchId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `turn` INT NOT NULL,
  `data` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `family_multiplayer_move_turn_uq`(`matchId`, `turn`),
  PRIMARY KEY (`id`),
  CONSTRAINT `family_multiplayer_move_match_fk` FOREIGN KEY (`matchId`) REFERENCES `FamilyMultiplayerMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
