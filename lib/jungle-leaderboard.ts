export const JUNGLE_LEADERBOARD_LIMIT = 100;

export type JungleLeaderboardDifficulty = "easy" | "medium" | "hard";

export type JungleLeaderboardSession = {
  id: string;
  memberId: string;
  score: number;
  durationSeconds: number;
  playedAt: Date;
  metadata: unknown;
  member: { name: string; avatar: string; color: string };
};

export type JungleLeaderboardEntry = {
  memberId: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  durationSeconds: number;
  playedAt: Date;
  levelsCompleted: number;
  gems: number;
};

function adventureMetadata(metadata: unknown, difficulty: JungleLeaderboardDifficulty) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata as Record<string, unknown>;
  if (value.mode !== "adventure" || value.difficulty !== difficulty) return null;
  return {
    levelsCompleted: typeof value.levelsCompleted === "number" ? value.levelsCompleted : 0,
    gems: typeof value.gems === "number" ? value.gems : 0,
  };
}

function compareEntries(a: JungleLeaderboardEntry, b: JungleLeaderboardEntry) {
  return b.score - a.score
    || a.durationSeconds - b.durationSeconds
    || a.playedAt.getTime() - b.playedAt.getTime()
    || a.memberId.localeCompare(b.memberId);
}

export function jungleLeaderboardEntries(
  sessions: JungleLeaderboardSession[],
  difficulty: JungleLeaderboardDifficulty,
) {
  const bestByMember = new Map<string, JungleLeaderboardEntry>();
  for (const session of sessions) {
    const details = adventureMetadata(session.metadata, difficulty);
    if (!details) continue;
    const entry: JungleLeaderboardEntry = {
      memberId: session.memberId,
      name: session.member.name,
      avatar: session.member.avatar,
      color: session.member.color,
      score: session.score,
      durationSeconds: session.durationSeconds,
      playedAt: session.playedAt,
      ...details,
    };
    const existing = bestByMember.get(entry.memberId);
    if (!existing || compareEntries(entry, existing) < 0) bestByMember.set(entry.memberId, entry);
  }
  return [...bestByMember.values()].sort(compareEntries);
}
