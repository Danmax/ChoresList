import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { gameActor } from "@/lib/game-access";
import { JUNGLE_LEADERBOARD_LIMIT, jungleLeaderboardEntries, type JungleLeaderboardDifficulty } from "@/lib/jungle-leaderboard";

const DIFFICULTIES = new Set<JungleLeaderboardDifficulty>(["easy", "medium", "hard"]);

export const GET = withErrors(async (req: NextRequest) => {
  const actor = await gameActor(req);
  const difficultyParam = new URL(req.url).searchParams.get("difficulty");
  const difficulty = DIFFICULTIES.has(difficultyParam as JungleLeaderboardDifficulty)
    ? difficultyParam as JungleLeaderboardDifficulty
    : "medium";
  const sessions = await prisma.gameSession.findMany({
    where: { householdId: actor.householdId, gameKey: "jungle-vine-swing" },
    select: {
      id: true,
      memberId: true,
      score: true,
      durationSeconds: true,
      playedAt: true,
      metadata: true,
      member: { select: { name: true, avatar: true, color: true } },
    },
  });
  const ranked = jungleLeaderboardEntries(sessions, difficulty);
  const memberId = new URL(req.url).searchParams.get("memberId");
  const playerIndex = memberId ? ranked.findIndex((entry) => entry.memberId === memberId) : -1;

  return NextResponse.json({
    difficulty,
    entries: ranked.slice(0, JUNGLE_LEADERBOARD_LIMIT).map((entry, index) => ({ ...entry, rank: index + 1 })),
    player: playerIndex >= 0 ? { ...ranked[playerIndex], rank: playerIndex + 1 } : null,
  });
});
