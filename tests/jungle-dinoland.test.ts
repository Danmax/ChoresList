import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, duckRunner, FLOOR, jumpRunner, levelSeconds, PLAYER_X, punchRunner, stepRunner } from '../lib/jungle-runner';
import { createDino } from '../lib/jungle-dinoland';
import { dinoAnimationFrame } from '../lib/jungle-dino-art';

function dinoland(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
  const s = createRunner(difficulty, 6, 6);
  s.phase = 'playing'; s.level = 6; s.elapsed = 6 * levelSeconds(s);
  s.items = []; s.nextSection = 100000;
  return s;
}
function advance(s: ReturnType<typeof dinoland>, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) stepRunner(s, 1 / 120);
}

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  test(`${difficulty}: DinoLand introduces every creature, tar, eruption, and one Sunstone before the boss`, () => {
    const s = dinoland(difficulty); s.nextSection = 950; s.invincible = 100;
    const seen = new Set<string>(); const gems = new Set<object>();
    for (let i = 0; i < levelSeconds(s) * 0.69 * 120; i++) {
      stepRunner(s, 1 / 120);
      s.dinos.forEach(d => seen.add(d.kind));
      s.items.filter(item => item.kind === 'gem' && item.level === 6).forEach(g => gems.add(g));
    }
    for (const kind of ['triceratops', 'sauropod', 'baboon', 'sabertooth', 'pterodactyl', 'mammoth', 'trex']) assert.ok(seen.has(kind), `${kind} must appear`);
    assert.ok(s.dinoEncounterIndex >= 8);
    assert.equal(gems.size, 1);
    assert.equal(s.dinoBossStarted, true);
    assert.equal(s.phase, 'playing');
  });
}

test('tar slows grounded travel and a timely jump escapes the sink', () => {
  const slow = dinoland(); slow.tarPits = [{ x: PLAYER_X - 10, width: 1000 }];
  const clear = dinoland();
  advance(slow, 0.5); advance(clear, 0.5);
  assert.ok(slow.distance < clear.distance * 0.75);
  assert.equal(slow.hits, 0);
  jumpRunner(slow); advance(slow, 0.6);
  assert.equal(slow.hits, 0);
  const trapped = dinoland(); trapped.tarPits = [{ x: PLAYER_X - 10, width: 1000 }];
  advance(trapped, 1);
  assert.equal(trapped.hits, 1);
});

test('volcano warns, drops lava, and shakes the ground', () => {
  const s = dinoland(); s.eruptions = [{ x: PLAYER_X + 700, age: 0, active: false, fired: false }];
  stepRunner(s, 1 / 120);
  assert.equal(s.eruptions[0].active, true);
  assert.equal(s.eruptions[0].fired, false);
  advance(s, 0.7);
  assert.equal(s.eruptions[0].fired, true);
  assert.ok(s.dinoProjectiles.some(p => p.kind === 'lava'));
  assert.ok(s.groundShake > 0);
});

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  for (const [kind, action] of [['triceratops', 'double'], ['sabertooth', 'slide'], ['pterodactyl', 'slide'], ['mammoth', 'double'], ['baboon', 'slide']] as const) {
    test(`${difficulty}: ${kind} hits a runner who ignores it and has a ${action} route`, () => {
      const baseline = dinoland(difficulty);
      baseline.dinos = [createDino(kind, PLAYER_X + 750, difficulty)];
      advance(baseline, 3.4);
      assert.equal(baseline.hits, 1);
      let cleared = false;
      for (let timing = 0; timing < 1.4 && !cleared; timing += 0.05) {
        const s = dinoland(difficulty);
        s.dinos = [createDino(kind, PLAYER_X + 750, difficulty)];
        for (let frame = 0; frame < 400; frame++) {
          const time = frame / 120;
          if (Math.abs(time - timing) < 1 / 240) {
            if (action === 'slide') duckRunner(s, true); else jumpRunner(s);
          }
          if (action === 'double' && Math.abs(time - timing - 0.3) < 1 / 240) jumpRunner(s);
          stepRunner(s, 1 / 120);
        }
        cleared = s.hits === 0 && s.distance > 750;
      }
      assert.ok(cleared, `${kind} needs a readable ${action} escape`);
    });
  }
}

test('the long-neck back launches a player over tar', () => {
  const s = dinoland(); s.dinos = [createDino('sauropod', PLAYER_X + 1)];
  s.tarPits = [{ x: PLAYER_X - 10, width: 440 }];
  s.y = FLOOR - 103; s.vy = 300; s.jumps = 1;
  stepRunner(s, 1 / 120);
  assert.ok(s.vy < 0);
  assert.equal(s.hits, 0);
});

test('DinoLand poses change for warnings, attacks, recovery, and movement', () => {
  const dino = createDino('triceratops', PLAYER_X + 200);
  assert.equal(dinoAnimationFrame(dino, 0), 0);
  assert.equal(dinoAnimationFrame(dino, 0.4), 1);
  dino.state = 'warn'; assert.equal(dinoAnimationFrame(dino, 0), 1);
  dino.state = 'attack'; assert.equal(dinoAnimationFrame(dino, 0), 2);
  dino.state = 'recover'; assert.equal(dinoAnimationFrame(dino, 0), 3);
});

test('punches connect at the front of a dinosaur and only landed hits build a streak', () => {
  const far = dinoland(); far.invincible = 100;
  far.dinos = [createDino('triceratops', PLAYER_X + 180)];
  punchRunner(far); stepRunner(far, 1 / 120);
  assert.equal(far.dinos[0].hits, 0);
  assert.equal(far.hitCombo, 0);
  assert.equal(far.hitStreak, 0);

  const near = dinoland(); near.invincible = 100;
  near.dinos = [createDino('triceratops', PLAYER_X + 100)];
  punchRunner(near); stepRunner(near, 1 / 120);
  assert.equal(near.dinos[0].hits, 1);
  assert.equal(near.hitCombo, 1);
  assert.equal(near.hitStreak, 1);
  assert.equal(near.bestHitStreak, 1);
  advance(near, 1.3);
  near.dinos = [createDino('triceratops', near.distance + PLAYER_X + 100)];
  punchRunner(near); stepRunner(near, 1 / 120);
  assert.equal(near.hitCombo, 1, 'combo window expires before the next encounter');
  assert.equal(near.hitStreak, 2, 'streak spans nearby encounters');
  assert.equal(near.bestHitStreak, 2);
  near.dinos[0].x = near.distance + PLAYER_X + 500;
  advance(near, 0.35);
  punchRunner(near); advance(near, 0.3);
  assert.equal(near.hitStreak, 0);
  assert.equal(near.bestHitStreak, 2);
});

test('T. rex requires counters to win and its stomp and bite have distinct escapes', () => {
  const s = dinoland('hard'); s.invincible = 100;
  s.elapsed = 7 * levelSeconds(s) - 0.01;
  advance(s, 0.02);
  assert.equal(s.phase, 'playing');
  assert.equal(s.dinoBossStarted, true);
  const boss = s.dinos.find(d => d.kind === 'trex')!;
  for (let i = 0; i < 20 * 120 && s.phase === 'playing'; i++) {
    if (boss.state === 'recover' && boss.hitCooldown === 0) punchRunner(s);
    stepRunner(s, 1 / 120);
  }
  assert.equal(boss.hits, 4);
  assert.equal(s.dinoBossDefeated, true);
  assert.equal(s.phase, 'victory');

  const stomp = dinoland(); stomp.dinoBossStarted = true; stomp.dinos = [createDino('trex', PLAYER_X + 220)];
  stomp.dinos[0].state = 'attack'; stomp.dinos[0].cycle = 0;
  stepRunner(stomp, 1 / 120); assert.equal(stomp.hits, 1);
  const jumped = dinoland(); jumped.dinoBossStarted = true; jumped.dinos = [createDino('trex', PLAYER_X + 220)];
  jumped.dinos[0].state = 'attack'; jumped.dinos[0].cycle = 0; jumped.y = FLOOR - 110; jumped.jumps = 1;
  stepRunner(jumped, 1 / 120); assert.equal(jumped.hits, 0);
  const slid = dinoland(); slid.dinoBossStarted = true; slid.dinos = [createDino('trex', PLAYER_X + 220)];
  slid.dinos[0].state = 'attack'; slid.dinos[0].cycle = 1; duckRunner(slid, true);
  stepRunner(slid, 1 / 120); assert.equal(slid.hits, 0);
});
