"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Pause, Play, Truck } from "lucide-react";
import { farmHayfield, type FarmState } from "@/lib/sunny-farm";
import { driveHayfield, HAY_BUNDLES, HAY_CELL_COUNT, HAY_DEPOT, HAY_FIELD, HAY_TRUCK_CAPACITY, HAY_WORLD, hayfieldProgress, type HayCommand, type HayDirection, type HayfieldState } from "@/lib/sunny-farm-hayfield";
import styles from "./sunny-farm-hayfield.module.css";

export type HayDriveResult = { farm: FarmState; reset?: boolean; retry?: boolean };
export type HayfieldHandle = { save: () => Promise<boolean> };
const STEP_MS = 115;
const keyDirections: Record<string, HayDirection> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };

export const HayfieldGame = forwardRef<HayfieldHandle, { farm: FarmState; onDrive: (commands: HayCommand[]) => Promise<HayDriveResult | null> }>(function HayfieldGame({ farm, onDrive }, ref) {
  const [field, setField] = useState(() => farmHayfield(farm));
  const model = useRef(field);
  const pending = useRef<HayCommand[]>([]);
  const saving = useRef<Promise<boolean> | null>(null);
  const failed = useRef(false);
  const callbacks = useRef({ onDrive }); callbacks.current = { onDrive };
  const root = useRef<HTMLDivElement>(null);
  const board = useRef<SVGSVGElement>(null);
  const held = useRef<HayDirection[]>([]);
  const destination = useRef<{ x: number; y: number } | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "pending" | "error">("saved");
  const [changed, setChanged] = useState(false);
  const mounted = useRef(true);
  const progress = hayfieldProgress(field);
  function update(next: HayfieldState) { model.current = next; if (mounted.current) setField(next); }
  function stop() { held.current = []; destination.current = null; }
  function pause(value: boolean) { stop(); pausedRef.current = value; setPaused(value); }
  function move(command: HayCommand) {
    if (pausedRef.current || failed.current || pending.current.length >= 96 || hayfieldProgress(model.current).complete) return;
    const next = driveHayfield(model.current, [command]);
    if (JSON.stringify(next) === JSON.stringify(model.current)) return;
    pending.current.push(command); update(next); setChanged(true); setSaveState("pending");
  }
  // Only one request is in flight. New steering continues locally and is replayed
  // over each server acknowledgement; a stale tab resets to authoritative state.
  function flush(): Promise<boolean> {
    if (saving.current) return saving.current;
    if (!pending.current.length) return Promise.resolve(true);
    failed.current = false;
    const request = (async () => {
      while (pending.current.length) {
        const batch = pending.current.splice(0, 32);
        if (mounted.current) setSaveState("saving");
        const result = await callbacks.current.onDrive(batch);
        if (!result || result.retry) {
          pending.current.unshift(...batch); failed.current = true; stop();
          if (mounted.current) setSaveState("error");
          return false;
        }
        if (result.reset) { pending.current = []; stop(); }
        update(pending.current.reduce((state, command) => driveHayfield(state, [command]), farmHayfield(result.farm)));
      }
      if (mounted.current) { setChanged(false); setSaveState("saved"); }
      return true;
    })();
    saving.current = request;
    void request.finally(() => { saving.current = null; });
    return request;
  }
  const runtime = useRef({ move, flush }); runtime.current = { move, flush };
  useImperativeHandle(ref, () => ({ save: async () => { stop(); pausedRef.current = true; const ok = await runtime.current.flush(); if (!ok) pausedRef.current = false; return ok; } }), []);
  useEffect(() => {
    mounted.current = true;
    const drive = window.setInterval(() => {
      if (pausedRef.current) return;
      const target = destination.current, current = model.current;
      const direction = held.current.at(-1) ?? (target ? target.x >= 21 && current.y <= 2 ? "down" : target.x !== current.x ? target.x > current.x ? "right" : "left" : target.y !== current.y ? target.y > current.y ? "down" : "up" : null : null);
      if (direction) runtime.current.move(direction);
      else destination.current = null;
    }, STEP_MS);
    const autosave = window.setInterval(() => { if (pending.current.length && !failed.current) void runtime.current.flush(); }, 900);
    const cancel = () => { stop(); };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", cancel);
    return () => { mounted.current = false; stop(); void runtime.current.flush(); window.clearInterval(drive); window.clearInterval(autosave); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, []);
  function point(event: React.PointerEvent<SVGSVGElement>) {
    if (pausedRef.current || progress.complete) return;
    const matrix = board.current?.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = Math.max(0, Math.min(HAY_WORLD.width - 1, Math.round(p.x)));
    destination.current = { x, y: Math.max(x >= 21 ? 3 : 0, Math.min(HAY_WORLD.height - 1, Math.round(p.y))) };
    held.current = [];
    board.current?.focus({ preventScroll: true });
  }
  const complete = hayfieldProgress(farmHayfield(farm)).complete;
  return <div ref={root} className={styles.game} aria-label="Hayfield driving game" onKeyDown={event => {
    const direction = keyDirections[event.key] ?? keyDirections[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); if (!event.repeat && !pausedRef.current) { destination.current = null; held.current = [...held.current.filter(d => d !== direction), direction]; move(direction); } }
    else if (event.key === "Escape") { stop(); }
  }} onKeyUp={event => { const direction = keyDirections[event.key] ?? keyDirections[event.key.toLowerCase()]; if (direction) { event.preventDefault(); held.current = held.current.filter(d => d !== direction); } }}>
    <div className={styles.dashboard} role="group" aria-label="Hayfield progress">
      <div><span className={styles.kicker}>Mow · bundle · deliver</span><strong>{complete ? "A barn full of sunshine!" : field.vehicle === "tractor" ? "Make a clean sweep" : "Bring the hay home"}</strong></div>
      <div className={styles.meters}><div><span>Mowed <b>{progress.percent}%</b></span><div role="progressbar" aria-label="Hayfield mowed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} className={styles.meter}><i style={{ width: `${progress.percent}%` }} /></div></div><span className={styles.delivery}><Truck size={17} /> <b>{field.delivered.length}/9</b> delivered</span></div>
    </div>
    <div className={styles.viewport}>
      <svg ref={board} viewBox="-1 -1 26 18" preserveAspectRatio="xMidYMid meet" className={styles.world} aria-label="Hayfield activity" aria-describedby="hayfield-directions" role="group" tabIndex={0} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); point(event); }} onPointerMove={event => { if (event.buttons) point(event); }} onPointerCancel={stop}>
        <HayfieldWorld field={field} />
      </svg>
      {paused && <div className={styles.overlay}><strong>Parked for a little break</strong><button type="button" onClick={() => pause(false)}><Play size={17} /> Keep driving</button></div>}
      {complete && <div className={styles.finished}><Check size={20} /><div><strong>Happy & cared for!</strong><span>100% mowed. All 9 bundles delivered.</span></div></div>}
    </div>
    <div className={styles.controls} data-tool-tray>
      <div className={styles.vehicleInfo}>
        <strong>{field.vehicle === "tractor" ? "🚜 Tractor + mower" : "🛻 Pickup truck"}</strong>
        <span>{field.vehicle === "tractor" ? `${progress.bundles.length}/9 bundles made` : `Truck bed: ${progress.cargo.length}/${HAY_TRUCK_CAPACITY}`}</span>
        {field.vehicle === "tractor" && <button type="button" disabled={progress.percent < 100 || paused} onClick={() => { move("truck"); void flush(); }}><Truck size={16} /> Drive pickup truck</button>}
        {field.vehicle === "truck" && !complete && <span className={styles.loadHint}>{progress.cargo.length === HAY_TRUCK_CAPACITY ? "Truck full! Drive to the barn bay." : progress.cargo.length ? "Collect more, or unload at the barn." : "Drive over bundles to load them."}</span>}
      </div>
      <div className={styles.steering} role="group" aria-label="Driving controls">
        {(["up", "left", "down", "right"] as HayDirection[]).map(direction => {
          const Icon = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight }[direction];
          return <button key={direction} type="button" data-direction={direction} aria-label={`Drive ${direction}`} disabled={paused || complete} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); destination.current = null; held.current = [direction]; move(direction); }} onPointerUp={() => { held.current = []; }} onPointerCancel={() => { held.current = []; }} onLostPointerCapture={() => { held.current = []; }} onClick={event => { if (event.detail === 0) move(direction); }}><Icon size={21} /></button>;
        })}
      </div>
      <div className={styles.parkControls}><button type="button" disabled={complete} aria-label={paused ? "Resume driving" : "Pause driving"} onClick={() => { pause(!paused); void flush(); }}>{paused ? <Play size={17} /> : <Pause size={17} />}</button><span aria-live="polite" className={styles.saveState}>{saveState === "error" ? <button type="button" onClick={() => void flush()}>Retry save</button> : saveState === "saving" ? "Saving…" : changed ? "Driving…" : "✓ Saved"}</span></div>
    </div>
    <p id="hayfield-directions" className={styles.instructions}>{field.vehicle === "tractor" ? "Drive over every golden patch. Cut sections turn into hay bundles." : "Load up to 3 bundles, then drive to the marked barn bay to unload."} <span>Arrow keys / WASD · hold the buttons · tap a spot to drive there.</span></p>
  </div>;
});

function Bale({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><ellipse cx="0" cy=".25" rx=".48" ry=".25" fill="#536830" opacity=".3"/><rect x="-.48" y="-.32" width=".96" height=".64" rx=".15" fill="#edbe50" stroke="#a87b2f" strokeWidth=".07"/><path d="M-.27-.31v.62M.27-.31v.62" stroke="#966b34" strokeWidth=".07"/><path d="M-.18-.15h.36m-.36.17h.36m-.36.17h.36" stroke="#ffdc80" strokeWidth=".05"/></g>;
}
function Vehicle({ field }: { field: HayfieldState }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[field.facing];
  const truck = field.vehicle === "truck", cargo = hayfieldProgress(field).cargo.length;
  return <g className={styles.vehicle} data-vehicle={field.vehicle} data-x={field.x} data-y={field.y} style={{ transform: `translate(${field.x}px, ${field.y}px)` }}>
    <ellipse cx=".12" cy=".3" rx=".75" ry=".8" fill="#35492b" opacity=".25"/>
    <g transform={`rotate(${rotation})`}>
      {truck ? <><rect x="-.62" y="-.68" width="1.24" height="1.9" rx=".18" fill="#26557a" stroke="#153850" strokeWidth=".08"/><path d="M-.64-.48h-.16v.45h.16m1.28-.45h.16v.45H.64M-.64.67h-.16v.45h.16m1.28-.45h.16v.45H.64" fill="#293938"/><rect x="-.5" y="-.56" width="1" height=".77" rx=".14" fill="#66b6d5"/><path d="M-.43-.51H.43l-.08.32h-.7z" fill="#d1eef0"/><rect x="-.47" y=".36" width=".94" height=".72" rx=".07" fill="#b17d49" stroke="#1c4764" strokeWidth=".08"/>{Array.from({ length: cargo }, (_, i) => <g key={i} transform={`translate(${i === 0 ? 0 : i === 1 ? -.23 : .23} ${i === 0 ? .55 : .84}) scale(.42)`}><Bale x={0} y={0}/></g>)}<path d="M-.43-.66h.22m.42 0h.22" stroke="#ffeac1" strokeWidth=".13"/></> : <><rect x="-.91" y=".88" width="1.82" height=".65" rx=".15" fill="#d9a335" stroke="#7a6934" strokeWidth=".08"/><path d="M-.76 1.02H.76M-.76 1.2H.76M-.65 1.52v.2m.32-.2v.2m.33-.2v.2m.33-.2v.2m.32-.2v.2" stroke="#ffe692" strokeWidth=".08"/><rect x="-.44" y="-.85" width=".88" height="1.89" rx=".18" fill="#5e993f" stroke="#365f31" strokeWidth=".08"/><rect x="-.7" y=".24" width=".33" height=".86" rx=".1" fill="#2e3a31"/><rect x=".37" y=".24" width=".33" height=".86" rx=".1" fill="#2e3a31"/><rect x="-.63" y="-.68" width=".23" height=".48" rx=".08" fill="#2e3a31"/><rect x=".4" y="-.68" width=".23" height=".48" rx=".08" fill="#2e3a31"/><rect x="-.45" y="-.02" width=".9" height=".75" rx=".12" fill="#ecdb9b" stroke="#456d33" strokeWidth=".07"/><rect x="-.34" y=".05" width=".68" height=".43" rx=".06" fill="#a4d2c5"/><path d="M-.28-.6h.56m-.56.14h.56" stroke="#37552e" strokeWidth=".08"/><path d="M-.35-.82h.18m.34 0h.18" stroke="#ffecaa" strokeWidth=".1"/></>}
    </g>
  </g>;
}
function HayfieldWorld({ field }: { field: HayfieldState }) {
  const id = useId(), progress = hayfieldProgress(field), cut = new Set(field.cut);
  return <>
    <defs><pattern id={`${id}-grass`} width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#76a55c"/><path d="m.18.24.04-.12m.56.61.05-.12m-.51.23.08-.02" stroke="#96b975" strokeWidth=".035"/></pattern><g id={`${id}-grain`}><path d="M0 .38v-.7m0 .42-.15-.13M0 .04.14-.13" stroke="#ac802b" strokeWidth=".035"/><path d="m0-.07-.1-.1m.1.01.1-.09m-.1-.01-.08-.09m.08 0 .08-.09" stroke="#ffe79b" strokeWidth=".075" strokeLinecap="round"/></g></defs>
    <rect x="-1" y="-1" width="26" height="18" rx=".7" fill={`url(#${id}-grass)`}/>
    <path d="M21.8-.4v16M.5 14.8h23M.5.7h21" stroke="#b78f5c" strokeWidth="1.5" fill="none"/><path d="M21.8-.4v16M.5 14.8h23M.5.7h21" stroke="#d8b67a" strokeWidth="1.2" fill="none"/>
    <rect x="1.65" y="1.65" width="18.7" height="12.7" rx=".35" fill="#86683b"/>
    {Array.from({ length: HAY_CELL_COUNT }, (_, i) => {
      const x = HAY_FIELD.x + i % HAY_FIELD.width, y = HAY_FIELD.y + Math.floor(i / HAY_FIELD.width), mowed = cut.has(i);
      return <g key={i} data-hay-cell={i} data-cut={mowed}><rect x={x - .5} y={y - .5} width="1.01" height="1.01" fill={mowed ? (Math.floor(i / HAY_FIELD.width) % 2 ? "#a6b963" : "#b2c474") : (Math.floor(i / HAY_FIELD.width) % 2 ? "#d4ad4b" : "#dfbc5f")}/>{mowed ? <path d={`M${x - .32} ${y + .1}h.17m.1-.3h.2`} stroke="#82994e" strokeWidth=".035"/> : <>{[-.29, 0, .29].map((dx, n) => <use key={dx} href={`#${id}-grain`} transform={`translate(${x + dx} ${y + (n % 2 ? .1 : -.1)})`}/>)}</>}</g>;
    })}
    <path d="M1.5 1.4h18.8M1.5 14.3h18.8" stroke="#f0deab" strokeWidth=".12"/>
    {Array.from({ length: 11 }, (_, i) => <g key={i} fill="#f7e8c5"><rect x={1.4 + i * 1.9} y="1.2" width=".17" height=".47" rx=".04"/><rect x={1.4 + i * 1.9} y="14.1" width=".17" height=".47" rx=".04"/></g>)}
    {progress.bundles.filter(b => !field.picked.includes(b.id)).map(b => <g key={b.id} data-hay-bundle={b.id}><Bale x={b.x} y={b.y}/></g>)}
    <g aria-hidden="true"><rect x="20.75" y="-.05" width="2.5" height="2.55" rx=".15" fill="#744b32" opacity=".25"/><rect x="20.65" y="-.2" width="2.5" height="2.55" rx=".12" fill="#a74437" stroke="#743b2e" strokeWidth=".08"/><path d="M20.57-.25h2.66v1.21h-2.66z" fill="#c8644a"/><path d="M20.57 1.05h2.66v1.36h-2.66z" fill="#b64f3a"/><path d="M20.5 1h2.8" stroke="#673d30" strokeWidth=".13"/><path d="M21.1 2.35V1.6h1.6v.75M21.9 1.6v.75" fill="#783a2e" stroke="#f4dfba" strokeWidth=".06"/><path d="M21.15 1.65 22.65 2.3m0-.65-1.5.65" stroke="#f4dfba" strokeWidth=".06"/></g>
    <rect x={HAY_DEPOT.x - 1.1} y={HAY_DEPOT.y - 1} width="2.2" height="2" rx=".25" fill="#f9e7a0" fillOpacity=".6" stroke="#fff2b7" strokeWidth=".09" strokeDasharray=".2 .12"/>
    <path d="m21.5 4.35.5-.65.5.65m-.5-.65v1" stroke="#65783c" strokeWidth=".1" fill="none"/>
    <text x="21.95" y="3.35" textAnchor="middle" fontSize=".42" fontWeight="800" fill="#4f5930">BARN BAY</text>
    <g transform="translate(22 10)"><circle r=".75" fill="#5c8643"/><circle cx="-.22" cy="-.17" r=".62" fill="#75a34b"/><circle cx=".22" cy="-.25" r=".46" fill="#8db758"/><circle cx="-.28" cy="-.31" r=".1" fill="#f6c26c"/><circle cx=".3" cy=".05" r=".1" fill="#f6c26c"/></g>
    <g transform="translate(.2 7)"><circle r=".75" fill="#5b7e3e"/><circle cx="-.15" cy="-.2" r=".6" fill="#83a953"/><circle cx=".2" cy="-.15" r=".4" fill="#9fbe68"/></g>
    {field.vehicle === "tractor" && <g transform="translate(22 13)" opacity=".7"><rect x="-.5" y="-.75" width="1" height="1.55" rx=".15" fill="#387799"/><rect x="-.37" y="-.58" width=".74" height=".55" rx=".1" fill="#b8dcdf"/><rect x="-.37" y=".2" width=".74" height=".45" rx=".04" fill="#a87a47"/></g>}
    <Vehicle field={field}/>
  </>;
}
