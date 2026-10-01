import { FLOOR, PLAYER_X, gainKi, heroDamage, heroStrikeConnects, isHeroAttack, recordHeroHit, runnerSpeed, starKnockout, type Runner } from './jungle-runner';

export type DinoKind = 'triceratops' | 'sauropod' | 'baboon' | 'sabertooth' | 'pterodactyl' | 'mammoth' | 'trex';
export type Dino = {
  kind: DinoKind; x: number; y: number; age: number;
  state: 'idle' | 'warn' | 'attack' | 'recover';
  hits: number; hitPoints: number; hitCooldown: number; cycle: number;
  knocked?: boolean; thrown?: boolean;
};
export type TarPit = { x: number; width: number };
export type Eruption = { x: number; age: number; active: boolean; fired: boolean };
export type DinoProjectile = { kind: 'fruit' | 'lava'; x: number; y: number; vx: number; vy: number; age: number };

export function createDino(kind: DinoKind, x: number, difficulty: Runner['difficulty'] = 'medium'): Dino {
  const hitPoints = kind === 'trex' ? { easy: 2, medium: 3, hard: 4 }[difficulty]
    : kind === 'triceratops' || kind === 'sabertooth' ? (difficulty === 'hard' ? 3 : 2) : 1;
  return { kind, x, y: kind === 'pterodactyl' ? 82 : FLOOR, age: 0, state: 'idle', hits: 0, hitPoints, hitCooldown: 0, cycle: 0 };
}

const SECTIONS = ['triceratops', 'sauropod', 'baboon', 'sabertooth', 'pterodactyl', 'mammoth', 'eruption', 'tar'] as const;

export function addDinoSection(s: Runner) {
  if (s.dinoBossStarted) return;
  const kind = SECTIONS[s.dinoEncounterIndex++ % SECTIONS.length];
  const x = s.nextSection;
  s.section++;
  if (kind === 'sauropod') {
    s.dinos.push(createDino('sauropod', x + 115, s.difficulty));
    s.tarPits.push({ x: x + 75, width: 440 });
  } else if (kind === 'baboon') {
    const count = s.difficulty === 'easy' ? 2 : 3;
    for (let i = 0; i < count; i++) s.dinos.push(createDino('baboon', x + i * 235, s.difficulty));
  } else if (kind === 'mammoth') {
    const count = s.difficulty === 'easy' ? 2 : 3;
    for (let i = 0; i < count; i++) s.dinos.push(createDino('mammoth', x + i * 180, s.difficulty));
  } else if (kind === 'eruption') s.eruptions.push({ x, age: 0, active: false, fired: false });
  else if (kind === 'tar') s.tarPits.push({ x, width: 420 });
  else s.dinos.push(createDino(kind, x, s.difficulty));
  for (let i = 0; i < 6; i++) s.items.push({ x: x + 610 + i * 40, y: FLOOR - 28, kind: 'banana' });
  if (!s.gemSpawned[6]) {
    s.gemSpawned[6] = true;
    s.items.push({ x: x + 670, y: FLOOR - 235, kind: 'gem', level: 6 });
  }
  s.nextSection += Math.max(1120, runnerSpeed(s) * 2.5);
}

export function stepDinoLand(s: Runner, dt: number, previousY: number, hurt: (message: string, reaction?: Runner['reaction']) => void) {
  if (s.level !== 6) return;
  const worldX = s.distance + PLAYER_X;
  const speed = runnerSpeed(s);
  const warning = { easy: 0.82, medium: 0.67, hard: 0.58 }[s.difficulty];
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  s.groundShake = Math.max(0, s.groundShake - dt);

  const inTar = s.tarPits.some(p => worldX > p.x && worldX < p.x + p.width && s.y >= FLOOR - 2);
  s.tarTime = inTar ? s.tarTime + dt : 0;
  if (s.tarTime > (s.difficulty === 'hard' ? 0.65 : 0.85) && s.invincible <= 0) {
    s.tarTime = 0;
    hurt('TAR PIT! Jump out before you sink!');
  }
  s.tarPits = s.tarPits.filter(p => p.x + p.width > s.distance - 120);

  for (const eruption of s.eruptions) {
    if (!eruption.active && eruption.x - worldX < 800) {
      eruption.active = true;
      s.message = 'VOLCANO! Watch the glowing landing spots!'; s.messageTime = 1.5;
    }
    if (!eruption.active) continue;
    eruption.age += dt;
    if (!eruption.fired && eruption.age >= warning) {
      eruption.fired = true; s.groundShake = 0.45;
      const count = s.difficulty === 'easy' ? 2 : 3;
      for (let i = 0; i < count; i++) s.dinoProjectiles.push({ kind: 'lava', x: eruption.x + 120 + i * 195, y: -20 - i * 80, vx: -35, vy: 310, age: 0 });
    }
  }
  s.eruptions = s.eruptions.filter(e => e.x > s.distance - 700);

  for (const projectile of s.dinoProjectiles) {
    projectile.age += dt;
    projectile.x += projectile.vx * dt;
    if (projectile.kind === 'lava') {
      projectile.vy += 1050 * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.y >= FLOOR - 20) { projectile.y = FLOOR - 20; projectile.age = 99; s.groundShake = 0.22; }
    }
    if (Math.abs(projectile.x - worldX) >= 30 || projectile.y + 19 < s.y - height || projectile.y - 19 > s.y - 4) continue;
    if (isHeroAttack(s) && projectile.kind === 'fruit') {
      projectile.age = 99; gainKi(s, 12); s.bonusScore += 10;
      s.message = 'BABOON FRUIT COUNTER! +KI'; s.messageTime = 0.8;
    } else if (s.invincible <= 0) {
      projectile.age = 99;
      hurt(projectile.kind === 'lava' ? 'LAVA ROCK! Follow the glowing cracks!' : 'BABOON FRUIT! Slide under!', 'bonk');
    }
  }
  s.dinoProjectiles = s.dinoProjectiles.filter(p => p.age < 8 && p.x > s.distance - 100);

  if (!s.dinoBossStarted && s.elapsed >= (6 + 0.68) * { easy: 42, medium: 51, hard: 60 }[s.difficulty]) {
    s.dinoBossStarted = true;
    s.dinos = [];
    s.tarPits = [];
    s.eruptions = [];
    s.dinoProjectiles = [];
    s.nextSection = Infinity;
    s.dinos.push(createDino('trex', worldX + 260, s.difficulty));
    s.message = 'T. REX FINALE! Read the tell, then counter!'; s.messageTime = 3;
  }

  for (const dino of s.dinos) {
    if (dino.knocked) continue;
    const ahead = dino.x - worldX;
    dino.hitCooldown = Math.max(0, dino.hitCooldown - dt);
    if (dino.kind === 'sauropod') {
      const back = FLOOR - 102;
      if (Math.abs(ahead) < 70 && s.vy > 0 && previousY <= back && s.y >= back) {
        s.y = back; s.vy = -480; s.jumps = 1; s.duck = false;
        s.message = 'LONG NECK LIFT! Clear the tar!'; s.messageTime = 0.9;
      }
      continue;
    }
    if (dino.kind === 'trex') {
      dino.x = worldX + (dino.state === 'recover' ? 145 : 230);
      dino.age += dt;
      if (dino.state === 'idle') { dino.state = 'warn'; dino.age = 0; }
      if (dino.state === 'warn' && dino.age >= warning + 0.25) { dino.state = 'attack'; dino.age = 0; }
      if (dino.state === 'attack') {
        if (dino.age < dt * 1.5) {
          s.groundShake = 0.4;
          if (dino.cycle % 3 === 2) s.dinoProjectiles.push({ kind: 'lava', x: worldX + speed * 0.43, y: 20, vx: -35, vy: 430, age: 0 });
        }
        const style = dino.cycle % 3;
        if (dino.age < 0.48 && s.invincible <= 0 && (style === 0 ? s.y > FLOOR - 80 : style === 1 ? !s.duck && s.y > FLOOR - 180 : false)) {
          hurt(style === 0 ? 'T. REX STOMP! Jump the shockwave!' : 'T. REX BITE! Slide beneath!', style === 0 ? 'flatten' : 'tussle');
        }
        if (dino.age >= 0.48) { dino.state = 'recover'; dino.age = 0; }
      } else if (dino.state === 'recover' && dino.age >= (s.difficulty === 'hard' ? 0.78 : 1.05)) {
        dino.cycle++; dino.state = 'warn'; dino.age = 0;
      }
      if (dino.state === 'recover' && dino.hitCooldown === 0 && heroStrikeConnects(s, dino.x, 100, FLOOR - 190, FLOOR)) {
        dino.hits += heroDamage(s); dino.hitCooldown = 0.42; gainKi(s, 18); recordHeroHit(s, dino.x - 70, FLOOR - 85, 'heavy');
        s.message = `T. REX COUNTER! ${dino.hits}/${dino.hitPoints}`; s.messageTime = 0.9;
        if (dino.hits >= dino.hitPoints) {
          dino.knocked = true; s.dinoBossDefeated = true; s.phase = 'victory';
          starKnockout(s, dino.x, FLOOR - 100, 'T. REX');
          s.message = 'DINOLAND CLEARED!'; s.messageTime = 3;
        }
      }
      continue;
    }
    if (dino.state === 'idle' && ahead < (dino.kind === 'pterodactyl' ? 720 : 800)) {
      dino.state = 'warn'; dino.age = 0;
      if (dino.kind === 'mammoth') s.groundShake = 0.35;
    } else if (dino.state !== 'idle') dino.age += dt;
    if (dino.state === 'warn' && dino.age >= warning) { dino.state = 'attack'; dino.age = 0; }
    if (dino.state === 'attack') {
      if (dino.kind === 'triceratops') dino.x -= 230 * dt;
      if (dino.kind === 'sabertooth') { dino.x -= 180 * dt; dino.y = FLOOR - Math.sin(Math.min(1, dino.age / 0.85) * Math.PI) * 110; }
      if (dino.kind === 'pterodactyl') { dino.x -= 130 * dt; dino.y = 82 + Math.sin(Math.min(1, dino.age / 1.05) * Math.PI) * 175; }
      if (dino.kind === 'mammoth') { dino.x -= 125 * dt; s.groundShake = Math.max(s.groundShake, 0.12); }
      if (dino.kind === 'baboon' && !dino.thrown) {
        dino.thrown = true;
        s.dinoProjectiles.push({ kind: 'fruit', x: dino.x - 30, y: FLOOR - 66, vx: -280, vy: 0, age: 0 });
      }
      if (dino.age >= 1.1) { dino.state = 'recover'; dino.age = 0; }
    }
    const bodyX = dino.kind === 'mammoth' ? 65 : dino.kind === 'pterodactyl' ? 52 : dino.kind === 'baboon' ? 36 : dino.kind === 'sabertooth' ? 60 : 50;
    const top = dino.kind === 'pterodactyl' ? dino.y - 26 : dino.kind === 'sabertooth' ? dino.y - 85 : dino.kind === 'mammoth' ? FLOOR - 112 : dino.kind === 'baboon' ? FLOOR - 105 : FLOOR - 90;
    const bottom = dino.kind === 'pterodactyl' ? dino.y + 16 : dino.kind === 'sabertooth' ? dino.y + 40 : FLOOR;
    if (dino.kind === 'mammoth' && Math.abs(ahead) < bodyX && s.vy > 0 && previousY <= top && s.y >= top) {
      s.y = top; s.vy = -465; s.jumps = 1; s.duck = false;
      s.message = 'MAMMOTH HERD HOP!'; s.messageTime = 0.75;
      continue;
    }
    if (dino.hitCooldown === 0 && heroStrikeConnects(s, dino.x, bodyX, top, bottom)) {
      dino.hits += heroDamage(s); dino.hitCooldown = 0.32; gainKi(s, 12); recordHeroHit(s, dino.x - bodyX / 2, Math.max(top + 20, FLOOR - 80), dino.kind === 'mammoth' || dino.kind === 'triceratops' ? 'heavy' : dino.kind === 'baboon' ? 'light' : 'medium');
      if (dino.hits >= dino.hitPoints) { dino.knocked = true; starKnockout(s, dino.x, dino.y - 60, dino.kind.toUpperCase()); }
      else { s.message = `${dino.kind.toUpperCase()} ${dino.hits}/${dino.hitPoints}`; s.messageTime = 0.8; }
      continue;
    }
    if (Math.abs(ahead) < bodyX && bottom >= s.y - height && top <= s.y - 4 && s.invincible <= 0) {
      hurt(dino.kind === 'pterodactyl' ? 'PTERODACTYL DIVE! Slide low!' : dino.kind === 'mammoth' ? 'MAMMOTH STAMPEDE! Jump the herd!' : dino.kind === 'sabertooth' ? 'SABER-TOOTH POUNCE! Slide!' : dino.kind === 'baboon' ? 'BABOON CREW! Punch or jump!' : 'TRICERATOPS CHARGE! Double jump!', dino.kind === 'mammoth' ? 'flatten' : 'tussle');
    }
  }
  s.dinos = s.dinos.filter(d => !d.knocked && (d.kind === 'trex' || d.x > s.distance - 160));
}
