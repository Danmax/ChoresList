-- Destructive UUID reset: current application data is test data.
-- Drop existing integer-key tables, then recreate the full schema with UUID IDs.
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS `DevicePairingCode`;
DROP TABLE IF EXISTS `HouseholdDevice`;
DROP TABLE IF EXISTS `FamilyEvent`;
DROP TABLE IF EXISTS `CommunityEventItem`;
DROP TABLE IF EXISTS `CommunityRsvp`;
DROP TABLE IF EXISTS `CommunityEvent`;
DROP TABLE IF EXISTS `CommunityMember`;
DROP TABLE IF EXISTS `CommunityGroup`;
DROP TABLE IF EXISTS `RecipeIngredient`;
DROP TABLE IF EXISTS `Recipe`;
DROP TABLE IF EXISTS `GroceryTemplateItem`;
DROP TABLE IF EXISTS `GroceryTemplate`;
DROP TABLE IF EXISTS `GroceryListItem`;
DROP TABLE IF EXISTS `GroceryList`;
DROP TABLE IF EXISTS `RewardTicket`;
DROP TABLE IF EXISTS `HouseProject`;
DROP TABLE IF EXISTS `WishListItem`;
DROP TABLE IF EXISTS `ChoreInstructions`;
DROP TABLE IF EXISTS `AllowanceSettings`;
DROP TABLE IF EXISTS `WeeklyAllowance`;
DROP TABLE IF EXISTS `MemberSkill`;
DROP TABLE IF EXISTS `ChoreSkill`;
DROP TABLE IF EXISTS `SkillCategory`;
DROP TABLE IF EXISTS `TaskCompletion`;
DROP TABLE IF EXISTS `ChoreAssignment`;
DROP TABLE IF EXISTS `Chore`;
DROP TABLE IF EXISTS `FamilyTreeRelationship`;
DROP TABLE IF EXISTS `FamilyTreeNode`;
DROP TABLE IF EXISTS `EducationProject`;
DROP TABLE IF EXISTS `EducationAttempt`;
DROP TABLE IF EXISTS `EducationAssignment`;
DROP TABLE IF EXISTS `EducationMaterial`;
DROP TABLE IF EXISTS `EducationMaterialSet`;
DROP TABLE IF EXISTS `FamilyMember`;
DROP TABLE IF EXISTS `PinResetToken`;
DROP TABLE IF EXISTS `PasswordResetToken`;
DROP TABLE IF EXISTS `EmailConfirmationToken`;
DROP TABLE IF EXISTS `GoogleCalendarConnection`;
DROP TABLE IF EXISTS `HouseholdPlugin`;
DROP TABLE IF EXISTS `ParentAccount`;
DROP TABLE IF EXISTS `Household`;
SET FOREIGN_KEY_CHECKS=1;

-- CreateTable
CREATE TABLE `ParentAccount` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `passwordSalt` VARCHAR(255) NOT NULL,
    `pinHash` VARCHAR(255) NULL,
    `pinSalt` VARCHAR(255) NULL,
    `accountRole` VARCHAR(32) NOT NULL DEFAULT 'owner',
    `displayName` VARCHAR(255) NULL,
    `parentType` VARCHAR(64) NOT NULL DEFAULT 'parent',
    `relationshipLabel` VARCHAR(128) NULL,
    `childAccessMode` VARCHAR(32) NOT NULL DEFAULT 'all',
    `childAccessMemberIds` JSON NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ParentAccount_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Household` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `timeZone` VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    `googleCalendarEnabled` BOOLEAN NOT NULL DEFAULT false,
    `googleCalendarId` VARCHAR(255) NULL,
    `googleCalendarSyncAssignments` BOOLEAN NOT NULL DEFAULT false,
    `googleCalendarSyncEvents` BOOLEAN NOT NULL DEFAULT true,
    `emailNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `emailDailySummary` BOOLEAN NOT NULL DEFAULT false,
    `emailWeeklyReport` BOOLEAN NOT NULL DEFAULT true,
    `privacyShowKidPoints` BOOLEAN NOT NULL DEFAULT true,
    `privacyAllowKidWishlist` BOOLEAN NOT NULL DEFAULT true,
    `privacyStoreCompletionPhotos` BOOLEAN NOT NULL DEFAULT true,
    `privacyAnalyticsOptIn` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseholdPlugin` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `pluginKey` VARCHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'inactive',
    `settings` JSON NULL,
    `activatedAt` DATETIME(3) NULL,
    `activatedByParentId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HouseholdPlugin_pluginKey_idx`(`pluginKey`),
    UNIQUE INDEX `HouseholdPlugin_householdId_pluginKey_key`(`householdId`, `pluginKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoogleCalendarConnection` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
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

-- CreateTable
CREATE TABLE `EmailConfirmationToken` (
    `id` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailConfirmationToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PinResetToken` (
    `id` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PinResetToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyMember` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `parentAccountId` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `age` INTEGER NOT NULL,
    `birthdayMonth` INTEGER NULL,
    `birthdayDay` INTEGER NULL,
    `lastBirthdayAgeUpdateYear` INTEGER NULL,
    `role` VARCHAR(64) NOT NULL DEFAULT 'child',
    `relationshipToHousehold` VARCHAR(64) NOT NULL DEFAULT 'child',
    `familyBranch` VARCHAR(64) NOT NULL DEFAULT 'primary',
    `custodySchedule` VARCHAR(128) NULL,
    `familyNotes` VARCHAR(255) NULL,
    `avatar` VARCHAR(32) NOT NULL DEFAULT '🧒',
    `color` VARCHAR(32) NOT NULL DEFAULT '#a78bfa',
    `totalPoints` INTEGER NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FamilyMember_parentAccountId_key`(`parentAccountId`),
    INDEX `FamilyMember_householdId_role_idx`(`householdId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EducationMaterialSet` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(64) NOT NULL DEFAULT 'vocabulary',
    `mode` VARCHAR(64) NOT NULL DEFAULT 'drill',
    `description` TEXT NULL,
    `passingScore` INTEGER NOT NULL DEFAULT 85,
    `pointsReward` INTEGER NOT NULL DEFAULT 10,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EducationMaterialSet_householdId_subject_idx`(`householdId`, `subject`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EducationMaterial` (
    `id` CHAR(36) NOT NULL,
    `setId` CHAR(36) NOT NULL,
    `prompt` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `choices` JSON NULL,
    `explanation` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EducationAssignment` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `setId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'assigned',
    `passingScore` INTEGER NOT NULL DEFAULT 85,
    `pointsReward` INTEGER NOT NULL DEFAULT 10,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EducationAssignment_householdId_memberId_status_idx`(`householdId`, `memberId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EducationAttempt` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `assignmentId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `correctCount` INTEGER NOT NULL DEFAULT 0,
    `totalCount` INTEGER NOT NULL DEFAULT 0,
    `passed` BOOLEAN NOT NULL DEFAULT false,
    `answers` JSON NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EducationAttempt_householdId_memberId_completedAt_idx`(`householdId`, `memberId`, `completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EducationProject` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(64) NOT NULL DEFAULT 'project',
    `description` TEXT NULL,
    `rubric` TEXT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'open',
    `dueDate` DATETIME(3) NULL,
    `pointsReward` INTEGER NOT NULL DEFAULT 25,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EducationProject_householdId_status_idx`(`householdId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyTreeNode` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `kind` VARCHAR(32) NOT NULL DEFAULT 'external',
    `familyMemberId` CHAR(36) NULL,
    `parentAccountId` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(32) NOT NULL DEFAULT '👤',
    `color` VARCHAR(32) NOT NULL DEFAULT '#a78bfa',
    `birthYear` INTEGER NULL,
    `birthdayMonth` INTEGER NULL,
    `birthdayDay` INTEGER NULL,
    `notes` TEXT NULL,
    `x` INTEGER NULL,
    `y` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FamilyTreeNode_householdId_kind_idx`(`householdId`, `kind`),
    UNIQUE INDEX `FamilyTreeNode_householdId_familyMemberId_key`(`householdId`, `familyMemberId`),
    UNIQUE INDEX `FamilyTreeNode_householdId_parentAccountId_key`(`householdId`, `parentAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyTreeRelationship` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `fromNodeId` CHAR(36) NOT NULL,
    `toNodeId` CHAR(36) NOT NULL,
    `relationshipType` VARCHAR(64) NOT NULL,
    `label` VARCHAR(128) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FamilyTreeRelationship_householdId_relationshipType_idx`(`householdId`, `relationshipType`),
    UNIQUE INDEX `FamilyTreeRelationship_fromNodeId_toNodeId_relationshipType_key`(`fromNodeId`, `toNodeId`, `relationshipType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chore` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
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
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `choreId` CHAR(36) NOT NULL,
    `frequency` VARCHAR(64) NOT NULL DEFAULT 'daily',
    `dueDate` DATETIME(3) NULL,
    `dayOfWeek` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskCompletion` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `assignmentId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `photoBeforePath` VARCHAR(191) NULL,
    `photoAfterPath` VARCHAR(191) NULL,
    `reactionEmoji` VARCHAR(32) NULL,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `verifiedByParent` BOOLEAN NOT NULL DEFAULT false,
    `weekStartDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TaskCompletion_assignmentId_completionDate_key`(`assignmentId`, `completionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SkillCategory` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `icon` VARCHAR(32) NOT NULL DEFAULT '⭐',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChoreSkill` (
    `choreId` CHAR(36) NOT NULL,
    `skillId` CHAR(36) NOT NULL,

    PRIMARY KEY (`choreId`, `skillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemberSkill` (
    `memberId` CHAR(36) NOT NULL,
    `skillId` CHAR(36) NOT NULL,
    `xp` INTEGER NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`memberId`, `skillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyAllowance` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `weekStart` DATETIME(3) NOT NULL,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `amountEarned` DOUBLE NOT NULL DEFAULT 0,
    `paidOut` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `WeeklyAllowance_memberId_weekStart_key`(`memberId`, `weekStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AllowanceSettings` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `weeklyBaseRate` DOUBLE NOT NULL DEFAULT 0,
    `pointsToDollar` DOUBLE NOT NULL DEFAULT 0.10,

    UNIQUE INDEX `AllowanceSettings_memberId_key`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChoreInstructions` (
    `id` CHAR(36) NOT NULL,
    `choreId` CHAR(36) NOT NULL,
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
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
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
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'other',
    `emoji` VARCHAR(32) NOT NULL DEFAULT '🔧',
    `rewardTitle` VARCHAR(255) NOT NULL,
    `rewardEmoji` VARCHAR(32) NOT NULL DEFAULT '🎫',
    `pointsBonus` INTEGER NOT NULL DEFAULT 50,
    `assignedTo` CHAR(36) NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'open',
    `dueDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RewardTicket` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `rewardTitle` VARCHAR(255) NOT NULL,
    `rewardEmoji` VARCHAR(32) NOT NULL DEFAULT '🎫',
    `status` VARCHAR(64) NOT NULL DEFAULT 'pending',
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `redeemedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroceryList` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'active',
    `sourceTemplateId` CHAR(36) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroceryListItem` (
    `id` CHAR(36) NOT NULL,
    `listId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'other',
    `quantity` VARCHAR(64) NULL,
    `unit` VARCHAR(64) NULL,
    `note` TEXT NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroceryTemplate` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `cadence` VARCHAR(64) NOT NULL DEFAULT 'weekly',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroceryTemplateItem` (
    `id` CHAR(36) NOT NULL,
    `templateId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'other',
    `quantity` VARCHAR(64) NULL,
    `unit` VARCHAR(64) NULL,
    `note` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recipe` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `createdByParentId` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `servings` INTEGER NOT NULL DEFAULT 4,
    `prepMinutes` INTEGER NULL,
    `cookMinutes` INTEGER NULL,
    `photoUrl` VARCHAR(512) NULL,
    `instructions` TEXT NULL,
    `visibility` VARCHAR(64) NOT NULL DEFAULT 'private',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Recipe_householdId_visibility_idx`(`householdId`, `visibility`),
    INDEX `Recipe_visibility_createdAt_idx`(`visibility`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeIngredient` (
    `id` CHAR(36) NOT NULL,
    `recipeId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `quantity` VARCHAR(64) NULL,
    `unit` VARCHAR(64) NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'pantry',
    `note` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityGroup` (
    `id` CHAR(36) NOT NULL,
    `creatorParentId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `groupType` VARCHAR(64) NOT NULL DEFAULT 'other',
    `description` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `visibility` VARCHAR(64) NOT NULL DEFAULT 'private',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityMember` (
    `id` CHAR(36) NOT NULL,
    `groupId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `role` VARCHAR(64) NOT NULL DEFAULT 'member',
    `status` VARCHAR(64) NOT NULL DEFAULT 'active',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CommunityMember_groupId_parentId_key`(`groupId`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityEvent` (
    `id` CHAR(36) NOT NULL,
    `groupId` CHAR(36) NOT NULL,
    `createdByParentId` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL DEFAULT 'other',
    `date` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT false,
    `location` VARCHAR(255) NULL,
    `imageUrl` VARCHAR(512) NULL,
    `visibility` VARCHAR(64) NOT NULL DEFAULT 'private',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityRsvp` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'going',
    `guests` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CommunityRsvp_eventId_parentId_key`(`eventId`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityEventItem` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `quantity` VARCHAR(64) NULL,
    `note` TEXT NULL,
    `assignedToParentId` CHAR(36) NULL,
    `claimedByParentId` CHAR(36) NULL,
    `claimNote` TEXT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'open',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FamilyEvent` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL DEFAULT 'other',
    `date` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT true,
    `recurring` VARCHAR(64) NOT NULL DEFAULT 'none',
    `recurringEndDate` DATETIME(3) NULL,
    `recurringCount` INTEGER NULL,
    `location` VARCHAR(255) NULL,
    `meetingUrl` VARCHAR(512) NULL,
    `rsvpUrl` VARCHAR(512) NULL,
    `flyerUrl` VARCHAR(512) NULL,
    `registrationUrl` VARCHAR(512) NULL,
    `registrationNotes` TEXT NULL,
    `resources` TEXT NULL,
    `notes` TEXT NULL,
    `color` VARCHAR(32) NOT NULL DEFAULT '#fbbf24',
    `icon` VARCHAR(32) NOT NULL DEFAULT '📅',
    `googleCalendarEventId` VARCHAR(255) NULL,
    `googleCalendarSyncedAt` DATETIME(3) NULL,
    `googleCalendarSyncError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseholdDevice` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NULL,
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
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NULL,
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
ALTER TABLE `ParentAccount` ADD CONSTRAINT `ParentAccount_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdPlugin` ADD CONSTRAINT `HouseholdPlugin_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdPlugin` ADD CONSTRAINT `HouseholdPlugin_activatedByParentId_fkey` FOREIGN KEY (`activatedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoogleCalendarConnection` ADD CONSTRAINT `GoogleCalendarConnection_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailConfirmationToken` ADD CONSTRAINT `EmailConfirmationToken_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinResetToken` ADD CONSTRAINT `PinResetToken_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyMember` ADD CONSTRAINT `FamilyMember_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyMember` ADD CONSTRAINT `FamilyMember_parentAccountId_fkey` FOREIGN KEY (`parentAccountId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationMaterialSet` ADD CONSTRAINT `EducationMaterialSet_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationMaterial` ADD CONSTRAINT `EducationMaterial_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `EducationMaterialSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationAssignment` ADD CONSTRAINT `EducationAssignment_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationAssignment` ADD CONSTRAINT `EducationAssignment_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationAssignment` ADD CONSTRAINT `EducationAssignment_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `EducationMaterialSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationAttempt` ADD CONSTRAINT `EducationAttempt_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationAttempt` ADD CONSTRAINT `EducationAttempt_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `EducationAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationAttempt` ADD CONSTRAINT `EducationAttempt_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationProject` ADD CONSTRAINT `EducationProject_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EducationProject` ADD CONSTRAINT `EducationProject_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyTreeNode` ADD CONSTRAINT `FamilyTreeNode_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyTreeNode` ADD CONSTRAINT `FamilyTreeNode_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyTreeNode` ADD CONSTRAINT `FamilyTreeNode_parentAccountId_fkey` FOREIGN KEY (`parentAccountId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyTreeRelationship` ADD CONSTRAINT `FamilyTreeRelationship_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyTreeRelationship` ADD CONSTRAINT `FamilyTreeRelationship_fromNodeId_fkey` FOREIGN KEY (`fromNodeId`) REFERENCES `FamilyTreeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyTreeRelationship` ADD CONSTRAINT `FamilyTreeRelationship_toNodeId_fkey` FOREIGN KEY (`toNodeId`) REFERENCES `FamilyTreeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `GroceryList` ADD CONSTRAINT `GroceryList_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroceryList` ADD CONSTRAINT `GroceryList_sourceTemplateId_fkey` FOREIGN KEY (`sourceTemplateId`) REFERENCES `GroceryTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroceryListItem` ADD CONSTRAINT `GroceryListItem_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `GroceryList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroceryTemplate` ADD CONSTRAINT `GroceryTemplate_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroceryTemplateItem` ADD CONSTRAINT `GroceryTemplateItem_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `GroceryTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityGroup` ADD CONSTRAINT `CommunityGroup_creatorParentId_fkey` FOREIGN KEY (`creatorParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityMember` ADD CONSTRAINT `CommunityMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityMember` ADD CONSTRAINT `CommunityMember_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEvent` ADD CONSTRAINT `CommunityEvent_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEvent` ADD CONSTRAINT `CommunityEvent_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityRsvp` ADD CONSTRAINT `CommunityRsvp_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityRsvp` ADD CONSTRAINT `CommunityRsvp_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEventItem` ADD CONSTRAINT `CommunityEventItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEventItem` ADD CONSTRAINT `CommunityEventItem_assignedToParentId_fkey` FOREIGN KEY (`assignedToParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEventItem` ADD CONSTRAINT `CommunityEventItem_claimedByParentId_fkey` FOREIGN KEY (`claimedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamilyEvent` ADD CONSTRAINT `FamilyEvent_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdDevice` ADD CONSTRAINT `HouseholdDevice_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdDevice` ADD CONSTRAINT `HouseholdDevice_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DevicePairingCode` ADD CONSTRAINT `DevicePairingCode_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DevicePairingCode` ADD CONSTRAINT `DevicePairingCode_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
