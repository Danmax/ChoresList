import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireParentSession, withErrors } from "@/lib/api";
import { prisma } from "@/lib/prisma";

async function memberInHousehold(householdId: string, value: unknown) {
  if (typeof value !== "string") return null;
  return prisma.familyMember.findFirst({ where: { id: value, householdId }, select: { id: true, name: true, avatar: true } });
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const [pals, members] = await Promise.all([
    prisma.virtualPet.findMany({
      where: { householdId }, orderBy: { createdAt: "desc" },
      include: {
        member: { select: { id: true, name: true, avatar: true } },
        caregivers: { include: { member: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
        activities: { include: { actorMember: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "desc" }, take: 12 },
      },
    }),
    prisma.familyMember.findMany({ where: { householdId }, select: { id: true, name: true, avatar: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ pals, members });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const pal = typeof body.palId === "string" ? await prisma.virtualPet.findFirst({ where: { id: body.palId, householdId } }) : null;
  if (!pal) return NextResponse.json({ error: "Pocket Pal not found." }, { status: 404 });

  if (body.action === "transfer") {
    const recipient = await memberInHousehold(householdId, body.memberId);
    if (!recipient) return NextResponse.json({ error: "Choose a family member in this household." }, { status: 400 });
    const keepPreviousCaregiver = body.keepPreviousCaregiver === true;
    await prisma.$transaction(async (tx) => {
      await tx.virtualPet.update({ where: { id: pal.id }, data: { memberId: recipient.id } });
      await tx.petCaregiver.upsert({ where: { virtualPetId_memberId: { virtualPetId: pal.id, memberId: recipient.id } }, create: { virtualPetId: pal.id, memberId: recipient.id, role: "guardian" }, update: { role: "guardian" } });
      if (pal.memberId !== recipient.id) {
        if (keepPreviousCaregiver) await tx.petCaregiver.upsert({ where: { virtualPetId_memberId: { virtualPetId: pal.id, memberId: pal.memberId } }, create: { virtualPetId: pal.id, memberId: pal.memberId, role: "caregiver" }, update: { role: "caregiver" } });
        else await tx.petCaregiver.deleteMany({ where: { virtualPetId: pal.id, memberId: pal.memberId } });
      }
      await tx.petActivity.create({ data: { virtualPetId: pal.id, type: "transferred", details: { fromMemberId: pal.memberId, toMemberId: recipient.id, keepPreviousCaregiver } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add-caregiver") {
    const caregiver = await memberInHousehold(householdId, body.memberId);
    if (!caregiver) return NextResponse.json({ error: "Choose a family member in this household." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.petCaregiver.upsert({ where: { virtualPetId_memberId: { virtualPetId: pal.id, memberId: caregiver.id } }, create: { virtualPetId: pal.id, memberId: caregiver.id, role: caregiver.id === pal.memberId ? "guardian" : "caregiver" }, update: {} });
      await tx.petActivity.create({ data: { virtualPetId: pal.id, type: "caregiver_added", details: { memberId: caregiver.id } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove-caregiver") {
    if (body.memberId === pal.memberId) return NextResponse.json({ error: "Transfer the Pal before removing their primary guardian." }, { status: 400 });
    const caregiver = await memberInHousehold(householdId, body.memberId);
    if (!caregiver) return NextResponse.json({ error: "Family member not found." }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.petCaregiver.deleteMany({ where: { virtualPetId: pal.id, memberId: caregiver.id } });
      await tx.petActivity.create({ data: { virtualPetId: pal.id, type: "caregiver_removed", details: { memberId: caregiver.id } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown Pocket Pal action." }, { status: 400 });
});
