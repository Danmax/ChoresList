CREATE TABLE `HouseholdPlugin` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
  `pluginKey` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'inactive',
  `settings` JSON NULL,
  `activatedAt` DATETIME(3) NULL,
  `activatedByParentId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `HouseholdPlugin_householdId_pluginKey_key`(`householdId`, `pluginKey`),
  INDEX `HouseholdPlugin_pluginKey_idx`(`pluginKey`),
  INDEX `HouseholdPlugin_activatedByParentId_idx`(`activatedByParentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyTreeNode` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
  `kind` VARCHAR(32) NOT NULL DEFAULT 'external',
  `familyMemberId` INTEGER NULL,
  `parentAccountId` INTEGER NULL,
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

  UNIQUE INDEX `FamilyTreeNode_householdId_familyMemberId_key`(`householdId`, `familyMemberId`),
  UNIQUE INDEX `FamilyTreeNode_householdId_parentAccountId_key`(`householdId`, `parentAccountId`),
  INDEX `FamilyTreeNode_householdId_kind_idx`(`householdId`, `kind`),
  INDEX `FamilyTreeNode_familyMemberId_idx`(`familyMemberId`),
  INDEX `FamilyTreeNode_parentAccountId_idx`(`parentAccountId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyTreeRelationship` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `householdId` INTEGER NOT NULL,
  `fromNodeId` INTEGER NOT NULL,
  `toNodeId` INTEGER NOT NULL,
  `relationshipType` VARCHAR(64) NOT NULL,
  `label` VARCHAR(128) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `FamilyTreeRelationship_fromNodeId_toNodeId_relationshipType_key`(`fromNodeId`, `toNodeId`, `relationshipType`),
  INDEX `FamilyTreeRelationship_householdId_relationshipType_idx`(`householdId`, `relationshipType`),
  INDEX `FamilyTreeRelationship_toNodeId_idx`(`toNodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `HouseholdPlugin`
  ADD CONSTRAINT `HouseholdPlugin_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `HouseholdPlugin_activatedByParentId_fkey` FOREIGN KEY (`activatedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FamilyTreeNode`
  ADD CONSTRAINT `FamilyTreeNode_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FamilyTreeNode_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FamilyTreeNode_parentAccountId_fkey` FOREIGN KEY (`parentAccountId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FamilyTreeRelationship`
  ADD CONSTRAINT `FamilyTreeRelationship_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FamilyTreeRelationship_fromNodeId_fkey` FOREIGN KEY (`fromNodeId`) REFERENCES `FamilyTreeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FamilyTreeRelationship_toNodeId_fkey` FOREIGN KEY (`toNodeId`) REFERENCES `FamilyTreeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
