export type GameKey = "memory-match" | "bible-trivia" | "rock-paper-scissors-shoot" | "shape-safari" | "codebreaker-quest";
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
  {
    key: "rock-paper-scissors-shoot",
    title: "Rock Paper Scissors Shoot",
    description: "Two players choose rock, paper, or scissors, then reveal the winner.",
    icon: "Swords",
    ageMin: 5,
    ageMax: 18,
    playTime: "1-2 min",
    color: "#dc2626",
    bg: "#fee2e2",
  },
  {
    key: "shape-safari",
    title: "Shape Safari",
    description: "Spot cheerful shapes, colors, and patterns on a five-stop safari.",
    icon: "Shapes",
    ageMin: 3,
    ageMax: 9,
    playTime: "2-3 min",
    color: "#ea580c",
    bg: "#ffedd5",
  },
  {
    key: "codebreaker-quest",
    title: "Codebreaker Quest",
    description: "Crack patterns, ciphers, word clues, and logic locks to open the treasure vault.",
    icon: "KeyRound",
    ageMin: 8,
    ageMax: 13,
    playTime: "4-6 min",
    color: "#2563eb",
    bg: "#dbeafe",
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
  "rock-paper-scissors-shoot": {
    enabled: true,
    rewardType: "points",
    rewardPoints: 3,
    rewardTickets: 0,
    requiresChoresComplete: false,
    dailyPlayLimit: 5,
  },
  "shape-safari": {
    enabled: true,
    rewardType: "points",
    rewardPoints: 5,
    rewardTickets: 0,
    requiresChoresComplete: false,
    dailyPlayLimit: 3,
  },
  "codebreaker-quest": {
    enabled: true,
    rewardType: "points",
    rewardPoints: 10,
    rewardTickets: 0,
    requiresChoresComplete: false,
    dailyPlayLimit: 2,
  },
};

export function gameByKey(value: unknown) {
  return typeof value === "string" ? GAME_DEFINITIONS.find((game) => game.key === value) ?? null : null;
}
