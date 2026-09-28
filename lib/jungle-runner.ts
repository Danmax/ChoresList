export const FLOOR = 310;
export const PLAYER_X = 150;
export const LEVELS = [
  { name: 'Banana Grove', sky: '#8de3e5', mist: '#ecf8b4', speed: 205 },
  { name: 'Snake River', sky: '#a7b9f3', mist: '#bce9d0', speed: 265 },
  { name: 'Sunset Canopy', sky: '#edaf8f', mist: '#ffe9a2', speed: 325 },
  { name: 'Tiger Territory', sky: '#7d83c4', mist: '#e7bbde', speed: 385 },
  { name: 'Moonlit Webs', sky: '#090e29', mist: '#33496b', speed: 445 },
] as const;
export const LEVEL_SECONDS = 60;
export const SLIDE_SECONDS = 1.5;
export const FLIP_SECONDS = 0.5;
export type RunnerItem = { x: number; y: number; kind: 'banana' | 'golden' | 'cherry' | 'drop' | 'low' | 'high' | 'canopy' | 'rolling' | 'bouncing'; collected?: boolean; vy?: number; rotation?: number };
export type Herd = { x: number; age: number; charging: boolean; warned: boolean };
export type Spider = { x: number; phase: number };
export const ELEPHANT_TOP = FLOOR - 112;
export function spiderPosition(spider: Spider, elapsed: number) {
  const angle = Math.sin(elapsed * 2.5 + spider.phase) * 0.52;
  return { x: spider.x + Math.sin(angle) * 222, y: 25 + Math.cos(angle) * 222 };
}
export type Bird = { x: number; y: number; gift: 'drop' | 'cherry'; dropped: boolean; releaseLeft?: number };
export type River = { x: number; width: number; vine?: boolean; used?: boolean; bounced?: boolean; bounceLeft?: number; snapLeft?: number[]; snapped?: boolean[] };
export function birdHeight(bird: Bird, elapsed: number) { return bird.y + Math.sin(elapsed * 7) * 5; }
export function crocodileFrame(remaining: number) {
  if (remaining <= 0) return 0;
  const age = 0.6 - remaining;
  return age < 0.15 ? 1 : age < 0.35 ? 2 : 3;
}
export function hippoFrame(river: River, worldX: number) {
  if ((river.bounceLeft ?? 0) > 0) return 3;
  const ahead = river.x + river.width * 0.6 - worldX;
  return ahead > -65 && ahead < 240 ? ahead < 150 ? 2 : 1 : 0;
}
export type Predator = { kind: 'snake' | 'tiger' | 'panther'; x: number; y: number; state: 'waiting' | 'warning' | 'crouch' | 'attack' | 'recover'; age: number; hit: boolean; temperament: number; homeX: number; facing: number };
export function createPredator(kind: Predator['kind'], x: number, temperament = Math.random()): Predator {
  return { kind, x, y: FLOOR - 22, state: 'waiting', age: 0, hit: false, temperament, homeX: x, facing: -1 };
}
export type Runner = ReturnType<typeof createRunner>;
export function runnerSpeed(s: Runner) { return LEVELS[s.level].speed + (s.elapsed % LEVEL_SECONDS) * 0.3; }
export function dashBoost(s: Runner) {
  return s.duck && s.y >= FLOOR - 1 && s.stun <= 0 ? 180 * (s.slideLeft / SLIDE_SECONDS) ** 2 : 0;
}
export function airBoost(s: Runner) { return 180 * (s.flipLeft / FLIP_SECONDS) ** 2; }
export function travelSpeed(s: Runner) { return runnerSpeed(s) + dashBoost(s) + airBoost(s); }
export function vinePosition(r: River, elapsed: number, progress?: number) {
  const t = progress ?? (0.5 + Math.sin(elapsed * 2.2 + r.x * 0.001) * 0.5);
  return { x: r.x - 45 + (r.width + 90) * t, y: 160 + Math.sin(t * Math.PI) * 45 };
}

export function createRunner() {
  return {
    phase: 'ready' as 'ready' | 'playing' | 'over' | 'victory',
    distance: 0, elapsed: 0, level: 0, y: FLOOR, vy: 0, jumps: 0, duck: false, duckHeld: false, slideLeft: 0, cameraLead: 0,
    flipLeft: 0, swing: null as { river: River; progress: number } | null,
    cracks: [] as { x: number; y: number; age: number }[],
    golden: 0, cherries: 0, bonusScore: 0,
    lives: 3, bananas: 0, hits: 0, bounces: 0, stun: 0, invincible: 0,
    message: '', messageTime: 0, nextSection: 950, section: 0,
    items: Array.from({ length: 12 }, (_, i): RunnerItem => ({ x: 380 + i * 42, y: FLOOR - 30, kind: 'banana' })),
    herds: [] as Herd[], spiders: [] as Spider[], elephantBounces: 0,
    rivers: [] as River[], birds: [] as Bird[], birdsSpawned: 0, predators: [] as Predator[],
  };
}

export function jumpRunner(s: Runner) {
  if (s.phase !== 'playing' || s.stun > 0) return;
  if (s.swing) { s.swing = null; s.jumps = 0; }
  if (s.jumps >= 2) return;
  s.duck = false;
  s.slideLeft = 0;
  s.vy = -540;
  s.jumps++;
  if (s.jumps === 2) s.flipLeft = FLIP_SECONDS;
}

export function duckRunner(s: Runner, held: boolean) {
  if (!held) { s.duckHeld = false; s.duck = false; s.slideLeft = 0; return; }
  if (s.duckHeld || s.phase !== 'playing' || s.stun > 0) return;
  if (s.swing) return;
  s.flipLeft = 0;
  s.duckHeld = true;
  s.duck = true;
  s.slideLeft = SLIDE_SECONDS;
  if (s.y < FLOOR) s.vy = Math.max(650, s.vy);
}

export function runnerScore(s: Runner) { return s.bananas * 10 + s.bonusScore; }

function hurt(s: Runner, message: string) {
  if (s.invincible > 0) return;
  s.swing = null;
  s.flipLeft = 0;
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
  const patterns = [[8, 1, 10, 11, 12, 4, 3, 7, 6], [12, 5, 9, 10, 11, 4, 3, 7, 6, 8], [7, 12, 11, 5, 10, 9, 4, 1, 3, 8, 6], [7, 11, 12, 10, 9, 5, 8, 7, 3, 6, 5, 4, 1], [13, 11, 13, 12, 10, 7, 13, 4, 8]][s.level];
  const type = patterns[s.section++ % patterns.length];
  if (type === 12) {
    s.herds.push({ x, age: 0, charging: false, warned: false });
  } else if (type === 13) {
    s.spiders.push({ x, phase: s.section * 1.7 });
  } else if (type === 10) {
    s.rivers.push({ x, width: 680, vine: true });
  } else if (type === 11) {
    s.predators.push(createPredator('panther', x));
  } else if (type === 3) {
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
  } else if (type === 8 || type === 9) {
    s.items.push({ x, y: FLOOR - 20, kind: type === 8 ? 'rolling' : 'bouncing', vy: type === 9 ? -360 : undefined, rotation: 0 });
  } else {
    s.items.push({ x, y: type === 0 ? FLOOR - 22 : type === 1 ? FLOOR - 64 : FLOOR - 118, kind: type === 0 ? 'low' : type === 1 ? 'high' : 'canopy' });
  }
  for (let i = 0; i < 10; i++) s.items.push({ x: x + (type === 10 || type === 12 ? 820 : 470) + i * 40, y: FLOOR - 28, kind: 'banana' });
  s.nextSection += type === 10 || type === 12 ? 1450 : 1100;
}

export function stepRunner(s: Runner, dt: number) {
  if (s.phase !== 'playing') return;
  for (const crack of s.cracks) crack.age += dt;
  s.cracks = s.cracks.filter(c => c.age < 0.75);
  s.flipLeft = Math.max(0, s.flipLeft - dt);
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
  if (level !== s.level) { s.level = level; s.section = 0; s.message = `LEVEL ${level + 1}: ${LEVELS[level].name}`; s.messageTime = 3; }
  const speed = runnerSpeed(s);
  const boost = dashBoost(s) + airBoost(s);
  if (!s.swing) s.distance += (speed + boost) * dt;
  // Camera lags briefly behind a dash: the monkey visibly surges forward while
  // world-space collisions stay aligned with the faster movement.
  s.cameraLead += (boost * 0.2 - s.cameraLead) * (1 - Math.exp(-10 * dt));
  if (s.nextSection < s.distance + 1000) addSection(s);
  for (const bird of s.birds) {
    bird.releaseLeft = Math.max(0, (bird.releaseLeft ?? 0) - dt);
    bird.x -= 45 * dt;
    if (!bird.dropped && bird.x - s.distance <= 620) {
      bird.dropped = true;
      bird.releaseLeft = 0.3;
      s.items.push({ x: bird.x, y: birdHeight(bird, s.elapsed) + 22, kind: bird.gift, vy: 0, rotation: 0 });
    }
  }
  s.birds = s.birds.filter(b => b.x > s.distance - 80);
  for (const item of s.items) {
    if (item.kind === 'rolling' || item.kind === 'bouncing') {
      // Activate on approach so moving hazards cannot drift into earlier sections.
      if (item.x - s.distance > 860) continue;
      const rollSpeed = 75 + s.level * 12;
      item.x -= rollSpeed * dt;
      item.rotation = (item.rotation ?? 0) - rollSpeed / 20 * dt;
      if (item.kind === 'bouncing') {
        item.vy = (item.vy ?? -360) + 900 * dt;
        item.y += item.vy * dt;
        if (item.y >= FLOOR - 20) { item.y = FLOOR - 20; item.vy = -360; }
      }
      continue;
    }
    if (item.vy === undefined) continue;
    item.vy += 650 * dt;
    item.y = Math.min(FLOOR - 20, item.y + item.vy * dt);
    if (item.kind === 'drop') {
      item.rotation = (item.rotation ?? 0) - dt * 3;
      if (item.y >= FLOOR - 20) {
        // The impact transitions into the same leftward bounce physics as the
        // approaching coconuts, rather than leaving a stationary obstacle.
        item.kind = 'bouncing'; item.vy = -360;
      }
    }
  }
  const previousY = s.y;
  if (s.swing) {
    s.swing.progress = Math.min(1, s.swing.progress + dt * speed * 1.25 / (s.swing.river.width + 90));
    const tip = vinePosition(s.swing.river, s.elapsed, s.swing.progress);
    s.distance = tip.x - PLAYER_X; s.y = tip.y + 55; s.vy = 0;
    if (s.swing.progress >= 1) { s.swing = null; s.jumps = 0; jumpRunner(s); }
  } else { s.vy += 1500 * dt; s.y += s.vy * dt; }
  for (const r of s.rivers) {
    if (!r.vine || r.used || s.swing || s.jumps === 0 || s.duck) continue;
    const tip = vinePosition(r, s.elapsed);
    if (Math.abs(tip.x - (s.distance + PLAYER_X)) < 48 && Math.abs(tip.y - (s.y - 55)) < 50) {
      r.used = true; s.swing = { river: r, progress: (tip.x - r.x + 45) / (r.width + 90) };
      s.flipLeft = 0; s.message = 'VINE GRAB! Jump to release'; s.messageTime = 1.5;
    }
  }
  const worldX = s.distance + PLAYER_X;
  for (const r of s.rivers) {
    r.bounceLeft = Math.max(0, (r.bounceLeft ?? 0) - dt);
    r.snapLeft ??= [0, 0]; r.snapped ??= [false, false];
    for (let i = 0; i < 2; i++) {
      r.snapLeft[i] = Math.max(0, r.snapLeft[i] - dt);
      const crocX = r.x + (i === 0 ? 35 : r.width - 35);
      if (!r.snapped[i] && s.y < FLOOR - 2 && Math.abs(worldX - crocX) < 75) {
        r.snapped[i] = true; r.snapLeft[i] = 0.6;
      }
    }
  }
  const river = s.rivers.find(r => worldX > r.x && worldX < r.x + r.width);
  if (river && s.invincible <= 0) {
    const hippoX = river.x + river.width * 0.6;
    const hippoTop = FLOOR - 12;
    if (!river.vine && Math.abs(worldX - hippoX) < 44 && s.vy > 0 && previousY <= hippoTop && s.y >= hippoTop) {
      s.y = hippoTop;
      s.vy = -580;
      s.jumps = 1;
      s.duck = false;
      s.slideLeft = 0;
      s.bounces++;
      river.bounced = true;
      river.bounceLeft = 0.45;
      s.message = 'HIPPO BOUNCE!'; s.messageTime = 1;
    } else if (s.y > FLOOR + 55) hurt(s, 'SPLASH! Watch the crocodiles!');
  } else if (s.y >= FLOOR) {
    s.y = FLOOR; s.vy = 0; s.jumps = 0;
  }
  for (const herd of s.herds) {
    const ahead = herd.x - worldX;
    if (!herd.warned && ahead < 780) {
      herd.warned = true; s.message = 'STAMPEDE! Double jump onto backs!'; s.messageTime = 2;
    }
    if (herd.warned) herd.age += dt;
    if (herd.age > 0.85) herd.charging = true;
    if (herd.charging) herd.x -= 135 * dt;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(worldX - (herd.x + i * 175)) > 65) continue;
      if (s.vy > 0 && previousY <= ELEPHANT_TOP && s.y >= ELEPHANT_TOP) {
        s.y = ELEPHANT_TOP; s.vy = -460; s.jumps = 1; s.duck = false; s.slideLeft = 0; s.flipLeft = 0;
        s.elephantBounces++; s.message = 'HERD HOP!'; s.messageTime = 0.7;
      } else if (s.y > ELEPHANT_TOP + 8) hurt(s, 'TRAMPLED! Double jump onto backs!');
    }
  }
  s.herds = s.herds.filter(h => h.x + 440 > s.distance - 80);
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  for (const spider of s.spiders) {
    const pos = spiderPosition(spider, s.elapsed);
    if (Math.abs(pos.x - worldX) < 43 && pos.y + 23 >= s.y - height && pos.y - 23 <= s.y - 4) hurt(s, 'SPIDER SWING! Slide under!');
  }
  s.spiders = s.spiders.filter(p => p.x > s.distance - 200);
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
    } else if (p.kind === 'panther') {
      if (p.state === 'waiting') {
        p.x = p.homeX + Math.sin(p.age * 1.5) * 75;
        p.facing = Math.cos(p.age * 1.5) >= 0 ? 1 : -1;
        const delta = worldX - p.x;
        if (Math.abs(delta) < speed * 1.5 && delta * p.facing > 0 && s.y > FLOOR - 190) {
          p.state = 'warning'; p.age = 0;
        }
      } else if (p.state === 'warning' && p.age > 0.32) {
        p.state = 'attack'; p.age = 0; p.facing = worldX < p.x ? -1 : 1;
      } else if (p.state === 'attack') {
        p.x += p.facing * (speed + 280) * dt;
        p.y = FLOOR - 27 - Math.sin(Math.min(1, p.age / 0.8) * Math.PI) * 15;
        if (p.age > 0.9) { p.state = 'recover'; p.age = 0; }
      }
    } else {
      if (p.state === 'waiting' && ahead < speed * 2.5) { p.state = 'warning'; p.age = 0; }
      else if (p.state === 'warning' && p.age >= 0.9) { p.state = 'crouch'; p.age = 0; }
      else if (p.state === 'crouch' && ahead < speed * (0.75 + p.temperament * 0.4)) { p.state = 'attack'; p.age = 0; }
      if (p.state === 'attack') {
        p.x -= speed * (0.6 + p.temperament * 0.45) * dt;
        p.y = FLOOR - 42 - (95 + p.temperament * 30) * Math.sin(Math.min(1, p.age / 0.95) * Math.PI);
        if (p.age >= 0.95) { p.state = 'recover'; p.age = 0; }
      }
    }
    const visible = p.kind !== 'tiger' || !['waiting', 'warning'].includes(p.state);
    const radiusX = p.kind === 'snake' ? 32 : 48;
    const radiusY = p.kind === 'snake' ? 25 : 28;
    if (visible && !p.hit && s.invincible <= 0 && Math.abs(p.x - worldX) < radiusX + 16 && p.y + radiusY >= s.y - height && p.y - radiusY <= s.y - 4) {
      p.hit = true;
      hurt(s, p.kind === 'snake' ? 'SNAKE STRIKE! Double jump!' : p.kind === 'panther' ? 'PANTHER CHARGE! Jump over it!' : 'TIGER POUNCE! Watch the warning!');
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
    } else if (s.invincible <= 0) { item.collected = true; s.cracks.push({ x: item.x, y: item.y, age: 0 }); hurt(s, 'CRACK!'); break; }
  }
  s.items = s.items.filter(i => i.x > s.distance - 60 && !i.collected);
  s.rivers = s.rivers.filter(r => r.x + r.width > s.distance - 60);
}
