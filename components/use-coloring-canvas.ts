"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  coloringCoverage, coloringRegionAt, coloringStorageKey, createColoringRegions, fillColoringRegion, hexToRgb,
  type ColoringPattern, type ColoringRegions, type ColoringSceneId, type ColoringTool,
} from "@/lib/coloring";

type Point = { x: number; y: number };
type Editor = {
  paint: HTMLCanvasElement;
  ink: HTMLImageElement;
  ctx: CanvasRenderingContext2D;
  regions: ColoringRegions;
  undo: ImageData[];
  redo: ImageData[];
  marks: number;
  thumbnail: string;
  coverage: number;
};
type Stroke = { pointerId: number; before: ImageData; last: Point };
type BrushOptions = { tool: ColoringTool; color: string; size: number; pattern: ColoringPattern; stayInLines: boolean };
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
  const stroke = useRef<Stroke | null>(null);
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
  }, []);

  const persist = useCallback(() => {
    const current = editor.current;
    if (!current) return;
    try {
      localStorage.setItem(coloringStorageKey(memberId, scene.id), JSON.stringify({
        version: 1, width: current.paint.width, height: current.paint.height,
        image: current.paint.toDataURL("image/png"), marks: current.marks,
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
    current.coverage = coloringCoverage(current.ctx.getImageData(0, 0, current.paint.width, current.paint.height), current.regions);
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

  const commit = useCallback((before: ImageData) => {
    const current = editor.current;
    if (!current) return;
    const after = current.ctx.getImageData(0, 0, current.paint.width, current.paint.height);
    if (!different(before, after)) return;
    current.undo.push(before);
    if (current.undo.length > HISTORY_LIMIT) current.undo.shift();
    current.redo = [];
    current.marks++;
    refresh();
    persist();
  }, [refresh, persist]);

  const endStroke = useCallback((pointerId?: number) => {
    const current = editor.current, active = stroke.current;
    if (!current || !active || (pointerId !== undefined && active.pointerId !== pointerId)) return;
    current.ctx.restore();
    stroke.current = null;
    commit(active.before);
  }, [commit]);

  useEffect(() => {
    let cancelled = false;
    setReady(false); setError(""); setSaveWarning(""); setCoverage(0);
    setHistory({ undo: 0, redo: 0 }); setStatus("Getting your picture ready…");
    editor.current = null;
    stroke.current = null;
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
        const current: Editor = { paint, ink, ctx, regions, undo: [], redo: [], marks: 0, thumbnail: "", coverage: 0 };
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
            current.marks = Number.isSafeInteger(saved.marks) && saved.marks >= 0 ? saved.marks : 0;
            restored = true;
          }
        } catch {
          if (!cancelled) setSaveWarning("Saved progress couldn’t be opened. You can start a new picture or download this one.");
        }
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
    const before = ctx.getImageData(0, 0, paint.width, paint.height);
    if (options.tool === "bucket" || options.tool === "pattern") {
      const pixels = ctx.getImageData(0, 0, paint.width, paint.height);
      if (fillColoringRegion(pixels, regions, id, hexToRgb(options.color), options.tool === "pattern" ? options.pattern : undefined)) {
        ctx.putImageData(pixels, 0, 0); commit(before);
      }
      return;
    }
    ctx.save();
    if (options.stayInLines && id > 0) ctx.clip(regionPath(regions, id));
    const erase = options.tool === "eraser";
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.fillStyle = options.color; ctx.strokeStyle = options.color;
    ctx.lineWidth = options.size; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(point.x, point.y, options.size / 2, 0, Math.PI * 2); ctx.fill();
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

  function travel(direction: "undo" | "redo") {
    endStroke();
    const current = editor.current;
    if (!current) return;
    const pixels = current[direction].pop();
    if (!pixels) return;
    current[direction === "undo" ? "redo" : "undo"].push(current.ctx.getImageData(0, 0, current.paint.width, current.paint.height));
    current.ctx.putImageData(pixels, 0, 0);
    refresh(); persist();
  }

  function clear() {
    endStroke();
    const current = editor.current;
    if (!current) return;
    const before = current.ctx.getImageData(0, 0, current.paint.width, current.paint.height);
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
    artwork,
    retry: () => setReload((n) => n + 1),
    marks: () => editor.current?.marks ?? 0,
  };
}
