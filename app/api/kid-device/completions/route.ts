import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { getWeekStart } from "@/lib/allowance";
import { calcPointsEarned, getLevelFromPoints } from "@/lib/points";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";
import { COMPLETION_EMOJIS } from "@/types";

async function verifyDevice(req: NextRequest) {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: {
      id: session.deviceId,
      householdId: session.householdId,
      tokenHash: hashDeviceSecret(session.secret),
      revokedAt: null,
    },
  });
  if (!device) return null;
  return session;
}

export const POST = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  const body = await req.json();
  const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : "";
  const reactionEmoji = typeof body.reactionEmoji === "string" && COMPLETION_EMOJIS.includes(body.reactionEmoji)
    ? body.reactionEmoji
    : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const assignment = await prisma.choreAssignment.findFirst({
    where: {
      id: assignmentId,
      householdId: session.householdId,
      isActive: true,
      member: { role: "child" },
      ...(session.mode === "member" && session.memberId ? { memberId: session.memberId } : {}),
    },
    include: {
      chore: true,
      completions: { where: { completedAt: { gte: todayStart } }, take: 1 },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (assignment.completions.length > 0) {
    return NextResponse.json({ error: "Task already completed today" }, { status: 409 });
  }

  const dailyAssignments = await prisma.choreAssignment.findMany({
    where: { householdId: session.householdId, memberId: assignment.memberId, isActive: true, frequency: "daily" },
    include: { completions: { where: { completedAt: { gte: todayStart } }, take: 1 } },
  });
  const allDone =
    dailyAssignments.length > 0 &&
    dailyAssignments.every((task) => task.completions.length > 0 || task.id === assignment.id);

  const pointsEarned = calcPointsEarned(assignment.chore.pointsValue, false, allDone);
  const weekStart = getWeekStart();

  try {
    const completion = await prisma.$transaction(async (tx) => {
      const created = await tx.taskCompletion.create({
        data: {
          householdId: session.householdId,
          assignmentId: assignment.id,
          memberId: assignment.memberId,
          completionDate: todayStart,
          reactionEmoji,
          pointsEarned,
          weekStartDate: weekStart,
        },
      });

      const member = await tx.familyMember.findFirst({
        where: { id: assignment.memberId, householdId: session.householdId },
      });

      if (member) {
        const totalPoints = member.totalPoints + pointsEarned;
        await tx.familyMember.update({
          where: { id: member.id },
          data: { totalPoints, level: getLevelFromPoints(totalPoints) },
        });
        await tx.weeklyAllowance.upsert({
          where: { memberId_weekStart: { memberId: member.id, weekStart } },
          create: { householdId: session.householdId, memberId: member.id, weekStart, pointsEarned, amountEarned: 0 },
          update: { pointsEarned: { increment: pointsEarned } },
        });
      }

      await tx.householdDevice.update({
        where: { id: session.deviceId },
        data: { lastSeenAt: new Date() },
      });

      return created;
    });

    return NextResponse.json({ completion, pointsEarned }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Task already completed today" }, { status: 409 });
    }
    throw error;
  }
});
