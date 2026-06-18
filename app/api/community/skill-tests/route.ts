import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole, requireEventCommunityRole } from "@/lib/community";
import { awardMemberBadge, awardSkillXp, resolveHouseholdSkillByName } from "@/lib/skills";

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

const testInclude = {
  skill: { select: { id: true, name: true, icon: true } },
  badge: { select: { id: true, title: true, icon: true } },
  attempts: {
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      participant: { include: { member: { select: { id: true, name: true, avatar: true, color: true } } } },
    },
  },
} satisfies Prisma.SkillTestInclude;

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  const eventId = searchParams.get("eventId") ?? "";
  if (!groupId && !eventId) return NextResponse.json({ error: "Group or event is required" }, { status: 400 });

  if (eventId) {
    await requireEventCommunityRole(eventId, parentId, "member");
  } else {
    await requireCommunityRole(groupId, parentId, "member");
  }

  const tests = await prisma.skillTest.findMany({
    where: {
      status: "active",
      ...(eventId ? { eventId } : { communityGroupId: groupId }),
    },
    include: testInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tests);
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const action = typeof body.action === "string" ? body.action : "test";

  if (action === "attempt") {
    const testId = typeof body.testId === "string" ? body.testId : "";
    const participantId = typeof body.participantId === "string" ? body.participantId : "";
    if (!testId || !participantId) return NextResponse.json({ error: "Test and participant are required" }, { status: 400 });

    const test = await prisma.skillTest.findFirst({
      where: { id: testId, status: "active" },
      include: { skill: true, badge: true },
    });
    if (!test?.communityGroupId) return NextResponse.json({ error: "Skill test not found" }, { status: 404 });
    await requireCommunityRole(test.communityGroupId, parentId, "manager");

    const participant = await prisma.communityParticipant.findFirst({
      where: { id: participantId, groupId: test.communityGroupId, status: "active" },
      include: { member: { select: { id: true, householdId: true } } },
    });
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    const score = cleanInt(body.score, 0, 0, 100);
    const passed = body.passed === true || score >= test.passingScore;
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.skillTestAttempt.create({
        data: {
          testId,
          participantId,
          memberId: participant.memberId,
          score,
          passed,
          evidence: body.evidence && typeof body.evidence === "object" ? body.evidence : Prisma.JsonNull,
          notes: cleanText(body.notes, 2000),
          reviewedByParentId: parentId,
          reviewedAt: new Date(),
        },
      });

      if (passed && test.skill?.name && test.xpReward > 0) {
        const skillId = await resolveHouseholdSkillByName(tx, {
          householdId: participant.member.householdId,
          skillName: test.skill.name,
        });
        if (skillId) {
          await awardSkillXp(tx, {
            householdId: participant.member.householdId,
            memberId: participant.memberId,
            skillId,
            xp: test.xpReward,
            sourceType: "skill_test",
            sourceId: created.id,
            note: `Passed ${test.title}`,
            awardedByParentId: parentId,
          });
        }
      }

      if (passed && test.badgeId) {
        await awardMemberBadge(tx, {
          householdId: participant.member.householdId,
          memberId: participant.memberId,
          badgeId: test.badgeId,
          communityGroupId: test.communityGroupId,
          awardedByParentId: parentId,
          evidence: { source: "skill_test", attemptId: created.id, score },
          note: `Passed ${test.title}`,
        });
      }

      return created;
    });

    return NextResponse.json(attempt, { status: 201 });
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const eventId = typeof body.eventId === "string" && body.eventId ? body.eventId : null;
  if (!groupId && !eventId) return NextResponse.json({ error: "Group or event is required" }, { status: 400 });
  let resolvedGroupId = groupId;
  if (eventId) {
    const { event } = await requireEventCommunityRole(eventId, parentId, "manager");
    resolvedGroupId = event.groupId;
  } else {
    await requireCommunityRole(groupId, parentId, "manager");
  }

  const title = cleanRequiredText(body.title, 255);
  if (!title) return NextResponse.json({ error: "Test title is required" }, { status: 400 });
  const test = await prisma.skillTest.create({
    data: {
      communityGroupId: resolvedGroupId,
      eventId,
      badgeId: typeof body.badgeId === "string" && body.badgeId ? body.badgeId : null,
      skillId: typeof body.skillId === "string" && body.skillId ? body.skillId : null,
      title,
      instructions: cleanText(body.instructions, 3000),
      passingScore: cleanInt(body.passingScore, 85, 1, 100),
      xpReward: cleanInt(body.xpReward, 25, 0, 500),
    },
    include: testInclude,
  });
  return NextResponse.json(test, { status: 201 });
});
