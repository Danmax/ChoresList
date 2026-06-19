CREATE TABLE `CommunitySurvey` (
    `id` CHAR(36) NOT NULL, `groupId` CHAR(36) NOT NULL, `createdByParentId` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL, `description` TEXT NULL,
    `surveyType` VARCHAR(32) NOT NULL DEFAULT 'survey', `responseMode` VARCHAR(32) NOT NULL DEFAULT 'recorded',
    `resultMode` VARCHAR(32) NOT NULL DEFAULT 'none', `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
    `showAggregateResults` BOOLEAN NOT NULL DEFAULT false, `opensAt` DATETIME(3) NULL, `closesAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL, `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CommunitySurvey_groupId_status_idx`(`groupId`, `status`), INDEX `CommunitySurvey_createdByParentId_idx`(`createdByParentId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySurveyQuestion` (
    `id` CHAR(36) NOT NULL, `surveyId` CHAR(36) NOT NULL, `questionType` VARCHAR(32) NOT NULL,
    `prompt` TEXT NOT NULL, `helpText` TEXT NULL, `required` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0, `config` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CommunitySurveyQuestion_surveyId_sortOrder_idx`(`surveyId`, `sortOrder`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySurveyOption` (
    `id` CHAR(36) NOT NULL, `questionId` CHAR(36) NOT NULL, `label` VARCHAR(255) NOT NULL,
    `imageUrl` VARCHAR(1024) NULL, `sortOrder` INTEGER NOT NULL DEFAULT 0, `scoreWeights` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CommunitySurveyOption_questionId_sortOrder_idx`(`questionId`, `sortOrder`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySurveyOutcome` (
    `id` CHAR(36) NOT NULL, `surveyId` CHAR(36) NOT NULL, `outcomeKey` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL, `description` TEXT NULL, `imageUrl` VARCHAR(1024) NULL, `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `CommunitySurveyOutcome_surveyId_outcomeKey_key`(`surveyId`, `outcomeKey`),
    INDEX `CommunitySurveyOutcome_surveyId_sortOrder_idx`(`surveyId`, `sortOrder`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySurveySubmission` (
    `id` CHAR(36) NOT NULL, `surveyId` CHAR(36) NOT NULL, `respondentParentId` CHAR(36) NULL,
    `participantId` CHAR(36) NULL, `respondentKey` CHAR(64) NOT NULL, `outcomeId` CHAR(36) NULL,
    `scoreSnapshot` JSON NULL, `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `CommunitySurveySubmission_surveyId_respondentKey_key`(`surveyId`, `respondentKey`),
    INDEX `CommunitySurveySubmission_surveyId_submittedAt_idx`(`surveyId`, `submittedAt`),
    INDEX `CommunitySurveySubmission_respondentParentId_idx`(`respondentParentId`),
    INDEX `CommunitySurveySubmission_participantId_idx`(`participantId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySurveyAnswer` (
    `id` CHAR(36) NOT NULL, `submissionId` CHAR(36) NOT NULL, `questionId` CHAR(36) NOT NULL,
    `textValue` TEXT NULL, `numberValue` DOUBLE NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `CommunitySurveyAnswer_submissionId_questionId_key`(`submissionId`, `questionId`),
    INDEX `CommunitySurveyAnswer_questionId_idx`(`questionId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySurveyAnswerOption` (
    `id` CHAR(36) NOT NULL, `answerId` CHAR(36) NOT NULL, `optionId` CHAR(36) NOT NULL, `sortOrder` INTEGER NOT NULL DEFAULT 0,
    UNIQUE INDEX `CommunitySurveyAnswerOption_answerId_optionId_key`(`answerId`, `optionId`),
    INDEX `CommunitySurveyAnswerOption_optionId_idx`(`optionId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommunitySurvey` ADD CONSTRAINT `CommunitySurvey_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurvey` ADD CONSTRAINT `CommunitySurvey_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyQuestion` ADD CONSTRAINT `CommunitySurveyQuestion_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `CommunitySurvey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyOption` ADD CONSTRAINT `CommunitySurveyOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `CommunitySurveyQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyOutcome` ADD CONSTRAINT `CommunitySurveyOutcome_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `CommunitySurvey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveySubmission` ADD CONSTRAINT `CommunitySurveySubmission_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `CommunitySurvey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveySubmission` ADD CONSTRAINT `CommunitySurveySubmission_respondentParentId_fkey` FOREIGN KEY (`respondentParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveySubmission` ADD CONSTRAINT `CommunitySurveySubmission_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `CommunityParticipant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveySubmission` ADD CONSTRAINT `CommunitySurveySubmission_outcomeId_fkey` FOREIGN KEY (`outcomeId`) REFERENCES `CommunitySurveyOutcome`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyAnswer` ADD CONSTRAINT `CommunitySurveyAnswer_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `CommunitySurveySubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyAnswer` ADD CONSTRAINT `CommunitySurveyAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `CommunitySurveyQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyAnswerOption` ADD CONSTRAINT `CommunitySurveyAnswerOption_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `CommunitySurveyAnswer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunitySurveyAnswerOption` ADD CONSTRAINT `CommunitySurveyAnswerOption_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `CommunitySurveyOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
