import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let where = {};
  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where = { date: { gte: start, lte: end } };
  }

  const events = await prisma.familyEvent.findMany({ where, orderBy: { date: "asc" } });
  return NextResponse.json(events);
});

export const POST = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const event = await prisma.familyEvent.create({
    data: {
      title: body.title,
      eventType: body.eventType ?? "other",
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      allDay: body.allDay ?? true,
      recurring: body.recurring ?? "none",
      notes: body.notes ?? null,
      color: body.color ?? "#fbbf24",
      icon: body.icon ?? "📅",
    },
  });
  return NextResponse.json(event, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const { id, ...data } = body;
  const event = await prisma.familyEvent.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  return NextResponse.json(event);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.familyEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
