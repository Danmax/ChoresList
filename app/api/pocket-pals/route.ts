import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withErrors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { accessibleMember, gameActor, openChoreCount } from "@/lib/game-access";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "@/lib/games";
import { getLevelFromPoints } from "@/lib/points";
import { advancePet, applyPetAction, completeDailyCare, createPet, isPetSpecies, PetActionError, petDay, publicChallenge, type PetAction, type PetState } from "@/lib/pocket-pals";

export const runtime = "nodejs";
class PetConflictError extends Error {}

async function context(req: NextRequest, memberId: unknown) {
  const actor = await gameActor(req);
  const member = typeof memberId === "string" ? await accessibleMember(actor, memberId) : null;
  if (!member) return { error: NextResponse.json({ error: "You do not have access to this player." }, { status: 403 }) };
  const [household, setting] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: actor.householdId }, select: { timeZone: true } }),
    prisma.gameSetting.upsert({
      where: { householdId_gameKey: { householdId: actor.householdId, gameKey: "pocket-pals" } },
      create: { householdId: actor.householdId, gameKey: "pocket-pals", ...DEFAULT_GAME_SETTINGS["pocket-pals"], ageMin: 3, ageMax: 18 }, update: {},
    }),
  ]);
  if (!setting.enabled || member.age < setting.ageMin || member.age > setting.ageMax) {
    return { error: NextResponse.json({ error: !setting.enabled ? "Pocket Pals is turned off." : `Pocket Pals is for ages ${setting.ageMin}-${setting.ageMax}.` }, { status: 403 }) };
  }
  if (setting.requiresChoresComplete && await openChoreCount(actor.householdId, member.id) > 0) {
    return { error: NextResponse.json({ error: "Finish today's chores before caring for your pal." }, { status: 403 }) };
  }
  return { actor, member, household, setting };
}

function view(pet: PetState, version: number, age: number, now: number) {
  return { pet: { ...pet, challenge: null }, version, challenge: publicChallenge(pet, age), serverNow: now };
}

export const GET = withErrors(async (req: NextRequest) => {
  const ctx = await context(req, req.nextUrl.searchParams.get("memberId"));
  if (ctx.error) return ctx.error;
  const { actor, member, household } = ctx;
  const saved = await prisma.virtualPet.findFirst({ where: { memberId: member.id, householdId: actor.householdId } });
  const now = Date.now();
  if (!saved) return NextResponse.json({ pet: null, version: null, challenge: null, serverNow: now });
  const pet = advancePet(saved.state as unknown as PetState, now, petDay(now, household.timeZone));
  return NextResponse.json(view(pet, saved.version, member.age, now), { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "pocket-pals", limit: 90, windowMs: 60_000 });
  if (limited) return limited;
  const body = await req.json();
  const ctx = await context(req, body.memberId);
  if (ctx.error) return ctx.error;
  const { actor, member, household, setting } = ctx;
  const now = Date.now();
  const day = petDay(now, household.timeZone);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.virtualPet.findUnique({ where: { memberId: member.id } });
      if (body.action === "adopt") {
        if (saved) throw new PetActionError("You already have a pal. Refresh to see them.");
        if (!isPetSpecies(body.species)) throw new PetActionError("Choose a dog, cat, monkey, or guinea pig.");
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
        if (!name) throw new PetActionError("Give your new pal a name.");
        const pet = createPet(body.species, name, now, day);
        await tx.virtualPet.create({ data: { householdId: actor.householdId, memberId: member.id, state: pet as unknown as Prisma.InputJsonValue } });
        return { ...view(pet, 0, member.age, now), message: `Welcome home, ${name}!`, completed: false, reward: null };
      }
      if (!saved || saved.householdId !== actor.householdId) throw new PetActionError("Adopt a pal first.");
      if (body.version !== saved.version) return null;
      const pet = advancePet(saved.state as unknown as PetState, now, day);
      const message = applyPetAction(pet, body.action as PetAction, body, now, member.age, randomUUID());
      const completed = completeDailyCare(pet);
      let reward: { points: number; tickets: number } | null = null;
      if (completed) {
        // Exactly one daily care reward is minted by the server, after all five
        // activities. The pet version prevents concurrent requests paying twice.
        const start = new Date(now - 48 * 3_600_000);
        const sessions = await tx.gameSession.findMany({
          where: { householdId: actor.householdId, memberId: member.id, gameKey: "pocket-pals", playedAt: { gte: start } },
          select: { playedAt: true },
        });
        const todayCount = sessions.filter((s) => petDay(s.playedAt.getTime(), household.timeZone) === day).length;
        if (todayCount > 0 || (setting.dailyPlayLimit > 0 && todayCount >= setting.dailyPlayLimit)) {
          throw new PetActionError("Today's care reward has already been collected.");
        }
        const points = setting.rewardType === "points" ? setting.rewardPoints : 0;
        const tickets = setting.rewardType === "tickets" ? setting.rewardTickets : 0;
        await tx.gameSession.create({ data: {
          householdId: actor.householdId, memberId: member.id, gameKey: gameByKey("pocket-pals")!.key,
          score: 5, durationSeconds: Math.min(3600, Math.floor((now - pet.daily.startedAt) / 1000)),
          rewardType: setting.rewardType, rewardPoints: points, rewardTickets: tickets,
          metadata: { careDay: day, species: pet.species, streak: pet.streak },
        } });
        if (points > 0) {
          const updated = await tx.familyMember.update({ where: { id: member.id }, data: { totalPoints: { increment: points } } });
          await tx.familyMember.update({ where: { id: member.id }, data: { level: getLevelFromPoints(updated.totalPoints) } });
        }
        reward = { points, tickets };
      }
      const updated = await tx.virtualPet.updateMany({
        where: { id: saved.id, version: saved.version },
        data: { state: pet as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new PetConflictError("Your pal changed on another screen. Refresh and try again.");
      return { ...view(pet, saved.version + 1, member.age, now), message, completed, reward };
    });
    if (!result) return NextResponse.json({ error: "Your pal changed on another screen. Refresh and try again." }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PetConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof PetActionError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      return NextResponse.json({ error: "Your pal changed on another screen. Refresh and try again." }, { status: 409 });
    }
    throw error;
  }
});
