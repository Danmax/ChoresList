import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLevelFromPoints } from "@/lib/points";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");

  const projects = await prisma.houseProject.findMany({
    where: {
      ...(status && { status }),
      ...(memberId && { OR: [{ assignedTo: parseInt(memberId) }, { assignedTo: null }] }),
    },
    include: {
      assignee: { select: { id: true, name: true, avatar: true, color: true } },
      tickets: { include: { member: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
});

export const POST = withErrors(async (req: NextRequest) => {
  const body = await req.json();
  const project = await prisma.houseProject.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? "other",
      emoji: body.emoji ?? "🔧",
      rewardTitle: body.rewardTitle,
      rewardEmoji: body.rewardEmoji ?? "🎫",
      pointsBonus: body.pointsBonus ?? 50,
      assignedTo: body.assignedTo ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
    include: { assignee: true },
  });
  return NextResponse.json(project, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const body = await req.json();

  if (body.status === "completed" && body.completedById) {
    const project = await prisma.houseProject.update({
      where: { id: body.id },
      data: { status: "completed" },
    });
    const ticket = await prisma.rewardTicket.create({
      data: {
        projectId: project.id,
        memberId: body.completedById,
        rewardTitle: project.rewardTitle,
        rewardEmoji: project.rewardEmoji,
      },
    });
    if (project.pointsBonus > 0) {
      const member = await prisma.familyMember.findUnique({ where: { id: body.completedById } });
      if (member) {
        const newPoints = member.totalPoints + project.pointsBonus;
        await prisma.familyMember.update({
          where: { id: body.completedById },
          data: { totalPoints: newPoints, level: getLevelFromPoints(newPoints) },
        });
      }
    }
    return NextResponse.json({ project, ticket });
  }

  const project = await prisma.houseProject.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.rewardTitle !== undefined && { rewardTitle: body.rewardTitle }),
      ...(body.rewardEmoji !== undefined && { rewardEmoji: body.rewardEmoji }),
      ...(body.pointsBonus !== undefined && { pointsBonus: body.pointsBonus }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
    },
  });
  return NextResponse.json(project);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "0");
  await prisma.houseProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
