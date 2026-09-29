CREATE TABLE `CommunityParentProfile` (
  `id` CHAR(36) NOT NULL, `groupId` CHAR(36) NOT NULL, `parentId` CHAR(36) NOT NULL,
  `displayName` VARCHAR(80) NOT NULL, `avatar` VARCHAR(32) NOT NULL DEFAULT '👋',
  `bio` VARCHAR(280) NULL, `isDiscoverable` BOOLEAN NOT NULL DEFAULT false,
  `childSocialEnabled` BOOLEAN NOT NULL DEFAULT false, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CommunityParentProfile_groupId_parentId_key`(`groupId`, `parentId`),
  INDEX `CommunityParentProfile_groupId_isDiscoverable_idx`(`groupId`, `isDiscoverable`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CommunityParentProfile_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CommunityParentProfile_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityParentConnection` (
  `id` CHAR(36) NOT NULL, `groupId` CHAR(36) NOT NULL, `requesterParentId` CHAR(36) NOT NULL, `recipientParentId` CHAR(36) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending', `blockedByParentId` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `community_conn_pair_uq`(`groupId`, `requesterParentId`, `recipientParentId`),
  INDEX `community_conn_inbox_ix`(`groupId`, `recipientParentId`, `status`), PRIMARY KEY (`id`),
  CONSTRAINT `CommunityParentConnection_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityChildFriendship` (
  `id` CHAR(36) NOT NULL, `groupId` CHAR(36) NOT NULL, `childAId` CHAR(36) NOT NULL, `childBId` CHAR(36) NOT NULL,
  `requesterParentId` CHAR(36) NOT NULL, `recipientParentId` CHAR(36) NOT NULL, `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `community_friend_pair_uq`(`groupId`, `childAId`, `childBId`),
  INDEX `community_friend_inbox_ix`(`groupId`, `recipientParentId`, `status`), PRIMARY KEY (`id`),
  CONSTRAINT `CommunityChildFriendship_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityChessMatch` (
  `id` CHAR(36) NOT NULL, `groupId` CHAR(36) NOT NULL, `friendshipId` CHAR(36) NOT NULL,
  `whiteMemberId` CHAR(36) NOT NULL, `blackMemberId` CHAR(36) NOT NULL, `currentTurn` VARCHAR(16) NOT NULL DEFAULT 'white',
  `status` VARCHAR(32) NOT NULL DEFAULT 'active', `fen` VARCHAR(128) NOT NULL, `result` VARCHAR(32) NULL,
  `lastMoveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `community_chess_group_ix`(`groupId`, `status`, `lastMoveAt`), INDEX `community_chess_players_ix`(`whiteMemberId`, `blackMemberId`, `status`), PRIMARY KEY (`id`),
  CONSTRAINT `CommunityChessMatch_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CommunityChessMatch_friendshipId_fkey` FOREIGN KEY (`friendshipId`) REFERENCES `CommunityChildFriendship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityChessMove` (
  `id` CHAR(36) NOT NULL, `matchId` CHAR(36) NOT NULL, `memberId` CHAR(36) NOT NULL, `ply` INTEGER NOT NULL,
  `san` VARCHAR(32) NOT NULL, `from` VARCHAR(2) NOT NULL, `to` VARCHAR(2) NOT NULL, `promotion` VARCHAR(8) NULL, `fen` VARCHAR(128) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UNIQUE INDEX `community_chess_move_ply_uq`(`matchId`, `ply`), PRIMARY KEY (`id`),
  CONSTRAINT `CommunityChessMove_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `CommunityChessMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
