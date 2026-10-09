import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, FLOOR, jumpRunner, levelSeconds, PLAYER_X, punchRunner, stepRunner } from '../lib/jungle-runner';
import { createSavannaAnimal } from '../lib/jungle-savanna';

function savanna(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
  const s = createRunner(difficulty, 7, 7);
  s.phase = 'playing'; s.items = []; s.nextSection = 100000;
  return s;
}
function advance(s: ReturnType<typeof savanna>, seconds: number) {
  for (let i = 0; i < seconds * 120 && s.phase === 'playing'; i++) stepRunner(s, 1 / 120);
}

test('Savanna Stampede is the eighth selectable level with a Citrine gem', () => {
  const s = savanna();
  assert.equal(s.level, 7);
  assert.equal(s.gemCollected.length, 8);
  assert.equal(s.endLevel, 7);
});

test('friendly giraffes launch a descending runner without damage', () => {
  const s = savanna();
  s.savannaAnimals = [createSavannaAnimal('giraffe', PLAYER_X + 1)];
  s.y = FLOOR - 127; s.vy = 250; s.jumps = 1;
  stepRunner(s, 1 / 120);
  assert.ok(s.vy < -500);
  assert.equal(s.hits, 0);
  assert.equal(s.jumps, 1);
});

test('falling into a death cliff costs one life and returns to its checkpoint', () => {
  const s = savanna();
  s.savannaPits = [{ x: PLAYER_X - 30, width: 180, checkpoint: PLAYER_X - 140 }];
  advance(s, 0.4);
  assert.equal(s.lives, 2);
  assert.equal(s.y, FLOOR);
  assert.ok(s.distance + PLAYER_X <= PLAYER_X - 130);
});

test('a wildebeest warning precedes its damaging stampede', () => {
  const s = savanna();
  const beast = createSavannaAnimal('wildebeest', PLAYER_X + 600);
  s.savannaAnimals = [beast];
  stepRunner(s, 1 / 120);
  assert.equal(beast.state, 'warn');
  assert.equal(s.hits, 0);
  advance(s, 0.5);
  assert.equal(s.hits, 0);
});

test('the savanna timer cannot bypass the lion or oasis finish', () => {
  const s = savanna();
  s.elapsed = levelSeconds(s) * 8 - 0.01;
  stepRunner(s, 0.02);
  assert.equal(s.phase, 'playing');
  assert.equal(s.savannaBossStarted, true);
});

test('countering the lion opens the oasis and crossing it wins', () => {
  const s = savanna('easy');
  s.savannaBossStarted = true;
  const lion = createSavannaAnimal('lion', PLAYER_X + 65, 'easy');
  lion.state = 'recover';
  s.savannaAnimals = [lion];
  s.invincible = 100;
  for (let hit = 0; hit < 3; hit++) {
    lion.x = s.distance + PLAYER_X + 65; lion.state = 'recover'; lion.hitCooldown = 0;
    punchRunner(s); stepRunner(s, 1 / 120); advance(s, 0.4);
  }
  assert.equal(s.savannaLionDefeated, true);
  assert.equal(s.savannaOasisOpen, true);
  assert.notEqual(s.savannaFinishX, null);
  s.distance = s.savannaFinishX! - PLAYER_X;
  s.y = FLOOR;
  stepRunner(s, 1 / 120);
  assert.equal(s.savannaOasisReached, true);
  assert.equal(s.phase, 'victory');
});

test('Adventure Mode moves from defeated DinoLand into the savanna', () => {
  const s = createRunner('medium');
  s.phase = 'playing'; s.level = 6; s.elapsed = levelSeconds(s) * 7 - 0.001;
  s.dinoBossDefeated = true; s.items = []; s.nextSection = 100000;
  stepRunner(s, 0.01);
  assert.equal(s.level, 7);
  assert.equal(s.phase, 'playing');
});
