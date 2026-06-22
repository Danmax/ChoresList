export type QuestionType = "short_text" | "long_text" | "single_choice" | "multiple_choice" | "dropdown" | "rating" | "picture_choice" | "most_likely" | "ranking" | "yes_no";

export type SurveyOption = {
  id?: string;
  label: string;
  imageUrl: string;
  scoreWeights: Record<string, number>;
};

export type SurveyQuestion = {
  id?: string;
  questionType: QuestionType;
  prompt: string;
  helpText: string;
  required: boolean;
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  options: SurveyOption[];
};

export type SurveyOutcome = { id?: string; outcomeKey: string; title: string; description: string; imageUrl: string };

export type SurveyDraft = {
  title: string;
  description: string;
  surveyType: "survey" | "poll" | "personality";
  responseMode: "anonymous" | "recorded";
  resultMode: "none" | "aggregate" | "outcome";
  showAggregateResults: boolean;
  allowMultipleSubmissions: boolean;
  allowResultSharing: boolean;
  allowPublicResponses: boolean;
  opensAt: string;
  closesAt: string;
  questions: SurveyQuestion[];
  outcomes: SurveyOutcome[];
};

export type StoredSurvey = Omit<SurveyDraft, "questions" | "outcomes"> & {
  id: string;
  groupId: string;
  status: "draft" | "published" | "closed";
  publishedAt: string | null;
  closedAt: string | null;
  publicToken: string | null;
  questions: Array<Omit<SurveyQuestion, "id" | "options"> & { id: string; options: Array<Omit<SurveyOption, "id"> & { id: string }> }>;
  outcomes: Array<Omit<SurveyOutcome, "id"> & { id: string }>;
  _count: { submissions: number };
};

export const QUESTION_LABELS: Record<QuestionType, string> = {
  short_text: "Short answer",
  long_text: "Long answer",
  single_choice: "Select one",
  multiple_choice: "Select multiple",
  dropdown: "Dropdown",
  rating: "Rating",
  picture_choice: "Select picture",
  most_likely: "Most likely",
  ranking: "Ranking",
  yes_no: "Yes / No",
};

export const OPTION_TYPES = new Set<QuestionType>(["single_choice", "multiple_choice", "dropdown", "picture_choice", "most_likely", "ranking", "yes_no"]);
