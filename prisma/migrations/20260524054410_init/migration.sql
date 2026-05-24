-- CreateTable
CREATE TABLE `ParentAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `passwordSalt` VARCHAR(255) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ParentAccount_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Household` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailConfirmationToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailConfirmationToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `age` INTEGER NOT NULL,
    `role` VARCHAR(64) NOT NULL DEFAULT 'child',
    `avatar` VARCHAR(32) NOT NULL DEFAULT '🧒',
    `color` VARCHAR(32) NOT NULL DEFAULT '#a78bfa',
    `totalPoints` INTEGER NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chore` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(32) NOT NULL DEFAULT '✅',
    `color` VARCHAR(32) NOT NULL DEFAULT '#e0e7ff',
    `ageMin` INTEGER NOT NULL DEFAULT 3,
    `ageMax` INTEGER NOT NULL DEFAULT 18,
    `pointsValue` INTEGER NOT NULL DEFAULT 10,
    `category` VARCHAR(64) NOT NULL DEFAULT 'other',
    `requiresPhoto` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChoreAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `choreId` INTEGER NOT NULL,
    `frequency` VARCHAR(64) NOT NULL DEFAULT 'daily',
    `dueDate` DATETIME(3) NULL,
    `dayOfWeek` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskCompletion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `assignmentId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `photoBeforePath` VARCHAR(191) NULL,
    `photoAfterPath` VARCHAR(191) NULL,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `verifiedByParent` BOOLEAN NOT NULL DEFAULT false,
    `weekStartDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SkillCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `icon` VARCHAR(32) NOT NULL DEFAULT '⭐',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChoreSkill` (
    `choreId` INTEGER NOT NULL,
    `skillId` INTEGER NOT NULL,

    PRIMARY KEY (`choreId`, `skillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemberSkill` (
    `memberId` INTEGER NOT NULL,
    `skillId` INTEGER NOT NULL,
    `xp` INTEGER NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`memberId`, `skillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyAllowance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `weekStart` DATETIME(3) NOT NULL,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `amountEarned` DOUBLE NOT NULL DEFAULT 0,
    `paidOut` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `WeeklyAllowance_memberId_weekStart_key`(`memberId`, `weekStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AllowanceSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `weeklyBaseRate` DOUBLE NOT NULL DEFAULT 0,
    `pointsToDollar` DOUBLE NOT NULL DEFAULT 0.10,

    UNIQUE INDEX `AllowanceSettings_memberId_key`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChoreInstructions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `choreId` INTEGER NOT NULL,
    `steps` TEXT NOT NULL,
    `tips` TEXT NOT NULL,
    `safetyNotes` TEXT NOT NULL,
    `aiGenerated` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChoreInstructions_choreId_key`(`choreId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WishListItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'other',
    `emoji` VARCHAR(32) NOT NULL DEFAULT '🎁',
    `note` TEXT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseProject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'other',
    `emoji` VARCHAR(32) NOT NULL DEFAULT '🔧',
    `rewardTitle` VARCHAR(255) NOT NULL,
    `rewardEmoji` VARCHAR(32) NOT NULL DEFAULT '🎫',
    `pointsBonus` INTEGER NOT NULL DEFAULT 50,
    `assignedTo` INTEGER NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'open',
    `dueDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RewardTicket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `projectId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `rewardTitle` VARCHAR(255) NOT NULL,
    `rewardEmoji` VARCHAR(32) NOT NULL DEFAULT '🎫',
    `status` VARCHAR(64) NOT NULL DEFAULT 'pending',
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `redeemedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL DEFAULT 'other',
    `date` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT true,
    `recurring` VARCHAR(64) NOT NULL DEFAULT 'none',
    `notes` TEXT NULL,
    `color` VARCHAR(32) NOT NULL DEFAULT '#fbbf24',
    `icon` VARCHAR(32) NOT NULL DEFAULT '📅',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ParentAccount` ADD CONSTRAINT `ParentAccount_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailConfirmationToken` ADD CONSTRAINT `EmailConfirmationToken_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyMember` ADD CONSTRAINT `FamilyMember_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chore` ADD CONSTRAINT `Chore_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChoreAssignment` ADD CONSTRAINT `ChoreAssignment_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChoreAssignment` ADD CONSTRAINT `ChoreAssignment_choreId_fkey` FOREIGN KEY (`choreId`) REFERENCES `Chore`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChoreAssignment` ADD CONSTRAINT `ChoreAssignment_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskCompletion` ADD CONSTRAINT `TaskCompletion_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `ChoreAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskCompletion` ADD CONSTRAINT `TaskCompletion_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskCompletion` ADD CONSTRAINT `TaskCompletion_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SkillCategory` ADD CONSTRAINT `SkillCategory_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChoreSkill` ADD CONSTRAINT `ChoreSkill_choreId_fkey` FOREIGN KEY (`choreId`) REFERENCES `Chore`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChoreSkill` ADD CONSTRAINT `ChoreSkill_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberSkill` ADD CONSTRAINT `MemberSkill_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberSkill` ADD CONSTRAINT `MemberSkill_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyAllowance` ADD CONSTRAINT `WeeklyAllowance_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyAllowance` ADD CONSTRAINT `WeeklyAllowance_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllowanceSettings` ADD CONSTRAINT `AllowanceSettings_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllowanceSettings` ADD CONSTRAINT `AllowanceSettings_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChoreInstructions` ADD CONSTRAINT `ChoreInstructions_choreId_fkey` FOREIGN KEY (`choreId`) REFERENCES `Chore`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishListItem` ADD CONSTRAINT `WishListItem_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishListItem` ADD CONSTRAINT `WishListItem_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseProject` ADD CONSTRAINT `HouseProject_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseProject` ADD CONSTRAINT `HouseProject_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RewardTicket` ADD CONSTRAINT `RewardTicket_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `HouseProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RewardTicket` ADD CONSTRAINT `RewardTicket_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RewardTicket` ADD CONSTRAINT `RewardTicket_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyEvent` ADD CONSTRAINT `FamilyEvent_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

