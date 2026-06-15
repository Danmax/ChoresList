ALTER TABLE `ParentAccount`
  ADD COLUMN `displayName` VARCHAR(255) NULL,
  ADD COLUMN `parentType` VARCHAR(64) NOT NULL DEFAULT 'parent',
  ADD COLUMN `relationshipLabel` VARCHAR(128) NULL,
  ADD COLUMN `childAccessMode` VARCHAR(32) NOT NULL DEFAULT 'all',
  ADD COLUMN `childAccessMemberIds` JSON NULL;

ALTER TABLE `FamilyMember`
  ADD COLUMN `relationshipToHousehold` VARCHAR(64) NOT NULL DEFAULT 'child',
  ADD COLUMN `familyBranch` VARCHAR(64) NOT NULL DEFAULT 'primary',
  ADD COLUMN `custodySchedule` VARCHAR(128) NULL,
  ADD COLUMN `familyNotes` VARCHAR(255) NULL;
