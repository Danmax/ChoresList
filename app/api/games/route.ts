import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireParentSession, withErrors } from "@/lib/api";
import { childAccessWhere } from "@/lib/child-access";
import { getLevelFromPoints } from "@/lib/points";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS, gameByKey, type GameRewardType } from "@/lib/games";
import { accessibleMember, gameActor, openChoreCount, todayStart } from "@/lib/game-access";

const REWARD_TYPES = new Set<GameRewardType>(["none", "points", "tickets"]);

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function cleanRewardType(value: unknown): GameRewardType {
  return typeof value === "string" && REWARD_TYPES.has(value as GameRewardType) ? value as GameRewardType : "none";
}

function cleanMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const serialized = JSON.stringify(value);
  if (serialized.length > 4096) return undefined;
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function chessStats(sessions: { metadata: Prisma.JsonValue | null }[]) {
  const stats = { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, rating: 100 };
  for (const session of sessions) {
    const metadata = session.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) continue;
    const result = metadata.result;
    if (result !== "win" && result !== "loss" && result !== "draw") continue;
    stats.gamesPlayed++;
    if (result === "win") stats.wins++;
    else if (result === "loss") stats.losses++;
    else stats.draws++;
    const ratingAfter = Number(metadata.ratingAfter);
    if (Number.isFinite(ratingAfter) && ratingAfter >= 100) stats.rating = Math.round(ratingAfter);
  }
  return stats;
}

async function ensureSettings(householdId: string) {
  const existing = await prisma.gameSetting.findMany({ where: { householdId } });
  const existingKeys = new Set(existing.map((setting) => setting.gameKey));
  const missing = GAME_DEFINITIONS.filter((game) => !existingKeys.has(game.key));
  if (missing.length > 0) {
    await Promise.all(
      missing.map((game) => {
        const defaults = DEFAULT_GAME_SETTINGS[game.key];
        return prisma.gameSetting.create({
          data: {
            householdId,
            gameKey: game.key,
            ...defaults,
            ageMin: game.ageMin,
            ageMax: game.ageMax,
          },
        });
      })
    );
  }
  return prisma.gameSetting.findMany({ where: { householdId }, orderBy: { gameKey: "asc" } });
}

export const GET = withErrors(async (req: NextRequest) => {
  const actor = await gameActor(req);
  const { householdId } = actor;
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const selectedMember = memberId ? await accessibleMember(actor, memberId) : null;
  if (memberId && !selectedMember) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const memberAccess = actor.device
    ? { ...(actor.device.mode === "household" ? { role: { in: ["child", "young-adult"] } } : {}), ...(actor.device.mode === "member" && actor.device.memberId ? { id: actor.device.memberId } : {}) }
    : await childAccessWhere(actor.parentId!, householdId);

  const settings = await ensureSettings(householdId);
  const members = await prisma.familyMember.findMany({
    where: { householdId, ...memberAccess },
    select: { id: true, name: true, avatar: true, avatarConfig: true, avatarImageUrl: true, color: true, totalPoints: true, age: true },
    orderBy: { name: "asc" },
  });
  // Live family games need the complete household roster. A paired screen can
  // still act only as its assigned profile, but may invite a parent, sibling,
  // or other household member as the opponent.
  const chessPlayers = await prisma.familyMember.findMany({
    where: { householdId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const recentSessions = await prisma.gameSession.findMany({
    where: {
      householdId,
      ...(memberId ? { memberId } : {}),
      member: memberAccess,
    },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: { playedAt: "desc" },
    take: 20,
  });
  const completedChessSessions = memberId ? await prisma.gameSession.findMany({
    where: { householdId, memberId, gameKey: "chess-quest", member: memberAccess },
    select: { metadata: true },
    orderBy: { playedAt: "asc" },
  }) : [];

  const today = todayStart();
  let availability: Record<string, { playsToday: number; openChores: number; available: boolean; reason: string | null }> = {};
  if (memberId && selectedMember) {
    const member = selectedMember;
    const openChores = await openChoreCount(householdId, memberId);
    const plays = await prisma.gameSession.groupBy({
      by: ["gameKey"],
      where: { householdId, memberId, playedAt: { gte: today } },
      _count: { _all: true },
    });
    const playsByKey = new Map(plays.map((play) => [play.gameKey, play._count._all]));
    availability = Object.fromEntries(settings.map((setting) => {
      const game = gameByKey(setting.gameKey);
      const playsToday = playsByKey.get(setting.gameKey) ?? 0;
      // Pocket Pals counts completed daily care for rewards; children can still
      // visit and care for their pet after earning that day's badge.
      const limitReached = setting.gameKey !== "pocket-pals" && setting.dailyPlayLimit > 0 && playsToday >= setting.dailyPlayLimit;
      const choresBlocked = setting.requiresChoresComplete && openChores > 0;
      const ageBlocked = member.age < setting.ageMin || member.age > setting.ageMax;
      const available = setting.enabled && !limitReached && !choresBlocked && !ageBlocked;
      return [setting.gameKey, {
        playsToday,
        openChores,
        available,
        reason: !setting.enabled
          ? "This game is turned off"
          : ageBlocked
            ? `For ages ${setting.ageMin}-${setting.ageMax}`
          : limitReached
            ? "Daily play limit reached"
            : choresBlocked
              ? "Finish today's chores first"
              : null,
      }];
    }));
  }

  return NextResponse.json({ games: GAME_DEFINITIONS, settings, members, member: selectedMember, recentSessions, availability, chessPlayers, chessStats: chessStats(completedChessSessions) });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const game = gameByKey(body.gameKey);
  if (!game) return NextResponse.json({ error: "Unknown game" }, { status: 400 });

  const defaults = DEFAULT_GAME_SETTINGS[game.key];
  const rewardType = cleanRewardType(body.rewardType);
  const ageMin = clampInt(body.ageMin, 0, 120, game.ageMin);
  const ageMax = Math.max(ageMin, clampInt(body.ageMax, 0, 120, game.ageMax));
  const setting = await prisma.gameSetting.upsert({
    where: { householdId_gameKey: { householdId, gameKey: game.key } },
    create: {
      householdId,
      gameKey: game.key,
      enabled: Boolean(body.enabled),
      rewardType,
      rewardPoints: clampInt(body.rewardPoints, 0, 100, defaults.rewardPoints),
      rewardTickets: clampInt(body.rewardTickets, 0, 10, defaults.rewardTickets),
      requiresChoresComplete: Boolean(body.requiresChoresComplete),
      dailyPlayLimit: clampInt(body.dailyPlayLimit, 0, 20, defaults.dailyPlayLimit),
      ageMin,
      ageMax,
    },
    update: {
      enabled: Boolean(body.enabled),
      rewardType,
      rewardPoints: clampInt(body.rewardPoints, 0, 100, defaults.rewardPoints),
      rewardTickets: clampInt(body.rewardTickets, 0, 10, defaults.rewardTickets),
      requiresChoresComplete: Boolean(body.requiresChoresComplete),
      dailyPlayLimit: clampInt(body.dailyPlayLimit, 0, 20, defaults.dailyPlayLimit),
      ageMin,
      ageMax,
    },
  });

  return NextResponse.json({ setting });
});

export const POST = withErrors(async (req: NextRequest) => {
  const actor = await gameActor(req);
  const { householdId } = actor;
  const body = await req.json();
  const game = gameByKey(body.gameKey);
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!game || !memberId) return NextResponse.json({ error: "Game and member are required" }, { status: 400 });
  if (game.key === "pocket-pals") {
    return NextResponse.json({ error: "Pocket Pals rewards come from completing daily care in the game." }, { status: 400 });
  }
  const member = await accessibleMember(actor, memberId);
  if (!member) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const defaults = DEFAULT_GAME_SETTINGS[game.key];
  const setting = await prisma.gameSetting.upsert({
    where: { householdId_gameKey: { householdId, gameKey: game.key } },
    create: { householdId, gameKey: game.key, ...defaults, ageMin: game.ageMin, ageMax: game.ageMax },
    update: {},
  });
  if (!setting.enabled) return NextResponse.json({ error: "This game is turned off" }, { status: 403 });
  if (member.age < setting.ageMin || member.age > setting.ageMax) {
    return NextResponse.json({ error: `${game.title} is for ages ${setting.ageMin}-${setting.ageMax}` }, { status: 403 });
  }

  const openChores = await openChoreCount(householdId, memberId);
  if (setting.requiresChoresComplete && openChores > 0) {
    return NextResponse.json({ error: "Finish today's chores before playing this game" }, { status: 403 });
  }

  const playsToday = await prisma.gameSession.count({
    where: { householdId, memberId, gameKey: game.key, playedAt: { gte: todayStart() } },
  });
  if (setting.dailyPlayLimit > 0 && playsToday >= setting.dailyPlayLimit) {
    return NextResponse.json({ error: "Daily play limit reached" }, { status: 429 });
  }

  const score = clampInt(body.score, 0, 100000, 0);
  const durationSeconds = clampInt(body.durationSeconds, 0, 3600, 0);
  const rewardType = cleanRewardType(setting.rewardType);
  const rewardPoints = rewardType === "points" ? Math.max(0, setting.rewardPoints) : 0;
  const rewardTickets = rewardType === "tickets" ? Math.max(0, setting.rewardTickets) : 0;
  const metadataJson = cleanMetadata(body.metadata);

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.create({
      data: {
        householdId,
        memberId,
        gameKey: game.key,
        score,
        durationSeconds,
        rewardType,
        rewardPoints,
        rewardTickets,
        metadata: metadataJson,
      },
    });
    let nextTotalPoints = member.totalPoints;
    if (rewardPoints > 0) {
      nextTotalPoints = member.totalPoints + rewardPoints;
      await tx.familyMember.update({
        where: { id: memberId },
        data: { totalPoints: nextTotalPoints, level: getLevelFromPoints(nextTotalPoints) },
      });
    }
    return { session, nextTotalPoints };
  });

  return NextResponse.json({
    session: result.session,
    reward: { type: rewardType, points: rewardPoints, tickets: rewardTickets },
    totalPoints: result.nextTotalPoints,
  }, { status: 201 });
});
