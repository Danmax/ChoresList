export const EDUCATION_SUBJECTS = new Set(["sight-words", "vocabulary", "facts", "history", "metrics", "trivia", "exercise", "project"]);
export const EDUCATION_MODES = new Set(["flashcards", "lightning", "drill", "exam", "training", "real-life"]);

export type ParsedMaterial = {
  prompt: string;
  answer: string;
  choices?: string[];
  explanation?: string | null;
  sortOrder: number;
};

export function cleanText(value: unknown, fallback = "", max = 255) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export function cleanOptionalText(value: unknown, max = 1000) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export function cleanInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function dateFromInput(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function normalizeAnswer(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

export function choicesForDisplay(id: string, choices: unknown, answer: string) {
  const unique = Array.from(new Set([
    ...(Array.isArray(choices) ? choices.filter((choice): choice is string => typeof choice === "string" && choice.trim().length > 0) : []),
    answer,
  ]));
  let seed = Array.from(id).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
  for (let index = unique.length - 1; index > 0; index--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [unique[index], unique[target]] = [unique[target], unique[index]];
  }
  return unique;
}

export function parseMaterialLines(value: unknown): ParsedMaterial[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [prompt = "", answer = "", choiceText = "", explanation = ""] = line.split("|").map((part) => part.trim());
      const choices = choiceText
        ? Array.from(new Set(choiceText.split(",").map((choice) => choice.trim()).filter(Boolean)))
        : [];

      return {
        prompt,
        answer,
        choices: choices.length ? choices : undefined,
        explanation: explanation || null,
        sortOrder: index,
      };
    })
    .filter((item) => item.prompt && item.answer);
}
