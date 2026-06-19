ALTER TABLE `WellbeingCheckIn`
  DROP FOREIGN KEY `WellbeingCheckIn_recordedByParentId_fkey`;

ALTER TABLE `WellbeingCheckIn`
  MODIFY `recordedByParentId` CHAR(36) NULL,
  ADD COLUMN `recordedByDeviceId` CHAR(36) NULL;

ALTER TABLE `WellbeingCheckIn`
  ADD CONSTRAINT `WellbeingCheckIn_recordedByParentId_fkey`
    FOREIGN KEY (`recordedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `WellbeingCheckIn_recordedByDeviceId_fkey`
    FOREIGN KEY (`recordedByDeviceId`) REFERENCES `HouseholdDevice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `WellbeingCheckIn_recordedByDeviceId_idx` ON `WellbeingCheckIn`(`recordedByDeviceId`);
