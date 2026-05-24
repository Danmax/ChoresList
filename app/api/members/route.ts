import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLevelFromPoints } from "@/lib/points";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async () => {
  const members = await prisma.familyMember.findMany({
    include: {
      assignments: { where: { isActive: true }, include: { chore: true, completions: true } },
      skills: { include: { skill: true } },
      allowanceSetting: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(members);
});

export const POST = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const member = await prisma.familyMember.create({
    data: {
      name: body.name,
      age: body.age,
      role: body.role ?? "child",
      avatar: body.avatar ?? "🧒",
      color: body.color ?? "#a78bfa",
    },
  });
  return NextResponse.json(member, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const { id } = body;
  const level = body.totalPoints !== undefined ? getLevelFromPoints(body.totalPoints) : undefined;
  const member = await prisma.familyMember.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.age !== undefined && { age: body.age }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.totalPoints !== undefined && { totalPoints: body.totalPoints }),
      ...(level !== undefined && { level }),
    },
  });
  return NextResponse.json(member);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.familyMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
