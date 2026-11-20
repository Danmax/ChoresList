import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect, type Locator } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { applyHayfieldDrive, createFarm, farmHayfield } from "../lib/sunny-farm";
import { HAY_CELL_COUNT, hayfieldProgress } from "../lib/sunny-farm-hayfield";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error("Tablet fullscreen fixture")); });
  const member = { id: "hayfield-preview", name: "Alex", age: 7, avatar: "🧒", color: "#a78bfa", totalPoints: 0 };
  let farm = createFarm(), version = 0, loseNextResponse = false;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/games") return route.fulfill({ json: { member, members: [member], games: GAME_DEFINITIONS, settings: GAME_DEFINITIONS.map(g => ({ gameKey: g.key, ...DEFAULT_GAME_SETTINGS[g.key] })), availability: Object.fromEntries(GAME_DEFINITIONS.map(g => [g.key, { available: true, playsToday: 0, openChores: 0 }])), chessPlayers: [] } });
    if (path !== "/api/sunny-farm") return route.fulfill({ json: { matches: [] } });
    if (route.request().method() === "POST") {
      await new Promise(resolve => setTimeout(resolve, 150));
      const body = route.request().postDataJSON();
      if (body.version !== version) return route.fulfill({ status: 409, json: { error: "Farm changed in another tab." } });
      farm = applyHayfieldDrive(farm, body.commands); version++;
      if (loseNextResponse) { loseNextResponse = false; return route.fulfill({ status: 500, json: { error: "Response lost after saving. Your farm is safe." } }); }
    }
    await route.fulfill({ json: { farm, version, serverNow: Date.now() } });
  });
  const open = async () => {
    await page.goto(`${process.env.SUNNY_FARM_TEST_URL ?? "http://127.0.0.1:3017"}/kid/hayfield-preview/games`);
    await page.getByRole("button", { name: /Sunny Farm Helpers/ }).click();
    await page.getByRole("button", { name: "Hayfield: Gather hay", exact: true }).click();
  };
  const vehicle = page.locator("[data-vehicle]");
  const board = page.getByRole("group", { name: "Hayfield activity", exact: true });
  async function withinScreen(locator: Locator) {
    const rect = (await locator.boundingBox())!, size = page.viewportSize()!;
    assert.ok(rect && rect.x >= -1 && rect.y >= -1 && rect.x + rect.width <= size.width + 1 && rect.y + rect.height <= size.height + 1, `${await locator.getAttribute("aria-label")} is outside ${size.width}×${size.height}: ${JSON.stringify(rect)}`);
    return rect;
  }
  await mkdir("/tmp/sunny-farm-preview", { recursive: true });
  try {
    await open();
    await board.focus();
    await page.keyboard.down("ArrowRight"); await page.waitForTimeout(500); await page.keyboard.up("ArrowRight");
    const releasedX = await vehicle.getAttribute("data-x");
    await page.waitForTimeout(250);
    await expect(vehicle).toHaveAttribute("data-x", releasedX!);
    await page.getByRole("button", { name: "Pause driving", exact: true }).click();
    await board.press("ArrowRight");
    await expect(vehicle).toHaveAttribute("data-x", releasedX!);
    await page.getByRole("button", { name: "Keep driving", exact: true }).click();
    const touch = await page.context().newCDPSession(page);
    const down = (await page.getByRole("button", { name: "Drive down", exact: true }).boundingBox())!;
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: down.x + down.width / 2, y: down.y + down.height / 2 }] });
    await page.waitForTimeout(400);
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const releasedY = await vehicle.getAttribute("data-y");
    assert.ok(Number(releasedY) > 2, "Holding the touch control should drive the tractor");
    await page.waitForTimeout(180);
    await expect(vehicle).toHaveAttribute("data-y", releasedY!);
    // Tap-to-drive uses SVG coordinates even when the board has letterboxing.
    const destination = { x: Math.min(18, Number(releasedX) + 3), y: Math.min(12, Number(releasedY) + 2) };
    const tap = await board.evaluate((el, target) => { const p = new DOMPoint(target.x, target.y).matrixTransform((el as SVGSVGElement).getScreenCTM()!); return { x: p.x, y: p.y }; }, destination);
    await page.touchscreen.tap(tap.x, tap.y);
    await expect(vehicle).toHaveAttribute("data-x", String(destination.x));
    await expect(vehicle).toHaveAttribute("data-y", String(destination.y));
    await page.getByRole("button", { name: "Farm map", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Who shall we help today?", exact: true })).toBeVisible();
    assert.equal(farmHayfield(farm).x, destination.x, "Leaving the scene must flush queued driving");
    assert.equal(farmHayfield(farm).y, destination.y);
    await open();
    await expect(vehicle).toHaveAttribute("data-x", String(destination.x));
    await expect(page.getByRole("progressbar", { name: "Hayfield mowed", exact: true })).toHaveAttribute("aria-valuenow", String(hayfieldProgress(farmHayfield(farm)).percent));
    loseNextResponse = true;
    await page.getByRole("button", { name: "Drive right", exact: true }).press("Enter");
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("alert")).toContainText("Response lost");
    await expect.poll(() => vehicle.getAttribute("data-x")).toBe(String(farmHayfield(farm).x));
    assert.equal(farm.inventory.hay, 0, "Mowing must not grant hay before transport");
    await page.getByRole("button", { name: "Farm map", exact: true }).click();
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(size); await open();
      const scene = await withinScreen(board);
      assert.ok(scene.height >= 110, "Driving needs a usable board height");
      const hud = await withinScreen(page.getByRole("group", { name: "Hayfield progress", exact: true }));
      const tools = await withinScreen(page.locator("[data-tool-tray]"));
      assert.ok(hud.y + hud.height <= tools.y + 1, `Progress must not overlap the steering controls at ${size.width}: ${JSON.stringify({ hud, tools })}`);
      for (const direction of ["up", "left", "down", "right"]) {
        const button = page.getByRole("button", { name: `Drive ${direction}`, exact: true });
        await withinScreen(button);
        assert.ok(await button.evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest("button") === el; }), `Drive ${direction} must not be covered by another panel`);
      }
      assert.equal(await page.locator("[data-game-player]").evaluate(el => el.scrollWidth > el.clientWidth), false);
      await page.screenshot({ path: `/tmp/sunny-farm-preview/hayfield-driving-${size.width}.png` });
    }
    // A partly loaded truck resumes with its cargo and delivered inventory intact.
    farm.hayfield = { ...farmHayfield(farm), cut: Array.from({ length: HAY_CELL_COUNT }, (_, i) => i), vehicle: "truck", picked: [0, 1, 2], delivered: [0], x: 11, y: 8 };
    farm.inventory.hay = 1; version++;
    await page.setViewportSize({ width: 844, height: 390 }); await open();
    await expect(page.getByText("Truck bed: 2/3", { exact: true })).toBeVisible();
    await expect(page.getByText("1/9", { exact: true })).toBeVisible();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/hayfield-truck-landscape.png" });
    assert.deepEqual(errors, []);
    console.log("Hayfield driving checks passed: keyboard, touch, tap-to-drive, pause, saved exits, reload, lost-response recovery, truck cargo, and phone layouts.");
  } catch (error) { await page.screenshot({ path: "/tmp/sunny-farm-preview/hayfield-driving-failure.png" }); throw error; }
  finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
