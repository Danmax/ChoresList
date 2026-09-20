CREATE TABLE `CommunitySecretSantaExchange` (
  `id` CHAR(36) NOT NULL,
  `groupId` CHAR(36) NOT NULL,
  `createdByParentId` CHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `eventDate` DATETIME(3) NULL,
  `signupDeadline` DATETIME(3) NULL,
  `budgetCents` INTEGER NULL,
  `instructions` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'signup',
  `preventSameHousehold` BOOLEAN NOT NULL DEFAULT true,
  `drawnAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CommunitySecretSantaExchange_groupId_status_idx` (`groupId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySecretSantaParticipant` (
  `id` CHAR(36) NOT NULL,
  `exchangeId` CHAR(36) NOT NULL,
  `communityParticipantId` CHAR(36) NOT NULL,
  `recipientId` CHAR(36) NULL,
  `giftIdeas` TEXT NULL,
  `wishListUrl` VARCHAR(1024) NULL,
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CommunitySecretSantaParticipant_recipientId_key` (`recipientId`),
  UNIQUE INDEX `secret_santa_exchange_participant_uq` (`exchangeId`, `communityParticipantId`),
  INDEX `CommunitySecretSantaParticipant_exchangeId_joinedAt_idx` (`exchangeId`, `joinedAt`),
  INDEX `CommunitySecretSantaParticipant_communityParticipantId_idx` (`communityParticipantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommunitySecretSantaExchange`
  ADD CONSTRAINT `CommunitySecretSantaExchange_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommunitySecretSantaExchange_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CommunitySecretSantaParticipant`
  ADD CONSTRAINT `CommunitySecretSantaParticipant_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `CommunitySecretSantaExchange`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommunitySecretSantaParticipant_communityParticipantId_fkey` FOREIGN KEY (`communityParticipantId`) REFERENCES `CommunityParticipant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommunitySecretSantaParticipant_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `CommunitySecretSantaParticipant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
