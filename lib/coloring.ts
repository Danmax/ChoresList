export const COLORING_SCENES = [
  { id: "treasure-jungle", description: "A monkey and jaguar discover a treasure chest among jungle leaves and flowers.", title: "Treasure Jungle", subtitle: "A little adventure. A lot of gold.", image: "/games/coloring/treasure-jungle.png" },
  { id: "crocodile-creek", description: "A smiling crocodile swims below a monkey beside water lilies and river plants.", title: "Crocodile Creek", subtitle: "Make a splash with your favorite colors.", image: "/games/coloring/crocodile-creek.png" },
  { id: "jungle-friends", description: "A monkey, toucan, snake, and jaguar share a leafy jungle hideaway.", title: "Jungle Friends", subtitle: "A whole jungle of happy little friends.", image: "/games/coloring/jungle-friends.png" },
  { id: "jungle-river", description: "A brave monkey explores a river with a waterfall, hippo, fish, snakes, gorilla, and tiger.", title: "Jungle River Adventure", subtitle: "A wild river, a brave explorer, and a splash of color.", image: "/games/coloring/jungle-river.png" },
  { id: "vine-swing", description: "A smiling monkey swings on a vine among jungle leaves, flowers, and clouds.", title: "Vine Swing", subtitle: "Swing into a bright jungle adventure.", image: "/games/coloring/vine-swing.png" },
  { id: "elephant-splash", description: "A happy elephant sprays water beside a waterfall, frogs, butterflies, and water lilies.", title: "Elephant Splash", subtitle: "A happy splash of color by the waterfall.", image: "/games/coloring/elephant-splash.png" },
] as const;

export type ColoringSceneId = typeof COLORING_SCENES[number]["id"];
export type ColoringTool = "bucket" | "brush" | "pattern" | "eraser" | "picker" | "pan";
export type ColoringPattern = "dots" | "stripes" | "stars" | "checks" | "waves" | "hearts" | "crosshatch";
export type ColoringBrush = "round" | "marker" | "pencil" | "ribbon";
export const COLORING_THEMES = [
  { name: "Jungle", colors: ["#276749", "#58a17b", "#a9cb6a", "#dfc18c", "#a57757", "#f4ce54"] },
  { name: "Ocean", colors: ["#164e63", "#0891b2", "#52b9b0", "#69b9e5", "#bae6fd", "#fef3c7"] },
  { name: "Sunset", colors: ["#7c3aed", "#d47fbc", "#ed6464", "#f3994b", "#f4ce54", "#f4c4a1"] },
  { name: "Candy", colors: ["#eea7b4", "#ad8bd3", "#a5f3fc", "#bbf7d0", "#fef08a", "#fbcfe8"] },
  { name: "Autumn", colors: ["#92400e", "#b45309", "#ea580c", "#eab308", "#78716c", "#a3a635"] },
] as const;
export type RGB = readonly [number, number, number];
export type ColoringPixels = { width: number; height: number; data: Uint8ClampedArray };
type Bounds = { left: number; top: number; right: number; bottom: number; area: number };
export type ColoringRegions = { width: number; height: number; labels: Int32Array; bounds: Bounds[]; paintable: number };

export const COLORING_COLORS = [
  { name: "Poppy", hex: "#ed6464" }, { name: "Tangerine", hex: "#f3994b" },
  { name: "Sunshine", hex: "#f4ce54" }, { name: "Lime", hex: "#a9cb6a" },
  { name: "Leaf", hex: "#58a17b" }, { name: "Lagoon", hex: "#52b9b0" },
  { name: "Sky", hex: "#69b9e5" }, { name: "Blueberry", hex: "#6387d4" },
  { name: "Lilac", hex: "#ad8bd3" }, { name: "Orchid", hex: "#d47fbc" },
  { name: "Rose", hex: "#eea7b4" }, { name: "Peach", hex: "#f4c4a1" },
  { name: "Sand", hex: "#dfc18c" }, { name: "Cocoa", hex: "#a57757" },
  { name: "Slate", hex: "#667884" }, { name: "Snow", hex: "#ffffff" },
] as const;

export type ColoringPreferences = { color: string; recentColors: string[]; size: number; pattern: ColoringPattern; stayInLines: boolean };

export function coloringPreferences(value: unknown): ColoringPreferences {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const isColor = (color: unknown): color is string => typeof color === "string" && /^#[a-f\d]{6}$/i.test(color);
  return {
    color: isColor(saved.color) ? saved.color.toLowerCase() : COLORING_COLORS[4].hex,
    recentColors: Array.isArray(saved.recentColors) ? [...new Set(saved.recentColors.filter(isColor).map((color) => color.toLowerCase()))].slice(0, 4) : [],
    size: typeof saved.size === "number" && Number.isFinite(saved.size) ? Math.min(80, Math.max(6, Math.round(saved.size / 2) * 2)) : 28,
    pattern: ["stripes", "stars", "checks", "waves", "hearts", "crosshatch"].includes(String(saved.pattern)) ? saved.pattern as ColoringPattern : "dots",
    stayInLines: typeof saved.stayInLines === "boolean" ? saved.stayInLines : true,
  };
}

// Segment the original drawing once. Colors never become boundaries, so an
// already painted shape can be filled again without leaking into its neighbors.
export function createColoringRegions(image: ColoringPixels): ColoringRegions {
  const { width, height, data } = image;
  const count = width * height;
  const labels = new Int32Array(count);
  const queue = new Int32Array(count);
  const bounds: Bounds[] = [{ left: 0, top: 0, right: 0, bottom: 0, area: 0 }];
  let paintable = 0;
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    const brightness = data[offset] * .299 + data[offset + 1] * .587 + data[offset + 2] * .114;
    if (data[offset + 3] > 128 && brightness < 180) labels[i] = -1;
    else paintable++;
  }
  for (let i = 0; i < count; i++) {
    if (labels[i] !== 0) continue;
    const id = bounds.length;
    const region: Bounds = { left: width, top: height, right: 0, bottom: 0, area: 0 };
    let head = 0, tail = 1;
    queue[0] = i;
    labels[i] = id;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width, y = Math.floor(pixel / width);
      region.left = Math.min(region.left, x); region.right = Math.max(region.right, x);
      region.top = Math.min(region.top, y); region.bottom = Math.max(region.bottom, y);
      region.area++;
      if (x > 0 && labels[pixel - 1] === 0) { labels[pixel - 1] = id; queue[tail++] = pixel - 1; }
      if (x + 1 < width && labels[pixel + 1] === 0) { labels[pixel + 1] = id; queue[tail++] = pixel + 1; }
      if (y > 0 && labels[pixel - width] === 0) { labels[pixel - width] = id; queue[tail++] = pixel - width; }
      if (y + 1 < height && labels[pixel + width] === 0) { labels[pixel + width] = id; queue[tail++] = pixel + width; }
    }
    bounds.push(region);
  }
  return { width, height, labels, bounds, paintable };
}

export function coloringRegionAt(regions: ColoringRegions, x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= regions.width || y >= regions.height) return -1;
  return regions.labels[Math.floor(y) * regions.width + Math.floor(x)];
}

export function hexToRgb(hex: string): RGB {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

const STAR = Array.from({ length: 10 }, (_, i) => {
  const angle = i * Math.PI / 5 - Math.PI / 2;
  const radius = i % 2 ? 4 : 9;
  return [16 + Math.cos(angle) * radius, 16 + Math.sin(angle) * radius];
});

function patternInk(x: number, y: number, pattern: ColoringPattern): boolean {
  if (pattern === "dots") return ((x % 22) - 11) ** 2 + ((y % 22) - 11) ** 2 < 16;
  if (pattern === "stripes") return (x + y) % 22 < 7;
  if (pattern === "checks") return (Math.floor(x / 12) + Math.floor(y / 12)) % 2 === 0;
  if (pattern === "waves") return (y + Math.sin(x / 9) * 5) % 20 < 5;
  if (pattern === "crosshatch") return (x + y) % 20 < 3 || ((x - y) % 20 + 20) % 20 < 3;
  if (pattern === "hearts") {
    const hx = ((x % 30) - 15) / 10, hy = (14 - (y % 30)) / 10;
    return (hx * hx + hy * hy - .65) ** 3 - hx * hx * hy ** 3 < 0;
  }
  const px = x % 32, py = y % 32;
  let inside = false;
  for (let i = 0, j = STAR.length - 1; i < STAR.length; j = i++) {
    const [ax, ay] = STAR[i], [bx, by] = STAR[j];
    if ((ay > py) !== (by > py) && px < (bx - ax) * (py - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function fillColoringRegion(pixels: ColoringPixels, regions: ColoringRegions, id: number, color: RGB, pattern?: ColoringPattern): boolean {
  const bounds = regions.bounds[id];
  if (!bounds || id < 1) return false;
  const light = color.map((channel) => Math.round(channel + (255 - channel) * .8));
  let changed = false;
  for (let y = bounds.top; y <= bounds.bottom; y++) for (let x = bounds.left; x <= bounds.right; x++) {
    const pixel = y * regions.width + x;
    if (regions.labels[pixel] !== id) continue;
    const offset = pixel * 4;
    const rgb = !pattern || patternInk(x, y, pattern) ? color : light;
    if (pixels.data[offset] !== rgb[0] || pixels.data[offset + 1] !== rgb[1] || pixels.data[offset + 2] !== rgb[2] || pixels.data[offset + 3] !== 255) changed = true;
    pixels.data[offset] = rgb[0]; pixels.data[offset + 1] = rgb[1]; pixels.data[offset + 2] = rgb[2]; pixels.data[offset + 3] = 255;
  }
  return changed;
}

export function coloringCoverage(pixels: ColoringPixels, regions: ColoringRegions): number {
  let colored = 0;
  for (let i = 0; i < regions.labels.length; i++) if (regions.labels[i] > 0 && pixels.data[i * 4 + 3] > 0) colored++;
  return regions.paintable ? colored / regions.paintable : 0;
}

export function coloringStorageKey(memberId: string, sceneId: ColoringSceneId): string {
  return `coloring-adventures:v1:${encodeURIComponent(memberId)}:${sceneId}`;
}
