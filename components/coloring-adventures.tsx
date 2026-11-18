"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Download, Eraser, Eye, Leaf, LoaderCircle, PaintBucket, Paintbrush, Palette, Pipette, Redo2, RotateCcw, Sparkles, Star, Undo2, ZoomIn } from "lucide-react";
import { COLORING_COLORS, COLORING_SCENES, type ColoringPattern, type ColoringSceneId, type ColoringTool } from "@/lib/coloring";
import { useColoringCanvas } from "./use-coloring-canvas";
import styles from "./coloring-adventures.module.css";

const TOOLS = [
  { id: "bucket", label: "Bucket", icon: PaintBucket, hint: "Tap a shape to fill it with color." },
  { id: "brush", label: "Brush", icon: Paintbrush, hint: "Draw with your finger, mouse, or pen." },
  { id: "pattern", label: "Patterns", icon: Sparkles, hint: "Pick a pattern, then tap a shape." },
  { id: "eraser", label: "Eraser", icon: Eraser, hint: "Rub out color. Your outlines stay safe." },
  { id: "picker", label: "Pick color", icon: Pipette, hint: "Tap a painted area to pick its color." },
] as const;
const PATTERNS: { id: ColoringPattern; label: string }[] = [{ id: "dots", label: "Dots" }, { id: "stripes", label: "Stripes" }, { id: "stars", label: "Stars" }];

function PatternPreview({ pattern, color }: { pattern: ColoringPattern; color: string }) {
  return <span className={`${styles.patternPreview} ${styles[pattern]}`} style={{ "--paint": color } as CSSProperties} aria-hidden="true">
    {pattern === "stars" && <><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /></>}
  </span>;
}

export function ColoringAdventures({ memberId, playerName, onExit, onFinish }: {
  memberId: string;
  playerName: string;
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void | Promise<void>;
}) {
  const [sceneId, setSceneId] = useState<ColoringSceneId>(COLORING_SCENES[0].id);
  const [tool, setTool] = useState<ColoringTool>("bucket");
  const [color, setColor] = useState<string>(COLORING_COLORS[4].hex);
  const [pattern, setPattern] = useState<ColoringPattern>("dots");
  const [size, setSize] = useState(28);
  const [stayInLines, setStayInLines] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [confirmClear, setConfirmClear] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [keyboardPoint, setKeyboardPoint] = useState<{ x: number; y: number } | null>(null);
  const seconds = useRef(0);
  const scene = COLORING_SCENES.find((item) => item.id === sceneId)!;
  const drawing = useColoringCanvas(memberId, scene);
  const hintId = useId();
  const toolInfo = TOOLS.find((item) => item.id === tool)!;
  const colorName = COLORING_COLORS.find((item) => item.hex === color)?.name ?? "Custom color";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`coloring-adventures:${encodeURIComponent(memberId)}:last-scene`);
      if (COLORING_SCENES.some((item) => item.id === saved)) setSceneId(saved as ColoringSceneId);
    } catch { /* Coloring also works when browser storage is disabled. */ }
  }, [memberId]);

  useEffect(() => {
    if (!drawing.ready || finishing) return;
    const timer = window.setInterval(() => { if (!document.hidden) seconds.current++; }, 1000);
    return () => window.clearInterval(timer);
  }, [drawing.ready, finishing]);

  function selectScene(id: ColoringSceneId) {
    if (id === sceneId) return;
    drawing.endStroke(); setSceneId(id); setConfirmClear(false); setZoom(100); setKeyboardPoint(null);
    try { localStorage.setItem(`coloring-adventures:${encodeURIComponent(memberId)}:last-scene`, id); } catch { /* Optional preference. */ }
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * event.currentTarget.width, y: (event.clientY - rect.top) / rect.height * event.currentTarget.height };
  }

  function apply(at: { x: number; y: number }, pointerId: number) {
    const picked = drawing.dab(at, { tool, color, size, pattern, stayInLines }, pointerId);
    if (picked) { setColor(picked); setTool("bucket"); }
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.ready || finishing || confirmClear || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setKeyboardPoint(null); apply(point(event), event.pointerId);
  }

  function keyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!drawing.ready || finishing || confirmClear) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && ["z", "y"].includes(event.key.toLowerCase())) {
      event.preventDefault(); drawing.travel(event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo"); return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    const at = keyboardPoint ?? { x: canvas.width / 2, y: canvas.height / 2 };
    if (event.key === "Enter" || event.key === " ") { setKeyboardPoint(at); apply(at, -1); drawing.endStroke(-1); return; }
    const step = event.altKey ? 2 : 15;
    const next = { x: Math.max(0, Math.min(canvas.width - 1, at.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))), y: Math.max(0, Math.min(canvas.height - 1, at.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))) };
    setKeyboardPoint(next);
    if (event.shiftKey && (tool === "brush" || tool === "eraser")) { apply(at, -1); drawing.move(next, -1); drawing.endStroke(-1); }
  }

  async function finish() {
    drawing.endStroke();
    if (finishing || drawing.coverage <= 0) return;
    setFinishing(true); setFinishError("");
    try {
      await onFinish(Math.max(1, Math.round(drawing.coverage * 100)), Math.max(1, seconds.current), {
        scene: sceneId, coloredPercent: Math.round(drawing.coverage * 100), actions: drawing.marks(), result: "finished",
      });
    } catch {
      setFinishError("Your picture is saved on this device. The game couldn’t finish — please try again.");
    } finally { setFinishing(false); }
  }

  return <section className={styles.studio} aria-label="Coloring Adventures" aria-busy={finishing}>
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}><Palette size={26} strokeWidth={1.8} /></span>
        <div><p className={styles.eyebrow}>A LITTLE COLOR, A LITTLE WONDER</p><h2>Coloring Adventures<span className={styles.titleDot}>.</span></h2></div>
      </div>
      <div className={styles.headerActions}>
        <button type="button" className={styles.quietButton} disabled={finishing} onClick={() => { drawing.endStroke(); onExit(); }}><ArrowLeft size={16} /><span>Games</span></button>
        <button type="button" className={styles.finishButton} disabled={!drawing.ready || drawing.coverage <= 0 || finishing} onClick={() => void finish()}>{finishing ? <LoaderCircle size={17} className={styles.spinning} /> : <CheckCircle2 size={17} />}<span>{finishing ? "Finishing…" : "Finish picture"}</span></button>
      </div>
    </header>

    <div className={styles.intro}><span><Leaf size={14} /> {playerName}&apos;s art studio</span><p>No wrong colors. Just your imagination.</p></div>

    <div className={styles.workspace}>
      <nav className={styles.tools} aria-label="Coloring tools">
        <p className={styles.sectionLabel}>TOOLS</p>
        {TOOLS.map(({ id, icon: Icon, label }) => <button key={id} type="button" className={`${styles.tool} ${tool === id ? styles.activeTool : ""}`} aria-label={label} aria-pressed={tool === id} onClick={() => { drawing.endStroke(); setTool(id); }} disabled={finishing}>
          <Icon size={23} strokeWidth={1.7} /><span>{label}</span>
        </button>)}
        <span className={styles.toolDecoration} aria-hidden="true"><Sparkles size={23} /></span>
      </nav>

      <div className={styles.workbench}>
        <div className={styles.canvasToolbar}>
          <div className={styles.editActions}>
            <button type="button" title="Undo (⌘/Ctrl Z)" aria-label="Undo" disabled={!drawing.history.undo || finishing} onClick={() => drawing.travel("undo")}><Undo2 size={18} /></button>
            <button type="button" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo" disabled={!drawing.history.redo || finishing} onClick={() => drawing.travel("redo")}><Redo2 size={18} /></button>
            <span className={styles.toolbarDivider} />
            <button type="button" title="Start over" aria-label="Start over" disabled={!drawing.ready || drawing.coverage <= 0 || finishing} onClick={() => setConfirmClear(true)}><RotateCcw size={16} /></button>
          </div>
          <span className={styles.paperLabel}>YOUR LITTLE MASTERPIECE</span>
          <label className={styles.zoom}><ZoomIn size={16} /><span className={styles.srOnly}>Canvas zoom</span><select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={100}>100%</option><option value={150}>150%</option><option value={200}>200%</option><option value={300}>300%</option></select></label>
        </div>
        <div className={styles.viewport}>
          <div className={styles.paper} style={{ width: `${zoom}%` }}>
            <canvas ref={drawing.canvasRef} className={styles.canvas} data-ready={drawing.ready} data-tool={tool} aria-label={`${scene.title} coloring canvas`} aria-describedby={hintId} tabIndex={drawing.ready && !finishing && !confirmClear ? 0 : -1}
              onPointerDown={pointerDown} onPointerMove={(event) => drawing.move(point(event), event.pointerId)}
              onPointerUp={(event) => drawing.endStroke(event.pointerId)} onPointerCancel={(event) => drawing.endStroke(event.pointerId)} onLostPointerCapture={(event) => drawing.endStroke(event.pointerId)} onKeyDown={keyboard}
            >Use the bucket, brush, or patterns to color {scene.title}.</canvas>
            {keyboardPoint && drawing.canvasRef.current && <span className={styles.keyboardCursor} aria-hidden="true" style={{ left: `${keyboardPoint.x / drawing.canvasRef.current.width * 100}%`, top: `${keyboardPoint.y / drawing.canvasRef.current.height * 100}%` }} />}
          </div>
          {!drawing.ready && <div className={styles.loading}>{drawing.error ? <><Palette size={28} /><p role="alert">{drawing.error}</p><button type="button" className={styles.finishButton} onClick={drawing.retry}>Try again</button></> : <><LoaderCircle size={28} className={styles.spinning} /><p>Getting your picture ready…</p></>}</div>}
        </div>
        <div className={styles.canvasFooter}><span><span className={styles.liveDot} />{scene.title}</span><span className={styles.saveStatus} role="status">{drawing.status}</span></div>
        <div className={styles.toolHint} id={hintId}><toolInfo.icon size={17} /><span>{toolInfo.hint} <span className={styles.keyboardHint}>Keyboard: arrows to move, Enter to color. Hold Shift + arrows to brush; Alt for small steps.</span></span></div>
        {confirmClear && <div className={styles.clearPrompt} role="group" aria-label="Start over confirmation"><span>Start this picture again? You can undo this.</span><div><button type="button" className={styles.quietButton} onClick={() => setConfirmClear(false)}>Keep coloring</button><button type="button" className={styles.finishButton} onClick={() => { drawing.clear(); setConfirmClear(false); }}>Start fresh</button></div></div>}
        {(drawing.saveWarning || finishError) && <p className={styles.warning} role="alert">{finishError || drawing.saveWarning}</p>}
      </div>

      <aside className={styles.supplies} aria-label="Art supplies">
        <div className={styles.paletteHeading}><div><p className={styles.sectionLabel}>MAKE IT YOURS</p><h3>Your colors</h3></div><Palette size={19} /></div>
        <div className={styles.palette} role="group" aria-label="Color palette">{COLORING_COLORS.map((item) => <button key={item.name} type="button" aria-label={item.name} aria-pressed={color === item.hex} title={item.name} className={styles.swatch} style={{ "--paint": item.hex } as CSSProperties} onClick={() => setColor(item.hex)}>{color === item.hex && <Check size={18} strokeWidth={3} style={{ color: item.hex === "#ffffff" || item.name === "Sunshine" ? "#454e43" : "white" }} />}</button>)}</div>
        <label className={styles.customColor}><input type="color" aria-label="Custom color" value={color} onChange={(event) => setColor(event.target.value)} /><span><strong>{colorName}</strong><small>or mix your own color</small></span><ChevronRight size={15} /></label>

        <div className={styles.patternSection}><div className={styles.supplyLabel}><span>Play with patterns</span><Sparkles size={15} /></div><div className={styles.patterns}>{PATTERNS.map((item) => <button key={item.id} type="button" aria-label={`${item.label} pattern`} aria-pressed={tool === "pattern" && pattern === item.id} onClick={() => { setPattern(item.id); setTool("pattern"); }}><PatternPreview pattern={item.id} color={color} /><span>{item.label}</span></button>)}</div></div>

        <div className={styles.brushSection}><label className={styles.supplyLabel} htmlFor={`${hintId}-size`}><span>Brush size</span><span className={styles.sizeValue}>{size}px</span></label><div className={styles.sizeControl}><span className={styles.smallBrush} /><input id={`${hintId}-size`} type="range" min={6} max={80} step={2} value={size} onChange={(event) => setSize(Number(event.target.value))} /><span className={styles.largeBrush} /></div><label className={styles.stayInLines}><input type="checkbox" checked={stayInLines} onChange={(event) => setStayInLines(event.target.checked)} /><span>Stay inside the lines</span></label></div>

        <div className={styles.littleNote}><Star size={18} /><p>A purple monkey?<br />A rainbow river?<br /><strong>You&apos;re the artist.</strong></p></div>
        <button type="button" className={styles.downloadButton} disabled={!drawing.ready || finishing} onClick={() => drawing.download(scene.title)}><Download size={17} />Download picture</button>
        <p className={styles.localNote}>Progress saves on this device.</p>
      </aside>
    </div>

    <div className={styles.sceneHeading}><div><span className={styles.eyebrow}>THE JUNGLE COLLECTION</span><h3>Where will your colors go?</h3></div><span className={styles.sceneCount}>3 places to imagine <Leaf size={14} /></span></div>
    <div className={styles.scenes} role="group" aria-label="Choose a coloring scene">{COLORING_SCENES.map((item, index) => <button key={item.id} type="button" className={`${styles.sceneCard} ${item.id === sceneId ? styles.activeScene : ""}`} aria-label={item.title} aria-pressed={item.id === sceneId} onClick={() => selectScene(item.id)} disabled={finishing}>
      <div className={styles.sceneImage}><img src={item.image} alt="" loading="lazy" /><span className={styles.sceneNumber}>0{index + 1}</span>{item.id === sceneId && <span className={styles.sceneCheck}><Check size={15} /></span>}</div><div className={styles.sceneText}><strong>{item.title}</strong><span>{item.subtitle}</span></div>
    </button>)}</div>
    <footer className={styles.studioFooter}><span><Eye size={14} /> Look around. Find a little wonder.</span><span>Made for little imaginations <Sparkles size={13} /></span></footer>
  </section>;
}
