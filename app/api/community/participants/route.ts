import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { requireCommunityRole } from "@/lib/community";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

const participantInclude = {
  parent: { select: { id: true, displayName: true, relationshipLabel: true, email: true } },
  member: { select: { id: true, name: true, avatar: true, color: true, role: true } },
} as const;

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });

  await requireCommunityRole(groupId, parentId, "member");
  const participants = await prisma.communityParticipant.findMany({
    where: { groupId, status: "active" },
    include: participantInclude,
    orderBy: [{ displayName: "asc" }, { joinedAt: "asc" }],
  });
  return NextResponse.json(participants);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  const body = await req.json();
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!groupId || !memberId) return NextResponse.json({ error: "Group and member are required" }, { status: 400 });

  await requireCommunityRole(groupId, parentId, "member");
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const member = await prisma.familyMember.findFirst({
    where: { id: memberId, householdId },
    select: { name: true },
  });
  if (!member) return NextResponse.json({ error: "Family member not found" }, { status: 404 });

  const participant = await prisma.communityParticipant.upsert({
    where: { groupId_parentId_memberId: { groupId, parentId, memberId } },
    create: {
      groupId,
      parentId,
      memberId,
      displayName: cleanText(body.displayName, 255) ?? member.name,
    },
    update: {
      status: "active",
      displayName: cleanText(body.displayName, 255) ?? member.name,
    },
    include: participantInclude,
  });
  return NextResponse.json(participant, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Participant is required" }, { status: 400 });

  const existing = await prisma.communityParticipant.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  const membership = await requireCommunityRole(existing.groupId, parentId, "member");
  if (existing.parentId !== parentId && membership.role === "member") {
    return NextResponse.json({ error: "You do not have permission to edit this participant" }, { status: 403 });
  }

  const participant = await prisma.communityParticipant.update({
    where: { id },
    data: {
      ...(body.displayName !== undefined && { displayName: cleanText(body.displayName, 255) }),
      ...(body.status !== undefined && { status: body.status === "inactive" ? "inactive" : "active" }),
    },
    include: participantInclude,
  });
  return NextResponse.json(participant);
});
