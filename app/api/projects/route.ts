import { NextRequest, NextResponse } from "next/server";
import type { RewardTicket } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLevelFromPoints } from "@/lib/points";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { canAccessMember, childAccessWhere } from "@/lib/child-access";
import { COMPLETION_EMOJIS } from "@/types";

function memberIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0)));
}

function completionFeedback(body: Record<string, unknown>) {
  return {
    reactionEmoji: typeof body.reactionEmoji === "string" && COMPLETION_EMOJIS.includes(body.reactionEmoji)
      ? body.reactionEmoji
      : null,
    completionNote: typeof body.completionNote === "string" && body.completionNote.trim()
      ? body.completionNote.trim().slice(0, 2000)
      : null,
  };
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");
  const memberAccess = await childAccessWhere(parentId, householdId);
  const unrestricted = Object.keys(memberAccess).length === 0;
  const accessibleMembers = await prisma.familyMember.findMany({
    where: { householdId, ...memberAccess },
    select: { id: true },
  });
  const accessibleIds = accessibleMembers.map((member) => member.id);

  const projects = await prisma.houseProject.findMany({
    where: {
      householdId,
      ...(status && { status }),
      AND: [
        ...(unrestricted ? [] : [{ OR: [{ assignedTo: { in: accessibleIds } }, { participants: { some: { memberId: { in: accessibleIds } } } }] }]),
        ...(memberId ? [{ OR: [{ participants: { some: { memberId, completedAt: null } } }, { assignedTo: memberId }] }] : []),
      ],
    },
    include: {
      assignee: { select: { id: true, name: true, avatar: true, color: true } },
      participants: {
        include: { member: { select: { id: true, name: true, avatar: true, color: true } } },
        orderBy: { createdAt: "asc" },
      },
      tickets: { include: { member: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const accessibleSet = new Set(accessibleIds);
  return NextResponse.json(projects.filter((project) => {
    const projectMemberIds = Array.from(new Set([project.assignedTo, ...project.participants.map((item) => item.memberId)].filter((value): value is string => Boolean(value))));
    return unrestricted || (projectMemberIds.length > 0 && projectMemberIds.every((id) => accessibleSet.has(id)));
  }));
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const assignedMemberIds = memberIds(body.assignedMemberIds);
  if (typeof body.assignedTo === "string" && !assignedMemberIds.includes(body.assignedTo)) assignedMemberIds.push(body.assignedTo);
  if (assignedMemberIds.length > 0) {
    const count = await prisma.familyMember.count({ where: { id: { in: assignedMemberIds }, householdId } });
    if (count !== assignedMemberIds.length) return NextResponse.json({ error: "One or more assignees were not found" }, { status: 404 });
    for (const memberId of assignedMemberIds) {
      if (!(await canAccessMember(parentId, householdId, memberId))) {
        return NextResponse.json({ error: "You do not have access to one or more assignees" }, { status: 403 });
      }
    }
  }
  const project = await prisma.houseProject.create({
    data: {
      householdId,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? "other",
      emoji: body.emoji ?? "🔧",
      rewardTitle: body.rewardTitle,
      rewardEmoji: body.rewardEmoji ?? "🎫",
      pointsBonus: body.pointsBonus ?? 50,
      assignedTo: assignedMemberIds[0] ?? body.assignedTo ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      participants: assignedMemberIds.length > 0 ? {
        create: assignedMemberIds.map((memberId) => ({ householdId, memberId })),
      } : undefined,
    },
    include: { assignee: true, participants: { include: { member: true } } },
  });
  return NextResponse.json(project, { status: 201 });
});

const COMPLETE_FIELDS = new Set(["id", "status", "completedById", "completedByIds", "reactionEmoji", "completionNote"]);

export const PUT = withErrors(async (req: NextRequest) => {
  const body = await req.json();

  const completedByIds = memberIds(body?.completedByIds);
  if (typeof body?.completedById === "string" && !completedByIds.includes(body.completedById)) {
    completedByIds.push(body.completedById);
  }
  const isCompletion =
    body?.status === "completed" &&
    completedByIds.length > 0 &&
    Object.keys(body).every((key) => COMPLETE_FIELDS.has(key));

  const { householdId, parentId } = isCompletion
    ? requireSession(req)
    : await requireParentSession(req);

  if (isCompletion) {
    const members = await prisma.familyMember.findMany({ where: { id: { in: completedByIds }, householdId } });
    if (members.length !== completedByIds.length) return NextResponse.json({ error: "One or more members were not found" }, { status: 404 });
    for (const member of members) {
      if (!(await canAccessMember(parentId, householdId, member.id))) {
        return NextResponse.json({ error: `You do not have access to ${member.name}` }, { status: 403 });
      }
    }

    const existing = await prisma.houseProject.findFirst({
      where: { id: body.id, householdId },
      include: { participants: true },
    });
    if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const assignedIds = new Set(existing.participants.map((participant) => participant.memberId));
    if (assignedIds.size > 0 && completedByIds.some((memberId) => !assignedIds.has(memberId))) {
      return NextResponse.json({ error: "Only assigned members can complete this project" }, { status: 403 });
    }
    const incompleteIds = completedByIds.filter((memberId) => {
      const participant = existing.participants.find((item) => item.memberId === memberId);
      return !participant?.completedAt;
    });
    if (incompleteIds.length === 0) return NextResponse.json({ error: "Project already completed by the selected members" }, { status: 409 });

    const feedback = completionFeedback(body);
    const result = await prisma.$transaction(async (tx) => {
      const tickets: RewardTicket[] = [];
      for (const memberId of incompleteIds) {
        await tx.houseProjectParticipant.upsert({
          where: { projectId_memberId: { projectId: existing.id, memberId } },
          create: { householdId, projectId: existing.id, memberId, completedAt: new Date(), ...feedback },
          update: { completedAt: new Date(), ...feedback },
        });

        const currentTicket = await tx.rewardTicket.findFirst({ where: { projectId: existing.id, memberId } });
        const ticket = currentTicket ?? await tx.rewardTicket.create({
          data: {
            householdId,
            projectId: existing.id,
            memberId,
            rewardTitle: existing.rewardTitle,
            rewardEmoji: existing.rewardEmoji,
          },
        });
        tickets.push(ticket);

        if (existing.pointsBonus > 0) {
          const member = members.find((item) => item.id === memberId)!;
          const newPoints = member.totalPoints + existing.pointsBonus;
          await tx.familyMember.update({
            where: { id: memberId, householdId },
            data: { totalPoints: newPoints, level: getLevelFromPoints(newPoints) },
          });
        }
      }

      const remaining = await tx.houseProjectParticipant.count({
        where: { projectId: existing.id, completedAt: null },
      });
      const project = await tx.houseProject.update({
        where: { id: existing.id, householdId },
        data: { status: remaining === 0 ? "completed" : "open" },
        include: { participants: { include: { member: true } }, tickets: true },
      });
      return { project, tickets };
    });

    return NextResponse.json({ ...result, ticket: result.tickets[0] ?? null });
  }

  if (body.assignedTo) {
    if (!(await canAccessMember(parentId, householdId, body.assignedTo))) {
      return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
    }
    const assignee = await prisma.familyMember.findFirst({ where: { id: body.assignedTo, householdId } });
    if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
  }

  const existingProject = await prisma.houseProject.findFirst({
    where: { id: body.id, householdId },
    include: { participants: { select: { memberId: true } } },
  });
  if (!existingProject) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const existingMemberIds = Array.from(new Set([existingProject.assignedTo, ...existingProject.participants.map((item) => item.memberId)].filter((value): value is string => Boolean(value))));
  if (existingMemberIds.length === 0) {
    const actor = await prisma.parentAccount.findFirst({ where: { id: parentId, householdId }, select: { accountRole: true } });
    if (actor?.accountRole !== "owner") return NextResponse.json({ error: "Unassigned projects can only be managed by the household owner" }, { status: 403 });
  }
  for (const memberId of existingMemberIds) {
    if (!(await canAccessMember(parentId, householdId, memberId))) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }
  }

  const project = await prisma.houseProject.update({
    where: { id: body.id, householdId },
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
  const { householdId, parentId } = await requireParentSession(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const project = await prisma.houseProject.findFirst({ where: { id, householdId }, include: { participants: { select: { memberId: true } } } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const projectMemberIds = Array.from(new Set([project.assignedTo, ...project.participants.map((item) => item.memberId)].filter((value): value is string => Boolean(value))));
  for (const memberId of projectMemberIds) {
    if (!(await canAccessMember(parentId, householdId, memberId))) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }
  }
  await prisma.houseProject.delete({ where: { id, householdId } });
  return NextResponse.json({ ok: true });
});
