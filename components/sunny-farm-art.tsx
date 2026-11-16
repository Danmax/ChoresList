import { useId, type CSSProperties } from "react";

// Viewports into the supplied atlases. Cropping happens at render time; original artwork stays intact.
const items = {
  tractor: [20, 0, 710, 230], duck: [748, 0, 190, 214], swimming: [1090, 40, 232, 168],
  brush: [30, 240, 238, 175], clippers: [265, 250, 247, 155], sheep: [526, 224, 306, 203], shorn: [838, 222, 267, 207], wool: [1125, 260, 310, 151],
  egg: [15, 448, 97, 126], basket: [220, 420, 199, 164], eggs: [425, 418, 190, 165], chickenFeed: [650, 424, 240, 164], duckFeed: [1090, 420, 235, 168],
  pail: [12, 588, 142, 153], milk: [162, 585, 140, 156], apple: [324, 598, 105, 127], carrot: [1200, 588, 145, 147],
  sprout: [142, 745, 88, 100], carrotPlant: [846, 740, 105, 109],
  seeds: [46, 779, 80, 55], soil: [30, 872, 254, 141], sprouts: [286, 871, 244, 143], carrots: [533, 870, 242, 145], tree: [1005, 835, 254, 187],
} satisfies Record<string, number[]>;
export type FarmItem = keyof typeof items;
export function FarmSprite({ item, animal, pose = 0, className, style, label }: { item?: FarmItem; animal?: "cow" | "pig" | "sheep" | "horse" | "chicken"; pose?: number; className?: string; style?: CSSProperties; label?: string }) {
  const clipId = useId();
  const row = animal ? ["cow", "pig", "sheep", "horse", "chicken"].indexOf(animal) : 0;
  // Frames differ slightly in width in the reference; use the generous per-column viewport.
  const columns = [[0, 250], [255, 230], [487, 211], [699, 219], [944, 292], [1250, 282]];
  const [left, width] = columns[Math.min(5, Math.max(0, pose))];
  const rows = [[0, 230], [230, 200], [425, 185], [608, 220], [828, 196]];
  // The idle horse starts lower than its happy pose; exclude the sheep row above it.
  const rect = item ? items[item] : animal === "horse" && pose === 0 ? [left, 620, width, 208] : [left, rows[row][0], width, rows[row][1]];
  return <svg className={className} style={style} viewBox={rect.join(" ")} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <defs><clipPath id={clipId}><rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} /></clipPath></defs>
    <image clipPath={`url(#${clipId})`} href={`/games/sunny-farm/${item ? "items" : "animals"}.webp`} width="1536" height="1024" />
  </svg>;
}
