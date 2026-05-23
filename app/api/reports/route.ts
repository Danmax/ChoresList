import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "month";

  const now = new Date();
  let startDate: Date;
  if (range === "week") {
    startDate = weekStart(now);
  } else if (range === "month") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 28);
    startDate = weekStart(startDate);
  } else {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 84);
    startDate = weekStart(startDate);
  }

  const [members, completions, assignments] = await Promise.all([
    prisma.familyMember.findMany({ orderBy: { totalPoints: "desc" } }),
    prisma.taskCompletion.findMany({
      where: { completedAt: { gte: startDate } },
      include: {
        member: { select: { id: true, name: true, color: true, avatar: true } },
        assignment: { include: { chore: { select: { name: true, icon: true, category: true } } } },
      },
      orderBy: { completedAt: "asc" },
    }),
    prisma.choreAssignment.findMany({
      where: { isActive: true },
      include: { chore: { select: { name: true, icon: true, category: true } } },
    }),
  ]);

  // Weekly points chart data: [{ week, [memberName]: points }]
  const weekMap = new Map<string, Record<string, number | string>>();
  for (const c of completions) {
    const ws = weekStart(c.completedAt);
    const label = weekLabel(ws);
    if (!weekMap.has(label)) weekMap.set(label, { week: label });
    const entry = weekMap.get(label)!;
    entry[c.member.name] = ((entry[c.member.name] as number) ?? 0) + c.pointsEarned;
  }
  const weekly = Array.from(weekMap.values());

  // Completions chart data: [{ week, [memberName]: count }]
  const completionWeekMap = new Map<string, Record<string, number | string>>();
  for (const c of completions) {
    const ws = weekStart(c.completedAt);
    const label = weekLabel(ws);
    if (!completionWeekMap.has(label)) completionWeekMap.set(label, { week: label });
    const entry = completionWeekMap.get(label)!;
    entry[c.member.name] = ((entry[c.member.name] as number) ?? 0) + 1;
  }
  const weeklyCompletions = Array.from(completionWeekMap.values());

  // Top chores
  const choreMap = new Map<string, { name: string; icon: string; count: number; points: number }>();
  for (const c of completions) {
    const name = c.assignment.chore.name;
    const existing = choreMap.get(name) ?? { name, icon: c.assignment.chore.icon, count: 0, points: 0 };
    existing.count++;
    existing.points += c.pointsEarned;
    choreMap.set(name, existing);
  }
  const topChores = Array.from(choreMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);

  // By category
  const catMap = new Map<string, { category: string; count: number; points: number }>();
  for (const c of completions) {
    const cat = c.assignment.chore.category;
    const existing = catMap.get(cat) ?? { category: cat, count: 0, points: 0 };
    existing.count++;
    existing.points += c.pointsEarned;
    catMap.set(cat, existing);
  }
  const byCategory = Array.from(catMap.values()).sort((a, b) => b.count - a.count);

  // Assignments per member
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
    weekly,
    weeklyCompletions,
    topChores,
    byCategory,
    totalCompletions: completions.length,
    totalPoints: completions.reduce((sum, c) => sum + c.pointsEarned, 0),
  });
}
