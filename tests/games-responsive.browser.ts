import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect, type Locator } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { createHayfield } from "../lib/sunny-farm-hayfield";
import { createFarm, FARM_TASKS } from "../lib/sunny-farm";
import { createPet, petDay } from "../lib/pocket-pals";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const member = { id: "responsive-preview", name: "Alex", age: 8, avatar: "🧒", color: "#a78bfa", totalPoints: 0 };
  let farmFixture = createFarm();
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    let json: object = { matches: [], posts: [], nextCursor: null };
    if (url.pathname === "/api/games") json = { member, members: [member], games: GAME_DEFINITIONS, settings: GAME_DEFINITIONS.map(game => ({ gameKey: game.key, ...DEFAULT_GAME_SETTINGS[game.key] })), availability: Object.fromEntries(GAME_DEFINITIONS.map(game => [game.key, { available: true, playsToday: 0, openChores: 0 }])), chessPlayers: [] };
    if (url.pathname === "/api/sunny-farm") json = { farm: farmFixture, version: 0 };
    if (url.pathname === "/api/pocket-pals") json = { pet: createPet("dog", "Mochi", Date.now(), petDay(Date.now(), "America/New_York")), version: 0, serverNow: Date.now(), challenge: null, roster: [] };
    await route.fulfill({ json });
  });
  // Exercise the fallback used by tablets that do not support the Fullscreen API.
  await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error("Unsupported")); });
  const open = async (title: string) => {
    await page.goto(`${process.env.GAMES_TEST_URL ?? "http://localhost:3017"}/kid/responsive-preview/games`);
    await page.getByRole("button", { name: title === "Johnny's Jungle Journey" ? /Begin the journey/ : title, exact: false }).first().click();
  };
  async function inScreen(locator: Locator, label: string) {
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    const size = page.viewportSize()!;
    assert.ok(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${label} must fit ${size.width}×${size.height}: ${JSON.stringify(box)}`);
  }
  await mkdir("/tmp/games-responsive", { recursive: true });
  try {
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 320, height: 568 }].filter(size => !process.env.GAMES_TEST_WIDTH || size.width === Number(process.env.GAMES_TEST_WIDTH))) {
      await page.setViewportSize(size);
      for (const game of GAME_DEFINITIONS) {
        farmFixture = createFarm();
        await open(game.title);
        if (game.key === "jungle-vine-swing") {
          await page.getByRole("button", { name: "Start Johnny's Journey →", exact: true }).click();
          await expect(page.locator('[data-game-screen="false"]')).toBeVisible();
        } else if (game.key === "coloring-adventures") {
          await expect(page.getByRole("region", { name: "Coloring Adventures", exact: true })).toHaveAttribute("data-fullscreen", "true");
          await inScreen(page.getByRole("button", { name: "Exit full screen", exact: true }), "Coloring fullscreen exit");
        } else {
          const player = page.locator("[data-game-player]");
          await expect(player).toHaveAttribute("data-game-expanded", "true");
          await inScreen(player.getByRole("button", { name: "Exit full screen", exact: true }), "Fullscreen exit");
          assert.equal(await player.evaluate(el => el.scrollWidth > el.clientWidth), false, `${game.title} horizontal overflow`);
          assert.equal(await player.evaluate(el => { const content = el.lastElementChild!; return content.scrollWidth > content.clientWidth + 1; }), false, `${game.title} content horizontal overflow`);
          if (game.key === "sunny-farm") {
            for (const task of FARM_TASKS) {
              await page.getByRole("button", { name: `${task.title}: ${task.verb}`, exact: true }).click();
              const scene = page.getByLabel(`${task.title} activity`, { exact: true });
              await inScreen(scene, `${task.title} scene`);
              assert.ok((await scene.boundingBox())!.height >= 110, `${task.title} needs usable scene height at ${size.width}×${size.height}: ${JSON.stringify(await scene.boundingBox())}`);
              await inScreen(page.locator("[data-tool-tray]"), "Farm tool tray");
              await inScreen(page.getByRole("button", { name: "Farm map", exact: true }), "Farm navigation");
              assert.equal(await player.evaluate(el => { const content = el.lastElementChild!; return content.scrollHeight > content.clientHeight + 1; }), false, "Farm must fit without scrolling");
              await page.getByRole("button", { name: "Farm map", exact: true }).click();
            }
            await page.screenshot({ path: `/tmp/games-responsive/farm-${size.width}x${size.height}.png` });
            farmFixture.done.hay = [...FARM_TASKS[0].stages.flat()];
            farmFixture.hayfield = createHayfield(["bale-0", "bale-1", "bale-2"]);
            await open(game.title);
            await page.getByRole("button", { name: "Hayfield: all done", exact: true }).click();
            await inScreen(page.getByRole("button", { name: "Back to the farm →", exact: true }), "Completed scene return");
            await inScreen(page.getByRole("button", { name: /^Next:/ }), "Next scene");
          }
          if (game.key === "block-drop") {
            await page.getByRole("button", { name: "Start game", exact: true }).click();
            await inScreen(page.getByRole("group", { name: "Block Drop board", exact: true }), "Block board");
            for (const label of ["Move left", "Rotate block", "Move right", "Move down"]) await inScreen(page.getByRole("button", { name: label, exact: true }), label);
            await inScreen(page.getByRole("button", { name: "Pause", exact: true }), "Pause");
          }
          if (game.key === "memory-match") {
            const cards = page.locator("[data-memory-board] button");
            await inScreen(cards.last(), "Last memory card");
            await cards.first().tap();
            const symbol = await cards.first().textContent();
            await page.getByRole("button", { name: "Exit full screen", exact: true }).click();
            await page.getByRole("button", { name: "Enter full screen", exact: true }).click();
            await expect(cards.first()).toHaveText(symbol!);
            await expect(player).toHaveAttribute("data-game-expanded", "true");
            await page.getByRole("button", { name: "Exit", exact: true }).click();
            assert.equal(await page.evaluate(() => document.body.style.overflow), "", "Exiting the game restores page scrolling");
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${game.title} page horizontal overflow at ${size.width}`);
      }
      console.log(`All 13 games fit at ${size.width}×${size.height}`);
    }
    await page.goto(`${process.env.GAMES_TEST_URL ?? "http://localhost:3017"}/kid/responsive-preview/games`);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "", "Leaving a game restores page scrolling");
    assert.deepEqual(errors, []);
  } catch (error) {
    await page.screenshot({ path: "/tmp/games-responsive/failure.png" });
    throw error;
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
