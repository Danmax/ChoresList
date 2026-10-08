import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { deviceSession, getActiveDeviceSession, type DeviceSessionPayload } from "@/lib/device-session";
import { isMonthlyChoreOpen, startOfMonth } from "@/lib/chore-schedule";

export function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function gameActor(req: NextRequest) {
  if (req.cookies.has(deviceSession.name)) {
    const device = await getActiveDeviceSession(req);
    if (device) return { householdId: device.householdId, parentId: null as string | null, device };
  }
  const parent = requireSession(req);
  return { householdId: parent.householdId, parentId: parent.parentId, device: null as DeviceSessionPayload | null };
}

export async function accessibleMember(actor: Awaited<ReturnType<typeof gameActor>>, memberId: string) {
  const select = { id: true, name: true, avatar: true, avatarConfig: true, avatarImageUrl: true, color: true, totalPoints: true, age: true } as const;
  if (actor.device) {
    if (actor.device.mode === "member" && actor.device.memberId !== memberId) return null;
    return prisma.familyMember.findFirst({
      where: { id: memberId, householdId: actor.householdId, ...(actor.device.mode === "household" ? { role: { in: ["child", "young-adult"] } } : {}) },
      select,
    });
  }
  if (!actor.parentId || !(await canAccessMember(actor.parentId, actor.householdId, memberId))) return null;
  return prisma.familyMember.findFirst({ where: { id: memberId, householdId: actor.householdId }, select });
}

export async function openChoreCount(householdId: string, memberId: string) {
  const assignments = await prisma.choreAssignment.findMany({
    where: { householdId, memberId, isActive: true },
    select: { frequency: true, dayOfWeek: true, dueDate: true, monthlyCompletionTarget: true,
      completions: { where: { completedAt: { gte: startOfMonth() } }, select: { completedAt: true } } },
  });
  const today = todayStart();
  return assignments.filter((assignment) => {
    const due = assignment.frequency === "daily" ||
      (assignment.frequency === "weekly" && assignment.dayOfWeek === today.getDay()) ||
      (assignment.frequency === "monthly" && assignment.dueDate && isMonthlyChoreOpen(assignment.dueDate, today)) ||
      (assignment.frequency === "one-time" && assignment.dueDate && assignment.dueDate >= today);
    if (!due) return false;
    const completions = assignment.frequency === "monthly" ? assignment.completions.length
      : assignment.completions.filter((completion) => completion.completedAt >= today).length;
    return completions < (assignment.frequency === "monthly" ? assignment.monthlyCompletionTarget : 1);
  }).length;
}
