ALTER TABLE `CommunityGroup`
  ADD COLUMN `organizationDomain` VARCHAR(255) NULL,
  ADD COLUMN `verificationStatus` VARCHAR(32) NOT NULL DEFAULT 'not_required',
  ADD COLUMN `verificationMethod` VARCHAR(32) NULL,
  ADD COLUMN `verificationNote` VARCHAR(500) NULL,
  ADD COLUMN `verifiedAt` DATETIME(3) NULL,
  ADD COLUMN `verifiedByParentId` CHAR(36) NULL;

-- Existing public groups are held for review rather than silently presenting
-- as verified establishments. Private groups never require verification.
UPDATE `CommunityGroup`
SET `verificationStatus` = CASE WHEN `visibility` = 'public' THEN 'pending' ELSE 'not_required' END;

CREATE INDEX `CommunityGroup_visibility_verificationStatus_idx`
  ON `CommunityGroup`(`visibility`, `verificationStatus`);
