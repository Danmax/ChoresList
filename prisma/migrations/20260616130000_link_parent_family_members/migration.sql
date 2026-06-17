ALTER TABLE `FamilyMember` ADD COLUMN `parentAccountId` INTEGER NULL;

CREATE UNIQUE INDEX `FamilyMember_parentAccountId_key` ON `FamilyMember`(`parentAccountId`);
CREATE INDEX `FamilyMember_householdId_role_idx` ON `FamilyMember`(`householdId`, `role`);

ALTER TABLE `FamilyMember` ADD CONSTRAINT `FamilyMember_parentAccountId_fkey` FOREIGN KEY (`parentAccountId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
