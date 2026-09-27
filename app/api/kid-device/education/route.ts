import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { getActiveDeviceSession } from "@/lib/device-session";
import { normalizeAnswer } from "@/lib/education";
import { awardSkillXp, resolveSkillId } from "@/lib/skills";

type SubmittedAnswer = { materialId: string; answer: string };

async function verifiedSession(req: NextRequest) {
  return getActiveDeviceSession(req);
}

function memberScope(session: NonNullable<Awaited<ReturnType<typeof verifiedSession>>>) {
  return session.mode === "member" && session.memberId ? { memberId: session.memberId } : {};
}

export const GET = withErrors(async (req: NextRequest) => {
  const session = await verifiedSession(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const assignmentId = req.nextUrl.searchParams.get("assignmentId") ?? "";
  const assignment = await prisma.educationAssignment.findFirst({
    where: { id: assignmentId, householdId: session.householdId, ...memberScope(session) },
    include: {
      member: { select: { id: true, name: true, avatar: true } },
      set: { include: { materials: { orderBy: { sortOrder: "asc" } } } },
      attempts: { orderBy: { completedAt: "desc" }, take: 3 },
    },
  });
  if (!assignment) return NextResponse.json({ error: "Education assignment not found" }, { status: 404 });
  return NextResponse.json(assignment);
});

export const POST = withErrors(async (req: NextRequest) => {
  const session = await verifiedSession(req);
  if (!session) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const body = await req.json();
  const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : "";
  const assignment = await prisma.educationAssignment.findFirst({
    where: { id: assignmentId, householdId: session.householdId, ...memberScope(session) },
    include: { set: { include: { materials: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Education assignment not found" }, { status: 404 });
  if (assignment.set.materials.length === 0) return NextResponse.json({ error: "This assignment has no questions" }, { status: 400 });

  const submitted = Array.isArray(body.answers) ? body.answers as SubmittedAnswer[] : [];
  const answerById = new Map(submitted.map((item) => [item.materialId, item.answer ?? ""]));
  const gradedAnswers = assignment.set.materials.map((material) => {
    const answer = answerById.get(material.id) ?? "";
    return {
      materialId: material.id,
      prompt: material.prompt,
      answer,
      correctAnswer: material.answer,
      correct: normalizeAnswer(answer) === normalizeAnswer(material.answer),
      explanation: material.explanation,
    };
  });
  const correctCount = gradedAnswers.filter((item) => item.correct).length;
  const totalCount = gradedAnswers.length;
  const score = Math.round((correctCount / totalCount) * 100);
  const passed = score >= assignment.passingScore;
  const result = await prisma.$transaction(async (tx) => {
      const created = await tx.educationAttempt.create({
        data: { householdId: session.householdId, assignmentId: assignment.id, memberId: assignment.memberId, score, correctCount, totalCount, passed, answers: gradedAnswers },
      });
      let pointsAwarded = 0;
      if (passed) {
        // A conditional state change makes the reward idempotent when a child
        // submits the same successful work from two tabs at once.
        const completed = await tx.educationAssignment.updateMany({
          where: { id: assignment.id, status: { not: "completed" } },
          data: { status: "completed", completedAt: new Date() },
        });
        if (completed.count > 0 && assignment.pointsReward > 0) {
          await tx.familyMember.update({ where: { id: assignment.memberId }, data: { totalPoints: { increment: assignment.pointsReward } } });
          const skillId = await resolveSkillId(tx, { householdId: session.householdId, skillId: assignment.set.skillId, subject: assignment.set.subject });
          if (skillId) await awardSkillXp(tx, { householdId: session.householdId, memberId: assignment.memberId, skillId, xp: assignment.pointsReward, sourceType: "education_attempt", sourceId: created.id, note: "Education assignment passed" });
          pointsAwarded = assignment.pointsReward;
        }
      }
      return { attempt: created, pointsAwarded };
  });
  return NextResponse.json({ attempt: result.attempt, score, correctCount, totalCount, passed, passingScore: assignment.passingScore, pointsAwarded: result.pointsAwarded, answers: gradedAnswers }, { status: 201 });
});
