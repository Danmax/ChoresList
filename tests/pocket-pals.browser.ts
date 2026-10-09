import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { advancePet, applyPetAction, completeDailyCare, createPet, currentLesson, petDay, publicChallenge, type PetState, type PetAction } from "../lib/pocket-pals";

// Browser coverage uses an isolated in-memory API fixture. It exercises real
// React rendering and controls without writing test families to the live DB.
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  const screenshotDir = process.env.POCKET_PALS_SCREENSHOT_DIR ?? "/tmp/pocket-pals-preview";
  await mkdir(screenshotDir, { recursive: true });
  let saved: PetState | null = null;
  let version = 0;
  let completions = 0;
  const member = { id: "pocket-preview", name: "Alex", age: 7, avatar: "🧒", color: "#a78bfa", totalPoints: 0 };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let response: object = { ok: true, matches: [] };
    let status = 200;
    if (url.pathname === "/api/games") {
      response = { member, members: [member], games: GAME_DEFINITIONS,
        settings: GAME_DEFINITIONS.map((game) => ({ gameKey: game.key, ...DEFAULT_GAME_SETTINGS[game.key] })),
        availability: Object.fromEntries(GAME_DEFINITIONS.map((g) => [g.key, { available: true, playsToday: 0, openChores: 0, reason: null }])), chessPlayers: [] };
    } else if (url.pathname === "/api/pocket-pals") {
      const now = await page.evaluate(() => Date.now());
      const day = petDay(now, "America/New_York");
      let message = "";
      let completed = false;
      try {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          if (body.action === "adopt") saved = createPet(body.species, body.name.trim(), now, day);
          else {
            if (!saved) throw new Error("Adopt first");
            if (body.version !== version) { status = 409; throw new Error("Stale version"); }
            saved = advancePet(saved, now, day);
            message = applyPetAction(saved, body.action as PetAction, body, now, 7, randomUUID());
            completed = completeDailyCare(saved);
            if (completed) completions++;
            version++;
          }
        }
        const pet = saved ? advancePet(saved, now, day) : null;
        response = { pet: pet && { ...pet, challenge: null }, version, challenge: pet ? publicChallenge(pet, 7) : null, serverNow: now, message, completed };
      } catch (e) { status = status === 409 ? 409 : 400; response = { error: e instanceof Error ? e.message : String(e) }; }
    }
    await route.fulfill({ status, json: response });
  });

  try {
    await page.goto(`${process.env.POCKET_PALS_TEST_URL ?? "http://localhost:3017"}/kid/pocket-preview/games`);
    await page.getByRole("button", { name: /Pocket Pals/ }).click();
    await expect(page.getByRole("heading", { name: "Meet your Pocket Pal." })).toBeVisible();
    for (const label of ["Dog", "Cat", "Monkey", "Guinea pig"]) {
      const card = page.getByRole("button", { name: `Adopt a ${label.toLowerCase()}`, exact: true });
      await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
    }
    await page.screenshot({ path: `${screenshotDir}/adoption-desktop.png`, fullPage: true });
    await page.getByLabel("Give your pal a name").fill("Pudding");
    await page.getByRole("button", { name: "Bring my pal home" }).click();
    await expect(page.getByRole("heading", { name: /Pudding/ })).toBeVisible();
    await page.getByRole("button", { name: /Feed Dumpling/ }).click();
    await expect(page.getByRole("status")).toContainText("Nom nom");
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Clean Fresh/ }).click();
    await expect(page.getByRole("status")).toContainText("Fresh and fluffy");
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Play Treat/ }).click();
    await page.getByRole("button", { name: /Treat memory Remember/ }).click();
    await expect(page.getByRole("heading", { name: "Treat memory" })).toBeVisible();
    await page.clock.fastForward(4500);
    const sequence = saved!.challenge!.sequence!;
    const symbols = ["🍓", "🌸", "🍡", "⭐"];
    for (const symbol of sequence) await page.getByRole("button", { name: `Choose ${symbols[symbol]}` }).click();
    await page.getByRole("button", { name: "Check pattern" }).click();
    await expect(page.getByRole("status")).toContainText("Perfect pattern");
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Learn Grow/ }).click();
    const lesson = currentLesson(saved!, 7);
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: lesson.choices[lesson.answer], exact: true }).click();
    await expect(page.getByRole("status")).toContainText(lesson.explanation);
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Sleep A cozy/ }).click();
    await expect(page.getByRole("status")).toContainText("cozy dreaming");
    await page.clock.fastForward(31_000);
    await expect(page.getByText("Today's care badge collected!")).toBeVisible();
    assert.equal(completions, 1);
    await page.getByRole("button", { name: "Open pet shop" }).click();
    const shop = page.getByRole("dialog");
    await expect(shop).toBeVisible();
    await shop.getByRole("button", { name: /Cherry bow/ }).click();
    await expect(shop.getByRole("button", { name: /Cherry bow/ })).toContainText("Equipped");
    await page.keyboard.press("Escape");
    await expect(shop).not.toBeVisible();
    await page.screenshot({ path: `${screenshotDir}/care-desktop.png`, fullPage: true });
    await page.reload();
    await page.getByRole("button", { name: /Pocket Pals/ }).click();
    await expect(page.getByRole("heading", { name: /Pudding/ })).toBeVisible();
    await expect(page.getByText("Today's care badge collected!")).toBeVisible();
    assert.equal((saved as PetState | null)?.accessory, "bow");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("button", { name: /Learn Grow/ })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `No horizontal overflow at ${width}px`);
      await page.screenshot({ path: `${screenshotDir}/care-${width}.png`, fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log(`Browser flow passed: four species, adoption, five care activities, rewards, shop, reload, and phone widths. Screenshots: ${screenshotDir}`);
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
