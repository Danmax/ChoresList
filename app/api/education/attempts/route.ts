import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { canAccessMember } from "@/lib/child-access";
import { normalizeAnswer } from "@/lib/education";
import { requirePluginActive } from "@/lib/plugins/registry";
import { awardSkillXp, resolveSkillId } from "@/lib/skills";

type SubmittedAnswer = {
  materialId: string;
  answer: string;
};

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = requireSession(req);
  await requirePluginActive(householdId, "education-academy");
  const body = await req.json();
  const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!(await canAccessMember(parentId, householdId, memberId))) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }

  const assignment = await prisma.educationAssignment.findFirst({
    where: { id: assignmentId, householdId, memberId },
    include: { set: { include: { materials: true } }, attempts: { where: { passed: true }, take: 1 } },
  });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  if (assignment.set.materials.length === 0) return NextResponse.json({ error: "This assignment has no questions" }, { status: 400 });

  const submitted = Array.isArray(body.answers) ? body.answers as SubmittedAnswer[] : [];
  const answerById = new Map(submitted.map((answer) => [answer.materialId, answer.answer ?? ""]));
  const gradedAnswers = assignment.set.materials.map((material) => {
    const submittedAnswer = answerById.get(material.id) ?? "";
    const correct = normalizeAnswer(submittedAnswer) === normalizeAnswer(material.answer);
    return {
      materialId: material.id,
      prompt: material.prompt,
      answer: submittedAnswer,
      correctAnswer: material.answer,
      correct,
      explanation: material.explanation,
    };
  });
  const correctCount = gradedAnswers.filter((answer) => answer.correct).length;
  const totalCount = assignment.set.materials.length;
  const score = Math.round((correctCount / totalCount) * 100);
  const passed = score >= assignment.passingScore;
  const alreadyPassed = assignment.attempts.length > 0 || assignment.status === "completed";

  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.educationAttempt.create({
      data: {
        householdId,
        assignmentId,
        memberId,
        score,
        correctCount,
        totalCount,
        passed,
        answers: gradedAnswers,
      },
    });

    if (passed) {
      await tx.educationAssignment.update({
        where: { id: assignment.id },
        data: { status: "completed", completedAt: new Date() },
      });
      if (!alreadyPassed && assignment.pointsReward > 0) {
        await tx.familyMember.update({ where: { id: memberId }, data: { totalPoints: { increment: assignment.pointsReward } } });
        const skillId = await resolveSkillId(tx, {
          householdId,
          skillId: assignment.set.skillId,
          subject: assignment.set.subject,
        });
        if (skillId) {
          await awardSkillXp(tx, {
            householdId,
            memberId,
            skillId,
            xp: assignment.pointsReward,
            sourceType: "education_attempt",
            sourceId: created.id,
            note: "Education assignment passed",
          });
        }
      }
    }

    return created;
  });

  return NextResponse.json({
    attempt,
    score,
    correctCount,
    totalCount,
    passed,
    passingScore: assignment.passingScore,
    pointsAwarded: passed && !alreadyPassed ? assignment.pointsReward : 0,
    answers: gradedAnswers,
  }, { status: 201 });
});
