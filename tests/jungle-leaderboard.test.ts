import test from "node:test";
import assert from "node:assert/strict";
import { jungleLeaderboardEntries } from "../lib/jungle-leaderboard";

const playedAt = new Date("2026-10-10T12:00:00.000Z");
function session(memberId: string, score: number, durationSeconds: number, difficulty: "easy" | "medium" | "hard", mode = "adventure") {
  return {
    id: `${memberId}-${score}`,
    memberId,
    score,
    durationSeconds,
    playedAt,
    metadata: { mode, difficulty, levelsCompleted: 8, gems: 8 },
    member: { name: memberId, avatar: "🐵", color: "#15803d" },
  };
}

test("Jungle leaderboard keeps each player's best Adventure score and applies deterministic ties", () => {
  const entries = jungleLeaderboardEntries([
    session("ada", 900, 90, "medium"),
    session("ada", 950, 110, "medium"),
    session("ben", 950, 100, "medium"),
    session("cora", 1200, 80, "hard"),
    session("drew", 1400, 70, "medium", "stage"),
  ], "medium");

  assert.deepEqual(entries.map((entry) => [entry.memberId, entry.score, entry.durationSeconds]), [
    ["ben", 950, 100],
    ["ada", 950, 110],
  ]);
});
