"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from "react";
import { farmTool, type FarmTool } from "@/lib/sunny-farm-tools";
import type { FarmTaskId } from "@/lib/sunny-farm";
import { FarmSprite, type FarmItem } from "./sunny-farm-art";
import styles from "./sunny-farm.module.css";
const WorkContext = createContext<{ selected: boolean; accepts: (target: string) => boolean; busy: boolean; progress: Record<string, number>; keyboard: (target: string) => void; activate: (target: string) => void; deposit: () => void; held: string | null }>({ selected: false, accepts: () => false, busy: false, progress: {}, keyboard: () => {}, activate: () => {}, deposit: () => {}, held: null });
function ToolArt({ tool }: { tool: FarmTool }) {
  if (tool.id === "hoe") return <svg viewBox="0 0 100 80" aria-hidden="true"><path d="M22 69 70 18" stroke="#784e2d" strokeWidth="10" strokeLinecap="round"/><path d="m57 12 30 8-11 22-26-12z" fill="#aabec5" stroke="#455f68" strokeWidth="3"/><path d="m25 64 9-10" stroke="#c69555" strokeWidth="4" strokeLinecap="round"/></svg>;
  if (tool.id === "harvest") return <svg viewBox="0 0 100 80" aria-hidden="true"><path d="M28 65 49 44" stroke="#87562e" strokeWidth="13" strokeLinecap="round"/><path d="M45 45C98 51 94 3 52 10c26 9 27 24-7 26Z" fill="#dbe6df" stroke="#577077" strokeWidth="3"/></svg>;
  if (tool.id === "water") return <svg viewBox="0 0 100 80" aria-hidden="true"><path d="M62 27C88 5 101 52 69 53" fill="none" stroke="#ba3b2c" strokeWidth="9"/><path d="M20 25h46l6 45H19z" fill="#e74c35" stroke="#983c2e" strokeWidth="3"/><path d="M21 43 5 20l-5 5 20 36" fill="#ed6744"/><path d="M28 26C25 1 59 1 58 26" fill="none" stroke="#d74432" strokeWidth="7"/><path d="M2 32v8m7-4v9m-8-1v9" stroke="#62c6ed" strokeWidth="3" strokeLinecap="round"/></svg>;
  return tool.item ? <FarmSprite item={tool.item as FarmItem} /> : <span aria-hidden="true">{tool.symbol}</span>;
}
export function FarmWorkbench({ task, targets, busy, waiting = false, onComplete, children }: { task: FarmTaskId; targets: string[]; busy: boolean; waiting?: boolean; onComplete: (target: string, tool: string) => void; children: ReactNode }) {
  const [gardenTool, setGardenTool] = useState("till");
  const tool = farmTool(task, task === "garden" ? gardenTool : targets[0] ?? "");
  const [selected, setSelected] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  const heldRef = useRef<string | null>(null);
  function carry(target: string | null) { heldRef.current = target; setHeld(target); }
  const simple = tool.motion === "feed" || tool.motion === "collect" || tool.motion === "squeeze";
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const root = useRef<HTMLDivElement>(null);
  const work = useRef<Record<string, number>>({});
  const gesture = useRef<{ pointer: number; x: number; y: number; target: string | null; startX: number; startY: number } | null>(null);
  const completed = useRef(false);
  const pending = useRef<string | null>(null);
  const busyRef = useRef(busy); busyRef.current = busy;
  const current = useRef({ targets, tool, onComplete }); current.current = { targets, tool, onComplete };
  useEffect(() => {
    setSelected(previous => task === "garden" ? previous : tool.motion === "feed" || tool.motion === "collect" || tool.motion === "squeeze");
    carry(null); setProgress({}); work.current = {};
    // A new garden tool may already be dragging from its tray into a plot.
    if (task !== "garden") { setCursor(null); gesture.current = null; }
  }, [task, tool.id]);
  useEffect(() => {
    if (!busy) {
      completed.current = false;
      // Keep unfinished strokes on other spots; only clear the submitted spot (also on failure).
      const retained = Object.fromEntries(Object.entries(work.current).filter(([target]) => targets.includes(target) && target !== pending.current));
      pending.current = null; work.current = retained; setProgress(retained);
    }
  }, [busy, targets.join(",")]);
  function putDown() { carry(null); gesture.current = null; setSelected(false); setCursor(null); }
  useEffect(() => {
    const cancel = () => { gesture.current = null; setCursor(null); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => { window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, []);
  const finish = (target: string) => {
    if (busyRef.current || completed.current || !current.current.targets.includes(target) || farmTool(task, target).id !== current.current.tool.id) return;
    completed.current = true; pending.current = target; gesture.current = null;
    carry(null);
    current.current.onComplete(target, current.current.tool.id);
  };
  // Pouring measures time, not event count; mouse, touch and pen behave the same.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const g = gesture.current;
      if (g?.target && (current.current.tool.motion === "pour" || current.current.tool.motion === "squeeze") && !busyRef.current && !completed.current) {
        work.current[g.target] = Math.min(1, (work.current[g.target] ?? 0) + .1);
        setProgress({ ...work.current });
        if (work.current[g.target] >= 1) finish(g.target);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);
  function hit(x: number, y: number) {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-farm-target]");
    return el && root.current?.contains(el) && current.current.targets.includes(el.dataset.farmTarget!) && farmTool(task, el.dataset.farmTarget!).id === current.current.tool.id ? el.dataset.farmTarget! : null;
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const rect = root.current!.getBoundingClientRect();
    if (selected || simple || heldRef.current) setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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
    if (tool.motion === "pour" || tool.motion === "rub" || tool.motion === "squeeze") g.target = target;
    if (tool.motion === "pull" && g.target) {
      const direction = g.target.startsWith("harvest") ? g.startY - e.clientY : g.target.startsWith("herd") ? e.clientX - g.startX : e.clientY - g.startY;
      work.current[g.target] = Math.min(1, Math.max(0, direction / 55));
      setProgress({ ...work.current });
      if (direction >= 55) finish(g.target);
    }
    g.x = e.clientX; g.y = e.clientY;
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if ((!selected && !simple) || busy || e.button !== 0 || (e.target as HTMLElement).closest("[data-tool-tray]")) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.currentTarget.setPointerCapture(e.pointerId);
    const target = hit(e.clientX, e.clientY);
    if (tool.motion === "collect" && target) carry(target);
    gesture.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, target, startX: e.clientX, startY: e.clientY };
  }
  function activate(target: string) {
    if (busy || completed.current || !targets.includes(target)) return;
    if (tool.motion === "feed") finish(target);
    if (tool.motion === "squeeze") {
      work.current[target] = Math.min(1, (work.current[target] ?? 0) + .25);
      setProgress({ ...work.current });
      if (work.current[target] >= 1) finish(target);
    }
    if (tool.motion === "collect") { carry(target); root.current?.querySelector<HTMLButtonElement>("[data-farm-basket]")?.focus({ preventScroll: true }); }
  }
  function overBasket(x: number, y: number) {
    const rect = root.current?.querySelector("[data-farm-basket]")?.getBoundingClientRect();
    return rect && x >= rect.left - 12 && x <= rect.right + 12 && y >= rect.top - 12 && y <= rect.bottom + 12;
  }
  function pickUp(e: PointerEvent<HTMLButtonElement>, choice?: string) {
    if (busy || e.button !== 0) return;
    e.stopPropagation();
    if (choice) setGardenTool(choice);
    if (selected && !simple && (!choice || farmTool(task, choice).id === tool.id)) { putDown(); return; }
    setSelected(true);
    const rect = root.current!.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    root.current!.setPointerCapture(e.pointerId);
    gesture.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, target: null, startX: e.clientX, startY: e.clientY };

  }
  return <WorkContext.Provider value={{ selected: selected || simple, accepts: target => farmTool(task, target).id === tool.id, busy, progress, held, activate, deposit: () => { if (heldRef.current) finish(heldRef.current); }, keyboard: target => {
    if (simple) { activate(target); return; }
    if (!selected || busy || completed.current || !targets.includes(target) || farmTool(task, target).id !== tool.id) return;
    work.current[target] = Math.min(1, (work.current[target] ?? 0) + .25);
    setProgress({ ...work.current }); if (work.current[target] >= 1) finish(target);
  } }}><div ref={root} className={`${styles.workbench} ${selected ? styles.toolEquipped : ""}`} onPointerDown={down} onPointerMove={move} onPointerUp={e => {
    if (tool.motion === "squeeze" && gesture.current) { const target = hit(e.clientX, e.clientY); if (target) activate(target); }
    if (tool.motion === "collect" && heldRef.current && overBasket(e.clientX, e.clientY)) finish(heldRef.current);
    if (gesture.current && tool.motion === "feed") { const target = hit(e.clientX, e.clientY); if (target) finish(target); }
    if (gesture.current && tool.motion === "drag") { const target = hit(e.clientX, e.clientY); if (target && Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY) > 20) finish(target); }
    gesture.current = null; setCursor(null);
  }} onPointerCancel={() => { gesture.current = null; setCursor(null); }} onLostPointerCapture={() => { gesture.current = null; }} onPointerLeave={() => { if (!gesture.current) setCursor(null); }} onKeyDown={e => { if (e.key === "Escape") putDown(); }}>
    <div className={`${styles.toolTray} ${task === "garden" ? styles.gardenToolTray : ""}`} data-tool-tray>
      {task === "garden" ? <><div className={styles.gardenTools} role="group" aria-label="Garden tools">{["till", "plant", "water", "harvest"].map(choice => {
        const option = farmTool(task, choice), equipped = selected && tool.id === option.id;
        return <button key={choice} type="button" disabled={busy} className={styles.pickupTool} aria-label={`${equipped ? "Put down" : "Pick up"} ${option.label}`} aria-pressed={equipped} onPointerDown={e => pickUp(e, choice)} onClick={e => { if (e.detail === 0) { setGardenTool(choice); if (equipped) putDown(); else setSelected(true); } }}><ToolArt tool={option} /><span>{option.label}</span></button>;
      })}</div><p className={styles.gardenToolHint}>{waiting ? "Your crops are growing. Visit another farm stop, or watch them sprout!" : targets.length === 0 ? "Harvest complete! Your produce is in the farm basket." : tool.instruction}<small>Keyboard: select a tool, focus a matching plot, then press the arrow keys four times.</small></p></> : targets.length > 0 && simple ? <div className={styles.simpleHint}>{tool.motion === "feed" ? <button type="button" className={styles.foodSource} aria-label={`Carry ${tool.label.toLowerCase()}`} onPointerDown={e => pickUp(e)}><ToolArt tool={tool} /></button> : <span aria-hidden="true">🧺</span>}<div><strong>{tool.motion === "feed" ? "A little meal, a happy friend" : held ? "Now put it in the basket" : tool.motion === "squeeze" ? "Gentle squeezes, fresh milk" : "From the farm to your basket"}</strong><p>{tool.instruction}</p><small>{tool.motion === "collect" ? "Keyboard: Enter to pick up, then Enter on the basket. Escape returns the item." : tool.motion === "squeeze" ? "Hold to milk, or tap the spot four times. You can stop and continue." : "Tap an animal to feed it. Keyboard: Enter on the animal."}</small></div></div> : targets.length > 0 ? <><button type="button" disabled={busy} className={styles.pickupTool} aria-pressed={selected} onPointerDown={e => pickUp(e)} onClick={e => { if (e.detail === 0) { if (selected) putDown(); else setSelected(true); } }}><ToolArt tool={tool} /><span>{selected ? "Put down" : "Pick up"}<strong>{tool.label}</strong></span></button><div><strong>{selected ? `${tool.label} in hand` : "Choose your tool first"}</strong><p>{tool.instruction}</p><small>Keyboard: pick up the tool, Tab to a work spot, then use the arrow keys four times. Escape puts the tool down.</small></div></> : <p>Tools away. A job well done!</p>}
    </div>
    <div>{children}</div>
    {(selected || simple) && cursor && (tool.motion !== "collect" || held) && tool.motion !== "squeeze" && <div className={styles.carriedTool} style={{ left: cursor.x, top: cursor.y }}>{held ? <FarmSprite item={held.startsWith("egg") ? "egg" : "apple"} /> : <ToolArt tool={tool} />}</div>}
  </div></WorkContext.Provider>;
}
export function FarmWorkTarget({ target, label, children, className, style, disabled }: { target: string; label: string; children: ReactNode; className: string; style: CSSProperties; disabled: boolean }) {
  const ctx = useContext(WorkContext);
  const amount = ctx.progress[target] ?? 0;
  return <button type="button" data-farm-target={target} data-held={ctx.held === target} className={`${className} ${styles.workTarget}`} style={{ ...style, "--work": amount } as CSSProperties} aria-label={label} aria-disabled={!ctx.selected || !ctx.accepts(target) || disabled || ctx.busy} disabled={disabled || ctx.busy} onClick={e => { e.preventDefault(); ctx.activate(target); }} onKeyDown={e => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); ctx.keyboard(target); } }}>
    <span className={styles.workObject} style={{ opacity: target.startsWith("brush") || target.startsWith("wool") ? 1 - amount * .85 : 1 }}>{children}</span>
    {amount > 0 && <span className={styles.workMeter} role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(amount * 100)}><span style={{ width: `${amount * 100}%` }} /></span>}
  </button>;
}

export function FarmCollectionBasket({ count, style, kind = "egg" }: { count: number; style: CSSProperties; kind?: "egg" | "apple" }) {
  const ctx = useContext(WorkContext);
  return <button type="button" data-farm-basket className={`${styles.collectionBasket} ${ctx.held ? styles.basketReady : ""}`} style={style} onClick={ctx.deposit} disabled={ctx.busy} aria-label="Put item in basket">
    <FarmSprite item="basket" /><span className={styles.basketContents}>{Array.from({ length: Math.min(3, count) }, (_, i) => <FarmSprite key={i} item={kind} />)}</span>
    <span>{ctx.held ? "Drop it here!" : `${count} collected`}</span>
  </button>;
}
