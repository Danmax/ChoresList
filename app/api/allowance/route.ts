import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcWeeklyAllowance, getWeekStart } from "@/lib/allowance";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
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
  const member = await prisma.familyMember.findFirst({ where: { id: memberId, householdId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  const settings = await prisma.allowanceSettings.upsert({
    where: { memberId },
    create: { householdId, memberId, weeklyBaseRate, pointsToDollar },
    update: { weeklyBaseRate, pointsToDollar },
  });
  return NextResponse.json(settings);
});
