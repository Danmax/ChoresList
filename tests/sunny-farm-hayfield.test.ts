import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFarmAction, applyHayfieldDrive, createFarm, farmHayfield, taskComplete } from "../lib/sunny-farm";
import { createHayfield, driveHayfield, HAY_BUNDLES, HAY_CELL_COUNT, HAY_DEPOT, HAY_TRUCK_CAPACITY, hayfieldProgress, type HayCommand } from "../lib/sunny-farm-hayfield";
import { hayfieldRoute } from "./helpers/sunny-farm-hayfield";

test("mower coverage counts unique cells, forms bundles, and requires every last patch", () => {
  const original = createHayfield();
  const first = driveHayfield(original, ["right"]);
  assert.equal(original.cut.length, 0);
  assert.ok(first.cut.length > 0);
  const repeat = driveHayfield(first, ["left", "right"]);
  assert.equal(repeat.cut.length, first.cut.length, "driving over cut ground cannot increase coverage");
  let field = createHayfield();
  for (const c of hayfieldRoute(field, true)) field = driveHayfield(field, [c]);
  assert.equal(field.cut.length, HAY_CELL_COUNT);
  assert.equal(hayfieldProgress(field).percent, 100);
  assert.equal(hayfieldProgress(field).bundles.length, 9);
  assert.equal(hayfieldProgress(field).complete, false);
  field.cut.pop();
  assert.ok(hayfieldProgress(field).percent < 100);
  assert.throws(() => driveHayfield(field, ["truck"]), /100%/);
});

test("truck unlocks after mowing, has limited capacity, and delivers only at the barn", () => {
  assert.throws(() => driveHayfield(createHayfield(), ["truck"]), /100%/);
  let field = { ...createHayfield(), cut: Array.from({ length: HAY_CELL_COUNT }, (_, i) => i) };
  field = driveHayfield(field, ["truck"]);
  field = { ...field, x: HAY_BUNDLES[0].x, y: HAY_BUNDLES[0].y };
  field = driveHayfield(field, ["right"]);
  assert.deepEqual(field.picked, [0]);
  assert.equal(field.delivered.length, 0, "picking up a bundle does not deliver it");
  field = { ...field, picked: [0, 1, 2], x: HAY_BUNDLES[3].x, y: HAY_BUNDLES[3].y };
  field = driveHayfield(field, ["right"]);
  assert.equal(hayfieldProgress(field).cargo.length, HAY_TRUCK_CAPACITY);
  assert.equal(field.picked.includes(3), false);
  field = { ...field, x: HAY_DEPOT.x, y: HAY_DEPOT.y + 2 };
  field = driveHayfield(field, ["up"]);
  assert.deepEqual(field.delivered, [0, 1, 2]);
  assert.equal(hayfieldProgress(field).cargo.length, 0);
  assert.deepEqual(driveHayfield(field, ["up", "down"]).delivered, [0, 1, 2]);
});

test("server driving saves a complete round and adds delivered hay exactly once", () => {
  let farm = createFarm();
  const path = hayfieldRoute(farmHayfield(farm));
  for (let i = 0; i < path.length; i += 32) farm = applyHayfieldDrive(JSON.parse(JSON.stringify(farm)), path.slice(i, i + 32));
  assert.equal(taskComplete(farm, "hay"), true);
  assert.equal(farm.inventory.hay, 9);
  assert.equal(farmHayfield(farm).delivered.length, 9);
  assert.equal(applyHayfieldDrive(farm, ["down"]).inventory.hay, 9);
  assert.throws(() => applyFarmAction(createFarm(), "hay", "bale-0"), /Drive/);
  assert.throws(() => applyFarmAction(createFarm(), "hay", "mow"), /Drive/);
  assert.throws(() => applyHayfieldDrive({ ...farm, celebrated: true }, ["down"]), /another farm day/);
});

test("driving rejects malformed batches, respects field bounds and cannot drive through the barn", () => {
  for (const moves of [null, [], ["warp"], ["constructor"], ["__proto__"], [null], Array(33).fill("up"), { x: 23, y: 4 }]) assert.throws(() => driveHayfield(createHayfield(), moves), /direction/);
  let field = createHayfield();
  field = driveHayfield(field, Array(32).fill("left") as HayCommand[]);
  assert.equal(field.x, 0);
  field = driveHayfield(field, Array(32).fill("up") as HayCommand[]);
  assert.equal(field.y, 0);
  field = driveHayfield({ ...field, x: 20, y: 2 }, ["right"]);
  assert.equal(field.x, 20);
});

test("legacy hay progress keeps completed work and only credits newly delivered bundles", () => {
  const farm = createFarm();
  delete farm.hayfield;
  farm.done.hay = ["bale-0", "bale-2"];
  farm.inventory.hay = 2;
  assert.equal(farmHayfield(farm).delivered.length, 6);
  assert.equal(taskComplete(farm, "hay"), false);
  let resumed = farm;
  const path = hayfieldRoute(farmHayfield(resumed));
  for (let i = 0; i < path.length; i += 32) resumed = applyHayfieldDrive(resumed, path.slice(i, i + 32));
  assert.equal(resumed.inventory.hay, 5);
  assert.equal(taskComplete(resumed, "hay"), true);
  farm.done.hay = ["bale-0", "bale-1", "bale-2"];
  assert.equal(taskComplete(farm, "hay"), true);
});
