CREATE TABLE `DevicePushSubscription` (
  `id` CHAR(36) NOT NULL,
  `deviceId` CHAR(36) NOT NULL,
  `endpoint` VARCHAR(1024) NOT NULL,
  `p256dh` TEXT NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `DevicePushSubscription_endpoint_key`(`endpoint`),
  INDEX `DevicePushSubscription_deviceId_idx`(`deviceId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `DevicePushSubscription_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `HouseholdDevice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
