import { FLOOR, type Runner } from './jungle-runner';
import { savannaVinePosition } from './jungle-savanna';

export type SavannaSprites = {
  lion: HTMLImageElement;
  giraffe: HTMLImageElement;
  wildebeest: HTMLImageElement;
  hyena: HTMLImageElement;
  cliffs: HTMLImageElement;
  oasis: HTMLImageElement;
};

const ANIMAL_BOUNDS = {
  lion: [[20,133,473,240],[502,42,395,343],[936,44,403,341],[1376,160,388,215],[13,457,521,286],[540,516,401,283],[950,528,448,266],[1399,446,362,358]],
  giraffe: [[82,16,293,412],[476,20,348,408],[920,24,350,404],[1376,66,356,360],[47,568,427,261],[543,609,428,231],[1010,440,341,414],[1432,440,292,417]],
  wildebeest: [[33,97,403,292],[465,96,411,289],[907,93,415,286],[1345,103,412,295],[34,513,415,298],[477,518,404,287],[904,516,427,284],[1361,506,394,290]],
  hyena: [[16,127,456,278],[499,42,381,369],[903,156,394,252],[1286,91,471,284],[15,513,427,275],[448,514,473,263],[944,493,368,323],[1322,509,431,287]],
} as const;

function animalFrame(kind: keyof typeof ANIMAL_BOUNDS, state: Runner['savannaAnimals'][number]['state'], age: number, phase: number) {
  if (kind === 'wildebeest') return Math.floor((age + phase) * 9) % 8;
  if (kind === 'giraffe') return state === 'attack' ? Math.min(7, 5 + Math.floor(age * 5)) : Math.floor(age * 2) % 3;
  if (kind === 'hyena') return state === 'warn' ? 1 : state === 'attack' ? 3 + Math.floor(age * 9) % 4 : state === 'recover' ? 7 : 0;
  return state === 'warn' ? (age < 0.35 ? 1 : 2) : state === 'attack' ? 4 : state === 'recover' ? 7 : 0;
}

export function drawSavannaBackdrop(ctx: CanvasRenderingContext2D, s: Runner, oasis: HTMLImageElement, camera: number) {
  if (s.savannaOasisOpen && oasis.complete && oasis.naturalWidth) {
    ctx.drawImage(oasis, 0, 0, 800, 400);
    return;
  }
  const far = (camera * 0.11) % 520;
  ctx.fillStyle = '#b86f43';
  for (let i = -1; i < 4; i++) {
    const x = i * 520 - far;
    ctx.beginPath(); ctx.moveTo(x - 180, FLOOR); ctx.lineTo(x + 15, 165); ctx.lineTo(x + 245, FLOOR); ctx.fill();
  }
  const near = (camera * 0.25) % 310;
  for (let i = -1; i < 5; i++) {
    const x = i * 310 - near;
    ctx.strokeStyle = '#4d3b25'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + 4, 190); ctx.stroke();
    ctx.fillStyle = '#667637'; ctx.beginPath(); ctx.ellipse(x + 5, 178, 78, 24, 0, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawSavanna(ctx: CanvasRenderingContext2D, s: Runner, sprites: SavannaSprites, camera: number) {
  for (const vine of s.savannaVines) {
    const rideProgress = s.swing && 'savannaVine' in s.swing && s.swing.savannaVine === vine ? s.swing.progress : undefined;
    const tip = savannaVinePosition(vine, s.elapsed, rideProgress);
    const anchorX = vine.pitX + vine.width / 2 - camera;
    const tipX = tip.x - camera;
    ctx.strokeStyle = '#5c873d'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(anchorX, 18); ctx.quadraticCurveTo((anchorX + tipX) / 2 + 15, 85, tipX, tip.y); ctx.stroke();
    ctx.strokeStyle = '#a9d56b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#4c762e'; ctx.beginPath(); ctx.ellipse(tipX, tip.y, 16, 9, 0.25, 0, Math.PI * 2); ctx.fill();
    if (!vine.used) {
      ctx.fillStyle = '#fff0a5'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('JUMP TO GRAB VINE', tipX, tip.y - 18);
    }
  }
  for (const pit of s.savannaPits) {
    const x = pit.x - camera;
    if (x > 900 || x + pit.width < -100) continue;
    const abyss = ctx.createLinearGradient(0, FLOOR, 0, 400);
    abyss.addColorStop(0, '#4b2a24'); abyss.addColorStop(1, '#160f16');
    ctx.fillStyle = abyss; ctx.fillRect(x, FLOOR - 2, pit.width, 92);
    if (sprites.cliffs.complete && sprites.cliffs.naturalWidth) {
      ctx.drawImage(sprites.cliffs, 48, 50, 492, 478, x - 120, FLOOR - 105, 125, 122);
      ctx.drawImage(sprites.cliffs, 614, 47, 438, 480, x + pit.width - 5, FLOOR - 105, 112, 122);
      ctx.drawImage(sprites.cliffs, 35, 638, 529, 277, x + pit.width / 2 - 55, FLOOR + 28, 110, 58);
    }
  }

  for (const animal of s.savannaAnimals) {
    if (animal.state === 'defeated') continue;
    const x = animal.x - camera;
    if (x < -220 || x > 1020) continue;
    const kind = animal.kind;
    const sprite = sprites[kind];
    if (!sprite.complete || !sprite.naturalWidth) continue;
    const frame = animalFrame(kind, animal.state, animal.age, animal.phase);
    const [sx, sy, sw, sh] = ANIMAL_BOUNDS[kind][frame];
    const targetHeight = kind === 'giraffe' ? 205 : kind === 'lion' ? 155 : kind === 'wildebeest' ? 115 : 100;
    const targetWidth = targetHeight * sw / sh;
    const bottom = kind === 'lion' || kind === 'hyena' ? animal.y + 3 : FLOOR + 4;
    ctx.save();
    if (animal.state === 'warn') { ctx.shadowColor = '#ffe37b'; ctx.shadowBlur = 18; }
    ctx.drawImage(sprite, sx, sy, sw, sh, x - targetWidth / 2, bottom - targetHeight, targetWidth, targetHeight);
    ctx.restore();
    const label = kind === 'giraffe' ? 'LAND ON NECK · SLIDE TO TAIL'
      : kind === 'wildebeest' ? animal.state === 'warn' ? 'DUST! STAMPEDE!' : 'BOUNCE ON ITS BACK'
      : kind === 'hyena' ? animal.state === 'warn' ? 'HA-HA! POUNCE COMING!' : animal.state === 'recover' ? 'COUNTER!' : 'LAUGHING HYENA'
      : animal.state === 'warn' ? 'ROAR! GET READY!' : animal.state === 'recover' ? 'COUNTER THE LION!' : 'LION POUNCE!';
    ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#3c251dcc';
    const width = ctx.measureText(label).width + 16; ctx.fillRect(x - width / 2, bottom - targetHeight - 24, width, 20);
    ctx.fillStyle = '#fff0b5'; ctx.fillText(label, x, bottom - targetHeight - 10);
    if (kind === 'lion' || kind === 'hyena') for (let i = 0; i < animal.hitPoints; i++) {
      ctx.fillStyle = i < animal.hits ? '#ff7048' : '#fff0ad';
      ctx.beginPath(); ctx.arc(x + (i - (animal.hitPoints - 1) / 2) * 17, bottom - targetHeight - 34, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (s.savannaOasisOpen && s.savannaFinishX !== null) {
    const x = s.savannaFinishX - camera;
    ctx.fillStyle = '#fff4a8'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(x > 760 ? 'OASIS →' : 'OASIS OF VICTORY', Math.min(730, x), FLOOR - 28);
    if (x >= -30 && x <= 830) {
      ctx.strokeStyle = '#f7df78'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, FLOOR, 58, Math.PI, 0); ctx.stroke();
    }
  }
}
