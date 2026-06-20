-- These guards let the migration resume if the first ALTER succeeded before a
-- later statement failed (for example, due to an index-name length limit).
SET @survey_migration_sql = IF(
  EXISTS(
    SELECT 1 FROM `information_schema`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = DATABASE()
      AND `TABLE_NAME` = 'CommunitySurvey'
      AND `COLUMN_NAME` = 'allowMultipleSubmissions'
  ),
  'SELECT 1',
  'ALTER TABLE `CommunitySurvey` ADD COLUMN `allowMultipleSubmissions` BOOLEAN NOT NULL DEFAULT false'
);
PREPARE survey_migration_stmt FROM @survey_migration_sql;
EXECUTE survey_migration_stmt;
DEALLOCATE PREPARE survey_migration_stmt;

SET @survey_migration_sql = IF(
  EXISTS(
    SELECT 1 FROM `information_schema`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = DATABASE()
      AND `TABLE_NAME` = 'CommunitySurvey'
      AND `COLUMN_NAME` = 'allowResultSharing'
  ),
  'SELECT 1',
  'ALTER TABLE `CommunitySurvey` ADD COLUMN `allowResultSharing` BOOLEAN NOT NULL DEFAULT false'
);
PREPARE survey_migration_stmt FROM @survey_migration_sql;
EXECUTE survey_migration_stmt;
DEALLOCATE PREPARE survey_migration_stmt;

ALTER TABLE `CommunitySurveySubmission`
  DROP INDEX `CommunitySurveySubmission_surveyId_respondentKey_key`,
  ADD COLUMN `attemptNumber` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `shareToken` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `CommunitySurveySubmission_shareToken_key`(`shareToken`),
  ADD UNIQUE INDEX `survey_submission_attempt_key`(`surveyId`, `respondentKey`, `attemptNumber`),
  ADD INDEX `CommunitySurveySubmission_surveyId_respondentKey_idx`(`surveyId`, `respondentKey`);
