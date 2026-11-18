export type PatternSettings = { scale: number; spacing: number; angle: number; background: string | null };
export type SavedColorPalette = { id: string; name: string; colors: string[] };
export const DEFAULT_PATTERN_SETTINGS: PatternSettings = { scale: 1, spacing: 1, angle: 0, background: null };
export function isPaintColor(value: unknown): value is string { return typeof value === "string" && /^#[a-f\d]{6}$/i.test(value); }
export function normalizePatternSettings(value: unknown): PatternSettings {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const number = (key: string, min: number, max: number, fallback: number) => typeof v[key] === "number" && Number.isFinite(v[key]) ? Math.min(max, Math.max(min, v[key] as number)) : fallback;
  return { scale: number("scale", .5, 3, 1), spacing: number("spacing", .5, 3, 1), angle: number("angle", 0, 180, 0), background: isPaintColor(v.background) ? v.background.toLowerCase() : null };
}
export function restoreColorPalettes(value: unknown): SavedColorPalette[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 24).flatMap((item) => {
    if (!item || typeof item.id !== "string" || !item.id.startsWith("custom-") || ids.has(item.id) || typeof item.name !== "string" || !item.name.trim() || !Array.isArray(item.colors)) return [];
    const colors = [...new Set<string>(item.colors.filter(isPaintColor).map((color: string) => color.toLowerCase()))].slice(0, 64);
    if (!colors.length) return [];
    ids.add(item.id);
    return [{ id: item.id.slice(0, 100), name: item.name.trim().slice(0, 40), colors }];
  });
}
