import { eelPhase, FLOOR, orangutanHand, piranhaPosition, type Orangutan, type River } from './jungle-runner';

export function drawPineapple(ctx: CanvasRenderingContext2D, x: number, y: number, rotation = 0, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
  ctx.fillStyle = '#e5a329'; ctx.strokeStyle = '#87501c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 2, 15, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip(); ctx.strokeStyle = '#ffdb68'; ctx.lineWidth = 1.5;
  for (let i = -30; i < 35; i += 9) {
    ctx.beginPath(); ctx.moveTo(-20, i); ctx.lineTo(20, i + 30); ctx.moveTo(20, i); ctx.lineTo(-20, i + 30); ctx.stroke();
  }
  ctx.restore();
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = i % 2 ? '#62b64e' : '#2c803d'; ctx.beginPath(); ctx.moveTo(-5, -13); ctx.quadraticCurveTo(i * 7, -29, i * 11, -35 + Math.abs(i) * 3); ctx.lineTo(5, -13); ctx.fill();
  }
  ctx.restore();
}

export function drawOrangutan(ctx: CanvasRenderingContext2D, o: Orangutan, camera: number, sprite?: HTMLImageElement) {
  const x = o.x - camera, feet = FLOOR - 30;
  const dancing = o.state === 'dance', beat = Math.sin(o.age * 7);
  const sway = dancing ? beat * 7 : o.state === 'throw' ? -9 * (1 - o.age / 0.25) : 3;
  if (sprite?.complete && sprite.naturalWidth) {
    // The supplied orangutan art is a seven-frame strip: four pineapple
    // throw poses, then three celebratory dance poses. Crop the active cell
    // rather than squeezing the entire sheet into one character.
    const cellWidth = sprite.naturalWidth / 7;
    const frame = o.state === 'dance'
      ? 4 + Math.floor(o.age * 6) % 3
      : o.state === 'windup'
        ? (o.age < 0.28 ? 0 : 1)
        : o.state === 'throw'
          ? (o.age < 0.12 ? 2 : 3)
          : 3;
    ctx.save(); ctx.translate(x, feet);
    ctx.fillStyle = '#61432b'; ctx.fillRect(-39, 0, 78, 35);
    ctx.fillStyle = '#b28a52'; ctx.beginPath(); ctx.ellipse(0, 0, 39, 9, 0, 0, Math.PI * 2); ctx.fill();
    // These measured bounds remove the transparent top/bottom band while
    // retaining every hand, foot, and the pineapple in the throw poses.
    ctx.drawImage(sprite, frame * cellWidth, 92, cellWidth, 470, -64, -192, 128, 192); ctx.restore();
    // The sheet contains the fruit through release; while he dances between
    // throws, keep the held pineapple visible at the launch hand.
    if (o.state === 'dance' && o.throws < 3) {
      const hand = orangutanHand(o);
      drawPineapple(ctx, hand.x - camera, hand.y - 8, 0, 0.75);
    }
    ctx.fillStyle = '#fff0bc'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(o.state === 'windup' ? 'PINEAPPLE WIND-UP!' : o.state === 'throw' ? 'SLIDE UNDER!' : 'DANCING ORANGUTAN', x, FLOOR - 202);
    if (dancing) { ctx.font = '22px sans-serif'; ctx.fillText('♪', x - 57, FLOOR - 160 + beat * 9); ctx.fillText('♫', x + 57, FLOOR - 188 - beat * 8); }
    return;
  }
  ctx.save(); ctx.translate(x, feet); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // A raised tree stump keeps the dancer outside the runner's collision lane.
  ctx.fillStyle = '#61432b'; ctx.fillRect(-39, 0, 78, 35); ctx.fillStyle = '#b28a52'; ctx.beginPath(); ctx.ellipse(0, 0, 39, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#412d24'; ctx.lineWidth = 3;
  for (const offset of [-26, -6, 18, 30]) { ctx.beginPath(); ctx.moveTo(offset, 9); ctx.lineTo(offset - 4, 34); ctx.stroke(); }
  ctx.translate(sway, dancing ? Math.abs(beat) * -4 : 0);
  for (const side of [-1, 1]) {
    const lift = dancing ? Math.max(0, beat * side) * 11 : 0;
    ctx.strokeStyle = '#a94e21'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(side * 16, -37); ctx.quadraticCurveTo(side * 23, -19, side * 26 + beat * 3, -8 - lift); ctx.stroke();
    ctx.fillStyle = '#644032'; ctx.beginPath(); ctx.ellipse(side * 26 - 4, -6 - lift, 14, 7, -0.15, 0, Math.PI * 2); ctx.fill();
  }
  const fur = ctx.createLinearGradient(-35, -125, 30, -25); fur.addColorStop(0, '#f69a3d'); fur.addColorStop(0.55, '#c76527'); fur.addColorStop(1, '#843b22');
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, -67, 35, 47, -sway * 0.009, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e39755'; ctx.beginPath(); ctx.ellipse(-3, -61, 22, 31, 0, 0, Math.PI * 2); ctx.fill();
  const hand = orangutanHand(o);
  for (const side of [-1, 1]) {
    const throwingArm = side === 1;
    const hx = throwingArm ? hand.x - o.x - sway : -50 + beat * 12;
    const hy = throwingArm ? hand.y - feet : -55 - (dancing ? Math.cos(o.age * 7) * 20 : 0);
    ctx.strokeStyle = '#a94d23'; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(side * 23, -95); ctx.quadraticCurveTo(side * 58, -78, hx, hy); ctx.stroke();
    ctx.strokeStyle = '#e58031'; ctx.lineWidth = 12; ctx.stroke();
    // Long fingers curl around the fruit during the lift and open at release.
    ctx.fillStyle = '#6f4433'; ctx.beginPath(); ctx.ellipse(hx, hy, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6f4433'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(hx - 6 + i * 4, hy); ctx.lineTo(hx - 8 + i * 5, hy + (o.state === 'throw' ? 14 : 7)); ctx.stroke(); }
  }
  ctx.fillStyle = '#bd5c25'; ctx.beginPath(); ctx.ellipse(0, -118, 31, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#875036'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 23, -115, 13, 22, side * 0.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#d7a476'; ctx.beginPath(); ctx.ellipse(-2, -116, 21, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#573b2d'; ctx.beginPath(); ctx.ellipse(-4, -111, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#683c27'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-18, -127); ctx.quadraticCurveTo(-9, -134, -3, -127); ctx.moveTo(3, -127); ctx.quadraticCurveTo(11, -132, 16, -125); ctx.stroke();
  ctx.fillStyle = '#241d1b'; for (const eye of [-10, 9]) { ctx.beginPath(); ctx.arc(eye, -123, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#4a2926'; ctx.beginPath(); ctx.ellipse(-3, -101, 11, dancing ? 7 : 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff0cd'; ctx.fillRect(-11, -104, 16, 3);
  // Strands break up the silhouette into shaggy orange fur.
  ctx.strokeStyle = '#ef9a47'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const side = i % 2 ? 1 : -1, y = -93 + Math.floor(i / 2) * 9; ctx.beginPath(); ctx.moveTo(side * 29, y); ctx.lineTo(side * (36 + i % 3), y + 10); ctx.stroke(); }
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 6, -143); ctx.lineTo(-17 + i * 7, -155 - i % 2 * 4); ctx.stroke(); }
  ctx.restore();
  if (o.state === 'windup' || (o.state === 'dance' && o.throws < 3)) drawPineapple(ctx, hand.x - camera, hand.y - 8, o.state === 'windup' ? -o.age : 0, 0.75);
  ctx.fillStyle = '#fff0bc'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(o.state === 'windup' ? 'PINEAPPLE WIND-UP!' : o.state === 'throw' ? 'SLIDE UNDER!' : 'DANCING ORANGUTAN', x, FLOOR - 202);
  if (dancing) { ctx.font = '22px sans-serif'; ctx.fillText('♪', x - 57, FLOOR - 160 + beat * 9); ctx.fillText('♫', x + 57, FLOOR - 188 - beat * 8); }
}

export function drawWaterLife(ctx: CanvasRenderingContext2D, r: River, camera: number, eelSprite?: HTMLImageElement) {
  if (!r.resident) return;
  ctx.save(); ctx.lineCap = 'round';
  const age = r.waterAge ?? 0;
  if (r.resident === 'piranha') {
    for (let i = 0; i < 2; i++) {
      const fish = piranhaPosition(r, i), x = fish.x - camera;
      ctx.strokeStyle = '#baf4f5'; ctx.lineWidth = 2;
      if (fish.warning || fish.jumping) {
        ctx.beginPath(); ctx.ellipse(x, FLOOR + 21, 19 + Math.sin(age * 9) * 5, 5, 0, 0, Math.PI * 2); ctx.stroke();
        for (let j = 0; j < 4; j++) { const t = (age * 2 + j * 0.23) % 1; ctx.beginPath(); ctx.arc(x + (j - 1.5) * 11, FLOOR + 18 - t * (fish.jumping ? 40 : 17), 2 + t, 0, Math.PI * 2); ctx.stroke(); }
      }
      ctx.save(); ctx.translate(x, fish.y); ctx.rotate(fish.angle); ctx.scale(i ? -1 : 1, 1);
      ctx.fillStyle = '#e66748'; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(34, -15); ctx.lineTo(29, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#77bbaa'; ctx.beginPath(); ctx.ellipse(0, 0, 23, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ec7154'; ctx.beginPath(); ctx.ellipse(-3, 8, 19, 8, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#4b8f83'; ctx.beginPath(); ctx.moveTo(-5, -13); ctx.lineTo(8, -27); ctx.lineTo(15, -10); ctx.fill();
      ctx.strokeStyle = '#315f58'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-1, -1, 10, -1.4, 1.5); ctx.stroke();
      ctx.fillStyle = '#172b31'; ctx.beginPath(); ctx.moveTo(-23, -4); ctx.lineTo(-9, 3); ctx.lineTo(-23, 12); ctx.fill();
      ctx.fillStyle = '#fff8db';
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(-22 + j * 4, -3 + j * 2); ctx.lineTo(-20 + j * 4, 5 + j); ctx.lineTo(-18 + j * 4, -1 + j * 2); ctx.fill(); }
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(-13, -8, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#162b28'; ctx.beginPath(); ctx.arc(-15, -8, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else {
    const x = r.x + r.width * 0.3 - camera, phase = eelPhase(r);
    if (eelSprite?.complete && eelSprite.naturalWidth) {
      ctx.save(); ctx.translate(x, FLOOR + 32 + Math.sin(age * 6) * 4); ctx.rotate(Math.sin(age * 6) * 0.06);
      ctx.drawImage(eelSprite, -80, -36, 160, 72); ctx.restore();
    } else {
      ctx.strokeStyle = phase === 'swim' ? '#34598c' : '#90d5df'; ctx.lineWidth = 15; ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const px = x - 65 + i * 7, py = FLOOR + 31 + Math.sin(i * 0.5 + age * 6) * 9; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke();
      ctx.strokeStyle = '#aed1a6'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#527f9f'; ctx.beginPath(); ctx.ellipse(x - 67, FLOOR + 31 + Math.sin(age * 6) * 9, 17, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffff96'; ctx.beginPath(); ctx.arc(x - 74, FLOOR + 28 + Math.sin(age * 6) * 9, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (phase !== 'swim') {
      ctx.fillStyle = phase === 'shock' ? '#95edff44' : '#c4edff18'; ctx.fillRect(x - 70, FLOOR - 28, 140, 76);
      ctx.strokeStyle = phase === 'shock' ? '#e8ffff' : '#8ac8e4'; ctx.lineWidth = phase === 'shock' ? 3 : 1.5;
      ctx.shadowColor = '#74d8ff'; ctx.shadowBlur = phase === 'shock' ? 12 : 4;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); for (let i = 0; i < 9; i++) { const px = x - 68 + i * 17, py = FLOOR - 18 + j * 25 + Math.sin(i * 2.7 + age * 24 + j) * 9; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
      ctx.shadowBlur = 0; ctx.fillStyle = '#e2fbff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(phase === 'shock' ? 'ZAP! STAY ABOVE!' : 'EEL CHARGING…', x, FLOOR - 43);
    }
  }
  ctx.restore();
}
