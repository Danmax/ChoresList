import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole, requireEventCommunityRole } from "@/lib/community";

const EVENT_TYPES = new Set(["potluck", "service", "practice", "meeting", "game", "class", "social", "other"]);
const VISIBILITIES = new Set(["private", "public"]);
const RECURRING = new Set(["none", "daily", "weekly", "biweekly", "monthly"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanType(value: unknown) {
  return typeof value === "string" && EVENT_TYPES.has(value) ? value : "other";
}

function cleanVisibility(value: unknown) {
  return typeof value === "string" && VISIBILITIES.has(value) ? value : "private";
}

function cleanRecurring(value: unknown) {
  return typeof value === "string" && RECURRING.has(value) ? value : "none";
}

function cleanRecurringCount(value: unknown, recurring: string) {
  if (recurring === "none") return null;
  const count = Number(value);
  if (!Number.isFinite(count)) return null;
  return Math.max(1, Math.min(104, Math.round(count)));
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addRecurringInterval(date: Date, recurring: string, step: number) {
  const next = new Date(date);
  if (recurring === "daily") next.setDate(next.getDate() + step);
  if (recurring === "weekly") next.setDate(next.getDate() + step * 7);
  if (recurring === "biweekly") next.setDate(next.getDate() + step * 14);
  if (recurring === "monthly") next.setMonth(next.getMonth() + step);
  return next;
}

function buildOccurrences(start: Date, end: Date | null, recurring: string, recurringCount: number | null, recurringEndDate: Date | null) {
  if (recurring === "none") return [{ date: start, endDate: end, sessionNumber: null }];

  const maxCount = recurringCount ?? 12;
  const durationMs = end ? end.getTime() - start.getTime() : null;
  const occurrences = [];
  for (let index = 0; index < maxCount; index++) {
    const date = addRecurringInterval(start, recurring, index);
    if (recurringEndDate && date > recurringEndDate) break;
    occurrences.push({
      date,
      endDate: durationMs !== null ? new Date(date.getTime() + durationMs) : null,
      sessionNumber: index + 1,
    });
  }
  return occurrences.length ? occurrences : [{ date: start, endDate: end, sessionNumber: 1 }];
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
    include: { parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } } },
  },
} satisfies Prisma.CommunityEventInclude;

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

function publicEvent(event: Prisma.CommunityEventGetPayload<{ include: typeof eventInclude }>, showEmail: boolean) {
  return {
    ...event,
    rsvps: event.rsvps.map((rsvp) => ({ ...rsvp, parent: publicParent(rsvp.parent, showEmail) })),
    items: event.items.map((item) => ({
      ...item,
      assignedTo: publicParent(item.assignedTo, showEmail),
      claimedBy: publicParent(item.claimedBy, showEmail),
    })),
    attendance: event.attendance.map((attendance) => ({
      ...attendance,
      participant: {
        ...attendance.participant,
        parent: publicParent(attendance.participant.parent, showEmail),
      },
    })),
    messages: event.messages.map((message) => ({ ...message, parent: publicParent(message.parent, showEmail) })),
  };
}

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  if (!groupId) {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }

  const membership = await requireCommunityRole(groupId, parentId, "member");
  const events = await prisma.communityEvent.findMany({
    where: { groupId },
    include: eventInclude,
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events.map((event) => publicEvent(event, membership.role === "owner" || membership.role === "manager")));
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId) {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }
  const membership = await requireCommunityRole(groupId, parentId, "manager");

  const title = cleanRequiredText(body.title, 120);
  const date = cleanDate(body.date);
  if (!title) return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Event date is required" }, { status: 400 });
  const endDate = cleanDate(body.endDate);
  const recurring = cleanRecurring(body.recurring);
  const recurringCount = cleanRecurringCount(body.recurringCount, recurring);
  const recurringEndDate = recurring === "none" ? null : cleanDate(body.recurringEndDate);
  const occurrences = buildOccurrences(date, endDate, recurring, recurringCount, recurringEndDate);
  const seriesId = occurrences.length > 1 ? randomUUID() : null;
  const starterItems = cleanStarterItems(body.items);

  const events = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const occurrence of occurrences) {
      const event = await tx.communityEvent.create({
        data: {
          groupId,
          createdByParentId: parentId,
          title,
          eventType: cleanType(body.eventType),
          date: occurrence.date,
          endDate: occurrence.endDate,
          allDay: Boolean(body.allDay),
          recurring,
          recurringEndDate,
          recurringCount: recurring === "none" ? null : occurrences.length,
          seriesId,
          sessionNumber: occurrence.sessionNumber,
          location: cleanText(body.location, 180),
          imageUrl: cleanText(body.imageUrl, 512),
          visibility: cleanVisibility(body.visibility),
          notes: cleanText(body.notes, 1000),
          items: {
            create: starterItems,
          },
        },
        include: eventInclude,
      });
      created.push(event);
    }
    return created;
  });

  const publicEvents = events.map((event) => publicEvent(event, membership.role === "owner" || membership.role === "manager"));
  if (publicEvents.length === 1) {
    return NextResponse.json(publicEvents[0], { status: 201 });
  }

  return NextResponse.json({ event: publicEvents[0], events: publicEvents }, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  const { membership } = await requireEventCommunityRole(id, parentId, "manager");

  const title = body.title !== undefined ? cleanRequiredText(body.title, 120) : undefined;
  if (title !== undefined && !title) return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  const date = body.date !== undefined ? cleanDate(body.date) : undefined;
  if (date === null) return NextResponse.json({ error: "Event date is required" }, { status: 400 });

  const recurring = body.recurring !== undefined ? cleanRecurring(body.recurring) : undefined;
  const event = await prisma.communityEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(body.eventType !== undefined && { eventType: cleanType(body.eventType) }),
      ...(date !== undefined && { date }),
      ...(body.endDate !== undefined && { endDate: cleanDate(body.endDate) }),
      ...(body.allDay !== undefined && { allDay: Boolean(body.allDay) }),
      ...(recurring !== undefined && { recurring }),
      ...(body.recurringEndDate !== undefined && { recurringEndDate: recurring === "none" ? null : cleanDate(body.recurringEndDate) }),
      ...(body.recurringCount !== undefined && { recurringCount: recurring === "none" ? null : cleanRecurringCount(body.recurringCount, recurring ?? "weekly") }),
      ...(body.location !== undefined && { location: cleanText(body.location, 180) }),
      ...(body.imageUrl !== undefined && { imageUrl: cleanText(body.imageUrl, 512) }),
      ...(body.visibility !== undefined && { visibility: cleanVisibility(body.visibility) }),
      ...(body.notes !== undefined && { notes: cleanText(body.notes, 1000) }),
      },
    include: eventInclude,
  });

  return NextResponse.json(publicEvent(event, membership.role === "owner" || membership.role === "manager"));
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  await requireEventCommunityRole(id, parentId, "manager");
  await prisma.communityEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
