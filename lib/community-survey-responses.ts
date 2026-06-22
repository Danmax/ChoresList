type AnswerInput = { questionId?: unknown; textValue?: unknown; numberValue?: unknown; optionIds?: unknown };

export type CleanSurveyAnswer = {
  questionId: string;
  textValue: string | null;
  numberValue: number | null;
  optionIds: string[];
};

export function cleanSurveyAnswers(rawAnswers: unknown, survey: {
  questions: Array<{
    id: string;
    questionType: string;
    prompt: string;
    required: boolean;
    config: unknown;
    options: Array<{ id: string }>;
  }>;
}): CleanSurveyAnswer[] {
  const raw = Array.isArray(rawAnswers) ? rawAnswers.slice(0, 50) as AnswerInput[] : [];
  const byQuestion = new Map(raw.map((answer) => [typeof answer.questionId === "string" ? answer.questionId : "", answer]));
  const answers: CleanSurveyAnswer[] = [];

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
