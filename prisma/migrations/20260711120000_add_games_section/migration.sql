CREATE TABLE `GameSetting` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `gameKey` VARCHAR(64) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `rewardType` VARCHAR(32) NOT NULL DEFAULT 'points',
  `rewardPoints` INTEGER NOT NULL DEFAULT 5,
  `rewardTickets` INTEGER NOT NULL DEFAULT 0,
  `requiresChoresComplete` BOOLEAN NOT NULL DEFAULT false,
  `dailyPlayLimit` INTEGER NOT NULL DEFAULT 3,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `GameSetting_householdId_gameKey_key`(`householdId`, `gameKey`),
  INDEX `GameSetting_householdId_enabled_idx`(`householdId`, `enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GameSession` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `gameKey` VARCHAR(64) NOT NULL,
  `score` INTEGER NOT NULL DEFAULT 0,
  `durationSeconds` INTEGER NOT NULL DEFAULT 0,
  `rewardType` VARCHAR(32) NOT NULL DEFAULT 'none',
  `rewardPoints` INTEGER NOT NULL DEFAULT 0,
  `rewardTickets` INTEGER NOT NULL DEFAULT 0,
  `metadata` JSON NULL,
  `playedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `GameSession_householdId_playedAt_idx`(`householdId`, `playedAt`),
  INDEX `GameSession_memberId_gameKey_playedAt_idx`(`memberId`, `gameKey`, `playedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GameSetting`
  ADD CONSTRAINT `GameSetting_householdId_fkey`
  FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GameSession`
  ADD CONSTRAINT `GameSession_householdId_fkey`
  FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GameSession`
  ADD CONSTRAINT `GameSession_memberId_fkey`
  FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
