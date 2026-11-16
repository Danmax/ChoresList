/** Shared farm rules. Only the server persists actions and awards completion rewards. */
export const FARM_TASKS = [
  { id: "hay", title: "Hayfield", verb: "Gather hay", icon: "🚜", scene: "field", hint: "Pick up the tractor keys and drive to each hay bale to fill your trailer.", stages: [["bale-0", "bale-1", "bale-2"]] },
  { id: "horse", title: "Horse stable", verb: "Feed & brush", icon: "🐴", scene: "stable", hint: "Carry hay to the feeder, then pick up the brush and sweep away the dust.", stages: [["feed"], ["brush-0", "brush-1", "brush-2"]] },
  { id: "cow", title: "Cow barn", verb: "Feed & milk", icon: "🐮", scene: "barn", hint: "Carry hay to the feeder, then pick up the pail and pull the milking handles.", stages: [["feed"], ["milk-left"], ["milk-right"], ["milk-finish"]] },
  { id: "chickens", title: "Chicken coop", verb: "Feed & collect eggs", icon: "🐔", scene: "coop", hint: "Pick up grain to fill the feeder, then use your basket to collect the eggs.", stages: [["feed"], ["egg-0", "egg-1", "egg-2"]] },
  { id: "sheep", title: "Sheep meadow", verb: "Guide & shear", icon: "🐑", scene: "pasture", hint: "Use the shepherd’s crook to guide the sheep, then sweep the clippers over their wool.", stages: [["herd-0", "herd-1", "herd-2"], ["wool-0", "wool-1", "wool-2"]] },
  { id: "ducks", title: "Duck pond", verb: "Feed the ducks", icon: "🦆", scene: "pond", hint: "Pick up duck pellets and sprinkle a little feed over each duck.", stages: [["duck-0", "duck-1", "duck-2"]] },
  { id: "orchard", title: "Apple orchard", verb: "Pick apples", icon: "🍎", scene: "hub", hint: "Pick up a basket and gently pull ripe apples from your orchard tree.", stages: [["apple-0", "apple-1", "apple-2"]] },
  { id: "garden", title: "Vegetable garden", verb: "Plant, water & harvest", icon: "🥕", scene: "garden", hint: "Pick up seeds, water the nine beds with your watering can, then pull up the carrots.", stages: [Array.from({ length: 9 }, (_, i) => `plant-${i}`), Array.from({ length: 9 }, (_, i) => `water-${i}`), Array.from({ length: 9 }, (_, i) => `harvest-${i}`)] },
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
