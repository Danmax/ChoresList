export type TracePoint = { x: number; y: number };
export type LetterCase = "uppercase" | "lowercase";
export type LetterStroke = { points: TracePoint[]; instruction: string };
export type LetterLesson = { letter: string; word: string; emoji: string; uppercase: LetterStroke[]; lowercase: LetterStroke[] };

const point = (x: number, y: number): TracePoint => ({ x, y });
const line = (coordinates: number[], instruction: string): LetterStroke => ({ points: Array.from({ length: coordinates.length / 2 }, (_, i) => point(coordinates[i * 2], coordinates[i * 2 + 1])), instruction });
const curve = (coordinates: number[], instruction: string): LetterStroke => {
  const points = [point(coordinates[0], coordinates[1])];
  for (let offset = 2; offset < coordinates.length; offset += 6) {
    const start = points[points.length - 1];
    const [x1, y1, x2, y2, x3, y3] = coordinates.slice(offset, offset + 6);
    for (let step = 1; step <= 32; step++) {
      const t = step / 32, u = 1 - t;
      points.push(point(u ** 3 * start.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, u ** 3 * start.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3));
    }
  }
  return { points, instruction };
};
const oval = (cx: number, cy: number, rx: number, ry: number, instruction = "Go around and back to the top."): LetterStroke => ({
  points: Array.from({ length: 65 }, (_, index) => point(cx - rx * Math.sin(index / 64 * Math.PI * 2), cy - ry * Math.cos(index / 64 * Math.PI * 2))), instruction,
});
const dot = (x: number, y: number) => line([x, y], "Tap to add the little dot.");

export const LETTER_LESSONS: readonly LetterLesson[] = [
  { letter: "A", word: "Apple", emoji: "🍎", uppercase: [line([180, 75, 85, 310], "Slant down to the left."), line([180, 75, 275, 310], "Slant down to the right."), line([124, 215, 236, 215], "Draw a little line across.")], lowercase: [oval(175, 235, 75, 75), line([250, 160, 250, 310], "Draw a straight line down.")] },
  { letter: "B", word: "Butterfly", emoji: "🦋", uppercase: [line([100, 75, 100, 310], "Draw a straight line down."), curve([100, 75, 295, 50, 295, 200, 100, 190], "Curve around the top bump."), curve([100, 190, 310, 160, 310, 335, 100, 310], "Curve around the bottom bump.")], lowercase: [line([105, 75, 105, 310], "Draw a tall line down."), curve([105, 230, 115, 125, 270, 145, 260, 240, 260, 325, 120, 340, 105, 265], "Go up and around the little belly.")] },
  { letter: "C", word: "Cat", emoji: "🐱", uppercase: [curve([275, 110, 95, -10, 35, 175, 90, 265, 130, 335, 230, 325, 275, 280], "Curve around, leaving a little opening.")], lowercase: [curve([250, 180, 150, 105, 55, 240, 120, 290, 160, 330, 215, 315, 250, 285], "Curve around, leaving a little opening.")] },
  { letter: "D", word: "Dog", emoji: "🐶", uppercase: [line([100, 75, 100, 310], "Draw a straight line down."), curve([100, 75, 335, 65, 335, 320, 100, 310], "Make a big curve back to the bottom.")], lowercase: [oval(170, 235, 75, 75), line([245, 75, 245, 310], "Draw a tall line down.")] },
  { letter: "E", word: "Elephant", emoji: "🐘", uppercase: [line([105, 75, 105, 310], "Draw a straight line down."), line([105, 75, 270, 75], "Draw a line across the top."), line([105, 190, 235, 190], "Draw a little line across the middle."), line([105, 310, 270, 310], "Draw a line across the bottom.")], lowercase: [curve([105, 235, 150, 235, 210, 235, 255, 235, 260, 130, 105, 130, 100, 235, 95, 325, 200, 335, 250, 285], "Go across, around, and open out.")] },
  { letter: "F", word: "Fish", emoji: "🐠", uppercase: [line([105, 75, 105, 310], "Draw a straight line down."), line([105, 75, 270, 75], "Draw a line across the top."), line([105, 190, 235, 190], "Draw a little line across the middle.")], lowercase: [curve([235, 90, 160, 30, 130, 105, 145, 165, 145, 215, 145, 265, 145, 310], "Curve over, then draw a tall line down."), line([90, 185, 235, 185], "Draw a little line across.")] },
  { letter: "G", word: "Grapes", emoji: "🍇", uppercase: [curve([275, 110, 95, -10, 35, 175, 90, 265, 130, 335, 235, 325, 270, 265], "Make a big curve around."), line([270, 265, 270, 215, 205, 215], "Go up a little, then across to the left.")], lowercase: [oval(170, 235, 75, 75), curve([245, 160, 245, 220, 245, 290, 245, 330, 245, 390, 130, 390, 110, 345], "Go down below the line and curl to the left.")] },
  { letter: "H", word: "Heart", emoji: "💜", uppercase: [line([95, 75, 95, 310], "Draw the left line down."), line([265, 75, 265, 310], "Draw the right line down."), line([95, 190, 265, 190], "Join them with a line across.")], lowercase: [line([105, 75, 105, 310], "Draw a tall line down."), curve([105, 235, 105, 135, 255, 135, 255, 230, 255, 255, 255, 285, 255, 310], "Go up, over the hump, and down.")] },
  { letter: "I", word: "Ice cream", emoji: "🍦", uppercase: [line([105, 75, 255, 75], "Draw a line across the top."), line([180, 75, 180, 310], "Draw a straight line down."), line([105, 310, 255, 310], "Draw a line across the bottom.")], lowercase: [line([180, 180, 180, 310], "Draw a short line down."), dot(180, 130)] },
  { letter: "J", word: "Jellyfish", emoji: "🪼", uppercase: [line([120, 75, 275, 75], "Draw a line across the top."), curve([235, 75, 235, 145, 235, 230, 235, 260, 235, 335, 100, 335, 90, 260], "Go down and curl around to the left.")], lowercase: [curve([210, 180, 210, 235, 210, 295, 210, 330, 210, 385, 115, 390, 100, 340], "Go below the line and curl to the left."), dot(210, 130)] },
  { letter: "K", word: "Kite", emoji: "🪁", uppercase: [line([100, 75, 100, 310], "Draw a tall line down."), line([270, 75, 100, 205], "Slant down to the middle."), line([100, 205, 275, 310], "Slant down to the right.")], lowercase: [line([110, 75, 110, 310], "Draw a tall line down."), line([245, 165, 110, 245], "Slant down to the middle."), line([110, 245, 250, 310], "Slant down to the right.")] },
  { letter: "L", word: "Leaf", emoji: "🍃", uppercase: [line([105, 75, 105, 310], "Draw a tall line down."), line([105, 310, 270, 310], "Draw a line across the bottom.")], lowercase: [line([180, 75, 180, 310], "Draw a tall line down.")] },
  { letter: "M", word: "Moon", emoji: "🌙", uppercase: [line([80, 75, 80, 310], "Draw the left line down."), line([80, 75, 180, 215], "Slant down toward the middle."), line([180, 215, 280, 75], "Slant up to the right."), line([280, 75, 280, 310], "Draw the right line down.")], lowercase: [line([65, 165, 65, 310], "Draw a short line down."), curve([65, 230, 65, 140, 180, 140, 180, 235, 180, 260, 180, 285, 180, 310], "Go up, over the first hump, and down."), curve([180, 230, 180, 140, 295, 140, 295, 235, 295, 260, 295, 285, 295, 310], "Go up, over the next hump, and down.")] },
  { letter: "N", word: "Nest", emoji: "🪺", uppercase: [line([100, 75, 100, 310], "Draw the left line down."), line([100, 75, 260, 310], "Slant down to the right."), line([260, 75, 260, 310], "Draw the right line down.")], lowercase: [line([105, 165, 105, 310], "Draw a short line down."), curve([105, 235, 105, 135, 255, 135, 255, 230, 255, 255, 255, 285, 255, 310], "Go up, over the hump, and down.")] },
  { letter: "O", word: "Orange", emoji: "🍊", uppercase: [oval(180, 192, 105, 118)], lowercase: [oval(180, 235, 80, 75)] },
  { letter: "P", word: "Puppy", emoji: "🐶", uppercase: [line([100, 75, 100, 310], "Draw a tall line down."), curve([100, 75, 310, 50, 310, 225, 100, 200], "Curve around the top belly.")], lowercase: [line([105, 165, 105, 375], "Draw a line below the bottom line."), curve([105, 190, 135, 135, 265, 145, 260, 240, 255, 325, 125, 330, 105, 275], "Go around the little belly.")] },
  { letter: "Q", word: "Queen", emoji: "👑", uppercase: [oval(175, 190, 100, 115), line([205, 255, 285, 330], "Add a little slanting tail.")], lowercase: [oval(170, 235, 75, 75), line([245, 165, 245, 375], "Draw a line below the bottom line.")] },
  { letter: "R", word: "Rainbow", emoji: "🌈", uppercase: [line([100, 75, 100, 310], "Draw a tall line down."), curve([100, 75, 310, 50, 310, 225, 100, 195], "Curve around the top belly."), line([175, 197, 280, 310], "Slant down to make a little leg.")], lowercase: [line([120, 165, 120, 310], "Draw a short line down."), curve([120, 230, 120, 160, 210, 145, 245, 190], "Go up and curve over a little.")] },
  { letter: "S", word: "Sun", emoji: "☀️", uppercase: [curve([270, 105, 170, 20, 45, 120, 135, 180, 170, 205, 275, 190, 275, 250, 275, 330, 135, 345, 80, 280], "Curve left, bend around, and curve back.")], lowercase: [curve([245, 185, 170, 125, 75, 190, 145, 230, 180, 250, 250, 235, 245, 275, 235, 325, 145, 330, 105, 285], "Curve left, bend around, and curve back.")] },
  { letter: "T", word: "Turtle", emoji: "🐢", uppercase: [line([75, 75, 285, 75], "Draw a line across the top."), line([180, 75, 180, 310], "Draw a straight line down.")], lowercase: [line([180, 90, 180, 310], "Draw a tall line down."), line([105, 180, 255, 180], "Draw a little line across.")] },
  { letter: "U", word: "Umbrella", emoji: "☂️", uppercase: [curve([90, 75, 90, 125, 90, 215, 90, 245, 90, 340, 270, 340, 270, 245, 270, 195, 270, 125, 270, 75], "Go down, curve around, and go back up.")], lowercase: [curve([105, 165, 105, 195, 105, 250, 105, 270, 105, 335, 250, 335, 250, 255, 250, 225, 250, 190, 250, 165], "Go down, curve around, and go back up."), line([250, 165, 250, 310], "Draw a short line down.")] },
  { letter: "V", word: "Violin", emoji: "🎻", uppercase: [line([80, 75, 180, 310, 280, 75], "Slant down, then slant back up.")], lowercase: [line([100, 165, 180, 310, 260, 165], "Slant down, then slant back up.")] },
  { letter: "W", word: "Whale", emoji: "🐳", uppercase: [line([65, 75, 120, 310, 180, 175, 240, 310, 295, 75], "Go down, up, down, and up.")], lowercase: [line([65, 165, 120, 310, 180, 220, 240, 310, 295, 165], "Go down, up, down, and up.")] },
  { letter: "X", word: "Xylophone", emoji: "🎼", uppercase: [line([90, 75, 270, 310], "Slant down to the right."), line([270, 75, 90, 310], "Slant down to the left.")], lowercase: [line([105, 165, 255, 310], "Slant down to the right."), line([255, 165, 105, 310], "Slant down to the left.")] },
  { letter: "Y", word: "Yarn", emoji: "🧶", uppercase: [line([85, 75, 180, 190], "Slant down toward the middle."), line([275, 75, 180, 190], "Slant down to meet the other line."), line([180, 190, 180, 310], "Draw a straight line down.")], lowercase: [line([100, 165, 180, 300], "Slant down to the right."), line([260, 165, 145, 375], "Slant down below the bottom line.")] },
  { letter: "Z", word: "Zebra", emoji: "🦓", uppercase: [line([90, 75, 270, 75, 90, 310, 270, 310], "Go across, slant down, and go across again.")], lowercase: [line([105, 165, 255, 165, 105, 310, 255, 310], "Go across, slant down, and go across again.")] },
];

export function distance(a: TracePoint, b: TracePoint): number { return Math.hypot(a.x - b.x, a.y - b.y); }

export function resampleStroke(stroke: LetterStroke, spacing = 4): LetterStroke {
  if (stroke.points.length === 1) return stroke;
  const points = [stroke.points[0]];
  let remaining = spacing;
  for (let index = 1; index < stroke.points.length; index++) {
    let start = stroke.points[index - 1];
    const end = stroke.points[index];
    let length = distance(start, end);
    while (length >= remaining && length > 0) {
      const ratio = remaining / length;
      start = point(start.x + (end.x - start.x) * ratio, start.y + (end.y - start.y) * ratio);
      points.push(start); length = distance(start, end); remaining = spacing;
    }
    remaining -= length;
  }
  const last = stroke.points[stroke.points.length - 1];
  if (distance(points[points.length - 1], last) > 0.1) points.push(last);
  return { ...stroke, points };
}

export function strokePath(points: readonly TracePoint[]): string {
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export function letterStrokes(lesson: LetterLesson, letterCase: LetterCase): LetterStroke[] {
  return lesson[letterCase].map(stroke => resampleStroke(stroke));
}

/** Only nearby upcoming points can advance; a tap at a crossing cannot skip a loop. */
export function advanceTrace(points: readonly TracePoint[], progress: number, from: TracePoint, to: TracePoint, tolerance = 22): number {
  if (!points.length || ![from.x, from.y, to.x, to.y].every(Number.isFinite)) return progress;
  let cursor = progress;
  const steps = Math.max(1, Math.ceil(distance(from, to) / 3));
  for (let step = 1; step <= steps; step++) {
    const candidate = point(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps);
    let bestIndex = cursor, bestDistance = distance(candidate, points[cursor]);
    for (let index = cursor + 1; index <= Math.min(points.length - 1, cursor + 7); index++) {
      const gap = distance(candidate, points[index]);
      if (gap < bestDistance) { bestDistance = gap; bestIndex = index; }
    }
    if (bestDistance <= tolerance) cursor = bestIndex;
  }
  return cursor;
}

export function strokeFinished(stroke: LetterStroke, progress: number, position: TracePoint, tolerance = 22): boolean {
  return progress >= stroke.points.length - 2 && distance(position, stroke.points[stroke.points.length - 1]) <= tolerance;
}

export function lessonFor(letter: string): LetterLesson { return LETTER_LESSONS.find(lesson => lesson.letter === letter.toUpperCase()) ?? LETTER_LESSONS[0]; }
export function letterExample(lesson: LetterLesson): string { return `${lesson.letter} is for ${lesson.word}!`; }
export const TRACING_LINES = {
  uppercase: "Let's trace the uppercase letter.", lowercase: "Let's trace the lowercase letter.",
  welcome: "Start at the glowing dot and follow the little trail.", retry: "Start at the glowing dot, then follow the trail.",
  resume: "Pick up where the glowing dot is. Take your time!", offTrail: "Come back to the little trail. I'm here to help!",
  stroke: "Lovely line!", complete: "You wrote the letter! What a lovely little discovery!",
  demo: "Watch the little pencil. Then you can try!", reset: "A fresh little page. Let's try again!",
  practice: "The dotted trail is tucked away. You can still start at the glowing dot.", guided: "The little trail is back to help you.",
} as const;

export function tracingNarration(): string[] {
  return [...Object.values(TRACING_LINES), ...LETTER_LESSONS.flatMap(lesson => [letterExample(lesson), ...lesson.uppercase.map(stroke => stroke.instruction), ...lesson.lowercase.map(stroke => stroke.instruction)])];
}

export type LetterGardenProgress = { completed: string[]; selected: string; letterCase: LetterCase; guided: boolean };
export function readLetterGardenProgress(value: unknown): LetterGardenProgress {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    completed: Array.isArray(raw.completed) ? [...new Set(raw.completed.filter((id): id is string => typeof id === "string" && /^[A-Z]:(uppercase|lowercase)$/.test(id)))].slice(0, 52) : [],
    selected: typeof raw.selected === "string" && /^[A-Z]$/.test(raw.selected) ? raw.selected : "A",
    letterCase: raw.letterCase === "lowercase" ? "lowercase" : "uppercase", guided: raw.guided !== false,
  };
}
