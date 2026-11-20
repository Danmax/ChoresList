/** Deterministic driving rules shared by the browser and the farm endpoint. */
export const HAY_WORLD = { width: 24, height: 16 } as const;
export const HAY_FIELD = { x: 2, y: 2, width: 18, height: 12 } as const;
export const HAY_CELL_COUNT = HAY_FIELD.width * HAY_FIELD.height;
export const HAY_TRUCK_CAPACITY = 3;
export const HAY_DEPOT = { x: 22, y: 4 } as const;
export const HAY_DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
export type HayDirection = keyof typeof HAY_DIRECTIONS;
export type HayCommand = HayDirection | "truck";
export type HayfieldState = {
  cut: number[];
  picked: number[];
  delivered: number[];
  vehicle: "tractor" | "truck";
  x: number;
  y: number;
  facing: HayDirection;
};
export const HAY_BUNDLES = Array.from({ length: 9 }, (_, id) => {
  const col = id % 3, row = Math.floor(id / 3);
  return { id, x: HAY_FIELD.x + col * 6 + 3, y: HAY_FIELD.y + row * 4 + 2,
    cells: Array.from({ length: 24 }, (_, i) => (row * 4 + Math.floor(i / 6)) * HAY_FIELD.width + col * 6 + i % 6) };
});
export function createHayfield(legacyDone: string[] = []): HayfieldState {
  // A former hay-bale action represents one completed third of the old job.
  const delivered = HAY_BUNDLES.filter(b => legacyDone.includes(`bale-${Math.floor(b.id / 3)}`)).map(b => b.id);
  return { cut: delivered.length ? Array.from({ length: HAY_CELL_COUNT }, (_, i) => i) : [], picked: [...delivered], delivered,
    vehicle: delivered.length ? "truck" : "tractor", x: delivered.length ? 22 : 1, y: delivered.length ? 13 : 2, facing: "right" };
}
export function hayfieldProgress(state: HayfieldState) {
  const cut = new Set(state.cut);
  const bundles = HAY_BUNDLES.filter(b => b.cells.every(i => cut.has(i)));
  return { percent: Math.floor(cut.size / HAY_CELL_COUNT * 100), bundles,
    cargo: state.picked.filter(id => !state.delivered.includes(id)), complete: state.delivered.length === HAY_BUNDLES.length };
}
export class HayfieldRuleError extends Error {}
export function driveHayfield(state: HayfieldState, commands: unknown): HayfieldState {
  if (!Array.isArray(commands) || commands.length < 1 || commands.length > 32 || commands.some(c => typeof c !== "string" || (c !== "truck" && !Object.hasOwn(HAY_DIRECTIONS, c)))) {
    throw new HayfieldRuleError("Choose a driving direction. Save up to 32 moves at a time.");
  }
  const next = structuredClone(state);
  const cut = new Set(next.cut);
  for (const command of commands as HayCommand[]) {
    if (next.delivered.length === HAY_BUNDLES.length) break;
    if (command === "truck") {
      if (cut.size !== HAY_CELL_COUNT) throw new HayfieldRuleError("Mow 100% of the field before driving the pickup truck.");
      if (next.vehicle === "tractor") { next.vehicle = "truck"; next.x = 22; next.y = 13; next.facing = "up"; }
      continue;
    }
    const [dx, dy] = HAY_DIRECTIONS[command];
    const x = Math.max(0, Math.min(HAY_WORLD.width - 1, next.x + dx));
    const y = Math.max(0, Math.min(HAY_WORLD.height - 1, next.y + dy));
    next.facing = command;
    // The barn roof is solid; use the loading bay below it.
    if (x >= 21 && y <= 2) continue;
    next.x = x; next.y = y;
    if (next.vehicle === "tractor") {
      // A three-cell mower cuts a broad swath, including the field's edges.
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const col = x + ox - HAY_FIELD.x, row = y + oy - HAY_FIELD.y;
        if (col >= 0 && col < HAY_FIELD.width && row >= 0 && row < HAY_FIELD.height) cut.add(row * HAY_FIELD.width + col);
      }
    } else {
      let cargo = next.picked.length - next.delivered.length;
      for (const bundle of HAY_BUNDLES) {
        if (cargo >= HAY_TRUCK_CAPACITY) break;
        if (!next.picked.includes(bundle.id) && Math.max(Math.abs(x - bundle.x), Math.abs(y - bundle.y)) <= 1) { next.picked.push(bundle.id); cargo++; }
      }
      if (Math.max(Math.abs(x - HAY_DEPOT.x), Math.abs(y - HAY_DEPOT.y)) <= 1) next.delivered = [...next.picked];
    }
  }
  next.cut = [...cut].sort((a, b) => a - b);
  return next;
}
