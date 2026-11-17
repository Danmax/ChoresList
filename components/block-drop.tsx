"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Blocks, ChevronsDown, Pause, Play, RotateCw } from "lucide-react";
import { advanceBlockDrop, blockDropLevel, createBlockDrop, fallDelay, landingPiece, PIECES, type BlockDropAction, type BlockDropState } from "@/lib/block-drop";
import { advanceColumns, columnsDelay, columnsLanding, columnsLevel, createColumns, type ColumnsState } from "@/lib/gem-columns";
import styles from "./block-drop.module.css";

type DropState = BlockDropState | ColumnsState;
const FRUITS = ["", "🍒", "🍋", "🍇", "🍏", "🍊", "🫐"];
const GEM_SHAPES = [
  "",
  "20,2 37,20 20,38 3,20",
  "13,3 27,3 37,13 37,27 27,37 13,37 3,27 3,13",
  "11,3 29,3 38,20 29,37 11,37 2,20",
  "20,2 38,36 2,36",
  "8,3 32,3 37,8 37,32 32,37 8,37 3,32 3,8",
  "20,1 26,13 39,15 29,25 32,39 20,32 8,39 11,25 1,15 14,13",
];
const COLORS = ["#152239", "#22d3ee", "#facc15", "#c084fc", "#4ade80", "#fb7185", "#60a5fa", "#fb923c"];
const CONTROL = "flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-40";

export function BlockDrop({ onExit, onFinish }: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void | Promise<void>;
}) {
  const [game, setGame] = useState<DropState | null>(null);
  const [mode, setMode] = useState<"blocks" | "columns">("blocks");
  const [theme, setTheme] = useState<"gems" | "fruits">("gems");
  const isColumns = mode === "columns";
  const columns = game && "cleared" in game ? game : null;
  const blocks = game && "lines" in game ? game : null;
  const level = columns ? columnsLevel(columns.cleared) : blockDropLevel(blocks?.lines ?? 0);
  const clearing = game?.phase === "clearing";
  const clearingRows = new Set(blocks?.clearingRows ?? []);
  const tetris = clearingRows.size === 4;
  const clearDelay = columns ? 450 : tetris ? 900 : 420;
  const current = useRef<DropState | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const running = !!game && !game.over && !paused && !ended;
  const delay = clearing ? clearDelay : columns ? columnsDelay(columns.cleared) : fallDelay(blocks?.lines ?? 0);

  const act = useCallback((action: BlockDropAction) => {
    if (!current.current) return;
    const next = "cleared" in current.current ? advanceColumns(current.current, action) : advanceBlockDrop(current.current, action);
    current.current = next;
    setGame(next);
  }, []);

  function start() {
    const next = isColumns ? createColumns() : createBlockDrop();
    current.current = next;
    setGame(next);
    setPaused(false);
    setEnded(false);
    setSeconds(0);
    boardRef.current?.focus();
  }

  useEffect(() => {
    if (!running) return;
    if (clearing) {
      const clear = window.setTimeout(() => act("tick"), delay);
      return () => window.clearTimeout(clear);
    }
    const gravity = window.setInterval(() => act("tick"), delay);
    return () => window.clearInterval(gravity);
  }, [running, clearing, delay, act]);

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

  const display = game?.board.map((row) => [...row]) ?? Array.from({ length: isColumns ? 13 : 20 }, () => Array(isColumns ? 6 : 10).fill(0));
  const ghost = game && !game.over && !clearing ? (isColumns ? columnsLanding(game.board, game.active) : landingPiece(game.board, game.active)) : null;
  const ghostCells = new Set<string>();
  if (ghost) ghost.cells.forEach((row, y) => row.forEach((cell, x) => { if (cell) ghostCells.add(`${ghost.y + y}-${ghost.x + x}`); }));
  if (game && !game.over && !clearing) game.active.cells.forEach((row, y) => row.forEach((cell, x) => { if (cell) display[game.active.y + y][game.active.x + x] = cell; }));
  const finished = ended || !!game?.over;
  const nextPiece = columns ? columns.next.map((value) => [value]) : blocks ? PIECES[blocks.queue[0]] : null;
  const matching = new Set(columns?.matches.map(([x, y]) => `${y}-${x}`) ?? []);
  function symbol(cell: number) {
    if (!isColumns || !cell) return null;
    if (theme === "fruits") return <span>{FRUITS[cell]}</span>;
    return <svg aria-hidden="true" viewBox="0 0 40 40" className="h-[85%] w-[85%]" style={{ filter: `drop-shadow(0 1px 3px ${COLORS[cell]}66)` }}>
      <polygon points={GEM_SHAPES[cell]} fill={COLORS[cell]} stroke="#ffffffaa" strokeWidth="1" />
      <polygon points={GEM_SHAPES[cell]} transform="translate(4 3) scale(.78)" fill="#fff" opacity=".45" />
      <polygon points={GEM_SHAPES[cell]} transform="translate(7 9) scale(.62)" fill={COLORS[cell]} />
    </svg>;
  }

  async function save() {
    if (!game || saving) return;
    setSaving(true);
    try {
      await onFinish(game.score, Math.max(1, seconds), { mode, ...(columns ? { theme, cleared: columns.cleared, bestChain: columns.bestChain } : { lines: blocks?.lines ?? 0 }), level, pieces: game.pieces, result: game.over ? "top-out" : "finished" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 p-4 text-white shadow-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{isColumns ? "Cycle · Match · Cascade" : "Stack · Rotate · Clear"}</p>
          <h2 className="flex items-center gap-2 text-2xl font-black"><Blocks className="text-cyan-300" /> Block Drop</h2>
        </div>
        <button type="button" onClick={onExit} disabled={saving} className={CONTROL}>Exit</button>
      </div>
      {!game && <div className="mb-5 space-y-3">
        <div role="group" aria-label="Game mode" className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={!isColumns} onClick={() => setMode("blocks")} className={`${CONTROL} ${!isColumns ? "border-cyan-300 bg-cyan-300/20" : ""}`}>Classic blocks</button>
          <button type="button" aria-pressed={isColumns} onClick={() => setMode("columns")} className={`${CONTROL} ${isColumns ? "border-cyan-300 bg-cyan-300/20" : ""}`}>Gem &amp; Fruit Columns</button>
        </div>
        {isColumns && <div role="group" aria-label="Columns theme" className="flex gap-2">
          <button type="button" aria-pressed={theme === "gems"} onClick={() => setTheme("gems")} className={`${CONTROL} flex-1 ${theme === "gems" ? "border-cyan-300 bg-cyan-300/20" : ""}`}>💎 Gems</button>
          <button type="button" aria-pressed={theme === "fruits"} onClick={() => setTheme("fruits")} className={`${CONTROL} flex-1 ${theme === "fruits" ? "border-cyan-300 bg-cyan-300/20" : ""}`}>🍒 Fruits</button>
        </div>}
      </div>}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-5">
        <div>
          <div
            ref={boardRef}
            tabIndex={0}
            role="group"
            aria-label="Block Drop board"
            aria-describedby="block-drop-instructions"
            data-clear={clearing && blocks ? (tetris ? "tetris" : "line") : undefined}
            style={{ "--clear-duration": `${clearDelay}ms` } as CSSProperties}
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
            className={`relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border-2 border-slate-600 bg-slate-900 p-1 outline-none focus-visible:border-cyan-300 ${tetris ? styles.tetrisBoard : ""} ${paused ? styles.paused : ""}`}
          >
            <div aria-hidden="true" className={`grid gap-px ${isColumns ? "grid-cols-6" : "grid-cols-10"}`}>
              {display.flatMap((row, y) => row.map((cell, x) => (
                <div key={`${y}-${x}`} data-clearing={clearingRows.has(y) || undefined} className={`flex aspect-square items-center justify-center rounded-[2px] text-[clamp(1rem,5vw,2rem)] leading-none ${clearingRows.has(y) ? styles.lineFlash : ""} ${matching.has(`${y}-${x}`) ? "animate-pulse bg-white/40 ring-2 ring-inset ring-white" : ""}`} style={{ backgroundColor: isColumns ? (matching.has(`${y}-${x}`) ? "#486080" : "#152239") : COLORS[cell], border: cell ? "2px solid #ffffff40" : ghostCells.has(`${y}-${x}`) ? "2px solid #67e8f980" : "1px solid #ffffff04", boxShadow: cell ? "inset 0 -3px 0 #00000025" : undefined }}>{symbol(cell)}</div>
              )))}
            </div>
            {tetris && <div aria-hidden="true" className={styles.tetrisEffect}>
              <div className={styles.burstRing} />
              {Array.from({ length: 12 }, (_, i) => <span key={i} className={styles.spark} style={{ "--angle": `${i * 30}deg`, "--spark-color": ["#fef08a", "#67e8f9", "#c084fc"][i % 3] } as CSSProperties} />)}
              <div className={styles.tetrisBanner}><strong>TETRIS!</strong><span>4 lines · +{800 * level}</span></div>
            </div>}
            {(!game || paused || finished) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 p-3 text-center backdrop-blur-sm">
                <p className="text-xl font-black sm:text-2xl">{finished ? "Nice stacking!" : game ? "Paused" : (isColumns ? "Three of a kind!" : "Make room for more.")}</p>
                <p role="status" className="mt-2 text-sm text-slate-300">{finished ? `${game?.score.toLocaleString()} score · ${columns ? columns.cleared : blocks?.lines} ${isColumns ? "symbols" : "lines"}` : game ? "Your blocks can wait." : (isColumns ? "Cycle a stack of three. Match 3+ across, down, or diagonally!" : "Fill a row to clear it. Keep the stack below the top!")}</p>
                {!finished && <button type="button" onClick={() => { if (!game) start(); else { setPaused(false); boardRef.current?.focus(); } }} className="mt-5 flex min-h-12 items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950"><Play size={18} />{game ? "Resume" : "Start game"}</button>}
                {finished && <button type="button" onClick={save} disabled={saving} className="mt-5 min-h-12 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? "Saving…" : "Save game"}</button>}
              </div>
            )}
          </div>
        </div>
        <aside className="space-y-3">
          {[["Score", game?.score.toLocaleString() ?? "0"], [isColumns ? "Cleared" : "Lines", columns ? columns.cleared : blocks?.lines ?? 0], ["Level", level]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-all text-xl font-black text-cyan-200 sm:text-2xl">{value}</p></div>)}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Next</p>
            <div aria-label="Next piece" className={`mt-3 grid gap-px ${isColumns ? "mx-auto w-8 sm:w-12" : ""}`} style={{ gridTemplateColumns: `repeat(${isColumns ? 1 : nextPiece?.length ?? 4}, minmax(0, 1fr))` }}>
              {(nextPiece ?? (isColumns ? [[0], [0], [0]] : [[0, 0, 0, 0]])).flatMap((row, y) => row.map((cell, x) => <span key={`${y}-${x}`} className="flex aspect-square items-center justify-center rounded-[2px] text-2xl leading-none sm:text-3xl" style={{ backgroundColor: isColumns ? "transparent" : cell ? COLORS[cell] : "transparent", border: cell ? "1px solid #ffffff50" : undefined }}>{symbol(cell)}</span>))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
        </aside>
      </div>
      {!isColumns && <p role="status" aria-atomic="true" className="sr-only">{clearingRows.size ? (tetris ? "Tetris! Four lines cleared!" : `${clearingRows.size} ${clearingRows.size === 1 ? "line" : "lines"} cleared!`) : ""}</p>}
      {isColumns && <p role="status" className="mt-3 text-center text-sm font-black text-amber-200">{columns?.chain ? `${columns.chain}× chain · Best ${columns.bestChain}×` : "Match 3 or more. Set up a chain!"}</p>}
      <div className="mx-auto mt-4 grid max-w-md grid-cols-4 gap-2">
        <button type="button" aria-label="Move left" disabled={!running || clearing} onClick={() => act("left")} className={CONTROL}><ArrowLeft size={22} /></button>
        <button type="button" aria-label={isColumns ? "Cycle symbols" : "Rotate block"} disabled={!running || clearing} onClick={() => act("rotate")} className={CONTROL}><RotateCw size={22} />{isColumns && <span className="sr-only">Cycle</span>}</button>
        <button type="button" aria-label="Move right" disabled={!running || clearing} onClick={() => act("right")} className={CONTROL}><ArrowRight size={22} /></button>
        <button type="button" aria-label="Move down" disabled={!running || clearing} onClick={() => act("down")} className={CONTROL}><ArrowDown size={22} /></button>
        <button type="button" disabled={!running || clearing} onClick={() => act("drop")} className={`${CONTROL} col-span-2`}><ChevronsDown size={20} />Drop</button>
        <button type="button" disabled={!game || finished} onClick={() => { setPaused((value) => !value); boardRef.current?.focus(); }} className={`${CONTROL} col-span-2`}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? "Resume" : "Pause"}</button>
      </div>
      <p id="block-drop-instructions" className="mx-auto mt-4 max-w-md text-center text-xs leading-5 text-slate-400">Tap the buttons, or focus the board to use ← → to move, ↑ to {isColumns ? "cycle symbols" : "rotate"}, ↓ to fall faster, and Space to drop. P or Esc pauses. {isColumns ? "Match 3+ in any direction. Clear 30 symbols to level up!" : "Clear 10 lines to level up!"}</p>
      {game && !finished && <div className="mt-4 text-center"><button type="button" disabled={game.pieces === 0 || clearing} onClick={() => setEnded(true)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-300 underline decoration-slate-600 underline-offset-4 disabled:opacity-40">Finish &amp; save</button></div>}
    </section>
  );
}
