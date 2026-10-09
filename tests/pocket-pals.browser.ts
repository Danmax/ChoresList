import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { advancePet, applyPetAction, completeDailyCare, createPet, currentLesson, petDay, publicChallenge, type PetState, type PetAction } from "../lib/pocket-pals";
import { TREASURE_OBJECTS } from "../lib/pocket-pals-treasure";

// Browser coverage uses an isolated in-memory API fixture. It exercises real
// React rendering and controls without writing test families to the live DB.
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.clock.pauseAt(new Date());
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
    await expect(page.getByRole("img", { name: "Pudding eating", exact: true })).toBeVisible();
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Clean Fresh/ }).click();
    await expect(page.getByRole("status")).toContainText("Fresh and fluffy");
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Play Choose/ }).click();
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
    await expect(page.getByRole("img", { name: "Pudding sleeping", exact: true })).toBeVisible();
    await page.clock.fastForward(31_000);
    await expect(page.getByText("Today's care badge collected!")).toBeVisible();
    assert.equal(completions, 1);
    await page.getByRole("button", { name: "Open pet shop" }).click();
    const shop = page.getByRole("dialog");
    await expect(shop).toBeVisible();
    await shop.getByRole("button", { name: /Cherry bow/ }).click();
    await expect(shop.getByRole("button", { name: /Cherry bow/ })).toContainText("Wearing");
    await page.keyboard.press("Escape");
    await expect(shop).not.toBeVisible();
    await page.screenshot({ path: `${screenshotDir}/care-desktop.png`, fullPage: true });
    await page.reload();
    await page.getByRole("button", { name: /Pocket Pals/ }).click();
    await expect(page.getByRole("heading", { name: /Pudding/ })).toBeVisible();
    await expect(page.getByText("Today's care badge collected!")).toBeVisible();
    assert.equal((saved as PetState | null)?.accessory, "bow");
    await page.getByRole("button", { name: /Play Choose/ }).click();
    await page.getByRole("button", { name: /Bubble Catch Catch/ }).click();
    await expect(page.getByLabel("Catch bubble 1")).toBeVisible();
    await expect(page.getByRole("img", { name: "Pudding playing", exact: true })).toBeVisible();
    await page.screenshot({ path: `${screenshotDir}/bubble-room.png`, fullPage: true });
    await page.clock.fastForward(4500);
    for (let index = 1; index <= saved!.challenge!.bubbleIds!.length; index++) {
      const bubble = page.getByLabel(`Catch bubble ${index}`);
      // Bubbles are moving targets; click their current location without waiting
      // for the floating animation to become stationary.
      await bubble.click({ force: true });
      await page.clock.fastForward(300);
      await expect(bubble).toHaveCount(0);
    }
    const roomBox = await page.getByLabel("Pocket Pal room").boundingBox();
    const finishBox = await page.getByRole("button", { name: "Finish catch!" }).boundingBox();
    assert.ok(roomBox && finishBox && finishBox.y >= roomBox.y + roomBox.height, "Finish control is below the room");
    await page.getByRole("button", { name: "Finish catch!" }).click();
    await expect(page.getByRole("status")).toContainText("Bubble bonanza");
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Play Choose/ }).click();
    await expect(page.getByRole("button", { name: /Hide-and-Seek/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Rhythm Paws Listen/ }).click();
    await page.clock.fastForward(2500);
    await page.getByLabel("Quiet play").check();
    await page.getByRole("button", { name: "Listen to the beat" }).click();
    const offsets = saved!.challenge!.rhythmOffsets!;
    await page.clock.fastForward(offsets.at(-1)! + 1500);
    for (let index = 0; index < offsets.length; index++) {
      if (index) await page.clock.runFor(offsets[index] - offsets[index - 1]);
      await page.getByRole("button", { name: "Tap rhythm" }).click({ force: true });
    }
    await page.getByRole("button", { name: "Check rhythm" }).click();
    await expect(page.getByRole("status")).toContainText("Pawsome rhythm");
    await page.clock.fastForward(2500);
    await page.getByRole("button", { name: /Play Choose/ }).click();
    await page.getByRole("button", { name: /Treasure Trail Follow/ }).click();
    await expect(page.getByRole("heading", { name: "Treasure Trail", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Show hint", exact: true }).click();
    await expect(page.getByRole("button", { name: "Hide hint", exact: true })).toHaveAttribute("aria-expanded", "true");
    await page.clock.fastForward(2500);
    const wrongObject = TREASURE_OBJECTS.find((item) => saved!.challenge!.treasure!.objectIds.includes(item.id) && item.id !== saved!.challenge!.treasure!.targets[0])!;
    await page.getByRole("button", { name: `Explore ${wrongObject.name}`, exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Keep exploring!");
    assert.equal(saved!.challenge!.treasure!.step, 0);
    await page.clock.fastForward(2500);
    const firstObject = TREASURE_OBJECTS.find((item) => item.id === saved!.challenge!.treasure!.targets[0])!;
    const palBefore = await page.getByRole("button", { name: "Cuddle Pudding" }).boundingBox();
    await page.getByRole("button", { name: `Explore ${firstObject.name}`, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("A key!");
    await page.clock.runFor(600);
    const palAfter = await page.getByRole("button", { name: "Cuddle Pudding" }).boundingBox();
    assert.ok(palBefore && palAfter && (palBefore.x !== palAfter.x || palBefore.y !== palAfter.y), "The Pal moves to the discovery");
    await page.reload();
    await page.getByRole("button", { name: /Pocket Pals/ }).click();
    await expect(page.getByLabel("1 of 3 keys found")).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `${screenshotDir}/treasure-${width}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `Treasure Trail fits ${width}px`);
      const room = await page.getByLabel("Pocket Pal room").boundingBox();
      const panel = await page.getByRole("region", { name: "Treasure Trail clues" }).boundingBox();
      assert.ok(room && panel && panel.y >= room.y + room.height, "Clues stay below the room");
    }
    for (let step = 1; step < 3; step++) {
      await page.clock.fastForward(2500);
      const object = TREASURE_OBJECTS.find((item) => item.id === saved!.challenge!.treasure!.targets[step])!;
      await page.getByRole("button", { name: `Explore ${object.name}`, exact: true }).click();
      await expect(page.getByLabel(`${step + 1} of 3 keys found`)).toBeVisible();
    }
    await page.clock.fastForward(2500);
    const coinsBeforeChest = saved!.coins;
    await page.getByRole("button", { name: "Open treasure chest", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Treasure found!");
    await expect(page.getByRole("button", { name: "Treasure chest opened", exact: true })).toBeVisible();
    assert.equal(saved!.coins, coinsBeforeChest, "Treasure Trail respects the shared daily three-win coin cap");
    await page.screenshot({ path: `${screenshotDir}/treasure-open.png`, fullPage: true });

    // All five rooms work with free starter props and with every purchased item.
    for (const owned of [[], ["flower-wall", "potted-palm", "cozy-sofa", "reading-lamp", "tea-table", "wall-shelves"]]) {
      for (const room of ["home", "garden", "library", "stargazer", "sunroom"]) {
        saved!.room = room;
        saved!.owned = owned;
        saved!.lastActionAt = 0;
        await page.reload();
        await page.getByRole("button", { name: /Pocket Pals/ }).click();
        await page.getByRole("button", { name: /Play Choose/ }).click();
        await page.getByRole("button", { name: /Treasure Trail Follow/ }).click();
        await page.clock.fastForward(2500);
        const objectButtons = page.getByRole("button", { name: /^Explore / });
        await expect(objectButtons).toHaveCount(owned.length + 3);
        const boxes = await objectButtons.evaluateAll((buttons) => buttons.map((button) => {
          const { x, y, width, height } = button.getBoundingClientRect();
          return { x, y, width, height };
        }));
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `Room object targets do not overlap in ${room}`);
        }
        for (let step = 0; step < 3; step++) {
          const object = TREASURE_OBJECTS.find((item) => item.id === saved!.challenge!.treasure!.targets[step])!;
          await page.getByRole("button", { name: `Explore ${object.name}`, exact: true }).click();
          await expect(page.getByLabel(`${step + 1} of 3 keys found`)).toBeVisible();
          await page.clock.fastForward(2500);
        }
        await page.getByRole("button", { name: "Open treasure chest", exact: true }).click();
        await expect(page.getByRole("status")).toContainText("Treasure found!");
      }
    }
    for (const asset of ["props", "chest", "key"]) {
      const response = await page.request.get(`${process.env.POCKET_PALS_TEST_URL ?? "http://localhost:3017"}/games/pocket-pals/treasure-${asset}-v1.png`);
      assert.equal(response.status(), 200, `${asset} artwork is served`);
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("button", { name: /Learn Grow/ })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `No horizontal overflow at ${width}px`);
      await page.screenshot({ path: `${screenshotDir}/care-${width}.png`, fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log(`Browser flow passed: adoption, care, Bubble Catch, Rhythm Paws, Treasure Trail in all five rooms with/without décor, reload, keyboard, rewards and phone widths. Screenshots: ${screenshotDir}`);
  } finally { await browser.close(); }
}
// Keep pending browser operations alive and fail explicitly on a hung flow.
const watchdog = setTimeout(() => { console.error("Pocket Pals browser flow timed out"); process.exit(1); }, 180_000);
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
