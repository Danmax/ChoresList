import { useId, type CSSProperties } from "react";

// Viewports into the supplied atlases. Cropping happens at render time; original artwork stays intact.
const items = {
  tractor: [15, 10, 310, 185], trailer: [365, 45, 285, 147],
  duck: [690, 10, 170, 185], swimming: [1070, 40, 210, 150],
  brush: [30, 220, 205, 150], clippers: [255, 230, 225, 135],
  sheep: [515, 205, 255, 175], shorn: [840, 200, 240, 180], wool: [1165, 230, 285, 140],
  egg: [20, 410, 85, 110], basket: [225, 380, 155, 155], eggs: [420, 380, 160, 155],
  chickenFeed: [625, 380, 225, 160], duckFeed: [1070, 380, 220, 160],
  pail: [15, 550, 130, 145], milk: [160, 550, 135, 145],
  apple: [1265, 820, 85, 90], carrot: [1170, 545, 155, 140],
  sprout: [750, 725, 85, 80], carrotPlant: [845, 700, 95, 105],
  tomatoPlant: [505, 690, 115, 115], cornPlant: [1390, 685, 115, 120],
  seeds: [30, 735, 90, 60], soil: [15, 840, 250, 150], sprouts: [270, 840, 240, 150],
  carrots: [510, 840, 250, 150], tree: [1020, 810, 220, 190],
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
  return <svg className={className} style={style} data-pose={animal ? pose : undefined} viewBox={item === "tractor" ? "0 0 610 185" : rect.join(" ")} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    <defs><clipPath id={clipId}><rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} /></clipPath></defs>
    {item === "tractor" ? <>
      <defs><clipPath id={`${clipId}-trailer`}><rect x={items.trailer[0]} y={items.trailer[1]} width={items.trailer[2]} height={items.trailer[3]} /></clipPath></defs>
      <svg x="0" y="0" width="310" height="185" viewBox={items.tractor.join(" ")}><image clipPath={`url(#${clipId})`} href="/games/sunny-farm/items-spaced.webp" width="1536" height="1024" /></svg>
      <svg x="305" y="38" width="285" height="147" viewBox={items.trailer.join(" ")}><image clipPath={`url(#${clipId}-trailer)`} href="/games/sunny-farm/items-spaced.webp" width="1536" height="1024" /></svg>
    </> : <image clipPath={`url(#${clipId})`} href={`/games/sunny-farm/${item ? "items-spaced" : "animals"}.webp`} width="1536" height="1024" />}
  </svg>;
}
