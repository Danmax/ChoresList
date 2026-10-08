import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";
import { requireSession, withErrors } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createGameInviteToken, verifyGameInviteToken } from "@/lib/session";

export const runtime = "nodejs";

const cleanId = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const activeMembership = (groupId: string, parentId: string) => ({ groupId, parentId, status: "active" });

function returnPath(groupId?: string, eventId?: string) {
  if (!groupId) return "/parent/games";
  return eventId ? `/community/${groupId}?event=${eventId}` : `/community/${groupId}/friends`;
}

async function invitationPreview(token: string) {
  const invite = verifyGameInviteToken(token);
  if (!invite) return null;
  const [household, inviter, group, event] = await Promise.all([
    prisma.household.findUnique({ where: { id: invite.householdId }, select: { id: true, name: true } }),
    prisma.parentAccount.findFirst({ where: { id: invite.inviterParentId, householdId: invite.householdId }, select: { id: true, displayName: true, email: true } }),
    invite.groupId ? prisma.communityGroup.findUnique({ where: { id: invite.groupId }, select: { id: true, name: true } }) : null,
    invite.eventId && invite.groupId ? prisma.communityEvent.findFirst({ where: { id: invite.eventId, groupId: invite.groupId }, select: { id: true, title: true, date: true } }) : null,
  ]);
  if (!household || !inviter || (invite.groupId && !group) || (invite.eventId && !event)) return null;
  return {
    household: { id: household.id, name: household.name },
    inviter: { name: inviter.displayName || inviter.email.split("@")[0] || "A parent" },
    group,
    event,
    returnTo: returnPath(invite.groupId, invite.eventId),
  };
}

export const GET = withErrors(async (req: NextRequest) => {
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    const invite = await invitationPreview(token);
    if (!invite) return NextResponse.json({ error: "Game invite is invalid, expired, or no longer available" }, { status: 400 });
    return NextResponse.json({ ok: true, invite });
  }

  const { householdId, parentId } = requireSession(req);
  const [memberships, connections] = await Promise.all([
    prisma.communityMember.findMany({
      where: { parentId, status: "active" },
      select: {
        group: {
          select: {
            id: true, name: true,
            events: { where: { date: { gte: new Date() } }, select: { id: true, title: true, date: true }, orderBy: { date: "asc" }, take: 40 },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.gameHouseholdConnection.findMany({
      where: { OR: [{ householdAId: householdId }, { householdBId: householdId }] },
      select: { id: true, householdAId: true, householdBId: true, householdA: { select: { name: true } }, householdB: { select: { name: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    groups: memberships.map(({ group }) => group),
    connections: connections.map((connection) => ({
      id: connection.id,
      householdName: connection.householdAId === householdId ? connection.householdB.name : connection.householdA.name,
      createdAt: connection.createdAt,
    })),
  });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const groupId = cleanId(body.groupId);
  const eventId = cleanId(body.eventId);
  if (eventId && !groupId) return NextResponse.json({ error: "Choose a group before choosing its event" }, { status: 400 });

  if (groupId) {
    const membership = await prisma.communityMember.findFirst({ where: activeMembership(groupId, parentId), select: { id: true } });
    if (!membership) return NextResponse.json({ error: "Join this community group before sharing its games" }, { status: 403 });
    if (eventId && !(await prisma.communityEvent.findFirst({ where: { id: eventId, groupId }, select: { id: true } }))) {
      return NextResponse.json({ error: "That group event is unavailable" }, { status: 404 });
    }
  }

  const token = createGameInviteToken({ householdId, inviterParentId: parentId, groupId, eventId });
  return NextResponse.json({
    inviteUrl: new URL(`/g/${token}`, getBaseUrl(req)).toString(),
    expiresInDays: 14,
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const token = typeof body.token === "string" ? body.token : "";
  const invite = verifyGameInviteToken(token);
  if (!invite) return NextResponse.json({ error: "Game invite is invalid or expired" }, { status: 400 });
  if (invite.householdId === householdId) return NextResponse.json({ error: "This invite belongs to your household" }, { status: 400 });

  const preview = await invitationPreview(token);
  if (!preview) return NextResponse.json({ error: "Game invite is no longer available" }, { status: 404 });
  if (invite.groupId && !(await prisma.communityMember.findFirst({ where: activeMembership(invite.groupId, invite.inviterParentId), select: { id: true } }))) {
    return NextResponse.json({ error: "The inviter is no longer a member of this group" }, { status: 409 });
  }

  const [householdAId, householdBId] = [invite.householdId, householdId].sort();
  const result = await prisma.$transaction(async (tx) => {
    const connection = await tx.gameHouseholdConnection.upsert({
      where: { householdAId_householdBId: { householdAId, householdBId } },
      create: { householdAId, householdBId },
      update: {},
    });
    if (!invite.groupId) return { connection, communityConnection: null, registeredForEvent: false };

    await tx.communityMember.upsert({
      where: { groupId_parentId: { groupId: invite.groupId, parentId } },
      create: { groupId: invite.groupId, parentId, role: "member", status: "active" },
      update: { status: "active" },
    });
    const existingConnection = await tx.communityParentConnection.findFirst({
      where: { groupId: invite.groupId, OR: [{ requesterParentId: invite.inviterParentId, recipientParentId: parentId }, { requesterParentId: parentId, recipientParentId: invite.inviterParentId }] },
    });
    const communityConnection = existingConnection?.status === "blocked"
      ? existingConnection
      : existingConnection
        ? await tx.communityParentConnection.update({ where: { id: existingConnection.id }, data: { status: "active", blockedByParentId: null } })
        : await tx.communityParentConnection.create({ data: { groupId: invite.groupId, requesterParentId: invite.inviterParentId, recipientParentId: parentId, status: "active" } });

    if (!invite.eventId) return { connection, communityConnection, registeredForEvent: false };
    const rsvp = await tx.communityRsvp.findUnique({ where: { eventId_parentId: { eventId: invite.eventId, parentId } }, select: { id: true } });
    if (!rsvp) await tx.communityRsvp.create({ data: { eventId: invite.eventId, parentId, status: "going", guests: 0 } });
    return { connection, communityConnection, registeredForEvent: !rsvp };
  });

  return NextResponse.json({ ok: true, ...result, returnTo: preview.returnTo });
});
