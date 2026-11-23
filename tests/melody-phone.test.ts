import assert from "node:assert/strict";
import { test } from "node:test";
import { createMelodyState, melodyQuestion, melodyReducer, type MelodyState } from "../lib/melody-phone";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "../lib/games";
import { DEFAULT_PRETEND_CONTACTS, FAMILY_STORIES, MELODY_LINES, readPretendContacts, telephoneSequence } from "../lib/melody-pretend";
import { readMelodySound } from "../lib/melody-sound";

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

test("pretend contacts are bounded, validated, and assigned unique toy numbers", () => {
  assert.deepEqual(readPretendContacts(null), DEFAULT_PRETEND_CONTACTS);
  assert.deepEqual(readPretendContacts([{ id: "bad", name: "Oops", emoji: "🧸", story: "__proto__" }]), DEFAULT_PRETEND_CONTACTS);
  const contacts = readPretendContacts(Array.from({ length: 10 }, (_, index) => ({ id: `friend-${index}`, name: "  My pretend cousin with a long name  ", emoji: "🧸", story: "camp", number: [9, 1, 1] })));
  assert.equal(contacts.length, 6);
  assert.ok(contacts.every(contact => contact.name.length <= 24));
  assert.equal(new Set(contacts.map(contact => contact.number.join(""))).size, 6);
  assert.ok(contacts.every(contact => contact.number.join("") !== "911"));
});

test("family calls require the chosen toy number and a completed connection", () => {
  const contact = DEFAULT_PRETEND_CONTACTS[0];
  let state = melodyReducer(createMelodyState(), { type: "mode", mode: "family" });
  state = melodyReducer(state, { type: "select-contact", contact });
  state = melodyReducer(state, { type: "dial-family", contact });
  assert.equal(state.familyConnected, false);
  assert.equal(state.message, MELODY_LINES.notFound);
  for (const number of contact.number) state = melodyReducer(state, { type: "number", number });
  state = melodyReducer(state, { type: "erase" });
  assert.deepEqual(state.familyDigits, [1, 2]);
  state = melodyReducer(state, { type: "number", number: 3 });
  state = melodyReducer(state, { type: "dial-family", contact });
  assert.equal(state.phase, "dialing");
  assert.equal(melodyReducer(state, { type: "number", number: 8 }), state);
  const canceled = melodyReducer(state, { type: "hang-up" });
  assert.equal(melodyReducer(canceled, { type: "connect-family" }), canceled, "late connection cannot reopen a canceled call");
  state = melodyReducer(state, { type: "connect-family" });
  assert.equal(state.familyConnected, true);
  assert.equal(state.calls, 1);
  assert.equal(melodyReducer(state, { type: "number", number: 8 }), state);
  assert.equal(melodyReducer(state, { type: "family-choice", next: 4 }), state, "cannot skip story branches");
});

test("each pretend family adventure supports both branches and a warm goodbye", () => {
  for (const contact of DEFAULT_PRETEND_CONTACTS) for (const branch of [1, 2]) {
    let state = melodyReducer(createMelodyState(), { type: "mode", mode: "family" });
    state = melodyReducer(state, { type: "incoming-family", contact });
    assert.equal(state.phase, "ringing");
    const dismissed = melodyReducer(state, { type: "dismiss" });
    assert.equal(dismissed.mode, "family");
    assert.equal(dismissed.message, MELODY_LINES.family);
    state = melodyReducer(state, { type: "call" });
    assert.equal(state.message, FAMILY_STORIES[contact.story].nodes[0].text);
    state = melodyReducer(state, { type: "family-choice", next: branch });
    state = melodyReducer(state, { type: "family-choice", next: 3 });
    assert.equal(state.phase, "celebrating");
    assert.equal(state.completed, 1);
    assert.equal(melodyReducer(state, { type: "family-choice", next: 3 }), state, "cannot finish twice");
    state = melodyReducer(state, { type: "next" });
    assert.equal(state.familyConnected, false);
    assert.equal(state.mode, "family");
    assert.equal(state.message, MELODY_LINES.goodbye);
  }
});

test("telephone memory waits for listening, retries gently, and advances only once", () => {
  let state = melodyReducer(createMelodyState(), { type: "mode", mode: "telephone" });
  assert.deepEqual(state.sequence, [2, 1]);
  state = melodyReducer(state, { type: "number", number: 2 });
  assert.deepEqual(state.echoed, []);
  state = melodyReducer(state, { type: "listen" });
  assert.equal(state.phase, "listening");
  assert.equal(melodyReducer(state, { type: "number", number: 2 }), state);
  state = melodyReducer(state, { type: "sequence-ready" });
  state = melodyReducer(state, { type: "number", number: 8 });
  assert.equal(state.hint, true);
  assert.equal(state.sequenceHeard, false);
  assert.equal(state.message, MELODY_LINES.retry);
  assert.equal(state.completed, 0);
  state = melodyReducer(state, { type: "listen" });
  state = melodyReducer(state, { type: "sequence-ready" });
  state = melodyReducer(state, { type: "number", number: 2 });
  assert.deepEqual(state.echoed, [2]);
  state = melodyReducer(state, { type: "number", number: 1 });
  assert.equal(state.phase, "celebrating");
  assert.equal(state.completed, 1);
  assert.equal(state.telephoneRound, 1);
  assert.equal(melodyReducer(state, { type: "number", number: 1 }), state);
  state = melodyReducer(state, { type: "next" });
  assert.deepEqual(state.sequence, [1, 3]);
  assert.equal(state.sequenceHeard, false);
  assert.equal(telephoneSequence(2).length, 3);
  assert.equal(telephoneSequence(100).length, 4);
});

test("leaving or resting cancels pending telephone and family transitions", () => {
  let state = melodyReducer(createMelodyState(), { type: "mode", mode: "telephone" });
  state = melodyReducer(state, { type: "listen" });
  state = melodyReducer(state, { type: "sleep" });
  assert.equal(melodyReducer(state, { type: "sequence-ready" }), state);
  const otherMode = melodyReducer(state, { type: "mode", mode: "find" });
  assert.equal(melodyReducer(otherMode, { type: "sequence-ready" }), otherMode);
});

test("sound preferences accept only supported voices and safe playback ranges", () => {
  const settings = readMelodySound({ voice: "unknown", volume: 8, speed: -10, keypad: "other", ringtone: "bogus" });
  assert.equal(settings.voice, "warm");
  assert.equal(settings.volume, 1);
  assert.equal(settings.speed, 0.75);
  assert.equal(settings.keypad, "telephone");
  assert.equal(settings.ringtone, "classic");
  assert.equal(readMelodySound({ volume: NaN }).volume, 0.7);
});
