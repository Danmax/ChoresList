import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "month";

  const now = new Date();
  let startDate: Date;
  if (range === "week") {
    startDate = weekStart(now);
  } else if (range === "month") {
    startDate = weekStart(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000));
  } else {
    startDate = weekStart(new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000));
  }

  const [members, completions, assignments] = await Promise.all([
    prisma.familyMember.findMany({ where: { householdId }, orderBy: { totalPoints: "desc" } }),
    prisma.taskCompletion.findMany({
      where: { householdId, completedAt: { gte: startDate } },
      include: {
        member: { select: { id: true, name: true, color: true, avatar: true } },
        assignment: { include: { chore: { select: { name: true, icon: true, category: true } } } },
      },
      orderBy: { completedAt: "asc" },
    }),
    prisma.choreAssignment.findMany({
      where: { householdId, isActive: true },
      include: { chore: { select: { name: true, icon: true, category: true } } },
    }),
  ]);

  const weekMap = new Map<string, Record<string, number | string>>();
  for (const c of completions) {
    const label = weekLabel(weekStart(c.completedAt));
    if (!weekMap.has(label)) weekMap.set(label, { week: label });
    const entry = weekMap.get(label)!;
    entry[c.member.name] = ((entry[c.member.name] as number) ?? 0) + c.pointsEarned;
  }

  const completionWeekMap = new Map<string, Record<string, number | string>>();
  for (const c of completions) {
    const label = weekLabel(weekStart(c.completedAt));
    if (!completionWeekMap.has(label)) completionWeekMap.set(label, { week: label });
    const entry = completionWeekMap.get(label)!;
    entry[c.member.name] = ((entry[c.member.name] as number) ?? 0) + 1;
  }

  const choreMap = new Map<string, { name: string; icon: string; count: number; points: number }>();
  for (const c of completions) {
    const name = c.assignment.chore.name;
    const existing = choreMap.get(name) ?? { name, icon: c.assignment.chore.icon, count: 0, points: 0 };
    existing.count++;
    existing.points += c.pointsEarned;
    choreMap.set(name, existing);
  }

  const catMap = new Map<string, { category: string; count: number; points: number }>();
  for (const c of completions) {
    const cat = c.assignment.chore.category;
    const existing = catMap.get(cat) ?? { category: cat, count: 0, points: 0 };
    existing.count++;
    existing.points += c.pointsEarned;
    catMap.set(cat, existing);
  }

  const assignCountByMember = new Map<number, number>();
  for (const a of assignments) {
    assignCountByMember.set(a.memberId, (assignCountByMember.get(a.memberId) ?? 0) + 1);
  }

  const memberStats = members.map((m) => {
    const mc = completions.filter((c) => c.memberId === m.id);
    return {
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      color: m.color,
      role: m.role,
      totalPoints: m.totalPoints,
      level: m.level,
      completionCount: mc.length,
      pointsInRange: mc.reduce((sum, c) => sum + c.pointsEarned, 0),
      assignmentCount: assignCountByMember.get(m.id) ?? 0,
    };
  });

  return NextResponse.json({
    members: memberStats,
    weekly: Array.from(weekMap.values()),
    weeklyCompletions: Array.from(completionWeekMap.values()),
    topChores: Array.from(choreMap.values()).sort((a, b) => b.count - a.count).slice(0, 8),
    byCategory: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
    totalCompletions: completions.length,
    totalPoints: completions.reduce((sum, c) => sum + c.pointsEarned, 0),
  });
});
