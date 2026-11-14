import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
    const errors: string[] = [];
    const sessions: Record<string, unknown>[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const member = { id: "block-preview", name: "Alex", age: 8, avatar: "🧒", color: "#0891b2", totalPoints: 0 };
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      let response: object = { matches: [] };
      if (url.pathname === "/api/games") {
        if (route.request().method() === "POST") {
          sessions.push(route.request().postDataJSON());
          response = { reward: { type: "points", points: 8, tickets: 0 } };
        } else {
          response = { member, members: [member], games: GAME_DEFINITIONS,
            settings: GAME_DEFINITIONS.map((game) => ({ gameKey: game.key, ...DEFAULT_GAME_SETTINGS[game.key] })),
            availability: Object.fromEntries(GAME_DEFINITIONS.map((game) => [game.key, { available: true, playsToday: 0, openChores: 0, reason: null }])) };
        }
      }
      await route.fulfill({ json: response });
    });
    await page.goto(`${process.env.BLOCK_DROP_TEST_URL ?? "http://localhost:3017"}/kid/block-preview/games`);
    await page.getByRole("button", { name: /Block Drop/ }).click();
    await expect(page.getByRole("heading", { name: "Block Drop", exact: true })).toBeVisible();
    await page.clock.install();
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    const board = page.getByRole("group", { name: "Block Drop board", exact: true });
    await expect(board).toBeFocused();
    await board.press("ArrowUp");
    await board.press("ArrowLeft");
    await board.press("Space");
    await expect(page.getByRole("button", { name: "Finish & save" })).toBeEnabled();
    await board.press("p");
    await expect(page.getByRole("button", { name: "Resume", exact: true }).first()).toBeVisible();
    const paused = await board.innerHTML();
    await page.clock.runFor(5000);
    assert.equal(await board.innerHTML(), paused, "board must freeze while paused");
    await page.getByRole("button", { name: "Resume", exact: true }).first().click();
    await page.clock.runFor(1000);
    await page.screenshot({ path: "/tmp/block-drop-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Rotate block", exact: true }).click();
    await page.getByRole("button", { name: "Move right", exact: true }).click();
    await page.getByRole("button", { name: "Drop", exact: true }).click();
    await page.screenshot({ path: "/tmp/block-drop-mobile.png", fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "mobile layout must not overflow");
    await page.getByRole("button", { name: "Finish & save" }).click();
    await page.getByRole("button", { name: "Save game", exact: true }).click();
    await expect(page.getByText("You earned 8 points.", { exact: true })).toBeVisible();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].gameKey, "block-drop");
    assert.ok(Number(sessions[0].score) > 0);
    assert.ok(Number(sessions[0].durationSeconds) < 5, "pause must not count toward active play time");
    assert.equal((sessions[0].metadata as { pieces: number }).pieces, 2);
    await page.clock.pauseAt(await page.evaluate(() => Date.now()));
    for (const theme of ["Gems", "Fruits"]) {
      await page.getByRole("button", { name: /Block Drop/ }).click();
      await page.getByRole("button", { name: "Gem & Fruit Columns", exact: true }).click();
      await page.getByRole("button", { name: theme, exact: false }).last().click();
      await expect(page.getByRole("button", { name: theme, exact: false }).last()).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Start game", exact: true }).click();
      const cells = board.locator('div[aria-hidden="true"] > div');
      await expect(cells).toHaveCount(78);
      const symbols = () => cells.evaluateAll((nodes) => nodes.map((node) => node.querySelector("polygon")?.getAttribute("points") ?? node.textContent ?? "").filter(Boolean));
      const before = await symbols();
      assert.equal(before.length, 3);
      await board.press("ArrowUp");
      assert.deepEqual(await symbols(), [...before.slice(1), before[0]]);
      await page.getByRole("button", { name: "Cycle symbols", exact: true }).click();
      await page.getByRole("button", { name: "Move left", exact: true }).click();
      await page.getByRole("button", { name: "Drop", exact: true }).click();
      await page.clock.runFor(500);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const pausedColumns = await board.innerHTML();
      await page.clock.runFor(3000);
      assert.equal(await board.innerHTML(), pausedColumns);
      await page.getByRole("button", { name: "Resume", exact: true }).first().click();
      await page.screenshot({ path: `/tmp/columns-${theme.toLowerCase()}-mobile.png`, fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.getByRole("button", { name: "Finish & save" }).click();
      await page.getByRole("button", { name: "Save game", exact: true }).click();
      await expect(page.getByText("You earned 8 points.", { exact: true })).toBeVisible();
      const metadata = sessions.at(-1)!.metadata as { mode: string; theme: string; pieces: number; bestChain: number };
      assert.equal(metadata.mode, "columns");
      assert.equal(metadata.theme, theme.toLowerCase());
      assert.equal(metadata.pieces, 1);
      assert.equal(typeof metadata.bestChain, "number");
    }
    assert.equal(sessions.length, 3);
    assert.deepEqual(errors, []);
    console.log("Block Drop browser checks passed: classic blocks, gem and fruit columns, cycling, touch, pause, mobile layout, and session saving.");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
