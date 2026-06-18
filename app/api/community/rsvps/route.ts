import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireEventCommunityRole } from "@/lib/community";

const RSVP_STATUSES = new Set(["going", "maybe", "not-going"]);

function cleanStatus(value: unknown) {
  return typeof value === "string" && RSVP_STATUSES.has(value) ? value : "going";
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
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

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  const { membership } = await requireEventCommunityRole(eventId, parentId, "member");

  const rsvp = await prisma.communityRsvp.upsert({
    where: { eventId_parentId: { eventId, parentId } },
    create: {
      eventId,
      parentId,
      status: cleanStatus(body.status),
      guests: Math.max(0, Math.min(20, Math.round(Number(body.guests) || 0))),
      note: cleanText(body.note, 500),
    },
    update: {
      status: cleanStatus(body.status),
      guests: Math.max(0, Math.min(20, Math.round(Number(body.guests) || 0))),
      note: cleanText(body.note, 500),
    },
    include: { parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } } },
  });

  return NextResponse.json({
    ...rsvp,
    parent: publicParent(rsvp.parent, membership.role === "owner" || membership.role === "manager"),
  });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") ?? "";
  if (!eventId) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }
  await requireEventCommunityRole(eventId, parentId, "member");
  await prisma.communityRsvp.delete({ where: { eventId_parentId: { eventId, parentId } } });
  return NextResponse.json({ ok: true });
});
