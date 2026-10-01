import { FLOOR, type Runner } from './jungle-runner';
import type { Dino, DinoKind } from './jungle-dinoland';

export type DinoAnimations = Record<DinoKind, HTMLImageElement>;
// Transparent margins measured per 768×512 cell: left, top, right, bottom.
// Cropping them gives the creatures their intended on-screen size while the
// empty gutters in the source sheets keep adjacent animation cells distinct.
const FRAME_BOUNDS: Record<DinoKind, [number, number, number, number][]> = {
  triceratops: [[153, 138, 91, 82], [116, 183, 123, 73], [122, 100, 90, 136], [110, 82, 130, 133]],
  sauropod: [[193, 114, 69, 80], [166, 93, 74, 80], [93, 173, 42, 123], [221, 45, 86, 98]],
  baboon: [[178, 96, 125, 11], [128, 63, 100, 10], [61, 131, 137, 109], [184, 97, 155, 108]],
  sabertooth: [[122, 131, 30, 63], [154, 170, 73, 59], [57, 32, 24, 137], [97, 148, 55, 84]],
  pterodactyl: [[84, 43, 44, 44], [73, 185, 50, 13], [220, 46, 127, 81], [82, 53, 60, 90]],
  mammoth: [[89, 82, 53, 43], [48, 123, 65, 45], [81, 37, 30, 84], [118, 48, 76, 76]],
  trex: [[148, 139, 101, 77], [107, 221, 143, 76], [148, 113, 83, 135], [168, 63, 145, 117]],
};

export function dinoAnimationFrame(dino: Dino, elapsed: number) {
  if (dino.kind === 'sauropod' && dino.state === 'idle') return Math.floor(elapsed * 2.8) % 4;
  if (dino.state === 'warn') return 1;
  if (dino.state === 'attack') return 2;
  if (dino.state === 'recover') return 3;
  return Math.floor(elapsed * (dino.kind === 'pterodactyl' ? 5 : 3.5)) % 2;
}

const CELLS: Record<DinoKind | 'lava', [number, number]> = {
  triceratops: [0, 0], sauropod: [1, 0], baboon: [2, 0], sabertooth: [3, 0],
  pterodactyl: [0, 1], mammoth: [1, 1], trex: [2, 1], lava: [3, 1],
};

export function drawDinoBackdrop(ctx: CanvasRenderingContext2D, distance: number, elapsed: number) {
  const offset = (distance * 0.18) % 420;
  ctx.fillStyle = '#8f5261';
  for (let i = -1; i < 4; i++) {
    const x = i * 420 - offset;
    ctx.beginPath(); ctx.moveTo(x - 170, FLOOR); ctx.lineTo(x + 20, 115); ctx.lineTo(x + 120, 180); ctx.lineTo(x + 260, FLOOR); ctx.fill();
  }
  const volcanoX = 595 - (distance * 0.08) % 1100;
  ctx.fillStyle = '#4b3542'; ctx.beginPath(); ctx.moveTo(volcanoX - 135, FLOOR); ctx.lineTo(volcanoX - 35, 105); ctx.lineTo(volcanoX + 40, 105); ctx.lineTo(volcanoX + 155, FLOOR); ctx.fill();
  ctx.strokeStyle = '#ff7743'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(volcanoX - 12, 113); ctx.lineTo(volcanoX + 8, 182); ctx.lineTo(volcanoX + 30, 221); ctx.stroke();
  ctx.fillStyle = '#573d52aa';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(volcanoX + Math.sin(elapsed * 0.8 + i) * 12 + i * 20, 86 - i * 19, 22 + i * 5, 10 + i * 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Short, ground-rooted prehistoric plants replace the jungle's tall trunks.
  const fernOffset = (distance * 0.35) % 170;
  ctx.strokeStyle = '#3d514a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = -1; i < 7; i++) {
    const x = i * 170 - fernOffset;
    const sway = Math.sin(elapsed * 1.4 + i) * 3;
    ctx.beginPath(); ctx.moveTo(x, FLOOR + 3); ctx.quadraticCurveTo(x + sway, FLOOR - 35, x + sway + 5, FLOOR - 66); ctx.stroke();
    for (let j = 0; j < 4; j++) {
      const y = FLOOR - 18 - j * 12;
      ctx.beginPath(); ctx.moveTo(x + sway * (j + 1) / 5, y);
      ctx.quadraticCurveTo(x - 18, y - 13, x - 30 + j * 2, y - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + sway * (j + 1) / 5, y);
      ctx.quadraticCurveTo(x + 18, y - 13, x + 30 - j * 2, y - 4); ctx.stroke();
    }
  }
}

export function drawDinoLand(ctx: CanvasRenderingContext2D, s: Runner, atlas: HTMLImageElement, animations: DinoAnimations, cameraDistance: number) {
  const ready = atlas.complete && atlas.naturalWidth > 0;
  const cellW = atlas.naturalWidth / 4;
  const cellH = atlas.naturalHeight / 2;
  const sprite = (kind: DinoKind | 'lava', x: number, bottom: number, width: number, height: number) => {
    if (!ready) return;
    const [col, row] = CELLS[kind];
    ctx.drawImage(atlas, col * cellW, row * cellH, cellW, cellH, x - width / 2, bottom - height, width, height);
  };
  for (const pit of s.tarPits) {
    const x = pit.x - cameraDistance;
    if (x > 900 || x + pit.width < -100) continue;
    ctx.fillStyle = '#241924'; ctx.beginPath(); ctx.ellipse(x + pit.width / 2, FLOOR + 4, pit.width / 2, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a76649'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#cb9568'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('TAR PIT · JUMP OUT', x + pit.width / 2, FLOOR - 25);
  }
  for (const eruption of s.eruptions) {
    const x = eruption.x - cameraDistance;
    if (x < -200 || x > 900 || eruption.fired) continue;
    for (let i = 0; i < (s.difficulty === 'easy' ? 2 : 3); i++) {
      const spot = x + 120 + i * 195;
      ctx.fillStyle = '#ff7f3477'; ctx.beginPath(); ctx.ellipse(spot, FLOOR + 1, 43 + Math.sin(s.elapsed * 14) * 5, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffcf69'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  for (const projectile of s.dinoProjectiles) {
    const x = projectile.x - cameraDistance;
    if (x < -80 || x > 880) continue;
    if (projectile.kind === 'lava') sprite('lava', x, projectile.y + 27, 60, 60);
    else { ctx.font = '32px sans-serif'; ctx.fillText('🍊', x, projectile.y); }
  }
  for (const dino of s.dinos) {
    const x = dino.x - cameraDistance;
    if (x < -190 || x > 990) continue;
    const dimensions: Record<DinoKind, [number, number]> = {
      triceratops: [195, 175], sauropod: [220, 230], baboon: [145, 145], sabertooth: [190, 165],
      pterodactyl: [205, 180], mammoth: [225, 190], trex: [310, 285],
    };
    const [width, height] = dimensions[dino.kind];
    const bottom = dino.kind === 'pterodactyl' ? dino.y + 20 : dino.kind === 'sabertooth' ? dino.y + 8 : FLOOR + 5;
    ctx.save();
    if (dino.state === 'warn') { ctx.shadowColor = '#fff184'; ctx.shadowBlur = 20; }
    if (dino.kind === 'trex' && dino.state === 'attack') { ctx.shadowColor = '#ff6633'; ctx.shadowBlur = 24; }
    const animated = animations[dino.kind];
    if (animated.complete && animated.naturalWidth > 0) {
      const frame = dinoAnimationFrame(dino, s.elapsed);
      const frameW = animated.naturalWidth / 2, frameH = animated.naturalHeight / 2;
      const [left, top, right, lower] = FRAME_BOUNDS[dino.kind][frame];
      const pad = 6;
      const sourceW = frameW - left - right + pad * 2;
      const sourceH = frameH - top - lower + pad * 2;
      const drawnH = Math.min(height, width * sourceH / sourceW);
      const pulse = Math.sin((dino.state === 'idle' ? s.elapsed : dino.age) * (dino.state === 'attack' ? 18 : 5) + dino.x * 0.01);
      const drawnW = width * (1 + pulse * 0.025);
      const livelyH = drawnH * (1 - pulse * 0.025);
      const lift = dino.kind === 'pterodactyl' ? Math.sin(s.elapsed * 10) * 5 : dino.state === 'attack' ? Math.sin(dino.age * 17) * 3 : Math.sin(s.elapsed * 4 + dino.x * 0.01) * 2;
      ctx.drawImage(animated, frame % 2 * frameW + left - pad, Math.floor(frame / 2) * frameH + top - pad,
        sourceW, sourceH, x - drawnW / 2, bottom - livelyH + lift, drawnW, livelyH);
    } else sprite(dino.kind, x, bottom, width, height);
    ctx.restore();
    const label: Record<DinoKind, string> = {
      triceratops: dino.state === 'warn' ? 'CHARGE! DOUBLE JUMP' : 'TRICERATOPS',
      sauropod: 'LONG NECK · HOP ON',
      baboon: dino.state === 'warn' ? 'FRUIT THROW! SLIDE' : 'BABOON CREW',
      sabertooth: dino.state === 'warn' ? 'POUNCE! SLIDE' : 'SABER-TOOTH',
      pterodactyl: dino.state === 'warn' ? 'DIVE! SLIDE LOW' : 'PTERODACTYL',
      mammoth: dino.state === 'warn' ? 'HERD! JUMP ON BACKS' : 'MAMMOTH HERD',
      trex: dino.state === 'recover' ? 'COUNTER NOW!' : dino.cycle % 3 === 0 ? 'STOMP! JUMP' : dino.cycle % 3 === 1 ? 'BITE! SLIDE' : 'ROAR! WATCH ROCKS',
    };
    const labelY = dino.kind === 'pterodactyl' ? dino.y - 55 : dino.kind === 'trex' ? FLOOR - 230 : FLOOR - 155;
    ctx.font = 'bold 12px sans-serif';
    const labelWidth = ctx.measureText(label[dino.kind]).width + 18;
    ctx.fillStyle = '#312335dd'; ctx.fillRect(x - labelWidth / 2, labelY - 11, labelWidth, 22);
    ctx.fillStyle = '#fff4cc'; ctx.fillText(label[dino.kind], x, labelY);
    if (dino.hitPoints > 1) for (let i = 0; i < dino.hitPoints; i++) {
      ctx.fillStyle = i < dino.hits ? '#ff7440' : '#fff0b2';
      ctx.beginPath(); ctx.arc(x + (i - (dino.hitPoints - 1) / 2) * 17, labelY - 23, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
}
