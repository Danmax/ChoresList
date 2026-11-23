import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceTrace, distance, letterExample, letterStrokes, LETTER_LESSONS, lessonFor, readLetterGardenProgress, resumeTrace, strokeFinished, tracingNarration } from "../lib/letter-garden";
import { narrationId, narrationParts } from "../lib/melody-sound";
import manifest from "../lib/melody-voice-manifest.json";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "../lib/games";

test("the complete alphabet has uppercase and lowercase stroke lessons with example words", () => {
  assert.equal(LETTER_LESSONS.map(lesson => lesson.letter).join(""), "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  assert.equal(letterExample(lessonFor("a")), "A is for Apple!");
  assert.equal(lessonFor("not-a-letter").letter, "A");
  for (const lesson of LETTER_LESSONS) for (const letterCase of ["uppercase", "lowercase"] as const) {
    const strokes = letterStrokes(lesson, letterCase);
    assert.ok(strokes.length >= 1 && strokes.length <= 4);
    assert.ok(lesson.word && lesson.emoji);
    for (const stroke of strokes) {
      assert.ok(stroke.instruction.length > 8);
      assert.ok(stroke.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 30 && point.x <= 330 && point.y >= 30 && point.y <= 390), `${letterCase} ${lesson.letter} stays on the paper`);
      assert.ok(stroke.points.every((point, index) => index === 0 || distance(point, stroke.points[index - 1]) <= 4.01), "centerlines are sampled consistently");
    }
  }
});

test("following every stroke in order completes all 52 letter forms", () => {
  for (const lesson of LETTER_LESSONS) for (const letterCase of ["uppercase", "lowercase"] as const) {
    for (const stroke of letterStrokes(lesson, letterCase)) {
      let progress = 0;
      for (let index = 1; index < stroke.points.length; index++) progress = advanceTrace(stroke.points, progress, stroke.points[index - 1], stroke.points[index]);
      assert.ok(strokeFinished(stroke, progress, stroke.points[stroke.points.length - 1]), `${letterCase} ${lesson.letter} can be traced`);
    }
  }
});

test("a tap, random scribble, or shortcut across a curve cannot complete a letter", () => {
  const stroke = letterStrokes(lessonFor("O"), "uppercase")[0];
  let progress = advanceTrace(stroke.points, 0, stroke.points[0], stroke.points[0]);
  assert.equal(progress, 0, "a closed loop cannot finish just by tapping its start/end");
  progress = advanceTrace(stroke.points, 0, stroke.points[0], stroke.points[Math.floor(stroke.points.length / 2)]);
  assert.equal(strokeFinished(stroke, progress, stroke.points[stroke.points.length - 1]), false, "cutting through the oval does not trace it");
  let previous = { x: 20, y: 20 };
  for (let index = 0; index < 30; index++) {
    const next = { x: index % 2 ? 330 : 20, y: 20 };
    progress = advanceTrace(stroke.points, progress, previous, next); previous = next;
  }
  assert.equal(strokeFinished(stroke, progress, previous), false);
});

test("small wobbles and fast straight strokes work, while backwards tracing does not skip ahead", () => {
  const stroke = letterStrokes(lessonFor("L"), "uppercase")[0];
  const fast = advanceTrace(stroke.points, 0, stroke.points[0], stroke.points[stroke.points.length - 1]);
  assert.ok(strokeFinished(stroke, fast, stroke.points[stroke.points.length - 1]));
  let progress = 0;
  for (let index = 1; index < stroke.points.length; index++) {
    progress = advanceTrace(stroke.points, progress, { x: stroke.points[index - 1].x + 5, y: stroke.points[index - 1].y }, { x: stroke.points[index].x + 5, y: stroke.points[index].y });
  }
  assert.ok(strokeFinished(stroke, progress, stroke.points[stroke.points.length - 1]));
  const backwards = advanceTrace(stroke.points, 0, stroke.points[stroke.points.length - 1], stroke.points[0]);
  assert.ok(backwards < stroke.points.length / 3);
  assert.equal(advanceTrace(stroke.points, 0, { x: NaN, y: 0 }, stroke.points[0]), 0);
});

test("partial progress can resume and dot strokes require reaching their dot", () => {
  const stroke = letterStrokes(lessonFor("A"), "uppercase")[0];
  const middle = Math.floor(stroke.points.length / 2);
  let progress = advanceTrace(stroke.points, 0, stroke.points[0], stroke.points[middle]);
  assert.equal(strokeFinished(stroke, progress, stroke.points[middle]), false);
  progress = advanceTrace(stroke.points, progress, stroke.points[progress], stroke.points[stroke.points.length - 1]);
  assert.ok(strokeFinished(stroke, progress, stroke.points[stroke.points.length - 1]));
  const dot = letterStrokes(lessonFor("i"), "lowercase")[1];
  assert.equal(dot.points.length, 1);
  assert.ok(strokeFinished(dot, 0, dot.points[0]));
  assert.equal(strokeFinished(dot, 0, { x: 20, y: 20 }), false);
});

test("saved letter stamps are bounded and cannot inject invalid letters or cases", () => {
  const result = readLetterGardenProgress({ selected: "<script>", letterCase: "other", guided: false, completed: ["A:uppercase", "A:uppercase", "A:lowercase", "ZZ:uppercase", "B:bad", null, 4] });
  assert.deepEqual(result.completed, ["A:uppercase", "A:lowercase"]);
  assert.equal(result.selected, "A");
  assert.equal(result.letterCase, "uppercase");
  assert.equal(result.guided, false);
});

test("almost-finished strokes complete without demanding the final exact pixel", () => {
  const stroke = letterStrokes(lessonFor("L"), "uppercase")[0];
  const nearEnd = stroke.points.length - 4;
  assert.ok(strokeFinished(stroke, nearEnd, stroke.points[nearEnd]));
  assert.equal(strokeFinished(stroke, Math.floor(stroke.points.length / 2), stroke.points[stroke.points.length - 1]), false);
  const loop = letterStrokes(lessonFor("O"), "uppercase")[0];
  assert.equal(strokeFinished(loop, 0, loop.points[0]), false, "nearby endpoints never bypass the tracing requirement");
});

test("resuming accepts an earlier painted point and a forgiving start without skipping untraced curves", () => {
  const stroke = letterStrokes(lessonFor("A"), "uppercase")[0];
  const middle = Math.floor(stroke.points.length / 2);
  assert.equal(resumeTrace(stroke.points, middle, stroke.points[8]), middle);
  assert.ok(resumeTrace(stroke.points, 0, { x: stroke.points[0].x + 30, y: stroke.points[0].y }) !== null);
  assert.equal(resumeTrace(stroke.points, 0, stroke.points[stroke.points.length - 1]), null);
  assert.equal(resumeTrace(stroke.points, middle, { x: NaN, y: 0 }), null);
  const loop = letterStrokes(lessonFor("O"), "uppercase")[0];
  assert.equal(resumeTrace(loop.points, 0, { x: 180, y: 192 }), null, "the center of a loop is not a valid start");
});

test("every letter example and stroke instruction has both natural voices", () => {
  for (const voice of ["warm", "story"] as const) {
    const ids = new Set<string>(manifest.voices[voice]);
    for (const line of tracingNarration()) for (const part of narrationParts(line)) assert.ok(ids.has(narrationId(part)), `${voice}: ${part}`);
  }
  assert.equal(gameByKey("letter-garden")?.ageMin, 3);
  assert.equal(DEFAULT_GAME_SETTINGS["letter-garden"].rewardType, "none");
});
