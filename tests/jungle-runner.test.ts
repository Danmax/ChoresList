import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, createPredator, duckRunner, FLOOR, jumpRunner, LEVELS, PLAYER_X, runnerScore, runnerSpeed, stepRunner } from '../lib/jungle-runner';

function active() { const s = createRunner(); s.phase = 'playing'; s.items = []; s.nextSection = 100000; return s; }
function advance(s: ReturnType<typeof active>, seconds: number, fps = 120) { for (let i = 0; i < seconds * fps; i++) stepRunner(s, 1 / fps); }

test('jump follows an arc, permits one air jump, and duck cancels upward motion', () => {
  const s = active(); jumpRunner(s); advance(s, 0.15);
  assert.ok(s.y < FLOOR); jumpRunner(s); assert.equal(s.jumps, 2);
  const vy = s.vy; jumpRunner(s); assert.equal(s.vy, vy);
  duckRunner(s, true); assert.ok(s.vy >= 650);
  advance(s, 0.4); assert.equal(s.y, FLOOR); assert.equal(s.jumps, 0);
  duckRunner(s, false); assert.equal(s.duck, false);
});

test('run, jump, and duck have distinct valid obstacle clearances', () => {
  const run = active(); run.items = [{ x: PLAYER_X + 2, y: FLOOR - 118, kind: 'canopy' }]; advance(run, 0.1); assert.equal(run.lives, 3);
  const duck = active(); duckRunner(duck, true); duck.items = [{ x: PLAYER_X + 2, y: FLOOR - 64, kind: 'high' }]; advance(duck, 0.1); assert.equal(duck.lives, 3);
  const hit = active(); hit.items = [{ x: PLAYER_X + 2, y: FLOOR - 64, kind: 'high' }]; advance(hit, 0.1); assert.equal(hit.lives, 2);
  const jump = active(); jumpRunner(jump); advance(jump, 0.2); jump.items = [{ x: jump.distance + PLAYER_X, y: FLOOR - 22, kind: 'low' }]; advance(jump, 0.1); assert.equal(jump.lives, 3);
});

test('each 100 bananas grants exactly one additional life, even at full health', () => {
  const s = active(); s.bananas = 99; s.items = [{ x: PLAYER_X, y: FLOOR - 28, kind: 'banana' }];
  advance(s, 0.1); assert.equal(s.bananas, 100); assert.equal(s.lives, 4);
  advance(s, 0.5); assert.equal(s.lives, 4);
});

test('river has a reachable hippo bounce and running into water costs a life', () => {
  const s = active(); s.rivers = [{ x: PLAYER_X + 10, width: 250 }]; jumpRunner(s);
  advance(s, 1.7); assert.ok(s.bounces >= 1); assert.equal(s.lives, 3);
  const fall = active(); fall.rivers = [{ x: PLAYER_X + 10, width: 250 }]; advance(fall, 0.5); assert.equal(fall.lives, 2);
});

test('movement is consistent at different update rates', () => {
  const a = active(), b = active(); jumpRunner(a); jumpRunner(b);
  advance(a, 2, 60); advance(b, 2, 120);
  assert.ok(Math.abs(a.distance - b.distance) < 0.1); assert.equal(a.y, b.y);
});

test('hippo remains reachable at maximum running speed', () => {
  const s = active(); s.elapsed = 238; s.level = 3; s.rivers = [{ x: PLAYER_X + 10, width: runnerSpeed(s) * 1.05 }]; jumpRunner(s);
  advance(s, 1.7); assert.ok(s.bounces >= 1); assert.equal(s.lives, 3);
});

test('slide times out even while held and requires release to restart', () => {
  const s = active(); duckRunner(s, true); advance(s, 1.6);
  assert.equal(s.duck, false); duckRunner(s, true); assert.equal(s.duck, false);
  duckRunner(s, false); duckRunner(s, true); assert.equal(s.duck, true);
});

test('gold is above single-jump reach but reachable with a double jump', () => {
  const single = active(); jumpRunner(single);
  for (let i = 0; i < 100; i++) {
    single.items = [{ x: single.distance + PLAYER_X, y: FLOOR - 215, kind: 'golden' }];
    stepRunner(single, 1 / 120);
  }
  assert.equal(single.golden, 0);
  const double = active(); jumpRunner(double); advance(double, 0.3); jumpRunner(double); advance(double, 0.3);
  double.bananas = 95;
  double.items = [{ x: double.distance + PLAYER_X, y: FLOOR - 215, kind: 'golden' }];
  advance(double, 0.02); assert.equal(double.golden, 1); assert.equal(double.bananas, 105); assert.equal(double.lives, 4);
});

test('birds release one visible falling gift; cherries reward and coconuts hurt', () => {
  for (const gift of ['drop', 'cherry'] as const) {
    const s = active(); s.birds = [{ x: 620, y: 70, gift, dropped: false }];
    stepRunner(s, 1 / 120); assert.equal(s.items.length, 1); assert.equal(s.birds[0].dropped, true);
    const y = s.items[0].y; advance(s, 0.2); assert.ok(s.items[0].y > y);
    advance(s, 2.3);
    assert.equal(s.birds.length, 1);
    if (gift === 'cherry') { assert.equal(s.cherries, 1); assert.equal(runnerScore(s), 50); assert.equal(s.lives, 3); }
    else assert.equal(s.lives, 2);
  }
});

test('snakes hurt on the ground and can be jumped', () => {
  const s = active(); s.items = [{ x: PLAYER_X, y: FLOOR - 18, kind: 'snake' }]; advance(s, 0.02); assert.equal(s.lives, 2);
  const jumping = active(); jumpRunner(jumping); advance(jumping, 0.2);
  jumping.items = [{ x: jumping.distance + PLAYER_X, y: FLOOR - 18, kind: 'snake' }]; advance(jumping, 0.02); assert.equal(jumping.lives, 3);
});

test('levels advance without resetting earned coins or lives and victory follows level four', () => {
  const s = active(); s.bananas = 110; s.lives = 4; s.elapsed = 59.99;
  advance(s, 0.03); assert.equal(s.level, 1); assert.equal(s.phase, 'playing');
  s.elapsed = 119.99; advance(s, 0.03); assert.equal(s.level, 2);
  s.elapsed = 179.99; advance(s, 0.03); assert.equal(s.level, 3); assert.equal(s.phase, 'playing');
  s.elapsed = 239.99; advance(s, 0.03); assert.equal(s.phase, 'victory'); assert.equal(s.bananas, 110); assert.equal(s.lives, 4);
});

test('every level starts faster than the previous level finishes', () => {
  for (let level = 1; level < LEVELS.length; level++) {
    const s = active(); s.level = level - 1; s.elapsed = level * 60 - 0.01; const before = runnerSpeed(s);
    s.level = level; s.elapsed = level * 60; assert.ok(runnerSpeed(s) > before + 40);
  }
});

for (let level = 0; level < LEVELS.length; level++) {
  test(`level ${level + 1}: reactive snake catches a single jump but double jump clears it`, () => {
    for (const double of [false, true]) {
      const s = active(); s.level = level; s.elapsed = level * 60 + 10;
      s.predators = [createPredator('snake', PLAYER_X + runnerSpeed(s) * 0.8)];
      jumpRunner(s);
      for (let i = 0; i < 180; i++) { if (double && i === 32) jumpRunner(s); stepRunner(s, 1 / 120); }
      assert.equal(s.lives, double ? 3 : 2);
    }
  });
  test(`level ${level + 1}: tiger warns before appearing, leaps, and can be ducked`, () => {
    for (const dodge of [false, true]) {
      const s = active(); s.level = level; s.elapsed = level * 60 + 10;
      const tiger = createPredator('tiger', PLAYER_X + runnerSpeed(s) * 2.5); s.predators = [tiger];
      advance(s, 0.1); assert.equal(tiger.state, 'warning'); assert.equal(s.lives, 3);
      advance(s, 0.6); assert.equal(tiger.state, 'warning');
      advance(s, 0.3); assert.equal(tiger.state, 'crouch');
      let attacked = false;
      for (let i = 0; i < 360; i++) {
        if (!attacked && tiger.state === 'attack') { attacked = true; if (dodge) duckRunner(s, true); }
        stepRunner(s, 1 / 120);
      }
      assert.ok(attacked); assert.equal(s.lives, dodge ? 3 : 2);
    }
  });
}

test('authored sections always leave clear recovery space after hazards and rivers', () => {
  const s = createRunner(); s.phase = 'playing';
  for (let i = 0; i < 40 * 120; i++) { s.invincible = 5; stepRunner(s, 1 / 120); }
  assert.ok(s.section >= 8);
  const hazards = s.items.filter(i => i.kind !== 'banana');
  for (let i = 1; i < hazards.length; i++) assert.ok(hazards[i].x - hazards[i - 1].x >= 1100);
});
