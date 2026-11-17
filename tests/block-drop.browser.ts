import assert from "node:assert/strict";
import { chromium, expect, type Page } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";

async function checkClearEffects(page: Page, tetris: boolean) {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.getByRole("button", { name: /Block Drop/ }).click();
  // These two seven-piece bags build a four-row stack with a well on the right.
  const randomValues = [["I", "O", "J", "L", "S", "T", "Z"], ["T", "J", "I", "O", "S", "Z", "L"]].flatMap((target) => {
    const bag = ["I", "O", "T", "S", "Z", "J", "L"];
    const values: number[] = [];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = bag.indexOf(target[i]);
      values.push((j + 0.5) / (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return values;
  });
  await page.getByRole("button", { name: "Start game", exact: true }).evaluate((button, values) => {
    const original = Math.random;
    Math.random = () => {
      const value = values.shift();
      if (!values.length) Math.random = original;
      return value ?? original();
    };
    (button as HTMLButtonElement).click();
  }, randomValues);
  const board = page.getByRole("group", { name: "Block Drop board", exact: true });
  const moves = tetris ? [
    ["ArrowLeft", "ArrowLeft", "ArrowLeft"],
    ["ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft"],
    ["ArrowUp", "ArrowUp", "ArrowUp", "ArrowLeft"],
    ["ArrowRight", "ArrowRight", "ArrowRight"],
    ["ArrowRight"], ["ArrowUp"],
    ["ArrowUp", "ArrowRight", "ArrowRight", "ArrowRight"],
    ["ArrowUp", "ArrowUp", "ArrowRight", "ArrowRight"],
    ["ArrowUp", "ArrowUp", "ArrowLeft", "ArrowLeft", "ArrowLeft"],
    ["ArrowUp", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"],
  ] : [
    ["ArrowLeft", "ArrowLeft", "ArrowLeft"],
    ["ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft"],
    ["ArrowRight"],
    ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"],
  ];
  for (const keys of moves) {
    for (const key of keys) await board.press(key);
    await board.press("Space");
  }
  await expect(board).toHaveAttribute("data-clear", tetris ? "tetris" : "line");
  await expect(board.locator('[data-clearing="true"]')).toHaveCount(tetris ? 40 : 10);
  await expect(page.getByRole("button", { name: "Drop", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Finish & save" })).toBeDisabled();
  const flashing = await board.innerHTML();
  await board.press("ArrowLeft");
  await board.press("Space");
  assert.equal(await board.innerHTML(), flashing, "keyboard input must wait for the clear effect");
  await page.clock.runFor(tetris ? 400 : 200);
  await board.press("p");
  const paused = await board.innerHTML();
  await page.clock.runFor(3000);
  assert.equal(await board.innerHTML(), paused, "pause must preserve an in-progress clear");
  await page.getByRole("button", { name: "Resume", exact: true }).first().click();
  if (tetris) {
    await expect(board.getByText("TETRIS!", { exact: true })).toHaveCount(1);
    await expect(board.getByText("4 lines · +800", { exact: true })).toHaveCount(1);
    await board.evaluate((node) => node.getAnimations({ subtree: true }).forEach((animation) => { animation.pause(); animation.currentTime = 300; }));
    await page.screenshot({ path: "/tmp/block-drop-tetris-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/block-drop-tetris-mobile.png", fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await board.locator('[data-clearing="true"]').first().evaluate((node) => getComputedStyle(node, "::after").animationName), "none");
    await expect(board.getByText("TETRIS!", { exact: true })).toBeVisible();
  } else {
    assert.notEqual(await board.locator('[data-clearing="true"]').first().evaluate((node) => getComputedStyle(node, "::after").animationName), "none");
  }
  await page.clock.runFor(tetris ? 899 : 419);
  await expect(board.locator('[data-clearing="true"]')).toHaveCount(tetris ? 40 : 10);
  await page.clock.runFor(1);
  await expect(board).not.toHaveAttribute("data-clear");
  await expect(board.locator('[data-clearing="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Drop", exact: true })).toBeEnabled();
  await expect(board.getByText("TETRIS!", { exact: true })).toHaveCount(0);
  const cells = board.locator('div[aria-hidden="true"] > div');
  if (tetris) assert.equal(await cells.evaluateAll((nodes) => nodes.slice(20).filter((node) => (node as HTMLElement).style.backgroundColor !== "rgb(21, 34, 57)").length), 0, "all four completed rows must disappear");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Exit", exact: true }).click();
}

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
    await checkClearEffects(page, false);
    await checkClearEffects(page, true);
    assert.deepEqual(errors, []);
    console.log("Block Drop browser checks passed: classic blocks, line flashes, Tetris effects, reduced motion, columns, touch, pause, mobile layout, and session saving.");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
