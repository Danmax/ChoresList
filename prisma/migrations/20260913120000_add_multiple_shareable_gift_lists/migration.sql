CREATE TABLE `GiftList` (
  `id` CHAR(36) NOT NULL,
  `householdId` CHAR(36) NOT NULL,
  `memberId` CHAR(36) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'general',
  `eventYear` INTEGER NULL,
  `createdByType` VARCHAR(32) NOT NULL DEFAULT 'parent',
  `createdByParentId` CHAR(36) NULL,
  `publicToken` VARCHAR(64) NULL,
  `publicSharedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `GiftList_publicToken_key`(`publicToken`),
  INDEX `GiftList_householdId_memberId_idx`(`householdId`, `memberId`),
  INDEX `GiftList_memberId_type_eventYear_idx`(`memberId`, `type`, `eventYear`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `GiftList` (`id`, `householdId`, `memberId`, `title`, `type`, `createdByType`, `createdAt`, `updatedAt`)
SELECT UUID(), items.`householdId`, items.`memberId`, CONCAT(members.`name`, '''s Wish List'), 'general', 'legacy', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `WishListItem` items
INNER JOIN `FamilyMember` members ON members.`id` = items.`memberId`
GROUP BY items.`householdId`, items.`memberId`, members.`name`;

ALTER TABLE `WishListItem` ADD COLUMN `listId` CHAR(36) NULL;

UPDATE `WishListItem` items
INNER JOIN `GiftList` lists ON lists.`householdId` = items.`householdId` AND lists.`memberId` = items.`memberId` AND lists.`type` = 'general'
SET items.`listId` = lists.`id`;

ALTER TABLE `WishListItem` MODIFY `listId` CHAR(36) NOT NULL;
CREATE INDEX `WishListItem_listId_status_idx` ON `WishListItem`(`listId`, `status`);

ALTER TABLE `GiftList`
  ADD CONSTRAINT `GiftList_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GiftList_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `FamilyMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GiftList_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `WishListItem`
  ADD CONSTRAINT `WishListItem_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `GiftList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
