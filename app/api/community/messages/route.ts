import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole, requireEventCommunityRole } from "@/lib/community";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanGifUrl(value: unknown) {
  const raw = cleanText(value, 512);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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

const messageInclude = {
  parent: { select: { id: true, email: true, displayName: true, relationshipLabel: true } },
} satisfies Prisma.CommunityEventMessageInclude;

function publicMessage(message: Prisma.CommunityEventMessageGetPayload<{ include: typeof messageInclude }>, showEmail: boolean) {
  return {
    ...message,
    parent: publicParent(message.parent, showEmail),
  };
}

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) return NextResponse.json({ error: "Event is required" }, { status: 400 });

  const { event, membership } = await requireEventCommunityRole(eventId, parentId, "member");
  const bodyText = cleanText(body.body, 1000);
  const emoji = cleanText(body.emoji, 16);
  const gifUrl = cleanGifUrl(body.gifUrl);
  if (!bodyText && !emoji && !gifUrl) {
    return NextResponse.json({ error: "Add a message, emoji, or GIF" }, { status: 400 });
  }

  const message = await prisma.communityEventMessage.create({
    data: {
      eventId: event.id,
      parentId,
      body: bodyText,
      emoji,
      gifUrl,
    },
    include: messageInclude,
  });

  return NextResponse.json(publicMessage(message, membership.role === "owner" || membership.role === "manager"), { status: 201 });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const message = await prisma.communityEventMessage.findUnique({
    where: { id },
    select: { id: true, parentId: true, event: { select: { groupId: true } } },
  });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const membership = await requireCommunityRole(message.event.groupId, parentId, "member");
  if (message.parentId !== parentId && membership.role === "member") {
    return NextResponse.json({ error: "Only the author or a manager can delete this message" }, { status: 403 });
  }

  await prisma.communityEventMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
