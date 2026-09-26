import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcScheduledAllowance, calcWeeklyAllowance, cleanPayoutSchedule, getPayoutPeriod, getWeekStart } from "@/lib/allowance";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  if (searchParams.get("summary") === "1") {
    const members = await prisma.familyMember.findMany({ where: { householdId, role: "child", ...(memberId && { id: memberId }) }, include: { allowanceSetting: true } });
    const summaries = await Promise.all(members.map(async (member) => {
      const schedule = cleanPayoutSchedule(member.allowanceSetting?.payoutSchedule) ?? "weekly";
      const period = getPayoutPeriod(schedule);
      const [points, payment] = await Promise.all([
        prisma.taskCompletion.aggregate({ where: { householdId, memberId: member.id, completedAt: { gte: period.start, lt: period.end } }, _sum: { pointsEarned: true } }),
        prisma.allowancePayment.findUnique({ where: { memberId_schedule_periodStart: { memberId: member.id, schedule, periodStart: period.start } } }),
      ]);
      const pointsEarned = points._sum.pointsEarned ?? 0;
      const amountEarned = calcScheduledAllowance(member.allowanceSetting?.weeklyBaseRate ?? 0, pointsEarned, member.allowanceSetting?.pointsToDollar ?? 0.1, schedule, period.start, period.end);
      return { memberId: member.id, schedule, periodStart: period.start, periodEnd: period.end, pointsEarned, amountEarned, paidOut: Boolean(payment), cashAppTag: member.allowanceSetting?.cashAppTag ?? null };
    }));
    return NextResponse.json(summaries);
  }
  const allowances = await prisma.weeklyAllowance.findMany({
    where: { householdId, ...(memberId && { memberId }) },
    include: { member: true },
    orderBy: { weekStart: "desc" },
  });
  return NextResponse.json(allowances);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const { memberId } = body;
  if (body.action === "payPeriod") {
    const schedule = cleanPayoutSchedule(body.schedule);
    if (!schedule || typeof memberId !== "string") return NextResponse.json({ error: "Invalid payout period" }, { status: 400 });
    const member = await prisma.familyMember.findFirst({ where: { id: memberId, householdId, role: "child" }, include: { allowanceSetting: true } });
    if (!member || (cleanPayoutSchedule(member.allowanceSetting?.payoutSchedule) ?? "weekly") !== schedule) return NextResponse.json({ error: "Payout settings changed" }, { status: 409 });
    const period = getPayoutPeriod(schedule);
    const points = await prisma.taskCompletion.aggregate({ where: { householdId, memberId, completedAt: { gte: period.start, lt: period.end } }, _sum: { pointsEarned: true } });
    const pointsEarned = points._sum.pointsEarned ?? 0;
    const amountPaid = calcScheduledAllowance(member.allowanceSetting?.weeklyBaseRate ?? 0, pointsEarned, member.allowanceSetting?.pointsToDollar ?? 0.1, schedule, period.start, period.end);
    const payment = await prisma.allowancePayment.create({ data: { householdId, memberId, schedule, periodStart: period.start, periodEnd: period.end, pointsEarned, amountPaid } }).catch(() => null);
    if (!payment) return NextResponse.json({ error: "This period has already been paid" }, { status: 409 });
    return NextResponse.json(payment, { status: 201 });
  }
  const member = await prisma.familyMember.findFirst({ where: { id: memberId, householdId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  const settings = await prisma.allowanceSettings.findFirst({ where: { memberId, householdId } });
  if (!settings) return NextResponse.json({ error: "No allowance settings" }, { status: 400 });
  const weekStart = getWeekStart();
  const existing = await prisma.weeklyAllowance.findFirst({ where: { householdId, memberId, weekStart } });
  const pointsEarned = existing?.pointsEarned ?? 0;
  const amountEarned = calcWeeklyAllowance(settings.weeklyBaseRate, pointsEarned, settings.pointsToDollar);
  const allowance = await prisma.weeklyAllowance.upsert({
    where: { memberId_weekStart: { memberId, weekStart } },
    create: { householdId, memberId, weekStart, pointsEarned, amountEarned },
    update: { amountEarned },
  });
  return NextResponse.json(allowance);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const { id, paidOut } = body;
  const allowance = await prisma.weeklyAllowance.update({ where: { id, householdId }, data: { paidOut } });
  return NextResponse.json(allowance);
});

export const PATCH = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const { memberId, weeklyBaseRate, pointsToDollar } = body;
  const payoutSchedule = cleanPayoutSchedule(body.payoutSchedule) ?? "weekly";
  const rawCashAppTag = typeof body.cashAppTag === "string" ? body.cashAppTag.trim() : "";
  const cashAppTag = rawCashAppTag ? (rawCashAppTag.startsWith("$") ? rawCashAppTag : `$${rawCashAppTag}`) : null;
  if (cashAppTag && !/^\$[A-Za-z0-9_]{1,20}$/.test(cashAppTag)) return NextResponse.json({ error: "Enter a valid Cash App $cashtag" }, { status: 400 });
  const member = await prisma.familyMember.findFirst({ where: { id: memberId, householdId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  const settings = await prisma.allowanceSettings.upsert({
    where: { memberId },
    create: { householdId, memberId, weeklyBaseRate, pointsToDollar, cashAppTag, payoutSchedule },
    update: { weeklyBaseRate, pointsToDollar, cashAppTag, payoutSchedule },
  });
  return NextResponse.json(settings);
});
