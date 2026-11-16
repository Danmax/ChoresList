import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTargets, applyFarmAction, farmBreakfast, nextFarmStop, celebrateFarm, completedTasks, createFarm, FARM_TASKS, farmReady, nextFarmDay, type FarmState } from "../lib/sunny-farm";

function helpAll(farm: FarmState, task: typeof FARM_TASKS[number]) {
  for (const stage of task.stages) for (const target of stage) farm = applyFarmAction(farm, task.id, target);
  return farm;
}
test("connected farm loop supplies hay, saves goods, and celebrates once", () => {
  let farm = createFarm(100);
  for (const task of FARM_TASKS) farm = helpAll(farm, task);
  assert.equal(completedTasks(farm), 8);
  assert.equal(farmReady(farm), true);
  assert.deepEqual(farm.inventory, { hay: 1, milk: 1, eggs: 3, wool: 3, apples: 3, carrots: 9 });
  farm = celebrateFarm(farm);
  assert.equal(farm.completedDays, 1);
  assert.throws(() => celebrateFarm(farm), /already/);
  const next = nextFarmDay(farm, 200);
  assert.equal(next.round, 2);
  assert.equal(next.startedAt, 200);
  assert.equal(next.completedDays, 1);
  assert.equal(completedTasks(next), 0);
  assert.equal(next.inventory.hay, 0);
});
test("rejects out-of-order steps, duplicates, invented tasks, and premature rewards", () => {
  const farm = createFarm();
  assert.equal(applyFarmAction(farm, "horse", "feed").inventory.hay, 0, "barn hay allows direct feeding even with an empty field basket");
  assert.throws(() => applyFarmAction(farm, "cow", "milk-finish"), /another step/);
  assert.throws(() => applyFarmAction(farm, "garden", "harvest-0"), /another step/);
  assert.throws(() => applyFarmAction(farm, "bogus", "feed"), /Choose/);
  assert.throws(() => celebrateFarm(farm), /eight/);
  assert.throws(() => nextFarmDay(farm), /Finish/);
  const next = applyFarmAction(farm, "hay", "bale-2");
  assert.throws(() => applyFarmAction(next, "hay", "bale-2"), /already/);
  assert.equal(farm.done.hay.length, 0, "actions must not mutate the previous saved state");
});
test("targets can be collected in any order within a stage and survive JSON saves", () => {
  let farm = createFarm();
  farm = applyFarmAction(farm, "chickens", "feed");
  farm = applyFarmAction(farm, "chickens", "egg-2");
  farm = JSON.parse(JSON.stringify(farm));
  assert.deepEqual(activeTargets(farm, "chickens"), ["egg-0", "egg-1"]);
  farm = applyFarmAction(farm, "chickens", "egg-0");
  farm = applyFarmAction(farm, "chickens", "egg-1");
  assert.equal(farm.inventory.eggs, 3);
  assert.equal(completedTasks(farm), 1);
});

test("all nine field beds must be planted and watered before harvest", () => {
  let farm = createFarm();
  for (let i = 0; i < 9; i++) farm = applyFarmAction(farm, "garden", `plant-${i}`);
  assert.equal(activeTargets(farm, "garden").length, 9);
  assert.throws(() => applyFarmAction(farm, "garden", "harvest-8"), /another step/);
  for (let i = 0; i < 9; i++) farm = applyFarmAction(farm, "garden", `water-${i}`);
  farm = applyFarmAction(farm, "garden", "harvest-8");
  assert.equal(farm.inventory.carrots, 1);
});

test("direct animal feeding uses barn hay without negative inventory or duplicate meals", () => {
  let farm = createFarm();
  farm = applyFarmAction(farm, "horse", "feed");
  farm = applyFarmAction(farm, "cow", "feed");
  assert.equal(farm.inventory.hay, 0);
  assert.throws(() => applyFarmAction(farm, "cow", "feed"), /already/);
  assert.deepEqual(activeTargets(farm, "cow"), ["milk-left"]);
});

test("breakfast goal links animal care and produce while preserving free exploration", () => {
  let farm = createFarm();
  assert.equal(nextFarmStop(farm), "chickens");
  farm = helpAll(farm, FARM_TASKS.find(t => t.id === "orchard")!);
  assert.equal(farmBreakfast(farm).find(g => g.item === "apples")!.ready, true);
  assert.equal(farmBreakfast(farm).every(g => g.ready), false);
  farm = helpAll(farm, FARM_TASKS.find(t => t.id === "chickens")!);
  assert.equal(nextFarmStop(farm), "cow");
  farm = helpAll(farm, FARM_TASKS.find(t => t.id === "cow")!);
  assert.equal(farmBreakfast(farm).every(g => g.ready), true);
  assert.equal(nextFarmStop(farm), "hay");
});
