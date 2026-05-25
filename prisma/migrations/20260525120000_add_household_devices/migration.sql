-- CreateTable
CREATE TABLE `HouseholdDevice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `memberId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `mode` VARCHAR(32) NOT NULL DEFAULT 'household',
    `tokenHash` VARCHAR(255) NOT NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HouseholdDevice_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DevicePairingCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `memberId` INTEGER NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `deviceName` VARCHAR(255) NOT NULL,
    `mode` VARCHAR(32) NOT NULL DEFAULT 'household',
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DevicePairingCode_codeHash_key`(`codeHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HouseholdDevice` ADD CONSTRAINT `HouseholdDevice_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdDevice` ADD CONSTRAINT `HouseholdDevice_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DevicePairingCode` ADD CONSTRAINT `DevicePairingCode_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DevicePairingCode` ADD CONSTRAINT `DevicePairingCode_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
