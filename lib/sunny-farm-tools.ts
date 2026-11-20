import type { FarmTaskId } from "./sunny-farm";
export type FarmTool = { id: string; label: string; item?: string; symbol?: string; motion: "rub" | "pour" | "pull" | "drag" | "feed" | "collect"; instruction: string };
export function farmTool(task: FarmTaskId, target: string): FarmTool {
  if (target.startsWith("till")) return { id: "hoe", label: "Garden hoe", symbol: "⛏️", motion: "rub", instruction: "Pick up the hoe. Sweep back and forth over an empty plot to prepare the soil." };
  if (target.startsWith("brush")) return { id: "brush", label: "Grooming brush", item: "brush", motion: "rub", instruction: "Pick up the brush. Hold and sweep it back and forth over the dust." };
  if (target.startsWith("wool")) return { id: "clippers", label: "Wool clippers", item: "clippers", motion: "rub", instruction: "Pick up the clippers. Gently sweep them over the fluffy wool." };
  if (target.startsWith("plant")) return { id: "seeds", label: "Planting seeds", item: "seeds", motion: "pour", instruction: "Choose a crop from the seed tray. Hold the seeds over a prepared plot to plant it." };
  if (target.startsWith("water")) return { id: "water", label: "Watering can", symbol: "🚿", motion: "pour", instruction: "Pick up the watering can. Hold over each bed until the soil is watered." };
  if (target.startsWith("harvest")) return { id: "harvest", label: "Harvest sickle", symbol: "🌾", motion: "pull", instruction: "Pick up the sickle. Pull upward on a ready crop to collect it in your farm basket." };
  if (target.startsWith("milk")) return { id: "pail", label: "Milking pail", item: "pail", motion: "pull", instruction: "Pick up the pail. Pull the handle downward to squeeze milk into it." };
  if (target.startsWith("egg") || target.startsWith("apple")) return { id: "basket", label: "Collecting basket", item: "basket", motion: "collect", instruction: "Drag an egg or apple into the basket, or tap it and then tap the basket." };
  if (task === "hay") return { id: "tractor", label: "Tractor keys", symbol: "🔑", motion: "drag", instruction: "Pick up the tractor keys. Drag from the tractor to a hay bale to collect it." };
  if (target.startsWith("herd")) return { id: "guide", label: "Shepherd's crook", symbol: "🦯", motion: "pull", instruction: "Pick up the shepherd’s crook. Guide each sheep toward the gate by dragging to the right." };
  if (task === "ducks") return { id: "duckFeed", label: "Duck pellets", item: "duckFeed", motion: "feed", instruction: "Tap a duck to give it pellets. You can also carry the feed to the duck." };
  if (task === "chickens") return { id: "chickenFeed", label: "Chicken grain", item: "chickenFeed", motion: "feed", instruction: "Tap a chicken to scatter grain. Happy chickens have eggs waiting in their nests." };
  return { id: "hay", label: "Fresh hay", symbol: "🌾", motion: "feed", instruction: "Tap your animal to feed it fresh hay, or drag hay directly onto it. Barn hay is always available." };
}
