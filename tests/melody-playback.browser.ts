import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { narrationId } from "../lib/melody-sound";

declare global {
  interface Window {
    voicePlayback: { events: string[]; audio: HTMLMediaElement | null; utterance: SpeechSynthesisUtterance | null; finish: () => void };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  try {
    for (const voice of ["warm", "story", "device"] as const) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(voice => {
        localStorage.setItem("melody-sound:v1", JSON.stringify({ voice, speed: 0.85 }));
        window.voicePlayback = { events: [], audio: null, utterance: null, finish() {
          const audio = window.voicePlayback.audio, utterance = window.voicePlayback.utterance;
          window.voicePlayback.audio = null; window.voicePlayback.utterance = null;
          if (audio) audio.dispatchEvent(new Event("ended"));
          else utterance?.dispatchEvent(new Event("end"));
        } };
        // Deliberately hold every voice open until the test emits its actual
        // completion event. Advancing the clock must not interrupt that voice.
        HTMLMediaElement.prototype.play = function () {
          if (this.src.includes("/voices/")) {
            window.voicePlayback.events.push(`audio:${this.src.split("/").at(-1)}`);
            window.voicePlayback.audio = this; window.voicePlayback.utterance = null;
          }
          return Promise.resolve();
        };
        const synthesis = Object.assign(new EventTarget(), {
          cancel() {}, getVoices() { return []; },
          speak(utterance: SpeechSynthesisUtterance) {
            window.voicePlayback.events.push(`device:${utterance.text}`);
            window.voicePlayback.utterance = utterance; window.voicePlayback.audio = null;
          },
        });
        Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
      }, voice);
      await page.clock.install();
      await page.goto(`${process.env.MELODY_TEST_URL ?? "http://127.0.0.1:3017"}/play/melody`);
      const game = page.getByRole("region", { name: "Melody's Play Phone", exact: true });
      const number = (digit: number) => page.getByRole("button", { name: `Number ${digit}`, exact: true });
      await page.getByRole("button", { name: /^Phone game/ }).click();
      await page.evaluate(() => { window.voicePlayback.events = []; });
      await page.getByRole("button", { name: "Hear the secret number", exact: true }).click();
      await expect(game).toHaveAttribute("data-melody-phase", "listening");
      await expect(page.getByRole("button", { name: "Hear Melody again", exact: true })).toBeDisabled();
      await expect.poll(() => page.evaluate(() => window.voicePlayback.events.length)).toBe(1);
      await page.clock.runFor(10_000);
      assert.equal(await page.evaluate(() => window.voicePlayback.events.length), 1, `${voice}: the introduction is never cut off`);

      await page.evaluate(() => window.voicePlayback.finish());
      await page.clock.runFor(400);
      await expect.poll(() => page.evaluate(() => window.voicePlayback.events.length)).toBe(2);
      await expect(number(2)).toHaveClass(/keyPressed/);
      await page.clock.runFor(10_000);
      assert.equal(await page.evaluate(() => window.voicePlayback.events.length), 2, `${voice}: first digit waits for its speech to finish`);
      await expect(number(2)).toHaveClass(/keyPressed/);
      await expect(game).toHaveAttribute("data-melody-phase", "listening");

      await page.evaluate(() => window.voicePlayback.finish());
      await page.clock.runFor(400);
      await expect.poll(() => page.evaluate(() => window.voicePlayback.events.length)).toBe(3);
      await expect(number(1)).toHaveClass(/keyPressed/);
      await expect(number(2)).not.toHaveClass(/keyPressed/);
      await page.clock.runFor(10_000);
      assert.equal(await page.evaluate(() => window.voicePlayback.events.length), 3, `${voice}: final digit also waits for its speech`);
      await expect(number(1)).toBeDisabled();
      const events = await page.evaluate(() => window.voicePlayback.events);
      assert.equal(events[1], voice === "device" ? "device:two!" : `audio:${narrationId("two!")}.mp3`);
      assert.equal(events[2], voice === "device" ? "device:one!" : `audio:${narrationId("one!")}.mp3`);

      await page.evaluate(() => window.voicePlayback.finish());
      await page.clock.runFor(400);
      await expect(game).toHaveAttribute("data-melody-phase", "playing");
      await expect(number(1)).toBeEnabled();

      await page.getByRole("button", { name: "Hear the number again", exact: true }).click();
      await expect(game).toHaveAttribute("data-melody-phase", "listening");
      await page.getByRole("button", { name: /^Just play/ }).click();
      const afterCancel = await page.evaluate(() => window.voicePlayback.events.length);
      await page.clock.runFor(20_000);
      await expect(game).toHaveAttribute("data-melody-mode", "explore");
      assert.equal(await page.evaluate(() => window.voicePlayback.events.length), afterCancel, `${voice}: cancelled sequences cannot restart`);

      await page.getByRole("button", { name: "Mute sound", exact: true }).click();
      await page.getByRole("button", { name: /^Phone game/ }).click();
      const beforeMuted = await page.evaluate(() => window.voicePlayback.events.length);
      await page.getByRole("button", { name: "Hear the secret number", exact: true }).click();
      await page.clock.runFor(10_000);
      await expect(game).toHaveAttribute("data-melody-phase", "playing");
      assert.equal(await page.evaluate(() => window.voicePlayback.events.length), beforeMuted, "muted play needs no audio completion events");
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log("Secret-number playback checks passed for both recorded voices and device speech: slow introductions/digits, synchronized highlights, final-word completion, cancellation, and mute.");
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
