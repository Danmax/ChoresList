CREATE TABLE `Recipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `householdId` INTEGER NOT NULL,
    `createdByParentId` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `servings` INTEGER NOT NULL DEFAULT 4,
    `prepMinutes` INTEGER NULL,
    `cookMinutes` INTEGER NULL,
    `photoUrl` VARCHAR(512) NULL,
    `instructions` TEXT NULL,
    `visibility` VARCHAR(64) NOT NULL DEFAULT 'private',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Recipe_householdId_visibility_idx`(`householdId`, `visibility`),
    INDEX `Recipe_visibility_createdAt_idx`(`visibility`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RecipeIngredient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipeId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `quantity` VARCHAR(64) NULL,
    `unit` VARCHAR(64) NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'pantry',
    `note` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `Household`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_createdByParentId_fkey` FOREIGN KEY (`createdByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
