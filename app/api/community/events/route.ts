import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole, requireEventCommunityRole } from "@/lib/community";

const EVENT_TYPES = new Set(["potluck", "service", "practice", "meeting", "game", "class", "social", "other"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanType(value: unknown) {
  return typeof value === "string" && EVENT_TYPES.has(value) ? value : "other";
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanStarterItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((item, index) => {
      const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        title: cleanRequiredText(raw.title, 120),
        quantity: cleanText(raw.quantity, 64),
        note: cleanText(raw.note, 500),
        sortOrder: index,
      };
    })
    .filter((item) => item.title);
}

const eventInclude = {
  group: { select: { id: true, name: true } },
  rsvps: { include: { parent: { select: { id: true, email: true } } } },
  items: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      assignedTo: { select: { id: true, email: true } },
      claimedBy: { select: { id: true, email: true } },
    },
  },
} satisfies Prisma.CommunityEventInclude;

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const groupId = Number.parseInt(searchParams.get("groupId") ?? "0", 10);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }

  await requireCommunityRole(groupId, parentId, "member");
  const events = await prisma.communityEvent.findMany({
    where: { groupId },
    include: eventInclude,
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = Number.parseInt(String(body.groupId ?? ""), 10);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }
  await requireCommunityRole(groupId, parentId, "manager");

  const title = cleanRequiredText(body.title, 120);
  const date = cleanDate(body.date);
  if (!title) return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Event date is required" }, { status: 400 });

  const event = await prisma.communityEvent.create({
    data: {
      groupId,
      createdByParentId: parentId,
      title,
      eventType: cleanType(body.eventType),
      date,
      endDate: cleanDate(body.endDate),
      allDay: Boolean(body.allDay),
      location: cleanText(body.location, 180),
      imageUrl: cleanText(body.imageUrl, 512),
      notes: cleanText(body.notes, 1000),
      items: {
        create: cleanStarterItems(body.items),
      },
    },
    include: eventInclude,
  });

  return NextResponse.json(event, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const id = Number.parseInt(String(body.id ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  await requireEventCommunityRole(id, parentId, "manager");

  const title = body.title !== undefined ? cleanRequiredText(body.title, 120) : undefined;
  if (title !== undefined && !title) return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  const date = body.date !== undefined ? cleanDate(body.date) : undefined;
  if (date === null) return NextResponse.json({ error: "Event date is required" }, { status: 400 });

  const event = await prisma.communityEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(body.eventType !== undefined && { eventType: cleanType(body.eventType) }),
      ...(date !== undefined && { date }),
      ...(body.endDate !== undefined && { endDate: cleanDate(body.endDate) }),
      ...(body.allDay !== undefined && { allDay: Boolean(body.allDay) }),
      ...(body.location !== undefined && { location: cleanText(body.location, 180) }),
      ...(body.imageUrl !== undefined && { imageUrl: cleanText(body.imageUrl, 512) }),
      ...(body.notes !== undefined && { notes: cleanText(body.notes, 1000) }),
    },
    include: eventInclude,
  });

  return NextResponse.json(event);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = Number.parseInt(searchParams.get("id") ?? "0", 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  await requireEventCommunityRole(id, parentId, "manager");
  await prisma.communityEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
