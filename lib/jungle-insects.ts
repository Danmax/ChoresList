import type { Runner } from './jungle-runner';

const FLOOR = 310;
export const INSECT_KINDS = ['centipede', 'beetle', 'worker', 'fire-ant', 'stinger', 'katydid', 'caterpillar', 'mud-pit'] as const;
export type InsectKind = typeof INSECT_KINDS[number];
export type Insect = { kind: InsectKind; x: number; y: number; age: number; state: 'waiting' | 'warning' | 'attack' | 'recover'; used: boolean; targetX: number; stack?: number };
export type AntRock = { x: number; y: number; vx: number; vy: number };
export type HitReaction = 'bonk' | 'zap' | 'flatten' | 'tussle' | 'sting';
export function createInsect(kind: InsectKind, x: number, stack?: number): Insect {
  return { kind, x, y: kind === 'stinger' ? 125 : FLOOR - 25, age: 0, state: 'waiting', used: false, targetX: 0, stack };
}
export function insectWarning(difficulty: Runner['difficulty']) { return { easy: 1.05, medium: 0.75, hard: 0.5 }[difficulty]; }

export function stepInsects(s: Runner, dt: number, speed: number, previousY: number, hit: (message: string, reaction: HitReaction) => void) {
  const worldX = s.distance + 150;
  const height = s.duck && s.y >= FLOOR - 1 ? 30 : 76;
  for (const bug of s.insects) {
    const ahead = bug.x - worldX;
    const warning = insectWarning(s.difficulty);
    if (bug.kind === 'mud-pit') {
      const inPit = Math.abs(ahead) < 74 && s.y >= FLOOR - 8;
      if (inPit) hit('MUD PIT! Jump clear!', 'flatten');
      continue;
    }
    if (bug.state === 'waiting' && ahead < speed * (warning + (bug.kind === 'beetle' ? 1.5 : 0.85))) { bug.state = 'warning'; bug.age = 0; }
    else bug.age += dt;
    if (bug.state === 'warning' && bug.age >= warning) {
      bug.state = 'attack'; bug.age = 0; bug.targetX = worldX;
      if (bug.kind === 'worker') {
        // Aim at the old ground position; the visible windup gives time to move.
        const flight = 0.7;
        s.antRocks.push({ x: bug.x - 25, y: FLOOR - 92, vx: (worldX - bug.x + 25) / flight, vy: (80 - 400 * flight * flight) / flight });
      }
    }
    if (bug.state === 'attack') {
      if (bug.kind === 'centipede' || bug.kind === 'fire-ant') bug.x -= (bug.kind === 'centipede' ? 100 : 45) * dt;
      if (bug.kind === 'beetle') {
        bug.x -= 65 * dt;
        const hop = Math.floor(bug.age / 0.55) % 3;
        bug.y = FLOOR - 25 - Math.sin((bug.age % 0.55) / 0.55 * Math.PI) * (hop === 2 ? 145 : 45);
      }
      if (bug.kind === 'stinger' || bug.kind === 'katydid') {
        bug.x -= 95 * dt;
        // The attack path stays above the slide hitbox.
        bug.y = bug.kind === 'stinger' ? 125 + Math.sin(Math.min(1, bug.age / 1.4) * Math.PI) * 120 : FLOOR - 25 - Math.sin(Math.min(1, bug.age / 1.4) * Math.PI) * 145;
        if (bug.age > 1.4) { bug.state = 'recover'; bug.age = 0; }
      }
      // The rolling centipede bursts after its charge. The brief flash gives
      // a double-jumping player a readable, but tight, escape window.
      if (bug.kind === 'centipede' && bug.age > 1.05) { bug.state = 'recover'; bug.age = 0; }
    }
    if (bug.kind === 'stinger' && bug.state === 'recover') bug.y -= 130 * dt;
    if (bug.kind === 'caterpillar') {
      const top = FLOOR - 48;
      if (!bug.used && Math.abs(ahead) < 65 && s.vy > 0 && previousY <= top && s.y >= top) {
        bug.used = true; s.y = top; s.vy = -700; s.jumps = 1; s.duck = false; s.slideLeft = 0; s.flipLeft = 0;
        s.caterpillarBounces++; s.message = 'JEWEL BOUNCE! Reach for the Peridot!'; s.messageTime = 1.5;
      }
      continue;
    }
    if (bug.kind === 'centipede' && bug.state === 'recover') {
      if (bug.age < 0.42 && Math.abs(bug.x - worldX) < 72 && s.y >= FLOOR - 95) hit('CENTIPEDE BURST! Jump clear!', 'flatten');
      if (bug.age >= 0.42) bug.used = true;
      continue;
    }
    const radius = bug.kind === 'fire-ant' ? 16 + (bug.stack ?? 0) * 14 : 25;
    const biteTower = bug.kind === 'fire-ant' ? (bug.stack ?? 0) * 27 : 0;
    if (Math.abs(bug.x - worldX) < (bug.kind === 'centipede' ? 40 : 32) && bug.y + radius - biteTower >= s.y - height && bug.y - radius - biteTower <= s.y - 4) {
      const reaction = bug.kind === 'stinger' || bug.kind === 'fire-ant' ? 'sting' : bug.kind === 'beetle' || bug.kind === 'centipede' ? 'flatten' : 'bonk';
      hit(bug.kind === 'stinger' ? 'STING! Slide under the dive!' : bug.kind === 'fire-ant' ? 'ANT BITE TOWER! Jump high!' : bug.kind === 'katydid' ? 'LEAF LEAP! Slide underneath!' : 'BUG BUMP! Jump or bounce past!', reaction);
    }
  }
  s.antRocks = s.antRocks.filter(rock => {
    rock.x += rock.vx * dt; rock.vy += 800 * dt; rock.y += rock.vy * dt;
    const contact = Math.abs(rock.x - worldX) < 26 && rock.y + 12 >= s.y - height && rock.y - 12 <= s.y - 4;
    if (contact) hit('ROCK BONK! Watch the worker ant!', 'bonk');
    return !contact && rock.y < FLOOR && rock.x > s.distance - 100;
  });
  s.insects = s.insects.filter(bug => !bug.used && bug.x > s.distance - 180 && bug.y > -100);
}
