import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcWeeklyAllowance, getWeekStart } from "@/lib/allowance";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");

  const allowances = await prisma.weeklyAllowance.findMany({
    where: memberId ? { memberId: parseInt(memberId) } : undefined,
    include: { member: true },
    orderBy: { weekStart: "desc" },
  });
  return NextResponse.json(allowances);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { memberId } = body;

  const settings = await prisma.allowanceSettings.findUnique({ where: { memberId } });
  if (!settings) return NextResponse.json({ error: "No allowance settings" }, { status: 400 });

  const weekStart = getWeekStart();
  const existing = await prisma.weeklyAllowance.findFirst({
    where: { memberId, weekStart },
  });

  const pointsEarned = existing?.pointsEarned ?? 0;
  const amountEarned = calcWeeklyAllowance(
    settings.weeklyBaseRate,
    pointsEarned,
    settings.pointsToDollar
  );

  const allowance = await prisma.weeklyAllowance.upsert({
    where: existing ? { id: existing.id } : { memberId_weekStart: { memberId, weekStart } } as never,
    create: { memberId, weekStart, pointsEarned, amountEarned },
    update: { amountEarned },
  });
  return NextResponse.json(allowance);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, paidOut } = body;
  const allowance = await prisma.weeklyAllowance.update({
    where: { id },
    data: { paidOut },
  });
  return NextResponse.json(allowance);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { memberId, weeklyBaseRate, pointsToDollar } = body;
  const settings = await prisma.allowanceSettings.upsert({
    where: { memberId },
    create: { memberId, weeklyBaseRate, pointsToDollar },
    update: { weeklyBaseRate, pointsToDollar },
  });
  return NextResponse.json(settings);
}
