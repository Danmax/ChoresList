import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { coloringCoverage, coloringRegionAt, coloringStorageKey, COLORING_SCENES, createColoringRegions, fillColoringRegion, hexToRgb, type ColoringPixels } from "../lib/coloring";
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
  for (const pattern of ["dots", "stripes", "stars"] as const) {
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
  for (const [x, y] of [[-1, 0], [40, 0], [0, 30], [0, -1], [20, 10]]) assert.equal(coloringRegionAt(regions, x, y), -1);
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
