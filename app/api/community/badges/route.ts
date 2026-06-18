import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { awardMemberBadge } from "@/lib/skills";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function cleanRequiredText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const badgeInclude = {
  skill: { select: { id: true, name: true, icon: true } },
  _count: { select: { awards: true } },
} as const;

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });

  await requireCommunityRole(groupId, parentId, "member");
  const badges = await prisma.meritBadge.findMany({
    where: { communityGroupId: groupId, isActive: true },
    include: badgeInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(badges);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });
  await requireCommunityRole(groupId, parentId, "manager");

  const title = cleanRequiredText(body.title, 255);
  if (!title) return NextResponse.json({ error: "Badge title is required" }, { status: 400 });
  const requirementsText = cleanText(body.requirements, 3000);

  const badge = await prisma.meritBadge.create({
    data: {
      communityGroupId: groupId,
      skillId: typeof body.skillId === "string" && body.skillId ? body.skillId : null,
      title,
      icon: cleanText(body.icon, 32) ?? "🏅",
      description: cleanText(body.description, 2000),
      requirements: requirementsText ? { text: requirementsText } : Prisma.JsonNull,
      xpReward: cleanInt(body.xpReward, 25, 0, 500),
      requiresTest: body.requiresTest !== false,
      requiresAttendance: Boolean(body.requiresAttendance),
      requiresManagerApproval: body.requiresManagerApproval !== false,
    },
    include: badgeInclude,
  });
  return NextResponse.json(badge, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "award") {
    const participantId = typeof body.participantId === "string" ? body.participantId : "";
    const badgeId = typeof body.badgeId === "string" ? body.badgeId : "";
    if (!participantId || !badgeId) return NextResponse.json({ error: "Participant and badge are required" }, { status: 400 });

    const participant = await prisma.communityParticipant.findFirst({
      where: { id: participantId, status: "active" },
      include: { member: { select: { id: true, householdId: true } } },
    });
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    await requireCommunityRole(participant.groupId, parentId, "manager");

    const award = await prisma.$transaction((tx) =>
      awardMemberBadge(tx, {
        householdId: participant.member.householdId,
        memberId: participant.memberId,
        badgeId,
        communityGroupId: participant.groupId,
        awardedByParentId: parentId,
        evidence: { source: "manager_award" },
        note: cleanText(body.note, 1000),
      })
    );
    if (!award) return NextResponse.json({ error: "Badge was already awarded or could not be awarded" }, { status: 409 });
    return NextResponse.json(award);
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Badge is required" }, { status: 400 });
  const existing = await prisma.meritBadge.findFirst({ where: { id }, select: { communityGroupId: true } });
  if (!existing?.communityGroupId) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  await requireCommunityRole(existing.communityGroupId, parentId, "manager");

  const badge = await prisma.meritBadge.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: cleanRequiredText(body.title, 255) || "Badge" }),
      ...(body.icon !== undefined && { icon: cleanText(body.icon, 32) ?? "🏅" }),
      ...(body.description !== undefined && { description: cleanText(body.description, 2000) }),
      ...(body.skillId !== undefined && { skillId: typeof body.skillId === "string" && body.skillId ? body.skillId : null }),
      ...(body.xpReward !== undefined && { xpReward: cleanInt(body.xpReward, 25, 0, 500) }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    },
    include: badgeInclude,
  });
  return NextResponse.json(badge);
});
