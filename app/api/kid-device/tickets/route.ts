import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { getActiveDeviceSession } from "@/lib/device-session";
import { canAccessMember } from "@/lib/child-access";
import { createAppNotification } from "@/lib/app-notifications";

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getActiveDeviceSession(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });

  const body = await req.json();
  const ticketId = typeof body.ticketId === "string" ? body.ticketId : "";
  if (!ticketId) return NextResponse.json({ error: "Reward ticket is required" }, { status: 400 });

  const ticket = await prisma.rewardTicket.findFirst({
    where: {
      id: ticketId,
      householdId: session.householdId,
      status: "pending",
      ...(session.mode === "member" && session.memberId ? { memberId: session.memberId } : {}),
    },
    include: { member: { select: { id: true, name: true, avatar: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "That reward ticket is not available to redeem" }, { status: 404 });

  const parents = await prisma.parentAccount.findMany({
    where: { householdId: session.householdId },
    select: { id: true },
  });
  const recipients = [];
  for (const parent of parents) {
    if (await canAccessMember(parent.id, session.householdId, ticket.memberId)) recipients.push(parent.id);
  }

  await Promise.all(recipients.map((parentId) => createAppNotification({
    recipientParentId: parentId,
    type: "reward-redemption-request",
    title: `${ticket.member.avatar} ${ticket.member.name} wants to redeem a reward`,
    body: `${ticket.rewardEmoji} ${ticket.rewardTitle} is ready to redeem.`,
    url: "/parent/tickets",
    dedupeKey: `reward-redemption-request:${ticket.id}:${parentId}`,
  })));

  return NextResponse.json({ ok: true });
});
