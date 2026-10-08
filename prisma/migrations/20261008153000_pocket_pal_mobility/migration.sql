-- Pocket Pals become durable household characters: a Pal can have a roster
-- owner, approved caregivers, and an auditable ownership history.
-- Keep a non-unique FK-supporting index before removing the one-owner rule.
ALTER TABLE `VirtualPet` ADD INDEX `VirtualPet_memberId_idx` (`memberId`);
ALTER TABLE `VirtualPet` DROP INDEX `VirtualPet_memberId_key`;
ALTER TABLE `VirtualPet` ADD COLUMN `serialNumber` VARCHAR(32) NULL;
ALTER TABLE `VirtualPet` ADD COLUMN `appearance` JSON NULL;
ALTER TABLE `VirtualPet` ADD COLUMN `status` VARCHAR(24) NOT NULL DEFAULT 'active';

UPDATE `VirtualPet`
SET `serialNumber` = CONCAT('PP-', UPPER(SUBSTRING(REPLACE(`id`, '-', ''), 1, 12))),
    `appearance` = JSON_OBJECT(
      'version', 1,
      'baseColor', 'classic',
      'accentColor', 'warm',
      'pattern', 'natural',
      'texture', 'soft',
      'eyeColor', 'amber',
      'specialMark', NULL
    );

ALTER TABLE `VirtualPet` MODIFY `serialNumber` VARCHAR(32) NOT NULL;
ALTER TABLE `VirtualPet` MODIFY `appearance` JSON NOT NULL;
CREATE UNIQUE INDEX `VirtualPet_serialNumber_key` ON `VirtualPet`(`serialNumber`);
CREATE INDEX `VirtualPet_householdId_memberId_idx` ON `VirtualPet`(`householdId`, `memberId`);

CREATE TABLE `PetCaregiver` (
  `id` CHAR(36) NOT NULL,
  `virtualPetId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `role` VARCHAR(24) NOT NULL DEFAULT 'caregiver',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PetCaregiver_virtualPetId_memberId_key` (`virtualPetId`, `memberId`),
  INDEX `PetCaregiver_memberId_idx` (`memberId`),
  CONSTRAINT `PetCaregiver_virtualPetId_fkey` FOREIGN KEY (`virtualPetId`) REFERENCES `VirtualPet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PetCaregiver_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PetCaregiver` (`id`, `virtualPetId`, `memberId`, `role`)
SELECT UUID(), `id`, `memberId`, 'guardian' FROM `VirtualPet`;

CREATE TABLE `PetActivity` (
  `id` CHAR(36) NOT NULL,
  `virtualPetId` CHAR(36) NOT NULL,
  `actorMemberId` CHAR(36) NULL,
  `type` VARCHAR(48) NOT NULL,
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PetActivity_virtualPetId_createdAt_idx` (`virtualPetId`, `createdAt`),
  INDEX `PetActivity_actorMemberId_idx` (`actorMemberId`),
  CONSTRAINT `PetActivity_virtualPetId_fkey` FOREIGN KEY (`virtualPetId`) REFERENCES `VirtualPet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PetActivity_actorMemberId_fkey` FOREIGN KEY (`actorMemberId`) REFERENCES `FamilyMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PetActivity` (`id`, `virtualPetId`, `actorMemberId`, `type`, `details`, `createdAt`)
SELECT UUID(), `id`, `memberId`, 'adopted', JSON_OBJECT('serialNumber', `serialNumber`), `createdAt` FROM `VirtualPet`;
