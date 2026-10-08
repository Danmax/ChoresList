CREATE TABLE `GameHouseholdConnection` (
  `id` CHAR(36) NOT NULL,
  `householdAId` CHAR(36) NOT NULL,
  `householdBId` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `GameHouseholdConnection_householdAId_householdBId_key`(`householdAId`, `householdBId`),
  INDEX `GameHouseholdConnection_householdAId_idx`(`householdAId`),
  INDEX `GameHouseholdConnection_householdBId_idx`(`householdBId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GameHouseholdConnection`
  ADD CONSTRAINT `GameHouseholdConnection_householdAId_fkey`
  FOREIGN KEY (`householdAId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GameHouseholdConnection_householdBId_fkey`
  FOREIGN KEY (`householdBId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
