import assert from "node:assert/strict";
import test from "node:test";
import { applyPetAction, createPet, publicChallenge } from "../lib/pocket-pals";
import { createRhythmPattern, playRhythmTone, RHYTHM_PATTERNS, RHYTHM_SOUNDS } from "../lib/pocket-pals-rhythm";

const now = Date.parse("2026-10-08T16:00:00Z");
const id = "12345678-abcd-4321-9876-123456789abc";

test("all 18 rhythm patterns are distinct, playable and age-bounded", () => {
  assert.equal(RHYTHM_PATTERNS.length, 18);
  assert.equal(new Set(RHYTHM_PATTERNS.map((pattern) => pattern.id)).size, 18);
  for (const age of [3, 5, 6, 9, 10, 18]) {
    const seen = new Map<string, number[]>();
    for (let seed = 0; seed < 256; seed++) {
      const pattern = createRhythmPattern(age, seed);
      seen.set(pattern.id, pattern.offsets);
      assert.equal(pattern.offsets[0], 0);
      assert.ok(pattern.offsets.every((offset, i) => Number.isFinite(offset) && (i === 0 || offset > pattern.offsets[i - 1])));
      assert.ok(pattern.offsets.slice(1).every((offset, i) => offset - pattern.offsets[i] >= (age < 6 ? 800 : age < 10 ? 550 : 300)));
      assert.ok(pattern.offsets.length >= (age < 6 ? 3 : age < 10 ? 4 : 5));
      assert.ok(pattern.offsets.length <= (age < 6 ? 4 : age < 10 ? 5 : 7));
      assert.ok(pattern.offsets.at(-1)! <= 4500);
    }
    assert.equal(seen.size, 6);
    assert.equal(new Set([...seen.values()].map((offsets) => JSON.stringify(offsets))).size, 6);
  }
});

test("new patterns avoid immediate repeats, including after serialization", () => {
  const pet = createPet("dog", "Mochi", now, "2026-10-08");
  let previous = "";
  for (let round = 0; round < 12; round++) {
    applyPetAction(pet, "start-rhythm", {}, now + round * 3000, 7, id);
    assert.notEqual(pet.lastRhythmPattern, previous);
    previous = JSON.parse(JSON.stringify(pet)).lastRhythmPattern;
    assert.equal(pet.coins, 20);
    assert.equal(pet.gamesPlayed, 0);
  }
});

test("every rhythm pattern can complete with issued timing and retains replay protection", () => {
  for (const age of [5, 7, 10]) for (let seed = 0; seed < 6; seed++) {
    const pet = createPet("cat", "Miso", now, "2026-10-08");
    const challengeId = `${seed.toString(16).padStart(2, "0")}${id.slice(2)}`;
    applyPetAction(pet, "start-rhythm", {}, now, age, challengeId);
    const round = publicChallenge(pet, age)!;
    assert.ok(round.rhythmName);
    const finishTime = now + round.rhythmOffsets!.at(-1)! * 2 + 2000;
    applyPetAction(pet, "finish-rhythm", { challengeId, taps: round.rhythmOffsets }, finishTime, age, id);
    assert.equal(pet.gamesPlayed, 1);
    assert.equal(pet.coins, 28);
    assert.throws(() => applyPetAction(pet, "finish-rhythm", { challengeId, taps: round.rhythmOffsets }, finishTime + 3000, age, id));
  }
});

test("switching rhythm patterns invalidates the previous round without rewarding it", () => {
  const pet = createPet("dog", "Mochi", now, "2026-10-08");
  applyPetAction(pet, "start-rhythm", {}, now, 7, id);
  const old = publicChallenge(pet, 7)!;
  applyPetAction(pet, "start-rhythm", {}, now + 3000, 7, "ff345678-abcd-4321-9876-123456789abc");
  assert.notEqual(pet.challenge!.rhythmName, old.rhythmName);
  assert.throws(() => applyPetAction(pet, "finish-rhythm", { challengeId: old.id, taps: old.rhythmOffsets }, now + 15_000, 7, id));
  assert.equal(pet.coins, 20);
});

test("existing saved rhythms keep their original offsets and can still finish", () => {
  const pet = createPet("dog", "Mochi", now, "2026-10-08");
  pet.challenge = { kind: "rhythm", id, startedAt: now, rhythmOffsets: [0, 800, 1600], rhythmTolerance: 400 };
  assert.equal(publicChallenge(pet, 5)!.rhythmName, "Your pal's beat");
  applyPetAction(pet, "finish-rhythm", { challengeId: id, taps: [0, 800, 1600] }, now + 6000, 5, id);
  assert.equal(pet.coins, 28);
});

test("sound voices have distinct timbres, matching tap/playback notes and bounded envelopes", () => {
  function render(sound: typeof RHYTHM_SOUNDS[number]["id"], index = 0, volume = .55) {
    const voices: any[] = [];
    const context = {
      currentTime: 5, destination: {},
      createOscillator: () => {
        const voice = { type: "", frequencies: [] as number[], peaks: [] as number[], start: 0, stop: 0, disconnected: false };
        voices.push(voice);
        return { set type(type: string) { voice.type = type; }, frequency: { setValueAtTime: (v: number) => voice.frequencies.push(v), exponentialRampToValueAtTime: (v: number) => voice.frequencies.push(v) }, connect: () => {}, disconnect: () => { voice.disconnected = true; }, start: (v: number) => { voice.start = v; }, stop: (v: number) => { voice.stop = v; }, onended: null };
      },
      createGain: () => ({ gain: { setValueAtTime: () => {}, linearRampToValueAtTime: (v: number) => voices.at(-1).peaks.push(v), exponentialRampToValueAtTime: () => {} }, connect: () => {}, disconnect: () => {} }),
    };
    playRhythmTone(context as unknown as BaseAudioContext, sound, index, volume);
    return voices;
  }
  const signatures = new Set<string>();
  for (const sound of RHYTHM_SOUNDS) {
    const playback = render(sound.id);
    assert.deepEqual(render(sound.id), playback);
    signatures.add(JSON.stringify(playback));
    assert.ok(playback.every((voice) => voice.start === 5 && voice.stop > 5 && voice.stop <= 5.25 && voice.peaks.every((peak: number) => peak > 0 && peak <= .24)));
    assert.ok(render(sound.id, 0, 5).every((voice) => voice.peaks.every((peak: number) => peak <= .24)));
    assert.deepEqual(render(sound.id, 0, 0), []);
    assert.deepEqual(render(sound.id, 0, NaN), []);
    assert.notDeepEqual(render(sound.id, 1), playback);
  }
  assert.equal(signatures.size, 4);
});
