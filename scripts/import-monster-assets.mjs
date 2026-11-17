// Deterministic sprite import: preserve the supplied artwork, isolate frames,
// remove exterior pale mattes, and repack with real transparent gutters.
// Usage: node scripts/import-monster-assets.mjs /path/to/downloaded/assets
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the folder containing the supplied monster PNGs.');
const output = path.resolve('public/games/monsters');
await mkdir(output, { recursive: true });
const CELL = 256, PAD = 40, BASELINE = CELL - PAD;
const characters = {
  wolf: ['Blue-Gray Wolf Running Sprite Sheet', 'Blue-Gray Wolf Encounter Sprite Sheet'],
  goblin: ['Cartoon Goblin Running Sprite Sheet', 'Goblin Rogue Pumpkin Bomb Sprite Sheet'],
  zombie: ['Chibi Zombie Caretaker Walk Cycle Grid', 'Eight Poses of a Cartoon Zombie Worker'],
  werewolf: ['Werewolf Running Animation Sprite Sheet', 'Werewolf Action Pose Sprite Sheet'],
  beast: ['Horned Forest Beast Walk Cycle', 'Horned Forest Beast Encounter Sprite Sheet'],
  troll: ['Rocky Troll Walking Sprite Sheet', 'Troll Club-Swinging Sprite Sheet'],
  vampire: ['Chibi Vampire Running Sprite Sheet', 'Vampire Encounter Attack Sprite Sheet'],
  horseman: [null, 'Headless Horseman Action Sprite Sheet'],
};
const effects = {
  shield: 'Glowing Cyan Shield Bubble Sprite Sheet',
  eruption: 'Glowing Green Ground Eruption Sprite Sheet',
  bolt: 'Glowing Purple Magic Projectile Sprite Sheet',
  impact: 'Golden Impact Burst Sprite Sheet',
  teleport: 'Magical Purple Teleport Smoke Sprite Sheet',
  rune: 'Eight Purple Moon Magic Circles Sprite Sheet',
  explosion: 'Pumpkin Explosion VFX Sprite Sheet',
  curse: 'Purple-Gold Curse Break VFX Sprite Sheet',
};
const report = { cell: CELL, padding: PAD, baseline: BASELINE, sources: {}, atlases: {} };

async function read(name) {
  const input = path.join(source, `${name}.png`);
  const metadata = await sharp(input).metadata();
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Flood only pale neutral background connected to the image's exterior.
  // Enclosed eyes, teeth, highlights, and costume details remain intact.
  if (!metadata.hasAlpha) {
    const seen = new Uint8Array(info.width * info.height);
    const queue = new Int32Array(seen.length);
    let head = 0, tail = 0;
    const visit = index => {
      if (seen[index]) return;
      seen[index] = 1;
      const i = index * 4, lo = Math.min(data[i], data[i + 1], data[i + 2]);
      const hi = Math.max(data[i], data[i + 1], data[i + 2]);
      if (lo >= 205 && hi - lo < 24) { data[i + 3] = 0; queue[tail++] = index; }
    };
    for (let x = 0; x < info.width; x++) { visit(x); visit((info.height - 1) * info.width + x); }
    for (let y = 0; y < info.height; y++) { visit(y * info.width); visit(y * info.width + info.width - 1); }
    while (head < tail) {
      const index = queue[head++], x = index % info.width, y = Math.floor(index / info.width);
      if (x) visit(index - 1);
      if (x + 1 < info.width) visit(index + 1);
      if (y) visit(index - info.width);
      if (y + 1 < info.height) visit(index + info.width);
    }
  }
  report.sources[name] = { width: info.width, height: info.height, exteriorMatteRemoved: !metadata.hasAlpha };
  return { data, width: info.width, height: info.height };
}

function crop(image, x, y, width, height, feather = false) {
  const data = Buffer.alloc(width * height * 4);
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const from = ((py + y) * image.width + px + x) * 4, to = (py * width + px) * 4;
    image.data.copy(data, to, from, from + 4);
    // Effects have broad glows; taper the crop perimeter before repacking so
    // imported neighboring glow never produces a visible rectangular edge.
    const edge = Math.min(px, py, width - 1 - px, height - 1 - py);
    if (feather) data[to + 3] = Math.round(data[to + 3] * Math.min(1, edge / 32) ** 2);
    if (data[to + 3] < 8) data[to + 3] = 0;
  }
  return { data, width, height };
}

function bounds(frame) {
  let left = frame.width, top = frame.height, right = -1, bottom = -1;
  for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
    if (frame.data[(y * frame.width + x) * 4 + 3] <= 12) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error('An imported frame is empty.');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function frames(image, feather = false) {
  const result = [];
  for (let row = 0; row < 2; row++) {
    const top = Math.round(row * image.height / 2), bottom = Math.round((row + 1) * image.height / 2);
    const cuts = [0];
    // Choose the quietest separator near each nominal column boundary.
    // Several of the supplied poses extend beyond an exact quarter-width.
    for (let column = 1; column < 4; column++) {
      const expected = Math.round(column * image.width / 4);
      let cut = expected, score = Infinity;
      for (let x = expected - 35; x <= expected + 35; x++) {
        let occupied = 0;
        for (let y = top; y < bottom; y++) if (image.data[(y * image.width + x) * 4 + 3] > 24) occupied++;
        const candidate = occupied * 100 + Math.abs(x - expected);
        if (candidate < score) { score = candidate; cut = x; }
      }
      cuts.push(cut);
    }
    cuts.push(image.width);
    for (let column = 0; column < 4; column++) result.push(crop(image, cuts[column], top, cuts[column + 1] - cuts[column], bottom - top, feather));
  }
  return result;
}

async function atlas(key, inputFrames, scale, centered = false) {
  const composites = [];
  for (const [index, frame] of inputFrames.entries()) {
    const b = bounds(frame);
    const width = Math.max(1, Math.round(b.width * scale)), height = Math.max(1, Math.round(b.height * scale));
    const sprite = await sharp(frame.data, { raw: { width: frame.width, height: frame.height, channels: 4 } })
      .extract(b).resize(width, height).png().toBuffer();
    composites.push({ input: sprite, left: index % 4 * CELL + Math.floor((CELL - width) / 2), top: Math.floor(index / 4) * CELL + (centered ? Math.floor((CELL - height) / 2) : BASELINE - height) });
  }
  const rows = Math.ceil(inputFrames.length / 4);
  await sharp({ create: { width: CELL * 4, height: CELL * rows, channels: 4, background: '#00000000' } })
    .composite(composites).webp({ lossless: true }).toFile(path.join(output, `${key}.webp`));
  report.atlases[key] = { frames: inputFrames.length, rows, scale };
}

for (const [kind, names] of Object.entries(characters)) {
  const sheets = await Promise.all(names.map(async name => name ? frames(await read(name)) : null));
  const allBounds = sheets.flatMap(sheet => sheet ?? []).map(bounds);
  const scale = (CELL - 2 * PAD) / Math.max(...allBounds.flatMap(b => [b.width, b.height]));
  for (let i = 0; i < sheets.length; i++) if (sheets[i]) await atlas(`${kind}-${i ? 'encounter' : 'run'}`, sheets[i], scale);
}
for (const [kind, name] of Object.entries(effects)) {
  const sheet = frames(await read(name), true);
  const scale = (CELL - 2 * PAD) / Math.max(...sheet.map(bounds).flatMap(b => [b.width, b.height]));
  await atlas(kind, sheet, scale, !['eruption', 'rune', 'teleport'].includes(kind));
}
const horsemanSource = await read('Headless Horseman Action Sprite Sheet');
const pumpkin = crop(horsemanSource, 154, 56, 70, 72);
await atlas('pumpkin', [pumpkin], 176 / 72, true);
const props = await read('Haunted Graveyard Fantasy Tileset');
// This supplied tileset has nine objects in unequal columns, rather than eight
// regular cells. Explicit crops isolate its portal, bridge, and shield.
const rectangles = [[0,0,615,453],[620,120,365,330],[992,105,298,345],[1290,0,484,448], [0,545,475,342],[477,580,297,290],[777,590,330,255],[1107,493,274,385],[1385,448,389,430]];
const propFrames = rectangles.map(rect => crop(props, ...rect));
// Props are independent objects; each may fill the same safe region.
const propComposites = [];
for (const [i, frame] of propFrames.entries()) {
  const b = bounds(frame), scale = (CELL - 2 * PAD) / Math.max(b.width, b.height);
  const width = Math.round(b.width * scale), height = Math.round(b.height * scale);
  const input = await sharp(frame.data, { raw: { width: frame.width, height: frame.height, channels: 4 } }).extract(b).resize(width, height).png().toBuffer();
  propComposites.push({ input, left: i % 4 * CELL + Math.floor((CELL - width) / 2), top: Math.floor(i / 4) * CELL + BASELINE - height });
}
await sharp({ create: { width: 1024, height: 768, channels: 4, background: '#00000000' } }).composite(propComposites).webp({ lossless: true }).toFile(path.join(output, 'props.webp'));
report.atlases.props = { frames: 9, rows: 3 };
for (const [key, name] of Object.entries({ sky: 'Mystical Moonlit Castle Valley', woodland: 'Haunted Woodland Graveyard Panorama', foreground: 'Enchanted Forest Game Foreground Strip' })) {
  await sharp(path.join(source, `${name}.png`)).resize(1600, 800).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(output, `${key}.webp`));
}
await writeFile(path.join(output, 'import-manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Imported ${Object.keys(report.atlases).length} padded atlases and three background layers into ${output}.`);
