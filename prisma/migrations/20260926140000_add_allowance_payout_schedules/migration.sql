ALTER TABLE `AllowanceSettings`
  ADD COLUMN `payoutSchedule` VARCHAR(16) NOT NULL DEFAULT 'weekly';

CREATE TABLE `AllowancePayment` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `schedule` VARCHAR(16) NOT NULL,
  `periodStart` DATETIME(3) NOT NULL,
  `periodEnd` DATETIME(3) NOT NULL,
  `pointsEarned` INTEGER NOT NULL,
  `amountPaid` DOUBLE NOT NULL,
  `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `AllowancePayment_memberId_schedule_periodStart_key`(`memberId`, `schedule`, `periodStart`),
  INDEX `AllowancePayment_householdId_memberId_periodStart_idx`(`householdId`, `memberId`, `periodStart`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AllowancePayment_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AllowancePayment_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
