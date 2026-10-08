ALTER TABLE `Household`
  ADD COLUMN `hasHouseholdPet` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `householdPetName` VARCHAR(64) NULL;
