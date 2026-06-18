CREATE TABLE IF NOT EXISTS `SkillXpEvent` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `skillId` CHAR(36) NOT NULL,
    `sourceType` VARCHAR(64) NOT NULL,
    `sourceId` CHAR(36) NULL,
    `xp` INTEGER NOT NULL,
    `note` TEXT NULL,
    `awardedByParentId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `skill_xp_event_source_uq`(`householdId`, `memberId`, `skillId`, `sourceType`, `sourceId`),
    INDEX `skill_xp_member_created_idx`(`householdId`, `memberId`, `createdAt`),
    INDEX `skill_xp_skill_idx`(`skillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND COLUMN_NAME = 'recurring'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD COLUMN `recurring` VARCHAR(64) NOT NULL DEFAULT ''none'''
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND COLUMN_NAME = 'recurringEndDate'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD COLUMN `recurringEndDate` DATETIME(3) NULL'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND COLUMN_NAME = 'recurringCount'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD COLUMN `recurringCount` INTEGER NULL'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND COLUMN_NAME = 'seriesId'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD COLUMN `seriesId` CHAR(36) NULL'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND COLUMN_NAME = 'sessionNumber'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD COLUMN `sessionNumber` INTEGER NULL'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND INDEX_NAME = 'community_event_series_idx'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD INDEX `community_event_series_idx`(`seriesId`, `sessionNumber`)'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEvent' AND INDEX_NAME = 'community_event_recurring_idx'),
    'SELECT 1',
    'ALTER TABLE `CommunityEvent` ADD INDEX `community_event_recurring_idx`(`recurring`, `date`)'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationMaterialSet' AND COLUMN_NAME = 'skillId'),
    'SELECT 1',
    'ALTER TABLE `EducationMaterialSet` ADD COLUMN `skillId` CHAR(36) NULL'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationMaterialSet' AND INDEX_NAME = 'EducationMaterialSet_skillId_idx'),
    'SELECT 1',
    'ALTER TABLE `EducationMaterialSet` ADD INDEX `EducationMaterialSet_skillId_idx`(`skillId`)'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationProject' AND COLUMN_NAME = 'skillId'),
    'SELECT 1',
    'ALTER TABLE `EducationProject` ADD COLUMN `skillId` CHAR(36) NULL'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationProject' AND INDEX_NAME = 'EducationProject_skillId_idx'),
    'SELECT 1',
    'ALTER TABLE `EducationProject` ADD INDEX `EducationProject_skillId_idx`(`skillId`)'
));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `MeritBadge` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NULL,
    `communityGroupId` CHAR(36) NULL,
    `skillId` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `icon` VARCHAR(32) NOT NULL DEFAULT '🏅',
    `description` TEXT NULL,
    `requirements` JSON NULL,
    `xpReward` INTEGER NOT NULL DEFAULT 25,
    `requiresTest` BOOLEAN NOT NULL DEFAULT true,
    `requiresAttendance` BOOLEAN NOT NULL DEFAULT false,
    `requiresManagerApproval` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `merit_badge_household_idx`(`householdId`),
    INDEX `merit_badge_group_idx`(`communityGroupId`),
    INDEX `merit_badge_skill_idx`(`skillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MemberBadge` (
    `id` CHAR(36) NOT NULL,
    `householdId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `badgeId` CHAR(36) NOT NULL,
    `communityGroupId` CHAR(36) NULL,
    `awardedByParentId` CHAR(36) NULL,
    `evidence` JSON NULL,
    `note` TEXT NULL,
    `awardedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `member_badge_award_uq`(`memberId`, `badgeId`, `communityGroupId`),
    INDEX `member_badge_member_idx`(`householdId`, `memberId`),
    INDEX `member_badge_badge_idx`(`badgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CommunityParticipant` (
    `id` CHAR(36) NOT NULL,
    `groupId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `displayName` VARCHAR(255) NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'active',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `community_participant_uq`(`groupId`, `parentId`, `memberId`),
    INDEX `community_participant_group_idx`(`groupId`, `status`),
    INDEX `community_participant_member_idx`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CommunityClassPlan` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `skillId` CHAR(36) NULL,
    `badgeId` CHAR(36) NULL,
    `lessonTitle` VARCHAR(255) NOT NULL,
    `objectives` TEXT NULL,
    `materials` TEXT NULL,
    `agenda` TEXT NULL,
    `homework` TEXT NULL,
    `testInstructions` TEXT NULL,
    `attendanceXp` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityClassPlan_eventId_key`(`eventId`),
    INDEX `community_class_plan_skill_idx`(`skillId`),
    INDEX `community_class_plan_badge_idx`(`badgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CommunityEventAttendance` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `participantId` CHAR(36) NOT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'present',
    `checkedInAt` DATETIME(3) NULL,
    `checkedInByParentId` CHAR(36) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `community_attendance_uq`(`eventId`, `participantId`),
    INDEX `community_attendance_participant_idx`(`participantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SkillTest` (
    `id` CHAR(36) NOT NULL,
    `communityGroupId` CHAR(36) NULL,
    `eventId` CHAR(36) NULL,
    `badgeId` CHAR(36) NULL,
    `skillId` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `instructions` TEXT NULL,
    `passingScore` INTEGER NOT NULL DEFAULT 85,
    `xpReward` INTEGER NOT NULL DEFAULT 25,
    `status` VARCHAR(64) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `skill_test_group_idx`(`communityGroupId`),
    INDEX `skill_test_event_idx`(`eventId`),
    INDEX `skill_test_badge_idx`(`badgeId`),
    INDEX `skill_test_skill_idx`(`skillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SkillTestAttempt` (
    `id` CHAR(36) NOT NULL,
    `testId` CHAR(36) NOT NULL,
    `participantId` CHAR(36) NOT NULL,
    `memberId` CHAR(36) NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `passed` BOOLEAN NOT NULL DEFAULT false,
    `evidence` JSON NULL,
    `notes` TEXT NULL,
    `reviewedByParentId` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `skill_test_attempt_test_idx`(`testId`, `participantId`),
    INDEX `skill_test_attempt_member_idx`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillXpEvent' AND CONSTRAINT_NAME = 'SkillXpEvent_householdId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillXpEvent` ADD CONSTRAINT `SkillXpEvent_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillXpEvent' AND CONSTRAINT_NAME = 'SkillXpEvent_memberId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillXpEvent` ADD CONSTRAINT `SkillXpEvent_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillXpEvent' AND CONSTRAINT_NAME = 'SkillXpEvent_skillId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillXpEvent` ADD CONSTRAINT `SkillXpEvent_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillXpEvent' AND CONSTRAINT_NAME = 'SkillXpEvent_awardedByParentId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillXpEvent` ADD CONSTRAINT `SkillXpEvent_awardedByParentId_fkey` FOREIGN KEY (`awardedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationMaterialSet' AND CONSTRAINT_NAME = 'EducationMaterialSet_skillId_fkey'), 'SELECT 1', 'ALTER TABLE `EducationMaterialSet` ADD CONSTRAINT `EducationMaterialSet_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationProject' AND CONSTRAINT_NAME = 'EducationProject_skillId_fkey'), 'SELECT 1', 'ALTER TABLE `EducationProject` ADD CONSTRAINT `EducationProject_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MeritBadge' AND CONSTRAINT_NAME = 'MeritBadge_householdId_fkey'), 'SELECT 1', 'ALTER TABLE `MeritBadge` ADD CONSTRAINT `MeritBadge_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MeritBadge' AND CONSTRAINT_NAME = 'MeritBadge_communityGroupId_fkey'), 'SELECT 1', 'ALTER TABLE `MeritBadge` ADD CONSTRAINT `MeritBadge_communityGroupId_fkey` FOREIGN KEY (`communityGroupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MeritBadge' AND CONSTRAINT_NAME = 'MeritBadge_skillId_fkey'), 'SELECT 1', 'ALTER TABLE `MeritBadge` ADD CONSTRAINT `MeritBadge_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MemberBadge' AND CONSTRAINT_NAME = 'MemberBadge_householdId_fkey'), 'SELECT 1', 'ALTER TABLE `MemberBadge` ADD CONSTRAINT `MemberBadge_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MemberBadge' AND CONSTRAINT_NAME = 'MemberBadge_memberId_fkey'), 'SELECT 1', 'ALTER TABLE `MemberBadge` ADD CONSTRAINT `MemberBadge_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MemberBadge' AND CONSTRAINT_NAME = 'MemberBadge_badgeId_fkey'), 'SELECT 1', 'ALTER TABLE `MemberBadge` ADD CONSTRAINT `MemberBadge_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `MeritBadge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MemberBadge' AND CONSTRAINT_NAME = 'MemberBadge_communityGroupId_fkey'), 'SELECT 1', 'ALTER TABLE `MemberBadge` ADD CONSTRAINT `MemberBadge_communityGroupId_fkey` FOREIGN KEY (`communityGroupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MemberBadge' AND CONSTRAINT_NAME = 'MemberBadge_awardedByParentId_fkey'), 'SELECT 1', 'ALTER TABLE `MemberBadge` ADD CONSTRAINT `MemberBadge_awardedByParentId_fkey` FOREIGN KEY (`awardedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityParticipant' AND CONSTRAINT_NAME = 'CommunityParticipant_groupId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityParticipant` ADD CONSTRAINT `CommunityParticipant_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityParticipant' AND CONSTRAINT_NAME = 'CommunityParticipant_parentId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityParticipant` ADD CONSTRAINT `CommunityParticipant_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityParticipant' AND CONSTRAINT_NAME = 'CommunityParticipant_memberId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityParticipant` ADD CONSTRAINT `CommunityParticipant_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityClassPlan' AND CONSTRAINT_NAME = 'CommunityClassPlan_eventId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityClassPlan` ADD CONSTRAINT `CommunityClassPlan_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityClassPlan' AND CONSTRAINT_NAME = 'CommunityClassPlan_skillId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityClassPlan` ADD CONSTRAINT `CommunityClassPlan_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityClassPlan' AND CONSTRAINT_NAME = 'CommunityClassPlan_badgeId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityClassPlan` ADD CONSTRAINT `CommunityClassPlan_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `MeritBadge`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEventAttendance' AND CONSTRAINT_NAME = 'CommunityEventAttendance_eventId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityEventAttendance` ADD CONSTRAINT `CommunityEventAttendance_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEventAttendance' AND CONSTRAINT_NAME = 'CommunityEventAttendance_participantId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityEventAttendance` ADD CONSTRAINT `CommunityEventAttendance_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `CommunityParticipant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CommunityEventAttendance' AND CONSTRAINT_NAME = 'CommunityEventAttendance_checkedInByParentId_fkey'), 'SELECT 1', 'ALTER TABLE `CommunityEventAttendance` ADD CONSTRAINT `CommunityEventAttendance_checkedInByParentId_fkey` FOREIGN KEY (`checkedInByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTest' AND CONSTRAINT_NAME = 'SkillTest_communityGroupId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTest` ADD CONSTRAINT `SkillTest_communityGroupId_fkey` FOREIGN KEY (`communityGroupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTest' AND CONSTRAINT_NAME = 'SkillTest_eventId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTest` ADD CONSTRAINT `SkillTest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTest' AND CONSTRAINT_NAME = 'SkillTest_badgeId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTest` ADD CONSTRAINT `SkillTest_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `MeritBadge`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTest' AND CONSTRAINT_NAME = 'SkillTest_skillId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTest` ADD CONSTRAINT `SkillTest_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `SkillCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTestAttempt' AND CONSTRAINT_NAME = 'SkillTestAttempt_testId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTestAttempt` ADD CONSTRAINT `SkillTestAttempt_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `SkillTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTestAttempt' AND CONSTRAINT_NAME = 'SkillTestAttempt_participantId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTestAttempt` ADD CONSTRAINT `SkillTestAttempt_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `CommunityParticipant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTestAttempt' AND CONSTRAINT_NAME = 'SkillTestAttempt_memberId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTestAttempt` ADD CONSTRAINT `SkillTestAttempt_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = (SELECT IF(EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SkillTestAttempt' AND CONSTRAINT_NAME = 'SkillTestAttempt_reviewedByParentId_fkey'), 'SELECT 1', 'ALTER TABLE `SkillTestAttempt` ADD CONSTRAINT `SkillTestAttempt_reviewedByParentId_fkey` FOREIGN KEY (`reviewedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'));
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
