ALTER TABLE `CommunityGroup`
  ADD COLUMN `googleCalendarId` VARCHAR(255) NULL;

ALTER TABLE `CommunityEvent`
  ADD COLUMN `googleCalendarEventId` VARCHAR(255) NULL,
  ADD COLUMN `googleCalendarSyncedAt` DATETIME(3) NULL,
  ADD COLUMN `googleCalendarSyncError` TEXT NULL;
