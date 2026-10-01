import { FLOOR, type Runner } from './jungle-runner';
import type { DinoKind } from './jungle-dinoland';

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
}

export function drawDinoLand(ctx: CanvasRenderingContext2D, s: Runner, atlas: HTMLImageElement, cameraDistance: number) {
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
    const bottom = dino.kind === 'pterodactyl' ? dino.y + 68 : dino.kind === 'sabertooth' ? dino.y + 40 : FLOOR + 16;
    ctx.save();
    if (dino.state === 'warn') { ctx.shadowColor = '#fff184'; ctx.shadowBlur = 20; }
    if (dino.kind === 'trex' && dino.state === 'attack') { ctx.shadowColor = '#ff6633'; ctx.shadowBlur = 24; }
    sprite(dino.kind, x, bottom, width, height);
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
