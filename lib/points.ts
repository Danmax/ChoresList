const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];

export function getLevelFromPoints(points: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getPointsForNextLevel(currentPoints: number): {
  current: number;
  next: number;
  progress: number;
} {
  const level = getLevelFromPoints(currentPoints);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  if (level >= LEVEL_THRESHOLDS.length) {
    return { current: currentPoints, next: nextThreshold, progress: 100 };
  }

  const range = nextThreshold - currentThreshold;
  const earned = currentPoints - currentThreshold;
  return {
    current: earned,
    next: range,
    progress: Math.min(100, Math.round((earned / range) * 100)),
  };
}

export function calcPointsEarned(
  basePoints: number,
  withPhoto: boolean,
  allDailyDone: boolean
): number {
  let pts = basePoints;
  if (withPhoto) pts = Math.round(pts * 1.25);
  if (allDailyDone) pts = Math.round(pts * 1.1);
  return pts;
}

export function getLevelTitle(level: number): string {
  const titles = [
    "Helper", "Rookie", "Champ", "Star", "Hero",
    "Legend", "Master", "Expert", "Elite", "Ultimate"
  ];
  return titles[Math.min(level - 1, titles.length - 1)];
}
