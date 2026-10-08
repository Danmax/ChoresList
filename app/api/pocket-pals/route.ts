import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withErrors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { accessibleMember, gameActor, openChoreCount } from "@/lib/game-access";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "@/lib/games";
import { getLevelFromPoints } from "@/lib/points";
import { advancePet, applyPetAction, completeDailyCare, createPet, createPetAppearance, isPetSpecies, petSerial, PetActionError, petDay, publicChallenge, type PetAction, type PetAppearance, type PetState } from "@/lib/pocket-pals";

export const runtime = "nodejs";
const MAX_PALS_PER_GUARDIAN = 3;
class PetConflictError extends Error {}
type SavedPal = { id: string; householdId: string; memberId: string; serialNumber: string; appearance: unknown; status: string; version: number; state: unknown };

async function context(req: NextRequest, memberId: unknown) {
  const actor = await gameActor(req);
  const member = typeof memberId === "string" ? await accessibleMember(actor, memberId) : null;
  if (!member) return { error: NextResponse.json({ error: "You do not have access to this player." }, { status: 403 }) };
  const [household, setting] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: actor.householdId }, select: { timeZone: true } }),
    prisma.gameSetting.upsert({ where: { householdId_gameKey: { householdId: actor.householdId, gameKey: "pocket-pals" } }, create: { householdId: actor.householdId, gameKey: "pocket-pals", ...DEFAULT_GAME_SETTINGS["pocket-pals"], ageMin: 3, ageMax: 18 }, update: {} }),
  ]);
  if (!setting.enabled || member.age < setting.ageMin || member.age > setting.ageMax) return { error: NextResponse.json({ error: !setting.enabled ? "Pocket Pals is turned off." : `Pocket Pals is for ages ${setting.ageMin}-${setting.ageMax}.` }, { status: 403 }) };
  if (setting.requiresChoresComplete && await openChoreCount(actor.householdId, member.id) > 0) return { error: NextResponse.json({ error: "Finish today's chores before caring for your pal." }, { status: 403 }) };
  return { actor, member, household, setting };
}

function rosterItem(saved: SavedPal) {
  const state = saved.state as PetState;
  return { id: saved.id, name: state.name, species: state.species, serialNumber: saved.serialNumber, appearance: saved.appearance, primaryGuardianId: saved.memberId };
}

async function accessiblePal(memberId: string, householdId: string, palId?: unknown) {
  return prisma.virtualPet.findFirst({ where: { householdId, status: "active", OR: [{ memberId }, { caregivers: { some: { memberId } } }], ...(typeof palId === "string" ? { id: palId } : {}) }, orderBy: { createdAt: "asc" } }) as Promise<SavedPal | null>;
}

async function listRoster(memberId: string, householdId: string) {
  return prisma.virtualPet.findMany({ where: { householdId, status: "active", OR: [{ memberId }, { caregivers: { some: { memberId } } }] }, orderBy: { createdAt: "asc" } }) as Promise<SavedPal[]>;
}

function view(saved: SavedPal, age: number, now: number, day: string, roster: SavedPal[]) {
  const pet = advancePet(saved.state as PetState, now, day);
  pet.serialNumber = saved.serialNumber;
  pet.appearance = saved.appearance as PetAppearance;
  return { pet: { ...pet, challenge: null }, version: saved.version, challenge: publicChallenge(pet, age), palId: saved.id, roster: roster.map(rosterItem), serverNow: now };
}

export const GET = withErrors(async (req: NextRequest) => {
  const ctx = await context(req, req.nextUrl.searchParams.get("memberId"));
  if (ctx.error) return ctx.error;
  const { actor, member, household } = ctx;
  const [saved, roster] = await Promise.all([accessiblePal(member.id, actor.householdId, req.nextUrl.searchParams.get("palId")), listRoster(member.id, actor.householdId)]);
  const now = Date.now();
  if (!saved) return NextResponse.json({ pet: null, palId: null, version: null, roster: roster.map(rosterItem), challenge: null, serverNow: now });
  return NextResponse.json(view(saved, member.age, now, petDay(now, household.timeZone), roster), { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withErrors(async (req: NextRequest) => {
  const limited = rateLimit(req, { key: "pocket-pals", limit: 90, windowMs: 60_000 });
  if (limited) return limited;
  const body = await req.json();
  const ctx = await context(req, body.memberId);
  if (ctx.error) return ctx.error;
  const { actor, member, household, setting } = ctx;
  const now = Date.now(), day = petDay(now, household.timeZone);
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (body.action === "adopt") {
        const count = await tx.virtualPet.count({ where: { householdId: actor.householdId, memberId: member.id, status: "active" } });
        if (count >= MAX_PALS_PER_GUARDIAN) throw new PetActionError(`A guardian can care for up to ${MAX_PALS_PER_GUARDIAN} active pals.`);
        if (!isPetSpecies(body.species)) throw new PetActionError("Choose a dog, cat, monkey, or guinea pig.");
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : "";
        if (!name) throw new PetActionError("Give your new pal a name.");
        const id = randomUUID(), serialNumber = petSerial(id), appearance = createPetAppearance(body.species, now + count);
        const pet = createPet(body.species, name, now, day, serialNumber, appearance);
        const saved = await tx.virtualPet.create({ data: { id, householdId: actor.householdId, memberId: member.id, serialNumber, appearance: appearance as unknown as Prisma.InputJsonValue, state: pet as unknown as Prisma.InputJsonValue, caregivers: { create: { memberId: member.id, role: "guardian" } }, activities: { create: { actorMemberId: member.id, type: "adopted", details: { serialNumber, appearance } as Prisma.InputJsonValue } } } }) as unknown as SavedPal;
        return { ...view(saved, member.age, now, day, [saved]), message: `Welcome home, ${name}!`, completed: false, reward: null };
      }
      const saved = await accessiblePal(member.id, actor.householdId, body.palId);
      if (!saved) throw new PetActionError("Choose a pal from your roster first.");
      if (body.version !== saved.version) return null;
      const pet = advancePet(saved.state as PetState, now, day);
      const message = applyPetAction(pet, body.action as PetAction, body, now, member.age, randomUUID());
      const completed = completeDailyCare(pet);
      let reward: { points: number; tickets: number } | null = null;
      if (completed) {
        const start = new Date(now - 48 * 3_600_000);
        const sessions = await tx.gameSession.findMany({ where: { householdId: actor.householdId, memberId: member.id, gameKey: "pocket-pals", playedAt: { gte: start } }, select: { playedAt: true } });
        const todayCount = sessions.filter((s) => petDay(s.playedAt.getTime(), household.timeZone) === day).length;
        if (todayCount > 0 || (setting.dailyPlayLimit > 0 && todayCount >= setting.dailyPlayLimit)) throw new PetActionError("Today's care reward has already been collected.");
        const points = setting.rewardType === "points" ? setting.rewardPoints : 0, tickets = setting.rewardType === "tickets" ? setting.rewardTickets : 0;
        await tx.gameSession.create({ data: { householdId: actor.householdId, memberId: member.id, gameKey: gameByKey("pocket-pals")!.key, score: 5, durationSeconds: Math.min(3600, Math.floor((now - pet.daily.startedAt) / 1000)), rewardType: setting.rewardType, rewardPoints: points, rewardTickets: tickets, metadata: { careDay: day, species: pet.species, streak: pet.streak, palId: saved.id } } });
        if (points > 0) { const updated = await tx.familyMember.update({ where: { id: member.id }, data: { totalPoints: { increment: points } } }); await tx.familyMember.update({ where: { id: member.id }, data: { level: getLevelFromPoints(updated.totalPoints) } }); }
        reward = { points, tickets };
      }
      pet.serialNumber = saved.serialNumber; pet.appearance = saved.appearance as PetAppearance;
      const updated = await tx.virtualPet.updateMany({ where: { id: saved.id, version: saved.version }, data: { state: pet as unknown as Prisma.InputJsonValue, version: { increment: 1 } } });
      if (updated.count !== 1) throw new PetConflictError("Your pal changed on another screen. Refresh and try again.");
      await tx.petActivity.create({ data: { virtualPetId: saved.id, actorMemberId: member.id, type: body.action, details: { careDay: day } as Prisma.InputJsonValue } });
      const roster = await listRoster(member.id, actor.householdId);
      return { ...view({ ...saved, state: pet, version: saved.version + 1 }, member.age, now, day, roster), message, completed, reward };
    });
    if (!result) return NextResponse.json({ error: "Your pal changed on another screen. Refresh and try again." }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PetConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof PetActionError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "Your pal changed on another screen. Refresh and try again." }, { status: 409 });
    throw error;
  }
});
