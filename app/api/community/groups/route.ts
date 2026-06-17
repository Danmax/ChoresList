import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { optionalSession, requireSession, withErrors } from "@/lib/api";
import { getBaseUrl } from "@/lib/base-url";
import { requireCommunityRole } from "@/lib/community";
import { createCommunityInviteToken } from "@/lib/session";

const GROUP_TYPES = new Set(["church", "nonprofit", "sports", "school", "hobby", "neighborhood", "other"]);
const VISIBILITIES = new Set(["private", "public"]);

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
  creator: { select: { id: true, email: true } },
  members: {
    where: { status: "active" },
    include: { parent: { select: { id: true, email: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  },
  events: {
    orderBy: { date: "asc" },
    include: {
      rsvps: { include: { parent: { select: { id: true, email: true } } } },
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          assignedTo: { select: { id: true, email: true } },
          claimedBy: { select: { id: true, email: true } },
        },
      },
    },
  },
} satisfies Prisma.CommunityGroupInclude;

function communityPath(groupId: string, eventId?: string | null) {
  const path = `/community/${groupId}`;
  return eventId ? `${path}?event=${eventId}` : path;
}

function publicInviteUrl(req: NextRequest, groupId: string, eventId?: string | null) {
  const token = createCommunityInviteToken({ groupId, role: "member", eventId });
  const inviteUrl = new URL("/parent", getBaseUrl(req));
  inviteUrl.searchParams.set("communityInvite", token);
  inviteUrl.searchParams.set("returnTo", communityPath(groupId, eventId));
  return inviteUrl.toString();
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
    const visibleEvents = currentMembership
      ? group.events
      : group.events.filter((event) => event.visibility === "public");
    if (eventId && !visibleEvents.some((event) => event.id === eventId)) {
      return NextResponse.json({ error: "Community event not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...group,
      members: currentMembership ? group.members : [],
      events: visibleEvents.map((event) => ({
        ...event,
        publicInviteUrl: event.visibility === "public" ? publicInviteUrl(req, group.id, event.id) : null,
      })),
      groupInviteUrl: currentMembership && ["owner", "manager"].includes(currentMembership.role)
        ? publicInviteUrl(req, group.id)
        : null,
      currentMembership,
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
      creator: { select: { id: true, email: true } },
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

  return NextResponse.json(groups.map((group) => ({
    ...group,
    currentMembership: parentId ? group.members.find((member) => member.parentId === parentId) ?? null : null,
  })));
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
