import assert from "node:assert/strict";
import { test } from "node:test";
import { createMelodyState, melodyQuestion, melodyReducer, type MelodyState } from "../lib/melody-phone";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "../lib/games";

test("free play teaches all ten digits and repeated taps do not duplicate discoveries", () => {
  let state = createMelodyState();
  for (let number = 0; number < 10; number++) {
    state = melodyReducer(state, { type: "number", number });
    assert.equal(state.selected, number);
    assert.equal(state.phase, "playing");
  }
  assert.deepEqual(state.discoveries, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const repeat = melodyReducer(state, { type: "number", number: 9 });
  assert.equal(repeat.discoveries.length, 10);
  assert.ok(repeat.revision > state.revision, "repeated numbers can be spoken again");
  for (const number of [-1, 10, 2.5, NaN]) assert.equal(melodyReducer(state, { type: "number", number }), state);
});

test("guided play gives a gentle hint and advances only after an explicit next action", () => {
  let state = melodyReducer(createMelodyState(), { type: "mode", mode: "find" });
  const target = state.question!.target;
  state = melodyReducer(state, { type: "number", number: (target + 1) % 10 });
  assert.equal(state.hint, true);
  assert.equal(state.completed, 0);
  assert.equal(state.question!.target, target);
  state = melodyReducer(state, { type: "number", number: target });
  assert.equal(state.phase, "celebrating");
  assert.equal(state.completed, 1);
  assert.equal(state.hint, false);
  assert.equal(melodyReducer(state, { type: "number", number: target }), state, "rapid taps cannot count a success twice");
  state = melodyReducer(state, { type: "next" });
  assert.equal(state.phase, "playing");
  assert.notEqual(state.question!.target, target);
});

test("counting accepts each object once, even out of order", () => {
  let state = melodyReducer(createMelodyState(), { type: "mode", mode: "count" });
  state = melodyReducer(state, { type: "count-object", index: 1 });
  assert.equal(state.message, "one!");
  assert.equal(melodyReducer(state, { type: "count-object", index: 1 }), state);
  for (const index of [-1, 20, 0.5]) assert.equal(melodyReducer(state, { type: "count-object", index }), state);
  state = melodyReducer(state, { type: "count-object", index: 0 });
  assert.deepEqual(state.counted, [1, 0]);
  assert.match(state.message, /two! Now tap/);
  assert.equal(state.completed, 0, "counting objects does not automatically answer the keypad question");
});

test("activities gradually introduce 1–3, then 1–5, then every digit including none", () => {
  assert.ok(Array.from({ length: 6 }, (_, i) => melodyQuestion("find", i).target).every(n => n >= 1 && n <= 3));
  assert.ok(Array.from({ length: 6 }, (_, i) => melodyQuestion("find", i + 6).target).every(n => n >= 1 && n <= 5));
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => melodyQuestion("count", i + 12).target).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const zero = melodyQuestion("count", 12);
  assert.equal(zero.target, 0);
  assert.match(zero.prompt, /no stars/);
});

test("surprise calls preserve exploration when dismissed and never interrupt an activity", () => {
  const exploring = melodyReducer(createMelodyState(), { type: "number", number: 7 });
  const ringing = melodyReducer(exploring, { type: "incoming" });
  assert.equal(ringing.phase, "ringing");
  assert.equal(melodyReducer(ringing, { type: "number", number: 2 }), ringing);
  const dismissed = melodyReducer(ringing, { type: "dismiss" });
  assert.equal(dismissed.selected, 7);
  assert.equal(dismissed.phase, "playing");
  for (const mode of ["find", "count"] as const) {
    const activity = melodyReducer(exploring, { type: "mode", mode });
    assert.equal(melodyReducer(activity, { type: "incoming" }), activity);
  }
});

test("pretend calls can be completed or ended early and restore the previous mode", () => {
  for (const finish of [true, false]) {
    let state = melodyReducer(createMelodyState(), { type: "mode", mode: "find" });
    state = melodyReducer(state, { type: "call" });
    assert.equal(state.returnMode, "find");
    assert.equal(state.mode, "count");
    assert.equal(state.calls, 1);
    assert.equal(melodyReducer(state, { type: "incoming" }), state);
    assert.equal(melodyReducer(state, { type: "call" }), state, "cannot nest calls");
    if (finish) {
      state = melodyReducer(state, { type: "number", number: state.question!.target });
      state = melodyReducer(state, { type: "next" });
    } else state = melodyReducer(state, { type: "hang-up" });
    assert.equal(state.returnMode, null);
    assert.equal(state.mode, "find");
    assert.equal(state.phase, "playing");
    assert.equal(state.completed, finish ? 1 : 0);
  }
});

test("children can request a call from the welcome screen or an activity", () => {
  const welcome = createMelodyState();
  assert.equal(melodyReducer(welcome, { type: "incoming", requested: true }).phase, "ringing");
  const counting = melodyReducer(welcome, { type: "mode", mode: "count" });
  const ringing = melodyReducer(counting, { type: "incoming", requested: true });
  assert.equal(ringing.phase, "ringing");
  const dismissed = melodyReducer(ringing, { type: "dismiss" });
  assert.deepEqual(dismissed.question, counting.question);
  assert.equal(dismissed.message, counting.question!.prompt);
});

test("sleep pauses play and waking preserves discoveries", () => {
  const awake = melodyReducer(createMelodyState(), { type: "number", number: 0 });
  const sleeping = melodyReducer(awake, { type: "sleep" });
  for (const action of [{ type: "number", number: 1 }, { type: "incoming" }, { type: "call" }, { type: "count-object", index: 0 }] as const) {
    assert.equal(melodyReducer(sleeping, action), sleeping);
  }
  const state: MelodyState = melodyReducer(sleeping, { type: "wake" });
  assert.equal(state.phase, "playing");
  assert.deepEqual(state.discoveries, [0]);
});

test("the family game catalog includes a preschool game with optional rewards disabled", () => {
  assert.equal(gameByKey("melody-phone")?.ageMin, 3);
  assert.equal(gameByKey("melody-phone")?.ageMax, 6);
  assert.equal(DEFAULT_GAME_SETTINGS["melody-phone"].rewardType, "none");
  assert.equal(DEFAULT_GAME_SETTINGS["melody-phone"].dailyPlayLimit, 0);
});
