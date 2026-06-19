ALTER TABLE `CommunityMember`
  ADD COLUMN `emailNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `emailItemAssignments` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `emailEventReminders` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `emailRegistrationUpdates` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `emailManagerWeeklySummary` BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE `EmailNotification` (
  `id` CHAR(36) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `recipientParentId` CHAR(36) NULL,
  `recipientEmail` VARCHAR(255) NOT NULL,
  `groupId` CHAR(36) NULL,
  `eventId` CHAR(36) NULL,
  `dedupeKey` VARCHAR(255) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `scheduledFor` DATETIME(3) NOT NULL,
  `payload` JSON NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `lockedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `EmailNotification_dedupeKey_key`(`dedupeKey`),
  INDEX `EmailNotification_status_scheduledFor_idx`(`status`, `scheduledFor`),
  INDEX `EmailNotification_eventId_recipientParentId_idx`(`eventId`, `recipientParentId`),
  INDEX `EmailNotification_groupId_type_idx`(`groupId`, `type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
