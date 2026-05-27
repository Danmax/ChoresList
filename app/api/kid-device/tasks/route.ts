import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";

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

export const GET = withErrors(async (req: NextRequest) => {
  const session = await verifyDevice(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();

  const assignments = await prisma.choreAssignment.findMany({
    where: {
      householdId: session.householdId,
      isActive: true,
      ...(session.mode === "member" && session.memberId ? { memberId: session.memberId } : {}),
      member: { role: "child" },
      OR: [
        { frequency: "daily" },
        { frequency: "weekly", dayOfWeek },
        { frequency: "monthly", dueDate: { not: null } },
        { frequency: "one-time", dueDate: { gte: today } },
      ],
    },
    include: {
      chore: true,
      member: { select: { id: true, name: true, avatar: true, color: true, totalPoints: true, level: true } },
      completions: {
        where: { completedAt: { gte: today } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ member: { name: "asc" } }, { createdAt: "asc" }],
  });

  const visibleAssignments = assignments.filter((assignment) => {
    if (assignment.frequency !== "monthly") return true;
    return assignment.dueDate?.getDate() === today.getDate();
  });

  await prisma.householdDevice.update({
    where: { id: session.deviceId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json(visibleAssignments);
});
