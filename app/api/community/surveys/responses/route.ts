import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { cleanSurveyAnswers } from "@/lib/community-survey-responses";
import { isSurveyOpen, scoreSurvey, surveyRespondentKey } from "@/lib/community-surveys";
import { prisma } from "@/lib/prisma";

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const surveyId = typeof body.surveyId === "string" ? body.surveyId : "";
  const survey = await prisma.communitySurvey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      outcomes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  await requireCommunityRole(survey.groupId, parentId, "member");
  if (!isSurveyOpen(survey)) return NextResponse.json({ error: "This survey is not accepting responses" }, { status: 400 });

  let answers;
  try {
    answers = cleanSurveyAnswers(body.answers, survey);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid answers" }, { status: 400 });
  }
  const respondentKey = surveyRespondentKey(survey.id, parentId);
  const scored = survey.resultMode === "outcome" ? scoreSurvey(survey.questions, survey.outcomes, answers) : { scores: {}, outcome: null };
  const latestAttempt = await prisma.communitySurveySubmission.aggregate({
    where: { surveyId: survey.id, respondentKey },
    _max: { attemptNumber: true },
  });
  const previousAttempt = latestAttempt._max.attemptNumber ?? 0;
  if (previousAttempt > 0 && !survey.allowMultipleSubmissions) {
    return NextResponse.json({ error: "You already submitted this survey" }, { status: 409 });
  }
  const shareToken = survey.allowResultSharing && scored.outcome ? randomBytes(24).toString("hex") : null;

  try {
    const submission = await prisma.communitySurveySubmission.create({
      data: {
        surveyId: survey.id,
        respondentKey,
        attemptNumber: previousAttempt + 1,
        respondentParentId: survey.responseMode === "recorded" ? parentId : null,
        outcomeId: scored.outcome?.id ?? null,
        shareToken,
        scoreSnapshot: scored.scores,
        answers: {
          create: answers.map((answer) => ({
            questionId: answer.questionId,
            textValue: answer.textValue,
            numberValue: answer.numberValue,
            selections: { create: answer.optionIds.map((optionId, sortOrder) => ({ optionId, sortOrder })) },
          })),
        },
      },
      include: { outcome: true },
    });
    return NextResponse.json({ submission, showAggregateResults: survey.showAggregateResults, sharePath: shareToken ? `/survey-results/${shareToken}` : null }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: survey.allowMultipleSubmissions ? "Another attempt was saved at the same time. Please try again." : "You already submitted this survey" }, { status: 409 });
    }
    throw error;
  }
});
