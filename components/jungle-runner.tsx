"use client";

import { drawInsectGrove, drawInsects, drawReaction } from '@/lib/jungle-insect-art';
import { pantherPaw } from '@/lib/jungle-motion';
import { drawWaterLife, drawOrangutan, drawPineapple } from '@/lib/jungle-water-art';
import { useEffect, useRef, useState } from 'react';
import { RUNNER_DIFFICULTIES, type RunnerDifficulty, GEMS, spiderPosition, slothPosition, airBoost, FLIP_SECONDS, vinePosition, birdHeight, crocodileFrame, hippoFrame, createRunner, dashBoost, duckRunner, FLOOR, forwardDashRunner, heroMove, isAirAttack, jumpRunner, kickRunner, KI_MAX, LEVELS, levelSeconds, PLAYER_X, punchRunner, runnerScore, specialRunner, STRONG_DIVE_SECONDS, travelSpeed, stepRunner, type Runner } from '@/lib/jungle-runner';

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

function barrel(ctx: CanvasRenderingContext2D, x: number, y: number, split = 0) {
  ctx.save(); ctx.translate(x, y);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * split * 28, -split * 8); ctx.rotate(side * split * 0.7);
    ctx.fillStyle = '#985126'; ctx.strokeStyle = '#442314'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-19, -27, 38, 54, 10); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d9a664'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-19, -13); ctx.lineTo(19, -13); ctx.moveTo(-19, 13); ctx.lineTo(19, 13); ctx.stroke();
    ctx.strokeStyle = '#633116'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -25); ctx.lineTo(-8, 25); ctx.moveTo(8, -25); ctx.lineTo(8, 25); ctx.stroke();
    ctx.restore();
  }
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

function coffeeBearArt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number) {
  const jitter = Math.sin(age * 19) * 2;
  ctx.save(); ctx.translate(x, y + jitter); ctx.fillStyle = '#684237'; ctx.strokeStyle = '#2d1b20'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -28, 36, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-22, -66, 12, 0, Math.PI * 2); ctx.arc(22, -66, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9a06f'; ctx.beginPath(); ctx.ellipse(0, -41, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff4d7'; ctx.beginPath(); ctx.arc(-11, -58, 7, 0, Math.PI * 2); ctx.arc(11, -58, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#231820'; ctx.beginPath(); ctx.arc(-11, -58, 3, 0, Math.PI * 2); ctx.arc(11, -58, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8f4ff'; ctx.fillRect(19, -28, 17, 22); ctx.fillStyle = '#60402f'; ctx.fillRect(21, -25, 13, 12);
  ctx.fillStyle = '#fff4b4'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('Zz? ☕', 0, -93); ctx.restore();
}

function slothArt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number) {
  const sway = Math.sin(age * 1.8) * 0.18, blink = Math.sin(age * 1.25) > 0.96;
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
  // Slow, independently swaying arms make the sloth feel heavy on the vine.
  ctx.strokeStyle = '#735244'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (const side of [-1, 1]) { const arm = Math.sin(age * 1.8 + side) * 9; ctx.beginPath(); ctx.moveTo(side * 12, -10); ctx.quadraticCurveTo(side * 28, 4 + arm, side * 19, 23 + arm); ctx.stroke(); }
  ctx.fillStyle = '#8d7562'; ctx.beginPath(); ctx.ellipse(0, 1, 19, 25, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d5c4a5'; ctx.beginPath(); ctx.ellipse(-5, -8, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#352b32'; ctx.beginPath(); ctx.ellipse(-7, -9, 5, blink ? 1 : 7, 0.2, 0, Math.PI * 2); ctx.ellipse(2, -9, 5, blink ? 1 : 7, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#18131a'; if (!blink) { ctx.beginPath(); ctx.arc(-7, -9, 1.5, 0, Math.PI * 2); ctx.arc(2, -9, 1.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#4c3734'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-3, 0, 5, 0.1, Math.PI - 0.1); ctx.stroke(); ctx.restore();
}

function lemmingArt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number) {
  const hop = Math.abs(Math.sin(age * 8)) * -14, step = Math.sin(age * 16) * 5;
  ctx.save(); ctx.translate(x, y + hop); ctx.fillStyle = '#87705c';
  ctx.strokeStyle = '#5b463c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(15, 1); ctx.quadraticCurveTo(33, -5 + step, 34, 7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-16, -5, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#513f36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, 9); ctx.lineTo(-2 + step, 17); ctx.moveTo(8, 9); ctx.lineTo(12 - step, 17); ctx.stroke();
  ctx.fillStyle = '#f3dfb5'; ctx.beginPath(); ctx.ellipse(-20, -2, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#231b20'; ctx.beginPath(); ctx.arc(-19, -8, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function fallbackMonkey(ctx: CanvasRenderingContext2D, frame: number, elapsed: number) {
  const stride = frame === 3 ? 0 : Math.sin(elapsed * 19) * 10;
  ctx.strokeStyle = '#6f3e27'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(22, -51); ctx.quadraticCurveTo(59, -66, 48, -22); ctx.quadraticCurveTo(40, -8, 27, -21); ctx.stroke();
  ctx.strokeStyle = '#4a291e'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-12, -15); ctx.lineTo(-21 + stride, 0); ctx.moveTo(12, -15); ctx.lineTo(20 - stride, 0); ctx.stroke();
  ctx.fillStyle = '#a76539'; ctx.beginPath(); ctx.ellipse(0, -34, 24, 31, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-12, -65, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0c18a'; ctx.beginPath(); ctx.ellipse(-16, -59, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#241713'; ctx.beginPath(); ctx.arc(-22, -65, 2.5, 0, Math.PI * 2); ctx.fill();
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

function emeraldCelebration(ctx: CanvasRenderingContext2D, s: Runner) {
  if (s.phase !== 'victory' || !s.gemCollected.every(Boolean)) return;
  const t = s.celebrationTime;
  ctx.save(); ctx.textAlign = 'center';
  for (let i = 0; i < 18; i++) {
    const angle = i * Math.PI * 2 / 18 + t * 1.4;
    const radius = 125 + Math.sin(t * 3 + i) * 30;
    const x = 400 + Math.cos(angle) * radius, y = 178 + Math.sin(angle) * radius * 0.58;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + t * 2); ctx.fillStyle = i % 2 ? '#bffff0' : '#4cf7ae'; ctx.shadowColor = '#4cf7ae'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#4cf7ae'; ctx.shadowColor = '#c8ffef'; ctx.shadowBlur = 20; ctx.font = 'bold 26px sans-serif'; ctx.fillText('✦ ALL EMERALDS FOUND! ✦', 400, 76);
  ctx.shadowBlur = 0; ctx.fillStyle = '#f4ffe5'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('JUNGLE CROWN CELEBRATION', 400, 101); ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, s: Runner, sprite: HTMLImageElement, fightSprite: HTMLImageElement, predators: HTMLImageElement, wildlife: HTMLImageElement, insects: HTMLImageElement, allySprites: { orangutan: HTMLImageElement; eel: HTMLImageElement; sloth: HTMLImageElement; lemming: HTMLImageElement; scorpion: HTMLImageElement }) {
  const W = 800, H = 400;
  const night = s.level === 4;
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
  if (s.level === 5) drawInsectGrove(ctx, cameraDistance, s.elapsed);
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
    drawWaterLife(ctx, r, cameraDistance, allySprites.eel);
    if (r.vine) {
      for (let i = 1; i < 5; i++) animal(0, Math.floor(s.elapsed * 5 + i) % 4, x + r.width * i / 5, FLOOR + 12, 112, 76, i % 2 === 0);
      const riverSwing = s.swing && 'river' in s.swing && s.swing.river === r ? s.swing : null;
      const tip = vinePosition(r, s.elapsed, riverSwing?.progress);
      ctx.strokeStyle = '#334925'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + r.width / 2, -80); ctx.lineTo(tip.x - cameraDistance, tip.y); ctx.stroke();
      ctx.strokeStyle = '#8dbf4b'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(tip.x - cameraDistance, tip.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 14px sans-serif'; ctx.fillText(riverSwing ? 'JUMP TO RELEASE' : 'JUMP & CATCH THE VINE', riverSwing ? playerX + 130 : x + 70, FLOOR - 115);
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
  for (const o of s.orangutans) drawOrangutan(ctx, o, cameraDistance, allySprites.orangutan);
  for (const p of s.pineapples) {
    drawPineapple(ctx, p.x - cameraDistance, p.y, p.rotation);
    if (p.bounceAmmo && !p.reflected) {
      ctx.fillStyle = '#fff4aa'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('BOUNCE TO STRIKE', p.x - cameraDistance, p.y - 42);
    }
  }
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
    for (let i = 2; i >= 0; i--) if (!herd.knocked?.[i]) elephant(ctx, herd.x + i * 175 - cameraDistance, herd.age + i * 0.4, herd.charging);
    if (herd.warned && herd.x + 350 > s.distance + PLAYER_X) {
      ctx.fillStyle = '#ffebaa'; ctx.fillRect(235, 103, 350, 26); ctx.fillStyle = '#543728'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('STAMPEDE — DOUBLE JUMP ONTO BACKS!', 410, 116);
    }
  }
  for (const spider of s.spiders) {
    const pos = spiderPosition(spider, s.elapsed);
    ctx.strokeStyle = '#d6ddf0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(spider.x - cameraDistance, 25); ctx.lineTo(pos.x - cameraDistance, pos.y); ctx.stroke();
    ctx.save(); if (spider.giant) ctx.scale(1.65, 1.65); spiderArt(ctx, (pos.x - cameraDistance) / (spider.giant ? 1.65 : 1), pos.y / (spider.giant ? 1.65 : 1), s.elapsed + spider.phase); ctx.restore();
    ctx.fillStyle = '#e3eaff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(spider.giant ? 'GIANT SPIDER! SLIDE!' : 'SLIDE UNDER', pos.x - cameraDistance, pos.y - (spider.giant ? 68 : 42));
  }
  for (const bird of s.birds) {
    const x = bird.x - cameraDistance;
    const y = birdHeight(bird, s.elapsed);
    const wingFrame = (bird.releaseLeft ?? 0) > 0 ? 3 : [0, 1, 2, 1][Math.floor(s.elapsed * 10) % 4];
    animal(2, wingFrame, x, y - 40, 78, 70);
    if (!bird.dropped) { if (bird.gift === 'drop') coconut(ctx, x, y + 25); else { ctx.font = '22px sans-serif'; ctx.fillText(bird.gift === 'heart' ? '❤️' : bird.gift === 'star' ? '⭐' : bird.gift === 'fruit' ? '🍍' : '🍒', x, y + 25); } }
  }
  for (const sloth of s.sloths) {
    const pos = slothPosition(sloth), x = pos.x - cameraDistance;
    if (x < -80 || x > 880) continue;
    ctx.strokeStyle = '#735244'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + Math.sin(sloth.age * 1.8) * 8, 0); ctx.quadraticCurveTo(x - 18, pos.y * 0.5, x, pos.y - 20); ctx.stroke();
    if (allySprites.sloth.complete && allySprites.sloth.naturalWidth) {
      ctx.save(); ctx.translate(x, pos.y); ctx.rotate(Math.sin(sloth.age * 1.8) * 0.12);
      ctx.drawImage(allySprites.sloth, -29, -43, 58, 86); ctx.restore();
    } else slothArt(ctx, x, pos.y, sloth.age);
    ctx.fillStyle = '#fff4b4'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('SLOTH GIFT', x, pos.y - 38);
  }
  for (const lemming of s.lemmings) {
    const x = lemming.x - cameraDistance;
    if (x < -80 || x > 880) continue;
    ctx.strokeStyle = '#9e7041'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + Math.sin(lemming.age * 2) * 12, 0); ctx.quadraticCurveTo(x - 20, lemming.y * 0.55, x, lemming.y - 16); ctx.stroke();
    if (allySprites.lemming.complete && allySprites.lemming.naturalWidth) {
      ctx.save(); ctx.translate(x, lemming.y - Math.abs(Math.sin(lemming.age * 8)) * 14);
      ctx.rotate(Math.sin(lemming.age * 8) * 0.08);
      ctx.drawImage(allySprites.lemming, -29, -29, 58, 48); ctx.restore();
    } else lemmingArt(ctx, x, lemming.y, lemming.age);
    ctx.fillStyle = '#fff4b4'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('JUMP: LEMMING SWING', x + 30, lemming.y - 48);
  }
  for (const item of s.items) {
    const x = item.x - cameraDistance;
    if (x < -40 || x > 850) continue;
    const collectible = ['banana', 'golden', 'cherry', 'heart', 'fruit', 'star', 'gem'].includes(item.kind);
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
    const movingCoconut = item.kind === 'rolling' || item.kind === 'bouncing' || item.kind === 'drop' || item.kind === 'boulder';
    if (movingCoconut) {
      ctx.fillStyle = '#153b3540'; ctx.beginPath(); ctx.ellipse(x, FLOOR - 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff6c999'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 27, item.y - 3); ctx.lineTo(x + 43, item.y - 3); ctx.stroke();
    }
    ctx.save(); ctx.translate(x, item.y);
    if (movingCoconut) ctx.rotate(item.rotation ?? 0);
    ctx.font = collectible ? '27px sans-serif' : '38px sans-serif';
    if (collectible) ctx.fillText(item.kind === 'cherry' ? '🍒' : item.kind === 'heart' ? '❤️' : item.kind === 'fruit' ? '🍍' : item.kind === 'star' ? '⭐' : '🍌', 0, 0);
    else if (item.kind === 'barrel') barrel(ctx, 0, 0);
    else if (item.kind === 'boulder') { ctx.fillStyle = '#66717a'; ctx.strokeStyle = '#263541'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#aeb9bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, -13); ctx.lineTo(7, -25); ctx.lineTo(22, -3); ctx.moveTo(-24, 9); ctx.lineTo(5, 23); ctx.stroke(); }
    else if (item.kind === 'cave-spike') { ctx.fillStyle = '#c9d5df'; ctx.strokeStyle = '#465b6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, -35); ctx.lineTo(18, -35); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (item.kind === 'spike-pit') { ctx.fillStyle = '#202d3a'; ctx.fillRect(-105, -8, 210, 19); ctx.fillStyle = '#d9e6ee'; for (let spike = -90; spike <= 90; spike += 24) { ctx.beginPath(); ctx.moveTo(spike, -8); ctx.lineTo(spike + 10, -40); ctx.lineTo(spike + 20, -8); ctx.fill(); } }
    else if (item.kind === 'bear') coffeeBearArt(ctx, 0, 0, s.elapsed);
    else coconut(ctx, 0, 0);
    ctx.restore();
    if (!collectible) {
      const labelY = item.kind === 'drop' ? item.y + 34 : item.y - 33;
      ctx.fillStyle = '#fff'; ctx.fillRect(x - (item.bossAmmo ? 65 : 29), labelY - 10, item.bossAmmo ? 130 : 58, 19);
      ctx.fillStyle = '#174d35'; ctx.font = item.bossAmmo ? 'bold 10px sans-serif' : 'bold 12px sans-serif';
      ctx.fillText(item.bossAmmo ? 'BOUNCE TO STRIKE' : item.kind === 'bear' ? 'COFFEE BEAR! STRIKE!' : item.kind === 'spike-pit' ? 'SPIKE PIT! JUMP!' : item.kind === 'cave-spike' ? 'FALLING SPIKES!' : item.kind === 'boulder' ? 'GIANT BOULDER! DASH!' : item.kind === 'barrel' ? 'DIVE / JUMP' : movingCoconut || ['low', 'drop'].includes(item.kind) ? 'JUMP / DIVE' : item.kind === 'high' ? 'DUCK' : 'RUN', x, labelY);
    }
  }
  for (const crack of s.cracks) {
    ctx.save(); ctx.globalAlpha = 1 - crack.age / 0.75;
    if (crack.kind === 'barrel') barrel(ctx, crack.x - cameraDistance, crack.y + 120 * crack.age ** 2, 0.2 + crack.age * 2);
    else coconut(ctx, crack.x - cameraDistance, crack.y + 120 * crack.age ** 2, crack.age, 0.2 + crack.age * 2);
    ctx.fillStyle = '#fff6de';
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ctx.beginPath(); ctx.arc(crack.x - cameraDistance + Math.cos(a) * crack.age * 110, crack.y + Math.sin(a) * crack.age * 80, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  for (const knockout of s.knockouts) {
    const x = knockout.x - cameraDistance, y = knockout.y - knockout.age * 58;
    if (x < -80 || x > 880) continue;
    ctx.save(); ctx.globalAlpha = 1 - knockout.age / 0.8;
    ctx.fillStyle = '#fff4a6'; ctx.shadowColor = '#ffdf48'; ctx.shadowBlur = 16;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + knockout.age * 5;
      const radius = 12 + knockout.age * 52;
      ctx.beginPath(); ctx.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.font = 'bold 14px sans-serif'; ctx.fillText(`${knockout.label} +25`, x, y - 40); ctx.restore();
  }
  for (const p of s.predators) {
    if (p.kind === 'tiger' && ['waiting', 'warning'].includes(p.state)) continue;
    const x = p.x - cameraDistance;
    if (x < -100 || x > 900) continue;
    if (p.kind === 'panther') {
      panther(ctx, x, p.y, p.age, p.facing, p.state === 'attack', p.state === 'warning');
      ctx.fillStyle = p.state === 'waiting' && !night ? '#172031' : '#fff176'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(p.state === 'waiting' ? 'PANTHER PATROL' : 'HIGH POUNCE! SLIDE!', x, p.y - 53);
      for (let hit = 0; hit < p.hitPoints; hit++) {
        ctx.fillStyle = hit < p.hits ? '#ff7a42' : '#fff0b8';
        ctx.beginPath(); ctx.arc(x - (p.hitPoints - 1) * 8 + hit * 16, p.y - 72, 5, 0, Math.PI * 2); ctx.fill();
      }
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
    for (let hit = 0; hit < p.hitPoints; hit++) {
      ctx.fillStyle = hit < p.hits ? '#ff7a42' : '#fff0b8';
      ctx.beginPath(); ctx.arc(x - (p.hitPoints - 1) * 8 + hit * 16, p.y - height / 2 - 34, 5, 0, Math.PI * 2); ctx.fill();
    }
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
  drawInsects(ctx, s, insects, cameraDistance, allySprites.scorpion);
  const knocked = s.reactionLeft > 0 || s.stun > 0 || s.phase === 'over';
  const grounded = s.y >= FLOOR - 1;
  const pose = heroMove(s);
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
  if (s.strongDiveLeft > 0 && !knocked) {
    ctx.strokeStyle = '#ffe56b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-68 - i * 13, -50 + i * 17); ctx.lineTo(-38 - i * 7, -50 + i * 17); ctx.stroke(); }
  }
  if (isAirAttack(s) && !knocked) {
    ctx.strokeStyle = '#ffed72'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(20, -54, 42, -2.2, 0.9); ctx.stroke();
    ctx.fillStyle = '#fff4a3'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('STRIKE!', -25, -122);
  }
  if (s.specialLeft > 0 && !knocked) {
    ctx.strokeStyle = '#bcf5ff'; ctx.shadowColor = '#7d75ff'; ctx.shadowBlur = 22; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, -52, 62 + Math.sin(s.elapsed * 32) * 6, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#f4e8ff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('KI BURST!', -34, -130);
  }
  if (s.flipLeft > 0 && !knocked) { ctx.translate(0, -46); ctx.rotate((1 - s.flipLeft / FLIP_SECONDS) * Math.PI * 2); ctx.translate(0, 46); }
  else if (!grounded && !knocked) ctx.rotate(Math.max(-0.12, Math.min(0.12, s.vy / 4500)));
  if (s.starPower > 0 && !knocked) { ctx.shadowColor = '#ffe363'; ctx.shadowBlur = 24; }
  else if (s.invincible > 0 && !knocked) ctx.globalAlpha = 0.65 + Math.sin(s.elapsed * 30) * 0.25;
  if (fightSprite.complete && fightSprite.naturalWidth && pose !== 'run' && !knocked && s.phase === 'playing') {
    // The supplied fight sheet provides punch, kick, and dive poses. Running
    // stays on the original runner sheet, whose two non-mirrored run frames
    // were authored as a matched left/right stride cycle.
    const fightFrames = {
      run: [26, 142, 340, 390, 100, 114],
      punch: [404, 145, 360, 385, 112, 116],
      kick: [770, 120, 355, 410, 125, 124],
      dive: [1122, 210, 395, 285, 152, 110],
    } as const;
    const [sx, sy, sw, sh, dw, dh] = fightFrames[pose];
    ctx.drawImage(fightSprite, sx, sy, sw, sh, -dw / 2, -dh + 8, dw, dh);
  } else if (sprite.complete && sprite.naturalWidth) {
    // This sheet is not a uniform grid: the slide extends across an old cell
    // boundary. Explicit artwork bounds prevent neighboring tails/feet bleeding.
    const bounds = [[8, 180, 330, 410], [375, 180, 300, 410], [716, 130, 357, 460], [1058, 310, 406, 280], [1508, 135, 311, 460], [1827, 135, 333, 455]][frame];
    const [sx, sy, sw, sh] = bounds;
    const scale = sprite.naturalWidth / 2172;
    const dw = frame === 3 ? 108 : 94;
    const dh = frame === 3 ? 63 : 108;
    if (s.reactionLeft > 0 && s.reaction === 'flatten') ctx.scale(1.5, 0.28 + Math.max(0, 0.3 - s.reactionLeft) * 2.4);
    if (s.reactionLeft > 0 && s.reaction === 'zap') ctx.rotate(Math.sin(s.reactionLeft * 100) * 0.12);
    ctx.save();
    if (frame === 2) {
      // The jump hand and neighboring slide tail overlap in X, but not Y.
      const px = (x: number) => -dw / 2 + (x - sx) / sw * dw;
      const py = (y: number) => -dh + 8 + (y - sy) / sh * dh;
      ctx.beginPath(); ctx.moveTo(px(716), py(130)); ctx.lineTo(px(1073), py(130)); ctx.lineTo(px(1073), py(345)); ctx.lineTo(px(1045), py(345)); ctx.lineTo(px(1045), py(590)); ctx.lineTo(px(716), py(590)); ctx.closePath(); ctx.clip();
    }
    // Each pose comes directly from the corrected sprite sheet. In particular,
    // do not mirror individual limbs between the two authored running frames.
    if (s.reaction === 'snap' && s.reactionLeft > 0) {
      // A bloodless cartoon split springs back together as the reaction ends.
      const gap = Math.sin(Math.min(1, (0.9 - s.reactionLeft) / 0.9) * Math.PI) * 18;
      for (const side of [-1, 1]) {
        ctx.save(); ctx.translate(side * gap, side < 0 ? -gap : 0);
        ctx.beginPath(); ctx.rect(-dw / 2, side < 0 ? -dh + 8 : -dh / 2 + 8, dw, dh / 2); ctx.clip();
        ctx.drawImage(sprite, sx * scale, sy * scale, sw * scale, sh * scale, -dw / 2, -dh + 8, dw, dh); ctx.restore();
      }
    } else ctx.drawImage(sprite, sx * scale, sy * scale, sw * scale, sh * scale, -dw / 2, -dh + 8, dw, dh);
    ctx.restore();
  } else fallbackMonkey(ctx, frame, s.elapsed);
  ctx.restore();
  drawReaction(ctx, s, playerX);
  emeraldCelebration(ctx, s);
  if (s.swing && 'river' in s.swing) {
    const tip = vinePosition(s.swing.river, s.elapsed, s.swing.progress);
    ctx.strokeStyle = '#713a1d'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(playerX + 8, s.y - 40); ctx.lineTo(tip.x - cameraDistance, tip.y); ctx.stroke();
    ctx.fillStyle = '#efb568'; ctx.beginPath(); ctx.arc(tip.x - cameraDistance, tip.y, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (s.swing && 'lemming' in s.swing) {
    const guideX = s.swing.lemming.x - cameraDistance;
    ctx.strokeStyle = '#9e7041'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(guideX, 0); ctx.quadraticCurveTo(guideX + 65, 85, playerX + 8, s.y - 40); ctx.stroke();
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
  if (s.starPower > 0) {
    ctx.fillStyle = '#4d3906'; ctx.fillRect(287, 10, 226, 29);
    ctx.fillStyle = '#ffe363'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`⭐ KNOCKOUT POWER ${s.starPower.toFixed(1)}s`, 400, 25);
  }
}

export function JungleVineSwing({ onExit, onFinish }: {
  onExit: () => void;
  onFinish: (score: number, duration: number, metadata: Record<string, unknown>) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef(createRunner());
  const [difficulty, setDifficulty] = useState<RunnerDifficulty>('medium');
  const [hud, setHud] = useState({ phase: 'ready', lives: 3, bananas: 0, seconds: 60, paused: false, level: 0, score: 0, golden: 0, cherries: 0, gems: 0, levelGem: false, slide: 0, attack: 0, move: 'run', ki: 0, special: 0, speed: 1 });
  const paused = useRef(false);
  const saved = useRef(false);
  const duckSources = useRef(new Set<string>());
  const publish = () => {
    const s = world.current;
    setHud({ phase: s.phase, lives: s.lives, bananas: s.bananas, seconds: Math.max(0, Math.ceil((s.level + 1) * levelSeconds(s) - s.elapsed)), paused: paused.current, level: s.level, score: runnerScore(s), golden: s.golden, cherries: s.cherries, gems: s.gems, levelGem: s.gemCollected[s.level], slide: s.slideLeft, attack: isAirAttack(s) ? s.attackLeft : 0, move: heroMove(s), ki: s.ki, special: s.specialLeft, speed: travelSpeed(s) / LEVELS[0].speed });
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
  function punch() { if (!paused.current) punchRunner(world.current); }
  function kick() { if (!paused.current) kickRunner(world.current); }
  function forwardDash() { if (!paused.current) forwardDashRunner(world.current); }
  function special() { if (!paused.current) specialRunner(world.current); }
  function pause() { paused.current = !paused.current; duckSources.current.clear(); duckRunner(world.current, false); publish(); }
  function start() { world.current = createRunner(difficulty); world.current.phase = 'playing'; paused.current = false; saved.current = false; duckSources.current.clear(); publish(); }

  useEffect(() => {
    const sprite = new Image(); sprite.src = '/games/jungle-monkey-runner-sprites-v2.png';
    const fightSprite = new Image(); fightSprite.src = '/games/monkey-fight-sprites.png';
    const predators = new Image(); predators.src = '/games/jungle-predators-v1.png';
    const insects = new Image(); insects.src = '/games/jungle-insects-v1.png';
    const wildlife = new Image(); wildlife.src = '/games/jungle-wildlife-v1.png';
    const allySprites = {
      orangutan: new Image(), eel: new Image(), sloth: new Image(), lemming: new Image(), scorpion: new Image(),
    };
    allySprites.orangutan.src = '/games/jungle-orangutan-v2.png';
    allySprites.scorpion.src = '/games/jungle-scorpion-king-v1.png';
    allySprites.eel.src = '/games/jungle-electric-eel-v2.png';
    allySprites.sloth.src = '/games/jungle-sloth-v2.png';
    allySprites.lemming.src = '/games/jungle-lemming-v2.png';
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
      paint(ctx, world.current, sprite, fightSprite, predators, wildlife, insects, allySprites);
      if (now - lastHud > 100) { publish(); lastHud = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowRight', 'KeyD', 'KeyJ', 'KeyK', 'KeyE'].includes(e.code)) {
        e.preventDefault();
        if (e.repeat) return;
        if (['ArrowDown', 'KeyS'].includes(e.code)) duck(e.code, true); else if (['ArrowRight', 'KeyD'].includes(e.code)) forwardDash(); else if (e.code === 'KeyJ') punch(); else if (e.code === 'KeyK') kick(); else if (e.code === 'KeyE') special(); else jump();
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
      <p className="mb-2 text-xs font-bold text-yellow-200">{RUNNER_DIFFICULTIES[difficulty].label} · Level {hud.level + 1}/{LEVELS.length} · {LEVELS[hud.level].name} · {hud.move.toUpperCase()} · {hud.speed.toFixed(1)}× pace · ⭐ {hud.golden} gold · 🍒 {hud.cherries} · 💎 {hud.gems}/{LEVELS.length} · {GEMS[hud.level].name}: {hud.levelGem ? "collected" : "find it!"}</p>
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-cyan-300/50 bg-cyan-950/50 px-3 py-2">
        <span className="shrink-0 text-xs font-black tracking-wide text-cyan-100">KI {Math.round(hud.ki)}%</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full border border-cyan-100/70 bg-slate-950">
          <div className={`h-full rounded-full transition-all ${hud.ki >= KI_MAX ? 'bg-gradient-to-r from-cyan-300 via-white to-violet-300 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-violet-400'}`} style={{ width: `${hud.ki}%` }} />
        </div>
        <span className="text-xs font-black text-cyan-100">{hud.special > 0 ? 'BURST!' : hud.ki >= KI_MAX ? 'E: READY' : 'COUNTER TO CHARGE'}</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-700">
        <canvas ref={canvas} width={800} height={400} aria-label="Jungle runner: flip over coconuts and panthers, slide under tiger pounces, catch vines over crocodile pits, and jump to catch lemming swings over hog herds. Sloths lower hearts, fruit, and rare stars that grant ten seconds of invincibility; birds can also drop these helpful gifts." className="block aspect-[2/1] w-full" />
        {(hud.phase === 'ready' || ended || hud.paused) && <div className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-emerald-950/75 p-3"><div className="my-auto max-w-md text-center"><h3 className="text-lg font-black sm:text-2xl">{hud.paused ? 'Taking a breather' : ended ? hud.phase === 'victory' ? hud.gems === LEVELS.length ? 'Emerald Crown Victory!' : 'Jungle victory!' : 'Run complete!' : 'Find your jungle rhythm'}</h3><p className="my-2 text-xs sm:text-sm">{ended ? `${hud.gems === LEVELS.length && hud.phase === 'victory' ? '✦ All special emeralds captured — the Jungle Crown is yours! ✦ ' : ''}${hud.bananas} banana coins · ${hud.golden} gold · ${hud.cherries} cherries · ${hud.gems}/${LEVELS.length} gems · ${hud.score} points` : 'Double jump to front flip and dash! Sloths slide down vines with a heart (+1 life), fruit (+5 coins), or a rare star (10 seconds of invincibility); friendly birds can drop those gifts too. Jump into a hopping lemming’s vine to swing safely over hog herds. Catch moving vines over wide croc pits; jump again to release or ride to the far bank. Read tiger tells: slide under high pounces, jump low charges, and dive from air hunts. At night, slide under spiders and diving bat waves. Slide under pineapples from the dancing orangutan! In the Insect Grove, bounce on caterpillars in mud pits. Double jump over the Scorpion King’s claws or slide under his electric tail whip!'}</p>{hud.paused ? <button onClick={pause} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Resume</button> : ended ? <button onClick={() => { if (saved.current) return; saved.current = true; const s = world.current; onFinish(runnerScore(s), Math.max(1, Math.round(s.elapsed)), { difficulty: s.difficulty, bananas: s.bananas, goldenBananas: s.golden, cherries: s.cherries, gems: s.gems, gemLevels: s.gemCollected, levelsCompleted: s.phase === 'victory' ? LEVELS.length : s.level, hits: s.hits, hippoBounces: s.bounces, elephantBounces: s.elephantBounces, caterpillarBounces: s.caterpillarBounces, extraLives: Math.floor(s.bananas / 100) }); }} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Save run</button> : <button onClick={start} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Let’s run</button>}</div></div>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); jump(); }} onClick={e => { if (e.detail === 0) jump(); }} className="min-h-14 touch-none select-none rounded-2xl bg-yellow-300 p-3 font-black text-emerald-950 disabled:opacity-40">JUMP <small className="block">Tap again: flip / release vine</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); duck(`pointer-${e.pointerId}`, true); }} onPointerUp={e => duck(`pointer-${e.pointerId}`, false)} onPointerCancel={e => duck(`pointer-${e.pointerId}`, false)} onLostPointerCapture={e => duck(`pointer-${e.pointerId}`, false)} onKeyDown={e => { if (e.key === 'Enter') duck('enter', true); }} onKeyUp={e => { if (e.key === 'Enter') duck('enter', false); }} className="min-h-14 touch-none select-none rounded-2xl bg-emerald-600 p-3 font-black disabled:opacity-40">{hud.attack > 0 ? `STRIKE ${hud.attack.toFixed(2)}s` : `SLIDE ${hud.slide > 0 ? `${hud.slide.toFixed(1)}s` : ''}`} <small className="block">In air: 0.42s dive strike</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); punch(); }} onClick={e => { if (e.detail === 0) punch(); }} className="min-h-14 touch-none select-none rounded-2xl bg-orange-400 p-3 font-black text-orange-950 disabled:opacity-40">PUNCH <small className="block">J · close strike</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); kick(); }} onClick={e => { if (e.detail === 0) kick(); }} className="min-h-14 touch-none select-none rounded-2xl bg-rose-400 p-3 font-black text-rose-950 disabled:opacity-40">KICK <small className="block">K · longer reach</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); forwardDash(); }} onClick={e => { if (e.detail === 0) forwardDash(); }} className="min-h-14 touch-none select-none rounded-2xl bg-sky-400 p-3 font-black text-sky-950 disabled:opacity-40">FORWARD DASH <small className="block">→ · counter charge</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused || hud.ki < KI_MAX} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); special(); }} onClick={e => { if (e.detail === 0) special(); }} className="min-h-14 touch-none select-none rounded-2xl bg-violet-400 p-3 font-black text-violet-950 disabled:opacity-40">KI BURST <small className="block">E · full meter</small></button>
      </div>
      <p className="mt-2 text-center text-xs text-emerald-200">Run is automatic · Space / ↑: jump / flip · ↓: slide dash · →: forward dash · J: punch · K: kick · E: Ki Burst. Punch, kick, and dash can counter pineapples and foes; each counter charges Ki.</p>
    </div>
  </section>;
}
