import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchFamilyEventForGoogleSync,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar";

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (month && year) {
    const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const events = await prisma.familyEvent.findMany({
      where: {
        householdId,
        OR: [
          { date: { gte: monthStart, lte: monthEnd } },
          {
            recurring: { not: "none" },
            date: { lte: monthEnd },
            OR: [{ recurringEndDate: null }, { recurringEndDate: { gte: monthStart } }],
          },
        ],
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(events);
  }

  const events = await prisma.familyEvent.findMany({
    where: { householdId },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const recurring = typeof body.recurring === "string" ? body.recurring : "none";
  const recurringCount =
    recurring !== "none" && Number.isFinite(Number(body.recurringCount))
      ? Math.max(1, Math.min(520, Math.round(Number(body.recurringCount))))
      : null;
  const recurringEndDate =
    recurring !== "none" && body.recurringEndDate ? new Date(body.recurringEndDate) : null;

  const event = await prisma.familyEvent.create({
    data: {
      householdId,
      title: body.title,
      eventType: body.eventType ?? "other",
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      allDay: body.allDay ?? true,
      recurring,
      recurringEndDate,
      recurringCount,
      location: optionalText(body.location),
      meetingUrl: optionalText(body.meetingUrl),
      rsvpUrl: optionalText(body.rsvpUrl),
      flyerUrl: optionalText(body.flyerUrl),
      registrationUrl: optionalText(body.registrationUrl),
      registrationNotes: optionalText(body.registrationNotes),
      resources: optionalText(body.resources),
      notes: body.notes ?? null,
      color: body.color ?? "#fbbf24",
      icon: body.icon ?? "📅",
    },
  });

  const eventForSync = await fetchFamilyEventForGoogleSync(event.id);
  if (eventForSync) await createGoogleCalendarEvent(eventForSync);

  return NextResponse.json(event, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const { id, ...data } = body;
  const event = await prisma.familyEvent.update({
    where: { id, householdId },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      recurringEndDate:
        data.recurringEndDate === null
          ? null
          : data.recurringEndDate
            ? new Date(data.recurringEndDate)
            : undefined,
      ...(data.location !== undefined && { location: optionalText(data.location) }),
      ...(data.meetingUrl !== undefined && { meetingUrl: optionalText(data.meetingUrl) }),
      ...(data.rsvpUrl !== undefined && { rsvpUrl: optionalText(data.rsvpUrl) }),
      ...(data.flyerUrl !== undefined && { flyerUrl: optionalText(data.flyerUrl) }),
      ...(data.registrationUrl !== undefined && { registrationUrl: optionalText(data.registrationUrl) }),
      ...(data.registrationNotes !== undefined && { registrationNotes: optionalText(data.registrationNotes) }),
      ...(data.resources !== undefined && { resources: optionalText(data.resources) }),
    },
  });

  const eventForSync = await fetchFamilyEventForGoogleSync(event.id);
  if (eventForSync) await updateGoogleCalendarEvent(eventForSync);

  return NextResponse.json(event);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");

  const eventForSync = await fetchFamilyEventForGoogleSync(id);
  if (eventForSync && eventForSync.householdId === householdId) {
    await deleteGoogleCalendarEvent(eventForSync);
  }

  await prisma.familyEvent.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
