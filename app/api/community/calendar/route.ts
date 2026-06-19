import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));

  if (!start || !end) {
    return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
  }

  const memberships = await prisma.communityMember.findMany({
    where: { parentId, status: "active" },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          groupType: true,
          events: {
            where: {
              OR: [
                { date: { gte: start, lte: end } },
                { endDate: { not: null, gte: start, lte: end } },
                { date: { lte: start }, endDate: { not: null, gte: end } },
              ],
            },
            orderBy: { date: "asc" },
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
              visibility: true,
              notes: true,
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    calendars: memberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      groupType: membership.group.groupType,
      role: membership.role,
      events: membership.group.events,
    })),
  });
});
