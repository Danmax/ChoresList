import { coloringRegionAt, hexToRgb, type ColoringPixels, type ColoringRegions, type ColoringSceneId, type RGB } from "./coloring";

export type StarterColorStyle = "scenery" | "complementary";
type Shade = "leaf" | "water" | "sky" | "wood" | "fur" | "face" | "gold" | "gray" | "flower" | "jewel" | "earth";
const SHADES: Record<Shade, string[]> = {
  leaf: ["#528a46", "#7daa58", "#a2bf6b"], water: ["#73c4d8", "#5babc9", "#9bd9e4"], sky: ["#cce8f5", "#d9eef9"],
  wood: ["#a67c52", "#ba9166"], fur: ["#ad7952", "#986947"], face: ["#f0cfaa", "#e5bb91"], gold: ["#eac25c", "#f2ce70"],
  gray: ["#9ca9b8", "#b6b6c4"], flower: ["#ea91ac", "#e7a8cc", "#f1b989"], jewel: ["#a68ac7", "#73c4be"], earth: ["#d6bd8d", "#cbb283"],
};
// These guide points refer to the supplied 1280×720 drawings. They select
// connected shapes in the original linework; generation never modifies ink.
const GUIDES: Record<ColoringSceneId, [number, number, Shade][]> = {
  "treasure-jungle": [[75,80,"leaf"],[660,45,"leaf"],[235,665,"leaf"],[660,190,"sky"],[1150,150,"wood"],[900,690,"earth"],[230,150,"fur"],[210,420,"fur"],[83,440,"fur"],[165,290,"fur"],[330,245,"face"],[175,275,"face"],[225,575,"face"],[895,320,"gold"],[1095,435,"gold"],[900,545,"gold"],[1055,215,"gold"],[620,570,"wood"],[600,310,"wood"],[720,325,"gold"],[590,650,"gold"],[492,475,"jewel"],[730,465,"jewel"]],
  "crocodile-creek": [[70,600,"leaf"],[600,100,"sky"],[1200,280,"wood"],[1000,265,"wood"],[1100,520,"water"],[520,420,"water"],[850,660,"water"],[750,410,"leaf"],[350,530,"leaf"],[610,560,"leaf"],[885,30,"fur"],[1015,170,"fur"],[1070,110,"fur"],[895,105,"face"],[990,230,"face"],[970,540,"flower"],[350,670,"flower"]],
  "jungle-friends": [[80,150,"wood"],[450,365,"wood"],[150,650,"leaf"],[470,490,"leaf"],[1000,60,"leaf"],[290,60,"fur"],[300,270,"fur"],[160,230,"fur"],[370,150,"face"],[815,520,"gold"],[900,620,"gold"],[650,610,"gold"],[600,170,"gold"],[550,270,"jewel"],[1000,180,"leaf"],[1180,400,"flower"],[90,520,"flower"]],
  "jungle-river": [[70,100,"leaf"],[1140,300,"leaf"],[600,65,"sky"],[250,480,"fur"],[250,200,"fur"],[375,270,"face"],[780,170,"gray"],[1060,180,"gold"],[1000,430,"gray"],[800,350,"water"],[800,650,"water"],[650,530,"gold"],[620,640,"gold"],[1070,625,"leaf"],[850,640,"leaf"],[180,650,"earth"]],
  "vine-swing": [[50,150,"wood"],[850,150,"wood"],[150,350,"leaf"],[1150,300,"leaf"],[900,430,"leaf"],[600,45,"leaf"],[320,270,"sky"],[1000,250,"sky"],[650,130,"fur"],[590,440,"fur"],[375,440,"fur"],[610,250,"face"],[640,550,"face"],[1100,610,"flower"],[100,610,"flower"]],
  "elephant-splash": [[100,100,"wood"],[1000,130,"leaf"],[1150,350,"leaf"],[200,620,"leaf"],[850,100,"sky"],[400,420,"gray"],[560,290,"gray"],[340,300,"gray"],[480,520,"gray"],[1000,500,"water"],[980,295,"water"],[680,600,"leaf"],[1080,480,"leaf"],[100,430,"flower"],[1150,620,"flower"],[300,130,"jewel"],[1000,80,"jewel"]],
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
    if (painted[id] || bounds.area < 140) continue;
    if (style === "complementary") {
      colors[id] = hsl(hue + (random() < .5 ? 0 : 180) + (random() - .5) * 22, .45 + random() * .25, .55 + random() * .25);
    } else {
      const y = (bounds.top + bounds.bottom) / 2 / regions.height;
      const shade = guides.get(id) ?? (y < .22 ? "sky" : y > .85 ? "earth" : "leaf");
      const palette = SHADES[shade];
      const base = hexToRgb(palette[Math.floor(random() * palette.length)]), shift = Math.round((random() - .5) * 14);
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
