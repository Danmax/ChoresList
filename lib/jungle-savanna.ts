import {
  FLOOR, PLAYER_X, gainKi, heroDamage, heroStrikeConnects, recordHeroHit,
  runnerSpeed, starKnockout, type Runner,
} from './jungle-runner';

export type SavannaAnimalKind = 'giraffe' | 'wildebeest' | 'hyena' | 'lion';
export type SavannaAnimal = {
  kind: SavannaAnimalKind;
  x: number;
  y: number;
  age: number;
  state: 'idle' | 'warn' | 'attack' | 'recover' | 'defeated';
  hits: number;
  hitPoints: number;
  hitCooldown: number;
  phase: number;
};
export type SavannaPit = { x: number; width: number; checkpoint: number };
export type SavannaVine = { pitX: number; width: number; used?: boolean };

export function savannaVinePosition(vine: SavannaVine, elapsed: number, progress?: number) {
  const t = progress ?? 0.5 + Math.sin(elapsed * 1.8 + vine.pitX * 0.002) * 0.44;
  return {
    x: vine.pitX - 45 + (vine.width + 90) * t,
    y: 145 + Math.sin(t * Math.PI) * 62,
    progress: t,
  };
}

export function createSavannaAnimal(kind: SavannaAnimalKind, x: number, difficulty: Runner['difficulty'] = 'medium', phase = 0): SavannaAnimal {
  const hitPoints = kind === 'lion' ? { easy: 3, medium: 4, hard: 5 }[difficulty] : kind === 'hyena' ? 2 : 1;
  return { kind, x, y: FLOOR, age: 0, state: 'idle', hits: 0, hitPoints, hitCooldown: 0, phase };
}

export function isSavannaPit(s: Pick<Runner, 'level' | 'savannaPits'>, worldX: number) {
  return s.level === 7 && s.savannaPits.some(pit => worldX > pit.x && worldX < pit.x + pit.width);
}

export function addSavannaSection(s: Runner) {
  if (s.savannaBossStarted || s.savannaOasisOpen) return;
  const x = s.nextSection;
  const encounter = s.savannaEncounterIndex++ % 4;
  s.section++;
  if (encounter === 0) {
    s.savannaAnimals.push(createSavannaAnimal('giraffe', x + 80, s.difficulty));
    for (let i = 0; i < 7; i++) s.items.push({ x: x + 170 + i * 45, y: FLOOR - 145 - Math.sin(i / 6 * Math.PI) * 65, kind: 'banana' });
  } else if (encounter === 1) {
    const count = { easy: 2, medium: 3, hard: 4 }[s.difficulty];
    for (let i = 0; i < count; i++) s.savannaAnimals.push(createSavannaAnimal('hyena', x + i * 155, s.difficulty, i * 0.28));
  } else if (encounter === 2) {
    const count = { easy: 4, medium: 5, hard: 6 }[s.difficulty];
    for (let i = 0; i < count; i++) s.savannaAnimals.push(createSavannaAnimal('wildebeest', x + i * 135, s.difficulty, i * 0.17));
    s.message = 'DUST CLOUD! WILDEBEEST STAMPEDE AHEAD!'; s.messageTime = 2;
  } else {
    const width = { easy: 360, medium: 430, hard: 500 }[s.difficulty];
    s.savannaAnimals.push(createSavannaAnimal('giraffe', x - 105, s.difficulty));
    s.savannaPits.push({ x: x + 100, width, checkpoint: x - 150 });
    s.savannaVines.push({ pitX: x + 100, width });
    for (let i = 0; i < 6; i++) s.items.push({ x: x + 30 + i * (width + 150) / 5, y: FLOOR - 120 - Math.sin(i / 5 * Math.PI) * 85, kind: 'banana' });
  }
  if (!s.gemSpawned[7]) {
    s.gemSpawned[7] = true;
    s.items.push({ x: x + 620, y: FLOOR - 205, kind: 'gem', level: 7 });
  }
  s.nextSection += Math.max(1250, runnerSpeed(s) * 2.65);
}

export function stepSavanna(s: Runner, dt: number, previousY: number, hurt: (message: string, reaction?: Runner['reaction']) => void) {
  if (s.level !== 7) return;
  const worldX = s.distance + PLAYER_X;
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  const progress = s.elapsed / ({ easy: 42, medium: 51, hard: 60 }[s.difficulty]) - 7;

  if (!s.savannaBossStarted && progress >= 0.7) {
    s.savannaBossStarted = true;
    s.savannaAnimals = [];
    s.savannaPits = [];
    s.savannaVines = [];
    if (s.swing && ('savannaVine' in s.swing || 'giraffe' in s.swing)) s.swing = null;
    s.nextSection = Infinity;
    s.savannaAnimals.push(createSavannaAnimal('lion', worldX + 290, s.difficulty));
    s.items.push({ x: worldX + 55, y: FLOOR - 28, kind: 'heart' });
    s.message = 'ROARING LION! READ THE ROAR, DODGE, THEN COUNTER!'; s.messageTime = 3;
  }

  const pit = s.savannaPits.find(value => worldX > value.x && worldX < value.x + value.width);
  if (pit && s.y > FLOOR + 85 && s.invincible <= 0) {
    hurt('CLIFF OF DEATH! Follow the banana arc!', 'flatten');
    if (s.phase === 'playing') {
      s.distance = pit.checkpoint - PLAYER_X;
      s.y = FLOOR;
      s.vy = 0;
    }
  }

  for (const vine of s.savannaVines) {
    if (vine.used || s.swing || s.jumps === 0 || s.duck) continue;
    const tip = savannaVinePosition(vine, s.elapsed);
    if (Math.abs(tip.x - worldX) < 52 && Math.abs(tip.y - (s.y - 55)) < 58) {
      vine.used = true;
      s.swing = { savannaVine: vine, progress: tip.progress };
      s.flipLeft = 0; s.message = 'SAVANNA VINE! SWING ACROSS!'; s.messageTime = 1.4;
    }
  }

  for (const animal of s.savannaAnimals) {
    if (animal.state === 'defeated') continue;
    animal.age += dt;
    animal.hitCooldown = Math.max(0, animal.hitCooldown - dt);
    const ahead = animal.x - worldX;

    if (animal.kind === 'giraffe') {
      const neckTop = FLOOR - 185;
      if (!s.swing && Math.abs(ahead) < 72 && s.vy > 0 && previousY <= neckTop + 20 && s.y >= neckTop) {
        s.swing = { giraffe: animal, progress: 0 };
        s.y = neckTop; s.vy = 0; s.jumps = 1; s.duck = false; s.slideLeft = 0; s.flipLeft = 0;
        animal.state = 'attack'; animal.age = 0;
        s.message = 'GIRAFFE NECK SLIDE — TAIL LAUNCH!'; s.messageTime = 1.2;
      } else if (animal.state === 'attack' && animal.age > 0.55) animal.state = 'idle';
      continue;
    }

    if (animal.kind === 'wildebeest') {
      if (animal.state === 'idle' && ahead < 720 - animal.phase * 160) { animal.state = 'warn'; animal.age = 0; }
      else if (animal.state === 'warn' && animal.age >= 0.72 + animal.phase) { animal.state = 'attack'; animal.age = 0; }
      if (animal.state === 'attack') animal.x -= (170 + animal.phase * 35) * dt;
      if (Math.abs(animal.x - worldX) < 52 && s.y > FLOOR - 92) {
        const back = FLOOR - 78;
        if (s.vy > 0 && previousY <= back && s.y >= back) {
          s.y = back; s.vy = -520; s.jumps = 1; s.duck = false; s.slideLeft = 0; s.flipLeft = 0;
          s.savannaBounces++; s.message = 'WILDEBEEST BOUNCE!'; s.messageTime = 0.75;
        } else if (s.starPower > 0) { animal.state = 'defeated'; starKnockout(s, animal.x, FLOOR - 60, 'WILDEBEEST'); }
        else if (s.invincible <= 0) hurt('WILDEBEEST STAMPEDE! DOUBLE JUMP!', 'flatten');
      }
      continue;
    }

    if (animal.kind === 'hyena') {
      if (animal.state === 'idle' && ahead < 620 - animal.phase * 120) { animal.state = 'warn'; animal.age = 0; }
      else if (animal.state === 'warn' && animal.age >= ({ easy: 1.2, medium: 0.9, hard: 0.7 }[s.difficulty] + animal.phase)) { animal.state = 'attack'; animal.age = 0; }
      else if (animal.state === 'attack') {
        animal.x -= 235 * dt;
        animal.y = FLOOR - 25 - Math.sin(Math.min(1, animal.age / 0.85) * Math.PI) * 105;
        if (animal.age >= 0.85) { animal.state = 'recover'; animal.age = 0; animal.y = FLOOR; }
      } else if (animal.state === 'recover' && animal.age > 0.7) { animal.state = 'idle'; animal.age = 0; }
    } else {
      animal.x = worldX + (animal.state === 'recover' ? 150 : 260);
      if (animal.state === 'idle') { animal.state = 'warn'; animal.age = 0; }
      else if (animal.state === 'warn' && animal.age >= { easy: 1.2, medium: 0.9, hard: 0.7 }[s.difficulty]) { animal.state = 'attack'; animal.age = 0; }
      else if (animal.state === 'attack') {
        animal.y = FLOOR - 25 - Math.sin(Math.min(1, animal.age / 0.72) * Math.PI) * 125;
        if (animal.age >= 0.72) { animal.state = 'recover'; animal.age = 0; animal.y = FLOOR; }
      } else if (animal.state === 'recover' && animal.age >= { easy: 1.1, medium: 0.85, hard: 0.65 }[s.difficulty]) { animal.state = 'warn'; animal.age = 0; }
    }

    const radiusX = animal.kind === 'lion' ? 82 : 46;
    const top = animal.y - (animal.kind === 'lion' ? 105 : 68);
    if (animal.state === 'recover' && animal.hitCooldown === 0 && heroStrikeConnects(s, animal.x, radiusX, top, FLOOR)) {
      animal.hits += heroDamage(s); animal.hitCooldown = 0.4;
      recordHeroHit(s, animal.x - radiusX / 2, FLOOR - 75, animal.kind === 'lion' ? 'heavy' : 'medium');
      gainKi(s, animal.kind === 'lion' ? 18 : 12);
      s.message = `${animal.kind.toUpperCase()} COUNTER! ${animal.hits}/${animal.hitPoints}`; s.messageTime = 0.9;
      if (animal.hits >= animal.hitPoints) {
        animal.state = 'defeated'; starKnockout(s, animal.x, FLOOR - 80, animal.kind.toUpperCase());
        if (animal.kind === 'lion') {
          s.savannaLionDefeated = true; s.savannaOasisOpen = true; s.savannaFinishX = worldX + 720;
          s.message = 'LION DEFEATED! RUN TO THE OASIS!'; s.messageTime = 3;
        }
      }
      continue;
    }
    if (animal.state === 'attack' && Math.abs(animal.x - worldX) < radiusX && animal.y >= s.y - height && top <= s.y - 4 && s.invincible <= 0) {
      hurt(animal.kind === 'lion' ? 'LION POUNCE! SLIDE BENEATH!' : 'LAUGHING HYENA! DODGE THE POUNCE!', 'tussle');
    }
  }

  if (s.savannaOasisOpen && s.savannaFinishX !== null && worldX >= s.savannaFinishX && s.y >= FLOOR - 2) {
    s.savannaOasisReached = true;
    s.phase = 'victory';
    s.message = 'OASIS OF VICTORY!'; s.messageTime = 3;
  }
  s.savannaAnimals = s.savannaAnimals.filter(animal => animal.state !== 'defeated' && (animal.kind === 'lion' || animal.x > s.distance - 180));
  s.savannaPits = s.savannaPits.filter(value => value.x + value.width > s.distance - 100);
  s.savannaVines = s.savannaVines.filter(vine => vine.pitX + vine.width > s.distance - 100);
}
