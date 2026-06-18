CREATE TABLE `CommunityEventMessage` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `body` TEXT NULL,
    `emoji` VARCHAR(32) NULL,
    `gifUrl` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityEventMessage_eventId_createdAt_idx`(`eventId`, `createdAt`),
    INDEX `CommunityEventMessage_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommunityEventMessage`
  ADD CONSTRAINT `CommunityEventMessage_eventId_fkey`
  FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommunityEventMessage`
  ADD CONSTRAINT `CommunityEventMessage_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
