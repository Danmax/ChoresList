import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, stepRunner, FLOOR, PLAYER_X, runnerSpeed, jumpRunner, duckRunner, levelSeconds } from '../lib/jungle-runner';
import { createInsect, INSECT_KINDS, insectWarning } from '../lib/jungle-insects';

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  function active() { const s = createRunner(difficulty); s.phase = 'playing'; s.level = 5; s.elapsed = levelSeconds(s) * 5; s.items = []; s.nextSection = 100000; return s; }
  test(`${difficulty}: sixth level introduces every insect and exactly one Peridot`, () => {
    const s = active(); s.nextSection = 1100;
    const kinds = new Set<string>(); const gems = new Set<object>();
    for (let i = 0; i < levelSeconds(s) * 120 - 1; i++) {
      s.invincible = 5; stepRunner(s, 1 / 120);
      s.insects.forEach(b => kinds.add(b.kind)); s.items.filter(item => item.kind === 'gem').forEach(item => gems.add(item));
    }
    assert.deepEqual([...kinds].sort(), [...INSECT_KINDS].sort()); assert.equal(gems.size, 1); assert.equal(s.level, 5); assert.equal(s.phase, 'playing');
  });
  test(`${difficulty}: warning completes before worker throws, then rock travels`, () => {
    const s = active(); s.insects = [createInsect('worker', PLAYER_X + runnerSpeed(s) * (insectWarning(difficulty) + 0.8))];
    stepRunner(s, 1 / 120); assert.equal(s.insects[0].state, 'warning'); assert.equal(s.antRocks.length, 0);
    for (let i = 0; i < (insectWarning(difficulty) - 0.03) * 120; i++) stepRunner(s, 1 / 120);
    assert.equal(s.antRocks.length, 0);
    for (let i = 0; i < 8; i++) stepRunner(s, 1 / 120);
    assert.equal(s.antRocks.length, 1); const x = s.antRocks[0].x; stepRunner(s, 1 / 120); assert.ok(s.antRocks[0].x < x);
  });
  test(`${difficulty}: caterpillar bounce reaches Peridot height without damage`, () => {
    const s = active(); const speed = runnerSpeed(s); s.y = FLOOR - 50; s.vy = 200; s.jumps = 1;
    s.insects = [createInsect('caterpillar', PLAYER_X)];
    s.items = [{ x: PLAYER_X + speed * 0.4, y: FLOOR - 235, kind: 'gem', level: 5 }];
    for (let i = 0; i < 90; i++) stepRunner(s, 1 / 120);
    assert.equal(s.caterpillarBounces, 1); assert.equal(s.gems, 1); assert.equal(s.hits, 0);
  });
  for (const kind of ['stinger', 'katydid', 'centipede', 'fire-ant', 'beetle'] as const) {
    test(`${difficulty}: ${kind} encounter has a reachable escape`, () => {
      let escaped = false;
      for (let timing = 0; timing <= 2.5 && !escaped; timing += 0.05) {
        const s = active(); s.insects = [createInsect(kind, PLAYER_X + runnerSpeed(s) * 2.2)];
        for (let i = 0; i < 4 * 120; i++) {
          if (Math.abs(i / 120 - timing) < 1 / 240) {
            if (kind === 'stinger' || kind === 'katydid') duckRunner(s, true); else jumpRunner(s);
          }
          stepRunner(s, 1 / 120);
        }
        escaped = s.hits === 0;
      }
      assert.ok(escaped, `${kind} must allow a jump or slide escape`);
    });
  }
}

test('insect collisions set reactions, invulnerability prevents repeated hits, and restart clears them', () => {
  for (const [kind, reaction] of [['centipede', 'flatten'], ['stinger', 'sting']] as const) {
    const s = createRunner(); s.phase = 'playing'; s.items = []; s.nextSection = 100000;
    const bug = createInsect(kind, PLAYER_X); bug.y = FLOOR - 25; bug.state = 'recover'; s.insects = [bug];
    stepRunner(s, 1 / 120); assert.equal(s.reaction, reaction); assert.equal(s.hits, 1);
    for (let i = 0; i < 60; i++) stepRunner(s, 1 / 120);
    assert.equal(s.hits, 1);
  }
  const fresh = createRunner(); assert.equal(fresh.reactionLeft, 0); assert.deepEqual(fresh.insects, []);
});

test('entry to insect grove clears earlier hazards and preserves rewards', () => {
  const s = createRunner(); s.phase = 'playing'; s.level = 4; s.elapsed = 299.999; s.bananas = 33;
  s.bats = [{ x: 400, y: 100, age: 0, state: 'flying' }]; s.rivers = [{ x: 140, width: 300 }];
  stepRunner(s, 1 / 120);
  assert.equal(s.level, 5); assert.equal(s.bananas, 33); assert.equal(s.bats.length, 0); assert.equal(s.rivers.length, 0); assert.equal(s.hits, 0);
});

test('eel shocks zap, elephant hits flatten, and cat attacks trigger a tussle', async () => {
  const { createPredator } = await import('../lib/jungle-runner');
  for (const reaction of ['zap', 'flatten', 'tussle'] as const) {
    const s = createRunner(); s.phase = 'playing'; s.items = []; s.nextSection = 100000;
    if (reaction === 'zap') s.rivers = [{ x: 60, width: 300, resident: 'eel', waterAge: 1 }];
    if (reaction === 'flatten') s.herds = [{ x: PLAYER_X, age: 0, charging: false, warned: false }];
    if (reaction === 'tussle') { const p = createPredator('tiger', PLAYER_X); p.state = 'attack'; p.attackStyle = 'rush'; s.predators = [p]; }
    stepRunner(s, 1 / 120); assert.equal(s.reaction, reaction); assert.equal(s.hits, 1);
    for (let i = 0; i < 115; i++) stepRunner(s, 1 / 120);
    assert.equal(s.reactionLeft, 0);
  }
});
