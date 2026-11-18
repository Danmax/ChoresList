export type ColoringText = { id: string; text: string; x: number; y: number; color: string; size: number; font: string; style: string; outlineColor: string; outlineWidth: number };
export const COLORING_LETTERING = [
  { id: "sans-serif", label: "Playful bold", family: "sans-serif", weight: 900 },
  { id: "serif", label: "Storybook", family: "serif", weight: 900 },
  { id: "cursive", label: "Handwritten", family: "cursive", weight: 900 },
  { id: "monospace", label: "Typewriter", family: "monospace", weight: 900 },
  { id: "comic", label: "Comic hero", family: '"Coloring Bangers", sans-serif', weight: 400 },
  { id: "script", label: "Swirly script", family: '"Coloring Pacifico", cursive', weight: 400 },
  { id: "marker", label: "Bold marker", family: '"Coloring Marker", cursive', weight: 400 },
  { id: "stencil", label: "Adventure stencil", family: '"Coloring Stencil", sans-serif', weight: 400 },
  { id: "western", label: "Wild West", family: '"Coloring Rye", serif', weight: 400 },
  { id: "rounded", label: "Bubble letters", family: '"Coloring Fredoka", sans-serif', weight: 700 },
] as const;
const fonts: readonly string[] = COLORING_LETTERING.map((font) => font.id);
export function coloringTextFont(id: string, size: number) {
  const font = COLORING_LETTERING.find((item) => item.id === id) ?? COLORING_LETTERING[0];
  return `${font.weight} ${size}px ${font.family}`;
}
const effects = ["plain", "outline", "shadow", "glow", "sparkle"];
export function restoreColoringTexts(value: unknown): ColoringText[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).filter((v) => v && typeof v.id === "string" && typeof v.text === "string" && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.size) && /^#[a-f\d]{6}$/i.test(v.color) && /^#[a-f\d]{6}$/i.test(v.outlineColor) && fonts.includes(v.font) && effects.includes(v.style) && Number.isFinite(v.outlineWidth)).map((v) => ({ id: v.id.slice(0, 100), text: v.text.slice(0, 80), x: v.x, y: v.y, color: v.color, size: Math.max(20, Math.min(120, v.size)), font: v.font, style: v.style, outlineColor: v.outlineColor, outlineWidth: Math.max(0, Math.min(24, v.outlineWidth)) }));
}
export function textBounds(ctx: CanvasRenderingContext2D, item: ColoringText, width: number) {
  ctx.save(); ctx.font = coloringTextFont(item.font, item.size);
  const w = Math.min(width - 40, ctx.measureText(item.text).width); ctx.restore();
  const pad = item.outlineWidth + (item.style === "glow" || item.style === "sparkle" ? 16 : 4);
  return { left: item.x - w / 2 - pad, right: item.x + w / 2 + pad, top: item.y - item.size * .65 - pad, bottom: item.y + item.size * .65 + pad };
}
export function drawColoringText(ctx: CanvasRenderingContext2D, item: ColoringText, width: number) {
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.font = coloringTextFont(item.font, item.size); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.fillStyle = item.color; ctx.strokeStyle = item.outlineColor; ctx.lineWidth = item.outlineWidth;
  if (item.style === "glow") { ctx.shadowColor = item.outlineColor; ctx.shadowBlur = 18; }
  if (item.style === "shadow") { ctx.shadowColor = "#000000aa"; ctx.shadowBlur = 5; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; }
  if (item.outlineWidth > 0) ctx.strokeText(item.text, item.x, item.y, width - 40);
  ctx.fillText(item.text, item.x, item.y, width - 40);
  // A second solid pass keeps neon lettering bright rather than translucent.
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.fillText(item.text, item.x, item.y, width - 40);
  if (item.style === "sparkle") {
    const bounds = textBounds(ctx, item, width);
    for (let i = 0; i < 9; i++) {
      const x = bounds.left + (bounds.right - bounds.left) * (i + .5) / 9;
      const y = item.y + (i % 2 ? -1 : 1) * item.size * .48;
      const r = i % 3 === 0 ? 8 : 5;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r / 3, y - r / 3); ctx.lineTo(x + r, y); ctx.lineTo(x + r / 3, y + r / 3); ctx.lineTo(x, y + r); ctx.lineTo(x - r / 3, y + r / 3); ctx.lineTo(x - r, y); ctx.lineTo(x - r / 3, y - r / 3); ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = item.outlineColor; ctx.lineWidth = 2; ctx.stroke(); ctx.fill();
    }
  }
  ctx.restore();
}
