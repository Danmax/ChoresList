-- The constraint may be absent or have a database-generated name on an
-- existing installation. Drop every foreign key on the column when present.
SET @drop_recorded_by_parent_fks = (
  SELECT IF(
    COUNT(*) = 0,
    'SELECT 1',
    CONCAT(
      'ALTER TABLE `WellbeingCheckIn` ',
      GROUP_CONCAT(
        DISTINCT CONCAT(
          'DROP FOREIGN KEY `',
          REPLACE(`CONSTRAINT_NAME`, '`', '``'),
          '`'
        )
        SEPARATOR ', '
      )
    )
  )
  FROM `information_schema`.`KEY_COLUMN_USAGE`
  WHERE `CONSTRAINT_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'WellbeingCheckIn'
    AND `COLUMN_NAME` = 'recordedByParentId'
    AND `REFERENCED_TABLE_NAME` IS NOT NULL
);

PREPARE drop_recorded_by_parent_fks FROM @drop_recorded_by_parent_fks;
EXECUTE drop_recorded_by_parent_fks;
DEALLOCATE PREPARE drop_recorded_by_parent_fks;

ALTER TABLE `WellbeingCheckIn`
  MODIFY `recordedByParentId` CHAR(36) NULL;

SET @add_recorded_by_device_column = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `WellbeingCheckIn` ADD COLUMN `recordedByDeviceId` CHAR(36) NULL',
    'SELECT 1'
  )
  FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'WellbeingCheckIn'
    AND `COLUMN_NAME` = 'recordedByDeviceId'
);

PREPARE add_recorded_by_device_column FROM @add_recorded_by_device_column;
EXECUTE add_recorded_by_device_column;
DEALLOCATE PREPARE add_recorded_by_device_column;

-- A previous partial run may already have added the device foreign key.
SET @drop_recorded_by_device_fks = (
  SELECT IF(
    COUNT(*) = 0,
    'SELECT 1',
    CONCAT(
      'ALTER TABLE `WellbeingCheckIn` ',
      GROUP_CONCAT(
        DISTINCT CONCAT(
          'DROP FOREIGN KEY `',
          REPLACE(`CONSTRAINT_NAME`, '`', '``'),
          '`'
        )
        SEPARATOR ', '
      )
    )
  )
  FROM `information_schema`.`KEY_COLUMN_USAGE`
  WHERE `CONSTRAINT_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'WellbeingCheckIn'
    AND `COLUMN_NAME` = 'recordedByDeviceId'
    AND `REFERENCED_TABLE_NAME` IS NOT NULL
);

PREPARE drop_recorded_by_device_fks FROM @drop_recorded_by_device_fks;
EXECUTE drop_recorded_by_device_fks;
DEALLOCATE PREPARE drop_recorded_by_device_fks;

ALTER TABLE `WellbeingCheckIn`
  ADD CONSTRAINT `WellbeingCheckIn_recordedByParentId_fkey`
    FOREIGN KEY (`recordedByParentId`) REFERENCES `ParentAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `WellbeingCheckIn_recordedByDeviceId_fkey`
    FOREIGN KEY (`recordedByDeviceId`) REFERENCES `HouseholdDevice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET @add_recorded_by_device_index = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `WellbeingCheckIn_recordedByDeviceId_idx` ON `WellbeingCheckIn` (`recordedByDeviceId`)',
    'SELECT 1'
  )
  FROM `information_schema`.`STATISTICS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'WellbeingCheckIn'
    AND `INDEX_NAME` = 'WellbeingCheckIn_recordedByDeviceId_idx'
);

PREPARE add_recorded_by_device_index FROM @add_recorded_by_device_index;
EXECUTE add_recorded_by_device_index;
DEALLOCATE PREPARE add_recorded_by_device_index;
