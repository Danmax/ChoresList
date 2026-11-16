import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
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
          if (body.action === "help") farm = applyFarmAction(farm, body.task, body.target);
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
  try {
    await open();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/map-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Horse stable: Feed & brush" }).click();
    await expect(page.getByText(/Your friends need hay/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Feed hay", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Go to hayfield" }).click();
    failNext = true;
    await page.getByRole("button", { name: "Collect hay 1", exact: true }).click();
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("alert")).toContainText("Connection lost");
    await expect(page.getByRole("button", { name: "Collect hay 1", exact: true })).toBeEnabled();
    conflictNext = true;
    await page.getByRole("button", { name: "Collect hay 1", exact: true }).click();
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("alert")).toContainText("another tab");
    for (const i of [3, 1, 2]) await page.getByRole("button", { name: `Collect hay ${i}`, exact: true }).click();
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
        await page.getByRole("button", { name: label, exact: true }).click();
      }
      await expect(page.getByText("Happy & cared for!")).toBeVisible();
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
    await page.getByRole("button", { name: "Feed duck 2", exact: true }).click();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/ducks-mobile.png", fullPage: true });
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflows) throw new Error("Mobile page overflows horizontally");
    if (activeTargets(farm, "ducks").length !== 2) throw new Error("Mobile action did not save");
    if (errors.length) throw new Error(errors.join("\n"));
    console.log("Farm browser checks passed: all eight activities, save/reload, error retry, conflicts, one celebration, new day, and mobile layout.");
  } finally { await browser.close(); }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
