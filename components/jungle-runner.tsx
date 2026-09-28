"use client";

import { pantherPaw } from '@/lib/jungle-motion';
import { drawWaterLife, drawOrangutan, drawPineapple } from '@/lib/jungle-water-art';
import { useEffect, useRef, useState } from 'react';
import { RUNNER_DIFFICULTIES, type RunnerDifficulty, GEMS, spiderPosition, airBoost, FLIP_SECONDS, vinePosition, birdHeight, crocodileFrame, hippoFrame, createRunner, dashBoost, duckRunner, FLOOR, jumpRunner, LEVELS, LEVEL_SECONDS, PLAYER_X, runnerScore, travelSpeed, stepRunner, type Runner } from '@/lib/jungle-runner';

// Canvas artwork keeps shells and moving limbs crisp at every display density.
function coconut(ctx: CanvasRenderingContext2D, x: number, y: number, rotation = 0, split = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * split * 30, -split * 12); ctx.rotate(side * split);
    ctx.fillStyle = '#754020'; ctx.strokeStyle = '#3e2415'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 20, side === -1 ? Math.PI / 2 : -Math.PI / 2, side === -1 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ad7846';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side * (5 + i * 4), -12); ctx.quadraticCurveTo(side * 22, 0, side * (5 + i * 3), 13); ctx.stroke(); }
    if (split > 0) { ctx.fillStyle = '#fff5d9'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 18, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  if (!split) { ctx.fillStyle = '#301d12'; for (const [a, b] of [[-6, -5], [3, -7], [-1, 3]]) { ctx.beginPath(); ctx.arc(a, b, 2.5, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}

function panther(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, facing: number, attacking: boolean, crouching = false) {
  const cycle = age * 7, stride = 15;
  const leap = attacking ? Math.sin(Math.min(1, age / 1.05) * Math.PI) : 0;
  const bob = Math.sin(cycle * 2) * (attacking ? 3 : 1.5);
  ctx.save(); ctx.translate(x, y - 7 + bob + (crouching ? 7 : 0)); ctx.scale(-facing, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // A long, low spine, heavy shoulders, rounded ears and a trailing tail give
  // this big cat a leopard silhouette. Each leg has a hip, knee and paw.
  ctx.strokeStyle = '#111823'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(41, -3); ctx.bezierCurveTo(74, 5, 94, -17, 108, -7 + Math.sin(cycle / 3) * 9); ctx.stroke();
  for (const far of [true, false]) {
    for (const front of [false, true]) {
      const phase = cycle + (front ? Math.PI : 0) + (far ? 1.8 : 0);
      const hip = front ? -29 : 32;
      const paw = pantherPaw(phase, stride);
      const reach = attacking ? (front ? -27 : 24) * (1 - leap * 0.45) : paw.reach;
      const lift = attacking ? 8 + leap * 17 : paw.lift;
      ctx.strokeStyle = far ? '#0a101a' : '#26303d'; ctx.lineWidth = front ? 12 : 14;
      ctx.beginPath(); ctx.moveTo(hip, -3); ctx.quadraticCurveTo(hip + (front ? -9 : 11), 14, hip + reach, 31 - lift); ctx.stroke();
      ctx.strokeStyle = far ? '#101722' : '#151d29'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(hip + reach, 31 - lift); ctx.lineTo(hip + reach - 10, 33 - lift); ctx.stroke();
    }
    if (far) {
      const fur = ctx.createLinearGradient(0, -29, 0, 20); fur.addColorStop(0, '#445567'); fur.addColorStop(0.35, '#1a2433'); fur.addColorStop(1, '#080f1a');
      ctx.fillStyle = fur;
      ctx.beginPath(); ctx.moveTo(-48, -12); ctx.bezierCurveTo(-39, -39, -19, -26, 6, -23); ctx.bezierCurveTo(35, -31, 52, -23, 51, -6); ctx.bezierCurveTo(45, 16, 19, 8, 1, 8); ctx.bezierCurveTo(-20, 15, -39, 15, -48, -12); ctx.fill();
      ctx.strokeStyle = '#657789'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-36, -25); ctx.quadraticCurveTo(-22, -30, -9, -23); ctx.stroke();
      // Subtle rosettes catch moonlight without making the coat look striped.
      ctx.strokeStyle = '#354354'; ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(-14 + i * 7, -13 + i % 2 * 10, 3, 2, 0.4, 0, Math.PI * 1.6); ctx.stroke(); }
    }
  }
  ctx.fillStyle = '#172230'; ctx.beginPath(); ctx.ellipse(-46, -13, 23, 18, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f2b39'; ctx.beginPath(); ctx.arc(-35, -29, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#66707a'; ctx.beginPath(); ctx.arc(-35, -29, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#33404d'; ctx.beginPath(); ctx.ellipse(-62, -5, 15, 9, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#080c13'; ctx.beginPath(); ctx.ellipse(-73, -8, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9d85c'; ctx.beginPath(); ctx.moveTo(-62, -19); ctx.lineTo(-49, -17); ctx.lineTo(-59, -14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#05090c'; ctx.fillRect(-57, -18, 2, 4);
  ctx.strokeStyle = '#0b1018'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-64, -21); ctx.lineTo(-48, -18); ctx.stroke();
  if (attacking || crouching) {
    ctx.fillStyle = '#4d1826'; ctx.beginPath(); ctx.ellipse(-61, 3, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3ce';
    for (const tooth of [-69, -54]) { ctx.beginPath(); ctx.moveTo(tooth, -1); ctx.lineTo(tooth + 3, 8); ctx.lineTo(tooth + 5, -1); ctx.fill(); }
  }
  ctx.strokeStyle = '#95a1ab'; ctx.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-65, -1); ctx.lineTo(-81, -5 + i * 5); ctx.stroke(); }
  ctx.restore();
}

function elephant(ctx: CanvasRenderingContext2D, x: number, age: number, charging: boolean) {
  const cycle = age * (charging ? 14 : 4), bob = Math.sin(cycle * 2) * 2;
  ctx.save(); ctx.translate(x, FLOOR + bob); ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const hip = i < 2 ? -32 : 35, step = Math.sin(cycle + i * 2.3) * (charging ? 16 : 4);
    ctx.strokeStyle = i % 2 ? '#778999' : '#465869'; ctx.lineWidth = 19;
    ctx.beginPath(); ctx.moveTo(hip, -49); ctx.lineTo(hip + step, -12 - Math.max(0, Math.cos(cycle + i * 2.3)) * 8); ctx.stroke();
    ctx.fillStyle = '#afb6bb'; ctx.fillRect(hip + step - 9, -10, 19, 5);
  }
  const skin = ctx.createLinearGradient(0, -115, 0, -25); skin.addColorStop(0, '#9aadb9'); skin.addColorStop(1, '#526678');
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(7, -72, 63, 43, -0.05, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#657c8d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(63, -75); ctx.quadraticCurveTo(87, -57, 80, -36); ctx.stroke();
  ctx.fillStyle = '#8298a8'; ctx.beginPath(); ctx.ellipse(-46, -75, 35, 38, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#60798c'; ctx.beginPath(); ctx.ellipse(-23, -77, 26 + Math.sin(cycle) * 4, 33, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a2b5bf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-22, -78, 18, 25, -0.2, -1.6, 1.7); ctx.stroke();
  ctx.strokeStyle = '#849eae'; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(-69, -76); ctx.bezierCurveTo(-84, -49, -78, -20, -96, -25 + Math.sin(cycle) * 8); ctx.stroke();
  ctx.strokeStyle = '#f7eed4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-65, -61); ctx.quadraticCurveTo(-92, -48, -96, -65); ctx.stroke();
  ctx.fillStyle = '#182635'; ctx.beginPath(); ctx.arc(-62, -83, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#bdccd2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-66, -90); ctx.lineTo(-55, -87); ctx.stroke();
  if (charging) {
    ctx.fillStyle = '#cfb38b55';
    for (let i = 0; i < 5; i++) { const t = (age * 2 + i / 5) % 1; ctx.beginPath(); ctx.ellipse(48 + t * 72, -5 - t * 17, 9 + t * 15, 5 + t * 10, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function spiderArt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number) {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const twitch = Math.sin(age * 7 + i) * 4;
    ctx.strokeStyle = '#adb6e0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(side * 9, i * 5 - 8); ctx.lineTo(side * (24 + i * 2), -20 + i * 10 + twitch); ctx.lineTo(side * (35 - i * 2), -8 + i * 10 + twitch); ctx.stroke();
  }
  ctx.fillStyle = '#242344'; ctx.strokeStyle = '#9998d3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -8, 17, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6e527e'; ctx.beginPath(); ctx.ellipse(0, -12, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17182e'; ctx.beginPath(); ctx.arc(0, 13, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffcb73'; for (const eye of [-5, 5]) { ctx.beginPath(); ctx.arc(eye, 14, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function hogArt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, jumping: boolean, preparing: boolean) {
  ctx.save(); ctx.translate(x, y + (preparing ? 5 : 0)); ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const hip = i < 2 ? -20 : 21, stride = jumping ? (i < 2 ? -10 : 10) : Math.sin(age * 19 + i * 2.4) * 10;
    ctx.strokeStyle = i % 2 ? '#3f2924' : '#251c1b'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(hip, 8); ctx.lineTo(hip + stride, jumping ? 16 : 23); ctx.lineTo(hip + stride - 5, jumping ? 17 : 24); ctx.stroke();
  }
  const fur = ctx.createLinearGradient(0, -24, 0, 17); fur.addColorStop(0, '#725047'); fur.addColorStop(1, '#30221f'); ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(2, -2, 34, 23, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#302323'; ctx.beginPath(); ctx.moveTo(-26, -15);
  for (let i = 0; i < 9; i++) { ctx.lineTo(-24 + i * 6, -32 - i % 2 * 7); ctx.lineTo(-20 + i * 6, -19); } ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#70503d'; ctx.beginPath(); ctx.moveTo(-15, -18); ctx.lineTo(-37, -14); ctx.lineTo(-51, 5); ctx.lineTo(-30, 15); ctx.lineTo(-14, 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a67c64'; ctx.beginPath(); ctx.ellipse(-46, 4, 10, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#291c1b'; ctx.beginPath(); ctx.arc(-50, 3, 2, 0, Math.PI * 2); ctx.arc(-44, 5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4c342a'; ctx.beginPath(); ctx.moveTo(-24, -14); ctx.lineTo(-31, -33); ctx.lineTo(-12, -24); ctx.fill();
  ctx.fillStyle = '#271619'; ctx.beginPath(); ctx.ellipse(-35, 11, 14, 6, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff0cc'; ctx.lineWidth = 5;
  for (const offset of [0, 9]) { ctx.beginPath(); ctx.moveTo(-32 - offset, 14); ctx.quadraticCurveTo(-49 - offset, 13, -44 - offset, -10); ctx.stroke(); }
  ctx.fillStyle = '#ff8a48'; ctx.beginPath(); ctx.ellipse(-32, -9, 5, 2.5, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#291c1b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, -16); ctx.lineTo(-26, -10); ctx.stroke();
  ctx.strokeStyle = '#c39780'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(-13, -2); ctx.moveTo(-13, -13); ctx.lineTo(-8, -5); ctx.stroke();
  ctx.strokeStyle = '#39241e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(33, 0); ctx.bezierCurveTo(50, -7, 41, -18, 38, -8); ctx.stroke();
  if (preparing) { ctx.fillStyle = '#ffeb8b'; ctx.font = 'bold 17px sans-serif'; ctx.fillText('↑', 0, -45); }
  ctx.restore();
}

function batArt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, diving: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(diving ? -0.18 : 0);
  const flap = Math.sin(age * 24) * 19;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#473650'; ctx.strokeStyle = '#bc9bbf'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(side * 5, -7); ctx.quadraticCurveTo(side * 21, -29 + flap, side * 44, -14 + flap);
    ctx.quadraticCurveTo(side * 31, -6, side * 34, 9); ctx.quadraticCurveTo(side * 22, 0, side * 21, 16); ctx.quadraticCurveTo(side * 10, 5, side * 5, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side * 6, -5); ctx.lineTo(side * 34, 9); ctx.moveTo(side * 6, -5); ctx.lineTo(side * 21, 16); ctx.stroke();
  }
  ctx.fillStyle = '#1c172d'; ctx.beginPath(); ctx.ellipse(0, 4, 9, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-10, -24); ctx.lineTo(0, -13); ctx.lineTo(10, -24); ctx.lineTo(8, -5); ctx.fill();
  ctx.fillStyle = diving ? '#ffad78' : '#e4d178'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 4, -5, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff5df'; ctx.fillRect(-4, 2, 2, 4); ctx.fillRect(2, 2, 2, 4);
  ctx.restore();
}

function gemArt(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, elapsed: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(0.85 + Math.sin(elapsed * 3) * 0.15, 1);
  ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillStyle = color; ctx.strokeStyle = '#f3ffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-12, -19); ctx.lineTo(12, -19); ctx.lineTo(23, -4); ctx.lineTo(0, 24); ctx.lineTo(-23, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.moveTo(-12, -19); ctx.lineTo(-7, -4); ctx.lineTo(0, 24); ctx.lineTo(-23, -4); ctx.fill();
  ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-23, -4); ctx.lineTo(23, -4); ctx.moveTo(12, -19); ctx.lineTo(7, -4); ctx.lineTo(0, 24); ctx.stroke();
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, s: Runner, sprite: HTMLImageElement, predators: HTMLImageElement, wildlife: HTMLImageElement) {
  const W = 800, H = 400;
  const night = s.level === LEVELS.length - 1;
  const cameraDistance = s.distance - s.cameraLead;
  const playerX = PLAYER_X + s.cameraLead;
  const animal = (row: number, frame: number, x: number, y: number, width: number, height: number, flip = false) => {
    if (!wildlife.complete || !wildlife.naturalWidth) return;
    const cellW = wildlife.naturalWidth / 4, cellH = wildlife.naturalHeight / 3;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(wildlife, frame * cellW, row * cellH, cellW, cellH, -width / 2, 0, width, height);
    ctx.restore();
  };
  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, LEVELS[s.level].sky); sky.addColorStop(1, LEVELS[s.level].mist);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (night) {
    ctx.fillStyle = '#d4e6ff';
    for (let i = 0; i < 45; i++) { ctx.globalAlpha = 0.45 + Math.sin(s.elapsed * 1.5 + i) * 0.3; ctx.beginPath(); ctx.arc((i * 137) % W, 12 + (i * 43) % 170, i % 3 === 0 ? 1.7 : 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(650, 65, 15, 650, 65, 100); glow.addColorStop(0, '#d8e9ff88'); glow.addColorStop(1, '#9bbdff00'); ctx.fillStyle = glow; ctx.fillRect(550, 0, 200, 165);
  }
  ctx.fillStyle = night ? '#e0eaff' : '#fff5b6'; ctx.beginPath(); ctx.arc(650, 65, 38, 0, Math.PI * 2); ctx.fill();
  if (night) { ctx.fillStyle = '#a6b8d477'; for (const [x, y, r] of [[637, 50, 8], [665, 76, 11], [635, 80, 5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); } }
  // Three independent speeds create depth without moving the collision plane.
  for (let layer = 0; layer < 3; layer++) {
    const spacing = [240, 190, 330][layer];
    const offset = (cameraDistance * [0.12, 0.35, 0.65][layer]) % spacing;
    for (let i = -1; i < 6; i++) {
      const x = i * spacing - offset;
      if (layer === 0) {
        ctx.fillStyle = night ? '#263752' : '#72bcb0'; ctx.beginPath(); ctx.moveTo(x - 130, FLOOR); ctx.quadraticCurveTo(x + 100, -5, x + 290, FLOOR); ctx.fill();
      } else {
        const top = layer === 1 ? 105 : 25;
        ctx.fillStyle = night ? (layer === 1 ? '#24374d' : '#132a39') : layer === 1 ? '#55936b' : '#337453';
        ctx.fillRect(x + 60, top, layer === 1 ? 18 : 30, FLOOR - top);
        ctx.fillStyle = night ? (layer === 1 ? '#304c61' : '#1b3948') : layer === 1 ? '#69ad78' : '#24805d';
        for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x + 35 + j * 33, top, 54, 36, -0.3, 0, Math.PI * 2); ctx.fill(); }
        if (layer === 2) { ctx.strokeStyle = '#548e42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 110, top); ctx.quadraticCurveTo(x + 80, 125, x + 125, 175); ctx.stroke(); }
      }
    }
  }
  if (night) {
    const beam = ctx.createLinearGradient(650, 80, 390, FLOOR); beam.addColorStop(0, '#c1dbff22'); beam.addColorStop(1, '#a8ceff00'); ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(625, 82); ctx.lineTo(682, 82); ctx.lineTo(590, FLOOR); ctx.lineTo(200, FLOOR); ctx.fill();
  }
  ctx.fillStyle = night ? '#303b50' : '#956337'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = night ? '#7b9fae' : '#8bc34b'; ctx.fillRect(0, FLOOR, W, 9);
  ctx.fillStyle = night ? '#53667d' : '#bc884b';
  for (let i = -1; i < 24; i++) ctx.fillRect(i * 45 - cameraDistance % 45, FLOOR + 30 + i % 3 * 10, 18, 5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const r of s.rivers) {
    const x = r.x - cameraDistance;
    ctx.fillStyle = '#166879'; ctx.fillRect(x, FLOOR, r.width, 90);
    ctx.fillStyle = '#69d9db'; ctx.fillRect(x, FLOOR + 40, r.width, 50);
    ctx.fillStyle = '#5b3f30'; ctx.fillRect(x - 6, FLOOR, 6, 90); ctx.fillRect(x + r.width, FLOOR, 6, 90);
    for (let i = 0; i < 2; i++) {
      const remaining = r.snapLeft?.[i] ?? 0;
      const lift = remaining > 0 ? Math.sin((0.6 - remaining) / 0.6 * Math.PI) * 13 : 0;
      animal(0, crocodileFrame(remaining), x + (i === 0 ? 35 : r.width - 35), FLOOR + 11 - lift, 94, 72, i === 0);
    }
    drawWaterLife(ctx, r, cameraDistance);
    if (r.vine) {
      for (let i = 1; i < 5; i++) animal(0, Math.floor(s.elapsed * 5 + i) % 4, x + r.width * i / 5, FLOOR + 12, 112, 76, i % 2 === 0);
      const tip = vinePosition(r, s.elapsed, s.swing?.river === r ? s.swing.progress : undefined);
      ctx.strokeStyle = '#334925'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + r.width / 2, -80); ctx.lineTo(tip.x - cameraDistance, tip.y); ctx.stroke();
      ctx.strokeStyle = '#8dbf4b'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(tip.x - cameraDistance, tip.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 14px sans-serif'; ctx.fillText(s.swing?.river === r ? 'JUMP TO RELEASE' : 'JUMP & CATCH THE VINE', s.swing?.river === r ? playerX + 130 : x + 70, FLOOR - 115);
      continue;
    }
    ctx.fillStyle = '#fff5b6'; ctx.fillRect(x - 65, FLOOR - 80, 62, 23);
    ctx.fillStyle = '#174d35'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('CLIFF ↑', x - 34, FLOOR - 68);
    const hx = x + r.width * 0.6;
    const hf = hippoFrame(r, s.distance + PLAYER_X);
    const spring = (r.bounceLeft ?? 0) > 0 ? Math.sin((0.45 - r.bounceLeft!) / 0.45 * Math.PI) * 8 : 0;
    animal(1, hf, hx + 20, FLOOR - 98 - spring, 132, 126 + spring);
    if (hf === 2) {
      // The glowing lower jaw is the existing safe landing surface.
      ctx.strokeStyle = '#fff5a3'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(hx - 8, FLOOR - 12, 26, 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#fef08a'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('BOUNCE', hx, FLOOR - 100);
  }
  for (const o of s.orangutans) drawOrangutan(ctx, o, cameraDistance);
  for (const p of s.pineapples) drawPineapple(ctx, p.x - cameraDistance, p.y, p.rotation);
  for (const splat of s.splats) {
    ctx.save(); ctx.globalAlpha = 1 - splat.age / 0.65;
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9, radius = 12 + splat.age * 115;
      ctx.fillStyle = i % 3 === 0 ? '#6aa346' : '#ffd260';
      ctx.beginPath(); ctx.ellipse(splat.x - cameraDistance + Math.cos(angle) * radius, splat.y + Math.sin(angle) * radius * 0.6 + splat.age ** 2 * 120, 5, 3, angle, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const hog of s.hogs) {
    const x = hog.x - cameraDistance;
    if (x < -100 || x > 900) continue;
    hogArt(ctx, x, hog.y, hog.age, hog.y < FLOOR - 26, hog.jumper && hog.jumpIn < 0.3 && hog.y >= FLOOR - 26);
    ctx.fillStyle = '#fff1b0'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(hog.jumper ? 'LEAPING HOG' : 'WILD HOG', x, hog.y - 49);
  }
  for (const bat of s.bats) {
    batArt(ctx, bat.x - cameraDistance, bat.y, s.elapsed + bat.x * 0.001, bat.state === 'diving');
  }
  if (s.bats.some(b => b.state === 'warning' || b.state === 'diving')) {
    ctx.fillStyle = '#2e2447'; ctx.fillRect(230, 103, 350, 26); ctx.fillStyle = '#f1dcff'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('DIVING BAT WAVE — SLIDE UNDER!', 405, 116);
  }
  for (const herd of s.herds) {
    for (let i = 2; i >= 0; i--) elephant(ctx, herd.x + i * 175 - cameraDistance, herd.age + i * 0.4, herd.charging);
    if (herd.warned && herd.x + 350 > s.distance + PLAYER_X) {
      ctx.fillStyle = '#ffebaa'; ctx.fillRect(235, 103, 350, 26); ctx.fillStyle = '#543728'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('STAMPEDE — DOUBLE JUMP ONTO BACKS!', 410, 116);
    }
  }
  for (const spider of s.spiders) {
    const pos = spiderPosition(spider, s.elapsed);
    ctx.strokeStyle = '#d6ddf0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(spider.x - cameraDistance, 25); ctx.lineTo(pos.x - cameraDistance, pos.y); ctx.stroke();
    spiderArt(ctx, pos.x - cameraDistance, pos.y, s.elapsed + spider.phase);
    ctx.fillStyle = '#e3eaff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('SLIDE UNDER', pos.x - cameraDistance, pos.y - 42);
  }
  for (const bird of s.birds) {
    const x = bird.x - cameraDistance;
    const y = birdHeight(bird, s.elapsed);
    const wingFrame = (bird.releaseLeft ?? 0) > 0 ? 3 : [0, 1, 2, 1][Math.floor(s.elapsed * 10) % 4];
    animal(2, wingFrame, x, y - 40, 78, 70);
    if (!bird.dropped) { if (bird.gift === 'drop') coconut(ctx, x, y + 25); else { ctx.font = '22px sans-serif'; ctx.fillText('🍒', x, y + 25); } }
  }
  for (const item of s.items) {
    const x = item.x - cameraDistance;
    if (x < -40 || x > 850) continue;
    const collectible = ['banana', 'golden', 'cherry', 'gem'].includes(item.kind);
    if (item.kind === 'gem') {
      const gem = GEMS[item.level ?? s.level];
      gemArt(ctx, x, item.y, gem.color, s.elapsed);
      ctx.fillStyle = '#142739'; ctx.fillRect(x - 78, item.y - 51, 156, 22);
      ctx.fillStyle = '#efffff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(`${gem.name.toUpperCase()} +250`, x, item.y - 40);
      ctx.fillStyle = '#153747'; ctx.fillRect(x - 65, item.y + 32, 130, 20); ctx.fillStyle = '#eaffff'; ctx.fillText('TIMED DOUBLE JUMP', x, item.y + 42);
      continue;
    }
    if (item.kind === 'golden') {
      ctx.fillStyle = '#ffe663'; ctx.beginPath(); ctx.arc(x, item.y, 23 + Math.sin(s.elapsed * 6) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#593700'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('DOUBLE ↑', x, item.y - 33);
    }
    const movingCoconut = item.kind === 'rolling' || item.kind === 'bouncing' || item.kind === 'drop';
    if (movingCoconut) {
      ctx.fillStyle = '#153b3540'; ctx.beginPath(); ctx.ellipse(x, FLOOR - 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff6c999'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 27, item.y - 3); ctx.lineTo(x + 43, item.y - 3); ctx.stroke();
    }
    ctx.save(); ctx.translate(x, item.y);
    if (movingCoconut) ctx.rotate(item.rotation ?? 0);
    ctx.font = collectible ? '27px sans-serif' : '38px sans-serif';
    if (collectible) ctx.fillText(item.kind === 'cherry' ? '🍒' : '🍌', 0, 0); else coconut(ctx, 0, 0);
    ctx.restore();
    if (!collectible) {
      const labelY = item.kind === 'drop' ? item.y + 34 : item.y - 33;
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 29, labelY - 10, 58, 19);
      ctx.fillStyle = '#174d35'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(movingCoconut || ['low', 'drop'].includes(item.kind) ? 'JUMP' : item.kind === 'high' ? 'DUCK' : 'RUN', x, labelY);
    }
  }
  for (const crack of s.cracks) {
    ctx.save(); ctx.globalAlpha = 1 - crack.age / 0.75;
    coconut(ctx, crack.x - cameraDistance, crack.y + 120 * crack.age ** 2, crack.age, 0.2 + crack.age * 2);
    ctx.fillStyle = '#fff6de';
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ctx.beginPath(); ctx.arc(crack.x - cameraDistance + Math.cos(a) * crack.age * 110, crack.y + Math.sin(a) * crack.age * 80, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  for (const p of s.predators) {
    if (p.kind === 'tiger' && ['waiting', 'warning'].includes(p.state)) continue;
    const x = p.x - cameraDistance;
    if (x < -100 || x > 900) continue;
    if (p.kind === 'panther') {
      panther(ctx, x, p.y, p.age, p.facing, p.state === 'attack', p.state === 'warning');
      ctx.fillStyle = p.state === 'waiting' && !night ? '#172031' : '#fff176'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(p.state === 'waiting' ? 'PANTHER PATROL' : 'HIGH POUNCE! SLIDE!', x, p.y - 53);
      continue;
    }
    const frame = p.kind === 'tiger' && p.attackStyle === 'rush' && p.state === 'attack' ? (Math.floor(p.age * 12) % 2 === 0 ? 0 : 3) : p.state === 'attack' ? p.age < 0.13 ? 1 : p.age < (p.kind === 'tiger' ? 0.72 : 0.9) ? 2 : 3 : p.state === 'crouch' ? 1 : p.state === 'recover' ? 3 : Math.floor(p.age * 3) % 2 === 0 ? 0 : 3;
    // Individually bounded frames preserve the generated poses' transparent margins.
    const frames = p.kind === 'snake'
      ? [[40, 60, 325, 385], [437, 60, 326, 385], [790, 60, 575, 385], [1390, 70, 330, 370]]
      : [[15, 500, 410, 350], [445, 500, 365, 350], [810, 490, 560, 355], [1380, 490, 375, 360]];
    const [sx, sy, sw, sh] = frames[frame];
    const width = p.kind === 'tiger' ? (frame === 2 ? 177 : 133) : (frame === 2 ? 100 : 62);
    const height = p.kind === 'tiger' ? 96 : 72;
    ctx.save(); if (p.kind === 'tiger') { ctx.filter = 'contrast(1.3) saturate(1.25)'; ctx.shadowColor = '#b53616'; ctx.shadowBlur = p.state === 'attack' ? 15 : 5; }
    if (predators.complete && predators.naturalWidth) ctx.drawImage(predators, sx, sy, sw, sh, x - width / 2, p.y - height / 2, width, height);
    ctx.restore();
    ctx.fillStyle = '#fff5b6'; ctx.fillRect(x - 48, p.y - height / 2 - 24, 96, 20);
    ctx.fillStyle = '#713719'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(p.kind === 'snake' ? 'DOUBLE JUMP' : p.attackStyle === 'rush' ? 'LOW! JUMP!' : p.attackStyle === 'intercept' ? 'AIR HUNT! DIVE!' : p.state === 'attack' ? 'DUCK / DIVE!' : 'HIGH! SLIDE!', x, p.y - height / 2 - 14);
  }
  const tigerWarning = s.predators.some(p => p.kind === 'tiger' && ['warning', 'crouch'].includes(p.state));
  if (tigerWarning) {
    ctx.strokeStyle = '#fff176'; ctx.lineWidth = 4;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i * Math.PI / 6;
      const pulse = 4 * Math.sin(s.elapsed * 18);
      ctx.beginPath(); ctx.moveTo(playerX + Math.cos(a) * 38, s.y - 88 + Math.sin(a) * 38);
      ctx.lineTo(playerX + Math.cos(a) * (55 + pulse), s.y - 88 + Math.sin(a) * (55 + pulse)); ctx.stroke();
    }
    ctx.fillStyle = '#762f27'; ctx.fillRect(230, 12, 350, 34);
    ctx.fillStyle = '#fff6af'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('⚡ DANGER SENSE — TIGER AHEAD!', 405, 29);
  }
  const knocked = s.stun > 0 || s.phase === 'over';
  const grounded = s.y >= FLOOR - 1;
  const frame = knocked ? 4 : s.phase === 'victory' ? 5 : s.duck && grounded ? 3 : !grounded ? 2 : Math.floor(s.elapsed * 9) % 2;
  if (dashBoost(s) + airBoost(s) > 5) {
    ctx.strokeStyle = '#fff0ad'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const length = (dashBoost(s) + airBoost(s)) * 0.3;
      ctx.beginPath(); ctx.moveTo(playerX - 30 - length, s.y - 8 - i * 10); ctx.lineTo(playerX - 35, s.y - 8 - i * 10); ctx.stroke();
    }
  }
  ctx.save();
  const bob = grounded && !s.duck && s.phase === 'playing' && !knocked ? Math.sin(s.elapsed * 18 * Math.PI) * 2 : 0;
  ctx.translate(playerX + (knocked ? Math.sin(s.stun * 70) * 6 : 0), s.y + bob);
  if (s.flipLeft > 0 && !knocked) { ctx.translate(0, -46); ctx.rotate((1 - s.flipLeft / FLIP_SECONDS) * Math.PI * 2); ctx.translate(0, 46); }
  else if (!grounded && !knocked) ctx.rotate(Math.max(-0.12, Math.min(0.12, s.vy / 4500)));
  if (s.invincible > 0 && !knocked) ctx.globalAlpha = 0.65 + Math.sin(s.elapsed * 30) * 0.25;
  if (sprite.complete && sprite.naturalWidth) {
    const cell = sprite.naturalWidth / 6;
    // The existing sheet has transparent headroom; crop each cell to its artwork.
    ctx.drawImage(sprite, frame * cell, 110, cell, 490, -47, -100, 94, 108);
  }
  ctx.restore();
  if (s.swing) {
    const tip = vinePosition(s.swing.river, s.elapsed, s.swing.progress);
    ctx.strokeStyle = '#713a1d'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(playerX + 8, s.y - 40); ctx.lineTo(tip.x - cameraDistance, tip.y); ctx.stroke();
    ctx.fillStyle = '#efb568'; ctx.beginPath(); ctx.arc(tip.x - cameraDistance, tip.y, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (knocked) {
    ctx.font = '24px sans-serif';
    for (let i = 0; i < 3; i++) { const a = s.elapsed * 8 + i * Math.PI * 2 / 3; ctx.fillText('⭐', playerX + Math.cos(a) * 35, s.y - 102 + Math.sin(a) * 8); }
  }
  // Foreground grasses scroll fastest and stay below the playable area.
  ctx.fillStyle = night ? '#102c3b' : '#225939';
  for (let i = -1; i < 14; i++) {
    const x = i * 80 - (cameraDistance * 1.2) % 80;
    ctx.beginPath(); ctx.moveTo(x, 400); ctx.lineTo(x + 12, 371); ctx.lineTo(x + 19, 389); ctx.lineTo(x + 34, 365); ctx.lineTo(x + 43, 400); ctx.fill();
  }
  if (s.messageTime > 0) {
    ctx.fillStyle = '#173e32'; ctx.fillRect(200, 58, 400, 38);
    ctx.fillStyle = '#fff4a3'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(s.message, 400, 78);
  }
}

export function JungleVineSwing({ onExit, onFinish }: {
  onExit: () => void;
  onFinish: (score: number, duration: number, metadata: Record<string, unknown>) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef(createRunner());
  const [difficulty, setDifficulty] = useState<RunnerDifficulty>('medium');
  const [hud, setHud] = useState({ phase: 'ready', lives: 3, bananas: 0, seconds: 60, paused: false, level: 0, score: 0, golden: 0, cherries: 0, gems: 0, levelGem: false, slide: 0, speed: 1 });
  const paused = useRef(false);
  const saved = useRef(false);
  const duckSources = useRef(new Set<string>());
  const publish = () => {
    const s = world.current;
    setHud({ phase: s.phase, lives: s.lives, bananas: s.bananas, seconds: Math.max(0, Math.ceil((s.level + 1) * LEVEL_SECONDS - s.elapsed)), paused: paused.current, level: s.level, score: runnerScore(s), golden: s.golden, cherries: s.cherries, gems: s.gems, levelGem: s.gemCollected[s.level], slide: s.slideLeft, speed: travelSpeed(s) / LEVELS[0].speed });
  };
  function selectDifficulty(value: RunnerDifficulty) {
    if (world.current.phase !== 'ready') return;
    setDifficulty(value);
    world.current = createRunner(value);
    publish();
  }
  function jump() { if (!paused.current) { duckSources.current.clear(); jumpRunner(world.current); } }
  function duck(source: string, down: boolean) {
    if (down) duckSources.current.add(source); else duckSources.current.delete(source);
    duckRunner(world.current, duckSources.current.size > 0 && !paused.current);
  }
  function pause() { paused.current = !paused.current; duckSources.current.clear(); duckRunner(world.current, false); publish(); }
  function start() { world.current = createRunner(difficulty); world.current.phase = 'playing'; paused.current = false; saved.current = false; duckSources.current.clear(); publish(); }

  useEffect(() => {
    const sprite = new Image(); sprite.src = '/games/jungle-monkey-runner-sprites-v2.png';
    const predators = new Image(); predators.src = '/games/jungle-predators-v1.png';
    const wildlife = new Image(); wildlife.src = '/games/jungle-wildlife-v1.png';
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    let frame = 0, previous = 0, accumulator = 0, lastHud = 0;
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      if (!paused.current) {
        accumulator += dt;
        while (accumulator >= 1 / 120) { stepRunner(world.current, 1 / 120); accumulator -= 1 / 120; }
      } else accumulator = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.current && canvas.current.width !== 800 * dpr) { canvas.current.width = 800 * dpr; canvas.current.height = 400 * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, world.current, sprite, predators, wildlife);
      if (now - lastHud > 100) { publish(); lastHud = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        if (e.repeat) return;
        if (['ArrowDown', 'KeyS'].includes(e.code)) duck(e.code, true); else jump();
      }
    };
    const up = (e: KeyboardEvent) => { if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); duck(e.code, false); } };
    const blur = () => { if (world.current.phase === 'playing') paused.current = true; duckSources.current.clear(); duckRunner(world.current, false); publish(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const ended = hud.phase === 'over' || hud.phase === 'victory';
  return <section className="fixed inset-0 z-50 flex flex-col justify-center overflow-auto bg-emerald-950 p-3 text-white sm:p-6" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-2 flex items-center justify-between gap-2"><h2 className="font-black">Jungle Runner</h2><div className="flex gap-2"><button onClick={pause} disabled={hud.phase !== 'playing'} className="rounded-xl bg-white/10 px-3 py-2 disabled:opacity-40">{hud.paused ? 'Resume' : 'Pause'}</button><button onClick={onExit} className="rounded-xl bg-white/10 px-3 py-2">Exit</button></div></header>
      {hud.phase === 'ready' && (
        <fieldset className="mb-3 rounded-xl bg-white/10 p-3">
          <legend className="px-1 text-sm font-black">Difficulty</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(RUNNER_DIFFICULTIES) as RunnerDifficulty[]).map((value) => (
              <label key={value} className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-black ${difficulty === value ? 'bg-yellow-300 text-emerald-950' : 'bg-emerald-900 text-white'}`}>
                <input type="radio" name="runner-difficulty" value={value} checked={difficulty === value} onChange={() => selectDifficulty(value)} className="mr-2 accent-emerald-700" />
                {RUNNER_DIFFICULTIES[value].label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-emerald-100">{RUNNER_DIFFICULTIES[difficulty].description}</p>
        </fieldset>
      )}
      <div className="mb-2 flex justify-between gap-2 text-sm font-black"><span>🍌 {hud.bananas} <small className="block text-yellow-200">{hud.bananas % 100}/100 → +1 life</small></span><span>❤️ {hud.lives} lives</span><span>{hud.seconds}s · {hud.score} pts</span></div>
      <p className="mb-2 text-xs font-bold text-yellow-200">{RUNNER_DIFFICULTIES[difficulty].label} · Level {hud.level + 1}/{LEVELS.length} · {LEVELS[hud.level].name} · {hud.speed.toFixed(1)}× pace · ⭐ {hud.golden} gold · 🍒 {hud.cherries} · 💎 {hud.gems}/{LEVELS.length} · {GEMS[hud.level].name}: {hud.levelGem ? "collected" : "find it!"}</p>
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-700">
        <canvas ref={canvas} width={800} height={400} aria-label="Jungle runner: flip over coconuts and panthers, slide under tiger pounces, catch vines over crocodile pits, jump onto stampeding elephant backs, jump over six-hog herds, avoid jumping piranhas and eel shocks, dodge pineapples from dancing orangutans, collect one gem per level, and slide under spiders and diving bat waves in the moonlit fifth level" className="block aspect-[2/1] w-full" />
        {(hud.phase === 'ready' || ended || hud.paused) && <div className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-emerald-950/75 p-3"><div className="my-auto max-w-md text-center"><h3 className="text-lg font-black sm:text-2xl">{hud.paused ? 'Taking a breather' : ended ? hud.phase === 'victory' ? 'Jungle victory!' : 'Run complete!' : 'Find your jungle rhythm'}</h3><p className="my-2 text-xs sm:text-sm">{ended ? `${hud.bananas} banana coins · ${hud.golden} gold · ${hud.cherries} cherries · ${hud.gems}/${LEVELS.length} gems · ${hud.score} points` : 'Double jump to front flip and dash! Catch a moving vine over wide croc pits; jump again to release or ride to the far bank. Read tiger tells: slide under high pounces, jump low charges, and dive from air hunts. Slide under high-leaping panthers. Double jump onto elephant backs during stampedes. Hog herds have four runners and two random jumpers—jump or bounce over them. At night, slide under spiders and diving bat waves. Watch for piranha leaps and electric water. Slide under pineapples from the dancing orangutan! Time a double jump to reach each level’s high gem for +250 points!'}</p>{hud.paused ? <button onClick={pause} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Resume</button> : ended ? <button onClick={() => { if (saved.current) return; saved.current = true; const s = world.current; onFinish(runnerScore(s), Math.max(1, Math.round(s.elapsed)), { difficulty: s.difficulty, bananas: s.bananas, goldenBananas: s.golden, cherries: s.cherries, gems: s.gems, gemLevels: s.gemCollected, levelsCompleted: s.phase === 'victory' ? LEVELS.length : s.level, hits: s.hits, hippoBounces: s.bounces, elephantBounces: s.elephantBounces, extraLives: Math.floor(s.bananas / 100) }); }} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Save run</button> : <button onClick={start} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Let’s run</button>}</div></div>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); jump(); }} onClick={e => { if (e.detail === 0) jump(); }} className="min-h-14 touch-none select-none rounded-2xl bg-yellow-300 p-3 font-black text-emerald-950 disabled:opacity-40">JUMP <small className="block">Tap again: flip / release vine</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); duck(`pointer-${e.pointerId}`, true); }} onPointerUp={e => duck(`pointer-${e.pointerId}`, false)} onPointerCancel={e => duck(`pointer-${e.pointerId}`, false)} onLostPointerCapture={e => duck(`pointer-${e.pointerId}`, false)} onKeyDown={e => { if (e.key === 'Enter') duck('enter', true); }} onKeyUp={e => { if (e.key === 'Enter') duck('enter', false); }} className="min-h-14 touch-none select-none rounded-2xl bg-emerald-600 p-3 font-black disabled:opacity-40">SLIDE {hud.slide > 0 ? `${hud.slide.toFixed(1)}s` : ''} <small className="block">Fast dash → slow · 1.5s</small></button>
      </div>
      <p className="mt-2 text-center text-xs text-emerald-200">Space / ↑: jump / flip / release vine · ↓: dive / dash (1.5s) · Release before sliding again</p>
    </div>
  </section>;
}
