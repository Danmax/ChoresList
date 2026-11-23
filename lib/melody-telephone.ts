export const TELEPHONE_LEVELS = {
  gentle: { label: "Little Explorer", ages: "Ages 3–5", description: "2–4 digits, with light-up help", min: 2, max: 4, reverse: false, interval: 1800 },
  clever: { label: "Number Detective", ages: "Ages 6–8", description: "3–7 digits, using every number", min: 3, max: 7, reverse: false, interval: 1800 },
  expert: { label: "Secret Agent", ages: "Ages 9+", description: "5–10 digits, dialed backwards", min: 5, max: 10, reverse: true, interval: 1800 },
} as const;
export type TelephoneDifficulty = keyof typeof TELEPHONE_LEVELS;
export function telephoneDifficultyForAge(age?: number): TelephoneDifficulty {
  return age !== undefined && age >= 9 ? "expert" : age !== undefined && age >= 6 ? "clever" : "gentle";
}
export function telephoneSequence(round: number, difficulty: TelephoneDifficulty = "gentle", seed = 0): number[] {
  const safeRound = Math.max(0, Math.floor(Number.isFinite(round) ? round : 0));
  const level = TELEPHONE_LEVELS[difficulty];
  const length = Math.min(level.max, level.min + Math.floor(safeRound / 2));
  if (difficulty === "gentle" && safeRound === 0 && seed === 0) return [2, 1];
  const pool = difficulty === "gentle" && safeRound < 3 ? [1, 2, 3] : difficulty === "gentle" && safeRound < 6 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let random = (Math.imul(safeRound + 1, 0x45d9f3b) ^ Math.imul(seed + 1, 0x27d4eb2d) ^ level.min) >>> 0 || 1;
  const sequence: number[] = [];
  for (let index = 0; index < length; index++) {
    random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
    let digit = pool[index === 0 ? (safeRound + seed + level.min - 1) % pool.length : (random >>> 0) % pool.length];
    if (digit === sequence[index - 1]) digit = pool[(pool.indexOf(digit) + 1) % pool.length];
    sequence.push(digit);
  }
  return sequence;
}

export function telephoneAnswer(sequence: readonly number[], difficulty: TelephoneDifficulty): number[] {
  return TELEPHONE_LEVELS[difficulty].reverse ? [...sequence].reverse() : [...sequence];
}
