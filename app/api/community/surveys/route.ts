import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";
import { requireCommunityRole } from "@/lib/community";
import { normalizeSurveyDraft, surveyDraftError, surveyRespondentKey } from "@/lib/community-surveys";

function surveyGraph() {
  return {
    questions: { orderBy: { sortOrder: "asc" as const }, include: { options: { orderBy: { sortOrder: "asc" as const } } } },
    outcomes: { orderBy: { sortOrder: "asc" as const } },
    _count: { select: { submissions: true } },
  };
}

function nestedQuestions(questions: ReturnType<typeof normalizeSurveyDraft>["questions"]) {
  return questions.map((question, sortOrder) => ({
    questionType: question.questionType,
    prompt: question.prompt,
    helpText: question.helpText || null,
    required: question.required,
    sortOrder,
    config: question.config,
    options: {
      create: question.options.map((option, optionOrder) => ({
        label: option.label,
        imageUrl: option.imageUrl || null,
        sortOrder: optionOrder,
        scoreWeights: option.scoreWeights,
      })),
    },
  }));
}

function nestedOutcomes(outcomes: ReturnType<typeof normalizeSurveyDraft>["outcomes"]) {
  return outcomes.map((outcome, sortOrder) => ({
    outcomeKey: outcome.outcomeKey,
    title: outcome.title,
    description: outcome.description || null,
    imageUrl: outcome.imageUrl || null,
    sortOrder,
  }));
}

export const GET = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const groupId = req.nextUrl.searchParams.get("groupId") ?? "";
  const surveyId = req.nextUrl.searchParams.get("surveyId") ?? "";

  if (surveyId) {
    const survey = await prisma.communitySurvey.findUnique({ where: { id: surveyId }, include: surveyGraph() });
    if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    const membership = await requireCommunityRole(survey.groupId, parentId, "member");
    const canManage = membership.role === "owner" || membership.role === "manager";
    if (!canManage && survey.status === "draft") return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    const respondentKey = surveyRespondentKey(survey.id, parentId);
    const submission = await prisma.communitySurveySubmission.findFirst({
      where: { surveyId: survey.id, respondentKey },
      include: { outcome: true },
      orderBy: { attemptNumber: "desc" },
    });
    const visibleSurvey = canManage ? survey : {
      ...survey,
      questions: survey.questions.map((question) => ({
        ...question,
        options: question.options.map(({ scoreWeights: _scoreWeights, ...option }) => option),
      })),
    };
    return NextResponse.json({ survey: visibleSurvey, canManage, hasSubmitted: Boolean(submission), submission });
  }

  if (!groupId) return NextResponse.json({ error: "Group is required" }, { status: 400 });
  const membership = await requireCommunityRole(groupId, parentId, "member");
  const canManage = membership.role === "owner" || membership.role === "manager";
  const surveys = await prisma.communitySurvey.findMany({
    where: { groupId, ...(canManage ? {} : { status: { in: ["published", "closed"] } }) },
    include: { _count: { select: { questions: true, submissions: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  const keys = surveys.map((survey) => surveyRespondentKey(survey.id, parentId));
  const submitted = keys.length ? await prisma.communitySurveySubmission.findMany({
    where: { respondentKey: { in: keys }, surveyId: { in: surveys.map((survey) => survey.id) } },
    select: { surveyId: true },
  }) : [];
  const submittedIds = new Set(submitted.map((item) => item.surveyId));
  return NextResponse.json({ surveys: surveys.map((survey) => ({ ...survey, hasSubmitted: submittedIds.has(survey.id) })), canManage, role: membership.role });
});

export const POST = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  await requireCommunityRole(groupId, parentId, "manager");
  const draft = normalizeSurveyDraft(body);
  const error = surveyDraftError(draft);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const survey = await prisma.communitySurvey.create({
    data: {
      groupId,
      createdByParentId: parentId,
      title: draft.title,
      description: draft.description || null,
      surveyType: draft.surveyType,
      responseMode: draft.responseMode,
      resultMode: draft.resultMode,
      showAggregateResults: draft.showAggregateResults,
      allowMultipleSubmissions: draft.allowMultipleSubmissions,
      allowResultSharing: draft.allowResultSharing,
      allowPublicResponses: draft.allowPublicResponses,
      publicToken: draft.allowPublicResponses ? randomBytes(24).toString("hex") : null,
      opensAt: draft.opensAt,
      closesAt: draft.closesAt,
      questions: { create: nestedQuestions(draft.questions) },
      outcomes: { create: nestedOutcomes(draft.outcomes) },
    },
    include: surveyGraph(),
  });
  return NextResponse.json(survey, { status: 201 });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const body = await req.json();
  const surveyId = typeof body.surveyId === "string" ? body.surveyId : "";
  const existing = await prisma.communitySurvey.findUnique({ where: { id: surveyId }, include: { _count: { select: { submissions: true } } } });
  if (!existing) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  await requireCommunityRole(existing.groupId, parentId, "manager");

  if (body.action === "publish") {
    if (existing.status !== "draft") return NextResponse.json({ error: "Only drafts can be published" }, { status: 400 });
    const questionCount = await prisma.communitySurveyQuestion.count({ where: { surveyId } });
    if (!questionCount) return NextResponse.json({ error: "Add at least one question before publishing" }, { status: 400 });
    const survey = await prisma.communitySurvey.update({ where: { id: surveyId }, data: { status: "published", publishedAt: new Date(), closedAt: null }, include: surveyGraph() });
    return NextResponse.json(survey);
  }
  if (body.action === "close") {
    const survey = await prisma.communitySurvey.update({ where: { id: surveyId }, data: { status: "closed", closedAt: new Date() }, include: surveyGraph() });
    return NextResponse.json(survey);
  }
  if (body.action === "reopen") {
    const survey = await prisma.communitySurvey.update({ where: { id: surveyId }, data: { status: "published", closedAt: null }, include: surveyGraph() });
    return NextResponse.json(survey);
  }
  if (existing._count.submissions > 0) {
    return NextResponse.json({ error: "Surveys with recorded responses cannot be edited" }, { status: 400 });
  }

  const draft = normalizeSurveyDraft(body);
  const error = surveyDraftError(draft);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const survey = await prisma.$transaction(async (tx) => {
    await tx.communitySurveyQuestion.deleteMany({ where: { surveyId } });
    await tx.communitySurveyOutcome.deleteMany({ where: { surveyId } });
    return tx.communitySurvey.update({
      where: { id: surveyId },
      data: {
        title: draft.title,
        description: draft.description || null,
        surveyType: draft.surveyType,
        responseMode: draft.responseMode,
        resultMode: draft.resultMode,
        showAggregateResults: draft.showAggregateResults,
        allowMultipleSubmissions: draft.allowMultipleSubmissions,
        allowResultSharing: draft.allowResultSharing,
        allowPublicResponses: draft.allowPublicResponses,
        publicToken: draft.allowPublicResponses ? existing.publicToken ?? randomBytes(24).toString("hex") : null,
        opensAt: draft.opensAt,
        closesAt: draft.closesAt,
        questions: { create: nestedQuestions(draft.questions) },
        outcomes: { create: nestedOutcomes(draft.outcomes) },
      },
      include: surveyGraph(),
    });
  });
  return NextResponse.json(survey);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const { parentId } = requireSession(req);
  const surveyId = req.nextUrl.searchParams.get("surveyId") ?? "";
  const survey = await prisma.communitySurvey.findUnique({ where: { id: surveyId }, include: { _count: { select: { submissions: true } } } });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  await requireCommunityRole(survey.groupId, parentId, "manager");
  if (survey.status !== "draft" || survey._count.submissions > 0) return NextResponse.json({ error: "Only empty drafts can be deleted" }, { status: 400 });
  await prisma.communitySurvey.delete({ where: { id: surveyId } });
  return NextResponse.json({ ok: true });
});
