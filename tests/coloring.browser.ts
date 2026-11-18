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
    const shares: Record<string, unknown>[] = [];
    let failNextShare = true;
    const errors: string[] = [], sessions: Record<string, unknown>[] = [];
    let failNextFinish = false;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      let response: object = { matches: [] };
      if (url.pathname === "/api/coloring/feed") {
        if (route.request().method() === "POST") {
          shares.push(route.request().postDataJSON());
          if (failNextShare) { failNextShare = false; await route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } }); return; }
          response = { id: shares.at(-1)!.id };
        } else response = { posts: shares.length ? [{ id: shares.at(-1)!.id, title: shares.at(-1)!.title, sceneId: shares.at(-1)!.sceneId, member: { id: "coloring-preview", name: "Alex" }, createdAt: "2026-11-18T12:00:00Z" }] : [], nextCursor: null };
      }
      if (url.pathname.startsWith("/api/coloring/feed/")) {
        await route.fulfill({ contentType: "image/png", body: Buffer.from((shares.at(-1)!.image as string).split(",")[1], "base64") }); return;
      }
      if (url.pathname === "/api/parent/auth") response = { ok: true, accountRole: "parent" };
      if (url.pathname === "/api/parent/elevate") response = { hasPin: true, elevated: true };
      if (url.pathname === "/api/games") {
        if (route.request().method() === "POST") {
          if (failNextFinish) {
            failNextFinish = false;
            await route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } }); return;
          }
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
    async function supplies(section: "Colors" | "Brush" | "Patterns" | "Text" | "Picture") {
      const aside = page.locator("aside[data-panel]");
      const key = { Colors: "colors", Brush: "brush", Patterns: "patterns", Text: "text", Picture: "picture" }[section];
      if (await aside.getAttribute("data-panel") !== key || !(await aside.isVisible())) await page.getByRole("button", { name: section, exact: true }).click();
      return page;
    }
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
    const toolbar = page.getByRole("navigation", { name: "Coloring tools", exact: true });
    assert.deepEqual((await toolbar.getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")))).slice(0, 8), ["Picture", "Bucket", "Brush", "Patterns", "Text", "Colors", "Eraser", "Pan picture"]);
    await expect(toolbar.getByRole("button", { name: "Pick color", exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Quick colors", exact: true })).toBeVisible();

    await expect(page.getByLabel("Themed palette", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Style Text words", { exact: true })).toBeHidden();
    await supplies("Text");
    await expect(page.getByLabel("Style Text words", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Themed palette", { exact: true })).toBeHidden();
    await supplies("Picture");
    await expect(page.getByLabel("Artwork description", { exact: true })).toContainText("A monkey and jaguar discover");
    await supplies("Colors");
    await expect(page.getByRole("button", { name: "Finish picture", exact: true })).toBeDisabled();
    await page.screenshot({ path: `${screenshotDir}/studio-desktop.png`, fullPage: true });
    await (await supplies("Colors")).getByRole("button", { name: "Poppy", exact: true }).click();
    await at(first.seed);
    assert.deepEqual(await paintedPixel(first.seed), [237, 100, 100, 255]);
    assert.deepEqual(await paintedPixel(first.other), [0, 0, 0, 0]);
    const solid = await snapshot();
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), empty);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); assert.equal(await snapshot(), solid);
    for (const pattern of ["Dots", "Stripes", "Stars"]) {
      await (await supplies("Patterns")).getByRole("button", { name: `${pattern} pattern`, exact: true }).click(); await at(first.seed);
      assert.notEqual(await snapshot(), solid);
      assert.deepEqual(await paintedPixel(first.other), [0, 0, 0, 0]);
    }
    await (await supplies("Patterns")).getByRole("button", { name: "Dots pattern", exact: true }).click(); await at(first.seed);
    assert.deepEqual(await paintedPixel(first.dot), [237, 100, 100, 255]);
    assert.deepEqual(await paintedPixel(first.light), [251, 224, 224, 255]);
    await page.getByRole("button", { name: "Bucket", exact: true }).click();
    await (await supplies("Colors")).getByRole("button", { name: "Leaf", exact: true }).click(); await at(first.seed);
    const green = await snapshot();
    await supplies("Picture");
    await expect(page.getByLabel("Artwork description", { exact: true })).toContainText("colored");
    await expect(page.getByRole("img", { name: "Current artwork preview", exact: true })).toBeVisible();
    await supplies("Colors");
    await expect(page.getByRole("img", { name: "Your colored Treasure Jungle picture", exact: true })).toBeVisible();
    await (await supplies("Colors")).getByRole("button", { name: "Poppy", exact: true }).click();
    await (await supplies("Colors")).getByRole("button", { name: "Pick color", exact: true }).click(); await at(first.seed);
    await expect((await supplies("Colors")).getByRole("button", { name: "Leaf", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Bucket", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload(); await page.getByRole("button", { name: /Coloring Adventures/ }).click(); await expect(canvas()).toBeVisible();
    assert.equal(await snapshot(), green, "progress survives a reload");
    await expect(page.getByRole("img", { name: "Your colored Treasure Jungle picture", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Crocodile Creek", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Crocodile Creek coloring canvas");
    await (await supplies("Colors")).getByRole("button", { name: "Sky", exact: true }).click(); await at(second.seed);
    const creek = await snapshot();
    await page.getByRole("button", { name: "Treasure Jungle", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Treasure Jungle coloring canvas"); assert.equal(await snapshot(), green);
    await page.getByRole("button", { name: "Crocodile Creek", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Crocodile Creek coloring canvas"); assert.equal(await snapshot(), creek);
    await page.evaluate((keys) => { for (const key of keys) { const saved = JSON.parse(localStorage.getItem(key)!); delete saved.thumbnail; localStorage.setItem(key, JSON.stringify(saved)); } }, [coloringStorageKey("coloring-preview", "treasure-jungle"), coloringStorageKey("coloring-preview", "crocodile-creek")]);
    await open();
    await expect(page.getByRole("img", { name: "Your colored Treasure Jungle picture", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Your colored Crocodile Creek picture", exact: true })).toBeVisible();
    assert.equal(await snapshot(), creek, "original saves gain previews without changing their artwork");
    await open("another-child"); assert.equal(await snapshot(), empty, "another child has a separate picture");
    await open(); await expect(canvas()).toHaveAttribute("aria-label", "Crocodile Creek coloring canvas"); assert.equal(await snapshot(), creek);
    await page.getByRole("button", { name: "Treasure Jungle", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Treasure Jungle coloring canvas");

    await page.getByRole("button", { name: "Eraser", exact: true }).click(); await at(first.seed);
    assert.deepEqual(await paintedPixel(first.seed), [0, 0, 0, 0]);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), green);
    await page.getByRole("button", { name: "Start over", exact: true }).click(); await page.getByRole("button", { name: "Keep coloring", exact: true }).click(); assert.equal(await snapshot(), green);
    await page.getByRole("button", { name: "Start over", exact: true }).click(); await page.getByRole("button", { name: "Start fresh", exact: true }).click(); assert.equal(await snapshot(), empty);
    await page.getByRole("button", { name: "Brush", exact: true }).click();
    await (await supplies("Colors")).getByRole("button", { name: "Leaf", exact: true }).click();
    const start = await at(first.seed, "position"), end = await at(first.other, "position");
    await page.mouse.move(start.x, start.y);
    const cursor = page.locator('[class*="brushCursor"]');
    await expect(cursor).toBeVisible();
    const cursorBox = (await cursor.boundingBox())!, canvasBox = (await canvas().boundingBox())!;
    assert.ok(Math.abs(cursorBox.width - canvasBox.width * 28 / 1280) < 2, "cursor shows the brush's actual size");
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 15 }); await page.mouse.up();
    assert.deepEqual(await paintedPixel(first.seed), [88, 161, 123, 255]);
    assert.deepEqual(await paintedPixel(first.other), [0, 0, 0, 0], "brush stays in its starting shape");
    const brushed = await snapshot();
    await canvas().focus(); await canvas().press("Control+z"); assert.equal(await snapshot(), empty);
    await canvas().press("Control+Shift+z"); assert.equal(await snapshot(), brushed);
    await (await supplies("Brush")).getByLabel("Stay inside the lines", { exact: true }).uncheck();
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 15 }); await page.mouse.up();
    assert.deepEqual(await paintedPixel(first.other), [88, 161, 123, 255], "free brush can cross shapes");
    await (await supplies("Brush")).getByLabel("Stay inside the lines", { exact: true }).check();
    await (await supplies("Colors")).getByRole("button", { name: "Pick color", exact: true }).click(); await at(first.seed);
    await expect(page.getByRole("button", { name: "Brush", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Eraser", exact: true }).click();
    await (await supplies("Colors")).getByRole("button", { name: "Leaf", exact: true }).click();
    await expect(page.getByRole("button", { name: "Brush", exact: true })).toHaveAttribute("aria-pressed", "true");
    const downloadEvent = page.waitForEvent("download"); await (await supplies("Picture")).getByRole("button", { name: "Download picture", exact: true }).click();
    const download = await downloadEvent; assert.equal(download.suggestedFilename(), "treasure-jungle.png");
    await download.saveAs(`${screenshotDir}/export.png`);

    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile layout must fit");
    const quick = page.getByRole("group", { name: "Quick colors", exact: true });
    await expect(quick).toBeVisible();
    await (await supplies("Colors")).getByRole("button", { name: "Sunshine", exact: true }).click();
    const quickSwatch = quick.getByRole("button", { name: "Quick Sunshine", exact: true });
    const swatchBox = (await quickSwatch.boundingBox())!;
    assert.ok(swatchBox.width >= 44 && swatchBox.height >= 44, "quick colors have generous touch targets");
    await page.getByRole("button", { name: "Bucket", exact: true }).click(); await quickSwatch.click();
    await canvas().scrollIntoViewIfNeeded();
    const touchPoint = await at(first.seed, "position"), touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.deepEqual(await paintedPixel(first.seed), [244, 206, 84, 255]);
    await page.screenshot({ path: `${screenshotDir}/studio-mobile.png`, fullPage: true });
    await page.getByLabel("Canvas zoom", { exact: true }).selectOption("200");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "zoom scrolls inside the canvas");
    const viewport = page.getByTestId("coloring-viewport");
    await viewport.scrollIntoViewIfNeeded();
    await viewport.evaluate((node) => { node.scrollLeft = 0; node.scrollTop = 0; });
    await page.getByRole("button", { name: "Pan picture", exact: true }).click();
    await viewport.scrollIntoViewIfNeeded();
    const beforePan = await snapshot(), panBox = (await viewport.boundingBox())!;
    await page.mouse.move(panBox.x + panBox.width * .7, panBox.y + panBox.height / 2); await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width * .3, panBox.y + panBox.height / 2, { steps: 10 }); await page.mouse.up();
    assert.ok(await viewport.evaluate((node) => node.scrollLeft) > 40, "Move lets players explore a zoomed picture");
    assert.equal(await snapshot(), beforePan, "moving never adds paint");
    // A finger must pan too; drawing deliberately disables native touch scrolling.
    await viewport.evaluate((node) => { node.scrollLeft = 0; });
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: panBox.x + panBox.width * .7, y: panBox.y + panBox.height / 2 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: panBox.x + panBox.width * .3, y: panBox.y + panBox.height / 2 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(await viewport.evaluate((node) => node.scrollLeft) > 40, "touch panning works");
    assert.equal(await snapshot(), beforePan);
    await page.getByRole("button", { name: "Fit picture", exact: true }).click();
    await expect(page.getByLabel("Canvas zoom", { exact: true })).toHaveValue("100");
    await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBe(0);
    await page.getByRole("button", { name: "Jungle Friends", exact: true }).click(); await expect(canvas()).toHaveAttribute("aria-label", "Jungle Friends coloring canvas");
    await page.getByRole("button", { name: "Bucket", exact: true }).click();
    await canvas().focus(); await canvas().press("ArrowRight"); await canvas().press("Enter");
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
    const finishedPicture = await snapshot();
    await page.getByRole("button", { name: "Finish picture", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Look what you made!", exact: true });
    await expect(review).toBeVisible();
    await expect(review.getByRole("img", { name: "Your finished Jungle Friends picture", exact: true })).toHaveAttribute("src", finishedPicture);
    assert.equal(sessions.length, 0, "previewing a picture does not finish the game");
    await review.press("Escape"); await expect(review).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Finish picture", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Finish picture", exact: true }).click();
    await review.getByRole("button", { name: "Keep coloring", exact: true }).click(); assert.equal(await snapshot(), finishedPicture);
    await page.getByRole("button", { name: "Finish picture", exact: true }).click();
    const previewDownload = page.waitForEvent("download"); await review.getByRole("button", { name: "Download PNG", exact: true }).click();
    assert.equal((await previewDownload).suggestedFilename(), "jungle-friends.png");
    await page.screenshot({ path: `${screenshotDir}/picture-preview-mobile.png`, fullPage: true });
    await review.getByRole("button", { name: "Share with parents", exact: true }).click();
    await expect(review.getByRole("alert")).toContainText("Your picture is still here");
    await review.getByRole("button", { name: "Share with parents", exact: true }).click();
    await expect(review.getByRole("button", { name: "Shared with parents", exact: true })).toBeDisabled();
    await expect(review.getByRole("status")).toContainText("Your picture is in the parent feed!");
    assert.equal(shares.length, 2);
    assert.equal(shares[0].id, shares[1].id, "sharing retries reuse the same post ID");
    assert.equal(shares[1].image, finishedPicture, "sharing includes the finished artwork and lettering");
    assert.equal(sessions.length, 0, "sharing does not award another game reward");
    await review.getByRole("button", { name: "Keep coloring", exact: true }).click();
    await page.getByRole("button", { name: "Finish picture", exact: true }).click();
    await expect(review.getByRole("button", { name: "Shared with parents", exact: true })).toBeDisabled();
    failNextFinish = true;
    await review.getByRole("button", { name: "Save & return to games", exact: true }).click();
    await expect(review.getByRole("alert")).toContainText("Your picture is still here");
    await expect(review).toBeVisible(); assert.equal(await snapshot(), finishedPicture);
    await review.getByRole("button", { name: "Save & return to games", exact: true }).click(); await expect(page.getByText("Game saved.", { exact: true })).toBeVisible();
    assert.equal(sessions.length, 1); assert.equal(sessions[0].gameKey, "coloring-adventures");
    assert.equal((sessions[0].metadata as { scene: string }).scene, "jungle-friends");

    // Custom colors and supplies survive a reload without leaking to another child.
    await page.getByRole("button", { name: /Coloring Adventures/ }).click(); await expect(canvas()).toBeVisible();
    await (await supplies("Colors")).getByLabel("Custom color", { exact: true }).evaluate((node) => {
      const input = node as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "#a138ce");
      input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect((await supplies("Colors")).getByRole("button", { name: "Recent #a138ce", exact: true })).toBeVisible();
    const brushSize = (await supplies("Brush")).getByLabel("Brush size", { exact: true });
    await brushSize.press("Home");
    for (let i = 0; i < 21; i++) await brushSize.press("ArrowRight");
    await (await supplies("Brush")).getByLabel("Stay inside the lines", { exact: true }).uncheck();
    await (await supplies("Patterns")).getByRole("button", { name: "Stars pattern", exact: true }).click();
    await open();
    await expect((await supplies("Colors")).getByLabel("Custom color", { exact: true })).toHaveValue("#a138ce");
    await expect((await supplies("Brush")).getByLabel("Brush size", { exact: true })).toHaveValue("48");
    await expect((await supplies("Brush")).getByLabel("Stay inside the lines", { exact: true })).not.toBeChecked();
    await expect((await supplies("Colors")).getByRole("button", { name: "Recent #a138ce", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Patterns", exact: true }).click();
    await expect((await supplies("Patterns")).getByRole("button", { name: "Stars pattern", exact: true })).toHaveAttribute("aria-pressed", "true");
    await open("another-child");
    await expect((await supplies("Colors")).getByLabel("Custom color", { exact: true })).toHaveValue("#58a17b");
    await expect((await supplies("Colors")).getByRole("button", { name: "Recent #a138ce", exact: true })).toHaveCount(0);
    await open();

    await (await supplies("Picture")).getByLabel("Picture title", { exact: true }).fill("Rainbow Jungle");
    await (await supplies("Colors")).getByLabel("Themed palette", { exact: true }).selectOption("Ocean");
    await (await supplies("Colors")).getByRole("button", { name: "Ocean #0891b2", exact: true }).click();
    await expect((await supplies("Colors")).getByLabel("Custom color", { exact: true })).toHaveValue("#0891b2");
    for (const label of ["Checks", "Waves", "Hearts", "Weave"]) {
      await (await supplies("Patterns")).getByRole("button", { name: `${label} pattern`, exact: true }).click();
      await expect((await supplies("Patterns")).getByRole("button", { name: `${label} pattern`, exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    await (await supplies("Colors")).getByRole("button", { name: "Poppy", exact: true }).click();
    for (const style of ["marker", "pencil", "ribbon", "round"]) {
      const before = await snapshot();
      await (await supplies("Brush")).getByLabel("Brush style", { exact: true }).selectOption(style);
      await canvas().focus(); await canvas().press("Enter");
      assert.notEqual(await snapshot(), before, `${style} brush adds paint`);
      await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), before);
    }
    await supplies("Text");
    await page.getByText("Browse lettering styles", { exact: true }).click();
    for (const label of ["Comic hero", "Swirly script", "Bold marker", "Adventure stencil", "Wild West", "Bubble letters"]) {
      await page.getByRole("button", { name: `Use ${label} lettering`, exact: true }).click();
      await expect(page.getByRole("img", { name: "Live text preview", exact: true })).toBeVisible();
    }
    await page.getByText("Browse lettering styles", { exact: true }).click();
    const beforeText = await snapshot();
    await (await supplies("Text")).getByLabel("Style Text words", { exact: true }).fill("Jungle magic!");
    await (await supplies("Text")).getByLabel("Text font", { exact: true }).selectOption("comic");
    await (await supplies("Text")).getByLabel("Text effect", { exact: true }).selectOption("shadow");
    await (await supplies("Text")).getByRole("button", { name: "Place text on picture", exact: true }).click();
    await canvas().focus(); await canvas().press("Enter");
    const withText = await snapshot(); assert.notEqual(withText, beforeText);
    await expect((await supplies("Text")).getByRole("img", { name: "Live text preview", exact: true })).toBeVisible();
    const storedTexts = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).texts, coloringStorageKey("coloring-preview", "jungle-friends"));
    const originalLabel = (await storedTexts())[0];
    assert.equal(originalLabel.font, "comic");
    await canvas().press("ArrowRight");
    assert.equal((await storedTexts())[0].x, originalLabel.x + 5);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(await snapshot(), withText);

    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), beforeText);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); assert.equal(await snapshot(), withText);
    await open(); assert.equal(await snapshot(), withText);
    await expect((await supplies("Picture")).getByLabel("Picture title", { exact: true })).toHaveValue("Rainbow Jungle");
    await (await supplies("Text")).getByRole("button", { name: "Move text", exact: true }).click();
    await canvas().scrollIntoViewIfNeeded();
    const savedLabel = (await storedTexts())[0];
    const from = await at({ x: savedLabel.x, y: savedLabel.y }, "position");
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x + 18, from.y + 12, { steps: 5 }); await page.mouse.up();
    assert.ok((await storedTexts())[0].x > savedLabel.x + 10, "saved text can be dragged after reload");
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), withText);

    // Remove a chosen saved label after other edits, without changing paint or its neighbor.
    await (await supplies("Text")).getByLabel("Style Text words", { exact: true }).fill("Keep this label");
    await (await supplies("Text")).getByRole("button", { name: "Place text on picture", exact: true }).click();
    await canvas().focus(); await canvas().press("Enter");
    await page.getByRole("button", { name: "Brush", exact: true }).click();
    await (await supplies("Colors")).getByRole("button", { name: "Sky", exact: true }).click();
    await canvas().focus(); await canvas().press("Enter");
    const paintBeforeDelete = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).image, coloringStorageKey("coloring-preview", "jungle-friends"));
    const bothLabels = await storedTexts(); assert.equal(bothLabels.length, 2);
    await (await supplies("Text")).getByLabel("Select text box", { exact: true }).selectOption(bothLabels[0].id);
    await (await supplies("Text")).getByRole("button", { name: "Delete selected text", exact: true }).click();
    assert.deepEqual((await storedTexts()).map((label: { id: string }) => label.id), [bothLabels[1].id]);
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).image, coloringStorageKey("coloring-preview", "jungle-friends")), paintBeforeDelete);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal((await storedTexts()).length, 2);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); assert.equal((await storedTexts()).length, 1);
    await open();
    assert.equal((await storedTexts()).length, 1);
    await expect((await supplies("Text")).getByRole("button", { name: "Delete selected text", exact: true })).toBeDisabled();
    await (await supplies("Text")).getByRole("button", { name: "Move text", exact: true }).click();
    await (await supplies("Text")).getByLabel("Select text box", { exact: true }).selectOption(bothLabels[1].id);
    await canvas().focus(); await canvas().press("Backspace"); assert.equal((await storedTexts()).length, 0);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal((await storedTexts()).length, 1);
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).image, coloringStorageKey("coloring-preview", "jungle-friends")), paintBeforeDelete);

    const beforeStarter = await snapshot(), labelsBeforeStarter = await storedTexts();
    await page.getByRole("button", { name: "Generate starting colors", exact: true }).click();
    await expect(page.getByLabel("Keep my colors", { exact: true })).toBeChecked();
    await page.getByLabel("Starting color style", { exact: true }).selectOption("complementary");
    await page.getByRole("button", { name: "Generate colors", exact: true }).click();
    const started = await snapshot(); assert.notEqual(started, beforeStarter);
    assert.deepEqual(await storedTexts(), labelsBeforeStarter);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), beforeStarter);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); assert.equal(await snapshot(), started);
    await page.getByLabel("Keep my colors", { exact: true }).uncheck();
    await page.getByRole("button", { name: "Generate colors", exact: true }).click(); assert.notEqual(await snapshot(), started);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), started);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.equal(await snapshot(), beforeStarter);
    await page.getByLabel("Starting color style", { exact: true }).selectOption("scenery");
    await page.getByRole("button", { name: "Generate colors", exact: true }).click();
    await page.screenshot({ path: `${screenshotDir}/generated-starter.png`, fullPage: true });
    await open(); assert.notEqual(await snapshot(), beforeStarter, "generated colors save and reopen");
    assert.deepEqual(await storedTexts(), labelsBeforeStarter);

    const titledDownload = page.waitForEvent("download"); await (await supplies("Picture")).getByRole("button", { name: "Download picture", exact: true }).click();
    assert.equal((await titledDownload).suggestedFilename(), "rainbow-jungle.png");

    // The expanded workspace must work even when native fullscreen is unavailable.
    await page.evaluate("Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, value: function () { return Promise.reject(new Error('Unavailable')); } })");
    for (const dimensions of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(dimensions);
      const before = await snapshot();
      await page.getByRole("button", { name: "Enter full screen", exact: true }).click();
      const studio = page.getByRole("region", { name: "Coloring Adventures", exact: true });
      await expect(studio).toHaveAttribute("data-fullscreen", "true");
      await expect(page.getByRole("group", { name: "Quick colors", exact: true })).toBeVisible();
      const bounds = (await studio.boundingBox())!;
      assert.equal(Math.round(bounds.width), dimensions.width); assert.equal(Math.round(bounds.height), dimensions.height);
      assert.equal(await snapshot(), before, "fullscreen preserves artwork");
      await page.getByRole("button", { name: "Picture", exact: true }).click();
      await expect((await supplies("Picture")).getByLabel("Picture title", { exact: true })).toBeVisible();
      await expect((await supplies("Text")).getByLabel("Style Text words", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close editing dock", exact: true }).click();
      await page.screenshot({ path: `${screenshotDir}/fullscreen-${dimensions.width}.png`, fullPage: false });
      await page.getByRole("button", { name: "Exit full screen", exact: true }).click();
      await expect(studio).toHaveAttribute("data-fullscreen", "false");
      assert.equal(await snapshot(), before);
    }
    await page.getByRole("button", { name: "Enter full screen", exact: true }).click();
    await page.getByRole("button", { name: "Picture", exact: true }).click();
    await (await supplies("Picture")).getByLabel("Dock scene", { exact: true }).selectOption("jungle-river");
    await expect(canvas()).toHaveAttribute("aria-label", "Jungle River Adventure coloring canvas");
    const river = await fixture(3);
    await page.getByRole("button", { name: "Bucket", exact: true }).click();
    await page.getByRole("button", { name: "Close editing dock", exact: true }).click();
    const blankRiver = await snapshot(); await at(river.seed); assert.notEqual(await snapshot(), blankRiver);
    const riverPainted = await snapshot();
    await canvas().press("Escape");
    await expect(page.getByRole("button", { name: "Enter full screen", exact: true })).toBeVisible();
    await open(); await expect(canvas()).toHaveAttribute("aria-label", "Jungle River Adventure coloring canvas");
    assert.equal(await snapshot(), riverPainted, "new scene progress survives fullscreen exit and reload");

    for (const index of [4, 5]) {
      const scene = COLORING_SCENES[index], sample = await fixture(index);
      await page.getByRole("button", { name: scene.title, exact: true }).click();
      await expect(canvas()).toHaveAttribute("aria-label", `${scene.title} coloring canvas`);
      await page.getByRole("button", { name: "Bucket", exact: true }).click();
      await (await supplies("Colors")).getByRole("button", { name: "Leaf", exact: true }).click();
      await canvas().scrollIntoViewIfNeeded();
      const blank = await snapshot(); await at(sample.seed);
      const painted = await snapshot(); assert.notEqual(painted, blank, `${scene.title} supports bucket coloring`);
      await open(); await expect(canvas()).toHaveAttribute("aria-label", `${scene.title} coloring canvas`);
      assert.equal(await snapshot(), painted, `${scene.title} saves separately and reopens correctly`);
    }
    await page.getByRole("button", { name: "Jungle River Adventure", exact: true }).click();
    await expect(canvas()).toHaveAttribute("aria-label", "Jungle River Adventure coloring canvas");

    // Storage failure must never prevent drawing or silently claim a save.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); }; });
    await (await supplies("Colors")).getByRole("button", { name: "Poppy", exact: true }).click();
    await canvas().focus(); await canvas().press("ArrowRight"); await canvas().press("Enter");
    await expect(page.getByRole("region", { name: "Coloring Adventures", exact: true }).getByRole("alert")).toContainText("couldn’t save your progress");
    await expect((await supplies("Picture")).getByRole("button", { name: "Download picture", exact: true })).toBeEnabled();
    assert.deepEqual(errors, []);
    await page.goto(`${baseUrl}/parent/feed`);
    await expect(page.getByRole("heading", { name: "Family Feed", exact: true })).toBeVisible();
    await expect(page.getByText("Alex shared a picture")).toBeVisible();
    await expect(page.getByRole("img", { name: "Jungle Friends, colored by Alex" })).toBeVisible();
    await expect.poll(() => page.getByRole("img", { name: "Jungle Friends, colored by Alex" }).evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: `${screenshotDir}/parent-feed-mobile.png`, fullPage: true });
    shares.length = 0;
    await page.getByRole("button", { name: "Refresh feed", exact: true }).click();
    await expect(page.getByText("Their next masterpiece goes here")).toBeVisible();
    assert.deepEqual(errors, []);
    console.log("Coloring browser checks passed: sharing, share retries, private parent feed, empty feed, drawing tools, brush cursor, gallery previews, undo/redo, saves, remembered supplies, mobile colors, mouse/touch panning, fit, keyboard, downloads, picture review, completion retry, and storage errors.");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
