/** Shared farm rules. Only the server persists actions and awards completion rewards. */
import { createHayfield, driveHayfield, hayfieldProgress, type HayfieldState } from "./sunny-farm-hayfield";
export const FARM_CROPS = [
  { id: "wheat", label: "Wheat", icon: "🌾", inventory: "wheat", growMs: 30_000, kind: "Grain" },
  { id: "carrot", label: "Carrots", icon: "🥕", inventory: "carrots", growMs: 45_000, kind: "Vegetable" },
  { id: "tomato", label: "Tomatoes", icon: "🍅", inventory: "tomatoes", growMs: 60_000, kind: "Vegetable" },
  { id: "corn", label: "Corn", icon: "🌽", inventory: "corn", growMs: 90_000, kind: "Vegetable" },
  { id: "strawberry", label: "Strawberries", icon: "🍓", inventory: "strawberries", growMs: 75_000, kind: "Fruit" },
  { id: "potato", label: "Potatoes", icon: "🥔", inventory: "potatoes", growMs: 60_000, kind: "Vegetable" },
  { id: "blueberry", label: "Blueberries", icon: "🫐", inventory: "blueberries", growMs: 105_000, kind: "Fruit" },
  { id: "pumpkin", label: "Pumpkins", icon: "🎃", inventory: "pumpkins", growMs: 120_000, kind: "Vegetable" },
  { id: "watermelon", label: "Watermelons", icon: "🍉", inventory: "watermelons", growMs: 150_000, kind: "Fruit" },
] as const;
export type FarmCropId = typeof FARM_CROPS[number]["id"];
/** Beds planted before crop selection was added remain carrots. */
export function bedCrop(state: FarmState, bed: number) {
  return FARM_CROPS.find(crop => crop.id === state.gardenCrops?.[bed]) ?? FARM_CROPS[1];
}
export const FARM_TASKS = [
  { id: "hay", title: "Hayfield", verb: "Gather hay", icon: "🚜", scene: "field", hint: "Drive the tractor to mow 100% of the field. Then use the pickup truck to collect bundles and deliver them to the barn.", stages: [["mow"], ["haul"], ["deliver"]] },
  { id: "horse", title: "Horse stable", verb: "Feed & brush", icon: "🐴", scene: "stable", hint: "Tap the horse to feed it, then brush its coat.", stages: [["feed"], ["brush-0", "brush-1", "brush-2"]] },
  { id: "cow", title: "Cow barn", verb: "Feed & milk", icon: "🐮", scene: "barn", hint: "Tap the cow to feed it, then collect milk for our farm breakfast.", stages: [["feed"], ["milk-left"], ["milk-right"], ["milk-finish"]] },
  { id: "chickens", title: "Chicken coop", verb: "Feed & collect eggs", icon: "🐔", scene: "coop", hint: "Tap a chicken to feed the flock, then move the eggs from their nests into the basket.", stages: [["feed"], ["egg-0", "egg-1", "egg-2"]] },
  { id: "sheep", title: "Sheep meadow", verb: "Guide & shear", icon: "🐑", scene: "pasture", hint: "Use the shepherd’s crook to guide the sheep, then sweep the clippers over their wool.", stages: [["herd-0", "herd-1", "herd-2"], ["wool-0", "wool-1", "wool-2"]] },
  { id: "ducks", title: "Duck pond", verb: "Feed the ducks", icon: "🦆", scene: "pond", hint: "Tap each duck to give it pellets.", stages: [["duck-0", "duck-1", "duck-2"]] },
  { id: "orchard", title: "Apple orchard", verb: "Pick apples", icon: "🍎", scene: "hub", hint: "Move ripe apples into your basket for our farm breakfast.", stages: [["apple-0", "apple-1", "apple-2"]] },
  { id: "garden", title: "Vegetable garden", verb: "Plant, water & harvest", icon: "🌾", scene: "garden", hint: "Hoe a plot, choose seeds, then plant and water. Each crop grows in its own time. Visit your animals while you wait!", stages: [Array.from({ length: 9 }, (_, i) => `till-${i}`), Array.from({ length: 9 }, (_, i) => `plant-${i}`), Array.from({ length: 9 }, (_, i) => `water-${i}`), Array.from({ length: 9 }, (_, i) => `harvest-${i}`)] },
] as const;
export type FarmTaskId = typeof FARM_TASKS[number]["id"];
export type FarmState = {
  schema: 1; round: number; completedDays: number; startedAt: number; celebrated: boolean;
  done: Record<FarmTaskId, string[]>;
  gardenCrops?: Partial<Record<number, FarmCropId>>;
  gardenWateredAt?: Partial<Record<number, number>>;
  hayfield?: HayfieldState;
  inventory: { hay: number; eggs: number; milk: number; wool: number; apples: number; carrots: number } & Partial<Record<typeof FARM_CROPS[number]["inventory"], number>>;
};
export class FarmRuleError extends Error {}
export function createFarm(now = Date.now(), completedDays = 0): FarmState {
  return { schema: 1, round: completedDays + 1, completedDays, startedAt: now, celebrated: false,
    done: Object.fromEntries(FARM_TASKS.map(t => [t.id, [] as string[]])) as FarmState["done"],
    inventory: { hay: 0, eggs: 0, milk: 0, wool: 0, apples: 0, carrots: 0, ...Object.fromEntries(FARM_CROPS.map(c => [c.inventory, 0])) }, gardenCrops: {}, gardenWateredAt: {}, hayfield: createHayfield() };
}
export function farmHayfield(state: FarmState) { return state.hayfield ?? createHayfield(state.done.hay); }
export function applyHayfieldDrive(state: FarmState, commands: unknown): FarmState {
  if (state.celebrated) throw new FarmRuleError("Start another farm day to play again.");
  const before = farmHayfield(state);
  const hayfield = driveHayfield(before, commands);
  const progress = hayfieldProgress(hayfield);
  return { ...state, hayfield, done: { ...state.done, hay: progress.complete ? ["mow", "haul", "deliver"] : progress.percent < 100 ? [] : hayfield.vehicle === "tractor" ? ["mow"] : ["mow", "haul"] },
    inventory: { ...state.inventory, hay: state.inventory.hay + hayfield.delivered.length - before.delivered.length } };
}
export function taskDefinition(id: unknown) { return FARM_TASKS.find(t => t.id === id); }
export function cropTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ""}` : `${seconds}s`;
}
/** Watering timestamps are server-owned; older watered saves are already ripe. */
export function gardenPlot(state: FarmState, bed: number, now = Date.now()) {
  const done = state.done.garden;
  const crop = bedCrop(state, bed);
  const wateredAt = state.gardenWateredAt?.[bed];
  const remainingMs = wateredAt === undefined ? 0 : Math.max(0, wateredAt + crop.growMs - now);
  const phase = done.includes(`harvest-${bed}`) ? "harvested" : !done.includes(`plant-${bed}`) ? (done.includes(`till-${bed}`) ? "tilled" : "empty") : !done.includes(`water-${bed}`) ? "planted" : remainingMs > 0 ? "growing" : "ready";
  const action = phase === "empty" ? `till-${bed}` : phase === "tilled" ? `plant-${bed}` : phase === "planted" ? `water-${bed}` : phase === "ready" ? `harvest-${bed}` : null;
  return { crop, phase, action, remainingMs, growth: Math.max(0, Math.min(1, 1 - remainingMs / crop.growMs)) };
}
export function activeTargets(state: FarmState, taskId: FarmTaskId, now = Date.now()): string[] {
  if (taskId === "hay") {
    const field = farmHayfield(state), progress = hayfieldProgress(field);
    return progress.complete ? [] : progress.percent < 100 ? ["mow"] : field.vehicle === "tractor" ? ["haul"] : ["deliver"];
  }
  if (taskId === "garden") return Array.from({ length: 9 }, (_, i) => gardenPlot(state, i, now).action).filter((target): target is string => target !== null);
  const task = taskDefinition(taskId)!;
  for (const stage of task.stages) {
    const remaining = stage.filter(target => !state.done[taskId].includes(target));
    if (remaining.length) return remaining;
  }
  return [];
}
export function taskComplete(state: FarmState, taskId: FarmTaskId) { return taskId === "garden" ? Array.from({ length: 9 }, (_, i) => `harvest-${i}`).every(t => state.done.garden.includes(t)) : activeTargets(state, taskId).length === 0; }
export function completedTasks(state: FarmState) { return FARM_TASKS.filter(t => taskComplete(state, t.id)).length; }
export function farmReady(state: FarmState) { return completedTasks(state) === FARM_TASKS.length; }
export function applyFarmAction(state: FarmState, taskId: unknown, target: unknown, crop?: unknown, now = Date.now()): FarmState {
  const task = taskDefinition(taskId);
  if (!task || typeof target !== "string") throw new FarmRuleError("Choose a farm activity.");
  if (task.id === "hay") throw new FarmRuleError("Drive the tractor and pickup truck to finish the hayfield.");
  if (state.celebrated) throw new FarmRuleError("Start another farm day to play again.");
  if (task.id === "garden" && /^harvest-[0-8]$/.test(target) && gardenPlot(state, Number(target.split("-")[1]), now).phase === "growing") throw new FarmRuleError("This crop is still growing. Come back when its timer is ready.");
  if (!activeTargets(state, task.id, now).includes(target)) throw new FarmRuleError("That step is already done, or another step comes first.");
  const planting = task.id === "garden" && target.startsWith("plant-");
  if (crop !== undefined && (!planting || !FARM_CROPS.some(c => c.id === crop))) throw new FarmRuleError("Choose seeds from the seed tray before planting.");
  const next = structuredClone(state);
  if (planting) next.gardenCrops = { ...next.gardenCrops, [Number(target.split("-")[1])]: (crop ?? "carrot") as FarmCropId };
  if (task.id === "garden" && target.startsWith("water-")) next.gardenWateredAt = { ...next.gardenWateredAt, [Number(target.split("-")[1])]: now };
  next.done[task.id].push(target);
  if (target === "feed" && (task.id === "horse" || task.id === "cow")) next.inventory.hay = Math.max(0, next.inventory.hay - 1);
  if (task.id === "chickens" && target.startsWith("egg-")) next.inventory.eggs++;
  if (task.id === "cow" && target === "milk-finish") next.inventory.milk++;
  if (task.id === "sheep" && target.startsWith("wool-")) next.inventory.wool++;
  if (task.id === "orchard") next.inventory.apples++;
  if (task.id === "garden" && target.startsWith("harvest-")) {
    const item = bedCrop(next, Number(target.split("-")[1])).inventory;
    next.inventory[item] = (next.inventory[item] ?? 0) + 1;
  }
  return next;
}
export function celebrateFarm(state: FarmState): FarmState {
  if (!farmReady(state)) throw new FarmRuleError("Help at all eight farm stops first.");
  if (state.celebrated) throw new FarmRuleError("This farm day has already been celebrated.");
  return { ...state, celebrated: true, completedDays: state.completedDays + 1 };
}
export function nextFarmDay(state: FarmState, now = Date.now()) {
  if (!state.celebrated) throw new FarmRuleError("Finish this farm day before starting another.");
  return createFarm(now, state.completedDays);
}

/** One shared purpose across locations, derived from saved goods and care. */
export function farmBreakfast(state: FarmState) {
  const goods = [{ item: "eggs", label: "Eggs", goal: 3, task: "chickens" }, { item: "milk", label: "Milk", goal: 1, task: "cow" }, { item: "apples", label: "Apples", goal: 3, task: "orchard" }] as const;
  return goods.map(g => ({ ...g, amount: state.inventory[g.item], ready: state.inventory[g.item] >= g.goal }));
}
export function nextFarmStop(state: FarmState): FarmTaskId | null {
  // A short story through breakfast first, then the rest of the farm. Exploration remains open.
  const order: FarmTaskId[] = ["chickens", "cow", "orchard", "hay", "horse", "sheep", "ducks", "garden"];
  return order.find(id => !taskComplete(state, id)) ?? null;
}
