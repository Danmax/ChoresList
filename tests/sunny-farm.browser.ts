import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { farmTool } from "../lib/sunny-farm-tools";
import { activeTargets, applyFarmAction, celebrateFarm, createFarm, FARM_CROPS, FARM_TASKS, nextFarmDay } from "../lib/sunny-farm";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await page.addInitScript(() => {
    const log = window as unknown as { farmAudioStarts: number[]; farmSpeech: string[] };
    log.farmAudioStarts = []; log.farmSpeech = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) { log.farmAudioStarts.push(this.buffer?.duration ?? 0); return start.apply(this, args); };
    window.speechSynthesis.speak = utterance => { log.farmSpeech.push(utterance.text); };
  });
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
          if (body.action === "help") { if (body.tool !== farmTool(body.task, body.target).id) throw new Error("Wrong tool"); farm = applyFarmAction(farm, body.task, body.target, body.crop); }
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
    if (/Feed duck/.test(label)) { await page.getByRole("button", { name: label, exact: true }).click(); await page.waitForTimeout(80); return; }
    if (/Collect egg|Pick apple/.test(label)) {
      await page.getByRole("button", { name: label, exact: true }).press("Enter");
      await page.getByRole("button", { name: "Put item in basket", exact: true }).press("Enter");
      await page.waitForTimeout(80); return;
    }
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
    const toy = page.getByRole("button", { name: "Ring the farm bell", exact: true });
    await toy.click();
    const firstToyReply = await page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("status").textContent();
    await toy.click();
    await expect(page.getByRole("region", { name: "Sunny Farm Helpers" }).getByRole("status")).not.toHaveText(firstToyReply!);
    if (version !== 0) throw new Error("Exploring changed saved farm progress");
    if (await page.evaluate(() => (window as unknown as { farmAudioStarts: number[] }).farmAudioStarts.length)) throw new Error("Audio played while muted");
    await page.getByRole("button", { name: "Turn farm sounds on", exact: true }).click();
    await toy.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { farmAudioStarts: number[] }).farmAudioStarts.length)).toBeGreaterThan(0);
    if (await page.evaluate(() => (window as unknown as { farmSpeech: string[] }).farmSpeech.length)) throw new Error("Effects toggle enabled the reader");
    await page.getByText("Audio settings", { exact: true }).click();
    await page.getByLabel("Spoken guidance", { exact: true }).check();
    await page.getByRole("button", { name: "Preview voice", exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { farmSpeech: string[] }).farmSpeech.length)).toBe(1);
    await page.getByText("Audio settings", { exact: true }).click();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/map-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Horse stable: Feed & brush" }).click();
    await page.getByRole("button", { name: "Feed horse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Brush spot 1", exact: true })).toBeVisible();
    const horseArt = page.getByRole("img", { name: "Your farm horse", exact: true });
    await expect(horseArt).toHaveAttribute("data-pose", "4");
    await expect(horseArt).toHaveAttribute("data-pose", "0", { timeout: 3000 });
    await expect.poll(() => page.evaluate(() => (window as unknown as { farmAudioStarts: number[] }).farmAudioStarts.some(duration => duration > 1))).toBe(true);
    if (farm.inventory.hay !== 0) throw new Error("Starter feeding created negative hay");
    await page.getByRole("button", { name: "Farm map", exact: true }).click();
    await page.getByRole("button", { name: "Hayfield: Gather hay", exact: true }).click();
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
      const sceneToys = page.locator('[aria-label="Explore this scene"] button');
      await expect(sceneToys).toHaveCount(2);
      const beforeExploring: number = version;
      await sceneToys.nth(0).click(); await sceneToys.nth(1).click();
      if (version !== beforeExploring) throw new Error(`${task.id} exploration changed care progress`);
      for (const stage of task.stages) for (const target of stage) {
        if (farm.done[task.id].includes(target)) continue;
        const i = Number(target.split("-").at(-1)) + 1;
        const label = task.id === "chickens" && target === "feed" ? "Scatter grain" : labels[target] ?? (target.startsWith("brush") ? `Brush spot ${i}` : target.startsWith("egg") ? `Collect egg ${i}` : target.startsWith("herd") ? `Guide sheep ${i}` : target.startsWith("wool") ? `Clip wool ${i}` : target.startsWith("duck") ? `Feed duck ${i}` : target.startsWith("apple") ? `Pick apple ${i}` : target.startsWith("plant") ? `Plant bed ${i}` : target.startsWith("water") ? `Water bed ${i}` : `Harvest bed ${i}`);
        if (task.id === "garden" && target.startsWith("plant-")) {
          const crop = FARM_CROPS[(i - 1) % 3];
          await page.getByRole("button", { name: crop.label, exact: true }).click();
          await work(label);
          await expect(page.locator(`[data-crop="${crop.id}"]`)).toHaveCount(Math.ceil(i / 3));
          if (target === "plant-8") {
            await open();
            await page.getByRole("button", { name: `${task.title}: ${task.verb}`, exact: true }).click();
            for (const savedCrop of FARM_CROPS) await expect(page.locator(`[data-crop="${savedCrop.id}"]`)).toHaveCount(3);
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({ path: "/tmp/sunny-farm-preview/mixed-garden-mobile.png", fullPage: true });
            await page.setViewportSize({ width: 1280, height: 1100 });
          }
        } else if (target === "feed") {
          const animalLabel = task.id === "chickens" ? "Feed chicken 1" : `Feed ${task.id}`;
          const animalButton = page.getByRole("button", { name: animalLabel, exact: true });
          await page.setViewportSize({ width: 390, height: 844 });
          await animalButton.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `/tmp/sunny-farm-preview/${task.id}-feed-mobile.png`, fullPage: true });
          // Direct touch feeding must work without selecting a tool or a hidden hotspot.
          const box = (await animalButton.boundingBox())!;
          const touch = await page.context().newCDPSession(page);
          await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
          await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await expect(animalButton).toHaveCount(0);
          await page.setViewportSize({ width: 1280, height: 1100 });
          if (task.id === "cow") await page.screenshot({ path: "/tmp/sunny-farm-preview/cow-work-desktop.png", fullPage: true });
        } else if (target === "egg-0" || target === "egg-1") {
          const egg = page.getByRole("button", { name: label, exact: true });
          const basket = page.getByRole("button", { name: "Put item in basket", exact: true });
          await egg.scrollIntoViewIfNeeded();
          const start = (await egg.boundingBox())!, end = (await basket.boundingBox())!;
          await page.mouse.move(start.x + start.width / 2, start.y + 16); await page.mouse.down();
          if (target === "egg-0") {
            await page.mouse.move(start.x + start.width / 2, start.y + start.height + 40, { steps: 5 }); await page.mouse.up();
            if (farm.inventory.eggs !== 0) throw new Error("Egg saved before reaching basket");
            await basket.click();
          } else {
            await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 }); await page.mouse.up();
          }
          await expect(egg).toHaveCount(0);
          if (target === "egg-1") await page.screenshot({ path: "/tmp/sunny-farm-preview/eggs-basket-desktop.png", fullPage: true });
        } else if (target === "egg-2") {
          await page.setViewportSize({ width: 390, height: 844 });
          const egg = page.getByRole("button", { name: label, exact: true });
          await egg.scrollIntoViewIfNeeded();
          const touch = await page.context().newCDPSession(page);
          const tap = async (box: { x: number; y: number; width: number; height: number }) => {
            await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
            await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          };
          await tap((await egg.boundingBox())!);
          if (farm.inventory.eggs !== 2) throw new Error("Touch pickup saved an egg before depositing");
          const basket = page.getByRole("button", { name: "Put item in basket", exact: true });
          await basket.scrollIntoViewIfNeeded(); await tap((await basket.boundingBox())!);
          await expect(egg).toHaveCount(0);
          await page.screenshot({ path: "/tmp/sunny-farm-preview/eggs-basket-mobile.png", fullPage: true });
          await page.setViewportSize({ width: 1280, height: 1100 });
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
        if (task.id === "garden" && target === "water-8") {
          await page.screenshot({ path: "/tmp/sunny-farm-preview/mixed-garden-grown-desktop.png", fullPage: true });
          await page.setViewportSize({ width: 390, height: 844 });
          await page.screenshot({ path: "/tmp/sunny-farm-preview/mixed-garden-grown-mobile.png", fullPage: true });
          const gardenScene = await page.getByLabel("Vegetable garden activity", { exact: true }).boundingBox();
          if (!gardenScene || gardenScene.x + gardenScene.width > 390) throw new Error("Mobile garden extends past the screen");
          await page.setViewportSize({ width: 1280, height: 1100 });
        }
      }
      await expect(page.getByText("Happy & cared for!")).toBeVisible();
      if (task.id === "garden") {
        for (const crop of FARM_CROPS) await expect(page.getByLabel(`3 ${crop.inventory}`, { exact: true })).toBeVisible();
      }
      if (task.id === "garden") await page.screenshot({ path: "/tmp/sunny-farm-preview/garden-desktop.png", fullPage: true });
      if (task.id === "horse") {
        const horseArt = page.getByRole("img", { name: "Your farm horse", exact: true });
        await expect(horseArt).toHaveAttribute("data-pose", "5");
        await expect(horseArt).toHaveAttribute("data-pose", "0", { timeout: 3000 });
      }
      if (task.id === "horse") await page.screenshot({ path: "/tmp/sunny-farm-preview/horse-desktop.png", fullPage: true });
      if (task.id === "chickens") {
        await page.getByRole("button", { name: "Next: Apple orchard →", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Apple orchard", exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Farm map", exact: true }).click();
      } else await page.getByRole("button", { name: "Back to the farm →", exact: true }).click();
    }
    await expect(page.getByText("Breakfast basket ready!", { exact: true })).toBeVisible();
    await expect(page.getByLabel("3 eggs", { exact: true })).toBeVisible();
    await expect(page.getByLabel("1 milk", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Celebrate our happy farm! ★", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Everyone is happy!" })).toBeVisible();
    await page.screenshot({ path: "/tmp/sunny-farm-preview/celebration-desktop.png", fullPage: true });
    await expect(page.locator('[data-pose="5"]')).toHaveCount(4);
    await expect(page.locator('[data-pose="5"]')).toHaveCount(0, { timeout: 3000 });
    if (rewards !== 1) throw new Error(`Expected one completion, got ${rewards}`);
    await page.getByRole("button", { name: "Start another farm day →" }).click();
    await expect(page.getByLabel("0 of 8 farm stops complete")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/sunny-farm-preview/map-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Duck pond: Feed the ducks", exact: true }).click();
    const duck = page.getByRole("button", { name: "Feed duck 2", exact: true });
    await duck.scrollIntoViewIfNeeded();
    const touchBox = (await duck.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchBox.x + touchBox.width / 2, y: touchBox.y + touchBox.height / 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(duck).toHaveCount(0);
    await page.screenshot({ path: "/tmp/sunny-farm-preview/ducks-mobile.png", fullPage: true });
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflows) throw new Error("Mobile page overflows horizontally");
    if (activeTargets(farm, "ducks").length !== 2) throw new Error("Mobile action did not save");
    await page.getByRole("button", { name: "Farm map", exact: true }).click();
    await page.getByRole("button", { name: "Horse stable: Feed & brush", exact: true }).click();
    const food = page.getByRole("button", { name: "Carry fresh hay", exact: true });
    const horse = page.getByRole("button", { name: "Feed horse", exact: true });
    await page.setViewportSize({ width: 1280, height: 1100 });
    await food.scrollIntoViewIfNeeded();
    const foodBox = (await food.boundingBox())!, horseBox = (await horse.boundingBox())!;
    await page.mouse.move(foodBox.x + foodBox.width / 2, foodBox.y + foodBox.height / 2); await page.mouse.down();
    await page.mouse.move(horseBox.x + horseBox.width / 2, horseBox.y + horseBox.height / 2, { steps: 12 }); await page.mouse.up();
    await expect(horse).toHaveCount(0);
    if (!farm.done.horse.includes("feed")) throw new Error("Direct food-to-animal drag did not save");
    if (errors.length) throw new Error(errors.join("\n"));
    console.log("Farm browser checks passed: all eight activities, save/reload, error retry, conflicts, one celebration, new day, and mobile layout.");
  } finally { await browser.close(); }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
