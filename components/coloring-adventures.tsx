"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Download, Eraser, Eye, Maximize, Minimize, Type, Images, Hand, Leaf, LoaderCircle, PaintBucket, Paintbrush, Palette, Pipette, Redo2, RotateCcw, Scan, Sparkles, Star, Undo2, X, ZoomIn } from "lucide-react";
import { COLORING_COLORS, COLORING_SCENES, COLORING_THEMES, type ColoringBrush, coloringPreferences, coloringStorageKey, type ColoringPattern, type ColoringSceneId, type ColoringTool } from "@/lib/coloring";
import { useColoringCanvas } from "./use-coloring-canvas";
import { drawColoringText } from "@/lib/coloring-text";
import styles from "./coloring-adventures.module.css";

const TOOLS = [
  { id: "bucket", label: "Bucket", icon: PaintBucket, shortcut: "F", hint: "Tap a shape to fill it with color." },
  { id: "brush", label: "Brush", icon: Paintbrush, shortcut: "B", hint: "Draw with your finger, mouse, or pen." },
  { id: "pattern", label: "Patterns", icon: Sparkles, shortcut: "P", hint: "Pick a pattern, then tap a shape." },
  { id: "eraser", label: "Eraser", icon: Eraser, shortcut: "E", hint: "Rub out color. Your outlines stay safe." },
  { id: "picker", label: "Pick color", icon: Pipette, shortcut: "I", hint: "Tap a painted area to pick its color." },
  { id: "pan", label: "Pan picture", icon: Hand, shortcut: "H", hint: "Zoom in, then drag to explore your picture. Your colors stay put." },
] as const;
type SupplyPanel = "colors" | "brush" | "patterns" | "text" | "picture";
const PANEL_TITLES = { colors: "Colors & palettes", brush: "Brush & eraser", patterns: "Patterns", text: "Style Text", picture: "Your creation" };
const PATTERNS: { id: ColoringPattern; label: string }[] = [{ id: "dots", label: "Dots" }, { id: "stripes", label: "Stripes" }, { id: "stars", label: "Stars" }, { id: "checks", label: "Checks" }, { id: "waves", label: "Waves" }, { id: "hearts", label: "Hearts" }, { id: "crosshatch", label: "Weave" }];

function TextPreview({ words, color, size, font, effect, outlineColor, outlineWidth }: { words: string; color: string; size: number; font: string; effect: string; outlineColor: string; outlineWidth: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, 320, 130); ctx.fillStyle = "#fffef8"; ctx.fillRect(0, 0, 320, 130);
    drawColoringText(ctx, { id: "preview", text: words.trim() || "Jungle magic!", x: 160, y: 65, color, size: size * .65, font, style: effect, outlineColor, outlineWidth: outlineWidth * .65 }, 320);
  }, [words, color, size, font, effect, outlineColor, outlineWidth]);
  return <canvas ref={ref} width={320} height={130} className={styles.textPreview} role="img" aria-label="Live text preview" />;
}

function PatternPreview({ pattern, color }: { pattern: ColoringPattern; color: string }) {
  return <span className={`${styles.patternPreview} ${styles[pattern]}`} style={{ "--paint": color } as CSSProperties} aria-hidden="true">
    {pattern === "stars" && <><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /><Star size={13} fill="currentColor" /></>}
  </span>;
}

async function savedColoringThumbnail(paintImage: string, outlinePath: string) {
  const paint = new Image(), outline = new Image();
  paint.src = paintImage; outline.src = outlinePath;
  await Promise.all([paint.decode(), outline.decode()]);
  if (paint.naturalWidth !== outline.naturalWidth || paint.naturalHeight !== outline.naturalHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = Math.round(320 * paint.naturalHeight / paint.naturalWidth);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(paint, 0, 0, canvas.width, canvas.height);
  if (!ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0)) return null;
  ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "multiply"; ctx.drawImage(outline, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", .8);
}

export function ColoringAdventures({ memberId, playerName, onExit, onFinish }: {
  memberId: string;
  playerName: string;
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void | Promise<void>;
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const [panel, setPanel] = useState<SupplyPanel>("colors");
  const [dockOpen, setDockOpen] = useState(false);
  const studioRef = useRef<HTMLElement>(null);
  const nativeFullScreen = useRef(false);
  const fullScreenButtonRef = useRef<HTMLButtonElement>(null);
  const [sceneId, setSceneId] = useState<ColoringSceneId>(COLORING_SCENES[0].id);
  const [tool, setTool] = useState<ColoringTool>("bucket");
  const [color, setColor] = useState<string>(COLORING_COLORS[4].hex);
  const [pattern, setPattern] = useState<ColoringPattern>("dots");
  const [brush, setBrush] = useState<ColoringBrush>("round");
  const [theme, setTheme] = useState("Jungle");
  const [pictureTitle, setPictureTitle] = useState("");
  const [titleLoaded, setTitleLoaded] = useState("");
  const [text, setText] = useState("");
  const [textFont, setTextFont] = useState("sans-serif");
  const [textStyle, setTextStyle] = useState("outline");
  const [textColor, setTextColor] = useState("#ed6464");
  const [outlineColor, setOutlineColor] = useState("#202d3a");
  const [outlineWidth, setOutlineWidth] = useState(8);
  const [movingText, setMovingText] = useState(false);
  const [textSize, setTextSize] = useState(56);
  const [placingText, setPlacingText] = useState(false);
  const [size, setSize] = useState(28);
  const [stayInLines, setStayInLines] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [confirmClear, setConfirmClear] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [keyboardPoint, setKeyboardPoint] = useState<{ x: number; y: number } | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Partial<Record<ColoringSceneId, string | null>>>({});
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const reviewRef = useRef<HTMLDialogElement>(null);
  const finishButtonRef = useRef<HTMLButtonElement>(null);
  const pan = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const lastPaintTool = useRef<ColoringTool>("bucket");
  const seconds = useRef(0);
  const scene = COLORING_SCENES.find((item) => item.id === sceneId)!;
  const drawing = useColoringCanvas(memberId, scene);
  const hintId = useId();
  const toolInfo = TOOLS.find((item) => item.id === tool)!;
  const displayTitle = pictureTitle.trim() || scene.title;
  const titleKey = `coloring-adventures:${encodeURIComponent(memberId)}:${sceneId}:title`;
  useEffect(() => {
    let title = "";
    try { title = localStorage.getItem(titleKey) ?? ""; } catch { /* Optional title. */ }
    setPictureTitle(title.slice(0, 80)); setTitleLoaded(titleKey); setPlacingText(false); setMovingText(false);
  }, [titleKey]);
  useEffect(() => {
    if (titleLoaded !== titleKey) return;
    try { localStorage.setItem(titleKey, pictureTitle); } catch { /* Artwork saving reports storage errors. */ }
  }, [titleKey, titleLoaded, pictureTitle]);
  function leaveFullScreen() {
    drawing.endStroke();
    if (document.fullscreenElement === studioRef.current) void document.exitFullscreen().catch(() => {});
    setFullScreen(false); setDockOpen(false);
    fullScreenButtonRef.current?.focus({ preventScroll: true });
  }
  async function enterFullScreen() {
    drawing.endStroke(); setFullScreen(true); setDockOpen(false); changeZoom(100);
    try {
      if (studioRef.current?.requestFullscreen) {
        await studioRef.current.requestFullscreen(); nativeFullScreen.current = true;
      }
    } catch { /* The viewport-sized workspace also works without browser fullscreen. */ }
  }
  useEffect(() => {
    if (!fullScreen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const changed = () => {
      if (nativeFullScreen.current && !document.fullscreenElement) {
        nativeFullScreen.current = false; setFullScreen(false); setDockOpen(false);
      }
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !reviewRef.current?.open) {
        setDockOpen(false); setFullScreen(false);
        if (document.fullscreenElement === studioRef.current) void document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("keydown", escape);
      nativeFullScreen.current = false;
      if (document.fullscreenElement === studioRef.current) void document.exitFullscreen().catch(() => {});
    };
  }, [fullScreen]);
  const colorName = COLORING_COLORS.find((item) => item.hex === color)?.name ?? "Custom color";

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem(`coloring-adventures:${encodeURIComponent(memberId)}:last-scene`);
      if (COLORING_SCENES.some((item) => item.id === saved)) setSceneId(saved as ColoringSceneId);
      const preferences = coloringPreferences(JSON.parse(localStorage.getItem(`coloring-adventures:${encodeURIComponent(memberId)}:preferences`) ?? "null"));
      setColor(preferences.color); setRecentColors(preferences.recentColors); setSize(preferences.size);
      setPattern(preferences.pattern); setStayInLines(preferences.stayInLines);
    } catch { /* Coloring also works when browser storage is disabled. */ }
    setPreferencesLoadedFor(memberId);
    const savedGallery: Partial<Record<ColoringSceneId, string | null>> = {};
    for (const item of COLORING_SCENES) {
      try {
        const saved = JSON.parse(localStorage.getItem(coloringStorageKey(memberId, item.id)) ?? "null");
        if (typeof saved?.thumbnail === "string" && saved.thumbnail.startsWith("data:image/") && saved.thumbnail.length < 300_000) savedGallery[item.id] = saved.thumbnail;
        else if (saved?.version === 1 && typeof saved.image === "string" && saved.image.startsWith("data:image/png;base64,") && saved.image.length < 6_000_000) {
          // Original saves predate gallery thumbnails. Build their preview without
          // rewriting the picture or overwriting edits made while images load.
          void savedColoringThumbnail(saved.image, item.image).then((thumbnail) => {
            if (!cancelled) setGallery((previous) => previous[item.id] === undefined ? { ...previous, [item.id]: thumbnail } : previous);
          }).catch(() => { /* The main canvas offers recovery for broken saves. */ });
        }
      } catch { /* A broken saved scene must not hide the other pictures. */ }
    }
    setGallery(savedGallery);
    return () => { cancelled = true; };
  }, [memberId]);

  useEffect(() => {
    if (preferencesLoadedFor !== memberId) return;
    try {
      localStorage.setItem(`coloring-adventures:${encodeURIComponent(memberId)}:preferences`, JSON.stringify({ color, recentColors, size, pattern, stayInLines }));
    } catch { /* Artwork saving reports storage errors separately. */ }
  }, [memberId, preferencesLoadedFor, color, recentColors, size, pattern, stayInLines]);

  useEffect(() => {
    if (!drawing.artwork) return;
    const { sceneId: savedScene, thumbnail, hasPaint } = drawing.artwork;
    setGallery((previous) => ({ ...previous, [savedScene]: hasPaint ? thumbnail : null }));
  }, [drawing.artwork]);

  useEffect(() => {
    if (!reviewImage) return;
    const dialog = reviewRef.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; finishButtonRef.current?.focus({ preventScroll: true }); };
  }, [reviewImage]);

  useEffect(() => {
    if (!drawing.ready || finishing || reviewImage) return;
    const timer = window.setInterval(() => { if (!document.hidden) seconds.current++; }, 1000);
    return () => window.clearInterval(timer);
  }, [drawing.ready, finishing, reviewImage]);

  function openPanel(next: SupplyPanel) { setPanel(next); setDockOpen(true); }
  function chooseTool(next: ColoringTool) {
    if (next === "brush" || next === "eraser") openPanel("brush");
    if (next === "bucket" || next === "picker") openPanel("colors");
    if (next === "pattern") openPanel("patterns");
    setPlacingText(false); setMovingText(false); drawing.endStroke(); pan.current = null;
    if (drawing.canvasRef.current) delete drawing.canvasRef.current.dataset.dragging;
    if (next === "bucket" || next === "brush" || next === "pattern") lastPaintTool.current = next;
    setTool(next);
    if (cursorRef.current) cursorRef.current.hidden = true;
  }

  function rememberColor(next: string) {
    setRecentColors((previous) => previous[0] === next ? previous : [next, ...previous.filter((item) => item !== next)].slice(0, 4));
  }

  function chooseColor(next: string) {
    drawing.endStroke(); setColor(next); rememberColor(next);
    if (tool === "eraser" || tool === "picker" || tool === "pan") chooseTool(lastPaintTool.current);
  }

  function changeZoom(next: number) {
    drawing.endStroke(); pan.current = null;
    const viewport = viewportRef.current;
    const paper = drawing.canvasRef.current;
    const before = paper?.getBoundingClientRect(), frame = viewport?.getBoundingClientRect();
    const anchor = before && frame && viewport ? { x: (frame.left + viewport.clientWidth / 2 - before.left) / before.width, y: (frame.top + viewport.clientHeight / 2 - before.top) / before.height } : null;
    setZoom(next);
    requestAnimationFrame(() => {
      if (!viewport || !paper) return;
      const padding = getComputedStyle(viewport);
      viewport.scrollLeft = next === 100 ? 0 : (anchor?.x ?? .5) * paper.clientWidth - viewport.clientWidth / 2 + Number.parseFloat(padding.paddingLeft);
      viewport.scrollTop = next === 100 ? 0 : (anchor?.y ?? .5) * paper.clientHeight - viewport.clientHeight / 2 + Number.parseFloat(padding.paddingTop);
    });
  }

  function selectScene(id: ColoringSceneId) {
    if (id === sceneId) return;
    drawing.endStroke(); pan.current = null; setSceneId(id); setConfirmClear(false); changeZoom(100); setKeyboardPoint(null);
    try { localStorage.setItem(`coloring-adventures:${encodeURIComponent(memberId)}:last-scene`, id); } catch { /* Optional preference. */ }
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * event.currentTarget.width, y: (event.clientY - rect.top) / rect.height * event.currentTarget.height };
  }

  function apply(at: { x: number; y: number }, pointerId: number) {
    if (placingText) {
      drawing.addText(at, text, textColor, textSize, textFont, textStyle, outlineColor, outlineWidth);
      setPlacingText(false); setMovingText(true); return;
    }
    const picked = drawing.dab(at, { tool, color, size, pattern, stayInLines, brush }, pointerId);
    if (picked) chooseColor(picked);
    else if (tool === "bucket" || tool === "brush" || tool === "pattern") rememberColor(color);
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.ready || finishing || confirmClear || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setKeyboardPoint(null);
    if (movingText && !placingText) { drawing.beginTextDrag(point(event)); return; }
    if (!placingText && tool === "pan" && viewportRef.current) {
      pan.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: viewportRef.current.scrollLeft, top: viewportRef.current.scrollTop };
      event.currentTarget.dataset.dragging = "true";
    } else apply(point(event), event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (movingText && !placingText) { drawing.moveTextDrag(point(event)); return; }
    const active = pan.current, viewport = viewportRef.current;
    if (active && active.pointerId === event.pointerId && viewport) {
      viewport.scrollLeft = active.left + active.x - event.clientX;
      viewport.scrollTop = active.top + active.y - event.clientY;
      return;
    }
    const at = point(event);
    if (cursorRef.current) {
      cursorRef.current.hidden = event.pointerType === "touch" || !drawing.ready || (tool !== "brush" && tool !== "eraser");
      cursorRef.current.style.left = `${at.x / event.currentTarget.width * 100}%`;
      cursorRef.current.style.top = `${at.y / event.currentTarget.height * 100}%`;
    }
    drawing.move(at, event.pointerId);
  }

  function pointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    if (pan.current?.pointerId === event.pointerId) pan.current = null;
    delete event.currentTarget.dataset.dragging;
    drawing.endStroke(event.pointerId);
  }

  function studioKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || finishing || reviewImage || confirmClear || (event.target as HTMLElement).closest("input, select, textarea")) return;
    if ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())) {
      event.preventDefault(); drawing.travel(event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo");
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      const next = TOOLS.find((item) => item.shortcut.toLowerCase() === event.key.toLowerCase());
      if (next) { event.preventDefault(); chooseTool(next.id); }
    }
  }

  function keyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!drawing.ready || finishing || confirmClear) return;
    if (event.key === "Escape") { setPlacingText(false); return; }
    if (movingText && !placingText && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); drawing.deleteSelectedText(); return; }
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && ["z", "y"].includes(event.key.toLowerCase())) {
      event.preventDefault(); drawing.travel(event.key.toLowerCase() === "y" || event.shiftKey ? "redo" : "undo"); return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    if (movingText && !placingText) {
      drawing.nudgeText(event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0, event.key === "ArrowUp" ? -5 : event.key === "ArrowDown" ? 5 : 0); return;
    }
    if (tool === "pan" && !placingText) {
      viewportRef.current?.scrollBy({ left: event.key === "ArrowLeft" ? -60 : event.key === "ArrowRight" ? 60 : 0, top: event.key === "ArrowUp" ? -60 : event.key === "ArrowDown" ? 60 : 0 });
      return;
    }
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
        scene: sceneId, title: displayTitle, coloredPercent: Math.round(drawing.coverage * 100), actions: drawing.marks(), result: "finished",
      });
    } catch {
      setFinishError("We couldn’t finish the game. Your picture is still here — try again or download a copy.");
    } finally { setFinishing(false); }
  }

  return <section ref={studioRef} className={`${styles.studio} ${fullScreen ? styles.fullScreen : ""}`} style={{ "--canvas-zoom": zoom / 100 } as CSSProperties} data-fullscreen={fullScreen} aria-label="Coloring Adventures" aria-busy={finishing} onKeyDown={studioKeyboard}>
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}><Palette size={26} strokeWidth={1.8} /></span>
        <div><p className={styles.eyebrow}>A LITTLE COLOR, A LITTLE WONDER</p><h2>Coloring Adventures<span className={styles.titleDot}>.</span></h2></div>
      </div>
      <div className={styles.headerActions}>
        <button ref={fullScreenButtonRef} type="button" className={styles.quietButton} aria-label="Enter full screen" disabled={finishing} onClick={() => void enterFullScreen()}><Maximize size={18} /><span>Full screen</span></button>
        <button type="button" className={styles.quietButton} disabled={finishing} onClick={() => { drawing.endStroke(); onExit(); }}><ArrowLeft size={16} /><span>Games</span></button>
        <button ref={finishButtonRef} type="button" className={styles.finishButton} disabled={!drawing.ready || drawing.coverage <= 0 || finishing} onClick={() => { drawing.endStroke(); setFinishError(""); setReviewImage(drawing.canvasRef.current?.toDataURL("image/png") ?? null); }}><CheckCircle2 size={17} /><span>Finish picture</span></button>
      </div>
    </header>

    <div className={styles.intro}><span><Leaf size={14} /> {playerName}&apos;s art studio</span><p>No wrong colors. Just your imagination.</p></div>

    <div className={styles.workspace}>
      <nav className={styles.tools} aria-label="Coloring tools">
        <p className={styles.sectionLabel}>TOOLS</p>
        {TOOLS.map(({ id, icon: Icon, label, shortcut }) => <button key={id} type="button" className={`${styles.tool} ${tool === id ? styles.activeTool : ""}`} aria-label={label} title={`${label} (${shortcut})`} aria-keyshortcuts={shortcut} aria-pressed={tool === id} onClick={() => chooseTool(id)} disabled={finishing}>
          <Icon size={23} strokeWidth={1.7} /><span>{label}</span>
        </button>)}
        {([{ id: "colors", label: "Colors", icon: Palette }, { id: "text", label: "Text", icon: Type }, { id: "picture", label: "Picture", icon: Images }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`${styles.tool} ${panel === id ? styles.activeTool : ""}`} aria-label={label} title={label} aria-pressed={panel === id} aria-controls={`${hintId}-supplies`} onClick={() => openPanel(id)}><Icon size={23} /><span>{label}</span></button>)}
        {fullScreen && <>
          <button type="button" className={styles.tool} aria-label="Exit full screen" title="Exit full screen" onClick={leaveFullScreen}><Minimize size={23} /><span>Exit full screen</span></button>
        </>}
        <span className={styles.toolDecoration} aria-hidden="true"><Sparkles size={23} /></span>
      </nav>

      <div className={styles.workbench}>
        <label className={styles.pictureTitleControl}>Picture title<input aria-label="Picture title" maxLength={80} value={pictureTitle} placeholder={scene.title} onChange={(event) => setPictureTitle(event.target.value)} /></label>

        <div className={styles.quickColors} role="group" aria-label="Quick colors">
          <span className={styles.quickLabel}>COLORS</span><div>{[...COLORING_COLORS.map((item) => item.hex as string), ...recentColors.filter((hex) => !COLORING_COLORS.some((item) => item.hex === hex))].map((hex) => <button key={hex} type="button" aria-label={`Quick ${COLORING_COLORS.find((item) => item.hex === hex)?.name ?? hex}`} aria-pressed={color === hex} onClick={() => chooseColor(hex)} style={{ "--paint": hex } as CSSProperties}>{color === hex && <Check size={16} />}</button>)}</div>
        </div>
        <div className={styles.canvasToolbar}>
          <div className={styles.editActions}>
            <button type="button" title="Undo (⌘/Ctrl Z)" aria-label="Undo" disabled={!drawing.history.undo || finishing} onClick={() => drawing.travel("undo")}><Undo2 size={18} /></button>
            <button type="button" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo" disabled={!drawing.history.redo || finishing} onClick={() => drawing.travel("redo")}><Redo2 size={18} /></button>
            <span className={styles.toolbarDivider} />
            <button type="button" title="Start over" aria-label="Start over" disabled={!drawing.ready || drawing.coverage <= 0 || finishing} onClick={() => setConfirmClear(true)}><RotateCcw size={16} /></button>
          </div>
          <span className={styles.paperLabel}>YOUR LITTLE MASTERPIECE</span>
          <div className={styles.viewActions}><button type="button" className={styles.fitButton} aria-label="Fit picture" title="Fit picture" onClick={() => changeZoom(100)} disabled={zoom === 100}><Scan size={17} /></button><label className={styles.zoom}><ZoomIn size={16} /><span className={styles.srOnly}>Canvas zoom</span><select aria-label="Canvas zoom" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))}><option value={100}>100%</option><option value={150}>150%</option><option value={200}>200%</option><option value={300}>300%</option></select></label></div>
        </div>
        <div ref={viewportRef} className={styles.viewport} data-testid="coloring-viewport">
          <div className={styles.paper} style={{ width: `${zoom}%` }}>
            <canvas ref={drawing.canvasRef} className={styles.canvas} data-ready={drawing.ready} data-tool={movingText && !placingText ? "text-move" : tool} aria-label={`${scene.title} coloring canvas`} aria-describedby={hintId} tabIndex={drawing.ready && !finishing && !confirmClear ? 0 : -1}
              onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerLeave={() => { if (cursorRef.current) cursorRef.current.hidden = true; }}
              onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onKeyDown={keyboard}
            >Use the bucket, brush, or patterns to color {scene.title}.</canvas>
            <span ref={cursorRef} hidden className={`${styles.brushCursor} ${tool === "eraser" ? styles.eraserCursor : ""}`} style={{ width: `${size * (tool === "brush" && brush === "pencil" ? .3 : tool === "brush" && brush === "ribbon" ? .65 : 1) / 1280 * 100}%`, "--paint": color } as CSSProperties} aria-hidden="true" />
            {keyboardPoint && drawing.canvasRef.current && <span className={styles.keyboardCursor} aria-hidden="true" style={{ left: `${keyboardPoint.x / drawing.canvasRef.current.width * 100}%`, top: `${keyboardPoint.y / drawing.canvasRef.current.height * 100}%` }} />}
          </div>
          {!drawing.ready && <div className={styles.loading}>{drawing.error ? <><Palette size={28} /><p role="alert">{drawing.error}</p><button type="button" className={styles.finishButton} onClick={drawing.retry}>Try again</button></> : <><LoaderCircle size={28} className={styles.spinning} /><p>Getting your picture ready…</p></>}</div>}
        </div>
        <div className={styles.canvasFooter}><span><span className={styles.liveDot} />{displayTitle}</span><span className={styles.saveStatus} role="status">{drawing.status}</span></div>
        <div className={styles.toolHint} id={hintId}><toolInfo.icon size={17} /><span>{placingText ? "Tap your picture to place the text. Press Escape to cancel. Undo removes it." : movingText ? "Drag a text label to reposition it. Arrow keys adjust it. Pan picture moves the zoomed view." : toolInfo.hint} <span className={styles.keyboardHint}>{tool === "pan" ? "Arrow keys move around the picture. Fit picture brings it all back." : "Arrows to move, Enter to color. Shift + arrows to brush; Alt for small steps. B brush · F fill · H move."}</span></span></div>
        {confirmClear && <div className={styles.clearPrompt} role="group" aria-label="Start over confirmation"><span>Start this picture again? You can undo this.</span><div><button type="button" className={styles.quietButton} onClick={() => setConfirmClear(false)}>Keep coloring</button><button type="button" className={styles.finishButton} onClick={() => { drawing.clear(); setConfirmClear(false); }}>Start fresh</button></div></div>}
        {drawing.saveWarning && <p className={styles.warning} role="alert">{drawing.saveWarning}</p>}
      </div>

      <aside id={`${hintId}-supplies`} className={`${styles.supplies} ${dockOpen ? styles.dockOpen : ""}`} aria-label="Art supplies" data-panel={panel}>
        <div className={styles.dockHeader}><strong>{PANEL_TITLES[panel]}</strong>{fullScreen && <button type="button" aria-label="Close editing dock" onClick={() => setDockOpen(false)}><X size={20} /></button>}</div>
        <div className={styles.supplyPanel} hidden={panel !== "colors"}>
        <div className={styles.creativeSection}><label className={styles.supplyField}>Themed palette<select aria-label="Themed palette" value={theme} onChange={(event) => setTheme(event.target.value)}>{COLORING_THEMES.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><div className={styles.themeColors}>{COLORING_THEMES.find((item) => item.name === theme)!.colors.map((hex) => <button key={hex} type="button" aria-label={`${theme} ${hex}`} title={hex} style={{ background: hex }} onClick={() => chooseColor(hex)} aria-pressed={color === hex} />)}</div></div>
        <div className={styles.paletteHeading}><div><p className={styles.sectionLabel}>MAKE IT YOURS</p><h3>Your colors</h3></div><Palette size={19} /></div>
        <div className={styles.palette} role="group" aria-label="Color palette">{COLORING_COLORS.map((item) => <button key={item.name} type="button" aria-label={item.name} aria-pressed={color === item.hex} title={item.name} className={styles.swatch} style={{ "--paint": item.hex } as CSSProperties} onClick={() => chooseColor(item.hex)}>{color === item.hex && <Check size={18} strokeWidth={3} style={{ color: item.hex === "#ffffff" || item.name === "Sunshine" ? "#454e43" : "white" }} />}</button>)}</div>
        <label className={styles.customColor}><input type="color" aria-label="Custom color" value={color} onChange={(event) => chooseColor(event.target.value)} /><span><strong>{colorName}</strong><small>or mix your own color</small></span><ChevronRight size={15} /></label>
        {recentColors.length > 0 && <div className={styles.recentColors}><p className={styles.supplyLabel}>Your recent colors</p><div role="group" aria-label="Recent colors">{recentColors.map((hex) => <button key={hex} type="button" aria-label={`Recent ${hex}`} title={hex} aria-pressed={color === hex} style={{ "--paint": hex } as CSSProperties} onClick={() => chooseColor(hex)}>{color === hex && <Check size={14} />}</button>)}</div></div>}

        </div><div className={styles.supplyPanel} hidden={panel !== "patterns"}>
        <div className={styles.patternSection}><div className={styles.supplyLabel}><span>Play with patterns</span><Sparkles size={15} /></div><div className={styles.patterns}>{PATTERNS.map((item) => <button key={item.id} type="button" aria-label={`${item.label} pattern`} aria-pressed={tool === "pattern" && pattern === item.id} onClick={() => { setPattern(item.id); chooseTool("pattern"); }}><PatternPreview pattern={item.id} color={color} /><span>{item.label}</span></button>)}</div></div>

        </div><div className={styles.supplyPanel} hidden={panel !== "brush"}>
        <label className={styles.supplyField}>Brush style<select aria-label="Brush style" value={brush} onChange={(event) => { setBrush(event.target.value as ColoringBrush); chooseTool("brush"); }}><option value="round">Round brush</option><option value="marker">Soft marker</option><option value="pencil">Sketch pencil</option><option value="ribbon">Ribbon brush</option></select></label>
        <div className={styles.brushSection}><label className={styles.supplyLabel} htmlFor={`${hintId}-size`}><span>Brush size</span><span className={styles.sizeValue} aria-hidden="true">{size}px</span></label><div className={styles.sizeControl}><span className={styles.smallBrush} /><input id={`${hintId}-size`} type="range" aria-label="Brush size" aria-valuetext={`${size} pixels`} min={6} max={80} step={2} value={size} onChange={(event) => setSize(Number(event.target.value))} /><span className={styles.largeBrush} /></div><label className={styles.stayInLines}><input type="checkbox" checked={stayInLines} onChange={(event) => setStayInLines(event.target.checked)} /><span>Stay inside the lines</span></label></div>

        </div><div className={styles.supplyPanel} hidden={panel !== "text"}>
        <div className={styles.creativeSection}><h3 className={styles.supplyLabel}>Style Text</h3><label className={styles.supplyField}>Your words<input aria-label="Style Text words" value={text} maxLength={80} placeholder="My jungle adventure!" onChange={(event) => setText(event.target.value)} /></label><label className={styles.supplyField}>Lettering<select aria-label="Text font" value={textFont} onChange={(event) => setTextFont(event.target.value)}><option value="sans-serif">Playful bold</option><option value="serif">Storybook</option><option value="cursive">Handwritten</option><option value="monospace">Typewriter</option></select></label><label className={styles.supplyField}>Text effect<select aria-label="Text effect" value={textStyle} onChange={(event) => setTextStyle(event.target.value)}><option value="outline">Bold outline</option><option value="shadow">Drop shadow</option><option value="plain">Solid lettering</option><option value="glow">Neon glow</option><option value="sparkle">Bedazzled sparkles</option></select></label><label className={styles.supplyField}>Text color<input type="color" aria-label="Text color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label><label className={styles.supplyField}>Outline / glow color<input type="color" aria-label="Text outline color" value={outlineColor} onChange={(event) => setOutlineColor(event.target.value)} /></label><label className={styles.supplyField}>Outline thickness: {outlineWidth}px<input type="range" aria-label="Text outline thickness" min={0} max={24} step={1} value={outlineWidth} onChange={(event) => setOutlineWidth(Number(event.target.value))} /></label><TextPreview words={text} color={textColor} size={textSize} font={textFont} effect={textStyle} outlineColor={outlineColor} outlineWidth={outlineWidth} /><label className={styles.supplyField}>Text size<input aria-label="Text size" type="range" min={20} max={120} step={4} value={textSize} onChange={(event) => setTextSize(Number(event.target.value))} /></label><button type="button" className={styles.downloadButton} disabled={!text.trim() || !drawing.ready} aria-pressed={placingText} onClick={() => { drawing.endStroke(); setPlacingText(!placingText); if (fullScreen) setDockOpen(false); }}>{placingText ? "Cancel text placement" : "Place text on picture"}</button><button type="button" className={styles.downloadButton} aria-pressed={movingText} onClick={() => { drawing.endStroke(); setPlacingText(false); setMovingText(!movingText); if (fullScreen) setDockOpen(false); }}>Move text</button><label className={styles.supplyField}>Select a text box<select aria-label="Select text box" value={drawing.selectedTextId ?? ""} onChange={(event) => drawing.selectText(event.target.value)} disabled={!drawing.textLabels.length}><option value="">Choose a text box</option>{drawing.textLabels.map((label, index) => <option key={label.id} value={label.id}>{index + 1}. {label.text}</option>)}</select></label><button type="button" className={styles.deleteTextButton} disabled={!drawing.selectedTextId || finishing} onClick={drawing.deleteSelectedText}>Delete selected text</button><p className={styles.localNote}>New text stays movable after saving. Select a text box above, or use Move text and tap a label. Delete selected text removes only that box; Undo restores it.</p></div>
        </div><div className={styles.supplyPanel} hidden={panel !== "picture"}>
        <label className={styles.supplyField}>Picture title<input aria-label="Dock picture title" maxLength={80} value={pictureTitle} placeholder={scene.title} onChange={(event) => setPictureTitle(event.target.value)} /></label><label className={styles.supplyField}>Scene<select aria-label="Dock scene" value={sceneId} onChange={(event) => { selectScene(event.target.value as ColoringSceneId); setDockOpen(false); }}>{COLORING_SCENES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <div className={styles.creationSummary} aria-label="Artwork description"><h3>{displayTitle}</h3><p>{scene.description}</p>{drawing.artwork?.sceneId === sceneId && <img src={drawing.artwork.thumbnail} alt="Current artwork preview" />}<p>{Math.round(drawing.coverage * 100)}% colored · {drawing.textLabels.length} text {drawing.textLabels.length === 1 ? "box" : "boxes"}</p>{drawing.paintColors.length > 0 && <div className={styles.paintSummary}><span>Main paint colors</span>{drawing.paintColors.map((hex) => <span key={hex} title={hex} aria-label={`Paint color ${hex}`} style={{ background: hex }} />)}</div>}{drawing.textLabels.length > 0 && <p>Lettering: {drawing.textLabels.map((label) => `“${label.text}”`).join(", ")}</p>}</div>
        <button type="button" className={styles.downloadButton} disabled={!drawing.ready || finishing} onClick={() => drawing.download(displayTitle)}><Download size={17} />Download picture</button>
        <p className={styles.localNote}>Progress saves on this device.</p></div>
      </aside>
    </div>

    <div className={styles.sceneHeading}><div><span className={styles.eyebrow}>THE JUNGLE COLLECTION</span><h3>Where will your colors go?</h3></div><span className={styles.sceneCount}>{COLORING_SCENES.length} places to imagine <Leaf size={14} /></span></div>
    <div className={styles.scenes} role="group" aria-label="Choose a coloring scene">{COLORING_SCENES.map((item, index) => <button key={item.id} type="button" className={`${styles.sceneCard} ${item.id === sceneId ? styles.activeScene : ""}`} aria-label={item.title} aria-pressed={item.id === sceneId} onClick={() => selectScene(item.id)} disabled={finishing}>
      <div className={styles.sceneImage} data-painted={!!gallery[item.id]}><img src={gallery[item.id] || item.image} alt={gallery[item.id] ? `Your colored ${item.title} picture` : ""} loading="lazy" /><span className={styles.sceneNumber}>0{index + 1}</span>{item.id === sceneId && <span className={styles.sceneCheck}><Check size={15} /></span>}</div><div className={styles.sceneText}><strong>{item.title}</strong><span>{item.subtitle}</span><small className={styles.sceneProgress}>{gallery[item.id] ? <><span /> Continue coloring</> : "A fresh adventure"}</small></div>
    </button>)}</div>
    <footer className={styles.studioFooter}><span><Eye size={14} /> Look around. Find a little wonder.</span><span>Made for little imaginations <Sparkles size={13} /></span></footer>
    <dialog ref={reviewRef} className={styles.reviewDialog} aria-labelledby={`${hintId}-review`} onCancel={(event) => { if (finishing) event.preventDefault(); else setReviewImage(null); }}>
      <button type="button" className={styles.closeReview} aria-label="Close picture preview" disabled={finishing} onClick={() => setReviewImage(null)}><X size={20} /></button>
      <span className={styles.reviewStar} aria-hidden="true"><Sparkles size={29} /></span>
      <p className={styles.eyebrow}>A LITTLE IMAGINATION, ALL YOUR OWN</p><h3 id={`${hintId}-review`}>Look what you made!</h3>
      <p className={styles.reviewCredit}>{displayTitle} <span>by {playerName}</span></p>
      {reviewImage && <div className={styles.reviewFrame}><img src={reviewImage} alt={`Your finished ${scene.title} picture`} /></div>}
      <p className={styles.reviewNote}>{drawing.saveWarning ? "Download a copy to keep your colors safe." : "Your colors are saved on this device. Keep a copy to show someone you love."}</p>
      <button type="button" className={styles.reviewDownload} onClick={() => drawing.download(displayTitle)}><Download size={18} />Download PNG</button>
      {finishError && <p className={styles.warning} role="alert">{finishError}</p>}
      <div className={styles.reviewActions}><button type="button" className={styles.quietButton} disabled={finishing} onClick={() => setReviewImage(null)}>Keep coloring</button><button type="button" className={styles.finishButton} disabled={finishing} onClick={() => void finish()}>{finishing ? <LoaderCircle size={17} className={styles.spinning} /> : <CheckCircle2 size={17} />}{finishing ? "Saving…" : "Save & return to games"}</button></div>
    </dialog>
  </section>;
}
