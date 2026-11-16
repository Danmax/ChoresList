import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { farmTool } from "../lib/sunny-farm-tools";
import { activeTargets, applyFarmAction, celebrateFarm, createFarm, FARM_TASKS, nextFarmDay } from "../lib/sunny-farm";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errors: string[] = [];
  page.on("pageerror", err => errors.push(err.message));
  let farm = createFarm(), version = 0, rewards = 0, failNext = false, conflictNext = false;
  const member = { id: "farm-preview", name: "Alex", age: 7, avatar: "🧒", color: "#a78bfa", totalPoints: 0 };
  await mkdir("/tmp/sunny-farm-preview", { recursive: true });
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    let response: object = { ok: true, matches: [] }, status = 200;
    if (url.pathname === "/api/games") response = { member, members: [member], games: GAME_DEFINITIONS, settings: GAME_DEFINITIONS.map(g => ({ gameKey: g.key, ...DEFAULT_GAME_SETTINGS[g.key] })), availability: Object.fromEntries(GAME_DEFINITIONS.map(g => [g.key, { available: true, playsToday: 0, openChores: 0 }])), chessPlayers: [] };
    if (url.pathname === "/api/sunny-farm") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        if (failNext) { failNext = false; await route.fulfill({ status: 500, json: { error: "Connection lost. Try again." } }); return; }
        if (conflictNext) { conflictNext = false; version++; await route.fulfill({ status: 409, json: { error: "Farm updated in another tab." } }); return; }
        try {
          if (body.version !== version) throw new Error("Stale version");
          if (body.action === "help") { if (body.tool !== farmTool(body.task, body.target).id) throw new Error("Wrong tool"); farm = applyFarmAction(farm, body.task, body.target); }
          else if (body.action === "celebrate") { farm = celebrateFarm(farm); rewards++; }
          else if (body.action === "next-day") farm = nextFarmDay(farm);
          version++;
        } catch (err) { status = 400; response = { error: String(err) }; }
      }
      if (status === 200) response = { farm, version };
    }
    await route.fulfill({ status, json: response });
  });
  const open = async () => {
    await page.goto(`${process.env.SUNNY_FARM_TEST_URL ?? "http://localhost:3017"}/kid/farm-preview/games`);
    await page.getByRole("button", { name: /Sunny Farm Helpers/ }).click();
    await expect(page.getByRole("heading", { name: "Who shall we help today?" })).toBeVisible();
  };
  async function work(label: string) {
    await page.waitForTimeout(80);
    const pickup = page.getByRole("button", { name: /Pick up|Put down/ });
    if (await pickup.getAttribute("aria-pressed") !== "true") await pickup.click();
    const target = page.getByRole("button", { name: label, exact: true });
    await expect(target).toHaveAttribute("aria-disabled", "false");
    await target.focus();
    const meter = page.getByRole("progressbar", { name: `${label} progress` });
    const done = await meter.count() ? Number(await meter.getAttribute("aria-valuenow")) / 25 : 0;
    for (let i = done; i < 4; i++) await target.press("ArrowUp");
    await page.waitForTimeout(80);
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("status")).not.toContainText("Saving your helping hands");
  }
  try {
    await open();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/map-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Horse stable: Feed & brush" }).click();
    await expect(page.getByText(/Your friends need hay/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Feed hay", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Go to hayfield" }).click();
    failNext = true;
    await work("Collect hay 1");
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("alert")).toContainText("Connection lost");
    await expect(page.getByRole("button", { name: "Collect hay 1", exact: true })).toBeEnabled();
    conflictNext = true;
    await work("Collect hay 1");
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("alert")).toContainText("another tab");
    for (const i of [3, 1, 2]) await work(`Collect hay ${i}`);
    await expect(page.getByText("Happy & cared for!")).toBeVisible();
    await page.getByRole("button", { name: "Back to the farm →", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /Sunny Farm Helpers/ }).click();
    await expect(page.getByRole("button", { name: "Hayfield: all done" })).toBeVisible();
    const labels: Record<string, string> = { feed: "Feed hay", "milk-left": "Squeeze left", "milk-right": "Squeeze right", "milk-finish": "Finish milking" };
    for (const task of FARM_TASKS.slice(1)) {
      await page.getByRole("button", { name: `${task.title}: ${task.verb}`, exact: true }).click();
      for (const stage of task.stages) for (const target of stage) {
        const i = Number(target.split("-").at(-1)) + 1;
        const label = task.id === "chickens" && target === "feed" ? "Scatter grain" : labels[target] ?? (target.startsWith("brush") ? `Brush spot ${i}` : target.startsWith("egg") ? `Collect egg ${i}` : target.startsWith("herd") ? `Guide sheep ${i}` : target.startsWith("wool") ? `Clip wool ${i}` : target.startsWith("duck") ? `Feed duck ${i}` : target.startsWith("apple") ? `Pick apple ${i}` : target.startsWith("plant") ? `Plant bed ${i}` : target.startsWith("water") ? `Water bed ${i}` : `Harvest bed ${i}`);
        if (target === "feed" && (task.id === "horse" || task.id === "cow")) {
          const pickup = page.getByRole("button", { name: /Pick up.*Fresh hay/ });
          const feeder = page.getByRole("button", { name: "Feed hay", exact: true });
          await page.setViewportSize({ width: 390, height: 844 });
          await feeder.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `/tmp/sunny-farm-preview/${task.id}-feed-mobile.png`, fullPage: true });
          if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("Animal activity overflows on mobile");
          await page.setViewportSize({ width: 1280, height: 1100 });
          await pickup.scrollIntoViewIfNeeded();
          const start = (await pickup.boundingBox())!, end = (await feeder.boundingBox())!;
          await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
          await page.mouse.down();
          await page.mouse.move(end.x + end.width / 2, end.y + 16, { steps: 12 });
          await page.mouse.up();
          await expect(feeder).toHaveCount(0);
          await page.screenshot({ path: `/tmp/sunny-farm-preview/${task.id}-work-desktop.png`, fullPage: true });
          const animal = page.getByRole("img", { name: task.id === "horse" ? "Your farm horse" : "Your farm cow" });
          const size = (await animal.boundingBox())!;
          const scene = (await page.getByLabel(`${task.title} activity`, { exact: true }).boundingBox())!;
          const ratio = task.id === "horse" ? .425 : .4165;
          if (Math.abs(size.width / scene.width - ratio) > .005) throw new Error("Animal scale differs from the requested 15% reduction");
        } else if (target === "brush-0") {
          const spot = page.getByRole("button", { name: label, exact: true });
          await spot.click({ force: true });
          if (farm.done.horse.includes(target)) throw new Error("Click completed brushing without a tool");
          await page.getByRole("button", { name: /Pick up.*Grooming brush/ }).click();
          // Partial work on a second patch must survive completing the first.
          const second = page.getByRole("button", { name: "Brush spot 2", exact: true });
          await second.focus(); await second.press("ArrowUp");
          const box = (await spot.boundingBox())!;
          const x = box.x + box.width / 2, y = box.y + 15;
          await page.mouse.move(x, y); await page.mouse.down();
          for (let n = 0; n < 16; n++) await page.mouse.move(x + (n % 2 ? -12 : 12), y, { steps: 3 });
          await page.mouse.up();
          await expect(spot).toHaveCount(0);
          await expect(page.getByRole("progressbar", { name: "Brush spot 2 progress" })).toHaveAttribute("aria-valuenow", "25");
        } else if (target === "water-0") {
          await page.getByRole("button", { name: /Pick up.*Watering can/ }).click();
          const bed = page.getByRole("button", { name: label, exact: true });
          const box = (await bed.boundingBox())!;
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await expect(page.locator('[class*="carriedTool"]')).toBeVisible();
          await page.keyboard.press("Escape");
          await page.waitForTimeout(1150); await page.mouse.up();
          if (farm.done.garden.includes(target)) throw new Error("Escape did not stop watering");
          await page.getByRole("button", { name: /Pick up.*Watering can/ }).click();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down(); await page.waitForTimeout(1250); await page.mouse.up();
          await expect(bed).toHaveCount(0);
        } else await work(label);
      }
      await expect(page.getByText("Happy & cared for!")).toBeVisible();
      if (task.id === "garden") await page.screenshot({ path: "/tmp/sunny-farm-preview/garden-desktop.png", fullPage: true });
      if (task.id === "horse") await page.screenshot({ path: "/tmp/sunny-farm-preview/horse-desktop.png", fullPage: true });
      await page.getByRole("button", { name: "Back to the farm →", exact: true }).click();
    }
    await expect(page.getByLabel("3 eggs", { exact: true })).toBeVisible();
    await expect(page.getByLabel("1 milk", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Celebrate our happy farm! ★", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Everyone is happy!" })).toBeVisible();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/celebration-desktop.png", fullPage: true });
    if (rewards !== 1) throw new Error(`Expected one completion, got ${rewards}`);
    await page.getByRole("button", { name: "Start another farm day →" }).click();
    await expect(page.getByLabel("0 of 8 farm stops complete")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/sunny-farm-preview/map-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Duck pond: Feed the ducks", exact: true }).click();
    await page.getByRole("button", { name: /Pick up.*Duck pellets/ }).click();
    const duck = page.getByRole("button", { name: "Feed duck 2", exact: true });
    await duck.scrollIntoViewIfNeeded();
    const touchBox = (await duck.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchBox.x + touchBox.width / 2, y: touchBox.y + touchBox.height / 2 }] });
    await page.waitForTimeout(1250);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(duck).toHaveCount(0);
    await page.screenshot({ path: "/tmp/sunny-farm-preview/ducks-mobile.png", fullPage: true });
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflows) throw new Error("Mobile page overflows horizontally");
    if (activeTargets(farm, "ducks").length !== 2) throw new Error("Mobile action did not save");
    if (errors.length) throw new Error(errors.join("\n"));
    console.log("Farm browser checks passed: all eight activities, save/reload, error retry, conflicts, one celebration, new day, and mobile layout.");
  } finally { await browser.close(); }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
