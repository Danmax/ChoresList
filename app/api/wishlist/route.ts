import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const items = await prisma.wishListItem.findMany({
    where: { householdId, ...(memberId && { memberId: parseInt(memberId) }) },
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const body = await req.json();
  const { memberId, title, category, emoji, note } = body;
  const member = await prisma.familyMember.findFirst({ where: { id: memberId, householdId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  const item = await prisma.wishListItem.create({
    data: { householdId, memberId, title, category: category ?? "other", emoji: emoji ?? "🎁", note },
  });
  return NextResponse.json(item, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const body = await req.json();
  const { id, status, title, note, emoji } = body;
  const item = await prisma.wishListItem.update({
    where: { id, householdId },
    data: {
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(note !== undefined && { note }),
      ...(emoji !== undefined && { emoji }),
    },
  });
  return NextResponse.json(item);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.wishListItem.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
