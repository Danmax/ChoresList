"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from "react";
import { farmTool, type FarmTool } from "@/lib/sunny-farm-tools";
import type { FarmTaskId } from "@/lib/sunny-farm";
import { FarmSprite, type FarmItem } from "./sunny-farm-art";
import styles from "./sunny-farm.module.css";
const WorkContext = createContext<{ selected: boolean; busy: boolean; progress: Record<string, number>; keyboard: (target: string) => void }>({ selected: false, busy: false, progress: {}, keyboard: () => {} });
function ToolArt({ tool }: { tool: FarmTool }) {
  if (tool.id === "water") return <svg viewBox="0 0 100 80" aria-hidden="true"><path d="M62 27C88 5 101 52 69 53" fill="none" stroke="#ba3b2c" strokeWidth="9"/><path d="M20 25h46l6 45H19z" fill="#e74c35" stroke="#983c2e" strokeWidth="3"/><path d="M21 43 5 20l-5 5 20 36" fill="#ed6744"/><path d="M28 26C25 1 59 1 58 26" fill="none" stroke="#d74432" strokeWidth="7"/><path d="M2 32v8m7-4v9m-8-1v9" stroke="#62c6ed" strokeWidth="3" strokeLinecap="round"/></svg>;
  return tool.item ? <FarmSprite item={tool.item as FarmItem} /> : <span aria-hidden="true">{tool.symbol}</span>;
}
export function FarmWorkbench({ task, targets, busy, onComplete, children }: { task: FarmTaskId; targets: string[]; busy: boolean; onComplete: (target: string, tool: string) => void; children: ReactNode }) {
  const tool = farmTool(task, targets[0] ?? "");
  const [selected, setSelected] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const root = useRef<HTMLDivElement>(null);
  const work = useRef<Record<string, number>>({});
  const gesture = useRef<{ pointer: number; x: number; y: number; target: string | null; startX: number; startY: number } | null>(null);
  const completed = useRef(false);
  const pending = useRef<string | null>(null);
  const busyRef = useRef(busy); busyRef.current = busy;
  const current = useRef({ targets, tool, onComplete }); current.current = { targets, tool, onComplete };
  useEffect(() => { setSelected(false); setCursor(null); setProgress({}); work.current = {}; gesture.current = null; }, [task, tool.id]);
  useEffect(() => {
    if (!busy) {
      completed.current = false;
      // Keep unfinished strokes on other spots; only clear the submitted spot (also on failure).
      const retained = Object.fromEntries(Object.entries(work.current).filter(([target]) => targets.includes(target) && target !== pending.current));
      pending.current = null; work.current = retained; setProgress(retained);
    }
  }, [busy, targets.join(",")]);
  function putDown() { gesture.current = null; setSelected(false); setCursor(null); }
  useEffect(() => {
    const cancel = () => { gesture.current = null; setCursor(null); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => { window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, []);
  const finish = (target: string) => {
    if (busyRef.current || completed.current || !current.current.targets.includes(target)) return;
    completed.current = true; pending.current = target; gesture.current = null;
    current.current.onComplete(target, current.current.tool.id);
  };
  // Pouring measures time, not event count; mouse, touch and pen behave the same.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const g = gesture.current;
      if (g?.target && current.current.tool.motion === "pour" && !busyRef.current && !completed.current) {
        work.current[g.target] = Math.min(1, (work.current[g.target] ?? 0) + .1);
        setProgress({ ...work.current });
        if (work.current[g.target] >= 1) finish(g.target);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);
  function hit(x: number, y: number) {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-farm-target]");
    return el && root.current?.contains(el) && current.current.targets.includes(el.dataset.farmTarget!) ? el.dataset.farmTarget! : null;
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const rect = root.current!.getBoundingClientRect();
    if (selected) setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId || busy || completed.current) return;
    if (task === "hay") {
      const tractor = root.current?.querySelector<SVGElement>('[aria-label="Farm tractor"]');
      const field = tractor?.parentElement?.getBoundingClientRect();
      if (tractor && field) { tractor.style.left = `${Math.max(0, Math.min(60, (e.clientX - field.left) / field.width * 100 - 20))}%`; tractor.style.top = `${Math.max(5, Math.min(65, (e.clientY - field.top) / field.height * 100 - 15))}%`; }
    }
    const target = hit(e.clientX, e.clientY);
    const distance = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (tool.motion === "rub" && target && target === g.target && distance > 0) {
      const spot = root.current?.querySelector<HTMLElement>(`[data-farm-target="${target}"]`);
      const strokeLength = Math.max(90, Math.min(180, (spot?.getBoundingClientRect().width ?? 60) * 3));
      work.current[target] = Math.min(1, (work.current[target] ?? 0) + Math.min(distance, 40) / strokeLength);
      setProgress({ ...work.current });
      if (work.current[target] >= 1) finish(target);
    }
    if (tool.motion === "pour" || tool.motion === "rub") g.target = target;
    if (tool.motion === "pull" && g.target) {
      const direction = g.target.startsWith("harvest") ? g.startY - e.clientY : g.target.startsWith("herd") ? e.clientX - g.startX : e.clientY - g.startY;
      work.current[g.target] = Math.min(1, Math.max(0, direction / 55));
      setProgress({ ...work.current });
      if (direction >= 55) finish(g.target);
    }
    g.x = e.clientX; g.y = e.clientY;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (!selected || busy || e.button !== 0 || (e.target as HTMLElement).closest("[data-tool-tray]")) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, target: hit(e.clientX, e.clientY), startX: e.clientX, startY: e.clientY };
  }
  return <WorkContext.Provider value={{ selected, busy, progress, keyboard: target => {
    if (!selected || busy || completed.current) return;
    work.current[target] = Math.min(1, (work.current[target] ?? 0) + .25);
    setProgress({ ...work.current }); if (work.current[target] >= 1) finish(target);
  } }}><div ref={root} className={`${styles.workbench} ${selected ? styles.toolEquipped : ""}`} onPointerDown={down} onPointerMove={move} onPointerUp={e => {
    if (gesture.current && tool.motion === "drag") { const target = hit(e.clientX, e.clientY); if (target && Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY) > 20) finish(target); }
    gesture.current = null; setCursor(null);
  }} onPointerCancel={() => { gesture.current = null; setCursor(null); }} onLostPointerCapture={() => { gesture.current = null; }} onPointerLeave={() => { if (!gesture.current) setCursor(null); }} onKeyDown={e => { if (e.key === "Escape") putDown(); }}>
    <div className={styles.toolTray} data-tool-tray>
      {targets.length > 0 ? <><button type="button" disabled={busy} className={styles.pickupTool} aria-pressed={selected} onPointerDown={e => {
        if (busy || e.button !== 0) return;
        e.stopPropagation();
        if (selected) { putDown(); return; }
        setSelected(true);
        const rect = root.current!.getBoundingClientRect();
        setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        root.current!.setPointerCapture(e.pointerId);
        gesture.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, target: null, startX: e.clientX, startY: e.clientY };
      }} onClick={e => { if (e.detail === 0) { if (selected) putDown(); else setSelected(true); } }}><ToolArt tool={tool} /><span>{selected ? "Put down" : "Pick up"}<strong>{tool.label}</strong></span></button><div><strong>{selected ? `${tool.label} in hand` : "Choose your tool first"}</strong><p>{tool.instruction}</p><small>Keyboard: pick up the tool, Tab to a work spot, then use the arrow keys four times. Escape puts the tool down.</small></div></> : <p>Tools away. A job well done!</p>}
    </div>
    <div>{children}</div>
    {selected && cursor && <div className={styles.carriedTool} style={{ left: cursor.x, top: cursor.y }}><ToolArt tool={tool} /></div>}
  </div></WorkContext.Provider>;
}
export function FarmWorkTarget({ target, label, children, className, style, disabled }: { target: string; label: string; children: ReactNode; className: string; style: CSSProperties; disabled: boolean }) {
  const ctx = useContext(WorkContext);
  const amount = ctx.progress[target] ?? 0;
  return <button type="button" data-farm-target={target} className={`${className} ${styles.workTarget}`} style={{ ...style, "--work": amount } as CSSProperties} aria-label={label} aria-disabled={!ctx.selected || disabled || ctx.busy} disabled={disabled || ctx.busy} onClick={e => e.preventDefault()} onKeyDown={e => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); ctx.keyboard(target); } }}>
    <span className={styles.workObject} style={{ opacity: target.startsWith("brush") || target.startsWith("wool") ? 1 - amount * .85 : 1 }}>{children}</span>
    {amount > 0 && <span className={styles.workMeter} role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(amount * 100)}><span style={{ width: `${amount * 100}%` }} /></span>}
  </button>;
}
