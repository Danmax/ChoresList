import { createHmac } from "crypto";

export const SURVEY_TYPES = ["survey", "poll", "personality"] as const;
export const RESPONSE_MODES = ["anonymous", "recorded"] as const;
export const RESULT_MODES = ["none", "aggregate", "outcome"] as const;
export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "rating",
  "picture_choice",
  "most_likely",
  "ranking",
  "yes_no",
] as const;

export type SurveyType = (typeof SURVEY_TYPES)[number];
export type ResponseMode = (typeof RESPONSE_MODES)[number];
export type ResultMode = (typeof RESULT_MODES)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type SurveyOptionDraft = {
  label: string;
  imageUrl: string;
  scoreWeights: Record<string, number>;
};

export type SurveyQuestionDraft = {
  questionType: QuestionType;
  prompt: string;
  helpText: string;
  required: boolean;
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  options: SurveyOptionDraft[];
};

export type SurveyOutcomeDraft = {
  outcomeKey: string;
  title: string;
  description: string;
  imageUrl: string;
};

export type SurveyDraft = {
  title: string;
  description: string;
  surveyType: SurveyType;
  responseMode: ResponseMode;
  resultMode: ResultMode;
  showAggregateResults: boolean;
  allowMultipleSubmissions: boolean;
  allowResultSharing: boolean;
  opensAt: string | null;
  closesAt: string | null;
  questions: SurveyQuestionDraft[];
  outcomes: SurveyOutcomeDraft[];
};

const OPTION_TYPES = new Set<QuestionType>(["single_choice", "multiple_choice", "dropdown", "picture_choice", "most_likely", "ranking", "yes_no"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanUrl(value: unknown) {
  const text = cleanText(value, 1024);
  if (!text) return "";
  if (/^\/uploads\/community-surveys\/[a-zA-Z0-9/_-]+\.webp$/.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback;
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanWeights(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, score]) => [cleanText(key, 64).toLowerCase().replace(/[^a-z0-9_-]/g, ""), Number(score)] as const)
      .filter(([key, score]) => key && Number.isFinite(score) && Math.abs(score) <= 100)
  );
}

export function normalizeSurveyDraft(input: unknown): SurveyDraft {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const surveyType = oneOf(raw.surveyType, SURVEY_TYPES, "survey");
  const resultMode = oneOf(raw.resultMode, RESULT_MODES, surveyType === "personality" ? "outcome" : "none");
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions.slice(0, 50) : [];
  const questions = rawQuestions.map((item): SurveyQuestionDraft => {
    const question = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const questionType = oneOf(question.questionType, QUESTION_TYPES, "single_choice");
    const rawConfig = question.config && typeof question.config === "object" && !Array.isArray(question.config)
      ? question.config as Record<string, unknown>
      : {};
    const min = Math.max(0, Math.min(10, Number(rawConfig.min) || 1));
    const max = Math.max(min + 1, Math.min(100, Number(rawConfig.max) || 5));
    let options = (Array.isArray(question.options) ? question.options : []).slice(0, 30).map((value): SurveyOptionDraft => {
      const option = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        label: cleanText(option.label, 255),
        imageUrl: cleanUrl(option.imageUrl),
        scoreWeights: cleanWeights(option.scoreWeights),
      };
    }).filter((option) => option.label);
    if (questionType === "yes_no" && options.length === 0) {
      options = [{ label: "Yes", imageUrl: "", scoreWeights: {} }, { label: "No", imageUrl: "", scoreWeights: {} }];
    }
    return {
      questionType,
      prompt: cleanText(question.prompt, 1000),
      helpText: cleanText(question.helpText, 1000),
      required: Boolean(question.required),
      config: questionType === "rating" ? {
        min,
        max,
        minLabel: cleanText(rawConfig.minLabel, 80),
        maxLabel: cleanText(rawConfig.maxLabel, 80),
      } : {},
      options: OPTION_TYPES.has(questionType) ? options : [],
    };
  }).filter((question) => question.prompt);

  const outcomes = (Array.isArray(raw.outcomes) ? raw.outcomes : []).slice(0, 20).map((item): SurveyOutcomeDraft => {
    const outcome = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      outcomeKey: cleanText(outcome.outcomeKey, 64).toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      title: cleanText(outcome.title, 255),
      description: cleanText(outcome.description, 2000),
      imageUrl: cleanUrl(outcome.imageUrl),
    };
  }).filter((outcome) => outcome.outcomeKey && outcome.title);

  return {
    title: cleanText(raw.title, 255),
    description: cleanText(raw.description, 4000),
    surveyType,
    responseMode: oneOf(raw.responseMode, RESPONSE_MODES, "recorded"),
    resultMode,
    showAggregateResults: Boolean(raw.showAggregateResults),
    allowMultipleSubmissions: surveyType === "personality" && Boolean(raw.allowMultipleSubmissions),
    allowResultSharing: surveyType === "personality" && Boolean(raw.allowResultSharing),
    opensAt: cleanDate(raw.opensAt),
    closesAt: cleanDate(raw.closesAt),
    questions,
    outcomes,
  };
}

export function surveyDraftError(draft: SurveyDraft) {
  if (!draft.title) return "Survey title is required";
  if (draft.questions.length === 0) return "Add at least one question";
  for (const question of draft.questions) {
    if (OPTION_TYPES.has(question.questionType) && question.options.length < 2) {
      return `“${question.prompt}” needs at least two choices`;
    }
  }
  if (draft.resultMode === "outcome" && draft.outcomes.length < 2) return "Outcome surveys need at least two results";
  if (draft.opensAt && draft.closesAt && new Date(draft.opensAt) >= new Date(draft.closesAt)) return "Closing time must be after opening time";
  return null;
}

function respondentSecret() {
  return process.env.AUTH_SECRET?.trim() || "dev-only-survey-secret";
}

export function surveyRespondentKey(surveyId: string, parentId: string) {
  return createHmac("sha256", respondentSecret()).update(`community-survey:${surveyId}:${parentId}`).digest("hex");
}

export function scoreSurvey(
  questions: Array<{ id: string; options: Array<{ id: string; scoreWeights: unknown }> }>,
  outcomes: Array<{ id: string; outcomeKey: string; sortOrder: number }>,
  answers: Array<{ questionId: string; optionIds?: string[] }>
) {
  const scores: Record<string, number> = Object.fromEntries(outcomes.map((outcome) => [outcome.outcomeKey, 0]));
  const options = new Map(questions.flatMap((question) => question.options.map((option) => [option.id, option])));
  answers.flatMap((answer) => answer.optionIds ?? []).forEach((optionId) => {
    const weights = options.get(optionId)?.scoreWeights;
    if (!weights || typeof weights !== "object" || Array.isArray(weights)) return;
    Object.entries(weights as Record<string, unknown>).forEach(([key, value]) => {
      if (key in scores && Number.isFinite(Number(value))) scores[key] += Number(value);
    });
  });
  const winner = [...outcomes].sort((a, b) => (scores[b.outcomeKey] - scores[a.outcomeKey]) || a.sortOrder - b.sortOrder)[0] ?? null;
  return { scores, outcome: winner };
}

export function isSurveyOpen(survey: { status: string; opensAt: Date | null; closesAt: Date | null }, now = new Date()) {
  return survey.status === "published" && (!survey.opensAt || survey.opensAt <= now) && (!survey.closesAt || survey.closesAt > now);
}
