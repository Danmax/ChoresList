import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { isSurveyOpen, scoreSurvey, surveyRespondentKey } from "@/lib/community-surveys";
import { prisma } from "@/lib/prisma";

type AnswerInput = { questionId?: unknown; textValue?: unknown; numberValue?: unknown; optionIds?: unknown };

function cleanAnswers(rawAnswers: unknown, survey: {
  questions: Array<{
    id: string;
    questionType: string;
    prompt: string;
    required: boolean;
    config: unknown;
    options: Array<{ id: string }>;
  }>;
}) {
  const raw = Array.isArray(rawAnswers) ? rawAnswers.slice(0, 50) as AnswerInput[] : [];
  const byQuestion = new Map(raw.map((answer) => [typeof answer.questionId === "string" ? answer.questionId : "", answer]));
  const answers = [];

  for (const question of survey.questions) {
    const input = byQuestion.get(question.id);
    const optionSet = new Set(question.options.map((option) => option.id));
    const optionIds = Array.isArray(input?.optionIds)
      ? Array.from(new Set(input.optionIds.filter((id): id is string => typeof id === "string" && optionSet.has(id))))
      : [];
    const textValue = typeof input?.textValue === "string" ? input.textValue.trim().slice(0, 5000) : "";
    const numeric = Number(input?.numberValue);
    const numberValue = Number.isFinite(numeric) ? numeric : null;
    const isText = question.questionType === "short_text" || question.questionType === "long_text";
    const isRating = question.questionType === "rating";
    const isMultiple = question.questionType === "multiple_choice" || question.questionType === "ranking";
    const hasValue = isText ? Boolean(textValue) : isRating ? numberValue !== null : optionIds.length > 0;

    if (question.required && !hasValue) throw new Error(`Answer required: ${question.prompt}`);
    if (!hasValue) continue;
    if (!isText && !isRating && !isMultiple && optionIds.length !== 1) throw new Error(`Choose one answer for: ${question.prompt}`);
    if (isRating) {
      const config = question.config && typeof question.config === "object" && !Array.isArray(question.config) ? question.config as Record<string, unknown> : {};
      const min = Number(config.min) || 1;
      const max = Number(config.max) || 5;
      if (numberValue === null || numberValue < min || numberValue > max) throw new Error(`Rating is outside the allowed range: ${question.prompt}`);
    }
    answers.push({ questionId: question.id, textValue: textValue || null, numberValue, optionIds });
  }
  return answers;
}

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
    answers = cleanAnswers(body.answers, survey);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid answers" }, { status: 400 });
  }
  const respondentKey = surveyRespondentKey(survey.id, parentId);
  const scored = survey.resultMode === "outcome" ? scoreSurvey(survey.questions, survey.outcomes, answers) : { scores: {}, outcome: null };

  try {
    const submission = await prisma.communitySurveySubmission.create({
      data: {
        surveyId: survey.id,
        respondentKey,
        respondentParentId: survey.responseMode === "recorded" ? parentId : null,
        outcomeId: scored.outcome?.id ?? null,
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
    return NextResponse.json({ submission, showAggregateResults: survey.showAggregateResults }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "You already submitted this survey" }, { status: 409 });
    }
    throw error;
  }
});
