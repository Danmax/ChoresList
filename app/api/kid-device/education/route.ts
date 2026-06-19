import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrors } from "@/lib/api";
import { hashDeviceSecret, requireDeviceSession } from "@/lib/device-session";
import { normalizeAnswer } from "@/lib/education";
import { awardSkillXp, resolveSkillId } from "@/lib/skills";

type SubmittedAnswer = { materialId: string; answer: string };

async function verifiedSession(req: NextRequest) {
  const session = requireDeviceSession(req);
  const device = await prisma.householdDevice.findFirst({
    where: { id: session.deviceId, householdId: session.householdId, tokenHash: hashDeviceSecret(session.secret), revokedAt: null },
  });
  return device ? session : null;
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
    include: { set: { include: { materials: true } }, attempts: { where: { passed: true }, take: 1 } },
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
  const alreadyPassed = assignment.attempts.length > 0 || assignment.status === "completed";

  const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.educationAttempt.create({
        data: { householdId: session.householdId, assignmentId: assignment.id, memberId: assignment.memberId, score, correctCount, totalCount, passed, answers: gradedAnswers },
      });
      if (passed) {
        await tx.educationAssignment.update({ where: { id: assignment.id }, data: { status: "completed", completedAt: new Date() } });
        if (!alreadyPassed && assignment.pointsReward > 0) {
          await tx.familyMember.update({ where: { id: assignment.memberId }, data: { totalPoints: { increment: assignment.pointsReward } } });
          const skillId = await resolveSkillId(tx, { householdId: session.householdId, skillId: assignment.set.skillId, subject: assignment.set.subject });
          if (skillId) await awardSkillXp(tx, { householdId: session.householdId, memberId: assignment.memberId, skillId, xp: assignment.pointsReward, sourceType: "education_attempt", sourceId: created.id, note: "Education assignment passed" });
        }
      }
      return created;
  });
  return NextResponse.json({ attempt, score, correctCount, totalCount, passed, passingScore: assignment.passingScore, pointsAwarded: passed && !alreadyPassed ? assignment.pointsReward : 0, answers: gradedAnswers }, { status: 201 });
});
