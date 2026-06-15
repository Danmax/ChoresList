-- CreateTable
CREATE TABLE `CommunityGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creatorParentId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `groupType` VARCHAR(64) NOT NULL DEFAULT 'other',
    `description` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `visibility` VARCHAR(64) NOT NULL DEFAULT 'private',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `parentId` INTEGER NOT NULL,
    `role` VARCHAR(64) NOT NULL DEFAULT 'member',
    `status` VARCHAR(64) NOT NULL DEFAULT 'active',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CommunityMember_groupId_parentId_key`(`groupId`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `createdByParentId` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL DEFAULT 'other',
    `date` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT false,
    `location` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityRsvp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `parentId` INTEGER NOT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'going',
    `guests` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CommunityRsvp_eventId_parentId_key`(`eventId`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityEventItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `quantity` VARCHAR(64) NULL,
    `note` TEXT NULL,
    `assignedToParentId` INTEGER NULL,
    `claimedByParentId` INTEGER NULL,
    `claimNote` TEXT NULL,
    `status` VARCHAR(64) NOT NULL DEFAULT 'open',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommunityGroup` ADD CONSTRAINT `CommunityGroup_creatorParentId_fkey` FOREIGN KEY (`creatorParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityMember` ADD CONSTRAINT `CommunityMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityMember` ADD CONSTRAINT `CommunityMember_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEvent` ADD CONSTRAINT `CommunityEvent_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CommunityGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEvent` ADD CONSTRAINT `CommunityEvent_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityRsvp` ADD CONSTRAINT `CommunityRsvp_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityRsvp` ADD CONSTRAINT `CommunityRsvp_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ParentAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEventItem` ADD CONSTRAINT `CommunityEventItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `CommunityEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEventItem` ADD CONSTRAINT `CommunityEventItem_assignedToParentId_fkey` FOREIGN KEY (`assignedToParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityEventItem` ADD CONSTRAINT `CommunityEventItem_claimedByParentId_fkey` FOREIGN KEY (`claimedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
