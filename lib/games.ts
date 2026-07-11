export type GameKey = "memory-match" | "bible-trivia";
export type GameRewardType = "none" | "points" | "tickets";

export type GameDefinition = {
  key: GameKey;
  title: string;
  description: string;
  icon: string;
  ageMin: number;
  ageMax: number;
  playTime: string;
  color: string;
  bg: string;
};

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    key: "memory-match",
    title: "Memory Match",
    description: "Flip cards and match household icons before the move count climbs.",
    icon: "Puzzle",
    ageMin: 4,
    ageMax: 12,
    playTime: "2-4 min",
    color: "#7c3aed",
    bg: "#ede9fe",
  },
  {
    key: "bible-trivia",
    title: "Bible Trivia",
    description: "Answer simple Bible questions and build a quick wisdom score.",
    icon: "BookOpen",
    ageMin: 6,
    ageMax: 18,
    playTime: "3-5 min",
    color: "#0f766e",
    bg: "#ccfbf1",
  },
];

export const DEFAULT_GAME_SETTINGS: Record<GameKey, {
  enabled: boolean;
  rewardType: GameRewardType;
  rewardPoints: number;
  rewardTickets: number;
  requiresChoresComplete: boolean;
  dailyPlayLimit: number;
}> = {
  "memory-match": {
    enabled: true,
    rewardType: "points",
    rewardPoints: 5,
    rewardTickets: 0,
    requiresChoresComplete: false,
    dailyPlayLimit: 3,
  },
  "bible-trivia": {
    enabled: true,
    rewardType: "points",
    rewardPoints: 8,
    rewardTickets: 0,
    requiresChoresComplete: false,
    dailyPlayLimit: 3,
  },
};

export function gameByKey(value: unknown) {
  return typeof value === "string" ? GAME_DEFINITIONS.find((game) => game.key === value) ?? null : null;
}
