import { createInsect, INSECT_KINDS, stepInsects, type Insect, type InsectKind, type AntRock, type HitReaction } from './jungle-insects';
import { addDinoSection, stepDinoLand, type Dino, type DinoProjectile, type Eruption, type TarPit } from './jungle-dinoland';
import { addSavannaSection, isSavannaPit, savannaVinePosition, stepSavanna, type SavannaAnimal, type SavannaPit, type SavannaVine } from './jungle-savanna';
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
  { name: 'DinoLand', sky: '#dc7b58', mist: '#f9ce7c', speed: 565 },
  { name: 'Savanna Stampede', sky: '#ef9d55', mist: '#ffe4a0', speed: 625 },
] as const;
export const LEVEL_SECONDS = 60;
export const SLIDE_SECONDS = 1.5;
export const STRONG_DIVE_SECONDS = 0.42;
export const COUNTER_ATTACK_SECONDS = 0.20;
export const KI_MAX = 100;
export const FLIP_SECONDS = 0.5;
export const GEM_Y = FLOOR - 235;
export const COFFEE_SPECIALS = ['espresso', 'cafe-con-leche', 'iced-coffee', 'macchiato'] as const;
export type CoffeeSpecial = typeof COFFEE_SPECIALS[number];
export type RunnerItem = { x: number; y: number; kind: 'banana' | 'golden' | 'cherry' | 'heart' | 'fruit' | 'star' | 'gem' | 'drop' | 'low' | 'high' | 'canopy' | 'rolling' | 'bouncing' | 'barrel' | 'boulder' | 'cave-spike' | 'spike-pit' | 'bear' | 'arrow' | 'dart'; coffee?: CoffeeSpecial; collected?: boolean; level?: number; vy?: number; vx?: number; previousX?: number; reflected?: boolean; bossAmmo?: boolean; rotation?: number; scale?: number; fallDelay?: number };
export const GEMS = [
  { name: 'Emerald', color: '#4cf7ae' }, { name: 'Sapphire', color: '#6fbaff' },
  { name: 'Ruby', color: '#ff6e97' }, { name: 'Amber', color: '#ffcb56' },
  { name: 'Moonstone', color: '#d2b7ff' }, { name: 'Peridot', color: '#c4ff57' },
  { name: 'Sunstone', color: '#ff9d52' },
  { name: 'Citrine', color: '#ffe064' },
] as const;
export function hasAllGems(s: Pick<Runner, 'gemCollected'>) { return s.gemCollected.every(Boolean); }
export type Hog = { herdX: number; x: number; y: number; vy: number; age: number; jumper: boolean; jumpIn: number; active: boolean; knocked?: boolean };
export function createHogs(x: number, speed: number, random = Math.random): Hog[] {
  const gap = (speed + 105) * 0.46;
  return Array.from({ length: 6 }, (_, i) => ({ herdX: x, x: x + i * gap + (i >= 4 ? gap * 0.2 : 0), y: FLOOR - 25, vy: 0, age: 0, jumper: i >= 4, jumpIn: 0.5 + random() * 1.2, active: false }));
}
export type Bat = { x: number; y: number; age: number; state: 'flying' | 'warning' | 'diving' | 'leaving' };
export function createBats(x: number): Bat[] {
  return Array.from({ length: 4 }, (_, i) => ({ x: x + i * 100, y: 80 + i % 2 * 16, age: 0, state: 'flying' }));
}
export type Herd = { x: number; age: number; charging: boolean; warned: boolean; knocked?: boolean[] };
export type Spider = { x: number; phase: number; giant?: boolean; knocked?: boolean };
export const ELEPHANT_TOP = FLOOR - 112;
export function spiderPosition(spider: Spider, elapsed: number) {
  const angle = Math.sin(elapsed * 2.5 + spider.phase) * 0.52;
  return { x: spider.x + Math.sin(angle) * 222, y: 25 + Math.cos(angle) * 222 };
}
export type Bird = { x: number; y: number; gift: 'drop' | 'cherry' | 'heart' | 'fruit' | 'star'; dropped: boolean; releaseLeft?: number };
export type Sloth = { x: number; y: number; homeY: number; targetY: number; age: number; state: 'waiting' | 'lowering' | 'climbing'; reward: 'heart' | 'fruit' | 'star'; dropped: boolean };
export type Lemming = { x: number; y: number; endX: number; age: number; used: boolean };
export type River = { resident?: 'piranha' | 'eel'; waterAge?: number; x: number; width: number; vine?: boolean; used?: boolean; bounced?: boolean; bounceLeft?: number; snapLeft?: number[]; snapped?: boolean[]; piranhasKnocked?: boolean[]; eelStun?: number; eelScored?: boolean };
export type Orangutan = { x: number; age: number; state: 'dance' | 'windup' | 'throw' | 'recover'; throws: number; hits: number; hitPoints: number; hitCooldown: number; hitReact: number; enraged: boolean; knocked?: boolean; stunned?: number; throwDirection?: -1 | 1 };
export type Pineapple = { x: number; y: number; vx: number; vy: number; rotation: number; bounceAmmo?: boolean; reflected?: boolean; previousX?: number };
// Forest archers stay in the encounter until the monkey lands a short combo.
// Their pause between arrows gives a clear opening to close the distance.
export type JungleGuardian = { x: number; age: number; attacks: number; state: 'run-in' | 'aim' | 'retreat'; hits: number; hitPoints: number; hitCooldown: number };
export function createJungleGuardian(x: number): JungleGuardian { return { x, age: 0, attacks: 0, state: 'run-in', hits: 0, hitPoints: 3, hitCooldown: 0 }; }
export function createOrangutan(x: number): Orangutan { return { x, age: 0, state: 'dance', throws: 0, hits: 0, hitPoints: 3, hitCooldown: 0, hitReact: 0, enraged: false }; }
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
export type Predator = { kind: 'snake' | 'tiger' | 'panther'; x: number; y: number; state: 'waiting' | 'warning' | 'crouch' | 'attack' | 'recover'; age: number; hit: boolean; knocked?: boolean; temperament: number; homeX: number; facing: number; attackStyle: 'leap' | 'rush' | 'intercept'; attackSpeed: number; leapHeight: number; hits: number; hitPoints: number; hitCooldown: number };
// Later jungle zones ask for a quick combo during one dive, rather than a
// surprise damage spike. The pips are rendered directly above each foe.
export function createPredator(kind: Predator['kind'], x: number, temperament = Math.random(), level = 0): Predator {
  const levelHits = Math.min(3, 1 + Math.floor(level / 2));
  // Big cats are duel foes: a forward dash can stagger them, but never end
  // the encounter in one pass. Tigers take the longest to bring down.
  const hitPoints = kind === 'tiger' ? Math.max(3, levelHits) : kind === 'panther' ? Math.max(2, levelHits) : levelHits;
  return { kind, x, y: FLOOR - 22, state: 'waiting', age: 0, hit: false, temperament, homeX: x, facing: -1, attackStyle: 'leap', attackSpeed: 0, leapHeight: 0, hits: 0, hitPoints, hitCooldown: 0 };
}
export type Runner = ReturnType<typeof createRunner>;

function shuffle<T>(values: readonly T[]): T[] {
  const deck = [...values];
  for (let i = deck.length - 1; i > 0; i--) {
    const pick = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[pick]] = [deck[pick], deck[i]];
  }
  return deck;
}

function nextEncounter(s: Runner, choices: readonly number[]) {
  if (s.encounterDeck.length === 0) s.encounterDeck = shuffle(choices);
  return s.encounterDeck.pop()!;
}

function nextInsectEncounter(s: Runner): InsectKind {
  if (s.insectDeck.length === 0) s.insectDeck = shuffle(INSECT_KINDS);
  return s.insectDeck.pop()!;
}
export function levelSeconds(s: Pick<Runner, 'difficulty'>) { return RUNNER_DIFFICULTIES[s.difficulty].seconds; }
export function runnerSpeed(s: Runner) {
  const base = (LEVELS[s.level].speed + (s.elapsed % levelSeconds(s)) * 0.3) * RUNNER_DIFFICULTIES[s.difficulty].speed;
  return base * (s.espressoBoost > 0 ? 1.35 : 1);
}
export function forwardPace(s: Runner) { return runnerSpeed(s) * (s.hesitating ? 0.28 : 1); }
export function dashBoost(s: Runner) {
  if (s.forwardDashLeft > 0) return 260;
  if (!s.duck || s.stun > 0) return 0;
  // The opening of every dive carries momentum even in the air. After that,
  // only a grounded slide keeps its fading dash speed.
  if (s.strongDiveLeft > 0) return 180;
  return s.y >= FLOOR - 1 ? 180 * (s.slideLeft / SLIDE_SECONDS) ** 2 : 0;
}
export function airBoost(s: Runner) { return 180 * (s.flipLeft / FLIP_SECONDS) ** 2; }
export function travelSpeed(s: Runner) { return forwardPace(s) + dashBoost(s) + airBoost(s); }
// Pressing dive while airborne turns its initial 0.42-second burst into the
// monkey's attack. It intentionally shares the existing control on touch and
// keyboard so the move is equally available on every device.
export function isAirAttack(s: Runner) { return s.attackLeft > 0 && s.stun <= 0; }
export function isHeroAttack(s: Runner) { return isAirAttack(s) || s.strongDiveLeft > 0 || s.combatLeft > 0 || s.forwardDashLeft > 0 || s.specialLeft > 0; }
export function heroAttackReach(s: Runner) {
  // The fight sprites extend only about 55–76 pixels ahead of the monkey.
  // A small contact allowance keeps collisions aligned with the artwork.
  if (s.specialLeft > 0) return 100;
  if (s.forwardDashLeft > 0) return 90;
  if (s.attackLeft > 0 || s.strongDiveLeft > 0) return 94;
  return s.combatMove === 'kick' ? 78 : s.combatMove === 'punch' ? 68 : 0;
}
export function heroStrikeConnects(s: Runner, targetX: number, halfWidth: number, top: number, bottom: number) {
  if (!isHeroAttack(s)) return false;
  const right = heroAttackReach(s);
  if (right <= 0) return false;
  const worldX = s.distance + PLAYER_X;
  const left = worldX + (s.specialLeft > 0 ? 5 : 14);
  const strikeTop = s.y - (s.specialLeft > 0 ? 125 : s.combatMove === 'kick' ? 75 : 92);
  const strikeBottom = s.y - (s.combatMove === 'punch' && s.specialLeft <= 0 ? 20 : 5);
  return left <= targetX + halfWidth && worldX + right >= targetX - halfWidth && strikeTop <= bottom && strikeBottom >= top;
}
export type ImpactMass = 'light' | 'medium' | 'heavy';
export function heroDamage(s: Runner) { return s.specialLeft > 0 ? 2 : 1; }
export function recordHeroHit(s: Runner, x: number, y: number, mass: ImpactMass = 'medium') {
  s.attackLanded = true;
  s.hitCombo = s.hitComboWindow > 0 ? s.hitCombo + 1 : 1;
  s.hitComboWindow = 1.15;
  s.hitStreak++;
  s.hitStreakWindow = 4;
  s.bestHitStreak = Math.max(s.bestHitStreak, s.hitStreak);
  const power = s.specialLeft > 0;
  s.hitEffects.push({ x, y, age: 0, combo: s.hitCombo, mass, power });
  s.impactShake = Math.max(s.impactShake, ({ light: 0.08, medium: 0.14, heavy: 0.24 }[mass]) * (power ? 1.5 : 1));
}
export function heroMove(s: Runner) {
  if (s.specialLeft > 0) return 'kick' as const;
  if (s.attackLeft > 0) return 'dive' as const;
  return s.combatLeft > 0 ? s.combatMove === 'dash' ? 'dive' : s.combatMove : 'run' as const;
}
export function vinePosition(r: River, elapsed: number, progress?: number) {
  const t = progress ?? (0.5 + Math.sin(elapsed * 2.2 + r.x * 0.001) * 0.5);
  return { x: r.x - 45 + (r.width + 90) * t, y: 160 + Math.sin(t * Math.PI) * 45 };
}

// An Adventure run spans every level. A selected-stage run starts and ends on
// the requested level, while still using the exact same obstacles and finale.
export function createRunner(difficulty: RunnerDifficulty = 'medium', startLevel = 0, endLevel = LEVELS.length - 1) {
  const initialLevel = Math.max(0, Math.min(LEVELS.length - 1, startLevel));
  const finalLevel = Math.max(initialLevel, Math.min(LEVELS.length - 1, endLevel));
  return {
    difficulty,
    insects: [] as Insect[], antRocks: [] as AntRock[], caterpillarBounces: 0,
    dinos: [] as Dino[], tarPits: [] as TarPit[], eruptions: [] as Eruption[], dinoProjectiles: [] as DinoProjectile[],
    dinoEncounterIndex: 0, dinoBossStarted: false, dinoBossDefeated: false, groundShake: 0, tarTime: 0,
    savannaAnimals: [] as SavannaAnimal[], savannaPits: [] as SavannaPit[], savannaVines: [] as SavannaVine[], savannaEncounterIndex: 0, savannaBounces: 0,
    savannaBossStarted: false, savannaLionDefeated: false, savannaOasisOpen: false,
    savannaOasisReached: false, savannaFinishX: null as number | null,
    reaction: 'bonk' as HitReaction, reactionLeft: 0,
    phase: 'ready' as 'ready' | 'playing' | 'over' | 'victory',
    distance: 0, elapsed: initialLevel * RUNNER_DIFFICULTIES[difficulty].seconds, level: initialLevel, endLevel: finalLevel, y: FLOOR, vy: 0, jumps: 0, duck: false, duckHeld: false, hesitating: false, slideLeft: 0, slideCooldown: 0, strongDiveLeft: 0, attackLeft: 0, forwardDashLeft: 0, forwardDashCooldown: 0, combatMove: 'run' as 'run' | 'punch' | 'kick' | 'dash', combatLeft: 0, comboStep: 0, comboWindow: 0, hitCombo: 0, hitComboWindow: 0, hitStreak: 0, hitStreakWindow: 0, bestHitStreak: 0, attackLanded: false, counterLeft: 0, ki: 0, specialLeft: 0, cameraLead: 0, impactShake: 0,
    flipLeft: 0, swing: null as ({ river: River; progress: number } | { lemming: Lemming; progress: number } | { savannaVine: SavannaVine; progress: number } | { giraffe: SavannaAnimal; progress: number }) | null,
    cracks: [] as { x: number; y: number; age: number; kind?: 'coconut' | 'barrel' }[],
    golden: 0, cherries: 0, fruitPickups: 0, supplyPickups: 0, bonusScore: 0, gems: 0,
    gemSpawned: LEVELS.map(() => false), gemCollected: LEVELS.map(() => false), celebrationTime: 0,
    gemBursts: [] as { x: number; y: number; age: number; color: string }[],
    lives: Number(RUNNER_DIFFICULTIES[difficulty].lives), bananas: 0, hits: 0, bounces: 0, stun: 0, invincible: 0, starPower: 0, espressoBoost: 0, coffeeServed: 0,
    knockouts: [] as { x: number; y: number; age: number; label: string }[],
    hitEffects: [] as { x: number; y: number; age: number; combo: number; mass: ImpactMass; power: boolean }[],
    message: '', messageTime: 0, nextSection: 950, section: 0, encounterDeck: [] as number[], insectDeck: [] as InsectKind[],
    items: Array.from({ length: 12 }, (_, i): RunnerItem => ({ x: 380 + i * 42, y: FLOOR - 30, kind: 'banana' })),
    orangutans: [] as Orangutan[], pineapples: [] as Pineapple[], splats: [] as { x: number; y: number; age: number }[], guardians: [] as JungleGuardian[],
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
  s.strongDiveLeft = 0;
  s.vy = -540;
  s.jumps++;
  if (s.jumps === 2) s.flipLeft = FLIP_SECONDS;
}

export function duckRunner(s: Runner, held: boolean) {
  if (!held) {
    const wasSliding = s.duck || s.slideLeft > 0;
    s.duckHeld = false; s.duck = false; s.slideLeft = 0; s.strongDiveLeft = 0;
    if (wasSliding) s.slideCooldown = Math.max(s.slideCooldown, 0.3);
    return;
  }
  if (s.duckHeld || (s.slideCooldown > 0 && s.y >= FLOOR - 1) || s.phase !== 'playing' || s.stun > 0) return;
  if (s.swing) return;
  s.flipLeft = 0;
  s.duckHeld = true;
  s.duck = true;
  s.slideLeft = SLIDE_SECONDS;
  s.strongDiveLeft = STRONG_DIVE_SECONDS;
  s.slideCooldown = 0.7;
  if (s.y < FLOOR) {
    // An air-started attack completes its full 0.42-second animation even if
    // the monkey lands or the player releases the control early.
    s.attackLeft = STRONG_DIVE_SECONDS;
    s.vy = Math.max(650, s.vy);
  }
}

export function hesitateRunner(s: Runner, held: boolean) {
  s.hesitating = held && s.phase === 'playing' && s.stun <= 0;
  if (s.hesitating) {
    s.message = 'HESITATION FAKE!';
    s.messageTime = Math.max(s.messageTime, 0.25);
  }
}

function startCombatMove(s: Runner, move: 'punch' | 'kick') {
  if (s.phase !== 'playing' || s.swing || (s.stun > 0 && s.counterLeft <= 0)) return;
  if (s.combatLeft > 0 && !s.attackLanded) { s.hitStreak = 0; s.hitStreakWindow = 0; s.hitCombo = 0; s.hitComboWindow = 0; }
  s.attackLanded = false;
  s.duck = false;
  s.slideLeft = 0;
  s.strongDiveLeft = 0;
  const chain = s.combatLeft > 0 && s.comboWindow > 0;
  s.comboStep = chain ? Math.min(3, s.comboStep + 1) : 1;
  s.comboWindow = 0.42;
  s.combatMove = move;
  s.combatLeft = (move === 'punch' ? 0.28 : 0.36) + (s.comboStep === 3 ? 0.1 : 0);
}
export function punchRunner(s: Runner) { startCombatMove(s, 'punch'); }
export function kickRunner(s: Runner) { startCombatMove(s, 'kick'); }
export function forwardDashRunner(s: Runner) {
  // Match slide's re-entry limit so holding or rapidly tapping Forward cannot
  // turn the runner into a permanent dash.
  if (s.phase !== 'playing' || s.swing || s.forwardDashLeft > 0 || s.forwardDashCooldown > 0 || (s.stun > 0 && s.counterLeft <= 0)) return;
  if (s.combatLeft > 0 && !s.attackLanded) { s.hitStreak = 0; s.hitStreakWindow = 0; s.hitCombo = 0; s.hitComboWindow = 0; }
  s.attackLanded = false;
  s.duck = false; s.slideLeft = 0; s.strongDiveLeft = 0;
  s.combatMove = 'dash'; s.combatLeft = 0.34; s.forwardDashLeft = 0.34; s.forwardDashCooldown = 0.7;
}
export function gainKi(s: Runner, amount: number) {
  const before = s.ki;
  s.ki = Math.min(KI_MAX, s.ki + amount);
  if (before < KI_MAX && s.ki === KI_MAX) { s.message = 'KI FULL! UNLEASH SPECIAL!'; s.messageTime = 1.5; }
}
export function specialRunner(s: Runner) {
  if (s.phase !== 'playing' || s.ki < KI_MAX || s.stun > 0) return;
  s.attackLanded = false;
  s.ki = 0; s.specialLeft = 0.65; s.combatMove = 'kick'; s.combatLeft = 0.65;
  s.message = 'KI BURST!'; s.messageTime = 0.8;
}

export function runnerScore(s: Runner) { return s.bananas * 10 + s.bonusScore; }

export function starKnockout(s: Runner, x: number, y: number, label: string) {
  s.knockouts.push({ x, y, age: 0, label });
  s.bonusScore += 25;
  gainKi(s, 18);
  s.message = `${label} KNOCKOUT! +25`; s.messageTime = 1;
}

function hurt(s: Runner, message: string, reaction: HitReaction = 'bonk') {
  if (s.invincible > 0) return;
  s.swing = null;
  s.flipLeft = 0;
  s.lives--;
  s.hits++;
  s.hitCombo = 0; s.hitComboWindow = 0; s.hitStreak = 0; s.hitStreakWindow = 0;
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
  s.strongDiveLeft = 0;
  s.attackLeft = 0;
  // Getting tagged does not erase the player's next action: they have a tiny,
  // intentional counter window to punch or kick their way back into the fight.
  s.counterLeft = COUNTER_ATTACK_SECONDS;
  if (s.lives <= 0) s.phase = 'over';
}

// Fixed world coordinates and authored sections keep reaction times independent
// of screen size. Every challenge is followed by a long, safe coin trail.
function addSection(s: Runner) {
  const x = s.nextSection;
  if (s.level === 7) { addSavannaSection(s); return; }
  if (s.level === 6) { addDinoSection(s); return; }
  if (s.level === 5) {
    const finale = s.elapsed % levelSeconds(s) >= levelSeconds(s) - 20;
    const kind = finale && !s.gemSpawned[5] ? 'caterpillar' : nextInsectEncounter(s);
    s.section++;
    s.insects.push(createInsect(kind, x, kind === 'scorpion' ? Math.floor(Math.random() * 2) : undefined));
    if (kind === 'scorpion') {
      // Both targets arrive before the boss, giving the player a chance to
      // bounce them forward instead of receiving a free automatic knockout.
      s.pineapples.push({ x: x - 550, y: FLOOR - 90, vx: 0, vy: 0, rotation: 0, bounceAmmo: true });
      s.items.push({ x: x - 360, y: FLOOR - 20, kind: 'rolling', rotation: 0, bossAmmo: true });
    }
    if (kind === 'fire-ant') {
      const count = { easy: 3, medium: 4, hard: 5 }[s.difficulty];
      // One compact column reads as a climbing ant tower, with every ant
      // snapping forward as the monkey approaches.
      for (let i = 1; i < count; i++) s.insects.push(createInsect(kind, x, i));
    }
    if (kind === 'stinger') {
      const count = { easy: 2, medium: 3, hard: 4 }[s.difficulty];
      for (let i = 1; i < count; i++) s.insects.push(createInsect(kind, x + i * 115));
    }
    if (kind === 'centipede') s.insects.push(createInsect('mud-pit', x + 420), createInsect('caterpillar', x + 420));
    if (kind === 'mud-pit') s.insects.push(createInsect('caterpillar', x));
    if (kind === 'caterpillar') s.insects.unshift(createInsect('mud-pit', x));
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
  const patterns = [[8, 16, 10, 14, 3, 11, 12, 4, 7, 6, 17, 18], [16, 3, 12, 14, 5, 9, 10, 11, 4, 7, 6, 8, 17, 19, 22], [7, 16, 14, 12, 11, 5, 10, 9, 4, 1, 3, 8, 6, 17, 20, 23], [16, 7, 11, 14, 12, 10, 9, 5, 8, 7, 3, 6, 5, 4, 1, 17, 21, 22, 23], [13, 15, 16, 14, 11, 13, 12, 15, 10, 7, 3, 13, 4, 8, 17, 18, 19, 20, 21, 22, 23]][s.level];
  const easyPatterns = [[0, 1, 3, 4, 6, 14, 1, 12, 4, 3, 17], [1, 3, 4, 6, 14, 0, 12, 1, 4, 3, 17], [4, 0, 3, 14, 6, 1, 12, 4, 3, 0, 17], [1, 4, 12, 3, 14, 6, 0, 4, 1, 3, 17], [0, 1, 3, 4, 6, 14, 12, 1, 4, 3, 17]][s.level];
  const source = s.difficulty === 'easy' ? easyPatterns : patterns;
  const type = nextEncounter(s, source);
  s.section++;
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
  } else if (type === 13) {
    s.spiders.push({ x, phase: s.section * 1.7, giant: s.level >= 4 && s.section % 2 === 0 });
  } else if (type === 10) {
    s.rivers.push({ x, width: 680, vine: true, resident: (s.level + s.section) % 2 ? 'piranha' : 'eel', waterAge: 0 });
  } else if (type === 11) {
    s.predators.push(createPredator('panther', x, Math.random(), s.level));
  } else if (type === 3) {
    // Wider rivers at higher speeds preserve the hippo landing window.
    s.rivers.push({ x, width: Math.max(250, runnerSpeed(s) * 1.05), resident: s.difficulty === 'easy' ? undefined : (s.level + s.section) % 2 ? 'eel' : 'piranha', waterAge: 0 });
    for (let i = 0; i < 7; i++) s.items.push({ x: x + i * 40, y: FLOOR - 110, kind: 'banana' });
  } else if (type === 4) {
    // A single jump reaches ~97px; these prizes require the second air jump.
    for (let i = 0; i < 3; i++) s.items.push({ x: x + i * 36, y: FLOOR - 215, kind: 'golden' });
    s.items.push({ x: x - 90, y: FLOOR - 105, kind: 'banana' });
  } else if (type === 5) {
    s.predators.push(createPredator('snake', x, Math.random(), s.level));
  } else if (type === 6) {
    const gifts: Bird['gift'][] = ['cherry', 'fruit', 'heart', 'star', 'drop'];
    s.birds.push({ x, y: 70, gift: gifts[s.birdsSpawned++ % gifts.length], dropped: false });
  } else if (type === 7) {
    s.predators.push(createPredator('tiger', x, Math.random(), s.level));
  } else if (type === 8 || type === 9) {
    s.items.push({ x, y: FLOOR - 20, kind: type === 8 ? 'rolling' : 'bouncing', vy: type === 9 ? -360 : undefined, rotation: 0 });
  } else if (type === 17) {
    s.items.push({ x, y: FLOOR - 28, kind: 'barrel' });
  } else if (type === 18) {
    // Little Boulder, Big Brother, and Dad Boulder thunder down together.
    for (const [offset, scale] of [[0, 0.75], [140, 1.15], [310, 1.65]] as const) s.items.push({ x: x + offset, y: FLOOR - 32 * scale, kind: 'boulder', rotation: 0, scale });
    recovery = 900;
  } else if (type === 19) {
    for (let i = 0; i < 4; i++) s.items.push({ x: x + i * 84, y: 12, kind: 'cave-spike', vy: 40, scale: 1.15 + i * 0.2, fallDelay: i * 0.32 });
    recovery = 680;
  } else if (type === 20) {
    s.items.push({ x, y: FLOOR - 8, kind: 'spike-pit' }); recovery = 730;
  } else if (type === 21) {
    s.items.push({ x, y: FLOOR - 26, kind: 'bear', coffee: COFFEE_SPECIALS[s.coffeeServed++ % COFFEE_SPECIALS.length] }); recovery = 760;
  } else if (type === 22) {
    s.guardians.push(createJungleGuardian(x)); recovery = 1050;
  } else if (type === 23) {
    s.items.push({ x, y: FLOOR - 72, kind: 'dart', vx: -430, rotation: 0 }); recovery = 650;
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
  if (s.phase !== 'playing') {
    if (s.phase === 'victory' && hasAllGems(s)) s.celebrationTime += dt;
    return;
  }
  for (const splat of s.splats) splat.age += dt;
  s.splats = s.splats.filter(p => p.age < 0.65);
  for (const crack of s.cracks) crack.age += dt;
  s.cracks = s.cracks.filter(c => c.age < 0.75);
  for (const knockout of s.knockouts) knockout.age += dt;
  s.knockouts = s.knockouts.filter(k => k.age < 0.8);
  for (const effect of s.hitEffects) effect.age += dt;
  s.hitEffects = s.hitEffects.filter(effect => effect.age < 0.38);
  for (const burst of s.gemBursts) burst.age += dt;
  s.gemBursts = s.gemBursts.filter(burst => burst.age < 1.15);
  s.flipLeft = Math.max(0, s.flipLeft - dt);
  s.attackLeft = Math.max(0, s.attackLeft - dt);
  s.slideCooldown = Math.max(0, s.slideCooldown - dt);
  s.forwardDashLeft = Math.max(0, s.forwardDashLeft - dt);
  s.forwardDashCooldown = Math.max(0, s.forwardDashCooldown - dt);
  s.specialLeft = Math.max(0, s.specialLeft - dt);
  s.impactShake = Math.max(0, s.impactShake - dt);
  const combatExpired = s.combatLeft > 0 && s.combatLeft <= dt;
  s.combatLeft = Math.max(0, s.combatLeft - dt);
  if (combatExpired && !s.attackLanded) { s.hitStreak = 0; s.hitStreakWindow = 0; s.hitCombo = 0; s.hitComboWindow = 0; }
  s.hitComboWindow = Math.max(0, s.hitComboWindow - dt);
  if (s.hitComboWindow === 0) s.hitCombo = 0;
  s.hitStreakWindow = Math.max(0, s.hitStreakWindow - dt);
  if (s.hitStreakWindow === 0) s.hitStreak = 0;
  s.comboWindow = Math.max(0, s.comboWindow - dt);
  s.counterLeft = Math.max(0, s.counterLeft - dt);
  if (s.combatLeft === 0) s.combatMove = 'run';
  if (s.comboWindow === 0 && s.combatLeft === 0) s.comboStep = 0;
  s.messageTime = Math.max(0, s.messageTime - dt);
  s.invincible = Math.max(0, s.invincible - dt);
  s.starPower = Math.max(0, s.starPower - dt);
  s.espressoBoost = Math.max(0, s.espressoBoost - dt);
  if (s.stun > 0) {
    s.stun = Math.max(0, s.stun - dt);
    // Keep only combat resolution alive during hit stun. That enables the
    // short counter window without advancing hazards or the world beneath a
    // knocked-back hero.
    stepInsects(s, 0, runnerSpeed(s), s.y, () => {});
    return;
  }
  if (s.duck) {
    s.slideLeft = Math.max(0, s.slideLeft - dt);
    s.strongDiveLeft = Math.max(0, s.strongDiveLeft - dt);
    if (s.slideLeft === 0) { s.duck = false; s.slideCooldown = Math.max(s.slideCooldown, 0.45); }
  }
  s.elapsed += dt;
  if (s.elapsed >= levelSeconds(s) * (s.endLevel + 1)) {
    const selectedDino = s.endLevel === 6;
    const selectedSavanna = s.endLevel === 7;
    if (selectedDino && s.dinoBossDefeated) { s.phase = 'victory'; return; }
    if (selectedSavanna) s.elapsed = levelSeconds(s) * 8 - 0.001;
    else if (!selectedDino) { s.phase = 'victory'; return; }
    else s.elapsed = levelSeconds(s) * 7 - 0.001;
  }
  const level = Math.floor(s.elapsed / levelSeconds(s));
  if (level !== s.level) {
    // Adventure Mode cannot leave DinoLand until the T. rex is defeated.
    if (s.level === 6 && level === 7 && !s.dinoBossDefeated) {
      s.elapsed = levelSeconds(s) * 7 - 0.001;
    } else {
    if (level === 5) {
      s.items = []; s.rivers = []; s.predators = []; s.hogs = []; s.bats = []; s.herds = []; s.spiders = []; s.orangutans = []; s.pineapples = []; s.guardians = []; s.birds = []; s.sloths = []; s.lemmings = [];
      s.swing = null; s.nextSection = s.distance + 1100;
    }
    if (level === 6) {
      s.items = []; s.insects = []; s.antRocks = []; s.pineapples = [];
      s.nextSection = s.distance + 950;
    }
    if (level === 7) {
      s.items = []; s.dinos = []; s.tarPits = []; s.eruptions = []; s.dinoProjectiles = [];
      s.savannaAnimals = []; s.savannaPits = []; s.savannaVines = []; s.swing = null;
      s.nextSection = s.distance + 950;
    }
    s.level = level; s.section = 0; s.encounterDeck = []; s.insectDeck = []; s.items = s.items.filter(i => i.kind !== 'gem'); s.message = `LEVEL ${level + 1}: ${LEVELS[level].name}`; s.messageTime = 3;
    }
  }
  const speed = forwardPace(s);
  const boost = dashBoost(s) + airBoost(s);
  const tarred = s.level === 6 && s.y >= FLOOR - 2 && s.tarPits.some(p => s.distance + PLAYER_X > p.x && s.distance + PLAYER_X < p.x + p.width);
  const fallingIntoSavannaPit = isSavannaPit(s, s.distance + PLAYER_X) && s.y >= FLOOR;
  if (!s.swing && !fallingIntoSavannaPit) s.distance += (speed * (tarred ? 0.62 : 1) + boost) * dt;
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
    // Descend sooner and faster at high speeds so the reward reaches the
    // path before the runner passes beneath it.
    const dropSpeed = Math.max(150, speed * 0.42);
    const descentSeconds = (sloth.targetY - sloth.homeY) / dropSpeed;
    const dropLead = Math.max(620, speed * (descentSeconds + 0.4));
    if (sloth.state === 'waiting' && ahead < dropLead && ahead > -70) sloth.state = 'lowering';
    if (sloth.state === 'lowering') sloth.y = Math.min(sloth.targetY, sloth.y + dropSpeed * dt);
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
    if (item.kind === 'cave-spike' && (item.fallDelay ?? 0) > 0) {
      item.fallDelay = Math.max(0, (item.fallDelay ?? 0) - dt);
      continue;
    }
    if (item.kind === 'arrow' || item.kind === 'dart') {
      if (item.x - s.distance < 850) { item.previousX = item.x; item.x += (item.vx ?? -360) * dt; }
      continue;
    }
    if (item.kind === 'rolling' || item.kind === 'bouncing' || item.kind === 'boulder') {
      item.previousX = item.x;
      if (item.reflected) {
        item.x += (item.vx ?? 1350) * dt;
        item.vy = (item.vy ?? -330) + 900 * dt;
        item.y += item.vy * dt;
        if (item.y >= FLOOR - 20) { item.y = FLOOR - 20; item.vy = -300; }
        item.rotation = (item.rotation ?? 0) + 12 * dt;
        continue;
      }
      // Activate on approach so moving hazards cannot drift into earlier sections.
      if (item.x - s.distance > 860) continue;
      const rollSpeed = item.kind === 'boulder' ? 175 + s.level * 16 : 75 + s.level * 12;
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
    item.vy += item.kind === 'cave-spike' ? 1250 * dt : 650 * dt;
    item.y = Math.min(FLOOR - (item.kind === 'cave-spike' ? 12 : 20), item.y + item.vy * dt);
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
    } else if ('savannaVine' in s.swing) {
      s.swing.progress = Math.min(1, s.swing.progress + dt * speed * 1.35 / (s.swing.savannaVine.width + 90));
      const tip = savannaVinePosition(s.swing.savannaVine, s.elapsed, s.swing.progress);
      s.distance = tip.x - PLAYER_X; s.y = tip.y + 55;
    } else if ('giraffe' in s.swing) {
      s.swing.progress = Math.min(1, s.swing.progress + dt * 1.65);
      const t = s.swing.progress;
      s.distance = s.swing.giraffe.x - 65 + t * 145 - PLAYER_X;
      s.y = FLOOR - 185 + t * 90 + Math.sin(t * Math.PI) * 12;
      s.swing.giraffe.state = 'attack';
      if (t >= 1) {
        const giraffe = s.swing.giraffe;
        s.swing = null; s.distance = giraffe.x + 150 - PLAYER_X; s.y = FLOOR - 125;
        s.vy = -720; s.jumps = 0; s.flipLeft = FLIP_SECONDS;
        s.message = 'TAIL LAUNCH! DOUBLE JUMP READY!'; s.messageTime = 1.2;
      }
    } else {
      s.swing.progress = Math.min(1, s.swing.progress + dt * 1.25);
      const { lemming } = s.swing;
      const arc = Math.sin(s.swing.progress * Math.PI) * 118;
      s.distance = lemming.x + (lemming.endX - lemming.x) * s.swing.progress - PLAYER_X;
      s.y = FLOOR - 92 - arc;
    }
    if (s.swing) {
      s.vy = 0;
      if (s.swing.progress >= 1) { s.swing = null; s.jumps = 0; jumpRunner(s); }
    }
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
    r.eelStun = Math.max(0, (r.eelStun ?? 0) - dt);
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
  if (river) {
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
    } else if (s.y > FLOOR + 55 && s.invincible <= 0) hurt(s, river.resident === 'eel' ? 'ZAP! Electric eel!' : 'SPLASH! Stay above the water!', river.resident === 'eel' ? 'zap' : 'bonk');
  } else if (s.y >= FLOOR && !isSavannaPit(s, worldX)) {
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
      if (herd.knocked?.[i]) continue;
      if (Math.abs(worldX - (herd.x + i * 175)) > 65) continue;
      // A head/back landing is always a springboard for the hero. It takes no
      // elephant health and cannot turn into a defeat, even during an attack.
      if (s.vy > 0 && previousY <= ELEPHANT_TOP && s.y >= ELEPHANT_TOP) {
        s.y = ELEPHANT_TOP; s.vy = -460; s.jumps = 1; s.duck = false; s.slideLeft = 0; s.flipLeft = 0;
        s.elephantBounces++; s.message = 'HERD HOP!'; s.messageTime = 0.7;
      } else if (s.y > ELEPHANT_TOP + 8) {
        if (s.starPower > 0) {
          herd.knocked ??= [false, false, false]; herd.knocked[i] = true;
          starKnockout(s, herd.x + i * 175, FLOOR - 75, 'ELEPHANT');
        } else hurt(s, 'TRAMPLED! Double jump onto backs!', 'flatten');
      }
    }
  }
  s.herds = s.herds.filter(h => h.x + 440 > s.distance - 80);
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  stepDinoLand(s, dt, previousY, (message, reaction) => hurt(s, message, reaction));
  stepSavanna(s, dt, previousY, (message, reaction) => hurt(s, message, reaction));
  for (const r of s.rivers) {
    if (r.resident === 'piranha') for (let i = 0; i < 2; i++) {
      if (r.piranhasKnocked?.[i]) continue;
      const fish = piranhaPosition(r, i);
      if (fish.jumping && Math.abs(fish.x - worldX) < 37 && fish.y + 17 >= s.y - height && fish.y - 17 <= s.y - 4) {
        if ((s.strongDiveLeft > 0 || isAirAttack(s)) && s.vy >= 0) {
          r.piranhasKnocked ??= [false, false]; r.piranhasKnocked[i] = true;
          s.y = fish.y - 18; s.vy = -620; s.jumps = 1; s.duck = false; s.duckHeld = false; s.slideLeft = 0; s.strongDiveLeft = 0; s.attackLeft = 0; s.flipLeft = FLIP_SECONDS;
          recordHeroHit(s, fish.x, fish.y, 'light'); gainKi(s, 15); starKnockout(s, fish.x, fish.y, 'PIRANHA FLIP');
          s.message = 'POWER SLIDE BOUNCE! FLIP RECOVERY!'; s.messageTime = 1.4;
        } else if (s.starPower > 0) { r.piranhasKnocked ??= [false, false]; r.piranhasKnocked[i] = true; starKnockout(s, fish.x, fish.y, 'PIRANHA'); }
        else hurt(s, 'PIRANHA LEAP! Double jump!');
      }
    }
    if (r.resident === 'eel' && !(r.eelStun && r.eelStun > 0) && Math.abs(worldX - (r.x + r.width * 0.3)) < 70 && s.y > FLOOR - 28) {
      if (s.starPower > 0 && !r.eelScored) { r.eelStun = 3; r.eelScored = true; starKnockout(s, r.x + r.width * 0.3, FLOOR + 5, 'EEL'); }
      else if (eelPhase(r) === 'shock') hurt(s, 'ZAP! Jump above the electric water!', 'zap');
    }
  }
  for (const o of s.orangutans) {
    const ahead = o.x - worldX;
    if (o.knocked) continue;
    o.hitCooldown = Math.max(0, o.hitCooldown - dt);
    o.hitReact = Math.max(0, o.hitReact - dt);
    if (o.hitCooldown === 0 && heroStrikeConnects(s, o.x, 62, FLOOR - 220, FLOOR)) {
      const kiFinish = s.specialLeft > 0;
      o.hits += heroDamage(s); o.hitCooldown = 0.3; o.hitReact = 0.45; o.enraged = true;
      recordHeroHit(s, o.x - 30, FLOOR - 105, 'heavy'); gainKi(s, 14);
      if (kiFinish || o.hits >= o.hitPoints) {
        o.knocked = true;
        for (const offset of [-34, 0, 34]) s.splats.push({ x: o.x + offset, y: FLOOR - 80 - Math.abs(offset), age: 0 });
        starKnockout(s, o.x, FLOOR - 110, kiFinish ? 'SUPER KI ORANGUTAN' : 'ORANGUTAN');
        s.message = kiFinish ? 'SUPER KI EXPLOSION! ORANGUTAN DOWN!' : 'ORANGUTAN KNOCKDOWN!'; s.messageTime = 1.6;
      } else {
        o.x += 48; o.state = 'recover'; o.age = 0;
        s.message = `ORANGUTAN ENRAGED! ${o.hits}/${o.hitPoints} — WATCH BEHIND!`; s.messageTime = 1.4;
      }
      continue;
    }
    if (s.starPower > 0 && Math.abs(ahead) < 68 && s.y > FLOOR - 170) {
      o.knocked = true; o.stunned = 0; starKnockout(s, o.x, FLOOR - 110, 'ORANGUTAN'); continue;
    }
    o.age += dt;
    const throwLimit = o.enraged ? 6 : 3;
    const canTarget = (ahead < 720 && ahead > 180) || (o.enraged && ahead <= 180 && ahead > -650);
    if (o.state === 'dance' && o.age > 0.3 && canTarget && o.throws < throwLimit) { o.state = 'windup'; o.age = 0; }
    else if (o.state === 'windup' && o.age >= 0.55) {
      o.state = 'throw'; o.age = 0; o.throws++;
      const direction = worldX >= o.x ? 1 : -1;
      const poseHand = orangutanHand(o);
      // Release from the leading hand on either side. A rightward throw used
      // to start behind the orangutan and was immediately culled once Johnny
      // had passed him.
      const hand = { x: o.x + direction * 55, y: poseHand.y };
      o.throwDirection = direction;
      const vx = direction > 0 ? 650 + s.level * 25 : -240 - s.level * 15;
      const flight = Math.max(0.25, Math.abs(hand.x - worldX) / (travelSpeed(s) + Math.abs(vx)));
      s.pineapples.push({ ...hand, vx, vy: (FLOOR - 68 - hand.y - 325 * flight ** 2) / flight, rotation: 0 });
    } else if (o.state === 'throw' && o.age >= 0.25) { o.state = 'recover'; o.age = 0; }
    else if (o.state === 'recover' && o.age >= 0.55) { o.state = 'dance'; o.age = 0; }
  }
  s.orangutans = s.orangutans.filter(o => !o.knocked && o.x > s.distance - (o.enraged ? 750 : 140));
  for (const guardian of s.guardians) {
    const ahead = guardian.x - worldX;
    guardian.hitCooldown = Math.max(0, guardian.hitCooldown - dt);
    if (guardian.state === 'run-in') {
      if (ahead > 850) continue;
      guardian.x -= 460 * dt;
      if (guardian.x - worldX <= 470) { guardian.state = 'aim'; guardian.age = 0; }
      continue;
    }
    guardian.age += dt;
    if (guardian.state === 'aim') {
      // The archer alternates a high and low arrow, then gets a recovery beat
      // before repeating the pattern instead of disappearing after two shots.
      if (guardian.age >= 0.28) {
        const y = guardian.attacks % 2 === 0 ? FLOOR - 112 : FLOOR - 82;
        s.items.push({ x: guardian.x - 38, y, kind: 'arrow', vx: -500, rotation: 0 });
        guardian.attacks++;
        guardian.state = 'retreat'; guardian.age = 0;
        s.message = guardian.attacks % 2 ? 'FOREST ARCHER! HIGH ARROW!' : 'FOREST ARCHER! LOW ARROW!'; s.messageTime = 0.75;
      }
    } else {
      // Back away between shots, then set up the next arrow every few seconds.
      guardian.x += 230 * dt;
      if (guardian.age >= 1.05) { guardian.state = 'aim'; guardian.age = 0; }
    }
    if (guardian.hitCooldown === 0 && heroStrikeConnects(s, guardian.x, 55, FLOOR - 150, FLOOR)) {
      guardian.hits += heroDamage(s);
      recordHeroHit(s, guardian.x - 25, FLOOR - 92, 'medium');
      guardian.hitCooldown = s.forwardDashLeft > 0 ? 0.5 : 0.12;
      gainKi(s, 12);
      if (guardian.hits >= guardian.hitPoints) {
        guardian.state = 'retreat'; guardian.age = 99;
        starKnockout(s, guardian.x, FLOOR - 92, 'FOREST ARCHER');
        s.message = `FOREST ARCHER STRIKE! ${guardian.hits}/${guardian.hitPoints} — KNOCKOUT!`;
      } else s.message = `FOREST ARCHER STRIKE! ${guardian.hits}/${guardian.hitPoints}`;
      s.messageTime = 0.8;
    }
  }
  s.guardians = s.guardians.filter(guardian => guardian.age < 90 && guardian.x > s.distance - 140 && guardian.x < s.distance + 1150);
  s.pineapples = s.pineapples.filter(p => {
    p.previousX = p.x;
    p.x += p.vx * dt; p.vy += 650 * dt; p.y += p.vy * dt; p.rotation += dt * (p.reflected ? 14 : 7);
    if (p.bounceAmmo && p.y >= FLOOR - 26) { p.y = FLOOR - 26; p.vy = -350; }
    const contact = Math.abs(p.x - worldX) < 34 && p.y + 19 >= s.y - height && p.y - 19 <= s.y - 4;
    if (contact && !p.reflected && isHeroAttack(s)) {
      p.reflected = true; p.vx = 1350; p.vy = -300;
      s.splats.push({ x: p.x, y: p.y, age: 0 });
      gainKi(s, 15);
      s.message = 'PINEAPPLE COUNTER! +KI'; s.messageTime = 1.1;
    } else if (contact && p.bounceAmmo && !p.reflected && s.vy > 0 && previousY <= p.y - 12 && s.y >= p.y - 12) {
      s.y = p.y - 12; s.vy = -470; s.jumps = 1;
      p.reflected = true; p.vx = 1350; p.vy = -300;
      s.message = 'PINEAPPLE RETURN! HIT THE SCORPION!'; s.messageTime = 1.2;
    } else if ((contact && !p.reflected) || (!p.bounceAmmo && p.y > FLOOR - 15)) {
      s.splats.push({ x: p.x, y: p.y, age: 0 });
      if (contact) {
        if (s.starPower > 0) starKnockout(s, p.x, p.y, 'PINEAPPLE');
        else hurt(s, 'PINEAPPLE BONK! Slide under the throw!');
      }
      return false;
    }
    // Enraged orangutans can retaliate from behind the camera. Keep their
    // rightward projectile alive long enough to enter the visible playfield.
    const rearAllowance = p.vx > 0 ? 700 : 120;
    return p.x > s.distance - rearAllowance && p.x < s.distance + 1500;
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
      } else if (hog.y + 23 >= s.y - height && top <= s.y - 4) {
        if (s.starPower > 0) { hog.knocked = true; starKnockout(s, hog.x, hog.y, 'HOG'); }
        else hurt(s, 'WILD HOGS! Jump or bounce over!');
      }
    }
  }
  s.hogs = s.hogs.filter(h => !h.knocked && h.x > s.distance - 120);
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
    if (Math.abs(bat.x - worldX) < 39 && bat.y + 18 >= s.y - height && bat.y - 18 <= s.y - 4) {
      if (s.starPower > 0 && bat.state !== 'leaving') { bat.state = 'leaving'; starKnockout(s, bat.x, bat.y, 'BAT'); }
      else if (bat.state !== 'leaving') hurt(s, 'DIVING BATS! Slide beneath the wave!');
    }
  }
  s.bats = s.bats.filter(b => b.x > s.distance - 100 && b.y > -60);
  for (const spider of s.spiders) {
    if (spider.knocked) continue;
    const pos = spiderPosition(spider, s.elapsed);
    const scale = spider.giant ? 1.65 : 1;
    if (Math.abs(pos.x - worldX) < 43 * scale && pos.y + 23 * scale >= s.y - height && pos.y - 23 * scale <= s.y - 4) {
      if (s.starPower > 0) { spider.knocked = true; starKnockout(s, pos.x, pos.y, 'SPIDER'); }
      else hurt(s, 'SPIDER SWING! Slide under!');
    }
  }
  s.spiders = s.spiders.filter(p => !p.knocked && p.x > s.distance - 200);
  for (const p of s.predators) {
    const ahead = p.x - worldX;
    p.age += dt;
    p.hitCooldown = Math.max(0, p.hitCooldown - dt);
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
    // A descending dive is an active strike, not merely a dodge. A short
    // per-foe cooldown lets the 0.42-second attack register a readable 2–3
    // hit combo on the tougher late-level predators.
    if (visible && p.hitCooldown === 0 && heroStrikeConnects(s, p.x, radiusX, p.y - radiusY - 16, p.y + radiusY + 16)) {
      // A forward dash gets exactly one stagger hit. Dive combos retain their
      // short rhythm, while an unfinished tiger stays able to maul the hero.
      p.hit = p.kind !== 'tiger' || p.hits + 1 >= p.hitPoints;
      p.hitCooldown = s.forwardDashLeft > 0 ? 0.5 : 0.12;
      p.hits += heroDamage(s);
      recordHeroHit(s, p.x - radiusX / 2, p.y, p.kind === 'snake' ? 'light' : p.kind === 'tiger' ? 'heavy' : 'medium');
      gainKi(s, 12);
      if (p.hits >= p.hitPoints) {
        p.knocked = true;
        starKnockout(s, p.x, p.y, p.kind.toUpperCase());
        s.message = `${p.kind.toUpperCase()} STRIKE! ${p.hits}/${p.hitPoints} — KNOCKOUT!`;
      } else {
        s.message = `${p.kind.toUpperCase()} STRIKE! ${p.hits}/${p.hitPoints}`;
      }
      s.messageTime = 0.8;
      continue;
    }
    if (visible && !p.hit && Math.abs(p.x - worldX) < radiusX + 16 && p.y + radiusY >= s.y - height && p.y - radiusY <= s.y - 4) {
      p.hit = true;
      if (s.starPower > 0) { p.knocked = true; starKnockout(s, p.x, p.y, p.kind.toUpperCase()); }
      else if (s.invincible <= 0) hurt(s, p.kind === 'snake' ? 'SNAKE STRIKE! Double jump!' : p.kind === 'panther' ? 'PANTHER CHARGE! Jump over it!' : p.attackStyle === 'rush' ? 'TIGER CHARGE! Jump over!' : 'TIGER POUNCE! Slide beneath!', p.kind === 'snake' ? 'bonk' : 'tussle');
      else p.hit = false;
      break;
    }
  }
  stepInsects(s, dt, speed + boost, previousY, (message, reaction) => hurt(s, message, reaction));
  for (const bug of s.insects) {
    if (bug.kind !== 'scorpion' || bug.used) continue;
    const struck = s.items.find(item => item.reflected && (item.kind === 'rolling' || item.kind === 'bouncing') &&
      Math.max(item.previousX ?? item.x, item.x) >= bug.x - 74 && Math.min(item.previousX ?? item.x, item.x) <= bug.x + 74 && item.y > FLOOR - 115);
    const fruit = s.pineapples.find(p => p.reflected && Math.max(p.previousX ?? p.x, p.x) >= bug.x - 74 &&
      Math.min(p.previousX ?? p.x, p.x) <= bug.x + 74 && p.y > FLOOR - 115);
    if (!struck && !fruit) continue;
    bug.used = true;
    if (struck) struck.collected = true;
    if (fruit) { s.splats.push({ x: fruit.x, y: fruit.y, age: 0 }); s.pineapples = s.pineapples.filter(p => p !== fruit); }
    starKnockout(s, bug.x, FLOOR - 100, 'SCORPION KING');
    s.message = `${struck ? 'COCONUT' : 'PINEAPPLE'} KNOCKOUT! +25`; s.messageTime = 2;
  }
  s.insects = s.insects.filter(bug => !bug.used || bug.kind === 'caterpillar');
  s.predators = s.predators.filter(p => !p.knocked && p.x > s.distance - 120);
  for (const item of s.items) {
    const collectible = ['banana', 'golden', 'cherry', 'heart', 'fruit', 'star', 'gem'].includes(item.kind);
    const scale = item.scale ?? 1;
    const hazardWidth = item.kind === 'spike-pit' ? 105 : item.kind === 'boulder' ? 48 * scale : item.kind === 'bear' ? 54 : item.kind === 'cave-spike' ? 24 * scale : item.kind === 'arrow' || item.kind === 'dart' ? 32 : 33;
    if (item.collected || Math.abs(item.x - worldX) > (item.kind === 'gem' ? 22 : collectible ? 30 : hazardWidth)) continue;
    const radius = item.kind === 'gem' ? 10 : collectible ? 14 : item.kind === 'boulder' ? 43 * scale : item.kind === 'bear' ? 42 : item.kind === 'cave-spike' ? 28 * scale : 20;
    if (item.y + radius < s.y - height || item.y - radius > s.y - 4) continue;
    if (collectible) {
      item.collected = true;
      const previous = s.bananas;
      if (item.kind === 'gem') {
        const gemLevel = item.level ?? s.level;
        if (!s.gemCollected[gemLevel]) {
          s.gemCollected[gemLevel] = true; s.gems++; s.bonusScore += 250;
          s.gemBursts.push({ x: item.x, y: item.y, age: 0, color: GEMS[gemLevel].color });
          s.message = `${GEMS[gemLevel].name.toUpperCase()}! +250 POINTS`; s.messageTime = 2;
        }
      } else if (item.kind === 'heart') { s.lives++; s.supplyPickups++; s.message = 'SLOTH HEART! +1 LIFE'; s.messageTime = 1.5; }
      else if (item.kind === 'fruit') { s.bananas += 5; s.fruitPickups++; s.supplyPickups++; s.bonusScore += 25; s.message = 'FRUIT FEAST! +5 COINS'; s.messageTime = 1.5; }
      else if (item.kind === 'star') { s.starPower = 10; s.supplyPickups++; s.invincible = Math.max(s.invincible, 10); s.message = 'RARE STAR! 10s KNOCKOUT POWER'; s.messageTime = 2; }
      else if (item.kind === 'cherry') { s.cherries++; s.bonusScore += 50; s.message = 'SWEET! +50 POINTS'; s.messageTime = 1; }
      else { s.bananas += item.kind === 'golden' ? 10 : 1; gainKi(s, item.kind === 'golden' ? 8 : 2); if (item.kind === 'golden') { s.golden++; s.message = 'GOLDEN BANANA! +10 COINS'; s.messageTime = 1; } }
      if (Math.floor(s.bananas / 100) > Math.floor(previous / 100)) { s.lives++; s.message = '100 BANANAS! +1 LIFE'; s.messageTime = 2; }
    } else if (item.kind === 'bear') {
      item.collected = true;
      s.supplyPickups++;
      if (item.coffee === 'espresso') { s.espressoBoost = 8; s.message = 'ESPRESSO! 8s SPEED BOOST'; }
      else if (item.coffee === 'cafe-con-leche') { s.lives++; s.message = 'CAFÉ CON LECHE! +1 LIFE'; }
      else if (item.coffee === 'iced-coffee') { s.bonusScore += 10; s.message = 'ICED COFFEE! +10 POINTS'; }
      else { s.starPower = 10; s.invincible = Math.max(s.invincible, 10); s.message = 'MACCHIATO! 10s KNOCKOUT POWER'; }
      s.messageTime = 2;
    } else if (s.starPower > 0 && item.kind === 'cave-spike') {
      item.collected = true;
      starKnockout(s, item.x, item.y, 'CAVE SPIKE');
      s.message = 'STAR SMASH! SPIKE DESTROYED!'; s.messageTime = 0.8;
    } else if (isHeroAttack(s) && item.kind === 'boulder') {
      item.collected = true; starKnockout(s, item.x, item.y, 'BOULDER');
    } else if (item.bossAmmo && !item.reflected && s.vy > 0 && previousY <= item.y - 10 && s.y >= item.y - 10) {
      s.y = item.y - 10; s.vy = -470; s.jumps = 1;
      item.reflected = true; item.vx = 1350; item.vy = -300;
      s.message = 'COCONUT RETURN! HIT THE SCORPION!'; s.messageTime = 1.2;
    } else if (!item.reflected && !item.bossAmmo && isHeroAttack(s) && ['rolling', 'bouncing', 'drop', 'barrel', 'boulder'].includes(item.kind)) {
      item.collected = true;
      s.cracks.push({ x: item.x, y: item.y, age: 0, kind: item.kind === 'barrel' ? 'barrel' : 'coconut' });
      s.bonusScore += 10;
      s.message = item.kind === 'barrel' ? 'BARREL SMASH! +10' : 'COCONUT SMASH! +10'; s.messageTime = 0.9;
    } else if (!item.reflected && s.invincible <= 0) {
      item.collected = true;
      s.cracks.push({ x: item.x, y: item.y, age: 0 });
      hurt(s, item.kind === 'spike-pit' ? 'RATTLESNAKE SWAMP! Jump the bog!' : item.kind === 'cave-spike' ? 'CAVE SPIKE! Keep moving!' : item.kind === 'arrow' ? 'GUARDIAN ARROW! Slide low!' : item.kind === 'dart' ? 'SCOUT DART! Duck it!' : item.kind === 'boulder' ? 'BOULDER AVALANCHE! Dash through!' : 'CRACK!');
      break;
    }
  }
  s.items = s.items.filter(i => i.x > s.distance - 60 && !i.collected);
  s.rivers = s.rivers.filter(r => r.x + r.width > s.distance - 60);
}
