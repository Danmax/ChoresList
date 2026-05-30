ALTER TABLE `ParentAccount`
  ADD COLUMN `accountRole` VARCHAR(32) NOT NULL DEFAULT 'owner';

UPDATE `ParentAccount` parent
JOIN (
  SELECT `householdId`, MIN(`id`) AS ownerId
  FROM `ParentAccount`
  GROUP BY `householdId`
) owners ON owners.`householdId` = parent.`householdId`
SET parent.`accountRole` = 'parent'
WHERE parent.`id` <> owners.ownerId;

ALTER TABLE `TaskCompletion`
  ADD COLUMN `completionDate` DATETIME(3) NULL;

UPDATE `TaskCompletion`
SET `completionDate` = TIMESTAMP(DATE(`completedAt`));

UPDATE `TaskCompletion` tc
JOIN (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `assignmentId`, DATE(`completedAt`)
      ORDER BY `completedAt`, `id`
    ) AS rowNumber
  FROM `TaskCompletion`
) ranked ON ranked.`id` = tc.`id`
SET tc.`completionDate` = DATE_ADD(TIMESTAMP(DATE(tc.`completedAt`)), INTERVAL (ranked.rowNumber - 1) SECOND)
WHERE ranked.rowNumber > 1;

ALTER TABLE `TaskCompletion`
  MODIFY `completionDate` DATETIME(3) NOT NULL;

CREATE UNIQUE INDEX `TaskCompletion_assignmentId_completionDate_key`
  ON `TaskCompletion`(`assignmentId`, `completionDate`);
