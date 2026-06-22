ALTER TABLE `CommunitySurvey`
  ADD COLUMN `allowPublicResponses` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `publicToken` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `survey_public_token_key`(`publicToken`);
