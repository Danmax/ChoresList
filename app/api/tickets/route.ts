import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");

  const tickets = await prisma.rewardTicket.findMany({
    where: {
      householdId,
      member: await childAccessWhere(parentId, householdId),
      ...(memberId && { memberId }),
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
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const { id, status } = body;
  const existing = await prisma.rewardTicket.findFirst({ where: { id, householdId }, select: { memberId: true } });
  if (!existing) return NextResponse.json({ error: "Reward ticket not found" }, { status: 404 });
  if (!(await canAccessMember(parentId, householdId, existing.memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const ticket = await prisma.rewardTicket.update({
    where: { id, householdId },
    data: {
      status,
      ...(status === "redeemed" && { redeemedAt: new Date() }),
    },
  });
  return NextResponse.json(ticket);
});
