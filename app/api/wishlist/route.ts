import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const items = await prisma.wishListItem.findMany({
    where: { householdId, ...(memberId && { memberId }) },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const body = await req.json();
  const { memberId, title, category, emoji, note } = body;
  const cleanMemberId = typeof memberId === "string" ? memberId : "";
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 120) : "";
  if (!cleanTitle) return NextResponse.json({ error: "Wish title is required" }, { status: 400 });
  if (!cleanMemberId) {
    return NextResponse.json({ error: "Member is required" }, { status: 400 });
  }
  const member = await prisma.familyMember.findFirst({ where: { id: cleanMemberId, householdId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  const item = await prisma.wishListItem.create({
    data: {
      householdId,
      memberId: cleanMemberId,
      title: cleanTitle,
      category: typeof category === "string" ? category.slice(0, 64) : "other",
      emoji: typeof emoji === "string" && emoji.trim() ? emoji.trim().slice(0, 32) : "🎁",
      note: typeof note === "string" ? note.trim().slice(0, 500) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const { id, status, title, note, emoji } = body;
  if (status !== undefined && status !== "pending" && status !== "granted") {
    return NextResponse.json({ error: "Invalid wish status" }, { status: 400 });
  }
  const item = await prisma.wishListItem.update({
    where: { id, householdId },
    data: {
      ...(status !== undefined && { status }),
      ...(typeof title === "string" && { title: title.trim().slice(0, 120) }),
      ...(typeof note === "string" && { note: note.trim().slice(0, 500) }),
      ...(typeof emoji === "string" && { emoji: emoji.trim().slice(0, 32) }),
    },
  });
  return NextResponse.json(item);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const item = await prisma.wishListItem.findFirst({ where: { id, householdId }, select: { status: true } });
  if (!item) return NextResponse.json({ error: "Wish not found" }, { status: 404 });
  if (item.status !== "pending") await requireParentSession(req);
  await prisma.wishListItem.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
