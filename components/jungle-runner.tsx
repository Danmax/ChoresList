"use client";

import { useEffect, useRef, useState } from 'react';
import { createRunner, duckRunner, FLOOR, jumpRunner, PLAYER_X, stepRunner, type Runner } from '@/lib/jungle-runner';

function paint(ctx: CanvasRenderingContext2D, s: Runner, sprite: HTMLImageElement) {
  const W = 800, H = 400;
  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#8de3e5'); sky.addColorStop(1, '#ecf8b4');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff5b6'; ctx.beginPath(); ctx.arc(650, 65, 38, 0, Math.PI * 2); ctx.fill();
  // Three independent speeds create depth without moving the collision plane.
  for (let layer = 0; layer < 3; layer++) {
    const spacing = [240, 190, 330][layer];
    const offset = (s.distance * [0.12, 0.35, 0.65][layer]) % spacing;
    for (let i = -1; i < 6; i++) {
      const x = i * spacing - offset;
      if (layer === 0) {
        ctx.fillStyle = '#72bcb0'; ctx.beginPath(); ctx.moveTo(x - 130, FLOOR); ctx.quadraticCurveTo(x + 100, -5, x + 290, FLOOR); ctx.fill();
      } else {
        const top = layer === 1 ? 105 : 25;
        ctx.fillStyle = layer === 1 ? '#55936b' : '#337453';
        ctx.fillRect(x + 60, top, layer === 1 ? 18 : 30, FLOOR - top);
        ctx.fillStyle = layer === 1 ? '#69ad78' : '#24805d';
        for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x + 35 + j * 33, top, 54, 36, -0.3, 0, Math.PI * 2); ctx.fill(); }
        if (layer === 2) { ctx.strokeStyle = '#548e42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 110, top); ctx.quadraticCurveTo(x + 80, 125, x + 125, 175); ctx.stroke(); }
      }
    }
  }
  ctx.fillStyle = '#956337'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#8bc34b'; ctx.fillRect(0, FLOOR, W, 9);
  ctx.fillStyle = '#bc884b';
  for (let i = -1; i < 24; i++) ctx.fillRect(i * 45 - s.distance % 45, FLOOR + 30 + i % 3 * 10, 18, 5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const r of s.rivers) {
    const x = r.x - s.distance;
    ctx.fillStyle = '#166879'; ctx.fillRect(x, FLOOR, r.width, 90);
    ctx.fillStyle = '#69d9db'; ctx.fillRect(x, FLOOR + 40, r.width, 50);
    ctx.fillStyle = '#5b3f30'; ctx.fillRect(x - 6, FLOOR, 6, 90); ctx.fillRect(x + r.width, FLOOR, 6, 90);
    ctx.font = '38px sans-serif'; ctx.fillText('🐊', x + 35, 372); ctx.fillText('🐊', x + r.width - 35, 372);
    const hx = x + r.width / 2;
    ctx.fillStyle = '#9284a4'; ctx.beginPath(); ctx.ellipse(hx, FLOOR + 8, 44, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '58px sans-serif'; ctx.fillText('🦛', hx, FLOOR + 5);
    ctx.fillStyle = '#fef08a'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('BOUNCE', hx, FLOOR - 33);
  }
  for (const item of s.items) {
    const x = item.x - s.distance;
    if (x < -40 || x > 850) continue;
    ctx.font = item.kind === 'banana' ? '27px sans-serif' : '38px sans-serif';
    ctx.fillText(item.kind === 'banana' ? '🍌' : '🥥', x, item.y);
    if (item.kind !== 'banana') {
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 29, item.y - 43, 58, 19);
      ctx.fillStyle = '#174d35'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(item.kind === 'low' ? 'JUMP' : item.kind === 'high' ? 'DUCK' : 'RUN', x, item.y - 33);
    }
  }
  const knocked = s.stun > 0 || s.phase === 'over';
  const grounded = s.y >= FLOOR - 1;
  const frame = knocked ? 4 : s.phase === 'victory' ? 5 : s.duck && grounded ? 3 : !grounded ? 2 : Math.floor(s.elapsed * 9) % 2;
  ctx.save();
  const bob = grounded && !s.duck && s.phase === 'playing' && !knocked ? Math.sin(s.elapsed * 18 * Math.PI) * 2 : 0;
  ctx.translate(PLAYER_X + (knocked ? Math.sin(s.stun * 70) * 6 : 0), s.y + bob);
  if (!grounded && !knocked) ctx.rotate(Math.max(-0.12, Math.min(0.12, s.vy / 4500)));
  if (s.invincible > 0 && !knocked) ctx.globalAlpha = 0.65 + Math.sin(s.elapsed * 30) * 0.25;
  if (sprite.complete && sprite.naturalWidth) {
    const cell = sprite.naturalWidth / 6;
    // The existing sheet has transparent headroom; crop each cell to its artwork.
    ctx.drawImage(sprite, frame * cell, 110, cell, 490, -47, -100, 94, 108);
  }
  ctx.restore();
  if (knocked) {
    ctx.font = '24px sans-serif';
    for (let i = 0; i < 3; i++) { const a = s.elapsed * 8 + i * Math.PI * 2 / 3; ctx.fillText('⭐', PLAYER_X + Math.cos(a) * 35, s.y - 102 + Math.sin(a) * 8); }
  }
  // Foreground grasses scroll fastest and stay below the playable area.
  ctx.fillStyle = '#225939';
  for (let i = -1; i < 14; i++) {
    const x = i * 80 - (s.distance * 1.2) % 80;
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
  const [hud, setHud] = useState({ phase: 'ready', lives: 3, bananas: 0, seconds: 60, paused: false });
  const paused = useRef(false);
  const saved = useRef(false);
  const duckSources = useRef(new Set<string>());
  const publish = () => {
    const s = world.current;
    setHud({ phase: s.phase, lives: s.lives, bananas: s.bananas, seconds: Math.max(0, Math.ceil(60 - s.elapsed)), paused: paused.current });
  };
  function jump() { if (!paused.current) { duckSources.current.clear(); jumpRunner(world.current); } }
  function duck(source: string, down: boolean) {
    if (down) duckSources.current.add(source); else duckSources.current.delete(source);
    duckRunner(world.current, duckSources.current.size > 0 && !paused.current);
  }
  function pause() { paused.current = !paused.current; duckSources.current.clear(); duckRunner(world.current, false); publish(); }
  function start() { world.current = createRunner(); world.current.phase = 'playing'; paused.current = false; saved.current = false; duckSources.current.clear(); publish(); }

  useEffect(() => {
    const sprite = new Image(); sprite.src = '/games/jungle-monkey-runner-sprites-v2.png';
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
      paint(ctx, world.current, sprite);
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
      <div className="mb-2 flex justify-between gap-2 text-sm font-black"><span>🍌 {hud.bananas} <small className="block text-yellow-200">{hud.bananas % 100}/100 → +1 life</small></span><span>❤️ {hud.lives} lives</span><span>{hud.seconds}s · {hud.bananas * 10} pts</span></div>
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-700">
        <canvas ref={canvas} width={800} height={400} aria-label="Jungle runner: jump low coconuts, duck middle coconuts, run under overhead coconuts, bounce on hippos across rivers" className="block aspect-[2/1] w-full" />
        {(hud.phase === 'ready' || ended || hud.paused) && <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/75 p-3"><div className="max-w-md text-center"><h3 className="text-lg font-black sm:text-2xl">{hud.paused ? 'Taking a breather' : ended ? hud.phase === 'victory' ? 'Jungle victory!' : 'Run complete!' : 'Find your jungle rhythm'}</h3><p className="my-2 text-xs sm:text-sm">{ended ? `${hud.bananas} bananas · ${hud.bananas * 10} points` : 'Tap Jump twice for a double jump. Hold Duck to dive, then release to run. Land on a hippo to bounce over the river!'}</p>{hud.paused ? <button onClick={pause} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Resume</button> : ended ? <button onClick={() => { if (saved.current) return; saved.current = true; const s = world.current; onFinish(s.bananas * 10, Math.max(1, Math.round(s.elapsed)), { bananas: s.bananas, hits: s.hits, hippoBounces: s.bounces, extraLives: Math.floor(s.bananas / 100) }); }} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Save run</button> : <button onClick={start} className="rounded-xl bg-yellow-300 px-5 py-2 font-black text-emerald-950">Let’s run</button>}</div></div>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); jump(); }} onClick={e => { if (e.detail === 0) jump(); }} className="min-h-14 touch-none select-none rounded-2xl bg-yellow-300 p-3 font-black text-emerald-950 disabled:opacity-40">JUMP <small className="block">Tap again: double jump</small></button>
        <button disabled={hud.phase !== 'playing' || hud.paused} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); duck(`pointer-${e.pointerId}`, true); }} onPointerUp={e => duck(`pointer-${e.pointerId}`, false)} onPointerCancel={e => duck(`pointer-${e.pointerId}`, false)} onLostPointerCapture={e => duck(`pointer-${e.pointerId}`, false)} onKeyDown={e => { if (e.key === 'Enter') duck('enter', true); }} onKeyUp={e => { if (e.key === 'Enter') duck('enter', false); }} className="min-h-14 touch-none select-none rounded-2xl bg-emerald-600 p-3 font-black disabled:opacity-40">HOLD DUCK <small className="block">Cancel jump · release to run</small></button>
      </div>
      <p className="mt-2 text-center text-xs text-emerald-200">Space / ↑: jump twice · Hold ↓: dive / duck · Release: run</p>
    </div>
  </section>;
}
