import { driveHayfield, HAY_BUNDLES, HAY_DEPOT, hayfieldProgress, type HayCommand, type HayfieldState } from "../../lib/sunny-farm-hayfield";

/** Test driver: visit four mower swaths, then collect available bundles in loads. */
export function hayfieldRoute(initial: HayfieldState, mowingOnly = false) {
  let field = structuredClone(initial);
  const commands: HayCommand[] = [];
  const command = (c: HayCommand) => { commands.push(c); field = driveHayfield(field, [c]); };
  const go = (x: number, y: number) => {
    while (field.y !== y && !hayfieldProgress(field).complete) command(field.y < y ? "down" : "up");
    while (field.x !== x && !hayfieldProgress(field).complete) command(field.x < x ? "right" : "left");
  };
  if (hayfieldProgress(field).percent < 100) for (const [i, y] of [3, 6, 9, 12].entries()) go(i % 2 ? 2 : 19, y);
  if (mowingOnly) return commands;
  if (field.vehicle === "tractor") command("truck");
  for (let trips = 0; trips < 9 && !hayfieldProgress(field).complete; trips++) {
    while (hayfieldProgress(field).cargo.length < 3 && field.picked.length < 9) {
      const bale = HAY_BUNDLES.find(b => !field.picked.includes(b.id))!;
      go(bale.x, bale.y);
    }
    go(HAY_DEPOT.x, HAY_DEPOT.y);
  }
  return commands;
}
