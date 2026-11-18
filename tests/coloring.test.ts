import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { coloringCoverage, coloringPreferences, coloringRegionAt, coloringStorageKey, COLORING_SCENES, createColoringRegions, fillColoringRegion, hexToRgb, type ColoringPixels } from "../lib/coloring";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "../lib/games";

function paper(width = 40, height = 30): ColoringPixels {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) {
    const offset = (y * width + Math.floor(width / 2)) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = 0;
  }
  return { width, height, data };
}
function paint(width = 40, height = 30): ColoringPixels { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; }
function pixel(image: ColoringPixels, x: number, y: number) { return Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)); }

test("bucket fills respect the original outline and recolor the same whole region", () => {
  const regions = createColoringRegions(paper());
  const pixels = paint();
  const id = coloringRegionAt(regions, 2, 2);
  assert.equal(fillColoringRegion(pixels, regions, id, [200, 50, 90]), true);
  assert.deepEqual(pixel(pixels, 0, 0), [200, 50, 90, 255]);
  assert.deepEqual(pixel(pixels, 19, 29), [200, 50, 90, 255]);
  assert.deepEqual(pixel(pixels, 20, 10), [0, 0, 0, 0]);
  assert.deepEqual(pixel(pixels, 21, 10), [0, 0, 0, 0]);
  assert.equal(fillColoringRegion(pixels, regions, id, [200, 50, 90]), false);
  assert.equal(fillColoringRegion(pixels, regions, id, [10, 80, 240]), true);
  assert.deepEqual(pixel(pixels, 19, 29), [10, 80, 240, 255]);
  assert.equal(regions.bounds[id].area, 600);
  assert.ok(coloringCoverage(pixels, regions) > .5);
});

test("dots, stripes, and stars fill with two tones and can be replaced by a solid color", () => {
  const regions = createColoringRegions(paper(160, 100));
  for (const pattern of ["dots", "stripes", "stars", "checks", "waves", "hearts", "crosshatch"] as const) {
    const pixels = paint(160, 100);
    const id = coloringRegionAt(regions, 10, 10);
    fillColoringRegion(pixels, regions, id, [20, 100, 200], pattern);
    const tones = new Set<string>();
    for (let y = 0; y < 100; y++) for (let x = 0; x < 80; x++) tones.add(pixel(pixels, x, y).join(","));
    assert.deepEqual([...tones].sort(), ["20,100,200,255", "208,224,244,255"]);
    assert.deepEqual(pixel(pixels, 81, 50), [0, 0, 0, 0]);
    assert.equal(fillColoringRegion(pixels, regions, id, [20, 100, 200], pattern), false);
    fillColoringRegion(pixels, regions, id, [250, 10, 40]);
    assert.deepEqual(pixel(pixels, 10, 10), [250, 10, 40, 255]);
  }
});

test("antialiased dark boundaries, image edges, and invalid fill points stay safe", () => {
  const original = paper();
  for (let y = 0; y < original.height; y++) {
    const offset = (y * original.width + 20) * 4;
    original.data[offset] = original.data[offset + 1] = original.data[offset + 2] = 170;
  }
  const regions = createColoringRegions(original);
  assert.notEqual(coloringRegionAt(regions, 19, 10), coloringRegionAt(regions, 21, 10));
  for (const [x, y] of [[-1, 0], [40, 0], [0, 30], [0, -1], [20, 10], [NaN, 1], [1, Infinity]]) assert.equal(coloringRegionAt(regions, x, y), -1);
  const pixels = paint();
  assert.equal(fillColoringRegion(pixels, regions, -1, [0, 0, 0]), false);
  assert.equal(fillColoringRegion(pixels, regions, 9999, [0, 0, 0]), false);
  assert.equal(coloringCoverage(pixels, regions), 0);
  assert.deepEqual(hexToRgb("#69b9e5"), [105, 185, 229]);
});

test("saved pictures are separated by child and scene", () => {
  const a = coloringStorageKey("child-1", "treasure-jungle");
  assert.notEqual(a, coloringStorageKey("child-2", "treasure-jungle"));
  assert.notEqual(a, coloringStorageKey("child-1", "jungle-friends"));
  assert.notEqual(coloringStorageKey("a:b", "jungle-friends"), coloringStorageKey("a%3Ab", "jungle-friends"));
});

test("remembered art supplies tolerate old or broken data and keep a small, unique color history", () => {
  const defaults = { color: "#58a17b", recentColors: [], size: 28, pattern: "dots", stayInLines: true };
  for (const invalid of [null, undefined, "wrong", 42, [], { color: "red", size: NaN, pattern: "unknown", stayInLines: "false", recentColors: "bad" }]) assert.deepEqual(coloringPreferences(invalid), defaults);
  assert.deepEqual(coloringPreferences({ color: "#AABBCC", recentColors: ["#ABCDEF", "#abcdef", null, "red", "#112233", "#445566", "#778899", "#000000"], size: 47, pattern: "stars", stayInLines: false }), {
    color: "#aabbcc", recentColors: ["#abcdef", "#112233", "#445566", "#778899", "#000000"], size: 48, pattern: "stars", stayInLines: false,
  });
  assert.equal(coloringPreferences({ size: -99 }).size, 6);
  assert.equal(coloringPreferences({ size: 9999 }).size, 80);
});

test("all supplied jungle drawings contain usable, enclosed coloring regions", async () => {
  for (const scene of COLORING_SCENES) {
    const { data, info } = await sharp(`public${scene.image}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const regions = createColoringRegions({ width: info.width, height: info.height, data: new Uint8ClampedArray(data) });
    assert.equal(info.width, 1280);
    assert.ok(regions.paintable > info.width * info.height * .5);
    assert.ok(regions.bounds.filter((region) => region.area > 300).length > 30, `${scene.title} needs distinct shapes to color`);
    const pixels = paint(info.width, info.height);
    const id = regions.bounds.findIndex((region) => region.area > 1000);
    fillColoringRegion(pixels, regions, id, [40, 180, 60]);
    assert.equal(pixels.data.filter((value, i) => i % 4 === 3 && value === 255).length, regions.bounds[id].area);
  }
});

test("the game is available through the existing registry with relaxed creative-play defaults", () => {
  assert.equal(gameByKey("coloring-adventures")?.ageMin, 3);
  assert.deepEqual(DEFAULT_GAME_SETTINGS["coloring-adventures"], { enabled: true, rewardType: "none", rewardPoints: 5, rewardTickets: 0, requiresChoresComplete: false, dailyPlayLimit: 0 });
});

test("editable text saves validate effects and clamp restored lettering sizes", async () => {
  const { restoreColoringTexts } = await import("../lib/coloring-text");
  const label = { id: "label", text: "Jungle!", x: 200, y: 100, color: "#ed6464", size: 56, font: "serif", style: "glow", outlineColor: "#a855f7", outlineWidth: 12 };
  assert.deepEqual(restoreColoringTexts([label]), [label]);
  assert.deepEqual(restoreColoringTexts([null, { ...label, x: NaN }, { ...label, style: "invalid" }]), []);
  assert.equal(restoreColoringTexts([{ ...label, size: 999, outlineWidth: 100 }])[0].outlineWidth, 24);
  assert.equal(restoreColoringTexts([{ ...label, size: 999 }])[0].size, 120);
  assert.deepEqual(restoreColoringTexts(undefined), []);
});

test("all lettering styles survive saved-text validation and their bundled fonts exist", async () => {
  const { COLORING_LETTERING, coloringTextFont, restoreColoringTexts } = await import("../lib/coloring-text");
  const { stat } = await import("node:fs/promises");
  assert.equal(COLORING_LETTERING.length, 10);
  for (const lettering of COLORING_LETTERING) {
    const restored = restoreColoringTexts([{ id: "lettering", text: "Adventure", x: 300, y: 200, color: "#ed6464", size: 56, font: lettering.id, style: "outline", outlineColor: "#202d3a", outlineWidth: 8 }]);
    assert.equal(restored[0]?.font, lettering.id);
    assert.match(coloringTextFont(lettering.id, 56), /56px/);
  }
  for (const filename of ["bangers", "pacifico", "marker", "stencil", "rye", "fredoka"]) assert.ok((await stat(`public/games/coloring/fonts/${filename}.ttf`)).size > 10000);
});

test("starter palettes are repeatable, varied, outline-safe, and protect painted shapes", async () => {
  const { generateStarterColors, STARTER_THEMES } = await import("../lib/coloring-starter");
  const regions = createColoringRegions(paper(80, 60));
  for (const { id: style } of STARTER_THEMES) {
    const first = paint(80, 60), same = paint(80, 60), next = paint(80, 60);
    assert.ok(generateStarterColors(first, regions, "vine-swing", style, 42) > 0);
    generateStarterColors(same, regions, "vine-swing", style, 42);
    generateStarterColors(next, regions, "vine-swing", style, 43);
    assert.deepEqual(first.data, same.data); assert.notDeepEqual(first.data, next.data);
    assert.deepEqual(pixel(first, 40, 10), [0, 0, 0, 0]);
    assert.equal(generateStarterColors(first, regions, "vine-swing", style, 99, true), 0);
    const partial = paint(80, 60), offset = (10 * 80 + 10) * 4;
    partial.data.set([240, 20, 60, 255], offset);
    generateStarterColors(partial, regions, "vine-swing", style, 42, true);
    assert.deepEqual(pixel(partial, 10, 10), [240, 20, 60, 255]);
    assert.deepEqual(pixel(partial, 20, 20), [0, 0, 0, 0], "a partly brushed shape stays untouched");
    assert.equal(pixel(partial, 60, 20)[3], 255);
    assert.ok(generateStarterColors(partial, regions, "vine-swing", style, 43, false) > 0);
    assert.equal(pixel(partial, 20, 20)[3], 255);
  }
});

test("starter colors work for all six actual scenes without painting across the ink", async () => {
  const { generateStarterColors, STARTER_THEMES } = await import("../lib/coloring-starter");
  for (const scene of COLORING_SCENES) {
    const { data, info } = await sharp(`public${scene.image}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const regions = createColoringRegions({ width: info.width, height: info.height, data: new Uint8ClampedArray(data) });
    for (const { id: style } of STARTER_THEMES) {
      const pixels = paint(info.width, info.height);
      assert.ok(generateStarterColors(pixels, regions, scene.id, style, 42) > regions.paintable * .5, `${scene.title} gets useful ${style} coverage`);
      for (let i = 0; i < regions.labels.length; i++) if (regions.labels[i] < 1) assert.equal(pixels.data[i * 4 + 3], 0);
    }
  }
});

test("scenery starters use appropriate animal, water, and treasure shades", async () => {
  const { generateStarterColors } = await import("../lib/coloring-starter");
  const probes = [
    ["vine-swing", 604, 248, "warm"], ["elephant-splash", 371, 475, "gray"],
    ["jungle-river", 772, 584, "water"], ["treasure-jungle", 736, 541, "warm"],
    ["jungle-friends", 800, 430, "warm"],
  ] as const;
  for (const [sceneId, x, y, kind] of probes) {
    const scene = COLORING_SCENES.find((scene) => scene.id === sceneId)!;
    const { data, info } = await sharp(`public${scene.image}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const regions = createColoringRegions({ width: info.width, height: info.height, data: new Uint8ClampedArray(data) });
    const pixels = paint(info.width, info.height);
    generateStarterColors(pixels, regions, sceneId, "scenery", 42);
    const [r, g, b, alpha] = pixel(pixels, x, y);
    assert.equal(alpha, 255);
    if (kind === "warm") assert.ok(r > g && g > b, `${sceneId} has warm animal/wood colors`);
    if (kind === "water") assert.ok(b > r && g > r);
    if (kind === "gray") assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 40);
  }
});

test("pattern settings change the fill, preserve outlines, and support a custom background", async () => {
  const { normalizePatternSettings } = await import("../lib/coloring-supplies");
  const regions = createColoringRegions(paper(160, 100));
  const id = coloringRegionAt(regions, 10, 10), base = paint(160, 100);
  fillColoringRegion(base, regions, id, [20, 100, 200], "stripes");
  for (const settings of [{ scale: 2, spacing: 1, angle: 0, background: null }, { scale: 1, spacing: 2, angle: 0, background: null }, { scale: 1, spacing: 1, angle: 45, background: null }, { scale: 1, spacing: 1, angle: 0, background: "#ff00ff" }]) {
    const pixels = paint(160, 100);
    fillColoringRegion(pixels, regions, id, [20, 100, 200], "stripes", settings);
    assert.notDeepEqual(pixels.data, base.data);
    assert.deepEqual(pixel(pixels, 81, 50), [0, 0, 0, 0]);
  }
  assert.deepEqual(normalizePatternSettings({ scale: NaN, spacing: 99, angle: -1, background: "bad" }), { scale: 1, spacing: 3, angle: 0, background: null });
});

test("recent colors keep eight unique entries and saved palettes normalize safely", async () => {
  const { restoreColorPalettes } = await import("../lib/coloring-supplies");
  const colors = Array.from({ length: 10 }, (_, i) => `#${String(i).repeat(6)}`);
  assert.deepEqual(coloringPreferences({ recentColors: [colors[0], ...colors] }).recentColors, colors.slice(0, 8));
  assert.deepEqual(restoreColorPalettes([{ id: "custom-1", name: " My colors ", colors: ["#ABCDEF", "#abcdef", "bad", "#123456"] }, { id: "custom-1", name: "duplicate", colors: ["#123456"] }, { id: "other", name: "bad", colors }]), [{ id: "custom-1", name: "My colors", colors: ["#abcdef", "#123456"] }]);
  assert.deepEqual(restoreColorPalettes(null), []);
});
