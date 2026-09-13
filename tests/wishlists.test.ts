import assert from "node:assert/strict";
import test from "node:test";
import { canCreateBirthdayList, daysUntilBirthday, defaultWishListTitle, wishListEventYear } from "../lib/wishlists";

test("birthday lists unlock six weeks before the next birthday", () => {
  const now = new Date(2026, 8, 13);
  assert.equal(daysUntilBirthday(10, 25, now), 42);
  assert.equal(canCreateBirthdayList(10, 25, now), true);
  assert.equal(canCreateBirthdayList(10, 26, now), false);
  assert.equal(canCreateBirthdayList(null, null, now), false);
});

test("birthday countdown crosses the year boundary", () => {
  assert.equal(daysUntilBirthday(1, 1, new Date(2026, 11, 20)), 12);
  assert.equal(canCreateBirthdayList(1, 1, new Date(2026, 11, 20)), true);
});

test("default list titles match their occasion", () => {
  assert.equal(defaultWishListTitle("general", "Mia", new Date(2026, 8, 13)), "Mia's Wish List");
  assert.equal(defaultWishListTitle("birthday", "Mia", new Date(2026, 8, 13)), "Mia's Birthday List");
  assert.equal(defaultWishListTitle("christmas", "Mia", new Date(2026, 8, 13)), "Christmas 2026");
  assert.equal(wishListEventYear("christmas", null, null, new Date(2026, 11, 26)), 2027);
  assert.equal(wishListEventYear("birthday", 1, 1, new Date(2026, 11, 20)), 2027);
});
