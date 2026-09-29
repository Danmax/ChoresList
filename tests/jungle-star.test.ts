import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, createPredator, createHogs, createOrangutan, stepRunner, FLOOR, PLAYER_X, levelSeconds, type Runner } from '../lib/jungle-runner';
import { createInsect } from '../lib/jungle-insects';

function playing(level = 0): Runner {
  const s = createRunner();
  s.phase = 'playing'; s.level = level; s.elapsed = levelSeconds(s) * level;
  s.items = []; s.nextSection = 100000;
  return s;
}

function powered(level = 0): Runner {
  const s = playing(level); s.starPower = 5; s.invincible = 5; return s;
}

test('star pickup grants ten seconds of knockout power, unlike ordinary hit protection', () => {
  const s = playing(); s.items = [{ x: PLAYER_X, y: FLOOR - 30, kind: 'star' }];
  stepRunner(s, 1 / 120);
  assert.equal(s.starPower, 10); assert.equal(s.invincible, 10);
  stepRunner(s, 10);
  assert.equal(s.starPower, 0);
  const protectedOnly = playing(); protectedOnly.invincible = 2;
  protectedOnly.predators = [createPredator('snake', PLAYER_X, 0)];
  stepRunner(protectedOnly, 1 / 120);
  assert.equal(protectedOnly.bonusScore, 0);
  assert.equal(protectedOnly.predators.length, 1);
});

test('star contact knocks out land predators, hogs, and an elephant once each', () => {
  for (const kind of ['snake', 'tiger', 'panther'] as const) {
    const s = powered(); const p = createPredator(kind, PLAYER_X, 0);
    p.state = 'recover'; s.predators = [p];
    stepRunner(s, 1 / 120);
    assert.equal(s.predators.length, 0, kind); assert.equal(s.bonusScore, 25, kind); assert.equal(s.hits, 0, kind);
  }
  const hog = powered(); hog.hogs = [createHogs(PLAYER_X, 205)[0]];
  stepRunner(hog, 1 / 120);
  assert.equal(hog.hogs.length, 0); assert.equal(hog.bonusScore, 25);
  const elephant = powered(); elephant.herds = [{ x: PLAYER_X, age: 0, charging: false, warned: true }];
  stepRunner(elephant, 1 / 120); stepRunner(elephant, 1 / 120);
  assert.equal(elephant.herds[0].knocked?.[0], true); assert.equal(elephant.bonusScore, 25);
});

test('star contact clears insect enemies and an ant tower without repeat points', () => {
  for (const kind of ['beetle', 'worker', 'fire-ant', 'katydid', 'centipede', 'scorpion'] as const) {
    const s = powered(5);
    s.insects = kind === 'fire-ant' ? [0, 1, 2].map(i => createInsect(kind, PLAYER_X, i)) : [createInsect(kind, PLAYER_X)];
    stepRunner(s, 1 / 120); stepRunner(s, 1 / 120);
    assert.equal(s.bonusScore, 25, kind); assert.equal(s.hits, 0, kind);
    assert.equal(s.insects.length, 0, kind);
  }
  const rocks = powered(5); rocks.antRocks = [{ x: PLAYER_X, y: FLOOR - 40, vx: 0, vy: 0 }];
  stepRunner(rocks, 1 / 120);
  assert.equal(rocks.bonusScore, 25); assert.equal(rocks.antRocks.length, 0);
});

test('star contact stops orangutan throws and splats pineapples', () => {
  const s = powered(1); s.orangutans = [createOrangutan(PLAYER_X)];
  s.pineapples = [{ x: PLAYER_X, y: FLOOR - 40, vx: 0, vy: 0, rotation: 0 }];
  stepRunner(s, 1 / 120);
  assert.equal(s.orangutans[0].stunned, 0); assert.equal(s.pineapples.length, 0);
  assert.equal(s.bonusScore, 50); assert.equal(s.hits, 0);
});

test('star contact clears a leaping piranha and temporarily stuns an eel', () => {
  const fish = powered(1); fish.rivers = [{ x: 20, width: 500, resident: 'piranha', waterAge: 0.95 }];
  stepRunner(fish, 1 / 120); stepRunner(fish, 1 / 120);
  assert.equal(fish.rivers[0].piranhasKnocked?.[0], true);
  assert.equal(fish.bonusScore, 25); assert.equal(fish.hits, 0);

  const eel = powered(1); eel.rivers = [{ x: 0, width: 500, resident: 'eel', waterAge: 1 }];
  stepRunner(eel, 1 / 120); stepRunner(eel, 1 / 120);
  assert.equal(eel.rivers[0].eelScored, true);
  assert.ok((eel.rivers[0].eelStun ?? 0) > 0);
  assert.equal(eel.bonusScore, 25); assert.equal(eel.hits, 0);
});

test('star retains the caterpillar bounce and vine swing helpers', () => {
  const bounce = powered(5); bounce.insects = [createInsect('mud-pit', PLAYER_X), createInsect('caterpillar', PLAYER_X)];
  bounce.y = FLOOR - 49; bounce.vy = 220; bounce.jumps = 1;
  stepRunner(bounce, 1 / 120);
  assert.equal(bounce.caterpillarBounces, 1); assert.ok(bounce.vy < 0);
  assert.equal(bounce.bonusScore, 0); assert.equal(bounce.hits, 0);
  const vine = powered(1); vine.rivers = [{ x: 0, width: 500, vine: true }];
  vine.swing = { river: vine.rivers[0], progress: 0.2 };
  stepRunner(vine, 1 / 120);
  assert.ok(vine.swing); assert.equal(vine.hits, 0);
});
