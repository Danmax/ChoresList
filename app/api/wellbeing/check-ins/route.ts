import { NextRequest, NextResponse } from "next/server";
import { requireParentSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";
import { requirePluginAccess } from "@/lib/plugins/registry";
import { prisma } from "@/lib/prisma";

const MOODS = new Set(["great", "awesome", "cool", "good", "okay", "low", "sad", "frustrated", "tired", "overwhelmed"]);

function cleanNote(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginAccess(householdId, parentId, "emotional-wellbeing");
  const memberAccess = await childAccessWhere(parentId, householdId);
  const checkIns = await prisma.wellbeingCheckIn.findMany({
    where: { householdId, member: memberAccess },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(checkIns);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginAccess(householdId, parentId, "emotional-wellbeing");
  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const mood = typeof body.mood === "string" && MOODS.has(body.mood) ? body.mood : "";
  if (!memberId || !mood) return NextResponse.json({ error: "Family member and mood are required" }, { status: 400 });
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const checkIn = await prisma.wellbeingCheckIn.create({
    data: {
      householdId,
      memberId,
      recordedByParentId: parentId,
      mood,
      note: cleanNote(body.note),
      supportRequested: body.supportRequested === true,
    },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
  });
  return NextResponse.json(checkIn, { status: 201 });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  await requirePluginAccess(householdId, parentId, "emotional-wellbeing");
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const checkIn = await prisma.wellbeingCheckIn.findFirst({ where: { id, householdId }, select: { id: true, memberId: true } });
  if (!checkIn) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, checkIn.memberId))) {
    return NextResponse.json({ error: "You do not have access to this check-in" }, { status: 403 });
  }
  await prisma.wellbeingCheckIn.delete({ where: { id: checkIn.id } });
  return NextResponse.json({ ok: true });
});
