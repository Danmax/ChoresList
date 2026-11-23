import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import { melodyNarrationCatalog, narrationId, narrationParts } from "../lib/melody-sound";
import manifest from "../lib/melody-voice-manifest.json";
import { createMelodyState, melodyQuestion, melodyReducer } from "../lib/melody-phone";
import { DISCOVERY_TOPICS } from "../lib/melody-content";

test("both natural voices include every game narration sentence as a real audio asset", async () => {
  const catalog = melodyNarrationCatalog();
  assert.ok(catalog.size > 100);
  assert.equal(narrationId("  Hello!  "), narrationId("hello!"));
  assert.deepEqual(narrationParts("Hello! Let's play. Ready?"), ["Hello!", "Let's play.", "Ready?"]);
  for (const pack of ["warm", "story"] as const) {
    const ids = new Set<string>(manifest.voices[pack]);
    for (const [id, text] of catalog) {
      assert.ok(ids.has(id), `${pack} is missing: ${text}`);
      assert.ok((await stat(`public/games/melody/voices/${pack}/${id}.mp3`)).size > 500);
    }
  }
});

test("telephone keys contain their standard dual tones and effects have safe PCM samples", async () => {
  const pairs = [[941, 1336], [697, 1209], [697, 1336], [697, 1477], [770, 1209], [770, 1336], [770, 1477], [852, 1209], [852, 1336], [852, 1477]];
  for (let digit = 0; digit < 10; digit++) {
    const data = await readFile(`public/games/melody/audio/key-${digit}.wav`);
    assert.equal(data.toString("ascii", 0, 4), "RIFF");
    assert.equal(data.toString("ascii", 8, 12), "WAVE");
    const rate = data.readUInt32LE(24);
    const samples = Array.from({ length: (data.length - 44) / 2 }, (_, index) => data.readInt16LE(44 + index * 2) / 32768);
    const power = (frequency: number) => {
      let real = 0, imaginary = 0;
      samples.forEach((sample, index) => { real += sample * Math.cos(2 * Math.PI * frequency * index / rate); imaginary += sample * Math.sin(2 * Math.PI * frequency * index / rate); });
      return real * real + imaginary * imaginary;
    };
    for (const frequency of pairs[digit]) assert.ok(power(frequency) > power(1800) * 100, `key ${digit} contains ${frequency} Hz`);
    assert.ok(samples.every(sample => Math.abs(sample) <= 0.85), "no clipped samples");
  }
  for (const name of ["ring-classic", "ring-bouncy", "ring-sparkle", "outgoing", "connect", "hangup", "success", "pop", "boing", "sparkle"]) {
    const data = await readFile(`public/games/melody/audio/${name}.wav`);
    assert.ok(data.length > 500);
    assert.equal(data.toString("ascii", 0, 4), "RIFF");
  }
});

test("rotated runtime questions, feedback, and discoveries all stay within the voice library", () => {
  const ids = new Set<string>(manifest.voices.warm);
  const check = (text: string) => narrationParts(text).forEach(part => assert.ok(ids.has(narrationId(part)), `Missing voice line: ${part}`));
  for (let turn = 0; turn < 96; turn++) {
    for (const topic of DISCOVERY_TOPICS) {
      const initial = createMelodyState({ contentTurn: turn, topic: topic.id });
      check(melodyReducer(initial, { type: "number", number: 3 }).message);
      check(melodyQuestion("count", turn % 22, true, turn, topic.id).prompt);
      const counting = melodyReducer(initial, { type: "mode", mode: "count" });
      check(counting.message);
      check(melodyReducer(counting, { type: "number", number: 8 }).message);
      check(melodyQuestion("find", turn % 22, false, turn, topic.id).prompt);
    }
  }
});
