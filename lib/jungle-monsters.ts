import {
  FLOOR, PLAYER_X, gainKi, heroDamage, heroStrikeConnects, levelSeconds,
  recordHeroHit, runnerSpeed, starKnockout, type Runner,
} from './jungle-runner';

export const MONSTER_LEVEL = 8;
export const MONSTER_KINDS = ['wolf', 'goblin', 'zombie', 'werewolf', 'beast', 'troll', 'vampire', 'horseman'] as const;
export type MonsterKind = typeof MONSTER_KINDS[number];
export type Monster = {
  kind: MonsterKind; x: number; y: number; age: number;
  state: 'approach' | 'warn' | 'windup' | 'attack' | 'recover' | 'stagger' | 'defeated' | 'retreat';
  hits: number; hitPoints: number; hitCooldown: number; casts: number;
};
export type MonsterSpell = {
  kind: 'bolt' | 'pumpkin' | 'eruption'; x: number; y: number;
  vx: number; vy: number; age: number; reflected: boolean;
};
export type MonsterEffect = { kind: 'impact' | 'explosion' | 'teleport' | 'curse'; x: number; y: number; age: number };
export type MoonShield = { x: number; y: number };
export const MONSTER_BODY: Record<MonsterKind, { half: number; height: number; size: number; label: string }> = {
  wolf: { half: 49, height: 78, size: 200, label: 'WOLF' },
  goblin: { half: 34, height: 116, size: 190, label: 'GOBLIN' },
  zombie: { half: 32, height: 117, size: 190, label: 'ZOMBIE' },
  werewolf: { half: 45, height: 126, size: 220, label: 'WEREWOLF' },
  beast: { half: 63, height: 140, size: 240, label: 'FOREST BEAST' },
  troll: { half: 60, height: 140, size: 240, label: 'TROLL' },
  vampire: { half: 39, height: 128, size: 210, label: 'VAMPIRE' },
  horseman: { half: 70, height: 136, size: 285, label: 'HEADLESS HORSEMAN' },
};

export function createMonster(kind: MonsterKind, x: number, difficulty: Runner['difficulty'] = 'medium'): Monster {
  const hitPoints = kind === 'horseman' ? { easy: 4, medium: 5, hard: 6 }[difficulty]
    : ['beast', 'troll', 'vampire'].includes(kind) ? 3 : kind === 'werewolf' ? 2 : 1;
  return { kind, x, y: FLOOR, age: 0, state: 'approach', hits: 0, hitPoints, hitCooldown: 0, casts: 0 };
}

export function addMonsterSection(s: Runner) {
  if (s.monsterBossStarted || s.monsterPortalOpen) return;
  const x = s.nextSection, index = s.monsterEncounterIndex++;
  const kind = MONSTER_KINDS[index % 7];
  s.monsters.push(createMonster(kind, x, s.difficulty));
  s.section++;
  for (let i = 0; i < 6; i++) s.items.push({ x: x + 360 + i * 46, y: FLOOR - 45 - Math.sin(i / 5 * Math.PI) * 75, kind: 'banana' });
  if (index % 3 === 0) s.moonShields.push({ x: x - 200, y: FLOOR - 45 });
  if (index === 2) s.items.push({ x: x + 470, y: FLOOR - 205, kind: 'gem', level: MONSTER_LEVEL });
  if (index === 2) s.gemSpawned[MONSTER_LEVEL] = true;
  if (index % 4 === 3) s.items.push({ x: x + 650, y: FLOOR - 30, kind: 'heart' });
  s.nextSection += Math.max(1450, runnerSpeed(s) * 3.7);
}

function effect(s: Runner, kind: MonsterEffect['kind'], x: number, y: number) {
  s.monsterEffects.push({ kind, x, y, age: 0 });
}

function hitMonster(s: Runner, monster: Monster, damage: number) {
  if (monster.hitCooldown > 0 || monster.state === 'defeated' || monster.state === 'retreat') return;
  monster.hits += damage; monster.hitCooldown = 0.4;
  const body = MONSTER_BODY[monster.kind];
  recordHeroHit(s, monster.x - body.half / 2, monster.y - body.height / 2, body.half >= 60 ? 'heavy' : 'medium');
  gainKi(s, monster.kind === 'horseman' ? 20 : 12);
  effect(s, 'impact', monster.x - body.half / 2, monster.y - body.height / 2);
  if (monster.hits >= monster.hitPoints) {
    monster.state = 'defeated'; monster.age = 0;
    starKnockout(s, monster.x, monster.y - 65, body.label);
    effect(s, 'curse', monster.x, monster.y - 65);
    if (monster.kind === 'horseman') {
      s.monsterBossDefeated = true; s.monsterPortalOpen = true;
      s.monsterFinishX = s.distance + PLAYER_X + 760;
      s.monsterSpells = [];
      s.message = 'CURSE BROKEN! REACH THE CASTLE PORTAL!'; s.messageTime = 3;
    }
  } else {
    monster.state = 'stagger'; monster.age = 0;
    s.message = `${body.label} COUNTER! ${monster.hitPoints - monster.hits} HP LEFT`; s.messageTime = 1;
  }
}

export function monsterZone(s: Pick<Runner, 'elapsed' | 'difficulty' | 'monsterBossStarted'>) {
  const progress = s.elapsed / levelSeconds(s) - MONSTER_LEVEL;
  return s.monsterBossStarted ? 'Castle courtyard' : progress < 0.28 ? 'Haunted woodland' : progress < 0.55 ? 'Moonlit graveyard' : 'Troll bridge';
}

export function stepMonsters(s: Runner, dt: number, hurt: (message: string, reaction?: Runner['reaction']) => void) {
  if (s.level !== MONSTER_LEVEL) return;
  const worldX = s.distance + PLAYER_X;
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  s.monsterShieldLeft = Math.max(0, s.monsterShieldLeft - dt);
  for (const burst of s.monsterEffects) burst.age += dt;
  s.monsterEffects = s.monsterEffects.filter(burst => burst.age < 0.7);

  for (const pickup of s.moonShields) {
    if (Math.abs(pickup.x - worldX) < 35 && pickup.y + 18 >= s.y - height && pickup.y - 18 <= s.y) {
      s.monsterShieldLeft = 9; s.supplyPickups++;
      pickup.x = -Infinity;
      s.message = 'MOON SHIELD! ABSORBS ONE HIT FOR 9s'; s.messageTime = 2;
    }
  }
  s.moonShields = s.moonShields.filter(pickup => pickup.x > s.distance - 100);

  const progress = s.elapsed / levelSeconds(s) - MONSTER_LEVEL;
  if (!s.monsterBossStarted && progress >= 0.8) {
    s.monsterBossStarted = true; s.monsters = []; s.monsterSpells = []; s.nextSection = Infinity;
    s.monsters.push(createMonster('horseman', worldX + 380, s.difficulty));
    s.items = s.items.filter(item => item.kind === 'gem');
    s.items.push({ x: worldX + 100, y: FLOOR - 30, kind: 'heart' });
    s.moonShields.push({ x: worldX + 180, y: FLOOR - 40 });
    effect(s, 'teleport', worldX + 380, FLOOR - 60);
    s.message = 'HEADLESS HORSEMAN! JUMP THE CHARGE, THEN COUNTER!'; s.messageTime = 3;
  }

  for (const monster of s.monsters) {
    monster.age += dt; monster.hitCooldown = Math.max(0, monster.hitCooldown - dt);
    const boss = monster.kind === 'horseman', body = MONSTER_BODY[monster.kind];
    if (monster.state === 'defeated' || monster.state === 'retreat') {
      monster.x += (monster.state === 'retreat' ? 650 : 70) * dt;
      continue;
    }
    const change = (state: Monster['state']) => { monster.state = state; monster.age = 0; };
    const warnTime = { easy: 1.15, medium: 0.95, hard: 0.8 }[s.difficulty];
    const heavy = monster.kind === 'beast' || monster.kind === 'troll';
    if (monster.state === 'approach') {
      monster.x -= 32 * dt;
      if (monster.x - worldX < 460) {
        change('warn'); s.message = `${body.label}! ${heavy ? 'JUMP THE GROUND MAGIC!' : monster.kind === 'vampire' ? 'SLIDE OR STRIKE THE SPELL!' : monster.kind === 'goblin' ? 'JUMP OR RETURN THE PUMPKIN!' : 'READ THE WARNING, THEN COUNTER!'}`; s.messageTime = 1.6;
      }
    } else if (monster.state === 'warn') {
      monster.x = worldX + 340;
      if (monster.age >= warnTime) {
        change('windup');
        if (heavy) s.monsterSpells.push({ kind: 'eruption', x: worldX + runnerSpeed(s) * 1.05, y: FLOOR, vx: 0, vy: 0, age: 0, reflected: false });
      }
    } else if (monster.state === 'windup') {
      monster.x = worldX + 280;
      if (monster.age >= 0.35) { change('attack'); monster.casts++; }
    } else if (monster.state === 'attack') {
      const duration = boss ? 1.1 : 0.85;
      const t = Math.min(1, monster.age / duration);
      const caster = monster.kind === 'vampire' || monster.kind === 'goblin' || (boss && monster.casts % 2 === 0);
      monster.x = worldX + (caster ? 280 : heavy ? 160 : 280 - t * (boss ? 460 : 390));
      monster.y = FLOOR - (monster.kind === 'wolf' || monster.kind === 'werewolf' ? Math.sin(t * Math.PI) * 100 : 0);
      if (monster.age <= dt && (caster || (boss && monster.casts % 2 === 0))) {
        const kind = monster.kind === 'vampire' ? 'bolt' : 'pumpkin';
        s.monsterSpells.push({ kind, x: monster.x - 55, y: FLOOR - 83, vx: -250, vy: kind === 'pumpkin' ? -160 : 0, age: 0, reflected: false });
      }
      if (monster.age >= duration) {
        change('recover'); monster.y = FLOOR;
        if (monster.kind === 'vampire') effect(s, 'teleport', monster.x, FLOOR - 60);
      }
    } else if (monster.state === 'recover' || monster.state === 'stagger') {
      // Pace the runner during the opening so counters are possible at every
      // difficulty, even after the charge has crossed behind the player.
      monster.x = worldX + (boss ? 125 : 90); monster.y = FLOOR;
      if (monster.state === 'stagger' && monster.age >= 0.32) change('recover');
      else if (monster.state === 'recover' && monster.age >= (boss ? 1.3 : 1.1)) change(boss ? 'warn' : 'retreat');
    }

    const vulnerable = ['approach', 'recover', 'stagger'].includes(monster.state);
    const contact = Math.abs(monster.x - worldX) < body.half + 18 && monster.y >= s.y - height && monster.y - body.height <= s.y - 5;
    if ((vulnerable && heroStrikeConnects(s, monster.x, body.half, monster.y - body.height, monster.y)) || (s.starPower > 0 && contact)) {
      hitMonster(s, monster, s.starPower > 0 && !boss ? monster.hitPoints : heroDamage(s));
      continue;
    }
    if (contact && monster.state === 'attack' && !heavy && s.invincible <= 0) {
      hurt(boss ? 'SPECTRAL CHARGE! DOUBLE JUMP OVER THE HORSE!' : `${body.label} ATTACK! DODGE THEN COUNTER!`, 'tussle');
    }
  }

  // Resolve moving spells with swept X bounds; a dash or a slower frame must
  // never tunnel through either the hero or a reflected spell's target.
  for (const spell of s.monsterSpells) {
    const previousX = spell.x;
    spell.age += dt;
    if (spell.kind === 'eruption') {
      if (spell.age >= 0.65 && spell.age < 1.35 && Math.abs(spell.x - worldX) < 48 && s.y > FLOOR - 100 && s.invincible <= 0) {
        hurt('CURSED GROUND! JUMP WHEN THE RUNE GLOWS!', 'zap'); spell.age = 2;
      }
      continue;
    }
    spell.x += spell.vx * dt;
    if (spell.kind === 'pumpkin') { spell.vy += 560 * dt; spell.y += spell.vy * dt; }
    if (!spell.reflected && heroStrikeConnects(s, spell.x, 22, spell.y - 20, spell.y + 20)) {
      spell.reflected = true; spell.vx = 1100; spell.vy = 0;
      gainKi(s, 8); effect(s, 'impact', spell.x, spell.y);
      s.message = 'MAGIC RETURN!'; s.messageTime = 1;
    }
    if (spell.reflected) {
      const target = s.monsters.find(monster => monster.state !== 'defeated' && monster.state !== 'retreat' && monster.hitCooldown === 0 &&
        Math.min(previousX, spell.x) - 20 <= monster.x + MONSTER_BODY[monster.kind].half && Math.max(previousX, spell.x) + 20 >= monster.x - MONSTER_BODY[monster.kind].half &&
        spell.y + 20 >= monster.y - MONSTER_BODY[monster.kind].height && spell.y - 20 <= monster.y);
      if (target) { hitMonster(s, target, 2); spell.age = 10; }
    } else if (Math.min(previousX, spell.x) - 19 <= worldX + 18 && Math.max(previousX, spell.x) + 19 >= worldX - 18 && spell.y + 16 >= s.y - height && spell.y - 16 <= s.y - 4) {
      if (s.starPower <= 0) hurt(spell.kind === 'bolt' ? 'VAMPIRE SPELL! SLIDE OR RETURN IT!' : 'PUMPKIN BOMB! JUMP OR RETURN IT!', 'zap');
      effect(s, 'explosion', spell.x, spell.y); spell.age = 10;
    }
    if (spell.kind === 'pumpkin' && spell.y > FLOOR - 5) { effect(s, 'explosion', spell.x, FLOOR - 35); spell.age = 10; }
  }
  s.monsterSpells = s.monsterSpells.filter(spell => spell.age < (spell.kind === 'eruption' ? 1.65 : 4) && spell.x > s.distance - 120 && spell.x < s.distance + 1300);
  s.monsters = s.monsters.filter(monster => (monster.state !== 'defeated' && monster.state !== 'retreat') || monster.age < 0.75);

  if (s.monsterPortalOpen && s.monsterFinishX !== null && worldX >= s.monsterFinishX && s.y >= FLOOR - 2) {
    s.monsterPortalReached = true; s.phase = 'victory';
    s.message = 'MOONLIT MONSTER HOLLOW COMPLETE!'; s.messageTime = 3;
  }
}
