import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");

  const tickets = await prisma.rewardTicket.findMany({
    where: {
      ...(memberId && { memberId: parseInt(memberId) }),
      ...(status && { status }),
    },
    include: {
      member: { select: { id: true, name: true, avatar: true, color: true } },
      project: { select: { id: true, title: true, emoji: true, category: true } },
    },
    orderBy: { earnedAt: "desc" },
  });
  return NextResponse.json(tickets);
});

export const PUT = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const { id, status } = body;
  const ticket = await prisma.rewardTicket.update({
    where: { id },
    data: {
      status,
      ...(status === "redeemed" && { redeemedAt: new Date() }),
    },
  });
  return NextResponse.json(ticket);
});
