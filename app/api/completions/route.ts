import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcPointsEarned, getLevelFromPoints } from "@/lib/points";
import { getWeekStart } from "@/lib/allowance";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";
import { awardChoreSkillXp } from "@/lib/skills";
import { COMPLETION_EMOJIS } from "@/types";

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const { assignmentId, withPhoto } = body;
  const reactionEmoji = typeof body.reactionEmoji === "string" && COMPLETION_EMOJIS.includes(body.reactionEmoji)
    ? body.reactionEmoji
    : null;
  const completionNote = typeof body.completionNote === "string" && body.completionNote.trim()
    ? body.completionNote.trim().slice(0, 2000)
    : null;

  const assignment = await prisma.choreAssignment.findFirst({
    where: { id: assignmentId, householdId, isActive: true },
    include: { chore: true },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberId = assignment.memberId;
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const existingCompletion = await prisma.taskCompletion.findFirst({
    where: { assignmentId, householdId, completedAt: { gte: todayStart } },
    select: { id: true },
  });
  if (existingCompletion) {
    return NextResponse.json({ error: "Task already completed today" }, { status: 409 });
  }

  const dailyAssignments = await prisma.choreAssignment.findMany({
    where: { householdId, memberId, isActive: true, frequency: "daily" },
    include: { completions: { where: { completedAt: { gte: todayStart } }, take: 1 } },
  });
  const allDone =
    dailyAssignments.length > 0 &&
    dailyAssignments.every((a) => a.completions.length > 0 || a.id === assignmentId);

  const pts = calcPointsEarned(assignment.chore.pointsValue, assignment.chore.requiresPhoto && !!withPhoto, allDone);
  const weekStart = getWeekStart();

  try {
    const completion = await prisma.$transaction(async (tx) => {
      const created = await tx.taskCompletion.create({
        data: { householdId, assignmentId, memberId, completionDate: todayStart, reactionEmoji, completionNote, pointsEarned: pts, weekStartDate: weekStart },
      });

      const member = await tx.familyMember.findUnique({ where: { id: memberId, householdId } });
      if (member) {
        const newPoints = member.totalPoints + pts;
        await tx.familyMember.update({
          where: { id: memberId, householdId },
          data: { totalPoints: newPoints, level: getLevelFromPoints(newPoints) },
        });
        await tx.weeklyAllowance.upsert({
          where: { memberId_weekStart: { memberId, weekStart } },
          create: { householdId, memberId, weekStart, pointsEarned: pts, amountEarned: 0 },
          update: { pointsEarned: { increment: pts } },
        });
      }

      await awardChoreSkillXp(tx, {
        householdId,
        memberId,
        choreId: assignment.choreId,
        completionId: created.id,
        xp: pts,
      });

      return created;
    });

    return NextResponse.json({ completion, pointsEarned: pts }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Task already completed today" }, { status: 409 });
    }
    throw error;
  }
});

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const week = searchParams.get("week");
  const weekStart = week ? new Date(week) : getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const completions = await prisma.taskCompletion.findMany({
    where: {
      ...(memberId && { memberId }),
      householdId,
      member: await childAccessWhere(parentId, householdId),
      completedAt: { gte: weekStart, lt: weekEnd },
    },
    include: { assignment: { include: { chore: true } }, member: true },
    orderBy: { completedAt: "desc" },
  });
  return NextResponse.json(completions);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const { id, verifiedByParent } = body;

  const existing = await prisma.taskCompletion.findFirst({
    where: { id, householdId },
    select: { id: true, verifiedByParent: true, pointsEarned: true, memberId: true, weekStartDate: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, existing.memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const wasVerified = existing.verifiedByParent;
  const willVerify = verifiedByParent === undefined ? wasVerified : Boolean(verifiedByParent);

  const reactionEmoji = typeof body.reactionEmoji === "string" && COMPLETION_EMOJIS.includes(body.reactionEmoji)
    ? body.reactionEmoji
    : body.reactionEmoji === null ? null : undefined;
  const completionNote = typeof body.completionNote === "string"
    ? body.completionNote.trim().slice(0, 2000) || null
    : body.completionNote === null ? null : undefined;

  if (wasVerified === willVerify && reactionEmoji === undefined && completionNote === undefined) {
    return NextResponse.json(existing);
  }

  const baseline = wasVerified
    ? Math.round(existing.pointsEarned / 1.25)
    : existing.pointsEarned;
  const nextPoints = willVerify ? Math.round(baseline * 1.25) : baseline;
  const delta = nextPoints - existing.pointsEarned;

  const completion = await prisma.taskCompletion.update({
    where: { id: existing.id, householdId },
    data: {
      verifiedByParent: willVerify,
      pointsEarned: nextPoints,
      ...(reactionEmoji !== undefined && { reactionEmoji }),
      ...(completionNote !== undefined && { completionNote }),
    },
  });

  if (delta !== 0) {
    const member = await prisma.familyMember.findUnique({
      where: { id: existing.memberId, householdId },
    });
    if (member) {
      const total = Math.max(0, member.totalPoints + delta);
      await prisma.familyMember.update({
        where: { id: member.id, householdId },
        data: { totalPoints: total, level: getLevelFromPoints(total) },
      });
      await prisma.weeklyAllowance.upsert({
        where: { memberId_weekStart: { memberId: member.id, weekStart: existing.weekStartDate } },
        create: {
          householdId,
          memberId: member.id,
          weekStart: existing.weekStartDate,
          pointsEarned: Math.max(0, delta),
          amountEarned: 0,
        },
        update: { pointsEarned: { increment: delta } },
      });
    }
  }

  return NextResponse.json(completion);
});
