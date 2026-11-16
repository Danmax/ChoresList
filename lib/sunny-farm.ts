/** Shared farm rules. Only the server persists actions and awards completion rewards. */
export const FARM_TASKS = [
  { id: "hay", title: "Hayfield", verb: "Gather hay", icon: "🚜", scene: "field", hint: "Drive to each hay bale to fill your trailer.", stages: [["bale-0", "bale-1", "bale-2"]] },
  { id: "horse", title: "Horse stable", verb: "Feed & brush", icon: "🐴", scene: "stable", hint: "Give your horse hay, then brush the three dusty spots.", stages: [["feed"], ["brush-0", "brush-1", "brush-2"]] },
  { id: "cow", title: "Cow barn", verb: "Feed & milk", icon: "🐮", scene: "barn", hint: "Feed your cow hay, then alternate the left and right handles.", stages: [["feed"], ["milk-left"], ["milk-right"], ["milk-finish"]] },
  { id: "chickens", title: "Chicken coop", verb: "Feed & collect eggs", icon: "🐔", scene: "coop", hint: "Fill the feeder, then collect three eggs from the nests.", stages: [["feed"], ["egg-0", "egg-1", "egg-2"]] },
  { id: "sheep", title: "Sheep meadow", verb: "Guide & shear", icon: "🐑", scene: "pasture", hint: "Guide each sheep through the gate, then gently clip three wool patches.", stages: [["herd-0", "herd-1", "herd-2"], ["wool-0", "wool-1", "wool-2"]] },
  { id: "ducks", title: "Duck pond", verb: "Feed the ducks", icon: "🦆", scene: "pond", hint: "Tap each hungry duck to toss it a little duck feed.", stages: [["duck-0", "duck-1", "duck-2"]] },
  { id: "orchard", title: "Apple orchard", verb: "Pick apples", icon: "🍎", scene: "hub", hint: "Pick three ripe apples from your little orchard tree.", stages: [["apple-0", "apple-1", "apple-2"]] },
  { id: "garden", title: "Vegetable garden", verb: "Plant, water & harvest", icon: "🥕", scene: "hub", hint: "Plant each bed, water the sprouts, then harvest your carrots.", stages: [["plant-0", "plant-1", "plant-2"], ["water-0", "water-1", "water-2"], ["harvest-0", "harvest-1", "harvest-2"]] },
] as const;
export type FarmTaskId = typeof FARM_TASKS[number]["id"];
export type FarmState = {
  schema: 1; round: number; completedDays: number; startedAt: number; celebrated: boolean;
  done: Record<FarmTaskId, string[]>;
  inventory: { hay: number; eggs: number; milk: number; wool: number; apples: number; carrots: number };
};
export class FarmRuleError extends Error {}
export function createFarm(now = Date.now(), completedDays = 0): FarmState {
  return { schema: 1, round: completedDays + 1, completedDays, startedAt: now, celebrated: false,
    done: Object.fromEntries(FARM_TASKS.map(t => [t.id, [] as string[]])) as FarmState["done"],
    inventory: { hay: 0, eggs: 0, milk: 0, wool: 0, apples: 0, carrots: 0 } };
}
export function taskDefinition(id: unknown) { return FARM_TASKS.find(t => t.id === id); }
export function activeTargets(state: FarmState, taskId: FarmTaskId): string[] {
  const task = taskDefinition(taskId)!;
  for (const stage of task.stages) {
    const remaining = stage.filter(target => !state.done[taskId].includes(target));
    if (remaining.length) return remaining;
  }
  return [];
}
export function taskComplete(state: FarmState, taskId: FarmTaskId) { return activeTargets(state, taskId).length === 0; }
export function completedTasks(state: FarmState) { return FARM_TASKS.filter(t => taskComplete(state, t.id)).length; }
export function farmReady(state: FarmState) { return completedTasks(state) === FARM_TASKS.length; }
export function applyFarmAction(state: FarmState, taskId: unknown, target: unknown): FarmState {
  const task = taskDefinition(taskId);
  if (!task || typeof target !== "string") throw new FarmRuleError("Choose a farm activity.");
  if (state.celebrated) throw new FarmRuleError("Start another farm day to play again.");
  if (!activeTargets(state, task.id).includes(target)) throw new FarmRuleError("That step is already done, or another step comes first.");
  if (target === "feed" && (task.id === "horse" || task.id === "cow") && state.inventory.hay < 1) throw new FarmRuleError("Visit the hayfield to collect hay first.");
  const next = structuredClone(state);
  next.done[task.id].push(target);
  if (task.id === "hay") next.inventory.hay++;
  if (target === "feed" && (task.id === "horse" || task.id === "cow")) next.inventory.hay--;
  if (task.id === "chickens" && target.startsWith("egg-")) next.inventory.eggs++;
  if (task.id === "cow" && target === "milk-finish") next.inventory.milk++;
  if (task.id === "sheep" && target.startsWith("wool-")) next.inventory.wool++;
  if (task.id === "orchard") next.inventory.apples++;
  if (task.id === "garden" && target.startsWith("harvest-")) next.inventory.carrots++;
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
