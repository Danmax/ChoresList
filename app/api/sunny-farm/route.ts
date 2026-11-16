import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { accessibleMember, gameActor, openChoreCount, todayStart } from "@/lib/game-access";
import { DEFAULT_GAME_SETTINGS } from "@/lib/games";
import { rateLimit } from "@/lib/rate-limit";
import { getLevelFromPoints } from "@/lib/points";
import { applyFarmAction, celebrateFarm, createFarm, FarmRuleError, nextFarmDay, type FarmState } from "@/lib/sunny-farm";

export const runtime = "nodejs";
class FarmConflict extends Error {}
class FarmLimit extends Error {}
const jsonState = (state: FarmState) => state as unknown as Prisma.InputJsonValue;

async function context(req: NextRequest, memberId: unknown) {
  const actor = await gameActor(req);
  const member = typeof memberId === "string" ? await accessibleMember(actor, memberId) : null;
  if (!member) return { error: NextResponse.json({ error: "You do not have access to this player." }, { status: 403 }) };
  const setting = await prisma.gameSetting.upsert({
    where: { householdId_gameKey: { householdId: actor.householdId, gameKey: "sunny-farm" } },
    create: { householdId: actor.householdId, gameKey: "sunny-farm", ...DEFAULT_GAME_SETTINGS["sunny-farm"], ageMin: 4, ageMax: 12 }, update: {},
  });
  if (!setting.enabled || member.age < setting.ageMin || member.age > setting.ageMax) return { error: NextResponse.json({ error: !setting.enabled ? "Sunny Farm Helpers is turned off." : `This game is for ages ${setting.ageMin}–${setting.ageMax}.` }, { status: 403 }) };
  if (setting.requiresChoresComplete && await openChoreCount(actor.householdId, member.id) > 0) return { error: NextResponse.json({ error: "Finish today's chores before visiting the farm." }, { status: 403 }) };
  return { actor, member, setting };
}

export const GET = withErrors(async (req) => {
  const ctx = await context(req, req.nextUrl.searchParams.get("memberId"));
  if (ctx.error) return ctx.error;
  const saved = await prisma.farmProgress.upsert({ where: { memberId: ctx.member.id },
    create: { memberId: ctx.member.id, householdId: ctx.actor.householdId, state: jsonState(createFarm()) }, update: {} });
  return NextResponse.json({ farm: saved.state, version: saved.version }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withErrors(async (req) => {
  const limited = rateLimit(req, { key: "sunny-farm", limit: 150, windowMs: 60_000 });
  if (limited) return limited;
  const body = await req.json();
  const ctx = await context(req, body.memberId);
  if (ctx.error) return ctx.error;
  const { actor, member, setting } = ctx;
  try {
    const result = await prisma.$transaction(async tx => {
      const saved = await tx.farmProgress.findUnique({ where: { memberId: member.id } });
      if (!saved || saved.householdId !== actor.householdId || saved.version !== body.version) throw new FarmConflict();
      const state = saved.state as unknown as FarmState;
      let next: FarmState;
      if (body.action === "help") next = applyFarmAction(state, body.task, body.target);
      else if (body.action === "celebrate") next = celebrateFarm(state);
      else if (body.action === "next-day") next = nextFarmDay(state);
      else throw new FarmRuleError("Choose a farm activity.");
      // Compare-and-swap serializes actions across tabs and prevents duplicate rewards.
      const changed = await tx.farmProgress.updateMany({ where: { id: saved.id, version: saved.version }, data: { state: jsonState(next), version: { increment: 1 } } });
      if (changed.count !== 1) throw new FarmConflict();
      if (setting.dailyPlayLimit > 0) {
        const plays = await tx.gameSession.count({ where: { householdId: actor.householdId, memberId: member.id, gameKey: "sunny-farm", playedAt: { gte: todayStart() } } });
        if (plays >= setting.dailyPlayLimit) throw new FarmLimit("Daily play limit reached. Your farm is saved for next time.");
      }
      let reward: { points: number; tickets: number } | null = null;
      if (body.action === "celebrate") {
        const points = setting.rewardType === "points" ? Math.max(0, setting.rewardPoints) : 0;
        const tickets = setting.rewardType === "tickets" ? Math.max(0, setting.rewardTickets) : 0;
        await tx.gameSession.create({ data: { householdId: actor.householdId, memberId: member.id, gameKey: "sunny-farm", score: 80,
          durationSeconds: Math.min(3600, Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000))),
          rewardType: setting.rewardType, rewardPoints: points, rewardTickets: tickets,
          metadata: { round: state.round, completedTasks: 8, inventory: next.inventory } } });
        if (points) {
          const updated = await tx.familyMember.update({ where: { id: member.id }, data: { totalPoints: { increment: points } }, select: { totalPoints: true } });
          await tx.familyMember.update({ where: { id: member.id }, data: { level: getLevelFromPoints(updated.totalPoints) } });
        }
        reward = { points, tickets };
      }
      return { farm: next, version: saved.version + 1, reward };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FarmConflict) return NextResponse.json({ error: "Your farm changed in another tab. Reloading your saved farm." }, { status: 409 });
    if (error instanceof FarmRuleError || error instanceof FarmLimit) return NextResponse.json({ error: error.message }, { status: error instanceof FarmLimit ? 429 : 400 });
    throw error;
  }
});
