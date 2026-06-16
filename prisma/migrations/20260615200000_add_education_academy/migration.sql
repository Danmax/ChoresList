CREATE TABLE `EducationMaterialSet` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
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

CREATE TABLE `EducationMaterial` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `setId` INTEGER NOT NULL,
  `prompt` TEXT NOT NULL,
  `answer` TEXT NOT NULL,
  `choices` JSON NULL,
  `explanation` TEXT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `EducationMaterial_setId_idx`(`setId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EducationAssignment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
  `memberId` INTEGER NOT NULL,
  `setId` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `dueDate` DATETIME(3) NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'assigned',
  `passingScore` INTEGER NOT NULL DEFAULT 85,
  `pointsReward` INTEGER NOT NULL DEFAULT 10,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `EducationAssignment_householdId_memberId_status_idx`(`householdId`, `memberId`, `status`),
  INDEX `EducationAssignment_setId_idx`(`setId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EducationAttempt` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
  `assignmentId` INTEGER NOT NULL,
  `memberId` INTEGER NOT NULL,
  `score` INTEGER NOT NULL DEFAULT 0,
  `correctCount` INTEGER NOT NULL DEFAULT 0,
  `totalCount` INTEGER NOT NULL DEFAULT 0,
  `passed` BOOLEAN NOT NULL DEFAULT false,
  `answers` JSON NULL,
  `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `EducationAttempt_householdId_memberId_completedAt_idx`(`householdId`, `memberId`, `completedAt`),
  INDEX `EducationAttempt_assignmentId_idx`(`assignmentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EducationProject` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
  `memberId` INTEGER NULL,
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
  INDEX `EducationProject_memberId_idx`(`memberId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EducationMaterialSet`
  ADD CONSTRAINT `EducationMaterialSet_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EducationMaterial`
  ADD CONSTRAINT `EducationMaterial_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `EducationMaterialSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EducationAssignment`
  ADD CONSTRAINT `EducationAssignment_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EducationAssignment_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EducationAssignment_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `EducationMaterialSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EducationAttempt`
  ADD CONSTRAINT `EducationAttempt_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EducationAttempt_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `EducationAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EducationAttempt_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EducationProject`
  ADD CONSTRAINT `EducationProject_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EducationProject_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
