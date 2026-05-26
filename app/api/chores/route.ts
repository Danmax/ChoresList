import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const age = searchParams.get("age");
  const chores = await prisma.chore.findMany({
    where: {
      householdId,
      ...(age && { ageMin: { lte: parseInt(age) }, ageMax: { gte: parseInt(age) } }),
    },
    include: { skillLinks: { include: { skill: true } }, instructions: true },
    orderBy: { ageMin: "asc" },
  });
  return NextResponse.json(chores);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const chore = await prisma.chore.create({ data: { ...body, householdId } });
  return NextResponse.json(chore, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const body = await req.json();
  const chore = await prisma.chore.update({
    where: { id: body.id, householdId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.ageMin !== undefined && { ageMin: body.ageMin }),
      ...(body.ageMax !== undefined && { ageMax: body.ageMax }),
      ...(body.pointsValue !== undefined && { pointsValue: body.pointsValue }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.requiresPhoto !== undefined && { requiresPhoto: body.requiresPhoto }),
    },
  });
  return NextResponse.json(chore);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { householdId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.chore.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
