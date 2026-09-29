import test from 'node:test';
import assert from 'node:assert/strict';
import { pantherPaw } from '../lib/jungle-motion';
import { GEM_Y, createOrangutan, orangutanHand, piranhaPosition, eelPhase, createHogs, createBats, GEMS, hasAllGems, spiderPosition, ELEPHANT_TOP, crocodileFrame, hippoFrame, createRunner, createPredator, dashBoost, duckRunner, FLOOR, isAirAttack, jumpRunner, LEVELS, levelSeconds, PLAYER_X, runnerScore, runnerSpeed, stepRunner, STRONG_DIVE_SECONDS, travelSpeed } from '../lib/jungle-runner';

function active() { const s = createRunner(); s.phase = 'playing'; s.items = []; s.nextSection = 100000; return s; }
function advance(s: ReturnType<typeof active>, seconds: number, fps = 120) { for (let i = 0; i < seconds * fps; i++) stepRunner(s, 1 / fps); }

test('difficulty changes pace, starting lives, and protection after collisions', () => {
  assert.deepEqual(createRunner(), createRunner('medium'));
  const results = (['easy', 'medium', 'hard'] as const).map((difficulty) => {
    const s = createRunner(difficulty);
    s.phase = 'playing';
    s.nextSection = 100000;
    s.items = [];
    advance(s, 1);
    const distance = s.distance;
    const lives = s.lives;
    s.items = [{ x: s.distance + PLAYER_X, y: FLOOR - 64, kind: 'high' }];
    stepRunner(s, 1 / 120);
    assert.equal(s.lives, lives - 1);
    assert.equal(s.hits, 1);
    return { distance, lives, protection: s.invincible };
  });
  assert.deepEqual(results.map((result) => result.lives), [5, 3, 2]);
  assert.deepEqual(results.map((result) => result.protection), [3.5, 2.5, 1.5]);
  assert.ok(results[0].distance < results[1].distance);
  assert.ok(results[1].distance < results[2].distance);
});

test('difficulty sets 42, 51, and 60 second levels', () => {
  assert.deepEqual((['easy', 'medium', 'hard'] as const).map(difficulty => levelSeconds(createRunner(difficulty))), [42, 51, 60]);
});

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

test('ally gifts grant a heart, fruit bonus, and a full ten seconds of star protection', () => {
  const heart = active(); heart.items = [{ x: PLAYER_X, y: FLOOR - 32, kind: 'heart' }]; advance(heart, 0.02);
  assert.equal(heart.lives, 4);
  const fruit = active(); fruit.items = [{ x: PLAYER_X, y: FLOOR - 32, kind: 'fruit' }]; advance(fruit, 0.02);
  assert.equal(fruit.bananas, 5); assert.equal(fruit.bonusScore, 25);
  const star = active(); star.items = [{ x: PLAYER_X, y: FLOOR - 32, kind: 'star' }]; advance(star, 0.02);
  assert.ok(star.invincible > 9.9); advance(star, 9.5); assert.ok(star.invincible > 0); advance(star, 0.6); assert.equal(star.invincible, 0);
});

test('sloths wait for the approaching monkey, lower a gift, then climb back up', () => {
  const s = active();
  s.sloths = [{ x: PLAYER_X + 700, y: 22, homeY: 22, targetY: FLOOR - 92, age: 0, state: 'waiting', reward: 'heart', dropped: false }];
  advance(s, 0.1); assert.equal(s.sloths[0].y, 22);
  s.sloths[0].x = s.distance + PLAYER_X + 600;
  advance(s, 1.5); assert.equal(s.sloths[0].dropped, true); assert.equal(s.sloths[0].state, 'climbing');
  advance(s, 1); assert.equal(s.sloths[0].y, 22);
});

test('sloths deliver their reward before a fast runner passes them', () => {
  const s = active(); s.level = 5; s.elapsed = levelSeconds(s) * 5 + 45; s.difficulty = 'hard';
  const speed = runnerSpeed(s);
  s.sloths = [{ x: s.distance + PLAYER_X + 700, y: 22, homeY: 22, targetY: FLOOR - 92, age: 0, state: 'waiting', reward: 'star', dropped: false }];
  advance(s, 1.1);
  assert.equal(s.sloths[0].dropped, true); assert.ok(s.distance + PLAYER_X < s.sloths[0].x);
  advance(s, 0.5); assert.ok(s.invincible > 9.5);
});

test('a jumping monkey can catch a lemming lift and swing safely past a herd', () => {
  const s = active(); s.lemmings = [{ x: PLAYER_X + 10, y: FLOOR - 112, endX: PLAYER_X + 700, age: 0, used: false }];
  jumpRunner(s); advance(s, 0.25);
  assert.ok(s.swing && 'lemming' in s.swing);
  advance(s, 1); assert.equal(s.swing, null); assert.ok(s.distance > 500);
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
  const s = active(); s.elapsed = levelSeconds(s) * 4 - 2; s.level = 3; s.rivers = [{ x: PLAYER_X + 10, width: runnerSpeed(s) * 1.05 }]; jumpRunner(s);
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

test('waiting snakes hurt on the ground and invulnerability prevents repeat damage', () => {
  const s = active(); s.predators = [createPredator('snake', PLAYER_X)]; advance(s, 0.02); assert.equal(s.lives, 2);
  advance(s, 1); assert.equal(s.lives, 2);
});

test('levels advance without resetting earned coins or lives and victory follows the insect sixth level', () => {
  const s = active(), seconds = levelSeconds(active()); s.bananas = 110; s.lives = 4; s.elapsed = seconds - 0.01;
  advance(s, 0.03); assert.equal(s.level, 1); assert.equal(s.phase, 'playing');
  s.elapsed = seconds * 2 - 0.01; advance(s, 0.03); assert.equal(s.level, 2);
  s.elapsed = seconds * 3 - 0.01; advance(s, 0.03); assert.equal(s.level, 3); assert.equal(s.phase, 'playing');
  s.elapsed = seconds * 4 - 0.01; advance(s, 0.03); assert.equal(s.phase, 'playing'); assert.equal(s.level, 4);
  s.elapsed = seconds * 6 - 0.01; advance(s, 0.03); assert.equal(s.phase, 'victory'); assert.equal(s.bananas, 110); assert.equal(s.lives, 4);
});

test('every level starts faster than the previous level finishes', () => {
  for (let level = 1; level < LEVELS.length; level++) {
    const s = active(); s.level = level - 1; s.elapsed = level * levelSeconds(s) - 0.01; const before = runnerSpeed(s);
    s.level = level; s.elapsed = level * levelSeconds(s); assert.ok(runnerSpeed(s) > before + 40);
  }
});

for (let level = 0; level < LEVELS.length; level++) {
  test(`level ${level + 1}: reactive snake catches a single jump but double jump clears it`, () => {
    for (const double of [false, true]) {
      const s = active(); s.level = level; s.elapsed = level * levelSeconds(s) + 10;
      s.predators = [createPredator('snake', PLAYER_X + runnerSpeed(s) * 0.8)];
      jumpRunner(s);
      for (let i = 0; i < 180; i++) { if (double && i === 32) jumpRunner(s); stepRunner(s, 1 / 120); }
      assert.equal(s.lives, double ? 3 : 2);
    }
  });
  test(`level ${level + 1}: tiger warns, leaps into airborne players, and can be ducked`, () => {
    for (const dodge of [false, true]) {
      const s = active(); s.level = level; s.elapsed = level * levelSeconds(s) + 10;
      const tiger = createPredator('tiger', PLAYER_X + runnerSpeed(s) * 2.5, 0.5); s.predators = [tiger];
      advance(s, 0.1); assert.equal(tiger.state, 'warning'); assert.equal(s.lives, 3);
      advance(s, 0.6); assert.equal(tiger.state, 'warning');
      advance(s, 0.3); assert.equal(tiger.state, 'crouch');
      let attacked = false;
      for (let i = 0; i < 360; i++) {
        if (!attacked && tiger.state === 'attack') { attacked = true; if (dodge) duckRunner(s, true); else jumpRunner(s); }
        stepRunner(s, 1 / 120);
      }
      assert.ok(attacked); assert.equal(s.lives, dodge ? 3 : 2);
    }
  });
}

test('authored sections always leave clear recovery space after hazards and rivers', () => {
  const s = createRunner(); s.phase = 'playing';
  for (let i = 0; i < 40 * 120; i++) { s.invincible = 5; stepRunner(s, 1 / 120); }
  assert.ok(s.section >= 6);
  const hazards = s.items.filter(i => !['banana', 'gem', 'golden', 'cherry'].includes(i.kind));
  for (let i = 1; i < hazards.length; i++) assert.ok(hazards[i].x - hazards[i - 1].x >= 1100);
});

test('slide surges forward, eases down, and returns to running speed after 1.5 seconds', () => {
  const dash = active(), run = active(); duckRunner(dash, true);
  assert.equal(dashBoost(dash), 180);
  advance(dash, 0.3); const early = dashBoost(dash);
  assert.ok(dash.cameraLead > 0);
  advance(dash, 0.6); assert.ok(dashBoost(dash) < early);
  advance(dash, 0.7); advance(run, 1.6);
  assert.equal(dashBoost(dash), 0); assert.equal(travelSpeed(dash), runnerSpeed(dash));
  assert.ok(dash.distance > run.distance + 95);
  assert.ok(dash.distance < run.distance + 115);
});

test('crocodiles snap once as the monkey jumps above each bank', () => {
  const s = active(); s.rivers = [{ x: PLAYER_X + 10, width: 250 }]; jumpRunner(s);
  advance(s, 0.1); const r = s.rivers[0];
  assert.equal(r.snapped?.[0], true); assert.ok((r.snapLeft?.[0] ?? 0) > 0);
  assert.equal(crocodileFrame(0.55), 1); assert.equal(crocodileFrame(0.35), 2); assert.equal(crocodileFrame(0.1), 3); assert.equal(crocodileFrame(0), 0);
  advance(s, 1.1); assert.equal(r.snapped?.[1], true); assert.equal(r.snapLeft?.[0], 0); assert.equal(s.lives, 3);
});

test('hippo opens on approach, springs on contact, and finishes its bounce animation', () => {
  const s = active(); s.rivers = [{ x: PLAYER_X + 10, width: 250 }]; const r = s.rivers[0];
  assert.equal(hippoFrame(r, PLAYER_X), 1);
  jumpRunner(s);
  let sawOpen = false;
  for (let i = 0; i < 120 && s.bounces === 0; i++) {
    stepRunner(s, 1 / 120);
    if (hippoFrame(r, s.distance + PLAYER_X) === 2) sawOpen = true;
  }
  assert.ok(sawOpen); assert.equal(s.bounces, 1); assert.equal(hippoFrame(r, s.distance + PLAYER_X), 3);
  advance(s, 0.5); assert.equal(r.bounceLeft, 0);
});

test('star power still permits hippo bounces and vine swings', () => {
  const bounce = active(); bounce.invincible = 10; bounce.rivers = [{ x: PLAYER_X + 10, width: 250 }];
  jumpRunner(bounce); advance(bounce, 1.7); assert.ok(bounce.bounces >= 1); assert.equal(bounce.lives, 3);
  const vine = active(); vine.invincible = 10; const river = { x: PLAYER_X + 260, width: 680, vine: true }; vine.rivers = [river];
  let grabbed = false;
  for (let delay = 0; delay < 1.8 && !grabbed; delay += 0.025) {
    const attempt = active(); attempt.invincible = 10; attempt.rivers = [{ ...river }]; advance(attempt, delay); jumpRunner(attempt);
    for (let i = 0; i < 6 * 120; i++) { stepRunner(attempt, 1 / 120); grabbed ||= attempt.swing !== null; }
  }
  assert.equal(grabbed, true);
});

test('bird coconut falls first, then bounces toward the player; cherries do not rebound', () => {
  for (const gift of ['drop', 'cherry'] as const) {
    const s = active(); s.invincible = 10; s.birds = [{ x: 620, y: 70, gift, dropped: false }];
    stepRunner(s, 1 / 120); const item = s.items[0]; const initialX = item.x;
    assert.ok((s.birds[0].releaseLeft ?? 0) > 0);
    advance(s, 0.5); assert.equal(item.kind, gift); assert.equal(item.x, initialX);
    advance(s, 0.5);
    if (gift === 'drop') { assert.equal(item.kind, 'bouncing'); assert.ok(item.x < initialX); assert.ok(item.y < FLOOR - 20); }
    else { assert.equal(item.kind, 'cherry'); assert.equal(item.x, initialX); assert.equal(item.y, FLOOR - 20); }
  }
});

test('strong dive gives a brief airborne forward surge and ends when released', () => {
  const s = active(); duckRunner(s, true); advance(s, 0.1); jumpRunner(s);
  assert.equal(dashBoost(s), 0);
  advance(s, 0.1); duckRunner(s, false); duckRunner(s, true);
  assert.equal(dashBoost(s), 180); assert.ok(s.vy >= 650);
  advance(s, STRONG_DIVE_SECONDS + 0.05); assert.ok(dashBoost(s) > 0 && dashBoost(s) < 180);
  duckRunner(s, false); assert.equal(dashBoost(s), 0);
});

test('an air-started dive stays active for its 0.42-second strike window', () => {
  const s = active(); jumpRunner(s); advance(s, 0.06);
  duckRunner(s, true);
  assert.equal(isAirAttack(s), true);
  duckRunner(s, false);
  advance(s, STRONG_DIVE_SECONDS - 0.04);
  assert.equal(isAirAttack(s), true);
  advance(s, 0.05);
  assert.equal(isAirAttack(s), false);
});

test('air strikes defeat snakes and panthers with level-scaled 1–3 hit pips', () => {
  assert.deepEqual([0, 2, 4].map(level => createPredator('snake', 0, 0.5, level).hitPoints), [1, 2, 3]);
  const s = active(); jumpRunner(s); advance(s, 0.06);
  const panther = createPredator('panther', s.distance + PLAYER_X + 35, 0.5, 4);
  panther.state = 'recover';
  s.predators = [panther];
  duckRunner(s, true);
  advance(s, 0.32);
  assert.equal(panther.hits, 3);
  assert.equal(panther.knocked, true);
  assert.match(s.message, /PANTHER STRIKE/);
});

test('strong dive smashes coconuts and barrels, then leaves them dangerous', () => {
  for (const kind of ['rolling', 'barrel'] as const) {
    const smash = active(); duckRunner(smash, true);
    smash.items = [{ x: PLAYER_X + 2, y: FLOOR - (kind === 'barrel' ? 28 : 20), kind }];
    advance(smash, 0.02);
    assert.equal(smash.lives, 3); assert.equal(smash.items.length, 0); assert.equal(smash.cracks[0].kind, kind === 'barrel' ? 'barrel' : 'coconut');
  }
  const late = active(); duckRunner(late, true); advance(late, STRONG_DIVE_SECONDS + 0.02);
  late.items = [{ x: late.distance + PLAYER_X + 2, y: FLOOR - 20, kind: 'rolling' }]; advance(late, 0.02);
  assert.equal(late.lives, 2);
});

test('rolling coconuts approach and rotate; bouncing coconuts repeatedly land and rebound', () => {
  const s = active(); s.invincible = 10;
  const roll = { x: 700, y: FLOOR - 20, kind: 'rolling' as const, rotation: 0 };
  const bounce = { x: 750, y: FLOOR - 20, kind: 'bouncing' as const, vy: -360, rotation: 0 };
  s.items = [roll, bounce]; advance(s, 0.35);
  assert.ok(roll.x < 700); assert.ok(roll.rotation < 0); assert.equal(roll.y, FLOOR - 20);
  assert.ok(bounce.y < FLOOR - 60); advance(s, 0.55);
  assert.ok(bounce.vy < 0); assert.ok(bounce.y <= FLOOR - 20);
});

for (const kind of ['rolling', 'bouncing'] as const) {
  test(`${kind} coconut can hit but can also be cleared with a jump`, () => {
    const hit = active(); hit.items = [{ x: PLAYER_X + 2, y: FLOOR - 20, kind, vy: -360 }];
    advance(hit, 0.02); assert.equal(hit.lives, 2);
    const dodge = active(); jumpRunner(dodge); advance(dodge, 0.2);
    dodge.items = [{ x: dodge.distance + PLAYER_X + 10, y: FLOOR - 20, kind, vy: -360 }];
    advance(dodge, 0.3); assert.equal(dodge.lives, 3);
  });
}

test('coconut impact leaves a cracking shell that expires during hit stun', () => {
  const s = active(); s.items = [{ x: PLAYER_X, y: FLOOR - 20, kind: 'rolling' }];
  advance(s, 0.02); assert.equal(s.cracks.length, 1); assert.equal(s.items.length, 0);
  advance(s, 0.3); assert.ok(s.cracks[0].age > 0.2); assert.equal(s.hits, 1);
  advance(s, 0.5); assert.equal(s.cracks.length, 0);
});

test('second jump starts a forward burst and a flip, which diving cancels', () => {
  const s = active(); jumpRunner(s); advance(s, 0.2); jumpRunner(s);
  assert.equal(s.flipLeft, 0.5); assert.ok(travelSpeed(s) > runnerSpeed(s) + 170);
  advance(s, 0.15); assert.ok(s.cameraLead > 0); assert.ok(s.flipLeft < 0.5);
  duckRunner(s, true); assert.equal(s.flipLeft, 0);
});

for (let level = 0; level < LEVELS.length; level++) {
  test(`level ${level + 1}: a timed jump can catch a vine and cross the wide pit`, () => {
    let cleared = false;
    for (let delay = 0; delay < 1.8 && !cleared; delay += 0.025) {
      const s = active(); s.level = level; s.elapsed = level * 60;
      const river = { x: PLAYER_X + 260, width: 680, vine: true }; s.rivers = [river];
      advance(s, delay); jumpRunner(s);
      let caught = false;
      for (let i = 0; i < 6 * 120; i++) { stepRunner(s, 1 / 120); caught ||= s.swing !== null; }
      cleared = caught && s.lives === 3 && s.distance + PLAYER_X > river.x + river.width;
    }
    assert.ok(cleared, 'vine needs a reachable catch window');
  });
  for (const temperament of [0, 1]) {
    test(`level ${level + 1}: tiger temperament ${temperament} remains dodgeable`, () => {
      const s = active(); s.level = level; s.elapsed = level * 60;
      const tiger = createPredator('tiger', PLAYER_X + runnerSpeed(s) * 2.5, temperament); s.predators = [tiger];
      let dodged = false;
      for (let i = 0; i < 480; i++) {
        if (!dodged && tiger.state === 'attack') { duckRunner(s, true); dodged = true; }
        stepRunner(s, 1 / 120);
      }
      assert.ok(dodged); assert.equal(s.lives, 3);
    });
  }
}

test('panther patrols, sees only in front, then charges after a short tell', () => {
  const s = active(); const p = createPredator('panther', PLAYER_X + 230); s.predators = [p];
  advance(s, 0.2); assert.equal(p.state, 'waiting'); assert.ok(p.x > p.homeX);
  p.age = 1.2; advance(s, 0.02); assert.equal(p.state, 'warning');
  const x = p.x; advance(s, 0.49); assert.equal(p.state, 'attack');
  advance(s, 0.1); assert.ok(p.x < x - 30);
});

test('jump releases a caught vine and a missed vine has no hippo rescue', () => {
  const s = active(); const river = { x: PLAYER_X, width: 680, vine: true, used: true };
  s.rivers = [river]; s.swing = { river, progress: 0.5 }; s.jumps = 2;
  jumpRunner(s); assert.equal(s.swing, null); assert.equal(s.jumps, 1); assert.equal(s.vy, -540);
  const fall = active(); fall.rivers = [{ x: PLAYER_X, width: 680, vine: true }];
  advance(fall, 0.6); assert.equal(fall.lives, 2); assert.equal(fall.bounces, 0);
});

for (let level = 0; level < LEVELS.length; level++) {
  test(`level ${level + 1}: elephant herd punishes running and permits a timed double-jump escape`, () => {
    const hit = active(); hit.level = level; hit.elapsed = level * 60;
    hit.herds = [{ x: PLAYER_X + 600, age: 0, charging: false, warned: false }];
    advance(hit, 3); assert.ok(hit.hits >= 1);
    let escaped = false;
    for (let delay = 0; delay < 2 && !escaped; delay += 0.025) {
      const s = active(); s.level = level; s.elapsed = level * 60;
      const herd = { x: PLAYER_X + 600, age: 0, charging: false, warned: false }; s.herds = [herd];
      advance(s, delay); jumpRunner(s); advance(s, 0.25); jumpRunner(s); advance(s, 3);
      escaped = s.lives === 3 && s.elephantBounces > 0 && s.distance + PLAYER_X > herd.x + 420;
    }
    assert.ok(escaped, 'double jumping must offer a safe path across the herd');
  });
}

test('elephant warning precedes charge and landing on a back restores an air jump', () => {
  const s = active(); const herd = { x: PLAYER_X + 600, age: 0, charging: false, warned: false }; s.herds = [herd];
  advance(s, 0.5); assert.equal(herd.warned, true); assert.equal(herd.charging, false);
  advance(s, 0.4); assert.equal(herd.charging, true);
  s.distance = herd.x - PLAYER_X; s.y = ELEPHANT_TOP - 1; s.vy = 150; s.jumps = 2;
  stepRunner(s, 1 / 120); assert.equal(s.elephantBounces, 1); assert.equal(s.jumps, 1); assert.ok(s.vy < 0);
});

test('spiders swing along silk arcs and standing contact hurts while sliding clears them', () => {
  const spider = { x: PLAYER_X, phase: 0 };
  assert.notEqual(spiderPosition(spider, 0).x, spiderPosition(spider, 0.5).x);
  for (const slide of [false, true]) {
    const s = active(); s.level = 4; s.elapsed = 240; s.spiders = [{ x: PLAYER_X, phase: -600 }];
    if (slide) duckRunner(s, true);
    advance(s, 0.05); assert.equal(s.lives, slide ? 3 : 2);
  }
});

test('moonlit level authors spiders and cleans up passed herds and webs', () => {
  const s = active(); s.level = 3; s.elapsed = 239.999; s.nextSection = 500;
  advance(s, 0.03); assert.equal(s.level, 4);
  // Encounters are shuffled per run, so verify the moonlit cleanup behavior
  // independently of whichever valid obstacle appears first.
  s.spiders = [{ x: 0, phase: 0 }];
  s.nextSection = 100000; s.distance = 5000; s.herds = [{ x: 0, age: 0, charging: false, warned: false }];
  stepRunner(s, 1 / 120); assert.equal(s.herds.length, 0); assert.equal(s.spiders.length, 0);
});

test('tiger leap is higher and completes sooner than the previous pounce', () => {
  const s = active(); const tiger = createPredator('tiger', 900, 0.5); tiger.state = 'attack'; s.predators = [tiger];
  advance(s, 0.45); assert.ok(tiger.y < FLOOR - 145); assert.ok(tiger.x < 900 - runnerSpeed(s) * 0.7 * 0.45);
  advance(s, 0.51); assert.equal(tiger.state, 'recover');
});


test('hog herds have four runners followed by two randomly timed jumpers', () => {
  const low = createHogs(700, 205, () => 0), high = createHogs(700, 205, () => 1);
  assert.equal(low.length, 6); assert.equal(low.filter(h => !h.jumper).length, 4);
  assert.equal(low.filter(h => h.jumper).length, 2); assert.notEqual(low[4].jumpIn, high[4].jumpIn);
  const s = active(); s.invincible = 10; s.hogs = low;
  low.forEach((h, i) => { h.x = 500 + i * 20; });
  advance(s, 0.65); assert.ok(low[4].y < FLOOR - 25); assert.equal(low[0].y, FLOOR - 25);
  const y = low[4].y; advance(s, 0.2); assert.notEqual(low[4].y, y);
});

test('hogs stay in their section until approach, hurt on contact, and can be bounced on', () => {
  const s = active(); s.hogs = createHogs(3000, 205); advance(s, 0.5); assert.equal(s.hogs[0].x, 3000);
  const hit = active(); hit.hogs = createHogs(PLAYER_X, 205); advance(hit, 0.02); assert.equal(hit.hits, 1);
  const bounce = active(); bounce.hogs = [createHogs(PLAYER_X, 205)[0]];
  bounce.y = FLOOR - 50; bounce.vy = 350; bounce.jumps = 2;
  advance(bounce, 0.02); assert.equal(bounce.hits, 0); assert.ok(bounce.vy < 0); assert.equal(bounce.jumps, 1);
});

for (let level = 0; level < LEVELS.length; level++) {
  test(`level ${level + 1}: compact hog herds can be crossed with jumps and back bounces`, () => {
    let cleared = false;
    for (let timing = 0.2; timing <= 0.55 && !cleared; timing += 0.025) {
      const s = active(); s.level = level; s.elapsed = level * 60;
      s.hogs = createHogs(PLAYER_X + 600, runnerSpeed(s));
      for (const h of s.hogs) h.jumpIn = 100;
      for (let i = 0; i < 10 * 120; i++) {
        const next = s.hogs.find(h => h.x > s.distance + PLAYER_X - 35);
        if (next && next.x - s.distance - PLAYER_X < (runnerSpeed(s) + 105) * timing && (s.jumps === 0 || (s.jumps === 1 && s.vy > 100))) jumpRunner(s);
        stepRunner(s, 1 / 120);
      }
      cleared = s.hits === 0 && s.hogs.length === 0;
    }
    assert.ok(cleared, 'compact herd must retain a clean jump route');
  });
}

test('full run spawns exactly one gem per level and bats only at night', () => {
  const s = createRunner(); s.phase = 'playing';
  const seen = new Set<object>(), counts = GEMS.map(() => 0); let nightBats = false;
  for (let i = 0; i < 361 * 120; i++) {
    s.invincible = 5; stepRunner(s, 1 / 120);
    for (const item of s.items) if (item.kind === 'gem' && !seen.has(item)) { seen.add(item); counts[item.level!]++; }
    if (s.bats.length) { assert.equal(s.level, 4); nightBats = true; }
  }
  assert.deepEqual(counts, [1, 1, 1, 1, 1, 1]); assert.ok(nightBats); assert.equal(s.phase, 'victory');
});

test('gem collection awards 250 points once per level, and restart clears progress', () => {
  const s = active();
  for (let level = 0; level < LEVELS.length; level++) {
    s.level = level; s.elapsed = level * 60;
    for (let duplicate = 0; duplicate < 2; duplicate++) {
      s.items = [{ x: s.distance + PLAYER_X, y: FLOOR - 40, kind: 'gem', level }];
      stepRunner(s, 1 / 120);
    }
  }
  assert.equal(s.gems, 6); assert.equal(runnerScore(s), 1500); assert.equal(s.bananas, 0);
  assert.deepEqual(s.gemCollected, [true, true, true, true, true, true]); assert.equal(createRunner().gems, 0);
  assert.equal(hasAllGems(s), true);
  s.phase = 'victory'; stepRunner(s, 0.5); assert.equal(s.celebrationTime, 0.5);
});

test('high gems require a timed double jump, not a single jump', () => {
  const single = active(); jumpRunner(single);
  for (let i = 0; i < 120; i++) {
    single.items = [{ x: single.distance + PLAYER_X, y: GEM_Y, kind: 'gem', level: 0 }]; stepRunner(single, 1 / 120);
  }
  assert.equal(single.gems, 0);
  const double = active(); jumpRunner(double); advance(double, 0.3); jumpRunner(double); advance(double, 0.28);
  double.items = [{ x: double.distance + PLAYER_X, y: GEM_Y, kind: 'gem', level: 0 }];
  advance(double, 0.02); assert.equal(double.gems, 1); assert.equal(double.hits, 0);
});

test('bat waves telegraph then dive, and a timed slide clears all four', () => {
  for (const slide of [false, true]) {
    const s = active(); s.level = 4; s.elapsed = 240; s.bats = createBats(PLAYER_X + 600);
    let warned = false, diving = false, ducked = false;
    for (let i = 0; i < 3 * 120; i++) {
      warned ||= s.bats.some(b => b.state === 'warning'); diving ||= s.bats.some(b => b.state === 'diving');
      if (slide && !ducked && s.bats.some(b => b.state === 'diving' && b.x - s.distance - PLAYER_X < 220)) { duckRunner(s, true); ducked = true; }
      stepRunner(s, 1 / 120);
    }
    assert.ok(warned && diving); assert.equal(s.hits, slide ? 0 : 1);
    if (slide) assert.equal(s.bats.length, 0);
  }
});

test('airborne hogs can be ducked, and jumpers do not launch at point-blank range', () => {
  const s = active(); const hog = createHogs(PLAYER_X, 205)[4]; hog.x = PLAYER_X; hog.y = FLOOR - 100; hog.vy = 0;
  s.hogs = [hog]; duckRunner(s, true); advance(s, 0.04); assert.equal(s.hits, 0);
  const near = active(); near.invincible = 5;
  const jumper = createHogs(PLAYER_X, 205)[4]; jumper.x = PLAYER_X + 80; jumper.jumpIn = 0; near.hogs = [jumper];
  advance(near, 0.1); assert.equal(jumper.y, FLOOR - 25);
});


test('piranhas signal with bubbles, jump out of the water, and splash back down', () => {
  const r = { x: 400, width: 350, waterAge: 0 };
  assert.equal(piranhaPosition(r, 0).warning, true);
  r.waterAge = 0.95; const peak = piranhaPosition(r, 0);
  assert.equal(peak.jumping, true); assert.ok(peak.y < FLOOR - 80);
  r.waterAge = 1.6; assert.equal(piranhaPosition(r, 0).jumping, false); assert.ok(piranhaPosition(r, 0).y > FLOOR);
});

test('eel charges before a short shock and recovers; only the electric surface patch hurts', () => {
  const r = { x: 0, width: 500, waterAge: 0, resident: 'eel' as const };
  assert.equal(eelPhase(r), 'charge'); r.waterAge = 1; assert.equal(eelPhase(r), 'shock');
  r.waterAge = 1.5; assert.equal(eelPhase(r), 'swim');
  for (const airborne of [false, true]) {
    const s = active(); s.rivers = [{ ...r, waterAge: 1 }];
    if (airborne) { s.y = FLOOR - 85; s.jumps = 1; }
    stepRunner(s, 1 / 120); assert.equal(s.hits, airborne ? 0 : 1);
  }
});

test('falling into an eel river triggers the visible zap reaction', () => {
  const s = active(); s.rivers = [{ x: PLAYER_X - 20, width: 500, resident: 'eel', waterAge: 1.6 }];
  s.y = FLOOR + 54; s.vy = 300;
  stepRunner(s, 1 / 120);
  assert.equal(s.reaction, 'zap'); assert.ok(s.reactionLeft > 0); assert.equal(s.lives, 2);
});

for (let level = 0; level < LEVELS.length; level++) {
  for (const resident of ['piranha', 'eel'] as const) {
    test(`level ${level + 1}: ${resident} river has a safe timed jump route`, () => {
      let safe = false;
      for (let delay = 0; delay < 1 && !safe; delay += 0.025) {
        const s = active(); s.level = level; s.elapsed = level * 60;
        const r = { x: PLAYER_X + 180, width: Math.max(250, runnerSpeed(s) * 1.05), resident, waterAge: 0 }; s.rivers = [r];
        advance(s, delay); jumpRunner(s); advance(s, 0.3); jumpRunner(s); advance(s, 2.5);
        safe = s.hits === 0 && s.distance + PLAYER_X > r.x + r.width;
      }
      assert.ok(safe);
    });
  }
  test(`level ${level + 1}: orangutan telegraphs a throw that can be slid under`, () => {
    for (const dodge of [false, true]) {
      const s = active(); s.level = level; s.elapsed = level * 60;
      const o = createOrangutan(PLAYER_X + 650); s.orangutans = [o];
      let warned = false, threw = false;
      for (let i = 0; i < 3 * 120; i++) {
        warned ||= o.state === 'windup';
        if (!threw && s.pineapples.length) { threw = true; if (dodge) duckRunner(s, true); }
        stepRunner(s, 1 / 120);
      }
      assert.ok(warned && threw); assert.equal(s.hits, dodge ? 0 : 1);
    }
  });
}

test('pineapple leaves the throwing hand, rotates, and bursts once on impact', () => {
  const s = active(); const o = createOrangutan(700); o.state = 'windup'; o.age = 0.55; s.orangutans = [o];
  stepRunner(s, 1 / 120); assert.equal(o.state, 'throw'); assert.equal(o.throws, 1); assert.equal(s.pineapples.length, 1);
  const p = s.pineapples[0], hand = orangutanHand(o); assert.ok(Math.abs(p.x - hand.x) < 5); assert.ok(p.rotation > 0);
  s.orangutans = []; s.pineapples = [{ x: s.distance + PLAYER_X, y: FLOOR - 40, vx: 0, vy: 0, rotation: 0 }];
  stepRunner(s, 1 / 120); assert.equal(s.hits, 1); assert.equal(s.splats.length, 1); assert.equal(s.pineapples.length, 0);
  advance(s, 0.7); assert.equal(s.splats.length, 0); assert.equal(s.hits, 1);
});

for (const resident of ['piranha', 'eel'] as const) {
  test(`vine crossings remain reachable above ${resident} water at every speed`, () => {
    for (let level = 0; level < LEVELS.length; level++) {
      let safe = false;
      for (let delay = 0; delay < 1.8 && !safe; delay += 0.025) {
        const s = active(); s.level = level; s.elapsed = level * 60;
        const r = { x: PLAYER_X + 260, width: 680, vine: true, resident, waterAge: 0 }; s.rivers = [r];
        advance(s, delay); jumpRunner(s); let caught = false;
        for (let i = 0; i < 6 * 120; i++) { stepRunner(s, 1 / 120); caught ||= s.swing !== null; }
        safe = caught && s.hits === 0 && s.distance + PLAYER_X > r.x + r.width;
      }
      assert.ok(safe, `level ${level + 1} needs a safe vine route`);
    }
  });
}

test('a complete run includes both aquatic hazards and orangutan encounters', () => {
  const s = createRunner(); s.phase = 'playing'; const residents = new Set<string>(); let dancer = false;
  for (let i = 0; i < 300 * 120; i++) {
    s.invincible = 5; stepRunner(s, 1 / 120);
    for (const r of s.rivers) if (r.resident) residents.add(r.resident);
    dancer ||= s.orangutans.length > 0;
  }
  assert.deepEqual([...residents].sort(), ['eel', 'piranha']); assert.ok(dancer);
});


test('panther paws plant on the backward stroke and lift on the forward stroke', () => {
  const planted = pantherPaw(0, 15), plantedNext = pantherPaw(0.1, 15);
  assert.equal(planted.lift, 0); assert.ok(plantedNext.reach > planted.reach);
  const lifted = pantherPaw(Math.PI, 15), liftedNext = pantherPaw(Math.PI + 0.1, 15);
  assert.ok(lifted.lift > 0); assert.ok(liftedNext.reach < lifted.reach);
});

test('panther makes a high leap with a recovery rather than a low running charge', () => {
  const s = active(); s.invincible = 10; const p = createPredator('panther', 900); p.state = 'attack'; s.predators = [p];
  advance(s, 0.5); assert.ok(p.y < FLOOR - 145); assert.ok(p.x < 900);
  advance(s, 0.6); assert.equal(p.state, 'recover');
});

test('tiger commits to a low charge against an early slide and allows a jump counter', () => {
  for (const counter of [false, true]) {
    const s = active(); const p = createPredator('tiger', PLAYER_X + runnerSpeed(s) * 2.5, 0.5); s.predators = [p];
    advance(s, 0.65); duckRunner(s, true);
    let told = false;
    for (let i = 0; i < 300; i++) {
      if (!told && p.state === 'crouch') { told = true; assert.equal(p.attackStyle, 'rush'); }
      if (counter && p.state === 'attack' && s.jumps === 0) jumpRunner(s);
      stepRunner(s, 1 / 120);
    }
    assert.ok(told); assert.equal(s.hits, counter ? 0 : 1);
  }
});

test('tiger reads an airborne approach, telegraphs an intercept and locks its attack', () => {
  const s = active(); const p = createPredator('tiger', PLAYER_X + runnerSpeed(s) * 2.5, 0.5); s.predators = [p];
  advance(s, 0.65); jumpRunner(s); advance(s, 0.3);
  assert.equal(p.state, 'crouch'); assert.equal(p.attackStyle, 'intercept'); assert.ok(p.leapHeight >= 145);
  advance(s, 1); assert.equal(p.attackStyle, 'intercept');
});

test('hog spacing is compact while preserving four runners and two jumpers', () => {
  for (const speed of [205, 445]) {
    const herd = createHogs(1000, speed);
    assert.ok(herd[1].x - herd[0].x < (speed + 105) * 0.5);
    assert.equal(herd.filter(h => h.jumper).length, 2);
  }
});
