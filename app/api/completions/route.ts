import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcPointsEarned, getLevelFromPoints } from "@/lib/points";
import { getWeekStart } from "@/lib/allowance";
import { requireSession, withErrors } from "@/lib/api";

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const body = await req.json();
  const { assignmentId, memberId, withPhoto } = body;

  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId, householdId },
    include: { chore: true },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dailyAssignments = await prisma.choreAssignment.findMany({
    where: { householdId, memberId, isActive: true, frequency: "daily" },
    include: { completions: { where: { completedAt: { gte: todayStart } }, take: 1 } },
  });
  const allDone =
    dailyAssignments.length > 0 &&
    dailyAssignments.every((a) => a.completions.length > 0 || a.id === assignmentId);

  const pts = calcPointsEarned(assignment.chore.pointsValue, !!withPhoto, allDone);
  const weekStart = getWeekStart();

  const completion = await prisma.taskCompletion.create({
    data: { householdId, assignmentId, memberId, pointsEarned: pts, weekStartDate: weekStart },
  });

  const member = await prisma.familyMember.findUnique({ where: { id: memberId, householdId } });
  if (member) {
    const newPoints = member.totalPoints + pts;
    await prisma.familyMember.update({
      where: { id: memberId, householdId },
      data: { totalPoints: newPoints, level: getLevelFromPoints(newPoints) },
    });
    await prisma.weeklyAllowance.upsert({
      where: { memberId_weekStart: { memberId, weekStart } },
      create: { householdId, memberId, weekStart, pointsEarned: pts, amountEarned: 0 },
      update: { pointsEarned: { increment: pts } },
    });
  }

  return NextResponse.json({ completion, pointsEarned: pts }, { status: 201 });
});

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const week = searchParams.get("week");
  const weekStart = week ? new Date(week) : getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const completions = await prisma.taskCompletion.findMany({
    where: {
      ...(memberId && { memberId: parseInt(memberId) }),
      householdId,
      completedAt: { gte: weekStart, lt: weekEnd },
    },
    include: { assignment: { include: { chore: true } }, member: true },
    orderBy: { completedAt: "desc" },
  });
  return NextResponse.json(completions);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const body = await req.json();
  const { id, verifiedByParent } = body;
  const completion = await prisma.taskCompletion.update({
    where: { id, householdId },
    data: {
      verifiedByParent,
      ...(verifiedByParent && { pointsEarned: { multiply: 1.25 } as never }),
    },
  });
  return NextResponse.json(completion);
});
