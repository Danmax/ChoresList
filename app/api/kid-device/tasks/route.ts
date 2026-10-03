import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { getActiveDeviceSession } from "@/lib/device-session";
import { isMonthlyChoreOpen, startOfDay, startOfMonth } from "@/lib/chore-schedule";

export const GET = withErrors(async (req: NextRequest) => {
  const session = await getActiveDeviceSession(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("catalog") === "1") {
    const [members, chores, assignments] = await Promise.all([
      prisma.familyMember.findMany({
        where: {
          householdId: session.householdId,
          role: "child",
          ...(session.mode === "member" && session.memberId ? { id: session.memberId } : {}),
        },
        select: { id: true, name: true, avatar: true, color: true },
        orderBy: { name: "asc" },
      }),
      prisma.chore.findMany({
        where: { householdId: session.householdId },
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
          pointsValue: true,
          category: true,
          requiresPhoto: true,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.choreAssignment.findMany({
        where: {
          householdId: session.householdId,
          isActive: true,
          member: { role: "child", ...(session.mode === "member" && session.memberId ? { id: session.memberId } : {}) },
        },
        select: { memberId: true, choreId: true },
      }),
    ]);

    await prisma.householdDevice.update({
      where: { id: session.deviceId },
      data: { lastSeenAt: new Date() },
    });

    const assignedMemberIdsByChore = new Map<string, string[]>();
    for (const assignment of assignments) {
      assignedMemberIdsByChore.set(assignment.choreId, [...(assignedMemberIdsByChore.get(assignment.choreId) ?? []), assignment.memberId]);
    }
    return NextResponse.json({ members, chores: chores.map((chore) => ({ ...chore, assignedMemberIds: assignedMemberIdsByChore.get(chore.id) ?? [] })) });
  }

  const today = startOfDay();
  const monthStart = startOfMonth(today);
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
      chore: { include: { instructions: true } },
      member: { select: { id: true, name: true, avatar: true, color: true, totalPoints: true, level: true } },
      completions: {
        where: { completedAt: { gte: monthStart } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ member: { name: "asc" } }, { createdAt: "asc" }],
  });

  const visibleAssignments = assignments.filter((assignment) => {
    if (assignment.frequency !== "monthly") return true;
    return isMonthlyChoreOpen(assignment.dueDate, today);
  }).map((assignment) => ({
    ...assignment,
    completions: assignment.frequency === "monthly"
      ? assignment.completions
      : assignment.completions.filter((completion) => completion.completedAt >= today),
  }));

  await prisma.householdDevice.update({
    where: { id: session.deviceId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json(visibleAssignments);
});

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getActiveDeviceSession(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const body = await req.json();
  const requestedMemberId = typeof body.memberId === "string" ? body.memberId : "";
  const memberId = session.mode === "member" && session.memberId ? session.memberId : requestedMemberId;
  const choreId = typeof body.choreId === "string" ? body.choreId : "";
  if (!memberId || !choreId) return NextResponse.json({ error: "Choose a child and task" }, { status: 400 });

  const [member, chore, existing] = await Promise.all([
    prisma.familyMember.findFirst({ where: { id: memberId, householdId: session.householdId, role: "child" }, select: { id: true } }),
    prisma.chore.findFirst({ where: { id: choreId, householdId: session.householdId }, select: { id: true } }),
    prisma.choreAssignment.findFirst({ where: { householdId: session.householdId, memberId, choreId, isActive: true }, select: { id: true } }),
  ]);
  if (!member || !chore) return NextResponse.json({ error: "Child or task not found" }, { status: 404 });
  if (existing) return NextResponse.json({ error: "That task is already on this child’s list" }, { status: 409 });

  const assignment = await prisma.choreAssignment.create({
    data: { householdId: session.householdId, memberId, choreId, frequency: "one-time", dueDate: startOfDay() },
    include: { chore: true, member: true },
  });
  await prisma.householdDevice.update({ where: { id: session.deviceId }, data: { lastSeenAt: new Date() } });
  return NextResponse.json(assignment, { status: 201 });
});
