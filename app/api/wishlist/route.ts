import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");

  const items = await prisma.wishListItem.findMany({
    where: memberId ? { memberId: parseInt(memberId) } : undefined,
    include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { memberId, title, category, emoji, note } = body;
  const item = await prisma.wishListItem.create({
    data: { memberId, title, category: category ?? "other", emoji: emoji ?? "🎁", note },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status, title, note, emoji } = body;
  const item = await prisma.wishListItem.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(note !== undefined && { note }),
      ...(emoji !== undefined && { emoji }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.wishListItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
