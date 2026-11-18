import { coloringRegionAt, hexToRgb, type ColoringPixels, type ColoringRegions, type ColoringSceneId, type RGB } from "./coloring";

export type StarterColorStyle = "scenery" | "complementary";
type Shade = "leaf" | "water" | "sky" | "wood" | "fur" | "face" | "gold" | "gray" | "flower" | "jewel" | "earth" | "white" | "dark";
const SHADES: Record<Shade, string[]> = {
  white: ["#ffffff"], dark: ["#434b54", "#56606a"],
  leaf: ["#528a46", "#7daa58", "#a2bf6b"], water: ["#73c4d8", "#5babc9", "#9bd9e4"], sky: ["#cce8f5", "#d9eef9"],
  wood: ["#a67c52", "#ba9166"], fur: ["#ad7952", "#986947"], face: ["#f0cfaa", "#e5bb91"], gold: ["#eac25c", "#f2ce70"],
  gray: ["#9ca9b8", "#b6b6c4"], flower: ["#ea91ac", "#e7a8cc", "#f1b989"], jewel: ["#a68ac7", "#73c4be"], earth: ["#d6bd8d", "#cbb283"],
};
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
function hsl(hue: number, saturation: number, lightness: number): RGB {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation, h = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs(h % 2 - 1));
  const rgb = h < 1 ? [chroma,x,0] : h < 2 ? [x,chroma,0] : h < 3 ? [0,chroma,x] : h < 4 ? [0,x,chroma] : h < 5 ? [x,0,chroma] : [chroma,0,x];
  return rgb.map((v) => Math.round((v + lightness - chroma / 2) * 255)) as unknown as RGB;
}
export function generateStarterColors(pixels: ColoringPixels, regions: ColoringRegions, sceneId: ColoringSceneId, style: StarterColorStyle, seed: number, keepExisting = true): number {
  const random = randomSource(seed), painted = new Uint8Array(regions.bounds.length);
  if (keepExisting) for (let i = 0; i < regions.labels.length; i++) if (regions.labels[i] > 0 && pixels.data[i * 4 + 3] > 0) painted[regions.labels[i]] = 1;
  const guides = new Map<number, Shade>();
  for (const [gx, gy, shade] of GUIDES[sceneId]) {
    const id = coloringRegionAt(regions, gx / 1280 * regions.width, gy / 720 * regions.height);
    if (id > 0) guides.set(id, shade);
  }
  const hue = random() * 360, colors: (RGB | undefined)[] = [];
  for (let id = 1; id < regions.bounds.length; id++) {
    const bounds = regions.bounds[id];
    // Leave tiny details (eyes, teeth, spots) for the artist to finish.
    if (painted[id] || bounds.area < 600) continue;
    if (style === "complementary") {
      colors[id] = hsl(hue + (random() < .5 ? 0 : 180) + (random() - .5) * 22, .45 + random() * .25, .55 + random() * .25);
    } else {
      const y = (bounds.top + bounds.bottom) / 2 / regions.height;
      const shade = guides.get(id) ?? (y > .85 ? "earth" : "leaf");
      const palette = SHADES[shade];
      const base = hexToRgb(palette[Math.floor(random() * palette.length)]), shift = shade === "white" ? 0 : Math.round((random() - .5) * 14);
      colors[id] = base.map((channel) => Math.max(0, Math.min(255, channel + shift))) as unknown as RGB;
    }
  }
  let changed = 0;
  for (let i = 0; i < regions.labels.length; i++) {
    const color = colors[regions.labels[i]];
    if (!color) continue;
    const offset = i * 4;
    if (pixels.data[offset] !== color[0] || pixels.data[offset + 1] !== color[1] || pixels.data[offset + 2] !== color[2] || pixels.data[offset + 3] !== 255) changed++;
    pixels.data[offset] = color[0]; pixels.data[offset + 1] = color[1]; pixels.data[offset + 2] = color[2]; pixels.data[offset + 3] = 255;
  }
  return changed;
}
