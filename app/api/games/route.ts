import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { getLevelFromPoints } from "@/lib/points";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS, gameByKey, type GameRewardType } from "@/lib/games";

const REWARD_TYPES = new Set<GameRewardType>(["none", "points", "tickets"]);

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

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

function isDueToday(assignment: {
  frequency: string;
  dayOfWeek: number | null;
  dueDate: Date | null;
}) {
  const today = todayStart();
  if (assignment.frequency === "daily") return true;
  if (assignment.frequency === "weekly") return assignment.dayOfWeek === today.getDay();
  if (!assignment.dueDate) return false;
  if (assignment.frequency === "monthly") return assignment.dueDate.getDate() === today.getDate();
  return assignment.frequency === "one-time" && assignment.dueDate >= today;
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
          },
        });
      })
    );
  }
  return prisma.gameSetting.findMany({ where: { householdId }, orderBy: { gameKey: "asc" } });
}

async function openChoreCount(householdId: string, memberId: string) {
  const assignments = await prisma.choreAssignment.findMany({
    where: { householdId, memberId, isActive: true },
    select: {
      frequency: true,
      dayOfWeek: true,
      dueDate: true,
      completions: {
        where: { completedAt: { gte: todayStart() } },
        select: { id: true },
        take: 1,
      },
    },
  });
  return assignments.filter((assignment) => isDueToday(assignment) && assignment.completions.length === 0).length;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");

  const settings = await ensureSettings(householdId);
  const recentSessions = await prisma.gameSession.findMany({
    where: {
      householdId,
      ...(memberId ? { memberId } : {}),
    },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: { playedAt: "desc" },
    take: 20,
  });

  const today = todayStart();
  let availability: Record<string, { playsToday: number; openChores: number; available: boolean; reason: string | null }> = {};
  if (memberId && await canAccessMember(parentId, householdId, memberId)) {
    const openChores = await openChoreCount(householdId, memberId);
    const plays = await prisma.gameSession.groupBy({
      by: ["gameKey"],
      where: { householdId, memberId, playedAt: { gte: today } },
      _count: { _all: true },
    });
    const playsByKey = new Map(plays.map((play) => [play.gameKey, play._count._all]));
    availability = Object.fromEntries(settings.map((setting) => {
      const playsToday = playsByKey.get(setting.gameKey) ?? 0;
      const limitReached = setting.dailyPlayLimit > 0 && playsToday >= setting.dailyPlayLimit;
      const choresBlocked = setting.requiresChoresComplete && openChores > 0;
      const available = setting.enabled && !limitReached && !choresBlocked;
      return [setting.gameKey, {
        playsToday,
        openChores,
        available,
        reason: !setting.enabled
          ? "This game is turned off"
          : limitReached
            ? "Daily play limit reached"
            : choresBlocked
              ? "Finish today's chores first"
              : null,
      }];
    }));
  }

  return NextResponse.json({ games: GAME_DEFINITIONS, settings, recentSessions, availability });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const game = gameByKey(body.gameKey);
  if (!game) return NextResponse.json({ error: "Unknown game" }, { status: 400 });

  const defaults = DEFAULT_GAME_SETTINGS[game.key];
  const rewardType = cleanRewardType(body.rewardType);
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
    },
    update: {
      enabled: Boolean(body.enabled),
      rewardType,
      rewardPoints: clampInt(body.rewardPoints, 0, 100, defaults.rewardPoints),
      rewardTickets: clampInt(body.rewardTickets, 0, 10, defaults.rewardTickets),
      requiresChoresComplete: Boolean(body.requiresChoresComplete),
      dailyPlayLimit: clampInt(body.dailyPlayLimit, 0, 20, defaults.dailyPlayLimit),
    },
  });

  return NextResponse.json({ setting });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const game = gameByKey(body.gameKey);
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!game || !memberId) return NextResponse.json({ error: "Game and member are required" }, { status: 400 });
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const member = await prisma.familyMember.findFirst({ where: { id: memberId, householdId }, select: { id: true, totalPoints: true } });
  if (!member) return NextResponse.json({ error: "Family member not found" }, { status: 404 });

  const defaults = DEFAULT_GAME_SETTINGS[game.key];
  const setting = await prisma.gameSetting.upsert({
    where: { householdId_gameKey: { householdId, gameKey: game.key } },
    create: { householdId, gameKey: game.key, ...defaults },
    update: {},
  });
  if (!setting.enabled) return NextResponse.json({ error: "This game is turned off" }, { status: 403 });

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
