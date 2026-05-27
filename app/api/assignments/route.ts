import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

function dateFromInput(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const scope = searchParams.get("scope");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const assignments = await prisma.choreAssignment.findMany({
    where: {
      isActive: true,
      householdId,
      ...(memberId && { memberId: parseInt(memberId) }),
      ...(scope === "all"
        ? {}
        : {
            OR: [
              { frequency: "daily" },
              { frequency: "weekly", dayOfWeek },
              { frequency: "monthly", dueDate: { not: null } },
              { frequency: "one-time", dueDate: { gte: today } },
            ],
          }),
    },
    include: {
      chore: { include: { instructions: true } },
      member: true,
      completions: {
        where: { completedAt: { gte: today } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const visibleAssignments = scope === "all"
    ? assignments
    : assignments.filter((assignment) => {
        if (assignment.frequency !== "monthly") return true;
        return assignment.dueDate?.getDate() === today.getDate();
      });
  return NextResponse.json(visibleAssignments);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const [member, chore] = await Promise.all([
    prisma.familyMember.findFirst({ where: { id: body.memberId, householdId } }),
    prisma.chore.findFirst({ where: { id: body.choreId, householdId } }),
  ]);
  if (!member || !chore) return NextResponse.json({ error: "Member or chore not found" }, { status: 404 });

  const frequency = typeof body.frequency === "string" ? body.frequency : "daily";
  const dayOfWeeks = Array.isArray(body.dayOfWeeks)
    ? body.dayOfWeeks.map((day: unknown) => Number(day)).filter((day: number) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const weeklyDays: Array<number | null> = frequency === "weekly"
    ? Array.from(new Set(dayOfWeeks.length > 0 ? dayOfWeeks : [Number(body.dayOfWeek)]))
    : [null];

  if (frequency === "weekly" && weeklyDays.some((day) => day === null || !Number.isInteger(day))) {
    return NextResponse.json({ error: "Choose at least one weekday" }, { status: 400 });
  }

  const dueDate = dateFromInput(body.dueDate);

  if ((frequency === "monthly" || frequency === "one-time") && !dueDate) {
    return NextResponse.json({ error: "Choose a date" }, { status: 400 });
  }

  const data = weeklyDays.map((dayOfWeek) => ({
    householdId,
    memberId: body.memberId,
    choreId: body.choreId,
    frequency,
    dueDate,
    dayOfWeek,
  }));

  const assignments = await prisma.$transaction(
    data.map((assignmentData) =>
      prisma.choreAssignment.create({
        data: assignmentData,
        include: { chore: true, member: true },
      })
    )
  );

  return NextResponse.json(assignments.length === 1 ? assignments[0] : assignments, { status: 201 });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.choreAssignment.update({ where: { id, householdId }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
});
