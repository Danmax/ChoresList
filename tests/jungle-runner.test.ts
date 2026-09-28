import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, duckRunner, FLOOR, jumpRunner, PLAYER_X, stepRunner } from '../lib/jungle-runner';

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

test('authored sections always leave clear recovery space after hazards and rivers', () => {
  const s = createRunner(); s.phase = 'playing';
  for (let i = 0; i < 40 * 120; i++) { s.invincible = 5; stepRunner(s, 1 / 120); }
  assert.ok(s.section >= 8);
  const hazards = s.items.filter(i => i.kind !== 'banana');
  for (let i = 1; i < hazards.length; i++) assert.ok(hazards[i].x - hazards[i - 1].x >= 1100);
});
