import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import { COLORING_SCENES, coloringStorageKey, createColoringRegions } from "../lib/coloring";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";

async function fixture(sceneIndex: number) {
  const { data, info } = await sharp(`public${COLORING_SCENES[sceneIndex].image}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const regions = createColoringRegions({ width: info.width, height: info.height, data: new Uint8ClampedArray(data) });
  const ids = regions.bounds.map((region, id) => ({ ...region, id })).filter((region) => region.area > 4_000 && region.area < 60_000).sort((a, b) => b.area - a.area);
  function sample(id: number, dots?: boolean) {
    const region = regions.bounds[id];
    const centerX = (region.left + region.right) / 2, centerY = (region.top + region.bottom) / 2;
    let best = Infinity, point = { x: 0, y: 0 };
    for (let y = region.top + 4; y < region.bottom - 4; y++) for (let x = region.left + 4; x < region.right - 4; x++) {
      const i = y * info.width + x;
      if (regions.labels[i] !== id || data[i * 4] < 250 || regions.labels[i - 3] !== id || regions.labels[i + 3] !== id || regions.labels[i - info.width * 3] !== id || regions.labels[i + info.width * 3] !== id) continue;
      const isDot = ((x % 22) - 11) ** 2 + ((y % 22) - 11) ** 2 < 16;
      if (dots !== undefined && dots !== isDot) continue;
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (distance < best) { best = distance; point = { x, y }; }
    }
    assert.ok(Number.isFinite(best));
    return point;
  }
  return { seed: sample(ids[0].id), other: sample(ids[1].id), dot: sample(ids[0].id, true), light: sample(ids[0].id, false) };
}

const baseUrl = process.env.COLORING_TEST_URL ?? "http://localhost:3017";
const screenshotDir = process.env.COLORING_SCREENSHOT_DIR ?? "/tmp/coloring-preview";

async function main() {
  await mkdir(screenshotDir, { recursive: true });
  const [first, second] = await Promise.all([fixture(0), fixture(1)]);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1160 } });
    const errors: string[] = [], sessions: Record<string, unknown>[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      let response: object = { matches: [] };
      if (url.pathname === "/api/games") {
        if (route.request().method() === "POST") {
          sessions.push(route.request().postDataJSON()); response = { reward: { type: "none", points: 0, tickets: 0 } };
        } else {
          const member = { id: url.searchParams.get("memberId") ?? "coloring-preview", name: "Alex", age: 8, avatar: "🧒", color: "#58a17b", totalPoints: 0 };
          response = { member, members: [member], games: GAME_DEFINITIONS,
            settings: GAME_DEFINITIONS.map((game) => ({ gameKey: game.key, ...DEFAULT_GAME_SETTINGS[game.key] })),
            availability: Object.fromEntries(GAME_DEFINITIONS.map((game) => [game.key, { available: true, playsToday: 0, openChores: 0, reason: null }])) };
        }
      }
      await route.fulfill({ json: response });
    });
    const canvas = () => page.locator('canvas[data-ready="true"]');
    const snapshot = () => canvas().evaluate((node) => (node as HTMLCanvasElement).toDataURL());
    async function open(memberId = "coloring-preview") {
      await page.goto(`${baseUrl}/kid/${memberId}/games`);
      await page.getByRole("button", { name: /Coloring Adventures/ }).click();
      await expect(canvas()).toBeVisible();
    }
    async function at(point: { x: number; y: number }, action: "click" | "position" = "click") {
      const node = canvas(), box = (await node.boundingBox())!;
      const size = await node.evaluate((node) => ({ width: (node as HTMLCanvasElement).width, height: (node as HTMLCanvasElement).height }));
      const position = { x: box.x + point.x / size.width * box.width, y: box.y + point.y / size.height * box.height };
      if (action === "click") await page.mouse.click(position.x, position.y);
      return position;
    }
    async function paintedPixel(point: { x: number; y: number }, sceneId = COLORING_SCENES[0].id) {
      return page.evaluate(async ({ key, point }) => {
        const saved = JSON.parse(localStorage.getItem(key)!);
        const image = new Image(); image.src = saved.image; await image.decode();
        const surface = document.createElement("canvas"); surface.width = image.width; surface.height = image.height;
        const ctx = surface.getContext("2d")!; ctx.drawImage(image, 0, 0);
        return Array.from(ctx.getImageData(point.x, point.y, 1, 1).data);
      }, { key: coloringStorageKey("coloring-preview", sceneId), point });
    }

    await open();
    const empty = await snapshot();
    await expect(page.getByRole("button", { name: "Finish picture", exact: true })).toBeDisabled();
    await page.screenshot({ path: `${screenshotDir}/studio-desktop.png`, fullPage: true });
    await page.getByRole("button", { name: "Poppy", exact: true }).click();
    await at(first.seed);
    assert.deepEqual(await paintedPixel(first.seed), [237, 100, 100, 255]);
    assert.deepEqual(await paintedPixel(first.other), [0, 0, 0, 0]);
    const solid = await snapshot();
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), empty);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); assert.equal(await snapshot(), solid);
    for (const pattern of ["Dots", "Stripes", "Stars"]) {
      await page.getByRole("button", { name: `${pattern} pattern`, exact: true }).click(); await at(first.seed);
      assert.notEqual(await snapshot(), solid);
      assert.deepEqual(await paintedPixel(first.other), [0, 0, 0, 0]);
    }
    await page.getByRole("button", { name: "Dots pattern", exact: true }).click(); await at(first.seed);
    assert.deepEqual(await paintedPixel(first.dot), [237, 100, 100, 255]);
    assert.deepEqual(await paintedPixel(first.light), [251, 224, 224, 255]);
    await page.getByRole("button", { name: "Bucket", exact: true }).click();
    await page.getByRole("button", { name: "Leaf", exact: true }).click(); await at(first.seed);
    const green = await snapshot();
    await page.getByRole("button", { name: "Poppy", exact: true }).click();
    await page.getByRole("button", { name: "Pick color", exact: true }).click(); await at(first.seed);
    await expect(page.getByRole("button", { name: "Leaf", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Bucket", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload(); await page.getByRole("button", { name: /Coloring Adventures/ }).click(); await expect(canvas()).toBeVisible();
    assert.equal(await snapshot(), green, "progress survives a reload");
    await page.getByRole("button", { name: "Crocodile Creek", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Crocodile Creek coloring canvas");
    await page.getByRole("button", { name: "Sky", exact: true }).click(); await at(second.seed);
    const creek = await snapshot();
    await page.getByRole("button", { name: "Treasure Jungle", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Treasure Jungle coloring canvas"); assert.equal(await snapshot(), green);
    await page.getByRole("button", { name: "Crocodile Creek", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Crocodile Creek coloring canvas"); assert.equal(await snapshot(), creek);
    await open("another-child"); assert.equal(await snapshot(), empty, "another child has a separate picture");
    await open(); await expect(canvas()).toHaveAttribute("aria-label", "Crocodile Creek coloring canvas"); assert.equal(await snapshot(), creek);
    await page.getByRole("button", { name: "Treasure Jungle", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Treasure Jungle coloring canvas");

    await page.getByRole("button", { name: "Eraser", exact: true }).click(); await at(first.seed);
    assert.deepEqual(await paintedPixel(first.seed), [0, 0, 0, 0]);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), green);
    await page.getByRole("button", { name: "Start over", exact: true }).click(); await page.getByRole("button", { name: "Keep coloring", exact: true }).click(); assert.equal(await snapshot(), green);
    await page.getByRole("button", { name: "Start over", exact: true }).click(); await page.getByRole("button", { name: "Start fresh", exact: true }).click(); assert.equal(await snapshot(), empty);
    await page.getByRole("button", { name: "Brush", exact: true }).click();
    const start = await at(first.seed, "position"), end = await at(first.other, "position");
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 15 }); await page.mouse.up();
    assert.deepEqual(await paintedPixel(first.seed), [88, 161, 123, 255]);
    assert.deepEqual(await paintedPixel(first.other), [0, 0, 0, 0], "brush stays in its starting shape");
    const brushed = await snapshot();
    await canvas().focus(); await canvas().press("Control+z"); assert.equal(await snapshot(), empty);
    await canvas().press("Control+Shift+z"); assert.equal(await snapshot(), brushed);
    await page.getByLabel("Stay inside the lines", { exact: true }).uncheck();
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 15 }); await page.mouse.up();
    assert.deepEqual(await paintedPixel(first.other), [88, 161, 123, 255], "free brush can cross shapes");
    await page.getByLabel("Stay inside the lines", { exact: true }).check();
    const downloadEvent = page.waitForEvent("download"); await page.getByRole("button", { name: "Download picture", exact: true }).click();
    const download = await downloadEvent; assert.equal(download.suggestedFilename(), "treasure-jungle.png");
    await download.saveAs(`${screenshotDir}/export.png`);

    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile layout must fit");
    await page.getByRole("button", { name: "Bucket", exact: true }).click(); await page.getByRole("button", { name: "Sunshine", exact: true }).click();
    await canvas().scrollIntoViewIfNeeded();
    const touchPoint = await at(first.seed, "position"), touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.deepEqual(await paintedPixel(first.seed), [244, 206, 84, 255]);
    await page.screenshot({ path: `${screenshotDir}/studio-mobile.png`, fullPage: true });
    await page.getByLabel("Canvas zoom", { exact: true }).selectOption("200");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "zoom scrolls inside the canvas");
    await page.getByLabel("Canvas zoom", { exact: true }).selectOption("100");
    await page.getByRole("button", { name: "Jungle Friends", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Jungle Friends coloring canvas");
    await canvas().focus(); await canvas().press("ArrowRight"); await canvas().press("Enter");
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Finish picture", exact: true }).click(); await expect(page.getByText("Game saved.", { exact: true })).toBeVisible();
    assert.equal(sessions.length, 1); assert.equal(sessions[0].gameKey, "coloring-adventures");
    assert.equal((sessions[0].metadata as { scene: string }).scene, "jungle-friends");

    // Storage failure must never prevent drawing or silently claim a save.
    await page.getByRole("button", { name: /Coloring Adventures/ }).click(); await expect(canvas()).toBeVisible();
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); }; });
    await page.getByRole("button", { name: "Poppy", exact: true }).click();
    await canvas().focus(); await canvas().press("ArrowRight"); await canvas().press("Enter");
    await expect(page.getByRole("region", { name: "Coloring Adventures", exact: true }).getByRole("alert")).toContainText("couldn’t save your progress");
    await expect(page.getByRole("button", { name: "Download picture", exact: true })).toBeEnabled();
    assert.deepEqual(errors, []);
    console.log("Coloring browser checks passed: buckets, patterns, brush boundaries, free drawing, erasing, eyedropper, undo/redo, per-child and per-scene saves, reload, touch, zoom, keyboard, downloads, completion, and storage errors.");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
