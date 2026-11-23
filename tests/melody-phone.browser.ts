import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";

declare global {
  interface Window { melodySpoken: string[]; melodyCanceled: number }
}

const baseUrl = process.env.MELODY_TEST_URL ?? "http://127.0.0.1:3017";
const screenshots = "/tmp/melody-preview";

async function main() {
  await mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // Speech engines vary by OS. Verify requests to the speech API deterministically.
    await page.addInitScript(() => {
      window.melodySpoken = [];
      window.melodyCanceled = 0;
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        cancel() { window.melodyCanceled++; },
        getVoices() { return []; },
        speak(utterance: SpeechSynthesisUtterance) { window.melodySpoken.push(utterance.text); },
      } });
    });
    const game = page.getByRole("region", { name: "Melody's Play Phone", exact: true });
    const number = (value: number) => page.getByRole("button", { name: `Number ${value}`, exact: true });
    const status = () => game.getByRole("status");
    const objects = () => page.getByRole("button", { name: /^Count (star|apple|balloon) \d$/ });
    const response = await page.goto(`${baseUrl}/play/melody`);
    assert.equal(response?.status(), 200);
    await expect(game).toHaveAttribute("data-melody-phase", "welcome");
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => window.melodySpoken.length), 0, "no speech before interaction");
    await page.screenshot({ path: `${screenshots}/welcome-desktop.png`, fullPage: true });

    await page.getByRole("button", { name: "Let’s play", exact: true }).click();
    await expect(game).toHaveAttribute("data-melody-phase", "playing");
    await number(3).click();
    await expect(page.getByRole("group", { name: "3 stars", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.melodySpoken.at(-1))).toMatch(/^three!/);
    const previousSpeechCount = await page.evaluate(() => window.melodySpoken.length);
    await number(3).click();
    await expect.poll(() => page.evaluate(() => window.melodySpoken.length)).toBe(previousSpeechCount + 1);
    await number(0).click();
    await expect(status()).toContainText("Zero means none");
    await page.keyboard.press("9");
    await expect(page.getByRole("group", { name: "9 stars", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Mute sound", exact: true }).click();
    const mutedSpeechCount = await page.evaluate(() => window.melodySpoken.length);
    await number(4).click();
    await expect(status()).toContainText("four!");
    assert.equal(await page.evaluate(() => window.melodySpoken.length), mutedSpeechCount);
    await expect(page.getByRole("button", { name: "Hear Melody again", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Turn sound on", exact: true }).click();
    await page.getByRole("button", { name: "Hear Melody again", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.melodySpoken.at(-1))).toMatch(/^four!/);

    await page.getByRole("button", { name: /^Find a number/ }).click();
    await number(8).click();
    await expect(status()).toContainText("Let's look for two");
    await number(2).click();
    await expect(game).toHaveAttribute("data-melody-phase", "celebrating");
    await expect(number(2)).toBeDisabled();
    await page.screenshot({ path: `${screenshots}/celebration-desktop.png`, fullPage: true });
    await page.getByRole("button", { name: "Another number", exact: true }).click();
    await expect(page.getByLabel("Find number 3", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Let's count/ }).click();
    assert.equal(await objects().count(), 3);
    await objects().nth(2).click();
    await expect(status()).toHaveText("one!");
    await objects().nth(0).click();
    await expect(status()).toHaveText("two!");
    await objects().nth(1).click();
    await expect(status()).toContainText("three! Now tap");
    await number(3).click();
    await expect(game).toHaveAttribute("data-melody-phase", "celebrating");
    await page.getByRole("button", { name: "Another number", exact: true }).click();

    await page.getByRole("button", { name: "Call Melody", exact: true }).click();
    await expect(page.getByText("ON A PRETEND CALL", { exact: true })).toBeVisible();
    await number(await objects().count()).click();
    await page.getByRole("button", { name: "Say goodbye", exact: true }).click();
    await expect(status()).toContainText("Goodbye for now");
    await expect(game).toHaveAttribute("data-melody-mode", "count");

    await page.getByRole("button", { name: /^Just play/ }).click();
    await page.getByRole("button", { name: /A little ring, a little adventure/ }).click();
    await expect(game).toHaveAttribute("data-melody-phase", "ringing");
    await expect(number(3)).toBeDisabled();
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    await expect(game).toHaveAttribute("data-melody-phase", "playing");
    await page.getByRole("button", { name: /A little ring, a little adventure/ }).click();
    await page.getByRole("button", { name: "Answer Melody", exact: true }).first().click();
    await expect(page.getByText("ON A PRETEND CALL", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hang up", exact: true }).click();
    await expect(game).toHaveAttribute("data-melody-mode", "explore");

    await page.getByRole("button", { name: "All done", exact: true }).click();
    await expect(game).toHaveAttribute("data-melody-phase", "sleeping");
    await expect(number(1)).toBeDisabled();
    await page.getByRole("button", { name: "Play again", exact: true }).click();
    await expect(game).toHaveAttribute("data-melody-phase", "playing");

    for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: /^Let's count/ }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `fits ${size.width}×${size.height}`);
      const box = (await number(0).boundingBox())!;
      assert.ok(box.width >= 44 && box.height >= 44, `touch targets: ${JSON.stringify(box)}`);
      await number(0).click();
      await page.screenshot({ path: `${screenshots}/count-${size.width}.png`, fullPage: true });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install();
    await page.getByRole("button", { name: /^Just play/ }).click();
    await page.clock.fastForward(45_001);
    await expect(game).toHaveAttribute("data-melody-phase", "ringing");
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    await page.getByRole("button", { name: /^Find a number/ }).click();
    await page.clock.fastForward(90_000);
    await expect(game).toHaveAttribute("data-melody-phase", "playing");
    await expect(game).toHaveAttribute("data-melody-mode", "find");

    // Exercise the existing games launcher and session API without a database.
    const sessions: Record<string, unknown>[] = [];
    let failSave = true;
    const member = { id: "melody-preview", name: "Alex", age: 4, avatar: "🧒", color: "#a78bfa", totalPoints: 0 };
    await page.route("**/api/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/games" && request.method() === "POST") {
        if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { error: "Save unavailable" } }); }
        sessions.push(request.postDataJSON());
        return route.fulfill({ status: 201, json: { reward: { type: "none", points: 0, tickets: 0 } } });
      }
      return route.fulfill({ json: url.pathname === "/api/games" ? {
        member, members: [member], games: GAME_DEFINITIONS, chessPlayers: [],
        settings: GAME_DEFINITIONS.map(game => ({ gameKey: game.key, ...DEFAULT_GAME_SETTINGS[game.key] })),
        availability: Object.fromEntries(GAME_DEFINITIONS.map(game => [game.key, { available: true }])),
      } : { matches: [], posts: [] } });
    });
    await page.goto(`${baseUrl}/kid/${member.id}/games`);
    await page.getByRole("button", { name: /Melody’s Play Phone/ }).click();
    await expect(game).toBeVisible();
    await number(2).click();
    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await expect(game.getByRole("alert")).toContainText("couldn't save");
    await expect(game).toBeVisible();
    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await expect(game).toHaveCount(0);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].gameKey, "melody-phone");
    assert.deepEqual((sessions[0].metadata as Record<string, unknown>).numbersDiscovered, [2]);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "", "launcher exit restores scrolling");
    assert.ok(await page.evaluate(() => window.melodyCanceled > 0), "speech is canceled on exit");
    assert.deepEqual(errors, []);
    console.log(`Melody browser checks passed: dialing, speech/mute/replay, both activities, calls, rest, 4 responsive sizes, launcher and save retry. Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
