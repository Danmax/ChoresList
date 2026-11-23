import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";
import { narrationId } from "../lib/melody-sound";
import { telephoneAnswer, telephoneSequence } from "../lib/melody-telephone";

declare global {
  interface Window { melodySpoken: string[]; melodyCanceled: number; melodyMedia: string[]; melodyPlayers: HTMLMediaElement[] }
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
      if (!localStorage.getItem("melody-sound:v1")) localStorage.setItem("melody-sound:v1", JSON.stringify({ voice: "device" }));
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
    const objects = () => page.getByRole("button", { name: /^Count .+ \d+$/ });
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
    await expect(page.getByRole("group", { name: /^9 / })).toBeVisible();

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
    await expect(status()).toContainText("say goodbye");
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

    const extra = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
    extra.on("pageerror", error => errors.push(error.message));
    await extra.addInitScript(() => {
      window.melodyMedia = []; window.melodyPlayers = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.melodyMedia.push(this.currentSrc || this.src);
        window.melodyPlayers.push(this);
        return play.call(this);
      };
    });
    await extra.goto(`${baseUrl}/play/melody`);
    const extraGame = extra.getByRole("region", { name: "Melody's Play Phone", exact: true });
    const extraNumber = (value: number) => extra.getByRole("button", { name: `Number ${value}`, exact: true });
    await extra.getByRole("button", { name: "Voice and sound settings", exact: true }).click();
    const soundDialog = extra.getByRole("dialog", { name: "Voices & happy sounds", exact: true });
    await expect(soundDialog).toBeVisible();
    await expect(soundDialog.getByRole("combobox", { name: "Story voice", exact: true })).toHaveValue("warm");
    await soundDialog.getByRole("button", { name: "Try this voice", exact: true }).click();
    await expect.poll(() => extra.evaluate(() => window.melodyMedia.some(src => src.includes("/voices/warm/")))).toBe(true);
    await soundDialog.getByRole("combobox", { name: "Story voice", exact: true }).selectOption("story");
    await soundDialog.getByRole("button", { name: "Try this voice", exact: true }).click();
    await expect.poll(() => extra.evaluate(() => window.melodyMedia.some(src => src.includes("/voices/story/")))).toBe(true);
    await soundDialog.getByRole("combobox", { name: "Ringtone", exact: true }).selectOption("bouncy");
    await soundDialog.getByRole("button", { name: "Hear the ring", exact: true }).click();
    await expect.poll(() => extra.evaluate(() => window.melodyMedia.some(src => src.includes("/ring-bouncy.wav")))).toBe(true);
    await extra.screenshot({ path: `${screenshots}/voice-settings-mobile.png`, fullPage: true });
    await soundDialog.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(await extra.evaluate(() => window.melodyPlayers.every(player => player.paused || player.ended)), true, "closing settings cancels audio previews");

    await extra.getByRole("button", { name: /^My family/ }).click();
    await extra.getByRole("button", { name: /^Choose Grandma,/ }).click();
    await expect(extra.getByRole("button", { name: "Choose someone else", exact: true })).toBeVisible();
    for (const value of [3, 1, 2]) await extraNumber(value).tap();
    await extra.getByRole("button", { name: "Call pretend family", exact: true }).first().click();
    await expect(extraGame).toHaveAttribute("data-melody-phase", "dialing");
    await expect(extra.getByRole("button", { name: /Star cookies/ })).toBeVisible();
    await expect.poll(() => extra.evaluate(() => window.melodyMedia.some(src => src.includes("/outgoing.wav")))).toBe(true);
    await extra.getByRole("button", { name: /Star cookies/ }).click();
    await extra.getByRole("button", { name: /Magic sprinkles/ }).click();
    await expect(extraGame).toHaveAttribute("data-melody-phase", "celebrating");
    await extra.screenshot({ path: `${screenshots}/family-adventure-mobile.png`, fullPage: true });
    await extra.getByRole("button", { name: "Say goodbye", exact: true }).click();
    await extra.getByRole("button", { name: /Have Grandma call me/ }).click();
    await expect(extraGame).toHaveAttribute("data-melody-phase", "ringing");
    await extra.getByRole("button", { name: "Answer family call", exact: true }).first().click();
    await expect(extra.getByRole("button", { name: /Heart cookies/ })).toBeVisible();
    await extra.getByRole("button", { name: "Hang up", exact: true }).click();
    await extra.getByRole("button", { name: "Make your pretend family", exact: true }).click();
    await extra.getByLabel("Name for grandma", { exact: true }).fill("Nana");
    await extra.getByLabel("New pretend person's name", { exact: true }).fill("Teddy 123");
    await extra.getByRole("button", { name: "Add", exact: true }).click();
    await expect(extra.getByRole("button", { name: /^Choose Teddy 123,/ })).toBeVisible();
    await extra.reload();
    await extra.getByRole("button", { name: /^My family/ }).click();
    await expect(extra.getByRole("button", { name: /^Choose Nana,/ })).toBeVisible();
    await expect(extra.getByRole("button", { name: /^Choose Teddy 123,/ })).toBeVisible();
    await extra.getByRole("button", { name: "Voice and sound settings", exact: true }).click();
    await expect(soundDialog.getByRole("combobox", { name: "Story voice", exact: true })).toHaveValue("story");
    await expect(soundDialog.getByRole("combobox", { name: "Ringtone", exact: true })).toHaveValue("bouncy");
    await soundDialog.getByRole("button", { name: "Done", exact: true }).click();

    await extra.clock.install();
    await extra.getByRole("button", { name: /^Phone game/ }).click();
    const currentSeed = await extra.evaluate(() => JSON.parse(localStorage.getItem("melody-play:v2:guest")!).sessionSeed - 1);
    const mission = telephoneSequence(0, "gentle", currentSeed);
    await extra.getByRole("button", { name: "Hear the secret number", exact: true }).click();
    await expect(extraGame).toHaveAttribute("data-melody-phase", "listening");
    await expect(extraNumber(2)).toBeDisabled();
    await extra.clock.fastForward(10000);
    await expect(extraGame).toHaveAttribute("data-melody-phase", "playing", { timeout: 30_000 });
    await extraNumber(8).tap();
    await expect(extraGame.getByRole("status")).toContainText("try again");
    await extra.getByRole("button", { name: "Hear the number again", exact: true }).click();
    await extra.clock.fastForward(10000);
    await expect(extraGame).toHaveAttribute("data-melody-phase", "playing", { timeout: 30_000 });
    for (const digit of mission) await extraNumber(digit).tap();
    await expect(extraGame).toHaveAttribute("data-melody-phase", "celebrating");
    await extra.screenshot({ path: `${screenshots}/telephone-mobile.png`, fullPage: true });
    await extra.getByRole("button", { name: "Another number", exact: true }).click();
    for (const label of ["Bubble pop", "Silly boing", "Magic sparkle"]) await extra.getByRole("button", { name: label, exact: true }).tap();
    assert.ok(await extra.evaluate(() => window.melodyMedia.some(src => src.includes("/boing.wav"))));
    await extra.getByRole("button", { name: "Mute sound", exact: true }).click();
    const playsBeforeMute = await extra.evaluate(() => window.melodyMedia.length);
    await extra.getByRole("button", { name: "Hear the secret number", exact: true }).click();
    await extra.clock.fastForward(10000);
    assert.equal(await extra.evaluate(() => window.melodyMedia.length), playsBeforeMute, "muted telephone still works visually without playing audio");
    await expect(extraGame).toHaveAttribute("data-melody-phase", "playing");

    // Explore the new topic library, including SVG shapes and actual color drops.
    await extra.getByRole("button", { name: /^Just play/ }).click();
    for (const [topic, word] of [["hearts", "heart"], ["fruit", "apple|banana|strawberry|orange"], ["shapes", "circle|square|triangle|diamond"], ["colors", "paint drop"], ["pets", "pupp|kitten|bunn|fish"]]) {
      await extra.getByRole("combobox", { name: "Discovery collection", exact: true }).selectOption(topic);
      await extraNumber(3).tap();
      await expect(extraGame.getByRole("group", { name: new RegExp(`^3 .*(${word})`) })).toBeVisible();
      if (topic === "shapes" || topic === "colors") assert.equal(await extraGame.getByRole("group", { name: /^3 / }).locator("svg").count(), 3);
    }
    await extra.screenshot({ path: `${screenshots}/discovery-pets-mobile.png`, fullPage: true });
    const savedObject = await extra.evaluate(() => JSON.parse(localStorage.getItem("melody-play:v2:guest")!).lastObjectId);
    await extra.reload();
    await extra.getByRole("button", { name: /^Just play/ }).click();
    await expect(extra.getByRole("combobox", { name: "Discovery collection", exact: true })).toHaveValue("pets");
    await extraNumber(3).tap();
    assert.notEqual(await extra.evaluate(() => JSON.parse(localStorage.getItem("melody-play:v2:guest")!).lastObjectId), savedObject, "reopening continues the discovery rotation");

    await extra.getByRole("button", { name: /^Phone game/ }).click();
    await extra.getByRole("combobox", { name: "Telephone difficulty", exact: true }).selectOption("expert");
    await expect(extra.getByRole("group", { name: "5 secret numbers", exact: true })).toBeVisible();
    await expect(extra.getByText("Backwards mission · start with the last digit", { exact: true })).toBeVisible();
    const expertSeed = await extra.evaluate(() => JSON.parse(localStorage.getItem("melody-play:v2:guest")!).sessionSeed - 1);
    await extra.getByRole("button", { name: "Hear the secret number", exact: true }).click();
    await expect(extra.getByRole("combobox", { name: "Telephone difficulty", exact: true })).toBeDisabled();
    await extra.clock.fastForward(30000);
    await expect(extraGame).toHaveAttribute("data-melody-phase", "playing", { timeout: 30_000 });
    await expect(extraGame.getByRole("status")).toContainText("backwards");
    for (const digit of telephoneAnswer(telephoneSequence(0, "expert", expertSeed), "expert")) await extraNumber(digit).tap();
    await expect(extraGame).toHaveAttribute("data-melody-phase", "celebrating");
    await extra.screenshot({ path: `${screenshots}/secret-agent-mobile.png`, fullPage: true });
    await extra.reload();
    await extra.getByRole("button", { name: /^Phone game/ }).click();
    await expect(extra.getByRole("combobox", { name: "Telephone difficulty", exact: true })).toHaveValue("expert");
    await extra.evaluate(() => {
      const key = "melody-play:v2:guest", progress = JSON.parse(localStorage.getItem(key)!);
      localStorage.setItem(key, JSON.stringify({ ...progress, telephoneRound: 10 }));
    });
    await extra.reload();
    await extra.getByRole("button", { name: /^Phone game/ }).click();
    await expect(extra.getByRole("group", { name: "10 secret numbers", exact: true })).toBeVisible();
    await extra.setViewportSize({ width: 320, height: 568 });
    assert.equal(await extra.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "ten-digit missions wrap on small phones");
    await extra.screenshot({ path: `${screenshots}/ten-digit-agent-mobile.png`, fullPage: true });

    member.id = "older-melody-preview"; member.age = 10;
    await page.goto(`${baseUrl}/kid/${member.id}/games`);
    await page.getByRole("button", { name: /Melody’s Play Phone/ }).click();
    await page.getByRole("button", { name: /^Phone game/ }).click();
    await expect(page.getByRole("combobox", { name: "Telephone difficulty", exact: true })).toHaveValue("expert");

    const clip = narrationId("three!");
    const decoded = await extra.evaluate(async paths => {
      const audio = new AudioContext();
      try {
        return await Promise.all(paths.map(async path => {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`Missing audio: ${path}`);
          const buffer = await audio.decodeAudioData(await response.arrayBuffer());
          return { duration: buffer.duration, channels: buffer.numberOfChannels };
        }));
      } finally { await audio.close(); }
    }, [`/games/melody/voices/warm/${clip}.mp3`, `/games/melody/voices/story/${clip}.mp3`, "/games/melody/audio/ring-classic.wav"]);
    assert.ok(decoded.every(audio => audio.duration > 0.2 && audio.channels >= 1), "both voices and the ringtone decode as playable audio");
    for (const size of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
      await extra.setViewportSize(size);
      await extra.getByRole("button", { name: /^My family/ }).click();
      assert.equal(await extra.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await extra.getByRole("button", { name: "Voice and sound settings", exact: true }).click();
      const box = (await soundDialog.boundingBox())!;
      assert.ok(box.x >= 0 && box.x + box.width <= size.width && box.y >= 0 && box.y + box.height <= size.height, "settings fit the screen");
      await soundDialog.getByRole("button", { name: "Done", exact: true }).click();
    }
    assert.deepEqual(errors, []);
    console.log(`Melody browser checks passed: original learning games, natural voices, persisted sound settings, family dialing and stories, custom contacts, telephone memory/retry, real audio decoding, mute and responsive layouts. Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
