import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, duckRunner, FLOOR, GEMS, jumpRunner, kickRunner, LEVELS, levelSeconds, PLAYER_X, punchRunner, stepRunner } from '../lib/jungle-runner';
import { createMonster, MONSTER_KINDS, MONSTER_LEVEL } from '../lib/jungle-monsters';
import { monsterAnimation } from '../lib/jungle-monster-art';

function hollow(difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
  const s = createRunner(difficulty, MONSTER_LEVEL, MONSTER_LEVEL);
  s.phase = 'playing'; s.items = []; s.nextSection = Infinity;
  return s;
}
function advance(s: ReturnType<typeof hollow>, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 120) && s.phase === 'playing'; i++) stepRunner(s, 1 / 120);
}

test('Monster Hollow is selectable as stage nine with its own Amethyst and clean restart state', () => {
  const s = hollow();
  assert.equal(LEVELS[s.level].name, 'Moonlit Monster Hollow');
  assert.equal(GEMS[s.level].name, 'Amethyst');
  assert.equal(s.endLevel, MONSTER_LEVEL);
  assert.equal(s.gemCollected.length, LEVELS.length);
  assert.equal(s.monsterShieldLeft, 0);
  assert.equal(s.monsterBossStarted, false);
});

test('all seven ordinary monster types appear before the Horseman on each difficulty', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const s = hollow(difficulty); s.nextSection = 950; s.invincible = 1000;
    const kinds = new Set<string>(); let gems = 0;
    const seen = new Set<object>();
    for (let i = 0; i < levelSeconds(s) * 120 && !s.monsterBossStarted; i++) {
      stepRunner(s, 1 / 120);
      s.monsters.forEach(monster => kinds.add(monster.kind));
      for (const item of s.items) if (item.kind === 'gem' && !seen.has(item)) { seen.add(item); gems++; }
    }
    assert.deepEqual([...kinds].sort(), [...MONSTER_KINDS].sort(), difficulty);
    assert.equal(gems, 1, difficulty);
    assert.equal(s.gemSpawned[MONSTER_LEVEL], true);
  }
});

test('enemy warnings and windups precede attack damage', () => {
  const s = hollow();
  const wolf = createMonster('wolf', PLAYER_X + 400);
  s.monsters = [wolf];
  advance(s, 0.9);
  assert.equal(wolf.state, 'warn');
  assert.equal(s.hits, 0);
  advance(s, 0.35);
  assert.equal(wolf.state, 'windup');
  assert.equal(s.hits, 0);
});

test('moon shields collect once, absorb one spell, and then allow later damage', () => {
  const s = hollow();
  s.moonShields.push({ x: PLAYER_X + 2, y: FLOOR - 40 });
  stepRunner(s, 1 / 120);
  assert.ok(s.monsterShieldLeft > 8);
  assert.equal(s.supplyPickups, 1);
  assert.equal(s.moonShields.length, 0);
  const spell = () => ({ kind: 'bolt' as const, x: s.distance + PLAYER_X + 2, y: FLOOR - 50, vx: -250, vy: 0, age: 0, reflected: false });
  s.monsterSpells.push(spell()); stepRunner(s, 1 / 120);
  assert.equal(s.monsterShieldLeft, 0);
  assert.equal(s.lives, 5);
  assert.equal(s.hits, 0);
  advance(s, 0.9);
  s.monsterSpells.push(spell()); stepRunner(s, 1 / 120);
  assert.equal(s.lives, 4);
  assert.equal(s.hits, 1);
});

test('a spell can pass safely over a sliding runner', () => {
  const s = hollow(); s.duck = true; s.slideLeft = 1;
  s.monsterSpells.push({ kind: 'bolt', x: PLAYER_X + 5, y: FLOOR - 83, vx: -250, vy: 0, age: 0, reflected: false });
  advance(s, 0.2);
  assert.equal(s.hits, 0);
});

test('punching a spell reflects it into the caster and awards counter damage', () => {
  const s = hollow();
  const vampire = createMonster('vampire', PLAYER_X + 340); vampire.state = 'warn';
  s.monsters = [vampire];
  s.monsterSpells.push({ kind: 'bolt', x: PLAYER_X + 58, y: FLOOR - 50, vx: -250, vy: 0, age: 0, reflected: false });
  punchRunner(s); stepRunner(s, 1 / 120);
  assert.equal(s.monsterSpells[0].reflected, true);
  advance(s, 0.5);
  assert.equal(vampire.hits, 2);
  assert.equal(s.hits, 0);
  assert.ok(s.ki > 0);
});

test('eruption runes warn before damage and jumping clears their active height', () => {
  for (const jumping of [false, true]) {
    const s = hollow();
    const eruption = { kind: 'eruption' as const, x: PLAYER_X + 2, y: FLOOR, vx: 0, vy: 0, age: 0, reflected: false };
    s.monsterSpells = [eruption];
    stepRunner(s, 1 / 120); assert.equal(s.hits, 0);
    eruption.age = 0.7; eruption.x = s.distance + PLAYER_X + 2;
    if (jumping) { s.y = FLOOR - 145; s.vy = 0; s.jumps = 2; }
    stepRunner(s, 1 / 120);
    assert.equal(s.hits, jumping ? 0 : 1);
  }
});

test('a timed double jump clears the Horseman charge', () => {
  const s = hollow(); s.monsterBossStarted = true;
  const horseman = createMonster('horseman', PLAYER_X + 280); horseman.state = 'attack'; horseman.casts = 1;
  s.monsters = [horseman];
  advance(s, 0.05); jumpRunner(s); advance(s, 0.23); jumpRunner(s); advance(s, 0.9);
  assert.equal(s.hits, 0);
  assert.equal(horseman.state, 'recover');
});

test('the stage timer cannot skip the Horseman or castle portal', () => {
  const s = hollow(); s.elapsed = levelSeconds(s) * (MONSTER_LEVEL + 1) - 0.001;
  stepRunner(s, 0.02);
  assert.equal(s.level, MONSTER_LEVEL);
  assert.equal(s.phase, 'playing');
  assert.equal(s.monsterBossStarted, true);
  assert.equal(s.monsterPortalOpen, false);
});

test('countering the Horseman opens the portal; crossing on the ground wins once', () => {
  const s = hollow(); s.monsterBossStarted = true;
  const boss = createMonster('horseman', PLAYER_X + 125, 'easy');
  s.monsters = [boss];
  for (let hit = 0; hit < boss.hitPoints; hit++) {
    boss.state = 'recover'; boss.age = 0; boss.hitCooldown = 0;
    kickRunner(s); stepRunner(s, 1 / 120); advance(s, 0.4);
  }
  assert.equal(s.monsterBossDefeated, true);
  assert.equal(s.monsterPortalOpen, true);
  assert.equal(s.phase, 'playing');
  s.distance = s.monsterFinishX! - PLAYER_X; s.y = FLOOR;
  stepRunner(s, 1 / 120);
  assert.equal(s.monsterPortalReached, true);
  assert.equal(s.phase, 'victory');
  const score = s.bonusScore;
  advance(s, 1);
  assert.equal(s.bonusScore, score);
});

test('the complete Horseman encounter is winnable with ordinary controls on all difficulties', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const s = hollow(difficulty); s.monsterBossStarted = true;
    s.monsters = [createMonster('horseman', PLAYER_X + 380, difficulty)];
    for (let i = 0; i < 90 * 120 && s.phase === 'playing'; i++) {
      const boss = s.monsters.find(monster => monster.kind === 'horseman');
      if (boss?.state === 'attack') {
        if (boss.casts % 2 === 1) {
          if (boss.age >= 0.04 && boss.age < 0.15 && s.jumps === 0) jumpRunner(s);
          if (boss.age >= 0.27 && s.jumps === 1) jumpRunner(s);
        } else if (!s.duck) duckRunner(s, true);
      } else {
        duckRunner(s, false);
        if (boss && ['recover', 'stagger'].includes(boss.state) && s.combatLeft === 0) kickRunner(s);
      }
      stepRunner(s, 1 / 120);
    }
    assert.equal(s.phase, 'victory', difficulty);
    assert.equal(s.monsterPortalReached, true, difficulty);
    assert.ok(s.lives > 0, difficulty);
  }
});

test('Adventure Mode waits for the savanna oasis, then enters Monster Hollow without a victory screen', () => {
  const s = createRunner('easy'); s.phase = 'playing'; s.level = 7;
  s.elapsed = levelSeconds(s) * 8 - 0.001; s.items = []; s.nextSection = Infinity; s.invincible = 100;
  stepRunner(s, 0.02);
  assert.equal(s.level, 7);
  assert.equal(s.phase, 'playing');
  s.savannaOasisOpen = true; s.savannaFinishX = s.distance + PLAYER_X;
  stepRunner(s, 1 / 120); stepRunner(s, 1 / 120);
  assert.equal(s.level, MONSTER_LEVEL);
  assert.equal(s.phase, 'playing');
  assert.equal(s.savannaAnimals.length, 0);
  assert.equal(s.savannaPits.length, 0);
  assert.equal(s.birds.length, 0);
});

test('each enemy state maps to a supplied movement or encounter frame', () => {
  const monster = createMonster('wolf', 200);
  assert.equal(monsterAnimation(monster).action, 'run');
  monster.state = 'windup'; assert.equal(monsterAnimation(monster).index, 2);
  monster.state = 'stagger'; assert.equal(monsterAnimation(monster).index, 6);
  monster.state = 'retreat'; assert.equal(monsterAnimation(monster).index, 7);
});
