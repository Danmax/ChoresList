import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { cleanSurveyAnswers } from "@/lib/community-survey-responses";
import { isSurveyOpen, publicSurveyRespondentKey, scoreSurvey } from "@/lib/community-surveys";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };
const VISITOR_COOKIE = "public_survey_visitor";

function visitorId(req: NextRequest) {
  const existing = req.cookies.get(VISITOR_COOKIE)?.value ?? "";
  return /^[a-f0-9]{32}$/.test(existing) ? { id: existing, created: false } : { id: randomBytes(16).toString("hex"), created: true };
}

function rememberVisitor(response: NextResponse, visitor: { id: string; created: boolean }) {
  if (visitor.created) response.cookies.set(VISITOR_COOKIE, visitor.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

function publicSurveyGraph() {
  return {
    group: { select: { name: true } },
    questions: { orderBy: { sortOrder: "asc" as const }, include: { options: { orderBy: { sortOrder: "asc" as const } } } },
    outcomes: { orderBy: { sortOrder: "asc" as const } },
  };
}

async function findPublicSurvey(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return prisma.communitySurvey.findFirst({
    where: { publicToken: token, allowPublicResponses: true, status: { in: ["published", "closed"] } },
    include: publicSurveyGraph(),
  });
}

export const GET = withErrors(async (req: NextRequest, context?: unknown) => {
  const { token } = await (context as RouteContext).params;
  const survey = await findPublicSurvey(token);
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  const visitor = visitorId(req);
  const respondentKey = publicSurveyRespondentKey(survey.id, visitor.id);
  const submission = await prisma.communitySurveySubmission.findFirst({
    where: { surveyId: survey.id, respondentKey },
    select: { shareToken: true, outcome: { select: { title: true, description: true, imageUrl: true } } },
    orderBy: { attemptNumber: "desc" },
  });
  const visibleSurvey = {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    surveyType: survey.surveyType,
    status: survey.status,
    opensAt: survey.opensAt,
    closesAt: survey.closesAt,
    allowMultipleSubmissions: survey.allowMultipleSubmissions,
    allowResultSharing: survey.allowResultSharing,
    groupName: survey.group.name,
    questions: survey.questions.map((question) => ({
      id: question.id,
      questionType: question.questionType,
      prompt: question.prompt,
      helpText: question.helpText,
      required: question.required,
      config: question.config,
      options: question.options.map((option) => ({ id: option.id, label: option.label, imageUrl: option.imageUrl })),
    })),
  };
  return rememberVisitor(NextResponse.json({ survey: visibleSurvey, hasSubmitted: Boolean(submission), submission }), visitor);
});

export const POST = withErrors(async (req: NextRequest, context?: unknown) => {
  const limited = rateLimit(req, { key: "public-survey-response", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const { token } = await (context as RouteContext).params;
  const survey = await findPublicSurvey(token);
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (!isSurveyOpen(survey)) return NextResponse.json({ error: "This survey is not accepting responses" }, { status: 400 });

  const body = await req.json();
  let answers;
  try {
    answers = cleanSurveyAnswers(body.answers, survey);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid answers" }, { status: 400 });
  }

  const visitor = visitorId(req);
  const respondentKey = publicSurveyRespondentKey(survey.id, visitor.id);
  const latestAttempt = await prisma.communitySurveySubmission.aggregate({ where: { surveyId: survey.id, respondentKey }, _max: { attemptNumber: true } });
  const previousAttempt = latestAttempt._max.attemptNumber ?? 0;
  if (previousAttempt > 0 && !survey.allowMultipleSubmissions) {
    return rememberVisitor(NextResponse.json({ error: "You already submitted this survey" }, { status: 409 }), visitor);
  }
  const scored = survey.resultMode === "outcome" ? scoreSurvey(survey.questions, survey.outcomes, answers) : { scores: {}, outcome: null };
  const shareToken = survey.allowResultSharing && scored.outcome ? randomBytes(24).toString("hex") : null;

  try {
    const submission = await prisma.communitySurveySubmission.create({
      data: {
        surveyId: survey.id,
        respondentKey,
        attemptNumber: previousAttempt + 1,
        outcomeId: scored.outcome?.id ?? null,
        shareToken,
        scoreSnapshot: scored.scores,
        answers: { create: answers.map((answer) => ({
          questionId: answer.questionId,
          textValue: answer.textValue,
          numberValue: answer.numberValue,
          selections: { create: answer.optionIds.map((optionId, sortOrder) => ({ optionId, sortOrder })) },
        })) },
      },
      select: { shareToken: true, outcome: { select: { title: true, description: true, imageUrl: true } } },
    });
    return rememberVisitor(NextResponse.json({ submission }, { status: 201 }), visitor);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return rememberVisitor(NextResponse.json({ error: survey.allowMultipleSubmissions ? "Please retry this attempt." : "You already submitted this survey" }, { status: 409 }), visitor);
    }
    throw error;
  }
});
