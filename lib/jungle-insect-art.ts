import type { Runner } from './jungle-runner';

const FLOOR = 310;

export function drawInsectGrove(ctx: CanvasRenderingContext2D, distance: number, elapsed: number) {
  for (let i = -1; i < 7; i++) {
    const x = i * 180 - distance * 0.3 % 180;
    const y = 180 + i % 2 * 35;
    ctx.fillStyle = '#bddda1'; ctx.fillRect(x - 9, y, 18, 310 - y);
    ctx.fillStyle = i % 2 ? '#e98ace' : '#74ded4';
    ctx.beginPath(); ctx.ellipse(x, y, 67, 32, -0.1, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff7bc';
    for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x - 40 + j * 24, y - 10 - j % 2 * 10, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = '#e8ffa3';
  for (let i = 0; i < 20; i++) { ctx.globalAlpha = 0.4 + Math.sin(elapsed * 2 + i) * 0.3; ctx.beginPath(); ctx.arc((i * 127 - distance * 0.1) % 900, 50 + i * 37 % 220, 2.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

export function drawInsects(ctx: CanvasRenderingContext2D, s: Runner, atlas: HTMLImageElement, camera: number) {
  const cells = { centipede: 0, beetle: 2, worker: 3, 'fire-ant': 4, stinger: 5, caterpillar: 6, katydid: 7 };
  for (const bug of s.insects) {
    const x = bug.x - camera;
    if (x < -180 || x > 980) continue;
    if (bug.kind === 'mud-pit') {
      ctx.save(); ctx.translate(x, FLOOR - 8);
      ctx.fillStyle = '#4a2b27'; ctx.beginPath(); ctx.ellipse(0, 0, 76, 19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7b4b36'; ctx.beginPath(); ctx.ellipse(0, -3, 64, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b9794f';
      for (const ripple of [-34, 0, 34]) { ctx.beginPath(); ctx.arc(ripple, -4, 10, 0.2, Math.PI - 0.2); ctx.strokeStyle = '#c88b5d'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = '#fff5ac'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('MUD PIT! JUMP!', 0, -35); ctx.restore();
      continue;
    }
    const rolling = bug.kind === 'centipede' && bug.state === 'attack';
    const frame = rolling ? 1 : cells[bug.kind];
    // Tight, measured artwork bounds preserve proportions and transparent gutters.
    const bounds = [[48, 97, 392, 272], [538, 98, 293, 291], [921, 98, 367, 286], [1363, 76, 368, 304], [50, 486, 378, 324], [463, 495, 377, 314], [918, 553, 376, 245], [1368, 460, 365, 359]][frame];
    const [sx, sy, sw, sh] = bounds;
    const width = bug.kind === 'caterpillar' ? 100 : bug.kind === 'centipede' && !rolling ? 95 : bug.kind === 'fire-ant' ? 60 : 85;
    const height = width * sh / sw;
    const stackLift = bug.kind === 'fire-ant' ? (bug.stack ?? 0) * 27 : 0;
    const centerY = (bug.kind === 'caterpillar' ? 284 : bug.y) - stackLift;
    ctx.save(); ctx.translate(x, centerY);
    if (bug.kind === 'centipede' && bug.state === 'recover') {
      const burst = 1 + bug.age * 2.5;
      ctx.shadowColor = '#ffe55b'; ctx.shadowBlur = 22; ctx.globalAlpha = Math.max(0, 1 - bug.age * 2);
      ctx.scale(burst, burst); ctx.rotate(bug.age * 18);
    } else if (rolling) ctx.rotate(-bug.age * 7);
    else if (bug.kind === 'stinger') ctx.rotate(Math.sin(bug.age * 40) * 0.08);
    else if (bug.kind === 'caterpillar') ctx.scale(1, bug.used ? 0.8 + Math.sin(s.elapsed * 8) * 0.08 : 1 + Math.sin(s.elapsed * 5) * 0.06);
    else ctx.rotate(Math.sin(bug.age * 9) * 0.035);
    if (bug.kind === 'katydid' && bug.state === 'waiting') ctx.globalAlpha = 0.55;
    if (atlas.complete && atlas.naturalWidth) {
      const scale = atlas.naturalWidth / 1774;
      const top = rolling || bug.kind === 'stinger' ? -height / 2 : 25 - height;
      ctx.drawImage(atlas, sx * scale, sy * scale, sw * scale, sh * scale, -width / 2, top, width, height);
    } else {
      ctx.fillStyle = '#b8f275'; ctx.beginPath(); ctx.ellipse(0, 0, width / 3, height / 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (bug.kind === 'centipede' && bug.state === 'recover') {
      ctx.save(); ctx.translate(x, centerY - 30); ctx.strokeStyle = '#ffed70'; ctx.lineWidth = 4; ctx.shadowColor = '#ff8d4d'; ctx.shadowBlur = 12;
      for (let ray = 0; ray < 8; ray++) { const a = ray * Math.PI / 4 + bug.age * 7; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.lineTo(Math.cos(a) * 45, Math.sin(a) * 45); ctx.stroke(); }
      ctx.restore();
    }
    if (bug.state === 'warning' || bug.kind === 'caterpillar') {
      ctx.fillStyle = '#142f35'; ctx.fillRect(x - 80, centerY - 78, 160, 22);
      ctx.fillStyle = '#fff5ac'; ctx.font = 'bold 11px sans-serif';
      const label = bug.kind === 'caterpillar' ? 'FRIENDLY! BOUNCE ON BACK' : bug.kind === 'stinger' ? 'STING DIVE! SLIDE!' : bug.kind === 'katydid' ? 'RUSTLE! LEAF LEAP!' : bug.kind === 'worker' ? 'ROCK THROW!' : bug.kind === 'beetle' ? 'HOP, HOP, HIGH BOUNCE!' : 'WATCH THE GROUND!';
      ctx.fillText(label, x, centerY - 67);
      if (bug.kind === 'stinger') { ctx.setLineDash([5, 6]); ctx.strokeStyle = '#fff5ac'; ctx.beginPath(); ctx.moveTo(x, centerY); ctx.lineTo(x - 180, 245); ctx.stroke(); ctx.setLineDash([]); }
      if (bug.kind === 'worker') { ctx.fillStyle = '#b4a2bb'; ctx.beginPath(); ctx.arc(x - 12, centerY - 53 - Math.sin(bug.age * 5) * 5, 10, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  for (const rock of s.antRocks) { ctx.fillStyle = '#9a889f'; ctx.strokeStyle = '#473b59'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(rock.x - camera, rock.y, 12, 9, s.elapsed * 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

export function drawReaction(ctx: CanvasRenderingContext2D, s: Runner, x: number) {
  if (s.reactionLeft <= 0) return;
  const t = 0.9 - s.reactionLeft;
  ctx.save(); ctx.translate(x, s.y - 48); ctx.lineWidth = 3;
  if (s.reaction === 'zap') {
    const flash = Math.floor(t * 17) % 2 === 0;
    ctx.strokeStyle = flash ? '#f6ffff' : '#71e8ff'; ctx.shadowColor = '#54cfff'; ctx.shadowBlur = 18;
    // A bright X-ray silhouette appears in alternating flashes during the
    // electric hit. Simple bones stay legible at the game's small scale.
    ctx.fillStyle = flash ? '#173b62cc' : '#0a4668aa';
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 49, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.arc(0, -26, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#123c59'; for (const eye of [-5, 5]) { ctx.beginPath(); ctx.arc(eye, -29, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 20); ctx.stroke();
    for (const side of [-1, 1]) {
      for (let rib = 0; rib < 3; rib++) { const y = -7 + rib * 9; ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(side * 15, y - 7, side * 19, y + 4); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(side * 10, 5); ctx.lineTo(side * 28, 19); ctx.moveTo(side * 5, 19); ctx.lineTo(side * 19, 40); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9 + t * 4; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(49, -10); ctx.lineTo(43, 7); ctx.lineTo(67, 0); ctx.stroke(); ctx.restore(); }
  } else if (s.reaction === 'tussle') {
    for (let i = 0; i < 9; i++) { const a = i * 2.4 + t * 10; ctx.fillStyle = i % 2 ? '#e2d8c4' : '#fff0d2'; ctx.beginPath(); ctx.arc(Math.cos(a) * 30, Math.sin(a) * 22, 19, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#6a4181'; ctx.font = 'bold 25px sans-serif'; ctx.fillText('★  !  ★', 0, -12);
  } else if (s.reaction === 'sting') {
    ctx.strokeStyle = '#ff8eae'; ctx.beginPath(); ctx.arc(0, 0, 30 + t * 28, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff5a3'; ctx.font = 'bold 17px sans-serif';
  ctx.fillText({ zap: 'ZAP!', flatten: 'SQUISH!', tussle: 'YOW!', sting: 'OUCH!', bonk: 'BONK!' }[s.reaction], 0, -70);
  ctx.restore();
}
