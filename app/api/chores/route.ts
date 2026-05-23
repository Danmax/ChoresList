import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const age = searchParams.get("age");

  const chores = await prisma.chore.findMany({
    where: age ? { ageMin: { lte: parseInt(age) }, ageMax: { gte: parseInt(age) } } : undefined,
    include: { skillLinks: { include: { skill: true } }, instructions: true },
    orderBy: { ageMin: "asc" },
  });
  return NextResponse.json(chores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const chore = await prisma.chore.create({ data: body });
  return NextResponse.json(chore, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const chore = await prisma.chore.update({ where: { id }, data });
  return NextResponse.json(chore);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.chore.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
