-- Add Google Calendar connection and per-event sync metadata.
CREATE TABLE `GoogleCalendarConnection` (
  `id` VARCHAR(191) NOT NULL,
  `householdId` INTEGER NOT NULL,
  `googleAccountEmail` VARCHAR(255) NULL,
  `calendarId` VARCHAR(255) NOT NULL DEFAULT 'primary',
  `refreshToken` TEXT NOT NULL,
  `accessToken` TEXT NULL,
  `expiresAt` DATETIME(3) NULL,
  `syncStatus` VARCHAR(64) NULL,
  `lastSyncAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `GoogleCalendarConnection_householdId_key`(`householdId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyEvent`
  ADD COLUMN `googleCalendarEventId` VARCHAR(255) NULL,
  ADD COLUMN `googleCalendarSyncedAt` DATETIME(3) NULL,
  ADD COLUMN `googleCalendarSyncError` TEXT NULL;

ALTER TABLE `GoogleCalendarConnection`
  ADD CONSTRAINT `GoogleCalendarConnection_householdId_fkey`
  FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
