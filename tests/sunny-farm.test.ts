import { test } from "node:test";
import assert from "node:assert/strict";
import { activeTargets, applyFarmAction, celebrateFarm, completedTasks, createFarm, FARM_TASKS, farmReady, nextFarmDay, type FarmState } from "../lib/sunny-farm";

function helpAll(farm: FarmState, task: typeof FARM_TASKS[number]) {
  for (const stage of task.stages) for (const target of stage) farm = applyFarmAction(farm, task.id, target);
  return farm;
}
test("connected farm loop supplies hay, saves goods, and celebrates once", () => {
  let farm = createFarm(100);
  for (const task of FARM_TASKS) farm = helpAll(farm, task);
  assert.equal(completedTasks(farm), 8);
  assert.equal(farmReady(farm), true);
  assert.deepEqual(farm.inventory, { hay: 1, milk: 1, eggs: 3, wool: 3, apples: 3, carrots: 3 });
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
  assert.throws(() => applyFarmAction(farm, "horse", "feed"), /hayfield/);
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
