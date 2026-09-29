CREATE TABLE `AppNotification` (
  `id` CHAR(36) NOT NULL,
  `recipientParentId` CHAR(36) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NULL,
  `url` VARCHAR(1024) NULL,
  `groupId` CHAR(36) NULL,
  `dedupeKey` VARCHAR(255) NOT NULL,
  `scheduledFor` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `app_notification_dedupe_uq`(`dedupeKey`),
  INDEX `app_notification_schedule_ix`(`recipientParentId`, `scheduledFor`),
  INDEX `app_notification_read_ix`(`recipientParentId`, `readAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `app_notification_parent_fk` FOREIGN KEY (`recipientParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
