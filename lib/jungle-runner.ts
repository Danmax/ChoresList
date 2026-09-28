export const FLOOR = 310;
export const PLAYER_X = 150;
export const LEVELS = [
  { name: 'Banana Grove', sky: '#8de3e5', mist: '#ecf8b4', speed: 205 },
  { name: 'Snake River', sky: '#a7b9f3', mist: '#bce9d0', speed: 265 },
  { name: 'Sunset Canopy', sky: '#edaf8f', mist: '#ffe9a2', speed: 325 },
  { name: 'Tiger Territory', sky: '#7d83c4', mist: '#e7bbde', speed: 385 },
] as const;
export const LEVEL_SECONDS = 60;
export const SLIDE_SECONDS = 1.5;
export type RunnerItem = { x: number; y: number; kind: 'banana' | 'golden' | 'cherry' | 'drop' | 'low' | 'high' | 'canopy'; collected?: boolean; vy?: number };
export type Bird = { x: number; y: number; gift: 'drop' | 'cherry'; dropped: boolean };
export type River = { x: number; width: number; bounced?: boolean };
export type Predator = { kind: 'snake' | 'tiger'; x: number; y: number; state: 'waiting' | 'warning' | 'crouch' | 'attack' | 'recover'; age: number; hit: boolean };
export function createPredator(kind: Predator['kind'], x: number): Predator {
  return { kind, x, y: FLOOR - 22, state: 'waiting', age: 0, hit: false };
}
export type Runner = ReturnType<typeof createRunner>;
export function runnerSpeed(s: Runner) { return LEVELS[s.level].speed + (s.elapsed % LEVEL_SECONDS) * 0.3; }

export function createRunner() {
  return {
    phase: 'ready' as 'ready' | 'playing' | 'over' | 'victory',
    distance: 0, elapsed: 0, level: 0, y: FLOOR, vy: 0, jumps: 0, duck: false, duckHeld: false, slideLeft: 0,
    golden: 0, cherries: 0, bonusScore: 0,
    lives: 3, bananas: 0, hits: 0, bounces: 0, stun: 0, invincible: 0,
    message: '', messageTime: 0, nextSection: 950, section: 0,
    items: Array.from({ length: 12 }, (_, i): RunnerItem => ({ x: 380 + i * 42, y: FLOOR - 30, kind: 'banana' })),
    rivers: [] as River[], birds: [] as Bird[], birdsSpawned: 0, predators: [] as Predator[],
  };
}

export function jumpRunner(s: Runner) {
  if (s.phase !== 'playing' || s.stun > 0 || s.jumps >= 2) return;
  s.duck = false;
  s.slideLeft = 0;
  s.vy = -540;
  s.jumps++;
}

export function duckRunner(s: Runner, held: boolean) {
  if (!held) { s.duckHeld = false; s.duck = false; s.slideLeft = 0; return; }
  if (s.duckHeld || s.phase !== 'playing' || s.stun > 0) return;
  s.duckHeld = true;
  s.duck = true;
  s.slideLeft = SLIDE_SECONDS;
  if (s.y < FLOOR) s.vy = Math.max(650, s.vy);
}

export function runnerScore(s: Runner) { return s.bananas * 10 + s.bonusScore; }

function hurt(s: Runner, message: string) {
  if (s.invincible > 0) return;
  s.lives--;
  s.hits++;
  s.stun = 0.65;
  s.invincible = 2.5;
  s.message = message;
  s.messageTime = 1.3;
  s.y = FLOOR;
  s.vy = 0;
  s.jumps = 0;
  s.duck = false;
  s.slideLeft = 0;
  if (s.lives <= 0) s.phase = 'over';
}

// Fixed world coordinates and authored sections keep reaction times independent
// of screen size. Every challenge is followed by a long, safe coin trail.
function addSection(s: Runner) {
  const x = s.nextSection;
  const patterns = [[0, 1, 4, 3, 2, 6], [5, 4, 3, 1, 6, 0], [7, 5, 4, 1, 3, 6], [7, 5, 7, 3, 6, 5, 4, 1]][s.level];
  const type = patterns[s.section++ % patterns.length];
  if (type === 3) {
    // Wider rivers at higher speeds preserve the hippo landing window.
    s.rivers.push({ x, width: Math.max(250, runnerSpeed(s) * 1.05) });
    for (let i = 0; i < 7; i++) s.items.push({ x: x + i * 40, y: FLOOR - 110, kind: 'banana' });
  } else if (type === 4) {
    // A single jump reaches ~97px; these prizes require the second air jump.
    for (let i = 0; i < 3; i++) s.items.push({ x: x + i * 36, y: FLOOR - 215, kind: 'golden' });
    s.items.push({ x: x - 90, y: FLOOR - 105, kind: 'banana' });
  } else if (type === 5) {
    s.predators.push(createPredator('snake', x));
  } else if (type === 6) {
    s.birds.push({ x, y: 70, gift: s.birdsSpawned++ % 2 === 0 ? 'cherry' : 'drop', dropped: false });
  } else if (type === 7) {
    s.predators.push(createPredator('tiger', x));
  } else {
    s.items.push({ x, y: type === 0 ? FLOOR - 22 : type === 1 ? FLOOR - 64 : FLOOR - 118, kind: type === 0 ? 'low' : type === 1 ? 'high' : 'canopy' });
  }
  for (let i = 0; i < 10; i++) s.items.push({ x: x + 470 + i * 40, y: FLOOR - 28, kind: 'banana' });
  s.nextSection += 1100;
}

export function stepRunner(s: Runner, dt: number) {
  if (s.phase !== 'playing') return;
  s.messageTime = Math.max(0, s.messageTime - dt);
  s.invincible = Math.max(0, s.invincible - dt);
  if (s.stun > 0) { s.stun = Math.max(0, s.stun - dt); return; }
  if (s.duck) {
    s.slideLeft = Math.max(0, s.slideLeft - dt);
    if (s.slideLeft === 0) s.duck = false;
  }
  s.elapsed += dt;
  if (s.elapsed >= LEVEL_SECONDS * LEVELS.length) { s.phase = 'victory'; return; }
  const level = Math.floor(s.elapsed / LEVEL_SECONDS);
  if (level !== s.level) { s.level = level; s.message = `LEVEL ${level + 1}: ${LEVELS[level].name}`; s.messageTime = 3; }
  const speed = runnerSpeed(s);
  s.distance += speed * dt;
  if (s.nextSection < s.distance + 1000) addSection(s);
  for (const bird of s.birds) {
    bird.x -= 45 * dt;
    if (!bird.dropped && bird.x - s.distance <= 620) {
      bird.dropped = true;
      s.items.push({ x: bird.x, y: bird.y + 22, kind: bird.gift, vy: 0 });
    }
  }
  s.birds = s.birds.filter(b => b.x > s.distance - 80);
  for (const item of s.items) {
    if (item.vy === undefined) continue;
    item.vy += 650 * dt;
    item.y = Math.min(FLOOR - 20, item.y + item.vy * dt);
  }
  const previousY = s.y;
  s.vy += 1500 * dt;
  s.y += s.vy * dt;
  const worldX = s.distance + PLAYER_X;
  const river = s.rivers.find(r => worldX > r.x && worldX < r.x + r.width);
  if (river && s.invincible <= 0) {
    const hippoX = river.x + river.width * 0.6;
    const hippoTop = FLOOR - 12;
    if (Math.abs(worldX - hippoX) < 44 && s.vy > 0 && previousY <= hippoTop && s.y >= hippoTop) {
      s.y = hippoTop;
      s.vy = -580;
      s.jumps = 1;
      s.duck = false;
      s.slideLeft = 0;
      s.bounces++;
      river.bounced = true;
      s.message = 'HIPPO BOUNCE!'; s.messageTime = 1;
    } else if (s.y > FLOOR + 55) hurt(s, 'SPLASH! Watch the crocodiles!');
  } else if (s.y >= FLOOR) {
    s.y = FLOOR; s.vy = 0; s.jumps = 0;
  }
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  for (const p of s.predators) {
    const ahead = p.x - worldX;
    p.age += dt;
    if (p.kind === 'snake') {
      if (p.state === 'waiting' && s.jumps > 0 && ahead > 0 && ahead < speed * 0.85) { p.state = 'attack'; p.age = 0; }
      if (p.state === 'attack') {
        p.x -= speed * 0.25 * dt;
        p.y = FLOOR - 22 - 110 * Math.sin(Math.min(1, p.age / 1.15) * Math.PI);
        if (p.age >= 1.15) { p.state = 'recover'; p.age = 0; }
      }
    } else {
      if (p.state === 'waiting' && ahead < speed * 2.5) { p.state = 'warning'; p.age = 0; }
      else if (p.state === 'warning' && p.age >= 0.9) { p.state = 'crouch'; p.age = 0; }
      else if (p.state === 'crouch' && ahead < speed * 0.9) { p.state = 'attack'; p.age = 0; }
      if (p.state === 'attack') {
        p.x -= speed * 0.45 * dt;
        p.y = FLOOR - 32 - 55 * Math.sin(Math.min(1, p.age / 1.2) * Math.PI);
        if (p.age >= 1.2) { p.state = 'recover'; p.age = 0; }
      }
    }
    const visible = p.kind === 'snake' || !['waiting', 'warning'].includes(p.state);
    const radiusX = p.kind === 'snake' ? 32 : 48;
    const radiusY = p.kind === 'snake' ? 25 : 28;
    if (visible && !p.hit && s.invincible <= 0 && Math.abs(p.x - worldX) < radiusX + 16 && p.y + radiusY >= s.y - height && p.y - radiusY <= s.y - 4) {
      p.hit = true;
      hurt(s, p.kind === 'snake' ? 'SNAKE STRIKE! Double jump!' : 'TIGER POUNCE! Watch the warning!');
      break;
    }
  }
  s.predators = s.predators.filter(p => p.x > s.distance - 120);
  for (const item of s.items) {
    const collectible = ['banana', 'golden', 'cherry'].includes(item.kind);
    if (item.collected || Math.abs(item.x - worldX) > (collectible ? 30 : 33)) continue;
    const radius = collectible ? 14 : 20;
    if (item.y + radius < s.y - height || item.y - radius > s.y - 4) continue;
    if (collectible) {
      item.collected = true;
      const previous = s.bananas;
      if (item.kind === 'cherry') { s.cherries++; s.bonusScore += 50; s.message = 'SWEET! +50 POINTS'; s.messageTime = 1; }
      else { s.bananas += item.kind === 'golden' ? 10 : 1; if (item.kind === 'golden') { s.golden++; s.message = 'GOLDEN BANANA! +10 COINS'; s.messageTime = 1; } }
      if (Math.floor(s.bananas / 100) > Math.floor(previous / 100)) { s.lives++; s.message = '100 BANANAS! +1 LIFE'; s.messageTime = 2; }
    } else if (s.invincible <= 0) { item.collected = true; hurt(s, 'BONK!'); break; }
  }
  s.items = s.items.filter(i => i.x > s.distance - 60 && !i.collected);
  s.rivers = s.rivers.filter(r => r.x + r.width > s.distance - 60);
}
