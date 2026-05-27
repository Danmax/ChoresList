ALTER TABLE `Household`
  ADD COLUMN `timeZone` VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN `googleCalendarEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `googleCalendarId` VARCHAR(255) NULL,
  ADD COLUMN `googleCalendarSyncAssignments` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `googleCalendarSyncEvents` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `emailNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `emailDailySummary` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `emailWeeklyReport` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `privacyShowKidPoints` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `privacyAllowKidWishlist` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `privacyStoreCompletionPhotos` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `privacyAnalyticsOptIn` BOOLEAN NOT NULL DEFAULT false;
