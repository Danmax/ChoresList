ALTER TABLE `WishListItem`
  ADD COLUMN `purchaseStatus` VARCHAR(32) NOT NULL DEFAULT 'not_ordered',
  ADD COLUMN `estimatedCostCents` INTEGER NULL;
