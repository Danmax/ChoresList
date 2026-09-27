import { NextRequest, NextResponse } from "next/server";
import { requireParentSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { parseHolidayDraft } from "@/lib/holiday-draft";
import { prisma } from "@/lib/prisma";

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!await canAccessMember(parentId, householdId, memberId)) return NextResponse.json({ error: "Choose a family member you can manage" }, { status: 403 });
  const lists = parseHolidayDraft(body.lists);
  if (!lists.length || lists.reduce((n, list) => n + list.items.length, 0) > 2) return NextResponse.json({ error: "Invalid guest draft" }, { status: 400 });
  await prisma.$transaction(async (tx) => {
    for (const list of lists) {
      // Stable guest UUIDs make retries safe, including a lost success response.
      const existing = await tx.giftList.findUnique({ where: { id: list.id } });
      if (existing) {
        if (existing.householdId !== householdId || existing.createdByParentId !== parentId) throw new Error("Draft identifier is unavailable");
        continue;
      }
      await tx.giftList.create({ data: {
        id: list.id, householdId, memberId, title: list.title.trim() || "Holiday wishes",
        type: "christmas", eventYear: new Date().getFullYear(), createdByType: "parent", createdByParentId: parentId,
        items: { create: list.items.map((item) => ({
          householdId, memberId, title: item.title, amazonUrl: item.url || null, imageUrl: item.imageUrl,
          category: "other", emoji: "🎁",
        })) },
      } });
    }
  });
  return NextResponse.json({ ok: true });
});
