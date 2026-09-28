import { createInsect, INSECT_KINDS, stepInsects, type Insect, type AntRock, type HitReaction } from './jungle-insects';
export const FLOOR = 310;
export const PLAYER_X = 150;
export const RUNNER_DIFFICULTIES = {
  easy: { label: 'Easy', speed: 0.8, lives: 5, protection: 3.5, seconds: 42, description: '42-second levels · 5 lives · gentler obstacles' },
  medium: { label: 'Medium', speed: 1, lives: 3, protection: 2.5, seconds: 51, description: '51-second levels · 3 lives · classic adventure' },
  hard: { label: 'Hard', speed: 1.2, lives: 2, protection: 1.5, seconds: 60, description: '60-second levels · 2 lives · every challenge' },
} as const;
export type RunnerDifficulty = keyof typeof RUNNER_DIFFICULTIES;
export const LEVELS = [
  { name: 'Banana Grove', sky: '#8de3e5', mist: '#ecf8b4', speed: 205 },
  { name: 'Snake River', sky: '#a7b9f3', mist: '#bce9d0', speed: 265 },
  { name: 'Sunset Canopy', sky: '#edaf8f', mist: '#ffe9a2', speed: 325 },
  { name: 'Tiger Territory', sky: '#7d83c4', mist: '#e7bbde', speed: 385 },
  { name: 'Moonlit Webs', sky: '#090e29', mist: '#33496b', speed: 445 },
  { name: 'Giant Insect Grove', sky: '#542b79', mist: '#b4efd0', speed: 505 },
] as const;
export const LEVEL_SECONDS = 60;
export const SLIDE_SECONDS = 1.5;
export const FLIP_SECONDS = 0.5;
export const GEM_Y = FLOOR - 235;
export type RunnerItem = { x: number; y: number; kind: 'banana' | 'golden' | 'cherry' | 'heart' | 'fruit' | 'star' | 'gem' | 'drop' | 'low' | 'high' | 'canopy' | 'rolling' | 'bouncing'; collected?: boolean; level?: number; vy?: number; rotation?: number };
export const GEMS = [
  { name: 'Emerald', color: '#4cf7ae' }, { name: 'Sapphire', color: '#6fbaff' },
  { name: 'Ruby', color: '#ff6e97' }, { name: 'Amber', color: '#ffcb56' },
  { name: 'Moonstone', color: '#d2b7ff' }, { name: 'Peridot', color: '#c4ff57' },
] as const;
export type Hog = { herdX: number; x: number; y: number; vy: number; age: number; jumper: boolean; jumpIn: number; active: boolean };
export function createHogs(x: number, speed: number, random = Math.random): Hog[] {
  const gap = (speed + 105) * 0.46;
  return Array.from({ length: 6 }, (_, i) => ({ herdX: x, x: x + i * gap + (i >= 4 ? gap * 0.2 : 0), y: FLOOR - 25, vy: 0, age: 0, jumper: i >= 4, jumpIn: 0.5 + random() * 1.2, active: false }));
}
export type Bat = { x: number; y: number; age: number; state: 'flying' | 'warning' | 'diving' | 'leaving' };
export function createBats(x: number): Bat[] {
  return Array.from({ length: 4 }, (_, i) => ({ x: x + i * 100, y: 80 + i % 2 * 16, age: 0, state: 'flying' }));
}
export type Herd = { x: number; age: number; charging: boolean; warned: boolean };
export type Spider = { x: number; phase: number };
export const ELEPHANT_TOP = FLOOR - 112;
export function spiderPosition(spider: Spider, elapsed: number) {
  const angle = Math.sin(elapsed * 2.5 + spider.phase) * 0.52;
  return { x: spider.x + Math.sin(angle) * 222, y: 25 + Math.cos(angle) * 222 };
}
export type Bird = { x: number; y: number; gift: 'drop' | 'cherry' | 'heart' | 'fruit' | 'star'; dropped: boolean; releaseLeft?: number };
export type Sloth = { x: number; y: number; homeY: number; targetY: number; age: number; state: 'waiting' | 'lowering' | 'climbing'; reward: 'heart' | 'fruit' | 'star'; dropped: boolean };
export type Lemming = { x: number; y: number; endX: number; age: number; used: boolean };
export type River = { resident?: 'piranha' | 'eel'; waterAge?: number; x: number; width: number; vine?: boolean; used?: boolean; bounced?: boolean; bounceLeft?: number; snapLeft?: number[]; snapped?: boolean[] };
export type Orangutan = { x: number; age: number; state: 'dance' | 'windup' | 'throw' | 'recover'; throws: number };
export type Pineapple = { x: number; y: number; vx: number; vy: number; rotation: number };
export function createOrangutan(x: number): Orangutan { return { x, age: 0, state: 'dance', throws: 0 }; }
export function orangutanHand(o: Orangutan) {
  const t = Math.min(1, o.age / 0.55);
  if (o.state === 'windup') return { x: o.x + 20 + t * 22, y: FLOOR - 130 - t * 40 };
  if (o.state === 'throw') return { x: o.x - 55, y: FLOOR - 145 };
  return { x: o.x + 42, y: FLOOR - 100 + Math.sin(o.age * 7) * 15 };
}
export function piranhaPosition(r: River, index: number) {
  const t = ((r.waterAge ?? 0) + index * 0.7) % 2.2;
  const jumping = t >= 0.45 && t < 1.45;
  // In wide pits the fish breach below the safe vine arc.
  const arc = jumping ? (t - 0.45) : 0;
  return { x: r.x + r.width * (index === 0 ? 0.26 : 0.8) + (jumping ? (arc - 0.5) * 55 : 0), y: FLOOR + 25 - (jumping ? Math.sin(arc * Math.PI) * (r.vine ? 60 : 112) : 0), jumping, warning: t < 0.45, angle: jumping ? -0.9 + arc * 1.8 : 0 };
}
export function eelPhase(r: River) {
  const t = (r.waterAge ?? 0) % 3;
  return t < 0.85 ? 'charge' : t < 1.4 ? 'shock' : 'swim';
}
export function birdHeight(bird: Bird, elapsed: number) { return bird.y + Math.sin(elapsed * 7) * 5; }
export function slothPosition(sloth: Sloth) { return { x: sloth.x, y: sloth.y }; }
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
export type Predator = { kind: 'snake' | 'tiger' | 'panther'; x: number; y: number; state: 'waiting' | 'warning' | 'crouch' | 'attack' | 'recover'; age: number; hit: boolean; temperament: number; homeX: number; facing: number; attackStyle: 'leap' | 'rush' | 'intercept'; attackSpeed: number; leapHeight: number };
export function createPredator(kind: Predator['kind'], x: number, temperament = Math.random()): Predator {
  return { kind, x, y: FLOOR - 22, state: 'waiting', age: 0, hit: false, temperament, homeX: x, facing: -1, attackStyle: 'leap', attackSpeed: 0, leapHeight: 0 };
}
export type Runner = ReturnType<typeof createRunner>;
export function levelSeconds(s: Pick<Runner, 'difficulty'>) { return RUNNER_DIFFICULTIES[s.difficulty].seconds; }
export function runnerSpeed(s: Runner) { return (LEVELS[s.level].speed + (s.elapsed % levelSeconds(s)) * 0.3) * RUNNER_DIFFICULTIES[s.difficulty].speed; }
export function dashBoost(s: Runner) {
  return s.duck && s.y >= FLOOR - 1 && s.stun <= 0 ? 180 * (s.slideLeft / SLIDE_SECONDS) ** 2 : 0;
}
export function airBoost(s: Runner) { return 180 * (s.flipLeft / FLIP_SECONDS) ** 2; }
export function travelSpeed(s: Runner) { return runnerSpeed(s) + dashBoost(s) + airBoost(s); }
export function vinePosition(r: River, elapsed: number, progress?: number) {
  const t = progress ?? (0.5 + Math.sin(elapsed * 2.2 + r.x * 0.001) * 0.5);
  return { x: r.x - 45 + (r.width + 90) * t, y: 160 + Math.sin(t * Math.PI) * 45 };
}

export function createRunner(difficulty: RunnerDifficulty = 'medium') {
  return {
    difficulty,
    insects: [] as Insect[], antRocks: [] as AntRock[], caterpillarBounces: 0,
    reaction: 'bonk' as HitReaction, reactionLeft: 0,
    phase: 'ready' as 'ready' | 'playing' | 'over' | 'victory',
    distance: 0, elapsed: 0, level: 0, y: FLOOR, vy: 0, jumps: 0, duck: false, duckHeld: false, slideLeft: 0, cameraLead: 0,
    flipLeft: 0, swing: null as ({ river: River; progress: number } | { lemming: Lemming; progress: number }) | null,
    cracks: [] as { x: number; y: number; age: number }[],
    golden: 0, cherries: 0, bonusScore: 0, gems: 0,
    gemSpawned: LEVELS.map(() => false), gemCollected: LEVELS.map(() => false),
    lives: Number(RUNNER_DIFFICULTIES[difficulty].lives), bananas: 0, hits: 0, bounces: 0, stun: 0, invincible: 0,
    message: '', messageTime: 0, nextSection: 950, section: 0,
    items: Array.from({ length: 12 }, (_, i): RunnerItem => ({ x: 380 + i * 42, y: FLOOR - 30, kind: 'banana' })),
    orangutans: [] as Orangutan[], pineapples: [] as Pineapple[], splats: [] as { x: number; y: number; age: number }[],
    hogs: [] as Hog[], bats: [] as Bat[],
    herds: [] as Herd[], spiders: [] as Spider[], elephantBounces: 0,
    rivers: [] as River[], birds: [] as Bird[], birdsSpawned: 0, sloths: [] as Sloth[], lemmings: [] as Lemming[], predators: [] as Predator[],
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

function hurt(s: Runner, message: string, reaction: HitReaction = 'bonk') {
  if (s.invincible > 0) return;
  s.swing = null;
  s.flipLeft = 0;
  s.lives--;
  s.hits++;
  s.stun = 0.65;
  s.reaction = reaction; s.reactionLeft = 0.9;
  s.invincible = RUNNER_DIFFICULTIES[s.difficulty].protection;
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
  if (s.level === 5) {
    // Easy mode finishes in the friendly caterpillar grove instead of adding
    // the fast insect patterns from the higher difficulties.
    if (s.difficulty === 'easy') {
      s.section++;
      s.insects.push(createInsect('caterpillar', x));
      for (let i = 0; i < 8; i++) s.items.push({ x: x + 90 + i * 42, y: FLOOR - 125, kind: 'banana' });
      s.nextSection += 1100;
      return;
    }
    const finale = s.elapsed % levelSeconds(s) >= levelSeconds(s) - 20;
    const kind = finale && !s.gemSpawned[5] ? 'caterpillar' : INSECT_KINDS[s.section % INSECT_KINDS.length];
    s.section++;
    s.insects.push(createInsect(kind, x));
    if (kind === 'fire-ant') {
      const count = { easy: 2, medium: 3, hard: 4 }[s.difficulty];
      for (let i = 1; i < count; i++) s.insects.push(createInsect(kind, x + i * 65));
    }
    if (kind === 'caterpillar') {
      for (let i = 0; i < 5; i++) s.items.push({ x: x + 80 + i * 45, y: FLOOR - 160, kind: 'banana' });
      if (finale && !s.gemSpawned[5]) {
        s.gemSpawned[5] = true;
        s.items.push({ x: x + runnerSpeed(s) * 0.4, y: GEM_Y, kind: 'gem', level: 5 });
      }
    }
    for (let i = 0; i < 8; i++) s.items.push({ x: x + 650 + i * 40, y: FLOOR - 28, kind: 'banana' });
    s.nextSection += Math.max(1400, runnerSpeed(s) * 3.1);
    return;
  }
  const patterns = [[8, 16, 10, 14, 3, 11, 12, 4, 7, 6], [16, 3, 12, 14, 5, 9, 10, 11, 4, 7, 6, 8], [7, 16, 14, 12, 11, 5, 10, 9, 4, 1, 3, 8, 6], [16, 7, 11, 14, 12, 10, 9, 5, 8, 7, 3, 6, 5, 4, 1], [13, 15, 16, 14, 11, 13, 12, 15, 10, 7, 3, 13, 4, 8]][s.level];
  const easyPatterns = [[0, 1, 3, 4, 6, 14, 1, 12, 4, 3], [1, 3, 4, 6, 14, 0, 12, 1, 4, 3], [4, 0, 3, 14, 6, 1, 12, 4, 3, 0], [1, 4, 12, 3, 14, 6, 0, 4, 1, 3], [0, 1, 3, 4, 6, 14, 12, 1, 4, 3]][s.level];
  const source = s.difficulty === 'easy' ? easyPatterns : patterns;
  const type = source[s.section++ % source.length];
  let recovery = type === 10 || type === 12 ? 820 : 470;
  if (type === 16) {
    s.orangutans.push(createOrangutan(x)); recovery = 800;
  } else if (type === 14) {
    const hogs = createHogs(x, runnerSpeed(s)); s.hogs.push(...hogs);
    if (s.difficulty === 'easy') hogs.forEach(hog => { hog.jumper = false; });
    s.lemmings.push({ x: x + 90, y: FLOOR - 112, endX: hogs[5].x + 230, age: 0, used: false });
    recovery = hogs[5].x - x + 400;
  } else if (type === 15) {
    s.bats.push(...createBats(x)); recovery = 800;
  } else if (type === 12) {
    s.herds.push({ x, age: 0, charging: false, warned: false });
    s.lemmings.push({ x: x + 75, y: FLOOR - 112, endX: x + 680, age: 0, used: false });
  } else if (type === 13) {
    s.spiders.push({ x, phase: s.section * 1.7 });
  } else if (type === 10) {
    s.rivers.push({ x, width: 680, vine: true, resident: (s.level + s.section) % 2 ? 'piranha' : 'eel', waterAge: 0 });
  } else if (type === 11) {
    s.predators.push(createPredator('panther', x));
  } else if (type === 3) {
    // Wider rivers at higher speeds preserve the hippo landing window.
    s.rivers.push({ x, width: Math.max(250, runnerSpeed(s) * 1.05), resident: s.difficulty === 'easy' ? undefined : (s.level + s.section) % 2 ? 'eel' : 'piranha', waterAge: 0 });
    for (let i = 0; i < 7; i++) s.items.push({ x: x + i * 40, y: FLOOR - 110, kind: 'banana' });
  } else if (type === 4) {
    // A single jump reaches ~97px; these prizes require the second air jump.
    for (let i = 0; i < 3; i++) s.items.push({ x: x + i * 36, y: FLOOR - 215, kind: 'golden' });
    s.items.push({ x: x - 90, y: FLOOR - 105, kind: 'banana' });
  } else if (type === 5) {
    s.predators.push(createPredator('snake', x));
  } else if (type === 6) {
    const gifts: Bird['gift'][] = ['cherry', 'fruit', 'heart', 'star', 'drop'];
    s.birds.push({ x, y: 70, gift: gifts[s.birdsSpawned++ % gifts.length], dropped: false });
  } else if (type === 7) {
    s.predators.push(createPredator('tiger', x));
  } else if (type === 8 || type === 9) {
    s.items.push({ x, y: FLOOR - 20, kind: type === 8 ? 'rolling' : 'bouncing', vy: type === 9 ? -360 : undefined, rotation: 0 });
  } else {
    s.items.push({ x, y: type === 0 ? FLOOR - 22 : type === 1 ? FLOOR - 64 : FLOOR - 118, kind: type === 0 ? 'low' : type === 1 ? 'high' : 'canopy' });
  }
  // A sloth lowers one helpful gift into every few clearings. Its deliberately
  // slow descent makes the reward readable rather than a surprise pickup.
  if (s.section % 3 === 0) {
    const rewards: Sloth['reward'][] = ['heart', 'fruit', 'star'];
    s.sloths.push({ x: x + recovery * 0.55, y: 22, homeY: 22, targetY: FLOOR - 92, age: 0, state: 'waiting', reward: rewards[(s.section / 3 - 1) % rewards.length], dropped: false });
  }
  for (let i = 0; i < 10; i++) s.items.push({ x: x + recovery + i * 40, y: FLOOR - 28, kind: 'banana' });
  if (!s.gemSpawned[s.level]) {
    s.gemSpawned[s.level] = true;
    s.items.push({ x: x + recovery + 180, y: GEM_Y, kind: 'gem', level: s.level });
  }
  s.nextSection += recovery + 630;
}

export function stepRunner(s: Runner, dt: number) {
  s.reactionLeft = Math.max(0, s.reactionLeft - dt);
  if (s.phase !== 'playing') return;
  for (const splat of s.splats) splat.age += dt;
  s.splats = s.splats.filter(p => p.age < 0.65);
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
  if (s.elapsed >= levelSeconds(s) * LEVELS.length) { s.phase = 'victory'; return; }
  const level = Math.floor(s.elapsed / levelSeconds(s));
  if (level !== s.level) {
    if (level === 5) {
      s.items = []; s.rivers = []; s.predators = []; s.hogs = []; s.bats = []; s.herds = []; s.spiders = []; s.orangutans = []; s.pineapples = []; s.birds = []; s.sloths = []; s.lemmings = [];
      s.swing = null; s.nextSection = s.distance + 1100;
    }
    s.level = level; s.section = 0; s.items = s.items.filter(i => i.kind !== 'gem'); s.message = `LEVEL ${level + 1}: ${LEVELS[level].name}`; s.messageTime = 3; }
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
  for (const sloth of s.sloths) {
    sloth.age += dt;
    const ahead = sloth.x - (s.distance + PLAYER_X);
    // Do not begin the slow descent until the player can see the whole gift
    // sequence. Once the gift is left, the sloth climbs back to its canopy.
    if (sloth.state === 'waiting' && ahead < 620 && ahead > -70) sloth.state = 'lowering';
    if (sloth.state === 'lowering') sloth.y = Math.min(sloth.targetY, sloth.y + 150 * dt);
    if (!sloth.dropped && sloth.state === 'lowering' && sloth.y >= sloth.targetY) {
      sloth.dropped = true;
      s.items.push({ x: sloth.x, y: sloth.targetY + 18, kind: sloth.reward });
      sloth.state = 'climbing';
    }
    if (sloth.state === 'climbing') sloth.y = Math.max(sloth.homeY, sloth.y - 220 * dt);
  }
  s.sloths = s.sloths.filter(sloth => sloth.x > s.distance - 100);
  for (const lemming of s.lemmings) {
    lemming.age += dt;
    if (lemming.used || s.swing || s.jumps === 0) continue;
    if (Math.abs(lemming.x - (s.distance + PLAYER_X)) < 52 && Math.abs(lemming.y - (s.y - 55)) < 72) {
      lemming.used = true; s.swing = { lemming, progress: 0 };
      s.flipLeft = 0; s.message = 'LEMMING LIFT! Swing over the herd!'; s.messageTime = 1.7;
    }
  }
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
    if ('river' in s.swing) {
      s.swing.progress = Math.min(1, s.swing.progress + dt * speed * 1.25 / (s.swing.river.width + 90));
      const tip = vinePosition(s.swing.river, s.elapsed, s.swing.progress);
      s.distance = tip.x - PLAYER_X; s.y = tip.y + 55;
    } else {
      s.swing.progress = Math.min(1, s.swing.progress + dt * 1.25);
      const { lemming } = s.swing;
      const arc = Math.sin(s.swing.progress * Math.PI) * 118;
      s.distance = lemming.x + (lemming.endX - lemming.x) * s.swing.progress - PLAYER_X;
      s.y = FLOOR - 92 - arc;
    }
    s.vy = 0;
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
    if (r.resident && r.x - worldX < 700) r.waterAge = (r.waterAge ?? 0) + dt;
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
    } else if (s.y > FLOOR + 55) hurt(s, river.resident === 'eel' && eelPhase(river) === 'shock' ? 'ZAP! Electric water!' : 'SPLASH! Stay above the water!', river.resident === 'eel' && eelPhase(river) === 'shock' ? 'zap' : 'bonk');
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
      } else if (s.y > ELEPHANT_TOP + 8) hurt(s, 'TRAMPLED! Double jump onto backs!', 'flatten');
    }
  }
  s.herds = s.herds.filter(h => h.x + 440 > s.distance - 80);
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  for (const r of s.rivers) {
    if (r.resident === 'piranha') for (let i = 0; i < 2; i++) {
      const fish = piranhaPosition(r, i);
      if (fish.jumping && Math.abs(fish.x - worldX) < 37 && fish.y + 17 >= s.y - height && fish.y - 17 <= s.y - 4) hurt(s, 'PIRANHA LEAP! Double jump!');
    }
    if (r.resident === 'eel' && eelPhase(r) === 'shock' && Math.abs(worldX - (r.x + r.width * 0.3)) < 70 && s.y > FLOOR - 28) hurt(s, 'ZAP! Jump above the electric water!', 'zap');
  }
  for (const o of s.orangutans) {
    const ahead = o.x - worldX;
    o.age += dt;
    if (o.state === 'dance' && o.age > 0.3 && ahead < 720 && ahead > 180 && o.throws < 3) { o.state = 'windup'; o.age = 0; }
    else if (o.state === 'windup' && o.age >= 0.55) {
      o.state = 'throw'; o.age = 0; o.throws++;
      const hand = orangutanHand(o), vx = -240 - s.level * 15;
      const flight = Math.max(0.25, (hand.x - worldX) / (travelSpeed(s) - vx));
      s.pineapples.push({ ...hand, vx, vy: (FLOOR - 68 - hand.y - 325 * flight ** 2) / flight, rotation: 0 });
    } else if (o.state === 'throw' && o.age >= 0.25) { o.state = 'recover'; o.age = 0; }
    else if (o.state === 'recover' && o.age >= 0.55) { o.state = 'dance'; o.age = 0; }
  }
  s.orangutans = s.orangutans.filter(o => o.x > s.distance - 140);
  s.pineapples = s.pineapples.filter(p => {
    p.x += p.vx * dt; p.vy += 650 * dt; p.y += p.vy * dt; p.rotation += dt * 7;
    const contact = Math.abs(p.x - worldX) < 34 && p.y + 19 >= s.y - height && p.y - 19 <= s.y - 4;
    if (contact || p.y > FLOOR - 15) {
      s.splats.push({ x: p.x, y: p.y, age: 0 });
      if (contact) hurt(s, 'PINEAPPLE BONK! Slide under the throw!');
      return false;
    }
    return p.x > s.distance - 120 && p.x < s.distance + 1200;
  });
  for (const hog of s.hogs) {
    const ahead = hog.x - worldX;
    if (!hog.active && hog.herdX - worldX < 780) { hog.active = true; }
    if (!hog.active) continue;
    hog.age += dt; hog.x -= 105 * dt;
    if (hog.jumper && hog.y >= FLOOR - 25) {
      hog.jumpIn -= dt;
      // Crouching tells the player a leap is coming; never start a surprise
      // leap at point-blank range.
      if (hog.jumpIn <= 0 && Math.abs(ahead) > 150) { hog.vy = -390; hog.jumpIn = 1.2 + Math.random() * 1.4; }
    }
    hog.vy += 1000 * dt; hog.y += hog.vy * dt;
    if (hog.y >= FLOOR - 25) { hog.y = FLOOR - 25; hog.vy = 0; }
    if (Math.abs(hog.x - worldX) < 48) {
      const top = hog.y - 23;
      if (s.vy > 0 && previousY <= top + 8 && s.y >= top) {
        s.y = top; s.vy = -480; s.jumps = 1; s.duck = false; s.slideLeft = 0; s.flipLeft = 0;
      } else if (hog.y + 23 >= s.y - height && top <= s.y - 4) hurt(s, 'WILD HOGS! Jump or bounce over!');
    }
  }
  s.hogs = s.hogs.filter(h => h.x > s.distance - 120);
  s.lemmings = s.lemmings.filter(l => !l.used && l.endX > s.distance - 120);
  for (const bat of s.bats) {
    bat.age += dt;
    if (bat.state === 'flying') {
      bat.y = 85 + Math.sin(bat.age * 5) * 10;
      if (bat.x - worldX < speed * 1.15) { bat.state = 'warning'; bat.age = 0; }
    } else if (bat.state === 'warning' && bat.age >= 0.3) { bat.state = 'diving'; bat.age = 0; }
    else if (bat.state === 'diving') {
      bat.x -= 160 * dt;
      bat.y = 90 + 164 * Math.sin(Math.min(1, bat.age / 1.1) * Math.PI);
      if (bat.age >= 1.1) { bat.state = 'leaving'; bat.age = 0; }
    } else if (bat.state === 'leaving') { bat.x -= 220 * dt; bat.y -= 110 * dt; }
    if (Math.abs(bat.x - worldX) < 39 && bat.y + 18 >= s.y - height && bat.y - 18 <= s.y - 4) hurt(s, 'DIVING BATS! Slide beneath the wave!');
  }
  s.bats = s.bats.filter(b => b.x > s.distance - 100 && b.y > -60);
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
      } else if (p.state === 'warning' && p.age > 0.45) {
        p.state = 'attack'; p.age = 0; p.facing = worldX < p.x ? -1 : 1;
      } else if (p.state === 'attack') {
        p.x += p.facing * (speed + 280) * dt;
        p.y = FLOOR - 27 - Math.sin(Math.min(1, p.age / 1.05) * Math.PI) * 125;
        if (p.age > 1.05) { p.state = 'recover'; p.age = 0; }
      }
    } else {
      if (p.state === 'waiting' && ahead < speed * 2.5) { p.state = 'warning'; p.age = 0; }
      else if (p.state === 'warning' && p.age >= 0.9) {
        // Read the player's approach, then commit to a visible, counterable tell.
        p.attackStyle = s.duck && s.y >= FLOOR - 1 ? 'rush' : s.jumps > 0 ? 'intercept' : 'leap';
        p.leapHeight = p.attackStyle === 'intercept' ? 145 + p.temperament * 20 : 95 + p.temperament * 30;
        p.state = 'crouch'; p.age = 0;
      }
      else if (p.state === 'crouch' && p.age >= 0.35 && ahead < speed * (0.75 + p.temperament * 0.4)) {
        p.attackSpeed = speed * (0.6 + p.temperament * 0.45) + dashBoost(s) * 0.7;
        p.state = 'attack'; p.age = 0;
      }
      if (p.state === 'attack') {
        p.x -= (p.attackSpeed || speed * (0.6 + p.temperament * 0.45)) * dt;
        p.y = p.attackStyle === 'rush' ? FLOOR - 27 : FLOOR - 42 - (p.leapHeight || 95 + p.temperament * 30) * Math.sin(Math.min(1, p.age / 0.95) * Math.PI);
        if (p.age >= 0.95) { p.state = 'recover'; p.age = 0; }
      }
    }
    const visible = p.kind !== 'tiger' || !['waiting', 'warning'].includes(p.state);
    const radiusX = p.kind === 'snake' ? 32 : 48;
    const radiusY = p.kind === 'snake' ? 25 : 28;
    if (visible && !p.hit && s.invincible <= 0 && Math.abs(p.x - worldX) < radiusX + 16 && p.y + radiusY >= s.y - height && p.y - radiusY <= s.y - 4) {
      p.hit = true;
      hurt(s, p.kind === 'snake' ? 'SNAKE STRIKE! Double jump!' : p.kind === 'panther' ? 'PANTHER CHARGE! Jump over it!' : p.attackStyle === 'rush' ? 'TIGER CHARGE! Jump over!' : 'TIGER POUNCE! Slide beneath!', p.kind === 'snake' ? 'bonk' : 'tussle');
      break;
    }
  }
  stepInsects(s, dt, speed + boost, previousY, (message, reaction) => hurt(s, message, reaction));
  s.predators = s.predators.filter(p => p.x > s.distance - 120);
  for (const item of s.items) {
    const collectible = ['banana', 'golden', 'cherry', 'heart', 'fruit', 'star', 'gem'].includes(item.kind);
    if (item.collected || Math.abs(item.x - worldX) > (item.kind === 'gem' ? 22 : collectible ? 30 : 33)) continue;
    const radius = item.kind === 'gem' ? 10 : collectible ? 14 : 20;
    if (item.y + radius < s.y - height || item.y - radius > s.y - 4) continue;
    if (collectible) {
      item.collected = true;
      const previous = s.bananas;
      if (item.kind === 'gem') {
        const gemLevel = item.level ?? s.level;
        if (!s.gemCollected[gemLevel]) {
          s.gemCollected[gemLevel] = true; s.gems++; s.bonusScore += 250;
          s.message = `${GEMS[gemLevel].name.toUpperCase()}! +250 POINTS`; s.messageTime = 2;
        }
      } else if (item.kind === 'heart') { s.lives++; s.message = 'SLOTH HEART! +1 LIFE'; s.messageTime = 1.5; }
      else if (item.kind === 'fruit') { s.bananas += 5; s.bonusScore += 25; s.message = 'FRUIT FEAST! +5 COINS'; s.messageTime = 1.5; }
      else if (item.kind === 'star') { s.invincible = Math.max(s.invincible, 12); s.message = 'RARE STAR! 12s INVINCIBLE'; s.messageTime = 2; }
      else if (item.kind === 'cherry') { s.cherries++; s.bonusScore += 50; s.message = 'SWEET! +50 POINTS'; s.messageTime = 1; }
      else { s.bananas += item.kind === 'golden' ? 10 : 1; if (item.kind === 'golden') { s.golden++; s.message = 'GOLDEN BANANA! +10 COINS'; s.messageTime = 1; } }
      if (Math.floor(s.bananas / 100) > Math.floor(previous / 100)) { s.lives++; s.message = '100 BANANAS! +1 LIFE'; s.messageTime = 2; }
    } else if (s.invincible <= 0) { item.collected = true; s.cracks.push({ x: item.x, y: item.y, age: 0 }); hurt(s, 'CRACK!'); break; }
  }
  s.items = s.items.filter(i => i.x > s.distance - 60 && !i.collected);
  s.rivers = s.rivers.filter(r => r.x + r.width > s.distance - 60);
}
