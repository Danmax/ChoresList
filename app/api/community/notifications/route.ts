import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";

const FIELDS = new Set([
  "emailNotificationsEnabled",
  "emailItemAssignments",
  "emailEventReminders",
  "emailRegistrationUpdates",
  "emailManagerWeeklySummary",
]);

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const field = typeof body.field === "string" ? body.field : "";
  if (!groupId || !FIELDS.has(field)) {
    return NextResponse.json({ error: "Group and notification setting are required" }, { status: 400 });
  }
  if (typeof body.value !== "boolean") {
    return NextResponse.json({ error: "Notification setting must be true or false" }, { status: 400 });
  }
  const membership = await prisma.communityMember.findUnique({ where: { groupId_parentId: { groupId, parentId } } });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Community membership not found" }, { status: 404 });
  }
  const updated = await prisma.communityMember.update({
    where: { id: membership.id },
    data: { [field]: body.value },
  });
  if (!body.value) {
    const typesByField: Record<string, string[]> = {
      emailItemAssignments: ["item-assigned"],
      emailRegistrationUpdates: ["rsvp-confirmation", "registration-confirmation"],
      emailManagerWeeklySummary: ["manager-weekly-summary"],
    };
    await prisma.emailNotification.updateMany({
      where: {
        groupId,
        recipientParentId: parentId,
        status: { in: ["pending", "failed"] },
        ...(field === "emailNotificationsEnabled" ? {} : field === "emailEventReminders"
          ? { type: { startsWith: "event-reminder-" } }
          : { type: { in: typesByField[field] ?? [] } }),
      },
      data: { status: "cancelled" },
    });
  }
  return NextResponse.json(updated);
});
