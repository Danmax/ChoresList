import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";
import { isMonthlyChoreOpen, startOfDay, startOfMonth } from "@/lib/chore-schedule";

function dateFromInput(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const scope = searchParams.get("scope");
  const today = startOfDay();
  const monthStart = startOfMonth(today);
  const dayOfWeek = today.getDay();
  const assignments = await prisma.choreAssignment.findMany({
    where: {
      isActive: true,
      householdId,
      ...(memberId && { memberId }),
      member: await childAccessWhere(parentId, householdId),
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
        where: { completedAt: { gte: monthStart } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const visibleAssignments = (scope === "all" ? assignments : assignments.filter((assignment) => {
    if (assignment.frequency !== "monthly") return true;
    return isMonthlyChoreOpen(assignment.dueDate, today);
  })).map((assignment) => ({
    ...assignment,
    completions: assignment.frequency === "monthly"
      ? assignment.completions
      : assignment.completions.filter((completion) => completion.completedAt >= today),
  }));
  return NextResponse.json(visibleAssignments);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const requestedMemberIds: unknown[] = Array.isArray(body.memberIds) ? body.memberIds : [body.memberId];
  const memberIds = Array.from(new Set(requestedMemberIds.filter((id): id is string => typeof id === "string" && id.length > 0)));
  if (memberIds.length === 0) return NextResponse.json({ error: "Choose at least one family member" }, { status: 400 });
  if (!(await Promise.all(memberIds.map((memberId) => canAccessMember(parentId, householdId, memberId)))).every(Boolean)) {
    return NextResponse.json({ error: "You do not have access to one or more family members" }, { status: 403 });
  }
  const requestedChoreIds: unknown[] = Array.isArray(body.choreIds) ? body.choreIds : [body.choreId];
  const choreIds: string[] = Array.from(new Set(
    requestedChoreIds.filter((id): id is string => typeof id === "string" && id.length > 0)
  ));
  if (choreIds.length === 0) {
    return NextResponse.json({ error: "Choose at least one chore" }, { status: 400 });
  }

  const [members, chores] = await Promise.all([
    prisma.familyMember.findMany({ where: { id: { in: memberIds }, householdId } }),
    prisma.chore.findMany({ where: { id: { in: choreIds }, householdId }, select: { id: true, ageMin: true, ageMax: true } }),
  ]);
  if (members.length !== memberIds.length || chores.length !== choreIds.length) {
    return NextResponse.json({ error: "A family member or chore was not found" }, { status: 404 });
  }

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
  const monthlyCompletionTarget = Math.min(31, Math.max(1, Math.round(Number(body.monthlyCompletionTarget) || 1)));

  if ((frequency === "monthly" || frequency === "one-time") && !dueDate) {
    return NextResponse.json({ error: "Choose a date" }, { status: 400 });
  }

  const memberById = new Map(members.map((member) => [member.id, member]));
  const choresById = new Map(chores.map((chore) => [chore.id, chore]));
  const eligible = memberIds.flatMap((memberId) => choreIds.flatMap((choreId) => {
    const member = memberById.get(memberId)!;
    const chore = choresById.get(choreId)!;
    // Adults may receive any household task. For children, do not quietly put
    // an age-inappropriate task into an age-group batch.
    const adult = ["mom", "dad", "parent", "grandparent"].includes(member.role);
    return adult || (member.age >= chore.ageMin && member.age <= chore.ageMax)
      ? weeklyDays.map((dayOfWeek) => ({ householdId, memberId, choreId, frequency, dueDate, dayOfWeek, monthlyCompletionTarget }))
      : [];
  }));
  if (eligible.length === 0) return NextResponse.json({ error: "None of the selected chores match the selected members' ages" }, { status: 400 });

  if (frequency === "daily" && body.allowDuplicateDaily !== true) {
    const existing = await prisma.choreAssignment.findMany({
      where: { householdId, isActive: true, frequency: "daily", memberId: { in: memberIds }, choreId: { in: choreIds } },
      include: { member: { select: { name: true } }, chore: { select: { name: true } } },
    });
    if (existing.length > 0) {
      const names = existing.slice(0, 4).map((assignment) => `${assignment.chore.name} for ${assignment.member.name}`);
      return NextResponse.json({ error: `Daily assignment already exists: ${names.join(", ")}${existing.length > names.length ? "…" : ""}. Enable another daily copy only if you really need it.` }, { status: 409 });
    }
  }

  const assignments = await prisma.$transaction(
    eligible.map((assignmentData) =>
      prisma.choreAssignment.create({
        data: assignmentData,
        include: { chore: true, member: true },
      })
    )
  );

  return NextResponse.json({ assignments, skippedCount: memberIds.length * choreIds.length * weeklyDays.length - eligible.length }, { status: 201 });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const memberId = searchParams.get("memberId") ?? "";
  if (searchParams.get("all") === "1") {
    if (!memberId) return NextResponse.json({ error: "Choose a family member first" }, { status: 400 });
    if (!(await canAccessMember(parentId, householdId, memberId))) {
      return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
    }
    const result = await prisma.choreAssignment.updateMany({
      where: { householdId, memberId, isActive: true },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, removed: result.count });
  }
  const assignment = await prisma.choreAssignment.findFirst({ where: { id, householdId }, select: { memberId: true } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, assignment.memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  await prisma.choreAssignment.update({ where: { id, householdId }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
});
