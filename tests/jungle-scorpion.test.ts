import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, stepRunner, levelSeconds, FLOOR, PLAYER_X, jumpRunner, duckRunner } from '../lib/jungle-runner';
import { createInsect } from '../lib/jungle-insects';

function grove() {
  const s = createRunner(); s.phase = 'playing'; s.level = 5; s.elapsed = levelSeconds(s) * 5;
  s.items = []; s.nextSection = 100000; return s;
}

test('each mud encounter has a centered caterpillar which stays after bouncing', () => {
  for (const kind of ['centipede', 'mud-pit', 'caterpillar'] as const) {
    const s = grove(); s.nextSection = 950; s.insectDeck = [kind]; stepRunner(s, 1 / 120);
    const pit = s.insects.find(b => b.kind === 'mud-pit')!;
    const buddy = s.insects.find(b => b.kind === 'caterpillar' && b.x === pit.x)!;
    assert.ok(buddy);
    s.distance = buddy.x - PLAYER_X; s.y = FLOOR - 49; s.vy = 220; s.jumps = 1;
    stepRunner(s, 1 / 120);
    assert.equal(s.caterpillarBounces, 1); assert.ok(s.vy < 0); assert.equal(s.hits, 0);
    assert.ok(s.insects.includes(buddy));
  }
});

test('scorpion attacks warn, hurt standing players, and have a timed escape', () => {
  for (const attack of [0, 1]) {
    for (const dodge of [false, true]) {
      const s = grove(); const bug = createInsect('scorpion', PLAYER_X + 570, attack); s.insects = [bug];
      let warned = false, reacted = false;
      for (let i = 0; i < 240; i++) {
        if (bug.state === 'warning') {
          warned = true;
          if (dodge && !reacted && bug.age > 0.25) { if (attack) duckRunner(s, true); else jumpRunner(s); reacted = true; }
          if (dodge && !attack && bug.age > 0.55 && s.jumps === 1) jumpRunner(s);
        }
        stepRunner(s, 1 / 120);
      }
      assert.ok(warned); assert.equal(s.hits, dodge ? 0 : 1, `attack ${attack}, dodge ${dodge}`);
      if (!dodge) assert.equal(s.reaction, attack ? 'zap' : 'snap');
    }
  }
});

test('mud pits can be crossed by landing on the caterpillar at every difficulty', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    let escaped = false;
    for (let delay = 0; delay < 1 && !escaped; delay += 0.025) {
      const s = grove(); s.difficulty = difficulty; s.elapsed = levelSeconds(s) * 5;
      const x = PLAYER_X + 420;
      s.insects = [createInsect('mud-pit', x), createInsect('caterpillar', x)];
      for (let i = 0; i < 300; i++) {
        if (i === Math.round(delay * 120)) jumpRunner(s);
        stepRunner(s, 1 / 120);
      }
      escaped = s.hits === 0 && s.caterpillarBounces === 1 && s.distance + PLAYER_X > x + 170;
    }
    assert.ok(escaped, `${difficulty} needs a reachable bounce route`);
  }
});
