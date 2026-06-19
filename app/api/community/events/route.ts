import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole, requireEventCommunityRole } from "@/lib/community";
import { syncOneTimeEventReminders } from "@/lib/community-notifications";

const EVENT_TYPES = new Set(["potluck", "service", "practice", "meeting", "appointment", "doctor", "conference", "worship", "workshop", "fundraiser", "game", "class", "social", "other"]);
const VISIBILITIES = new Set(["private", "public"]);
const RECURRING = new Set(["none", "daily", "weekly", "biweekly", "monthly", "monthly-date", "monthly-weekday", "monthly-last-weekday"]);

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

function cleanUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const normalized = url.toString();
    return normalized.length <= 1024 ? normalized : null;
  } catch {
    return null;
  }
}

function cleanRecurring(value: unknown) {
  return typeof value === "string" && RECURRING.has(value) ? value : "none";
}

function cleanTimeZone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value.slice(0, 64);
  } catch {
    return "UTC";
  }
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

function cleanRecurringEndDate(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return cleanDate(`${value}T23:59:59.999Z`);
  }
  return cleanDate(value);
}

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
  return values as ZonedParts;
}

function zonedDateTimeToUtc(parts: ZonedParts, timeZone: string) {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute, current.second);
    guess += target - represented;
  }
  return new Date(guess);
}

function addRecurringInterval(date: Date, recurring: string, step: number, timeZone: string): Date | null {
  const start = zonedParts(date, timeZone);
  const wallDate = new Date(Date.UTC(start.year, start.month - 1, start.day, start.hour, start.minute, start.second));
  if (recurring === "daily") wallDate.setUTCDate(wallDate.getUTCDate() + step);
  if (recurring === "weekly") wallDate.setUTCDate(wallDate.getUTCDate() + step * 7);
  if (recurring === "biweekly") wallDate.setUTCDate(wallDate.getUTCDate() + step * 14);
  if (["monthly", "monthly-date", "monthly-weekday", "monthly-last-weekday"].includes(recurring)) {
    const preferredDay = wallDate.getUTCDate();
    const preferredWeekday = wallDate.getUTCDay();
    const ordinal = Math.ceil(preferredDay / 7);
    wallDate.setUTCDate(1);
    wallDate.setUTCMonth(wallDate.getUTCMonth() + step);
    const lastDay = new Date(Date.UTC(wallDate.getUTCFullYear(), wallDate.getUTCMonth() + 1, 0)).getUTCDate();
    if (recurring === "monthly") wallDate.setUTCDate(Math.min(preferredDay, lastDay));
    if (recurring === "monthly-date") {
      if (preferredDay > lastDay) return null;
      wallDate.setUTCDate(preferredDay);
    }
    if (recurring === "monthly-weekday") {
      const firstWeekday = wallDate.getUTCDay();
      const targetDay = 1 + ((preferredWeekday - firstWeekday + 7) % 7) + ((ordinal - 1) * 7);
      if (targetDay > lastDay) return null;
      wallDate.setUTCDate(targetDay);
    }
    if (recurring === "monthly-last-weekday") {
      wallDate.setUTCDate(lastDay);
      wallDate.setUTCDate(lastDay - ((wallDate.getUTCDay() - preferredWeekday + 7) % 7));
    }
  }
  return zonedDateTimeToUtc({
    year: wallDate.getUTCFullYear(),
    month: wallDate.getUTCMonth() + 1,
    day: wallDate.getUTCDate(),
    hour: wallDate.getUTCHours(),
    minute: wallDate.getUTCMinutes(),
    second: wallDate.getUTCSeconds(),
  }, timeZone);
}

function buildOccurrences(start: Date, end: Date | null, recurring: string, recurringCount: number | null, recurringEndDate: Date | null, timeZone: string) {
  if (recurring === "none") return [{ date: start, endDate: end, sessionNumber: null }];

  const maxCount = recurringCount ?? 12;
  const durationMs = end ? end.getTime() - start.getTime() : null;
  const occurrences = [];
  const maxSteps = maxCount + 240;
  for (let step = 0; occurrences.length < maxCount && step < maxSteps; step++) {
    const date = addRecurringInterval(start, recurring, step, timeZone);
    if (!date) continue;
    if (recurringEndDate && date > recurringEndDate) break;
    occurrences.push({
      date,
      endDate: durationMs !== null ? new Date(date.getTime() + durationMs) : null,
      sessionNumber: occurrences.length + 1,
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
  if (endDate && endDate < date) {
    return NextResponse.json({ error: "Event end must be after its start" }, { status: 400 });
  }
  const recurring = cleanRecurring(body.recurring);
  const timeZone = cleanTimeZone(body.timeZone);
  const recurringCount = cleanRecurringCount(body.recurringCount, recurring);
  const recurringEndDate = recurring === "none" ? null : cleanRecurringEndDate(body.recurringEndDate);
  const meetingUrl = cleanUrl(body.meetingUrl);
  const registrationUrl = cleanUrl(body.registrationUrl);
  if (typeof body.meetingUrl === "string" && body.meetingUrl.trim() && !meetingUrl) {
    return NextResponse.json({ error: "Enter a valid HTTP(S) video meeting link" }, { status: 400 });
  }
  if (typeof body.registrationUrl === "string" && body.registrationUrl.trim() && !registrationUrl) {
    return NextResponse.json({ error: "Enter a valid HTTP(S) registration link" }, { status: 400 });
  }
  const occurrences = buildOccurrences(date, endDate, recurring, recurringCount, recurringEndDate, timeZone);
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
          meetingUrl,
          registrationUrl,
          timeZone,
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
  const currentEvent = await prisma.communityEvent.findUnique({
    where: { id },
    select: { id: true, groupId: true, date: true, endDate: true, seriesId: true, recurring: true },
  });
  if (!currentEvent) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const title = body.title !== undefined ? cleanRequiredText(body.title, 120) : undefined;
  if (title !== undefined && !title) return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  const date = body.date !== undefined ? cleanDate(body.date) : undefined;
  if (date === null) return NextResponse.json({ error: "Event date is required" }, { status: 400 });

  const requestedRecurring = body.recurring !== undefined ? cleanRecurring(body.recurring) : undefined;
  if (requestedRecurring !== undefined && requestedRecurring !== currentEvent.recurring) {
    return NextResponse.json({ error: "Recurrence cannot be changed after a series is created" }, { status: 400 });
  }
  const meetingUrl = body.meetingUrl !== undefined ? cleanUrl(body.meetingUrl) : undefined;
  const registrationUrl = body.registrationUrl !== undefined ? cleanUrl(body.registrationUrl) : undefined;
  if (typeof body.meetingUrl === "string" && body.meetingUrl.trim() && !meetingUrl) {
    return NextResponse.json({ error: "Enter a valid HTTP(S) video meeting link" }, { status: 400 });
  }
  if (typeof body.registrationUrl === "string" && body.registrationUrl.trim() && !registrationUrl) {
    return NextResponse.json({ error: "Enter a valid HTTP(S) registration link" }, { status: 400 });
  }

  const sharedData = {
      ...(title !== undefined && { title }),
      ...(body.eventType !== undefined && { eventType: cleanType(body.eventType) }),
      ...(body.allDay !== undefined && { allDay: Boolean(body.allDay) }),
      ...(body.location !== undefined && { location: cleanText(body.location, 180) }),
      ...(body.meetingUrl !== undefined && { meetingUrl }),
      ...(body.registrationUrl !== undefined && { registrationUrl }),
      ...(body.imageUrl !== undefined && { imageUrl: cleanText(body.imageUrl, 512) }),
      ...(body.visibility !== undefined && { visibility: cleanVisibility(body.visibility) }),
      ...(body.notes !== undefined && { notes: cleanText(body.notes, 1000) }),
  };

  const updateFutureSeries = body.scope === "future" && currentEvent.seriesId;
  if (updateFutureSeries) {
    const futureEvents = await prisma.communityEvent.findMany({
      where: { groupId: currentEvent.groupId, seriesId: currentEvent.seriesId, date: { gte: currentEvent.date } },
      select: { id: true, date: true, endDate: true },
      orderBy: { date: "asc" },
    });
    const nextStart = date ?? currentEvent.date;
    const startDelta = nextStart.getTime() - currentEvent.date.getTime();
    const requestedEnd = body.endDate !== undefined ? cleanDate(body.endDate) : undefined;
    const requestedDuration = requestedEnd ? requestedEnd.getTime() - nextStart.getTime() : null;
    if (requestedDuration !== null && requestedDuration < 0) {
      return NextResponse.json({ error: "Event end must be after its start" }, { status: 400 });
    }

    await prisma.$transaction(futureEvents.map((seriesEvent) => {
      const shiftedDate = new Date(seriesEvent.date.getTime() + startDelta);
      const existingDuration = seriesEvent.endDate
        ? seriesEvent.endDate.getTime() - seriesEvent.date.getTime()
        : null;
      const shiftedEnd = body.endDate !== undefined
        ? requestedDuration === null ? null : new Date(shiftedDate.getTime() + requestedDuration)
        : existingDuration === null ? null : new Date(shiftedDate.getTime() + existingDuration);
      return prisma.communityEvent.update({
        where: { id: seriesEvent.id },
        data: { ...sharedData, date: shiftedDate, endDate: shiftedEnd },
      });
    }));
  } else {
    const startDelta = date ? date.getTime() - currentEvent.date.getTime() : 0;
    const endDate = body.endDate !== undefined
      ? cleanDate(body.endDate)
      : date && currentEvent.endDate
        ? new Date(currentEvent.endDate.getTime() + startDelta)
        : undefined;
    if (date && endDate && endDate < date) {
      return NextResponse.json({ error: "Event end must be after its start" }, { status: 400 });
    }
    await prisma.communityEvent.update({
      where: { id },
      data: {
        ...sharedData,
        ...(date !== undefined && { date }),
        ...(endDate !== undefined && { endDate }),
      },
    });
  }

  const event = await prisma.communityEvent.findUniqueOrThrow({ where: { id }, include: eventInclude });
  await syncOneTimeEventReminders(event.id).catch((error) => console.error("[notifications event update]", error));

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
  await prisma.emailNotification.updateMany({
    where: { eventId: id, status: { in: ["pending", "failed"] } },
    data: { status: "cancelled" },
  });
  await prisma.communityEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
