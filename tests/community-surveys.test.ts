import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSurveyDraft, scoreSurvey, surveyDraftError, surveyRespondentKey } from "../lib/community-surveys";

test("normalizes survey input and rejects choice questions without choices", () => {
  const draft = normalizeSurveyDraft({
    title: "  Weekly Poll  ",
    surveyType: "poll",
    responseMode: "anonymous",
    questions: [{ questionType: "single_choice", prompt: "Pick one", required: true, options: [{ label: "Only one" }] }],
  });
  assert.equal(draft.title, "Weekly Poll");
  assert.equal(draft.responseMode, "anonymous");
  assert.match(surveyDraftError(draft) ?? "", /at least two choices/);
});

test("adds standard yes/no choices", () => {
  const draft = normalizeSurveyDraft({ title: "Vote", questions: [{ questionType: "yes_no", prompt: "Attend?" }] });
  assert.deepEqual(draft.questions[0].options.map((option) => option.label), ["Yes", "No"]);
  assert.equal(surveyDraftError(draft), null);
});

test("personality scoring selects the highest weighted outcome deterministically", () => {
  const questions = [{ id: "q1", options: [
    { id: "a", scoreWeights: { hero: 3, sage: 0 } },
    { id: "b", scoreWeights: { hero: 0, sage: 2 } },
  ] }];
  const outcomes = [
    { id: "hero-id", outcomeKey: "hero", sortOrder: 0 },
    { id: "sage-id", outcomeKey: "sage", sortOrder: 1 },
  ];
  const result = scoreSurvey(questions, outcomes, [{ questionId: "q1", optionIds: ["a"] }]);
  assert.deepEqual(result.scores, { hero: 3, sage: 0 });
  assert.equal(result.outcome?.id, "hero-id");
});

test("anonymous respondent keys are stable per survey and unlinkable across surveys", () => {
  const first = surveyRespondentKey("survey-a", "parent-1");
  assert.equal(first, surveyRespondentKey("survey-a", "parent-1"));
  assert.notEqual(first, surveyRespondentKey("survey-b", "parent-1"));
  assert.equal(first.length, 64);
});
