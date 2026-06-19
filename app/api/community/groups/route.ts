import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { optionalSession, requireSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { requireCommunityRole } from "@/lib/community";
import { createCommunityInviteToken } from "@/lib/session";

const GROUP_TYPES = new Set(["church", "nonprofit", "sports", "school", "hobby", "neighborhood", "other"]);
const VISIBILITIES = new Set(["private", "public"]);
const MANAGER_ROLES = new Set(["owner", "manager"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanType(value: unknown) {
  return typeof value === "string" && GROUP_TYPES.has(value) ? value : "other";
}

function cleanVisibility(value: unknown) {
  return typeof value === "string" && VISIBILITIES.has(value) ? value : "private";
}

const groupInclude = {
  creator: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
  members: {
    where: { status: "active" },
    include: { parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  },
  participants: {
    where: { status: "active" },
    include: {
      member: { select: { id: true, name: true, avatar: true, color: true, role: true } },
      parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
    },
    orderBy: [{ displayName: "asc" }, { joinedAt: "asc" }],
  },
  meritBadges: {
    where: { isActive: true },
    include: { skill: { select: { id: true, name: true, icon: true } }, _count: { select: { awards: true } } },
    orderBy: { createdAt: "desc" },
  },
  events: {
    orderBy: { date: "desc" },
    take: 500,
    include: {
      classPlan: {
        include: {
          skill: { select: { id: true, name: true, icon: true } },
          badge: { select: { id: true, title: true, icon: true } },
        },
      },
      attendance: {
        include: {
          participant: {
            include: {
              member: { select: { id: true, name: true, avatar: true, color: true } },
              parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
            },
          },
        },
      },
      skillTests: {
        where: { status: "active" },
        include: {
          skill: { select: { id: true, name: true, icon: true } },
          badge: { select: { id: true, title: true, icon: true } },
          attempts: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              participant: { include: { member: { select: { id: true, name: true, avatar: true, color: true } } } },
            },
          },
        },
      },
      rsvps: { include: { parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } } } },
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          assignedTo: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
          claimedBy: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } } },
      },
    },
  },
} satisfies Prisma.CommunityGroupInclude;

function publicInviteUrl(req: NextRequest, groupId: string, eventId?: string | null) {
  const token = createCommunityInviteToken({ groupId, role: "member", eventId });
  return new URL(`/c/${token}`, getBaseUrl(req)).toString();
}

function canViewEmails(role?: string | null) {
  return role ? MANAGER_ROLES.has(role) : false;
}

function displayLabel(parent: { email?: string | null; displayName?: string | null; relationshipLabel?: string | null } | null) {
  if (!parent) return "Member";
  return parent.displayName || parent.relationshipLabel || parent.email?.split("@")[0] || "Member";
}

function publicParent<T extends { id: string; email?: string | null; displayName?: string | null; relationshipLabel?: string | null }>(
  parent: T | null,
  showEmail: boolean
) {
  if (!parent) return null;
  return {
    id: parent.id,
    label: displayLabel(parent),
    displayName: parent.displayName ?? null,
    relationshipLabel: parent.relationshipLabel ?? null,
    ...(showEmail ? { email: parent.email ?? null } : {}),
  };
}

function publicMembership(member: Prisma.CommunityMemberGetPayload<{ include: typeof groupInclude.members.include }>, showEmail: boolean) {
  return {
    id: member.id,
    groupId: member.groupId,
    parentId: member.parentId,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    parent: publicParent(member.parent, showEmail),
  };
}

function publicParticipant(
  participant: Prisma.CommunityParticipantGetPayload<{ include: typeof groupInclude.participants.include }>,
  showEmail: boolean
) {
  return {
    ...participant,
    parent: publicParent(participant.parent, showEmail),
  };
}

function publicEvent(
  req: NextRequest,
  groupId: string,
  event: Prisma.CommunityEventGetPayload<{ include: typeof groupInclude.events.include }>,
  showEmail: boolean,
  showRoster: boolean
) {
  return {
    ...event,
    publicInviteUrl: event.visibility === "public" ? publicInviteUrl(req, groupId, event.id) : null,
    rsvps: event.rsvps.map((rsvp) => ({
      ...rsvp,
      parent: publicParent(rsvp.parent, showEmail),
    })),
    items: event.items.map((item) => ({
      ...item,
      assignedTo: publicParent(item.assignedTo, showEmail),
      claimedBy: publicParent(item.claimedBy, showEmail),
    })),
    attendance: showRoster
      ? event.attendance.map((attendance) => ({
          ...attendance,
          participant: {
            ...attendance.participant,
            parent: publicParent(attendance.participant.parent, showEmail),
          },
        }))
      : [],
    skillTests: showRoster
      ? event.skillTests
      : event.skillTests.map((test) => ({ ...test, attempts: [] })),
    messages: event.messages.map((message) => ({
      ...message,
      parent: publicParent(message.parent, showEmail),
    })),
  };
}

export const GET = withErrors(async (req: NextRequest) => {
  const session = optionalSession(req);
  const parentId = session?.parentId ?? null;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const eventId = searchParams.get("event") ?? "";
  const discover = searchParams.get("discover") === "true";

  if (id) {
    const group = await prisma.communityGroup.findFirst({
      where: {
        id,
        OR: [
          { visibility: "public" },
          eventId
            ? { events: { some: { id: eventId, visibility: "public" } } }
            : { events: { some: { visibility: "public" } } },
          ...(parentId ? [{ members: { some: { parentId, status: "active" } } }] : []),
        ],
      },
      include: groupInclude,
    });
    if (!group) return NextResponse.json({ error: "Community group not found" }, { status: 404 });
    const currentMembership = parentId ? group.members.find((member) => member.parentId === parentId) ?? null : null;
    const showEmails = canViewEmails(currentMembership?.role);
    const visibleEvents = currentMembership
      ? group.events
      : group.events.filter((event) => event.visibility === "public");
    if (eventId && !visibleEvents.some((event) => event.id === eventId)) {
      return NextResponse.json({ error: "Community event not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...group,
      creator: publicParent(group.creator, showEmails),
      members: currentMembership ? group.members.map((member) => publicMembership(member, showEmails)) : [],
      participants: currentMembership ? group.participants.map((participant) => publicParticipant(participant, showEmails)) : [],
      events: visibleEvents.map((event) => publicEvent(req, group.id, event, showEmails, Boolean(currentMembership))),
      meritBadges: currentMembership ? group.meritBadges : [],
      groupInviteUrl: currentMembership && ["owner", "manager"].includes(currentMembership.role)
        ? publicInviteUrl(req, group.id)
        : null,
      currentMembership: currentMembership
        ? {
            id: currentMembership.id,
            groupId: currentMembership.groupId,
            parentId: currentMembership.parentId,
            role: currentMembership.role,
            status: currentMembership.status,
            emailNotificationsEnabled: currentMembership.emailNotificationsEnabled,
            emailItemAssignments: currentMembership.emailItemAssignments,
            emailEventReminders: currentMembership.emailEventReminders,
            emailRegistrationUpdates: currentMembership.emailRegistrationUpdates,
            emailManagerWeeklySummary: currentMembership.emailManagerWeeklySummary,
            joinedAt: currentMembership.joinedAt,
          }
        : null,
      currentParentId: parentId,
    });
  }

  if (!parentId && !discover) return NextResponse.json([]);

  const groups = await prisma.communityGroup.findMany({
    where: discover
      ? {
          OR: [
            { visibility: "public" },
            { events: { some: { visibility: "public", date: { gte: new Date() } } } },
            ...(parentId ? [{ members: { some: { parentId, status: "active" } } }] : []),
          ],
        }
      : { members: { some: { parentId: parentId!, status: "active" } } },
    include: {
      creator: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
      members: { where: { status: "active" }, select: { id: true, parentId: true, role: true } },
      events: {
        where: {
          date: { gte: new Date() },
          ...(discover ? { visibility: "public" } : {}),
        },
        orderBy: { date: "asc" },
        take: 3,
      },
      _count: { select: { members: true, events: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(groups.map((group) => {
    const currentMembership = parentId ? group.members.find((member) => member.parentId === parentId) ?? null : null;
    return {
      ...group,
      creator: publicParent(group.creator, canViewEmails(currentMembership?.role)),
      currentMembership,
    };
  }));
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const name = cleanRequiredText(body.name, 120);
  if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.communityGroup.create({
      data: {
        creatorParentId: parentId,
        name,
        groupType: cleanType(body.groupType),
        description: cleanText(body.description, 1000),
        location: cleanText(body.location, 180),
        visibility: cleanVisibility(body.visibility),
      },
    });
    await tx.communityMember.create({
      data: {
        groupId: created.id,
        parentId,
        role: "owner",
      },
    });
    return created;
  });

  return NextResponse.json(group, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }
  await requireCommunityRole(id, parentId, "manager");

  const name = body.name !== undefined ? cleanRequiredText(body.name, 120) : undefined;
  if (name !== undefined && !name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

  const group = await prisma.communityGroup.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(body.groupType !== undefined && { groupType: cleanType(body.groupType) }),
      ...(body.description !== undefined && { description: cleanText(body.description, 1000) }),
      ...(body.location !== undefined && { location: cleanText(body.location, 180) }),
      ...(body.visibility !== undefined && { visibility: cleanVisibility(body.visibility) }),
    },
    include: groupInclude,
  });

  return NextResponse.json(group);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }
  await requireCommunityRole(id, parentId, "owner");
  await prisma.communityGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
