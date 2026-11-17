import { FLOOR, PLAYER_X, type Runner } from './jungle-runner';
import { MONSTER_BODY, MONSTER_KINDS, monsterZone, type Monster } from './jungle-monsters';

const ASSET_KEYS = [
  ...MONSTER_KINDS.flatMap(kind => kind === 'horseman' ? ['horseman-encounter'] : [`${kind}-run`, `${kind}-encounter`]),
  'shield', 'eruption', 'bolt', 'pumpkin', 'impact', 'teleport', 'rune', 'explosion', 'curse', 'props', 'sky', 'woodland', 'foreground',
];
export type MonsterSprites = { images: Record<string, HTMLImageElement>; loaded: boolean };

export function createMonsterSprites(): MonsterSprites {
  return { images: Object.fromEntries(ASSET_KEYS.map(key => [key, new Image()])), loaded: false };
}
export function loadMonsterSprites(sprites: MonsterSprites) {
  if (sprites.loaded) return;
  sprites.loaded = true;
  for (const [key, image] of Object.entries(sprites.images)) image.src = `/games/monsters/${key}.webp`;
}

function ready(image: HTMLImageElement | undefined): image is HTMLImageElement { return !!image?.complete && image.naturalWidth > 0; }

function frame(ctx: CanvasRenderingContext2D, art: MonsterSprites, key: string, index: number, x: number, y: number, size: number, bottom = false) {
  const image = art.images[key];
  if (!ready(image)) return false;
  // Every imported frame has a 256px cell and a 40px transparent inset.
  // Grounded artwork shares source baseline 216; drawing the padded cell
  // preserves one scale and anchor across the entire animation.
  ctx.drawImage(image, index % 4 * 256, Math.floor(index / 4) * 256, 256, 256,
    x - size / 2, y - size * (bottom ? 216 / 256 : 0.5), size, size);
  return true;
}

export function monsterAnimation(monster: Monster) {
  if (monster.state === 'approach' && monster.kind !== 'horseman') return { action: 'run', index: Math.floor(monster.age * 10) % 8 };
  const index = monster.state === 'warn' ? 1 : monster.state === 'windup' ? 2
    : monster.state === 'attack' ? monster.age < 0.4 ? 3 : 4 : monster.state === 'recover' ? 5
    : monster.state === 'stagger' || monster.state === 'defeated' ? 6 : monster.state === 'retreat' ? 7 : 0;
  return { action: 'encounter', index };
}

function panorama(ctx: CanvasRenderingContext2D, image: HTMLImageElement, camera: number, pace: number, top: number, width: number) {
  if (!ready(image)) return;
  const position = camera * pace / width;
  const first = Math.floor(position);
  // The supplied backgrounds are panoramas. Alternating reflected repeats
  // join identical edge pixels instead of assuming a seamless source tile.
  for (let tile = first - 1; tile <= first + 2; tile++) {
    const x = (tile - position) * width;
    ctx.save(); ctx.translate(x, top);
    if (Math.abs(tile % 2) === 1) { ctx.translate(width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(image, 0, 0, width, width / 2); ctx.restore();
  }
}

export function drawMonsterBackdrop(ctx: CanvasRenderingContext2D, s: Runner, art: MonsterSprites, camera: number) {
  const sky = art.images.sky;
  if (ready(sky)) ctx.drawImage(sky, 0, -35, 880, 440);
  ctx.save(); ctx.globalAlpha = s.monsterBossStarted ? 0.24 : 0.68;
  panorama(ctx, art.images.woodland, camera, 0.2, -105, 900);
  ctx.restore();
  const darkness = ctx.createLinearGradient(0, 100, 0, 310);
  darkness.addColorStop(0, '#17113000'); darkness.addColorStop(1, '#15112766');
  ctx.fillStyle = darkness; ctx.fillRect(0, 100, 800, 210);
}

export function drawMonsterGround(ctx: CanvasRenderingContext2D, s: Runner, art: MonsterSprites, camera: number) {
  const gradient = ctx.createLinearGradient(0, FLOOR, 0, 400);
  gradient.addColorStop(0, '#51405f'); gradient.addColorStop(1, '#201b35');
  ctx.fillStyle = gradient; ctx.fillRect(0, FLOOR, 800, 90);
  ctx.fillStyle = '#9d81bc'; ctx.fillRect(0, FLOOR, 800, 4);
  for (let i = -1; i < 20; i++) {
    const x = i * 70 - camera % 70;
    ctx.fillStyle = i % 2 ? '#655175' : '#45344f';
    ctx.beginPath(); ctx.roundRect(x, FLOOR + 16 + (i % 3) * 13, 49, 13, 5); ctx.fill();
  }
  const zone = monsterZone(s);
  if (camera < 750) frame(ctx, art, 'props', 0, 480 - camera, FLOOR + 8, 270, true);
  if (!s.monsterBossStarted) for (let i = -1; i < 3; i++) {
    const x = i * 530 - (camera * 0.65) % 530;
    ctx.save(); ctx.globalAlpha = 0.85;
    frame(ctx, art, 'props', zone === 'Haunted woodland' ? 3 : 1 + Math.abs(i % 2), x + 350, FLOOR + 6, zone === 'Haunted woodland' ? 265 : 155, true);
    ctx.restore();
  }
  if (zone === 'Troll bridge') frame(ctx, art, 'props', 4, 610, FLOOR + 122, 360, true);
  ctx.save(); ctx.fillStyle = '#eee1ff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`☾ ${zone.toUpperCase()}`, 20, 27); ctx.restore();
}

export function drawMonsters(ctx: CanvasRenderingContext2D, s: Runner, art: MonsterSprites, camera: number) {
  for (const pickup of s.moonShields) {
    const x = pickup.x - camera;
    if (x < -100 || x > 900) continue;
    frame(ctx, art, 'props', 7, x, pickup.y + Math.sin(s.elapsed * 4) * 5 + 43, 118, true);
  }
  for (const spell of s.monsterSpells) {
    const x = spell.x - camera;
    if (spell.kind === 'eruption') {
      if (spell.age < 0.65) frame(ctx, art, 'rune', Math.floor(spell.age * 10) % 8, x, FLOOR + 5, 175, true);
      else frame(ctx, art, 'eruption', Math.min(7, Math.floor((spell.age - 0.65) * 8)), x, FLOOR + 5, 215, true);
    } else if (spell.kind === 'bolt') {
      ctx.save();
      if (spell.reflected) { ctx.translate(x, spell.y); ctx.scale(-1, 1); frame(ctx, art, 'bolt', Math.floor(spell.age * 12) % 8, 0, 0, 120); }
      else frame(ctx, art, 'bolt', Math.floor(spell.age * 12) % 8, x, spell.y, 120);
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(x, spell.y); ctx.rotate(spell.age * 4);
      if (!frame(ctx, art, 'pumpkin', 0, 0, 0, 64)) { ctx.fillStyle = '#ffaf32'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }
  for (const monster of s.monsters) {
    const x = monster.x - camera, body = MONSTER_BODY[monster.kind];
    if (x < -200 || x > 1000) continue;
    const animation = monsterAnimation(monster);
    ctx.save();
    if (monster.state === 'defeated') ctx.globalAlpha = Math.max(0, 1 - monster.age / 0.75);
    // The supplied goblin release frame faces right; mirror that single pose
    // so its throw follows the actual projectile toward the monkey.
    const mirrorThrow = monster.kind === 'goblin' && animation.index === 3 && animation.action === 'encounter';
    ctx.save();
    if (mirrorThrow) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
    const drawn = frame(ctx, art, `${monster.kind}-${animation.action}`, animation.index, x, monster.y, body.size, true);
    ctx.restore();
    if (!drawn) {
      ctx.fillStyle = '#9971c4'; ctx.beginPath(); ctx.ellipse(x, monster.y - body.height / 2, body.half, body.height / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    const label = monster.state === 'recover' || monster.state === 'stagger' ? 'COUNTER!'
      : monster.state === 'windup' && ['beast', 'troll'].includes(monster.kind) ? 'JUMP THE RUNE!'
      : monster.state === 'warn' ? monster.kind === 'horseman' ? monster.casts % 2 ? 'PUMPKIN! SLIDE OR RETURN!' : 'CHARGE! DOUBLE JUMP!' : 'GET READY!' : '';
    ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif';
    if (label) {
      const width = ctx.measureText(label).width + 20;
      ctx.fillStyle = '#17102ee8'; ctx.beginPath(); ctx.roundRect(x - width / 2, monster.y - body.height - 31, width, 22, 6); ctx.fill();
      ctx.fillStyle = label === 'COUNTER!' ? '#a5f7ec' : '#ffe594'; ctx.fillText(label, x, monster.y - body.height - 20);
    }
    if (monster.kind !== 'horseman' && monster.state !== 'defeated' && monster.state !== 'retreat') for (let i = 0; i < monster.hitPoints; i++) {
      ctx.fillStyle = i < monster.hits ? '#665076' : '#d7bdff';
      ctx.beginPath(); ctx.arc(x + (i - (monster.hitPoints - 1) / 2) * 13, monster.y - body.height - 40, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const burst of s.monsterEffects) {
    const index = Math.min(7, Math.floor(burst.age / 0.7 * 8));
    ctx.save(); ctx.globalAlpha = Math.min(1, (0.7 - burst.age) * 5);
    frame(ctx, art, burst.kind, index, burst.x - camera, burst.y + (burst.kind === 'teleport' ? 60 : 0), burst.kind === 'curse' ? 245 : 170, burst.kind === 'teleport');
    ctx.restore();
  }
  if (s.monsterPortalOpen && s.monsterFinishX !== null) {
    const x = s.monsterFinishX - camera;
    frame(ctx, art, 'props', 8, x, FLOOR + 12, 310, true);
    ctx.fillStyle = '#e5d4ff'; ctx.textAlign = 'center'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CASTLE PORTAL →', Math.min(700, x), FLOOR - 192);
  }
}

export function drawMonsterForeground(ctx: CanvasRenderingContext2D, s: Runner, art: MonsterSprites, camera: number) {
  if (s.monsterShieldLeft > 0) {
    ctx.save(); ctx.globalAlpha = s.monsterShieldLeft < 2 ? 0.5 + Math.sin(s.elapsed * 16) * 0.25 : 0.72;
    frame(ctx, art, 'shield', Math.floor(s.elapsed * 10) % 8, PLAYER_X + s.cameraLead, s.y - 52, 180);
    ctx.restore();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(0, FLOOR + 42, 800, 48); ctx.clip();
  panorama(ctx, art.images.foreground, camera, 1.1, 0, 800); ctx.restore();
}
