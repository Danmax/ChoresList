ALTER TABLE `CommunitySurvey`
  ADD COLUMN `allowMultipleSubmissions` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `allowResultSharing` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `CommunitySurveySubmission`
  DROP INDEX `CommunitySurveySubmission_surveyId_respondentKey_key`,
  ADD COLUMN `attemptNumber` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `shareToken` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `CommunitySurveySubmission_shareToken_key`(`shareToken`),
  ADD UNIQUE INDEX `survey_submission_attempt_key`(`surveyId`, `respondentKey`, `attemptNumber`),
  ADD INDEX `CommunitySurveySubmission_surveyId_respondentKey_idx`(`surveyId`, `respondentKey`);
