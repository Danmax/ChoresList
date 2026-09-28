export const FLOOR = 310;
export const PLAYER_X = 150;
export type RunnerItem = { x: number; y: number; kind: 'banana' | 'low' | 'high' | 'canopy'; collected?: boolean };
export type River = { x: number; width: number; bounced?: boolean };
export type Runner = ReturnType<typeof createRunner>;

export function createRunner() {
  return {
    phase: 'ready' as 'ready' | 'playing' | 'over' | 'victory',
    distance: 0, elapsed: 0, y: FLOOR, vy: 0, jumps: 0, duck: false,
    lives: 3, bananas: 0, hits: 0, bounces: 0, stun: 0, invincible: 0,
    message: '', messageTime: 0, nextSection: 950, section: 0,
    items: Array.from({ length: 12 }, (_, i): RunnerItem => ({ x: 380 + i * 42, y: FLOOR - 30, kind: 'banana' })),
    rivers: [] as River[],
  };
}

export function jumpRunner(s: Runner) {
  if (s.phase !== 'playing' || s.stun > 0 || s.jumps >= 2) return;
  s.duck = false;
  s.vy = -540;
  s.jumps++;
}

export function duckRunner(s: Runner, held: boolean) {
  s.duck = held;
  if (held && s.y < FLOOR && s.phase === 'playing') s.vy = Math.max(650, s.vy);
}

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
  if (s.lives <= 0) s.phase = 'over';
}

// Fixed world coordinates and authored sections keep reaction times independent
// of screen size. Every challenge is followed by a long, safe coin trail.
function addSection(s: Runner) {
  const x = s.nextSection;
  const type = s.section++ % 4;
  if (type === 3) {
    s.rivers.push({ x, width: 250 });
    for (let i = 0; i < 7; i++) s.items.push({ x: x + i * 40, y: FLOOR - 110, kind: 'banana' });
  } else {
    s.items.push({ x, y: type === 0 ? FLOOR - 22 : type === 1 ? FLOOR - 64 : FLOOR - 118, kind: type === 0 ? 'low' : type === 1 ? 'high' : 'canopy' });
  }
  for (let i = 0; i < 12; i++) s.items.push({ x: x + 360 + i * 40, y: FLOOR - 28, kind: 'banana' });
  s.nextSection += 1100;
}

export function stepRunner(s: Runner, dt: number) {
  if (s.phase !== 'playing') return;
  s.messageTime = Math.max(0, s.messageTime - dt);
  s.invincible = Math.max(0, s.invincible - dt);
  if (s.stun > 0) { s.stun = Math.max(0, s.stun - dt); return; }
  s.elapsed += dt;
  if (s.elapsed >= 60) { s.phase = 'victory'; return; }
  const speed = Math.min(280, 205 + s.elapsed * 1.2);
  s.distance += speed * dt;
  if (s.nextSection < s.distance + 1000) addSection(s);
  const previousY = s.y;
  s.vy += 1500 * dt;
  s.y += s.vy * dt;
  const worldX = s.distance + PLAYER_X;
  const river = s.rivers.find(r => worldX > r.x && worldX < r.x + r.width);
  if (river && s.invincible <= 0) {
    const hippoX = river.x + river.width / 2;
    const hippoTop = FLOOR - 12;
    if (Math.abs(worldX - hippoX) < 44 && s.vy > 0 && previousY <= hippoTop && s.y >= hippoTop) {
      s.y = hippoTop;
      s.vy = -580;
      s.jumps = 1;
      s.duck = false;
      s.bounces++;
      river.bounced = true;
      s.message = 'HIPPO BOUNCE!'; s.messageTime = 1;
    } else if (s.y > FLOOR + 55) hurt(s, 'SPLASH! Watch the crocodiles!');
  } else if (s.y >= FLOOR) {
    s.y = FLOOR; s.vy = 0; s.jumps = 0;
  }
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  for (const item of s.items) {
    if (item.collected || Math.abs(item.x - worldX) > (item.kind === 'banana' ? 30 : 33)) continue;
    const radius = item.kind === 'banana' ? 14 : 20;
    if (item.y + radius < s.y - height || item.y - radius > s.y - 4) continue;
    if (item.kind === 'banana') {
      item.collected = true;
      s.bananas++;
      if (s.bananas % 100 === 0) { s.lives++; s.message = '100 BANANAS! +1 LIFE'; s.messageTime = 2; }
    } else if (s.invincible <= 0) { item.collected = true; hurt(s, 'BONK!'); break; }
  }
  s.items = s.items.filter(i => i.x > s.distance - 60 && !i.collected);
  s.rivers = s.rivers.filter(r => r.x + r.width > s.distance - 60);
}
