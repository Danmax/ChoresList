ALTER TABLE `WishListItem`
  ADD COLUMN `priceAlertCents` INTEGER NULL,
  ADD COLUMN `lastPriceCents` INTEGER NULL,
  ADD COLUMN `lastPriceCheckedAt` DATETIME(3) NULL,
  ADD COLUMN `priceAlertSentAt` DATETIME(3) NULL;
