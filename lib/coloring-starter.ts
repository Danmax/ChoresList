import { coloringRegionAt, hexToRgb, type ColoringPixels, type ColoringRegions, type ColoringSceneId, type RGB } from "./coloring";

export const STARTER_THEMES = [
  { id: "scenery", name: "Natural scenery", description: "Leafy greens, blue water, earthy animals, and treasure gold." },
  { id: "neon", name: "Neon", description: "Electric greens, turquoise water, and hot pink accents." },
  { id: "sepia", name: "Vintage Sepia", description: "Warm antique browns, faded gold, and creamy paper tones." },
  { id: "bedazzled", name: "Flashy Bedazzled", description: "Jewel tones with sparkling highlights on flowers and treasure." },
  { id: "party", name: "Fun Party", description: "Bright tropical colors with confetti on flowers and treasure." },
  { id: "hearts", name: "Hearts & Kisses", description: "Rose pinks, soft lavender, and heart and kiss accents." },
  { id: "sunshine", name: "Cool Sunshine", description: "Cool aqua, sunny gold, and fresh mint greens." },
  { id: "holiday", name: "Cozy Holiday", description: "Evergreen, cranberry, warm cocoa, and golden festive sparkles." },
] as const;
export type StarterColorStyle = typeof STARTER_THEMES[number]["id"];
type Shade = "leaf" | "water" | "sky" | "wood" | "fur" | "face" | "gold" | "gray" | "flower" | "jewel" | "earth" | "white" | "dark";
const SHADES: Record<Shade, string[]> = {
  white: ["#ffffff"], dark: ["#434b54", "#56606a"],
  leaf: ["#528a46", "#7daa58", "#a2bf6b"], water: ["#73c4d8", "#5babc9", "#9bd9e4"], sky: ["#cce8f5", "#d9eef9"],
  wood: ["#a67c52", "#ba9166"], fur: ["#ad7952", "#986947"], face: ["#f0cfaa", "#e5bb91"], gold: ["#eac25c", "#f2ce70"],
  gray: ["#9ca9b8", "#b6b6c4"], flower: ["#ea91ac", "#e7a8cc", "#f1b989"], jewel: ["#a68ac7", "#73c4be"], earth: ["#d6bd8d", "#cbb283"],
};
// Colors keep the same role throughout a scene, instead of choosing unrelated hues.
const THEME_SHADES: Record<Exclude<StarterColorStyle, "scenery">, Record<Shade, string[]>> = {
  neon: { white: ["#f3ffff"], dark: ["#38315c"], leaf: ["#79ed40", "#b5fa52"], water: ["#17d5e6", "#47ebee"], sky: ["#d2edff"], wood: ["#8a58c0", "#a16cd2"], fur: ["#f79847", "#ffb258"], face: ["#ffe1ab"], gold: ["#f6eb36", "#f6cf34"], gray: ["#9caceb", "#b9b4f2"], flower: ["#ff58ba", "#ff76d4"], jewel: ["#b469f5", "#ef6be5"], earth: ["#c5b5ed"] },
  sepia: { white: ["#fff6e2"], dark: ["#554335"], leaf: ["#a38d5f", "#b7a373"], water: ["#c5b79b", "#d5c6aa"], sky: ["#eee2c9"], wood: ["#917052", "#ab8963"], fur: ["#a17954", "#b28a61"], face: ["#e6c99e", "#efd7b4"], gold: ["#d4af6d", "#e1bf84"], gray: ["#b6a38b", "#c5b49a"], flower: ["#c39c7b", "#d9b28d"], jewel: ["#b28b65", "#d2b48a"], earth: ["#d9c5a0"] },
  bedazzled: { ...SHADES, leaf: ["#499b85", "#6cb4a4"], water: ["#71b8df", "#86a4df"], sky: ["#e3dcf9"], flower: ["#c47cdb", "#e68dc6"], jewel: ["#9672d6", "#57becb"], gold: ["#e8bf55", "#f4d780"] },
  party: { ...SHADES, leaf: ["#64c183", "#91cf68"], water: ["#58c8dc", "#79d9e5"], sky: ["#d1eff9"], flower: ["#fa8b9d", "#ba8ce4", "#ffbc55"], jewel: ["#a17ee1", "#ed6eaf"], gold: ["#f9c84f", "#ffdc6b"] },
  hearts: { ...SHADES, leaf: ["#9bb69e", "#b6c9ae"], water: ["#c0b9e3", "#d0c9ee"], sky: ["#fae6ef"], flower: ["#ec8fae", "#f3a8bc"], jewel: ["#df759d", "#c49edc"], gold: ["#eeb4ac", "#f3c7b9"], earth: ["#e4cecb"] },
  sunshine: { ...SHADES, leaf: ["#82c49a", "#a5d6ab"], water: ["#79ccd9", "#a3dfe4"], sky: ["#def3f9"], flower: ["#f6d569", "#f5bf86"], jewel: ["#69bfc6", "#a3c7e0"], gold: ["#efc556", "#f9df85"], earth: ["#e8d8ad"] },
  holiday: { ...SHADES, leaf: ["#477b5a", "#658c68"], water: ["#94bdc7", "#b2d2d6"], sky: ["#e4eeee"], wood: ["#906a50", "#aa8263"], flower: ["#c76a79", "#dc8b8c"], jewel: ["#b75c71", "#d09b52"], gold: ["#d5b160", "#e5c77f"], earth: ["#dfcba9"] },
};

// Accent marks are clipped by the original region labels, so linework stays intact.
function accentAt(style: StarterColorStyle, x: number, y: number): boolean {
  const u = ((x + (Math.floor(y / 38) % 2) * 19) % 38) - 19, v = y % 38 - 19;
  if (style === "bedazzled" || style === "holiday") return Math.abs(u) + Math.abs(v) < 6 && (Math.abs(u) < 1.8 || Math.abs(v) < 1.8);
  if (style === "party") return (u * u + v * v < 7) || (Math.abs(u - 10) < 2 && Math.abs(v + 9) < 3);
  if (style === "hearts") {
    if ((Math.floor(x / 38) + Math.floor(y / 38)) % 2 === 0) {
      const hx = u / 6, hy = -v / 6;
      return (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3 <= 0;
    }
    // Two curved lips with a narrow center opening.
    return u * u / 49 + v * v / 16 < 1 && Math.abs(v) > .9;
  }
  return false;
}
// These guide points refer to the supplied 1280×720 drawings. They select
// connected shapes in the original linework; generation never modifies ink.
const GUIDES: Record<ColoringSceneId, [number, number, Shade][]> = {
  "treasure-jungle": [
    [75, 80, "leaf"], [660, 45, "leaf"], [235, 665, "leaf"],
    [660, 190, "sky"], [1150, 150, "wood"], [900, 690, "earth"],
    [230, 150, "fur"], [210, 420, "fur"], [83, 440, "fur"],
    [165, 290, "fur"], [330, 245, "face"], [175, 275, "face"],
    [225, 575, "face"], [895, 320, "gold"], [1095, 435, "gold"],
    [900, 545, "gold"], [1055, 215, "gold"], [620, 570, "wood"],
    [600, 310, "wood"], [720, 325, "gold"], [590, 650, "gold"],
    [492, 475, "jewel"], [730, 465, "jewel"], [233, 183, "fur"],
    [272, 479, "fur"], [298, 529, "fur"], [192, 352, "fur"],
    [119, 389, "fur"], [96, 471, "fur"], [334, 241, "face"],
    [184, 285, "face"], [425, 310, "face"], [1155, 194, "wood"],
    [351, 500, "wood"], [576, 320, "wood"], [651, 309, "wood"],
    [665, 331, "wood"], [736, 541, "wood"], [566, 564, "wood"],
    [647, 620, "wood"], [388, 579, "wood"], [437, 556, "wood"],
    [435, 605, "wood"], [604, 433, "gold"], [489, 616, "gold"],
    [796, 568, "gold"], [487, 437, "jewel"], [117, 600, "flower"],
    [50, 621, "flower"], [142, 656, "flower"], [79, 675, "flower"],
    [1143, 654, "flower"], [1236, 660, "flower"], [1187, 695, "flower"],
    [134, 76, "leaf"], [376, 36, "leaf"], [615, 58, "leaf"],
    [646, 56, "leaf"], [748, 68, "leaf"], [894, 62, "leaf"],
    [1029, 36, "leaf"], [1138, 20, "leaf"], [768, 118, "leaf"],
    [671, 171, "leaf"], [919, 85, "leaf"], [536, 94, "leaf"],
  ],
  "crocodile-creek": [
    [70, 600, "leaf"], [600, 100, "sky"], [1200, 280, "wood"],
    [1000, 265, "wood"], [1100, 520, "water"], [520, 420, "water"],
    [850, 660, "water"], [750, 410, "leaf"], [350, 530, "leaf"],
    [610, 560, "leaf"], [885, 30, "fur"], [1015, 170, "fur"],
    [1070, 110, "fur"], [895, 105, "face"], [990, 230, "face"],
    [970, 540, "flower"], [350, 670, "flower"], [940, 49, "fur"],
    [1007, 196, "fur"], [1159, 191, "fur"], [907, 117, "face"],
    [879, 218, "face"], [919, 255, "face"], [44, 20, "leaf"],
    [133, 118, "leaf"], [327, 98, "leaf"], [304, 22, "leaf"],
    [395, 48, "leaf"], [552, 26, "leaf"], [692, 46, "leaf"],
    [551, 84, "leaf"], [639, 80, "leaf"], [1190, 270, "wood"],
    [1050, 566, "flower"], [929, 567, "flower"], [276, 683, "flower"],
  ],
  "jungle-friends": [
    [80, 150, "wood"], [450, 365, "wood"], [150, 650, "leaf"],
    [470, 490, "leaf"], [1000, 60, "leaf"], [280, 100, "fur"],
    [300, 270, "fur"], [160, 230, "fur"], [405, 175, "face"],
    [800, 430, "gold"], [930, 600, "gold"], [1000, 560, "gold"],
    [960, 650, "gold"], [680, 450, "dark"], [720, 580, "face"],
    [600, 260, "white"], [500, 265, "dark"], [680, 140, "gold"],
    [1000, 180, "leaf"], [1180, 400, "flower"], [90, 520, "flower"],
    [289, 109, "fur"], [239, 255, "fur"], [303, 306, "fur"],
    [383, 149, "face"], [395, 305, "face"], [705, 583, "face"],
    [753, 460, "gold"], [937, 584, "gold"], [682, 146, "gold"],
    [659, 176, "gold"], [565, 205, "white"], [506, 269, "dark"],
    [156, 36, "leaf"], [510, 26, "leaf"], [564, 38, "leaf"],
    [623, 24, "leaf"], [726, 32, "leaf"], [843, 80, "leaf"],
    [1075, 22, "leaf"], [1155, 22, "leaf"], [1234, 52, "leaf"],
    [57, 582, "flower"], [140, 573, "flower"], [51, 507, "flower"],
    [1195, 496, "flower"], [1206, 394, "flower"], [1131, 575, "flower"],
  ],
  "jungle-river": [
    [70, 100, "leaf"], [1140, 300, "leaf"], [600, 65, "sky"],
    [250, 480, "fur"], [250, 200, "fur"], [375, 270, "face"],
    [780, 170, "gray"], [1060, 180, "gold"], [1000, 430, "gray"],
    [800, 350, "water"], [800, 650, "water"], [650, 530, "gold"],
    [620, 640, "gold"], [1070, 625, "leaf"], [850, 640, "leaf"],
    [180, 650, "earth"], [772, 584, "water"], [890, 358, "water"],
    [786, 368, "water"], [672, 368, "water"], [657, 409, "water"],
    [786, 443, "water"], [980, 444, "gray"], [749, 194, "gray"],
    [328, 204, "fur"], [368, 396, "fur"], [279, 379, "fur"],
    [412, 468, "fur"], [273, 487, "fur"], [178, 313, "fur"],
    [417, 241, "face"], [490, 311, "face"], [460, 518, "face"],
    [797, 89, "face"], [1040, 168, "gold"], [1067, 264, "gold"],
    [952, 225, "gold"], [1074, 109, "sky"],
  ],
  "vine-swing": [
    [50, 150, "wood"], [850, 150, "wood"], [150, 350, "leaf"],
    [1150, 300, "leaf"], [900, 430, "leaf"], [600, 45, "leaf"],
    [320, 270, "sky"], [1000, 250, "sky"], [650, 130, "fur"],
    [590, 440, "fur"], [375, 440, "fur"], [610, 250, "face"],
    [640, 550, "face"], [1100, 610, "flower"], [100, 610, "flower"],
    [604, 248, "face"], [420, 297, "face"], [805, 486, "face"],
    [703, 462, "face"], [734, 189, "face"], [575, 168, "fur"],
    [627, 476, "fur"], [633, 465, "fur"], [385, 452, "fur"],
    [375, 300, "fur"], [762, 186, "fur"], [158, 247, "wood"],
    [402, 618, "wood"], [677, 634, "leaf"], [1129, 247, "leaf"],
    [1101, 475, "leaf"], [138, 484, "leaf"], [1002, 373, "leaf"],
    [446, 170, "sky"], [989, 217, "sky"], [1103, 609, "flower"],
    [249, 605, "flower"], [112, 662, "flower"], [979, 552, "flower"],
  ],
  "elephant-splash": [
    [100, 100, "wood"], [1000, 130, "leaf"], [1150, 350, "leaf"],
    [200, 620, "leaf"], [850, 100, "sky"], [400, 420, "gray"],
    [560, 290, "gray"], [340, 300, "gray"], [480, 520, "gray"],
    [1000, 500, "water"], [980, 295, "water"], [680, 600, "leaf"],
    [1080, 480, "leaf"], [100, 430, "flower"], [1150, 620, "flower"],
    [300, 130, "jewel"], [1000, 80, "jewel"], [514, 279, "gray"],
    [371, 475, "gray"], [648, 342, "gray"], [614, 585, "water"],
    [1105, 322, "water"], [971, 327, "water"], [1167, 367, "water"],
    [1222, 384, "water"], [1025, 351, "water"], [156, 323, "leaf"],
    [83, 340, "leaf"], [719, 180, "sky"], [49, 475, "flower"],
    [140, 522, "flower"], [56, 536, "flower"], [116, 552, "flower"],
    [1135, 666, "flower"],
  ],
};
function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function generateStarterColors(pixels: ColoringPixels, regions: ColoringRegions, sceneId: ColoringSceneId, style: StarterColorStyle, seed: number, keepExisting = true): number {
  const random = randomSource(seed), painted = new Uint8Array(regions.bounds.length);
  if (keepExisting) for (let i = 0; i < regions.labels.length; i++) if (regions.labels[i] > 0 && pixels.data[i * 4 + 3] > 0) painted[regions.labels[i]] = 1;
  const guides = new Map<number, Shade>();
  for (const [gx, gy, shade] of GUIDES[sceneId]) {
    const id = coloringRegionAt(regions, gx / 1280 * regions.width, gy / 720 * regions.height);
    if (id > 0) guides.set(id, shade);
  }
  const colors: (RGB | undefined)[] = [], accents = new Set<number>();
  const shades = style === "scenery" ? SHADES : THEME_SHADES[style];
  for (let id = 1; id < regions.bounds.length; id++) {
    const bounds = regions.bounds[id];
    // Leave tiny details (eyes, teeth, spots) for the artist to finish.
    if (painted[id] || bounds.area < 600) continue;
    const y = (bounds.top + bounds.bottom) / 2 / regions.height;
    const shade = guides.get(id) ?? (y > .85 ? "earth" : "leaf");
    const palette = shades[shade];
    const base = hexToRgb(palette[Math.floor(random() * palette.length)]), shift = shade === "white" ? 0 : Math.round((random() - .5) * 14);
    colors[id] = base.map((channel) => Math.max(0, Math.min(255, channel + shift))) as unknown as RGB;
    if (shade === "flower" || shade === "jewel" || shade === "gold") accents.add(id);
  }
  let changed = 0;
  for (let i = 0; i < regions.labels.length; i++) {
    const id = regions.labels[i];
    let color = colors[id];
    if (color && accents.has(id) && accentAt(style, (i % regions.width) * 1280 / regions.width, Math.floor(i / regions.width) * 720 / regions.height)) {
      color = style === "hearts" ? [181, 53, 98] : [255, 247, 215];
    }
    if (!color) continue;
    const offset = i * 4;
    if (pixels.data[offset] !== color[0] || pixels.data[offset + 1] !== color[1] || pixels.data[offset + 2] !== color[2] || pixels.data[offset + 3] !== 255) changed++;
    pixels.data[offset] = color[0]; pixels.data[offset + 1] = color[1]; pixels.data[offset + 2] = color[2]; pixels.data[offset + 3] = 255;
  }
  return changed;
}
