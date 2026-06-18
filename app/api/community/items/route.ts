import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole, requireEventCommunityRole } from "@/lib/community";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanOptionalParentId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return cleanId(value);
}

const itemInclude = {
  assignedTo: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
  claimedBy: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
  event: { select: { id: true, groupId: true } },
} satisfies Prisma.CommunityEventItemInclude;

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

function publicItem(item: Prisma.CommunityEventItemGetPayload<{ include: typeof itemInclude }>, showEmail: boolean) {
  return {
    ...item,
    assignedTo: publicParent(item.assignedTo, showEmail),
    claimedBy: publicParent(item.claimedBy, showEmail),
  };
}

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const eventId = cleanId(body.eventId);
  if (!eventId) return NextResponse.json({ error: "Event is required" }, { status: 400 });
  const { event, membership } = await requireEventCommunityRole(eventId, parentId, "manager");

  const title = cleanRequiredText(body.title, 120);
  if (!title) return NextResponse.json({ error: "Item title is required" }, { status: 400 });

  const assignedToParentId = cleanOptionalParentId(body.assignedToParentId);
  if (assignedToParentId) {
    const assignedMember = await prisma.communityMember.findFirst({
      where: { groupId: event.groupId, parentId: assignedToParentId, status: "active" },
      select: { id: true },
    });
    if (!assignedMember) {
      return NextResponse.json({ error: "Assigned person must be a group member" }, { status: 400 });
    }
  }

  const sortOrder = await prisma.communityEventItem.count({ where: { eventId } });
  const item = await prisma.communityEventItem.create({
    data: {
      eventId,
      title,
      quantity: cleanText(body.quantity, 64),
      note: cleanText(body.note, 500),
      assignedToParentId,
      status: assignedToParentId ? "assigned" : "open",
      sortOrder,
    },
    include: itemInclude,
  });

  return NextResponse.json(publicItem(item, membership.role === "owner" || membership.role === "manager"), { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const id = cleanId(body.id);
  if (!id) return NextResponse.json({ error: "Item is required" }, { status: 400 });

  const existing = await prisma.communityEventItem.findUnique({
    where: { id },
    include: { event: { select: { id: true, groupId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (body.action === "claim") {
    const membership = await requireCommunityRole(existing.event.groupId, parentId, "member");
    const item = await prisma.communityEventItem.update({
      where: { id },
      data: {
        claimedByParentId: parentId,
        status: "claimed",
        claimNote: cleanText(body.claimNote, 500),
      },
      include: itemInclude,
    });
    return NextResponse.json(publicItem(item, membership.role === "owner" || membership.role === "manager"));
  }

  if (body.action === "unclaim") {
    const membership = await requireCommunityRole(existing.event.groupId, parentId, "member");
    if (existing.claimedByParentId !== parentId && membership.role === "member") {
      return NextResponse.json({ error: "Only the claimant or a manager can unclaim this item" }, { status: 403 });
    }
    const item = await prisma.communityEventItem.update({
      where: { id },
      data: {
        claimedByParentId: null,
        claimNote: null,
        status: existing.assignedToParentId ? "assigned" : "open",
      },
      include: itemInclude,
    });
    return NextResponse.json(publicItem(item, membership.role === "owner" || membership.role === "manager"));
  }

  const { membership } = await requireEventCommunityRole(existing.eventId, parentId, "manager");
  const title = body.title !== undefined ? cleanRequiredText(body.title, 120) : undefined;
  if (title !== undefined && !title) return NextResponse.json({ error: "Item title is required" }, { status: 400 });

  const assignedToParentId = cleanOptionalParentId(body.assignedToParentId);
  if (assignedToParentId) {
    const assignedMember = await prisma.communityMember.findFirst({
      where: { groupId: existing.event.groupId, parentId: assignedToParentId, status: "active" },
      select: { id: true },
    });
    if (!assignedMember) {
      return NextResponse.json({ error: "Assigned person must be a group member" }, { status: 400 });
    }
  }

  const item = await prisma.communityEventItem.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(body.quantity !== undefined && { quantity: cleanText(body.quantity, 64) }),
      ...(body.note !== undefined && { note: cleanText(body.note, 500) }),
      ...(body.assignedToParentId !== undefined && { assignedToParentId }),
      ...(body.sortOrder !== undefined && { sortOrder: Math.max(0, cleanInt(body.sortOrder) ?? 0) }),
      ...(body.assignedToParentId !== undefined && !existing.claimedByParentId && {
        status: assignedToParentId ? "assigned" : "open",
      }),
    },
    include: itemInclude,
  });

  return NextResponse.json(publicItem(item, membership.role === "owner" || membership.role === "manager"));
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Item is required" }, { status: 400 });

  const item = await prisma.communityEventItem.findUnique({
    where: { id },
    select: { eventId: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  await requireEventCommunityRole(item.eventId, parentId, "manager");
  await prisma.communityEventItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
