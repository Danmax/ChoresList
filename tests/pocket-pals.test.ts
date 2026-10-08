import assert from "node:assert/strict";
import test from "node:test";
import { advancePet, applyPetAction, completeDailyCare, createPet, createPetAppearance, currentLesson, petDay, petSerial, PET_SPECIES, publicChallenge } from "../lib/pocket-pals";

const day = "2026-10-08";
const now = Date.parse("2026-10-08T16:00:00Z");
const id = "12345678-abcd-4321-9876-123456789abc";

test("each Pocket Pal species offers a varied set of cute name ideas", () => {
  for (const species of PET_SPECIES) {
    assert.ok(species.names.length >= 10);
    assert.ok((species.names as readonly string[]).includes(species.name));
    assert.equal(new Set(species.names).size, species.names.length);
  }
});

test("a Pal has a durable serial and serializable visual identity", () => {
  const serial = petSerial("12345678-abcd-4321-9876-123456789abc");
  const appearance = createPetAppearance("cat", 17);
  const pet = createPet("cat", "Miso", now, day, serial, appearance);
  assert.equal(serial, "PP-12345678ABCD");
  assert.deepEqual(JSON.parse(JSON.stringify(pet.appearance)), appearance);
  assert.equal(pet.serialNumber, serial);
  assert.ok(appearance.baseColor && appearance.pattern && appearance.texture && appearance.eyeColor);
});

test("elapsed care is calculated from the saved baseline and never drains a pet to zero", () => {
  const saved = createPet("cat", "Miso", now, day);
  const preview = advancePet(saved, now + 48 * 3_600_000, "2026-10-10");
  assert.equal(preview.hunger, 20);
  assert.equal(preview.energy, 22);
  assert.equal(saved.hunger, 65);
  assert.equal(preview.dumplings, 10);
  assert.deepEqual(advancePet(saved, now + 48 * 3_600_000, "2026-10-10"), preview);
  const afterSaving = advancePet(preview, now + 48 * 3_600_000, "2026-10-10");
  assert.equal(afterSaving.dumplings, 10);
});

test("a full nap survives a reload, increases energy once, and completes the rest task", () => {
  const pet = createPet("dog", "Mochi", now, day);
  pet.energy = 30;
  applyPetAction(pet, "sleep", {}, now, 7, id);
  const halfway = advancePet(pet, now + 15_000, day);
  assert.equal(halfway.energy, 60);
  assert.ok(halfway.sleepingUntil);
  assert.ok(!halfway.daily.tasks.includes("sleep"));
  const awake = advancePet(halfway, now + 35_000, day);
  assert.equal(awake.energy, 90);
  assert.equal(awake.sleepingUntil, null);
  assert.ok(awake.daily.tasks.includes("sleep"));
  assert.equal(advancePet(awake, now + 35_000, day).xp, awake.xp);
});

test("an interrupted nap earns only elapsed rest and cannot complete the daily sleep task", () => {
  const pet = createPet("dog", "Mochi", now, day);
  pet.energy = 30;
  applyPetAction(pet, "sleep", {}, now, 7, id);
  const partial = advancePet(pet, now + 5000, day);
  applyPetAction(partial, "wake", {}, now + 5000, 7, id);
  assert.equal(partial.energy, 40);
  assert.ok(!partial.daily.tasks.includes("sleep"));
});

test("daily care pays once, grows a streak, and resets after a missed day", () => {
  const pet = createPet("monkey", "Kiki", now, day);
  pet.daily.tasks = ["feed", "clean", "play", "learn", "sleep"];
  assert.equal(completeDailyCare(pet), true);
  assert.equal(pet.coins, 50);
  assert.equal(completeDailyCare(pet), false);
  const tomorrow = advancePet(pet, now + 86_400_000, "2026-10-09");
  assert.deepEqual(tomorrow.daily.tasks, []);
  tomorrow.daily.tasks = [...pet.daily.tasks];
  completeDailyCare(tomorrow);
  assert.equal(tomorrow.streak, 2);
  assert.equal(tomorrow.coins, 82);
  const later = advancePet(tomorrow, now + 3 * 86_400_000, "2026-10-11");
  later.daily.tasks = [...pet.daily.tasks];
  completeDailyCare(later);
  assert.equal(later.streak, 1);
});

test("a nap crossing midnight counts toward the new local day", () => {
  const pet = createPet("cat", "Miso", now, day);
  applyPetAction(pet, "sleep", {}, now, 7, id);
  const awake = advancePet(pet, now + 35_000, "2026-10-09");
  assert.deepEqual(awake.daily.tasks, ["sleep"]);
});

test("memory rounds require the issued challenge, minimum time, and correct sequence", () => {
  const pet = createPet("guinea-pig", "Pudding", now, day);
  applyPetAction(pet, "start-play", {}, now, 5, id);
  assert.equal(pet.challenge?.sequence?.length, 3);
  assert.throws(() => applyPetAction(pet, "finish-play", { challengeId: "forged", sequence: pet.challenge?.sequence }, now + 5000, 5, id));
  assert.throws(() => applyPetAction(pet, "finish-play", { challengeId: id, sequence: pet.challenge?.sequence }, now + 2500, 5, id));
  const before = pet.coins;
  applyPetAction(pet, "finish-play", { challengeId: id, sequence: [-1, -1, -1] }, now + 5000, 5, id);
  assert.equal(pet.coins, before);
  applyPetAction(pet, "finish-play", { challengeId: id, sequence: pet.challenge?.sequence }, now + 7500, 5, id);
  assert.equal(pet.gamesPlayed, 1);
  assert.equal(pet.coins, before + 8);
  assert.throws(() => applyPetAction(pet, "finish-play", { challengeId: id, sequence: [0, 0, 0] }, now + 10_000, 5, id));
});

test("lessons hide answers, teach after mistakes, and cannot replay rewards", () => {
  const pet = createPet("monkey", "Kiki", now, day);
  const lesson = currentLesson(pet, 7);
  applyPetAction(pet, "start-learn", {}, now, 7, id);
  assert.ok(!("answer" in publicChallenge(pet, 7)!));
  applyPetAction(pet, "answer", { challengeId: id, choice: (lesson.answer + 1) % 3 }, now + 3000, 7, id);
  assert.equal(pet.lessonsLearned, 0);
  const response = applyPetAction(pet, "answer", { challengeId: id, choice: lesson.answer }, now + 6000, 7, id);
  assert.equal(response, lesson.explanation);
  assert.equal(pet.lessonsLearned, 1);
  assert.equal(pet.smarts, 4);
  assert.equal(pet.coins, 26);
  assert.throws(() => applyPetAction(pet, "answer", { challengeId: id, choice: lesson.answer }, now + 9000, 7, id));
});

test("repeat play and learning coins have a daily ceiling", () => {
  const pet = createPet("dog", "Mochi", now, day);
  for (let i = 0; i < 5; i++) {
    const start = now + i * 10_000;
    const lesson = currentLesson(pet, 7);
    applyPetAction(pet, "start-learn", {}, start, 7, id);
    applyPetAction(pet, "answer", { challengeId: id, choice: lesson.answer }, start + 3000, 7, id);
  }
  assert.equal(pet.coins, 38);
  assert.equal(pet.daily.learnRewards, 3);
  assert.equal(pet.lessonsLearned, 5);
  assert.equal(pet.xp, 10);
});

test("shop prevents negative balances, duplicate purchases, and equipping unowned items", () => {
  const pet = createPet("cat", "Miso", now, day);
  assert.throws(() => applyPetAction(pet, "buy", { itemId: "crown" }, now, 7, id));
  assert.throws(() => applyPetAction(pet, "equip", { itemId: "garden" }, now, 7, id));
  pet.coins = 100;
  applyPetAction(pet, "buy", { itemId: "bow" }, now, 7, id);
  assert.equal(pet.coins, 60);
  assert.equal(pet.accessory, "bow");
  assert.throws(() => applyPetAction(pet, "buy", { itemId: "bow" }, now, 7, id));
  applyPetAction(pet, "refill", {}, now, 7, id);
  assert.equal(pet.dumplings, 12);
  assert.equal(pet.coins, 55);
});

test("daily care uses the household time zone across a daylight saving boundary", () => {
  assert.equal(petDay(Date.parse("2026-10-09T03:59:59Z"), "America/New_York"), "2026-10-08");
  assert.equal(petDay(Date.parse("2026-10-09T04:00:00Z"), "America/New_York"), "2026-10-09");
  assert.equal(petDay(Date.parse("2026-11-01T05:30:00Z"), "America/New_York"), "2026-11-01");
  assert.equal(petDay(Date.parse("2026-11-01T06:30:00Z"), "America/New_York"), "2026-11-01");
});
