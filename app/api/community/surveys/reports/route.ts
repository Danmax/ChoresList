import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { surveyRespondentKey } from "@/lib/community-surveys";
import { prisma } from "@/lib/prisma";

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const surveyId = req.nextUrl.searchParams.get("surveyId") ?? "";
  const survey = await prisma.communitySurvey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      outcomes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  const membership = await requireCommunityRole(survey.groupId, parentId, "member");
  const canManage = membership.role === "owner" || membership.role === "manager";
  const respondentKey = surveyRespondentKey(survey.id, parentId);
  const ownSubmission = await prisma.communitySurveySubmission.findFirst({ where: { surveyId, respondentKey }, select: { id: true } });
  if (!canManage && (!survey.showAggregateResults || !ownSubmission)) {
    return NextResponse.json({ error: "Survey results are not available" }, { status: 403 });
  }

  const submissions = await prisma.communitySurveySubmission.findMany({
    where: { surveyId },
    include: {
      respondent: { select: { id: true, displayName: true, email: true } },
      outcome: true,
      answers: { include: { selections: { include: { option: true }, orderBy: { sortOrder: "asc" } } } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const questions = survey.questions.map((question) => {
    const answers = submissions.flatMap((submission) => submission.answers.filter((answer) => answer.questionId === question.id));
    const optionCounts = question.options.map((option) => ({
      id: option.id,
      label: option.label,
      imageUrl: option.imageUrl,
      count: answers.filter((answer) => answer.selections.some((selection) => selection.optionId === option.id)).length,
    }));
    const ratings = answers.map((answer) => answer.numberValue).filter((value): value is number => value !== null);
    const textResponses = answers.map((answer) => answer.textValue).filter((value): value is string => Boolean(value));
    return {
      id: question.id,
      prompt: question.prompt,
      questionType: question.questionType,
      responseCount: answers.length,
      optionCounts,
      average: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
      textResponses: canManage ? textResponses : [],
    };
  });
  const outcomeCounts = survey.outcomes.map((outcome) => ({ ...outcome, count: submissions.filter((submission) => submission.outcomeId === outcome.id).length }));
  const recordedResponses = canManage && survey.responseMode === "recorded" ? submissions.map((submission) => ({
    id: submission.id,
    submittedAt: submission.submittedAt,
    respondent: submission.respondent ? submission.respondent.displayName || submission.respondent.email : "Former member",
    outcome: submission.outcome,
  })) : [];

  return NextResponse.json({ survey, submissionCount: submissions.length, questions, outcomeCounts, recordedResponses, canManage });
});
