import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { sendCommunityInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { createCommunityInviteToken, verifyCommunityInviteToken } from "@/lib/session";
import { requirePluginAccess } from "@/lib/plugins/registry";

export const runtime = "nodejs";

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 255) : "";
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanRole(value: unknown) {
  return value === "owner" || value === "manager" || value === "member" ? value : "member";
}

const ROLE_RANK = { member: 1, manager: 2, owner: 3 } as const;

function communityPath(groupId: string, eventId?: string | null) {
  const path = `/community/${groupId}`;
  return eventId ? `${path}?event=${eventId}` : path;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const invite = verifyCommunityInviteToken(searchParams.get("token") ?? undefined);
  if (!invite) return NextResponse.json({ error: "Community invite is invalid or expired" }, { status: 400 });

  const group = await prisma.communityGroup.findUnique({
    where: { id: invite.groupId },
    select: { id: true, name: true, groupType: true, description: true, location: true },
  });
  if (!group) return NextResponse.json({ error: "Community group not found" }, { status: 404 });

  const event = invite.eventId
    ? await prisma.communityEvent.findFirst({
        where: { id: invite.eventId, groupId: invite.groupId },
        select: {
          id: true,
          title: true,
          eventType: true,
          date: true,
          endDate: true,
          allDay: true,
          location: true,
          meetingUrl: true,
          registrationUrl: true,
          imageUrl: true,
          notes: true,
        },
      })
    : null;
  if (invite.eventId && !event) {
    return NextResponse.json({ error: "Community event not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    invite: {
      role: invite.role,
      returnTo: communityPath(invite.groupId, invite.eventId),
      group,
      event,
    },
  });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId, email: inviterEmail } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "community-events");
  const body = await req.json();
  const groupId = cleanId(body.groupId);
  const eventId = cleanId(body.eventId);
  const role = cleanRole(body.role);
  const email = cleanEmail(body.email);

  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  await requireCommunityRole(groupId, parentId, role === "member" ? "manager" : "owner");

  const group = await prisma.communityGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });
  if (!group) return NextResponse.json({ error: "Community group not found" }, { status: 404 });

  const event = eventId
    ? await prisma.communityEvent.findFirst({
        where: { id: eventId, groupId },
        select: { id: true, title: true },
      })
    : null;
  if (eventId && !event) {
    return NextResponse.json({ error: "Community event not found" }, { status: 404 });
  }

  const token = createCommunityInviteToken({ groupId, role, eventId: event?.id });
  const inviteUrl = new URL(`/c/${token}`, getBaseUrl(req));

  const result = await sendCommunityInviteEmail({
    to: email,
    inviteUrl: inviteUrl.toString(),
    groupName: group.name,
    eventTitle: event?.title,
    inviterEmail,
  });

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    inviteUrl: !result.sent && process.env.NODE_ENV !== "production" ? inviteUrl.toString() : undefined,
  });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "community-events");
  const body = await req.json();
  const invite = verifyCommunityInviteToken(typeof body.token === "string" ? body.token : undefined);
  if (!invite) return NextResponse.json({ error: "Community invite is invalid or expired" }, { status: 400 });

  const group = await prisma.communityGroup.findUnique({
    where: { id: invite.groupId },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Community group not found" }, { status: 404 });

  if (invite.eventId) {
    const event = await prisma.communityEvent.findFirst({
      where: { id: invite.eventId, groupId: invite.groupId },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Community event not found" }, { status: 404 });
  }

  const existing = await prisma.communityMember.findUnique({
    where: { groupId_parentId: { groupId: invite.groupId, parentId } },
    select: { role: true },
  });
  const existingRole = cleanRole(existing?.role);
  const role = existing && ROLE_RANK[existingRole] > ROLE_RANK[invite.role] ? existingRole : invite.role;

  const member = await prisma.communityMember.upsert({
    where: { groupId_parentId: { groupId: invite.groupId, parentId } },
    create: { groupId: invite.groupId, parentId, role, status: "active" },
    update: { role, status: "active" },
    include: { parent: { select: { id: true, email: true } } },
  });

  return NextResponse.json({
    ok: true,
    member,
    returnTo: communityPath(invite.groupId, invite.eventId),
  });
});
