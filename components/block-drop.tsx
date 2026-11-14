"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Blocks, ChevronsDown, Pause, Play, RotateCw } from "lucide-react";
import { advanceBlockDrop, blockDropLevel, createBlockDrop, fallDelay, landingPiece, PIECES, type BlockDropAction, type BlockDropState } from "@/lib/block-drop";

const COLORS = ["#152239", "#22d3ee", "#facc15", "#c084fc", "#4ade80", "#fb7185", "#60a5fa", "#fb923c"];
const CONTROL = "flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-40";

export function BlockDrop({ onExit, onFinish }: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void | Promise<void>;
}) {
  const [game, setGame] = useState<BlockDropState | null>(null);
  const current = useRef<BlockDropState | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const running = !!game && !game.over && !paused && !ended;
  const delay = fallDelay(game?.lines ?? 0);

  const act = useCallback((action: BlockDropAction) => {
    if (!current.current) return;
    const next = advanceBlockDrop(current.current, action);
    current.current = next;
    setGame(next);
  }, []);

  function start() {
    const next = createBlockDrop();
    current.current = next;
    setGame(next);
    setPaused(false);
    setEnded(false);
    setSeconds(0);
    boardRef.current?.focus();
  }

  useEffect(() => {
    if (!running) return;
    const gravity = window.setInterval(() => act("tick"), delay);
    return () => window.clearInterval(gravity);
  }, [running, delay, act]);

  useEffect(() => {
    if (!running) return;
    const clock = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(clock);
  }, [running]);

  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    const blur = () => setPaused(true);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const display = game?.board.map((row) => [...row]) ?? Array.from({ length: 20 }, () => Array(10).fill(0));
  const ghost = game && !game.over ? landingPiece(game.board, game.active) : null;
  const ghostCells = new Set<string>();
  if (ghost) ghost.cells.forEach((row, y) => row.forEach((cell, x) => { if (cell) ghostCells.add(`${ghost.y + y}-${ghost.x + x}`); }));
  if (game && !game.over) game.active.cells.forEach((row, y) => row.forEach((cell, x) => { if (cell) display[game.active.y + y][game.active.x + x] = cell; }));
  const finished = ended || !!game?.over;
  const nextPiece = game ? PIECES[game.queue[0]] : null;

  async function save() {
    if (!game || saving) return;
    setSaving(true);
    try {
      await onFinish(game.score, Math.max(1, seconds), { lines: game.lines, level: blockDropLevel(game.lines), pieces: game.pieces, result: game.over ? "top-out" : "finished" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 p-4 text-white shadow-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Stack · Rotate · Clear</p>
          <h2 className="flex items-center gap-2 text-2xl font-black"><Blocks className="text-cyan-300" /> Block Drop</h2>
        </div>
        <button type="button" onClick={onExit} disabled={saving} className={CONTROL}>Exit</button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-5">
        <div>
          <div
            ref={boardRef}
            tabIndex={0}
            role="group"
            aria-label="Block Drop board"
            aria-describedby="block-drop-instructions"
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if ((event.key.toLowerCase() === "p" || event.key === "Escape") && game && !finished) {
                event.preventDefault();
                if (!event.repeat) setPaused((value) => !value);
                return;
              }
              if (!running) return;
              const action: BlockDropAction | undefined = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "rotate", ArrowDown: "down", " ": "drop", x: "rotate", X: "rotate" } as Record<string, BlockDropAction>)[event.key];
              if (!action) return;
              event.preventDefault();
              if (event.repeat && (action === "drop" || action === "rotate")) return;
              act(action);
            }}
            className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border-2 border-slate-600 bg-slate-900 p-1 outline-none focus-visible:border-cyan-300"
          >
            <div aria-hidden="true" className="grid grid-cols-10 gap-px">
              {display.flatMap((row, y) => row.map((cell, x) => (
                <div key={`${y}-${x}`} className="aspect-square rounded-[2px]" style={{ backgroundColor: COLORS[cell], border: cell ? "2px solid #ffffff40" : ghostCells.has(`${y}-${x}`) ? "2px solid #67e8f980" : "1px solid #ffffff04", boxShadow: cell ? "inset 0 -3px 0 #00000025" : undefined }} />
              )))}
            </div>
            {(!game || paused || finished) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-3 text-center backdrop-blur-sm">
                <p className="text-xl font-black sm:text-2xl">{finished ? "Nice stacking!" : game ? "Paused" : "Make room for more."}</p>
                <p role="status" className="mt-2 text-sm text-slate-300">{finished ? `${game?.score.toLocaleString()} score · ${game?.lines} lines` : game ? "Your blocks can wait." : "Fill a row to clear it. Keep the stack below the top!"}</p>
                {!finished && <button type="button" onClick={() => { if (!game) start(); else { setPaused(false); boardRef.current?.focus(); } }} className="mt-5 flex min-h-12 items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950"><Play size={18} />{game ? "Resume" : "Start game"}</button>}
                {finished && <button type="button" onClick={save} disabled={saving} className="mt-5 min-h-12 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? "Saving…" : "Save game"}</button>}
              </div>
            )}
          </div>
        </div>
        <aside className="space-y-3">
          {[["Score", game?.score.toLocaleString() ?? "0"], ["Lines", game?.lines ?? 0], ["Level", blockDropLevel(game?.lines ?? 0)]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-all text-xl font-black text-cyan-200 sm:text-2xl">{value}</p></div>)}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Next</p>
            <div aria-label="Next piece" className="mt-3 grid gap-px" style={{ gridTemplateColumns: `repeat(${nextPiece?.length ?? 4}, minmax(0, 1fr))` }}>
              {(nextPiece ?? [[0, 0, 0, 0]]).flatMap((row, y) => row.map((cell, x) => <span key={`${y}-${x}`} className="aspect-square rounded-[2px]" style={{ backgroundColor: cell ? COLORS[cell] : "transparent", border: cell ? "1px solid #ffffff50" : undefined }} />))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
        </aside>
      </div>
      <div className="mx-auto mt-4 grid max-w-md grid-cols-4 gap-2">
        <button type="button" aria-label="Move left" disabled={!running} onClick={() => act("left")} className={CONTROL}><ArrowLeft size={22} /></button>
        <button type="button" aria-label="Rotate block" disabled={!running} onClick={() => act("rotate")} className={CONTROL}><RotateCw size={22} /></button>
        <button type="button" aria-label="Move right" disabled={!running} onClick={() => act("right")} className={CONTROL}><ArrowRight size={22} /></button>
        <button type="button" aria-label="Move down" disabled={!running} onClick={() => act("down")} className={CONTROL}><ArrowDown size={22} /></button>
        <button type="button" disabled={!running} onClick={() => act("drop")} className={`${CONTROL} col-span-2`}><ChevronsDown size={20} />Drop</button>
        <button type="button" disabled={!game || finished} onClick={() => { setPaused((value) => !value); boardRef.current?.focus(); }} className={`${CONTROL} col-span-2`}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? "Resume" : "Pause"}</button>
      </div>
      <p id="block-drop-instructions" className="mx-auto mt-4 max-w-md text-center text-xs leading-5 text-slate-400">Tap the buttons, or focus the board to use ← → to move, ↑ to rotate, ↓ to fall faster, and Space to drop. P or Esc pauses. Clear 10 lines to level up!</p>
      {game && !finished && <div className="mt-4 text-center"><button type="button" disabled={game.pieces === 0} onClick={() => setEnded(true)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-300 underline decoration-slate-600 underline-offset-4 disabled:opacity-40">Finish &amp; save</button></div>}
    </section>
  );
}
