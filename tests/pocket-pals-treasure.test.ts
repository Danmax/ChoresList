import assert from "node:assert/strict";
import test from "node:test";
import { advancePet, applyPetAction, createPet, PET_SHOP, publicChallenge, type PetState } from "../lib/pocket-pals";
import { roomItemPosition, treasureClue, TREASURE_OBJECTS, treasureRoomObjects } from "../lib/pocket-pals-treasure";

const day = "2026-10-08";
const now = Date.parse("2026-10-08T16:00:00Z");
const id = "12345678-abcd-4321-9876-123456789abc";
function start(age = 7) {
  const pet = createPet("dog", "Mochi", now, day);
  applyPetAction(pet, "start-treasure", {}, now, age, id);
  return pet;
}
function findNext(pet: PetState, time: number) {
  const c = pet.challenge!;
  const trail = c.treasure!;
  return applyPetAction(pet, "find-treasure", { challengeId: c.id, step: trail.step, objectId: trail.targets[trail.step] }, time, 7, id);
}

test("every room has unique, visible Treasure Trail targets with no décor and with all décor", () => {
  for (const room of ["home", "garden", "library", "stargazer", "sunroom"]) {
    for (const owned of [[], PET_SHOP.filter((item) => item.kind === "decor").map((item) => item.id)]) {
      for (const age of [3, 7, 12, 18]) {
        const pet = createPet("cat", "Miso", now, day);
        pet.room = room;
        pet.owned = owned;
        applyPetAction(pet, "start-treasure", {}, now, age, id);
        const trail = pet.challenge!.treasure!;
        assert.equal(trail.room, room);
        assert.equal(trail.targets.length, age < 6 ? 2 : 3);
        assert.equal(new Set(trail.targets).size, trail.targets.length);
        assert.deepEqual(trail.objectIds, treasureRoomObjects(owned).map((item) => item.id));
        assert.ok(trail.targets.every((target) => trail.objectIds.includes(target)));
        for (let step = 0; step < trail.targets.length; step++) findNext(pet, now + (step + 1) * 3000);
        applyPetAction(pet, "open-treasure", { challengeId: id, step: trail.targets.length }, now + 15_000, age, id);
        assert.equal(pet.gamesPlayed, 1);
        assert.equal(pet.coins, 28);
      }
    }
  }
});

test("published trails reveal only the current clue, with age-appropriate hints", () => {
  for (const age of [4, 7, 10, 17]) {
    const pet = start(age);
    const c = publicChallenge(pet, age)!;
    assert.equal(c.kind, "treasure");
    assert.ok(c.treasure);
    const target = TREASURE_OBJECTS.find((item) => item.id === pet.challenge!.treasure!.targets[0])!;
    assert.equal(c.treasure.clue, treasureClue(target, age, roomItemPosition(pet.roomPositions, pet.room, target.id)));
    assert.equal(c.treasure.picture, age < 6 ? target.emoji : null);
    assert.ok(!("targets" in c.treasure));
    assert.ok(!JSON.stringify(c).includes('"answer"'));
    findNext(pet, now + 3000);
    assert.equal(publicChallenge(pet, age)!.treasure!.step, 1);
    assert.deepEqual(publicChallenge(pet, age)!.treasure!.found, [target.id]);
  }
});

test("room items move within safe bounds, persist per room, and update directional clues", () => {
  const pet = createPet("dog", "Mochi", now, day);
  const before = pet.lastActionAt;
  applyPetAction(pet, "move-room-item", { itemId: "trail-plant", x: 88.26, y: 25.74 }, now, 12, id);
  assert.deepEqual(pet.roomPositions?.home?.["trail-plant"], { x: 88.3, y: 25.7 });
  assert.equal(pet.lastActionAt, before);
  applyPetAction(pet, "start-treasure", {}, now + 3000, 12, "00abcdef-abcd-4321-9876-123456789abc");
  pet.challenge!.treasure!.targets[0] = "trail-plant";
  assert.match(publicChallenge(pet, 12)!.treasure!.clue, /upper-right/);
  assert.throws(() => applyPetAction(pet, "move-room-item", { itemId: "trail-book", x: 30, y: 40 }, now + 4000, 12, id));
  pet.challenge = null;
  for (const input of [{ itemId: "trail-book", x: 7, y: 50 }, { itemId: "trail-book", x: 50, y: 83 }, { itemId: "trail-book", x: NaN, y: 50 }, { itemId: "cozy-sofa", x: 50, y: 50 }, { itemId: "not-real", x: 50, y: 50 }]) {
    assert.throws(() => applyPetAction(pet, "move-room-item", input, now + 5000, 12, id));
  }
  pet.owned.push("cozy-sofa");
  applyPetAction(pet, "move-room-item", { itemId: "cozy-sofa", x: 70, y: 70 }, now + 6000, 12, id);
  pet.room = "garden";
  assert.deepEqual(roomItemPosition(pet.roomPositions, "garden", "trail-plant"), { x: 18, y: 76 });
  applyPetAction(pet, "move-room-item", { itemId: "trail-plant", x: 20, y: 30 }, now + 7000, 12, id);
  assert.deepEqual(pet.roomPositions?.home?.["trail-plant"], { x: 88.3, y: 25.7 });
  assert.deepEqual(pet.roomPositions?.garden?.["trail-plant"], { x: 20, y: 30 });
  const saved = JSON.parse(JSON.stringify(pet));
  assert.deepEqual(saved.roomPositions, pet.roomPositions);
});

test("wrong objects offer a hint without penalties, then allow the correct find", () => {
  const pet = start();
  const trail = pet.challenge!.treasure!;
  const wrong = trail.objectIds.find((object) => object !== trail.targets[0])!;
  const before = { coins: pet.coins, xp: pet.xp, happiness: pet.happiness, energy: pet.energy };
  const message = applyPetAction(pet, "find-treasure", { challengeId: id, step: 0, objectId: wrong }, now + 3000, 7, id);
  assert.match(message, /Keep exploring!/);
  assert.equal(trail.step, 0);
  assert.deepEqual({ coins: pet.coins, xp: pet.xp, happiness: pet.happiness, energy: pet.energy }, before);
  findNext(pet, now + 6000);
  assert.equal(trail.step, 1);
  assert.equal(pet.gamesPlayed, 0);
});

test("treasure actions reject forged, stale, skipped and invisible targets", () => {
  const pet = start();
  const input = { challengeId: id, step: 0, objectId: pet.challenge!.treasure!.targets[0] };
  for (const invalid of [{ ...input, challengeId: "forged" }, { ...input, step: 1 }, { ...input, step: "0" }, { ...input, objectId: "potted-palm" }, { ...input, objectId: null }]) {
    assert.throws(() => applyPetAction(pet, "find-treasure", invalid, now + 3000, 7, id));
    assert.equal(pet.challenge!.treasure!.step, 0);
  }
  assert.throws(() => applyPetAction(pet, "open-treasure", input, now + 3000, 7, id));
  findNext(pet, now + 3000);
  assert.throws(() => applyPetAction(pet, "find-treasure", input, now + 6000, 7, id));
  assert.equal(pet.challenge!.treasure!.step, 1);
  assert.equal(pet.coins, 20);
});

test("trail progress survives a reload and has no five-minute speed deadline", () => {
  const pet = start();
  findNext(pet, now + 3000);
  const reload = advancePet(JSON.parse(JSON.stringify(pet)), now + 3_600_000, day);
  assert.equal(reload.challenge!.treasure!.step, 1);
  assert.equal(publicChallenge(reload, 7)!.treasure!.step, 1);
  findNext(reload, now + 3_600_000);
  assert.equal(reload.challenge!.treasure!.step, 2);
  assert.equal(advancePet(reload, now + 86_400_000, "2026-10-09").challenge, null);
});

test("trails freeze their room objects but buying or equipping a different room clears the trail", () => {
  const pet = start();
  pet.coins = 1000;
  const objectIds = [...pet.challenge!.treasure!.objectIds];
  applyPetAction(pet, "buy", { itemId: "potted-palm" }, now + 1000, 7, id);
  assert.deepEqual(publicChallenge(pet, 7)!.treasure!.objectIds, objectIds);
  applyPetAction(pet, "buy", { itemId: "garden" }, now + 2000, 7, id);
  assert.equal(pet.challenge, null);
  applyPetAction(pet, "start-treasure", {}, now + 3000, 7, id);
  assert.ok(pet.challenge!.treasure!.objectIds.includes("potted-palm"));
  applyPetAction(pet, "equip", { itemId: "home" }, now + 4000, 7, id);
  assert.equal(pet.challenge, null);
  assert.throws(() => applyPetAction(pet, "find-treasure", { challengeId: id, step: 0, objectId: "trail-book" }, now + 6000, 7, id));
  applyPetAction(pet, "start-treasure", {}, now + 7000, 7, id);
  pet.room = "library";
  assert.equal(publicChallenge(pet, 7), null);
  assert.equal(advancePet(pet, now + 9000, day).challenge, null);
});

test("treasure rewards require opening the chest once and share the three-win daily cap", () => {
  const pet = start();
  pet.daily.playRewards = 2; // Two wins from other games today.
  for (let round = 0; round < 2; round++) {
    const time = now + round * 20_000;
    if (round) applyPetAction(pet, "start-treasure", {}, time, 7, id);
    for (let step = 0; step < 3; step++) findNext(pet, time + (step + 1) * 3000);
    assert.equal(pet.gamesPlayed, round);
    assert.equal(publicChallenge(pet, 7)!.treasure!.chestReady, true);
    applyPetAction(pet, "open-treasure", { challengeId: id, step: 3 }, time + 12_000, 7, id);
    assert.equal(pet.coins, 28);
    assert.equal(pet.daily.playRewards, 3);
    assert.equal(pet.gamesPlayed, round + 1);
    assert.ok(pet.daily.tasks.includes("play"));
    assert.throws(() => applyPetAction(pet, "open-treasure", { challengeId: id, step: 3 }, time + 15_000, 7, id));
  }
});

test("switching activities cancels the trail and prevents old round actions", () => {
  const pet = start();
  applyPetAction(pet, "start-bubble", {}, now + 3000, 7, "new-round");
  assert.throws(() => applyPetAction(pet, "find-treasure", { challengeId: id, step: 0, objectId: "trail-book" }, now + 6000, 7, id));
  assert.equal(pet.challenge!.kind, "bubble");
});
