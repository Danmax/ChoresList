import { test } from "node:test";
import assert from "node:assert/strict";
import { FARM_CROPS, cropTime, gardenPlot, taskComplete, bedCrop, activeTargets, applyFarmAction, farmBreakfast, nextFarmStop, celebrateFarm, completedTasks, createFarm, FARM_TASKS, farmReady, nextFarmDay, type FarmState } from "../lib/sunny-farm";

function helpAll(farm: FarmState, task: typeof FARM_TASKS[number]) {
  for (const stage of task.stages) for (const target of stage) farm = applyFarmAction(farm, task.id, target, undefined, target.startsWith("harvest-") ? 200_000 : 1000);
  return farm;
}
test("connected farm loop supplies hay, saves goods, and celebrates once", () => {
  let farm = createFarm(100);
  for (const task of FARM_TASKS) farm = helpAll(farm, task);
  assert.equal(completedTasks(farm), 8);
  assert.equal(farmReady(farm), true);
  assert.deepEqual(farm.inventory, { hay: 1, milk: 1, eggs: 3, wool: 3, apples: 3, carrots: 9, ...Object.fromEntries(FARM_CROPS.filter(c => c.id !== "carrot").map(c => [c.inventory, 0])) });
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

test("plots can be prepared, planted, watered and harvested independently", () => {
  let farm = createFarm();
  assert.throws(() => applyFarmAction(farm, "garden", "plant-0", "wheat", 1000), /another step/);
  farm = applyFarmAction(farm, "garden", "till-0", undefined, 1000);
  farm = applyFarmAction(farm, "garden", "plant-0", "wheat", 1000);
  farm = applyFarmAction(farm, "garden", "water-0", undefined, 2000);
  assert.equal(gardenPlot(farm, 0, 2000).phase, "growing");
  assert.equal(gardenPlot(farm, 0, 31_999).remainingMs, 1);
  assert.throws(() => applyFarmAction(farm, "garden", "harvest-0", undefined, 31_999), /still growing/);
  farm = applyFarmAction(farm, "garden", "harvest-0", undefined, 32_000);
  assert.equal(farm.inventory.wheat, 1);
  assert.equal(gardenPlot(farm, 1, 32_000).phase, "empty");
  assert.equal(gardenPlot(farm, 0, 32_000).phase, "harvested");
  assert.equal(taskComplete(farm, "garden"), false);
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

test("feedback varies across repeated actions and distinguishes care types", async () => {
  const { responseAt, feedbackKind, FARM_RESPONSES } = await import("../lib/sunny-farm-feedback");
  for (const kind of Object.keys(FARM_RESPONSES) as Array<keyof typeof FARM_RESPONSES>) {
    assert.notEqual(responseAt(kind, 0), responseAt(kind, 1));
    assert.equal(responseAt(kind, FARM_RESPONSES[kind].length), responseAt(kind, 0));
  }
  assert.equal(feedbackKind("horse", "feed"), "feed");
  assert.equal(feedbackKind("chickens", "egg-0"), "egg");
  assert.equal(feedbackKind("garden", "water-0"), "grow");
});


test("all nine crops save per plot and harvest to matching inventory after their own timers", () => {
  let farm = createFarm();
  for (const [i, crop] of FARM_CROPS.entries()) {
    farm = applyFarmAction(farm, "garden", `till-${i}`, undefined, 1000);
    farm = applyFarmAction(farm, "garden", `plant-${i}`, crop.id, 1000);
    farm = applyFarmAction(farm, "garden", `water-${i}`, undefined, 1000);
  }
  farm = JSON.parse(JSON.stringify(farm));
  assert.equal(activeTargets(farm, "garden", 1000).length, 0);
  assert.equal(taskComplete(farm, "garden"), false, "waiting for crops must not complete the garden");
  assert.equal(farmReady(farm), false);
  assert.equal(activeTargets(farm, "garden", 31_000).includes("harvest-0"), true);
  assert.equal(activeTargets(farm, "garden", 31_000).includes("harvest-8"), false);
  for (const [i, crop] of FARM_CROPS.entries()) {
    assert.equal(bedCrop(farm, i).id, crop.id);
    assert.equal(gardenPlot(farm, i, 1000).remainingMs, crop.growMs);
    assert.throws(() => applyFarmAction(farm, "garden", `harvest-${i}`, undefined, 1000 + crop.growMs - 1), /still growing/);
    farm = applyFarmAction(farm, "garden", `harvest-${i}`, undefined, 1000 + crop.growMs);
    assert.equal(farm.inventory[crop.inventory], 1);
    assert.throws(() => applyFarmAction(farm, "garden", `harvest-${i}`, undefined, 1000 + crop.growMs), /already/);
  }
  assert.equal(taskComplete(farm, "garden"), true);
});

test("invalid crops and changes after planting leave saved progress unchanged", () => {
  const farm = applyFarmAction(createFarm(), "garden", "till-0");
  for (const crop of ["dragonfruit", "", null, {}, ["corn"]]) assert.throws(() => applyFarmAction(farm, "garden", "plant-0", crop), /Choose/);
  const planted = applyFarmAction(farm, "garden", "plant-0", "tomato");
  assert.throws(() => applyFarmAction(planted, "garden", "plant-0", "corn"), /already/);
  assert.throws(() => applyFarmAction(planted, "hay", "bale-0", "corn"), /Choose/);
  assert.deepEqual(farm.gardenCrops, {});
  assert.deepEqual(farm.gardenWateredAt, {});
});

test("older planted and watered saves remain playable without redoing care or waiting", () => {
  let farm = createFarm();
  delete farm.gardenCrops;
  delete farm.gardenWateredAt;
  delete farm.inventory.tomatoes;
  delete farm.inventory.corn;
  farm.done.garden = ["plant-0", "plant-1", "water-0"];
  assert.equal(gardenPlot(farm, 0, 1000).phase, "ready");
  assert.equal(gardenPlot(farm, 1, 1000).phase, "planted");
  farm = applyFarmAction(farm, "garden", "harvest-0", undefined, 1000);
  farm = applyFarmAction(farm, "garden", "water-1", undefined, 1000);
  for (let i = 2; i < 9; i++) {
    farm = applyFarmAction(farm, "garden", `till-${i}`, undefined, 1000);
    farm = applyFarmAction(farm, "garden", `plant-${i}`, i === 2 ? "tomato" : i === 3 ? "corn" : "carrot", 1000);
    farm = applyFarmAction(farm, "garden", `water-${i}`, undefined, 1000);
  }
  for (let i = 1; i < 9; i++) farm = applyFarmAction(farm, "garden", `harvest-${i}`, undefined, 200_000);
  assert.equal(farm.inventory.carrots, 7);
  assert.equal(farm.inventory.tomatoes, 1);
  assert.equal(farm.inventory.corn, 1);
  for (const task of FARM_TASKS.filter(t => t.id !== "garden")) farm = helpAll(farm, task);
  const next = nextFarmDay(celebrateFarm(farm));
  assert.deepEqual(next.gardenCrops, {});
  assert.deepEqual(next.gardenWateredAt, {});
  for (const crop of FARM_CROPS) assert.equal(next.inventory[crop.inventory], 0);
});

test("crop timers show seconds, minutes and exact readiness without negative values", () => {
  assert.equal(cropTime(30_000), "30s");
  assert.equal(cropTime(75_000), "1m 15s");
  assert.equal(cropTime(120_000), "2m");
  assert.equal(cropTime(1), "1s");
  assert.equal(cropTime(-1), "0s");
});
