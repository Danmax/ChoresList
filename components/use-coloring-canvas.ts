"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  coloringCoverage, coloringRegionAt, coloringStorageKey, createColoringRegions, fillColoringRegion, hexToRgb,
  type ColoringBrush, type ColoringPattern, type ColoringRegions, type ColoringSceneId, type ColoringTool,
} from "@/lib/coloring";

import { coloringTextFont, drawColoringText, restoreColoringTexts, textBounds, type ColoringText } from "@/lib/coloring-text";

import { generateStarterColors, type StarterColorStyle } from "@/lib/coloring-starter";

import type { PatternSettings } from "@/lib/coloring-supplies";

type Snapshot = { pixels: ImageData; texts: ColoringText[] };
type Point = { x: number; y: number };
type Editor = {
  paint: HTMLCanvasElement;
  ink: HTMLImageElement;
  ctx: CanvasRenderingContext2D;
  regions: ColoringRegions;
  undo: Snapshot[];
  redo: Snapshot[];
  texts: ColoringText[];
  marks: number;
  thumbnail: string;
  coverage: number;
};
type Stroke = { pointerId: number; before: Snapshot; last: Point };
type BrushOptions = { tool: ColoringTool; color: string; size: number; pattern: ColoringPattern; stayInLines: boolean; brush?: ColoringBrush; patternSettings?: PatternSettings };
const HISTORY_LIMIT = 12;

function different(a: ImageData, b: ImageData) {
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return true;
  return false;
}

function regionPath(regions: ColoringRegions, id: number) {
  const path = new Path2D();
  const bounds = regions.bounds[id];
  for (let y = bounds.top; y <= bounds.bottom; y++) {
    let x = bounds.left;
    while (x <= bounds.right) {
      if (regions.labels[y * regions.width + x] !== id) { x++; continue; }
      const start = x++;
      while (x <= bounds.right && regions.labels[y * regions.width + x] === id) x++;
      path.rect(start, y, x - start, 1);
    }
  }
  return path;
}

export function useColoringCanvas(memberId: string, scene: { id: ColoringSceneId; image: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editor = useRef<Editor | null>(null);
  const textDrag = useRef<{ index: number; dx: number; dy: number; before: Snapshot } | null>(null);
  const selectedText = useRef<number | null>(null);
  const stroke = useRef<Stroke | null>(null);
  const [textLabels, setTextLabels] = useState<{ id: string; text: string }[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [paintColors, setPaintColors] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saveWarning, setSaveWarning] = useState("");
  const [status, setStatus] = useState("Getting your picture ready…");
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [coverage, setCoverage] = useState(0);
  const [reload, setReload] = useState(0);
  const [artwork, setArtwork] = useState<{ sceneId: ColoringSceneId; thumbnail: string; hasPaint: boolean } | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current, current = editor.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !current || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(current.paint, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(current.ink, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    current.texts.forEach((item) => drawColoringText(ctx, item, canvas.width));
  }, []);

  const persist = useCallback(() => {
    const current = editor.current;
    if (!current) return;
    try {
      localStorage.setItem(coloringStorageKey(memberId, scene.id), JSON.stringify({
        version: 1, width: current.paint.width, height: current.paint.height,
        image: current.paint.toDataURL("image/png"), texts: current.texts, marks: current.marks,
        thumbnail: current.coverage > 0 ? current.thumbnail : null,
      }));
      setSaveWarning("");
      setStatus("Saved on this device");
    } catch {
      setSaveWarning("This browser couldn’t save your progress. Download your picture to keep it.");
      setStatus("Picture is ready to download");
    }
  }, [memberId, scene.id]);

  const refresh = useCallback(() => {
    const current = editor.current;
    if (!current) return;
    setHistory({ undo: current.undo.length, redo: current.redo.length });
    setTextLabels(current.texts.map(({ id, text }) => ({ id, text })));
    setSelectedTextId(selectedText.current === null ? null : current.texts[selectedText.current]?.id ?? null);
    const painted = current.ctx.getImageData(0, 0, current.paint.width, current.paint.height);
    current.coverage = coloringCoverage(painted, current.regions);
    const colors = new Map<string, number>();
    for (let i = 0; i < painted.data.length; i += 16) if (painted.data[i + 3] > 128) {
      const hex = `#${((1 << 24) + (painted.data[i] << 16) + (painted.data[i + 1] << 8) + painted.data[i + 2]).toString(16).slice(1)}`;
      colors.set(hex, (colors.get(hex) ?? 0) + 1);
    }
    setPaintColors([...colors].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hex]) => hex));
    if (current.texts.length) current.coverage = Math.max(.01, current.coverage);
    setCoverage(current.coverage);
    render();
    const canvas = canvasRef.current;
    if (canvas) {
      const thumbnail = document.createElement("canvas");
      thumbnail.width = 320; thumbnail.height = Math.round(320 * canvas.height / canvas.width);
      thumbnail.getContext("2d")?.drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
      current.thumbnail = thumbnail.toDataURL("image/webp", .8);
      setArtwork({ sceneId: scene.id, thumbnail: current.thumbnail, hasPaint: current.coverage > 0 });
    }
  }, [render, scene.id]);

  const commit = useCallback((before: Snapshot) => {
    const current = editor.current;
    if (!current) return;
    const after = current.ctx.getImageData(0, 0, current.paint.width, current.paint.height);
    if (!different(before.pixels, after) && JSON.stringify(before.texts) === JSON.stringify(current.texts)) return;
    current.undo.push(before);
    if (current.undo.length > HISTORY_LIMIT) current.undo.shift();
    current.redo = [];
    current.marks++;
    refresh();
    persist();
  }, [refresh, persist]);

  const endStroke = useCallback((pointerId?: number) => {
    const current = editor.current, active = stroke.current;
    if (current && textDrag.current) {
      const before = textDrag.current.before; textDrag.current = null; commit(before);
    }
    if (!current || !active || (pointerId !== undefined && active.pointerId !== pointerId)) return;
    current.ctx.restore();
    stroke.current = null;
    commit(active.before);
  }, [commit]);

  useEffect(() => {
    let cancelled = false;
    setPaintColors([]); setTextLabels([]); setSelectedTextId(null);
    setReady(false); setError(""); setSaveWarning(""); setCoverage(0);
    setHistory({ undo: 0, redo: 0 }); setStatus("Getting your picture ready…");
    editor.current = null;
    stroke.current = null; textDrag.current = null; selectedText.current = null;
    async function load() {
      try {
        const ink = new Image();
        ink.src = scene.image;
        await ink.decode();
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = ink.naturalWidth; canvas.height = ink.naturalHeight;
        const paint = document.createElement("canvas");
        paint.width = canvas.width; paint.height = canvas.height;
        const ctx = paint.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(ink, 0, 0);
        const regions = createColoringRegions(ctx.getImageData(0, 0, paint.width, paint.height));
        ctx.clearRect(0, 0, paint.width, paint.height);
        const current: Editor = { paint, ink, ctx, regions, undo: [], redo: [], texts: [], marks: 0, thumbnail: "", coverage: 0 };
        let restored = false;
        try {
          const raw = localStorage.getItem(coloringStorageKey(memberId, scene.id));
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved.version !== 1 || saved.width !== paint.width || saved.height !== paint.height || typeof saved.image !== "string" || !saved.image.startsWith("data:image/png;base64,") || saved.image.length > 6_000_000) throw new Error("Invalid saved picture");
            const image = new Image();
            image.src = saved.image;
            await image.decode();
            if (cancelled) return;
            if (image.naturalWidth !== paint.width || image.naturalHeight !== paint.height) throw new Error("Invalid saved size");
            ctx.drawImage(image, 0, 0);
            current.texts = restoreColoringTexts(saved.texts);
            current.marks = Number.isSafeInteger(saved.marks) && saved.marks >= 0 ? saved.marks : 0;
            restored = true;
          }
        } catch {
          if (!cancelled) setSaveWarning("Saved progress couldn’t be opened. You can start a new picture or download this one.");
        }
        await Promise.all(current.texts.map((item) => document.fonts.load(coloringTextFont(item.font, item.size))));
        if (cancelled) return;
        editor.current = current;
        refresh();
        setReady(true);
        setStatus(restored ? "Your saved picture is ready" : "Pick a color and make it yours");
      } catch {
        if (!cancelled) { setError("Your picture couldn’t load. Please try again."); setStatus("Picture unavailable"); }
      }
    }
    void load();
    // Finish a captured stroke before leaving the scene or page.
    const finish = () => endStroke();
    window.addEventListener("pagehide", finish);
    window.addEventListener("blur", finish);
    return () => {
      cancelled = true;
      endStroke();
      editor.current = null;
      window.removeEventListener("pagehide", finish);
      window.removeEventListener("blur", finish);
    };
  }, [memberId, scene.id, scene.image, reload, refresh, endStroke]);

  function dab(point: Point, options: BrushOptions, pointerId: number): string | undefined {
    const current = editor.current;
    if (!current || stroke.current || options.tool === "pan") return;
    const { ctx, paint, regions } = current;
    const id = coloringRegionAt(regions, point.x, point.y);
    if (options.tool === "picker") {
      if (id < 1) { setStatus("Choose a color inside a shape"); return; }
      const pixel = ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;
      setStatus("Color picked — try it in another shape");
      return pixel[3] ? `#${Array.from(pixel.slice(0, 3)).map((n) => n.toString(16).padStart(2, "0")).join("")}` : "#ffffff";
    }
    if (id < 1 && (options.stayInLines || options.tool === "bucket" || options.tool === "pattern")) {
      setStatus("Tap inside a shape to color it"); return;
    }
    const before = { pixels: ctx.getImageData(0, 0, paint.width, paint.height), texts: structuredClone(current.texts) };
    if (options.tool === "bucket" || options.tool === "pattern") {
      const pixels = ctx.getImageData(0, 0, paint.width, paint.height);
      if (fillColoringRegion(pixels, regions, id, hexToRgb(options.color), options.tool === "pattern" ? options.pattern : undefined, options.patternSettings)) {
        ctx.putImageData(pixels, 0, 0); commit(before);
      }
      return;
    }
    ctx.save();
    if (options.stayInLines && id > 0) ctx.clip(regionPath(regions, id));
    const erase = options.tool === "eraser";
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.fillStyle = options.color; ctx.strokeStyle = options.color;
    const style = erase ? "round" : options.brush ?? "round";
    ctx.globalAlpha = style === "marker" ? .3 : 1;
    ctx.lineWidth = options.size * (style === "pencil" ? .3 : style === "ribbon" ? .65 : 1);
    ctx.lineCap = style === "ribbon" ? "square" : "round"; ctx.lineJoin = "round";
    if (style === "pencil") ctx.setLineDash([1, 3]);
    ctx.beginPath(); ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill();
    stroke.current = { pointerId, before, last: point };
    render();
  }

  function move(point: Point, pointerId: number) {
    const current = editor.current, active = stroke.current;
    if (!current || !active || active.pointerId !== pointerId) return;
    current.ctx.beginPath(); current.ctx.moveTo(active.last.x, active.last.y);
    current.ctx.lineTo(point.x, point.y); current.ctx.stroke();
    active.last = point;
    render();
  }

  function snapshot(current: Editor): Snapshot {
    return { pixels: current.ctx.getImageData(0, 0, current.paint.width, current.paint.height), texts: structuredClone(current.texts) };
  }
  function addText(point: Point, text: string, color: string, size: number, font: string, style: string, outlineColor = "#202d3a", outlineWidth = 8) {
    endStroke(); const current = editor.current;
    if (!current || !text.trim() || current.texts.length >= 50) return;
    const fontSpec = coloringTextFont(font, size);
    if (!document.fonts.check(fontSpec)) {
      setStatus("Loading your lettering…");
      void document.fonts.load(fontSpec).then(() => {
        if (editor.current === current) addText(point, text, color, size, font, style, outlineColor, outlineWidth);
      }).catch(() => setStatus("Lettering couldn’t load. Please choose another style."));
      return;
    }
    const before = snapshot(current);
    current.texts.push({ id: crypto.randomUUID(), text: text.trim().slice(0, 80), x: Math.max(30, Math.min(current.paint.width - 30, point.x)), y: Math.max(size, Math.min(current.paint.height - size, point.y)), color, size, font, style, outlineColor, outlineWidth });
    selectedText.current = current.texts.length - 1; commit(before);
  }
  function beginTextDrag(point: Point) {
    endStroke(); const current = editor.current;
    if (!current) return;
    for (let index = current.texts.length - 1; index >= 0; index--) {
      const item = current.texts[index], bounds = textBounds(current.ctx, item, current.paint.width);
      if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
        selectedText.current = index; setSelectedTextId(item.id);
        textDrag.current = { index, dx: item.x - point.x, dy: item.y - point.y, before: snapshot(current) };
        setStatus("Drag your text to move it. Arrow keys make small adjustments."); return;
      }
    }
    selectedText.current = null; setSelectedTextId(null);
    setStatus("Drag a text label to move it. Pan picture moves the zoomed view.");
  }
  function moveTextDrag(point: Point) {
    const current = editor.current, drag = textDrag.current;
    if (!current || !drag) return;
    const item = current.texts[drag.index];
    item.x = Math.max(30, Math.min(current.paint.width - 30, point.x + drag.dx));
    item.y = Math.max(item.size, Math.min(current.paint.height - item.size, point.y + drag.dy)); render();
  }
  function nudgeText(dx: number, dy: number) {
    endStroke(); const current = editor.current;
    if (!current || !current.texts.length) return;
    const before = snapshot(current), item = current.texts[selectedText.current ?? current.texts.length - 1];
    if (!item) return;
    item.x = Math.max(30, Math.min(current.paint.width - 30, item.x + dx));
    item.y = Math.max(item.size, Math.min(current.paint.height - item.size, item.y + dy)); commit(before);
  }

  function selectText(id: string) {
    endStroke();
    const index = editor.current?.texts.findIndex((item) => item.id === id) ?? -1;
    selectedText.current = index >= 0 ? index : null;
    setSelectedTextId(index >= 0 ? id : null);
  }
  function deleteSelectedText() {
    endStroke(); const current = editor.current, index = selectedText.current;
    if (!current || index === null || !current.texts[index]) return;
    const before = snapshot(current);
    current.texts.splice(index, 1); selectedText.current = null;
    commit(before); setStatus("Text box deleted. Undo restores it.");
  }

  function travel(direction: "undo" | "redo") {
    endStroke();
    const current = editor.current;
    if (!current) return;
    const pixels = current[direction].pop();
    if (!pixels) return;
    current[direction === "undo" ? "redo" : "undo"].push(snapshot(current));
    current.ctx.putImageData(pixels.pixels, 0, 0); current.texts = structuredClone(pixels.texts); selectedText.current = null;
    refresh(); persist();
  }

  function generateColors(style: StarterColorStyle, keepExisting: boolean) {
    endStroke(); const current = editor.current;
    if (!current) return;
    const before = snapshot(current);
    const pixels = current.ctx.getImageData(0, 0, current.paint.width, current.paint.height);
    const changed = generateStarterColors(pixels, current.regions, scene.id, style, Math.floor(Math.random() * 0x100000000), keepExisting);
    if (!changed) { setStatus("No more empty shapes to auto-color. Turn off Keep my colors to try a new palette."); return; }
    current.ctx.putImageData(pixels, 0, 0); commit(before);
    setStatus("Starting colors added. Keep coloring, or Undo to restore your picture.");
  }

  function clear() {
    endStroke();
    const current = editor.current;
    if (!current) return;
    const before = snapshot(current);
    current.texts = [];
    current.ctx.clearRect(0, 0, current.paint.width, current.paint.height);
    commit(before);
  }

  function download(title: string) {
    endStroke();
    const canvas = canvasRef.current;
    if (!editor.current || !canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { setStatus("Download couldn’t start. Please try again."); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${title.toLowerCase().replaceAll(" ", "-")}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus("Your picture is ready to keep!");
    }, "image/png");
  }

  return { canvasRef, ready, error, saveWarning, status, history, coverage, dab, move, endStroke, travel, clear, download,
    artwork, paintColors, generateColors, addText, beginTextDrag, moveTextDrag, nudgeText, textLabels, selectedTextId, selectText, deleteSelectedText,
    retry: () => setReload((n) => n + 1),
    marks: () => editor.current?.marks ?? 0,
  };
}
