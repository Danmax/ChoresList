import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requirePluginAccess } from "@/lib/plugins/registry";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "notifications");
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50) || 50));
  const now = new Date();
  const [notifications, unread] = await Promise.all([
    prisma.appNotification.findMany({ where: { recipientParentId: parentId, scheduledFor: { lte: now } }, orderBy: [{ readAt: "asc" }, { scheduledFor: "desc" }], take: limit }),
    prisma.appNotification.count({ where: { recipientParentId: parentId, scheduledFor: { lte: now }, readAt: null } }),
  ]);
  return NextResponse.json({ notifications, unread });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginAccess(householdId, parentId, "notifications");
  const body = await req.json();
  if (body.action === "read-all") {
    await prisma.appNotification.updateMany({ where: { recipientParentId: parentId, scheduledFor: { lte: new Date() }, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id || typeof body.read !== "boolean") return NextResponse.json({ error: "Notification and read state are required" }, { status: 400 });
  const updated = await prisma.appNotification.updateMany({ where: { id, recipientParentId: parentId }, data: { readAt: body.read ? new Date() : null } });
  if (!updated.count) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
