import type { FarmTaskId } from "./sunny-farm";
export type FarmTool = { id: string; label: string; item?: string; symbol?: string; motion: "rub" | "pour" | "pull" | "drag"; instruction: string };
export function farmTool(task: FarmTaskId, target: string): FarmTool {
  if (target.startsWith("brush")) return { id: "brush", label: "Grooming brush", item: "brush", motion: "rub", instruction: "Pick up the brush. Hold and sweep it back and forth over the dust." };
  if (target.startsWith("wool")) return { id: "clippers", label: "Wool clippers", item: "clippers", motion: "rub", instruction: "Pick up the clippers. Gently sweep them over the fluffy wool." };
  if (target.startsWith("plant")) return { id: "seeds", label: "Carrot seeds", item: "seeds", motion: "pour", instruction: "Pick up the seeds. Hold over each soil bed to sow a row." };
  if (target.startsWith("water")) return { id: "water", label: "Watering can", symbol: "🚿", motion: "pour", instruction: "Pick up the watering can. Hold over each bed until the soil is watered." };
  if (target.startsWith("harvest")) return { id: "harvest", label: "Harvest gloves", symbol: "🧤", motion: "pull", instruction: "Put on your gloves. Grab the carrots and pull upward to harvest." };
  if (target.startsWith("milk")) return { id: "pail", label: "Milking pail", item: "pail", motion: "pull", instruction: "Pick up the pail. Pull the handle downward to squeeze milk into it." };
  if (target.startsWith("egg") || target.startsWith("apple")) return { id: "basket", label: "Collecting basket", item: "basket", motion: "pull", instruction: "Pick up the basket. Gently pull an egg or apple downward to collect it." };
  if (task === "hay") return { id: "tractor", label: "Tractor keys", symbol: "🔑", motion: "drag", instruction: "Pick up the tractor keys. Drag from the tractor to a hay bale to collect it." };
  if (target.startsWith("herd")) return { id: "guide", label: "Shepherd's crook", symbol: "🦯", motion: "pull", instruction: "Pick up the shepherd’s crook. Guide each sheep toward the gate by dragging to the right." };
  if (task === "ducks") return { id: "duckFeed", label: "Duck pellets", item: "duckFeed", motion: "pour", instruction: "Pick up the duck pellets. Hold over a duck to sprinkle its food." };
  if (task === "chickens") return { id: "chickenFeed", label: "Chicken grain", item: "chickenFeed", motion: "pour", instruction: "Pick up the grain. Hold over the feeder to scatter a meal." };
  return { id: "hay", label: "Fresh hay", symbol: "🌾", motion: "drag", instruction: "Pick up the hay. Carry it to your animal’s feeder and release to serve." };
}
