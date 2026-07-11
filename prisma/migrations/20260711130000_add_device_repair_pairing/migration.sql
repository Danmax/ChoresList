ALTER TABLE `DevicePairingCode`
  ADD COLUMN `deviceId` CHAR(36) NULL;

CREATE INDEX `DevicePairingCode_deviceId_idx` ON `DevicePairingCode`(`deviceId`);

ALTER TABLE `DevicePairingCode`
  ADD CONSTRAINT `DevicePairingCode_deviceId_fkey`
  FOREIGN KEY (`deviceId`) REFERENCES `HouseholdDevice`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
