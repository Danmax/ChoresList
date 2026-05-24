import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const assignments = await prisma.choreAssignment.findMany({
    where: {
      isActive: true,
      ...(memberId && { memberId: parseInt(memberId) }),
      OR: [
        { frequency: "daily" },
        { frequency: "weekly", dayOfWeek },
        { frequency: "one-time", dueDate: { gte: today } },
      ],
    },
    include: {
      chore: { include: { instructions: true } },
      member: true,
      completions: {
        where: { completedAt: { gte: today } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(assignments);
});

export const POST = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const assignment = await prisma.choreAssignment.create({
    data: {
      memberId: body.memberId,
      choreId: body.choreId,
      frequency: body.frequency ?? "daily",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      dayOfWeek: body.dayOfWeek ?? null,
    },
    include: { chore: true, member: true },
  });
  return NextResponse.json(assignment, { status: 201 });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.choreAssignment.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
});
