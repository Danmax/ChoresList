"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, ImagePlus, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPTION_TYPES, QUESTION_LABELS, type QuestionType, type SurveyDraft, type SurveyOption, type SurveyQuestion, type StoredSurvey } from "./types";

const BLANK_DRAFT: SurveyDraft = {
  title: "",
  description: "",
  surveyType: "survey",
  responseMode: "recorded",
  resultMode: "none",
  showAggregateResults: false,
  opensAt: "",
  closesAt: "",
  questions: [],
  outcomes: [],
};

type AiBrief = {
  surveyType: SurveyDraft["surveyType"];
  audience: string;
  goal: string;
  questionCount: number;
  questionMix: string;
  typeDetails: string;
  tone: string;
  responseMode: SurveyDraft["responseMode"];
  additionalContext: string;
};

const BLANK_AI_BRIEF: AiBrief = {
  surveyType: "survey",
  audience: "",
  goal: "",
  questionCount: 8,
  questionMix: "",
  typeDetails: "",
  tone: "Friendly, clear, and neutral",
  responseMode: "recorded",
  additionalContext: "",
};

const TYPE_DETAILS: Record<AiBrief["surveyType"], { label: string; placeholder: string; guidance: string }> = {
  survey: {
    label: "Topics and insights needed",
    placeholder: "Satisfaction, communication, scheduling challenges, and one open feedback question",
    guidance: "Include the topics to measure, rating scales, and feedback you need.",
  },
  poll: {
    label: "Decision and choices",
    placeholder: "Choose the July gathering date: July 11, July 18, or July 25; allow one choice",
    guidance: "Include the decision being made, available choices, and whether people may select more than one.",
  },
  personality: {
    label: "Result types and traits",
    placeholder: "Results: The Organizer, The Encourager, The Problem Solver, and The Connector; describe each strength",
    guidance: "List the result names, defining traits, desired result images or URLs, and what answers should map to each result.",
  },
};

function blankQuestion(questionType: QuestionType = "single_choice"): SurveyQuestion {
  return {
    questionType,
    prompt: "",
    helpText: "",
    required: false,
    config: questionType === "rating" ? { min: 1, max: 5, minLabel: "Low", maxLabel: "High" } : {},
    options: OPTION_TYPES.has(questionType)
      ? [{ label: "Option 1", imageUrl: "", scoreWeights: {} }, { label: "Option 2", imageUrl: "", scoreWeights: {} }]
      : [],
  };
}

function dateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromStored(survey: StoredSurvey): SurveyDraft {
  return {
    title: survey.title,
    description: survey.description ?? "",
    surveyType: survey.surveyType,
    responseMode: survey.responseMode,
    resultMode: survey.resultMode,
    showAggregateResults: survey.showAggregateResults,
    opensAt: dateInput(survey.opensAt),
    closesAt: dateInput(survey.closesAt),
    questions: survey.questions.map((question) => ({ ...question, helpText: question.helpText ?? "", config: question.config ?? {}, options: question.options.map((option) => ({ ...option, imageUrl: option.imageUrl ?? "", scoreWeights: option.scoreWeights ?? {} })) })),
    outcomes: survey.outcomes.map((outcome) => ({ ...outcome, description: outcome.description ?? "", imageUrl: outcome.imageUrl ?? "" })),
  };
}

export function SurveyBuilder({ groupId, surveyId }: { groupId: string; surveyId?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SurveyDraft>(BLANK_DRAFT);
  const [loading, setLoading] = useState(Boolean(surveyId));
  const [saving, setSaving] = useState(false);
  const [aiBrief, setAiBrief] = useState<AiBrief>(BLANK_AI_BRIEF);
  const [generating, setGenerating] = useState(false);
  const [uploadingOutcome, setUploadingOutcome] = useState<number | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    fetch(`/api/community/surveys?surveyId=${encodeURIComponent(surveyId)}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!ok || !data.canManage || data.survey._count.submissions > 0) throw new Error(data.error ?? "This survey cannot be edited after responses are recorded");
        setDraft(fromStored(data.survey));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [surveyId]);

  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setDraft((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question) }));
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<SurveyOption>) {
    const question = draft.questions[questionIndex];
    updateQuestion(questionIndex, { options: question.options.map((option, index) => index === optionIndex ? { ...option, ...patch } : option) });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.questions.length) return;
    setDraft((current) => {
      const questions = [...current.questions];
      [questions[index], questions[nextIndex]] = [questions[nextIndex], questions[index]];
      return { ...current, questions };
    });
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/community/surveys/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, brief: aiBrief }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate survey");
      setDraft({ ...data.draft, opensAt: "", closesAt: "" });
      toast.success("Survey draft generated. Review it before saving.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate survey");
    } finally {
      setGenerating(false);
    }
  }

  async function uploadOutcomeImage(index: number, file: File) {
    setUploadingOutcome(index);
    try {
      const body = new FormData();
      body.append("groupId", groupId);
      body.append("file", file);
      const res = await fetch("/api/community/surveys/image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload image");
      setDraft((current) => ({
        ...current,
        outcomes: current.outcomes.map((outcome, outcomeIndex) => outcomeIndex === index ? { ...outcome, imageUrl: data.path } : outcome),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploadingOutcome(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/community/surveys", {
        method: surveyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, groupId, surveyId, opensAt: draft.opensAt ? new Date(draft.opensAt).toISOString() : null, closesAt: draft.closesAt ? new Date(draft.closesAt).toISOString() : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save survey");
      toast.success(surveyId ? "Survey updated" : "Survey draft saved");
      router.push(`/community/${groupId}/surveys/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save survey");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen p-6 font-bold text-slate-500">Loading survey...</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/community/${groupId}/surveys`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm"><ArrowLeft size={17} /> Surveys</Link>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-2.5 font-black text-white hover:bg-violet-600 disabled:opacity-50"><Save size={17} /> {saving ? "Saving..." : surveyId ? "Save Changes" : "Save Draft"}</button>
        </div>

        <section className="mb-5 rounded-3xl bg-violet-50 p-5 ring-1 ring-violet-100">
          <h2 className="flex items-center gap-2 font-black text-violet-900"><Sparkles size={18} /> Generate with AI</h2>
          <p className="mt-1 text-sm font-semibold text-violet-700">Give the generator enough context to write useful questions, answer choices, and results.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-violet-900">Type<select value={aiBrief.surveyType} onChange={(event) => setAiBrief({ ...aiBrief, surveyType: event.target.value as AiBrief["surveyType"], typeDetails: "" })} className="mt-1 h-11 w-full rounded-2xl border border-violet-100 bg-white px-3"><option value="survey">Survey</option><option value="poll">Poll</option><option value="personality">Personality / result quiz</option></select></label>
            <label className="text-sm font-bold text-violet-900">Audience<Input value={aiBrief.audience} onChange={(event) => setAiBrief({ ...aiBrief, audience: event.target.value })} placeholder="Community volunteers, parents, teens..." className="mt-1 h-11 rounded-2xl bg-white" /></label>
            <label className="text-sm font-bold text-violet-900 md:col-span-2">Goal<Input value={aiBrief.goal} onChange={(event) => setAiBrief({ ...aiBrief, goal: event.target.value })} placeholder="What should this help you learn, decide, or reveal?" className="mt-1 h-11 rounded-2xl bg-white" /></label>
            <label className="text-sm font-bold text-violet-900">Questions<Input type="number" min={1} max={30} value={aiBrief.questionCount} onChange={(event) => setAiBrief({ ...aiBrief, questionCount: Number(event.target.value) })} className="mt-1 h-11 rounded-2xl bg-white" /></label>
            <label className="text-sm font-bold text-violet-900">Responses<select value={aiBrief.responseMode} onChange={(event) => setAiBrief({ ...aiBrief, responseMode: event.target.value as AiBrief["responseMode"] })} className="mt-1 h-11 w-full rounded-2xl border border-violet-100 bg-white px-3"><option value="recorded">Recorded</option><option value="anonymous">Anonymous</option></select></label>
            <label className="text-sm font-bold text-violet-900 md:col-span-2">Question mix<Input value={aiBrief.questionMix} onChange={(event) => setAiBrief({ ...aiBrief, questionMix: event.target.value })} placeholder="Mostly multiple choice, two ratings, and one optional long answer" className="mt-1 h-11 rounded-2xl bg-white" /></label>
            <label className="text-sm font-bold text-violet-900 md:col-span-2">{TYPE_DETAILS[aiBrief.surveyType].label}<span className="mt-0.5 block text-xs font-semibold text-violet-600">{TYPE_DETAILS[aiBrief.surveyType].guidance}</span><Textarea value={aiBrief.typeDetails} onChange={(event) => setAiBrief({ ...aiBrief, typeDetails: event.target.value })} placeholder={TYPE_DETAILS[aiBrief.surveyType].placeholder} className="mt-1 min-h-20 rounded-2xl bg-white" /></label>
            <label className="text-sm font-bold text-violet-900">Tone<Input value={aiBrief.tone} onChange={(event) => setAiBrief({ ...aiBrief, tone: event.target.value })} className="mt-1 h-11 rounded-2xl bg-white" /></label>
            <label className="text-sm font-bold text-violet-900">Additional context<Input value={aiBrief.additionalContext} onChange={(event) => setAiBrief({ ...aiBrief, additionalContext: event.target.value })} placeholder="Reading level, topics to avoid, required wording..." className="mt-1 h-11 rounded-2xl bg-white" /></label>
          </div>
          <button onClick={generate} disabled={generating || aiBrief.audience.trim().length < 2 || aiBrief.goal.trim().length < 4 || aiBrief.typeDetails.trim().length < 4} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{generating ? "Generating..." : "Generate Draft"}</button>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Title</Label><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 h-11 rounded-2xl" /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1 rounded-2xl" /></div>
            <label className="font-bold text-slate-700">Type<select value={draft.surveyType} onChange={(event) => { const surveyType = event.target.value as SurveyDraft["surveyType"]; setDraft({ ...draft, surveyType, resultMode: surveyType === "personality" ? "outcome" : draft.resultMode }); }} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3"><option value="survey">Survey</option><option value="poll">Poll</option><option value="personality">Personality / result</option></select></label>
            <label className="font-bold text-slate-700">Responses<select value={draft.responseMode} onChange={(event) => setDraft({ ...draft, responseMode: event.target.value as SurveyDraft["responseMode"] })} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3"><option value="recorded">Recorded</option><option value="anonymous">Anonymous</option></select></label>
            <label className="font-bold text-slate-700">Opens at<Input type="datetime-local" value={draft.opensAt} onChange={(event) => setDraft({ ...draft, opensAt: event.target.value })} className="mt-1 h-11 rounded-2xl" /></label>
            <label className="font-bold text-slate-700">Closes at<Input type="datetime-local" value={draft.closesAt} onChange={(event) => setDraft({ ...draft, closesAt: event.target.value })} className="mt-1 h-11 rounded-2xl" /></label>
            <label className="flex items-center gap-2 font-bold text-slate-700 md:col-span-2"><input type="checkbox" checked={draft.showAggregateResults} onChange={(event) => setDraft({ ...draft, showAggregateResults: event.target.checked, resultMode: event.target.checked && draft.resultMode === "none" ? "aggregate" : draft.resultMode })} /> Let takers see aggregate results after responding</label>
          </div>
        </section>

        {draft.surveyType === "personality" && (
          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="font-black text-slate-800">Results</h2><p className="text-sm font-semibold text-slate-500">Each option can award points toward these outcomes.</p></div><button onClick={() => setDraft({ ...draft, outcomes: [...draft.outcomes, { outcomeKey: `result_${draft.outcomes.length + 1}`, title: "New result", description: "", imageUrl: "" }] })} className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-700"><Plus size={15} className="inline" /> Result</button></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{draft.outcomes.map((outcome, index) => <div key={index} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex gap-2"><Input value={outcome.title} onChange={(event) => setDraft({ ...draft, outcomes: draft.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} placeholder="Result title" /><button onClick={() => setDraft({ ...draft, outcomes: draft.outcomes.filter((_, itemIndex) => itemIndex !== index) })} className="text-red-500"><Trash2 size={16} /></button></div>
              <Input value={outcome.outcomeKey} onChange={(event) => setDraft({ ...draft, outcomes: draft.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, outcomeKey: event.target.value } : item) })} placeholder="result_key" className="mt-2" />
              <Textarea value={outcome.description} onChange={(event) => setDraft({ ...draft, outcomes: draft.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })} placeholder="Result description" className="mt-2" />
              {outcome.imageUrl && <div className="relative mt-3 overflow-hidden rounded-2xl bg-slate-200"><img src={outcome.imageUrl} alt={`${outcome.title || "Result"} preview`} className="aspect-video w-full object-cover" /><button onClick={() => setDraft({ ...draft, outcomes: draft.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, imageUrl: "" } : item) })} className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-red-500 shadow"><Trash2 size={14} /></button></div>}
              <div className="mt-2 flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700"><ImagePlus size={16} /> {uploadingOutcome === index ? "Uploading..." : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={uploadingOutcome !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadOutcomeImage(index, file); event.target.value = ""; }} className="sr-only" /></label>
                <span className="text-xs font-semibold text-slate-400">or paste a URL below</span>
              </div>
              <Input value={outcome.imageUrl} onChange={(event) => setDraft({ ...draft, outcomes: draft.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, imageUrl: event.target.value } : item) })} placeholder="Image URL" className="mt-2" />
            </div>)}</div>
          </section>
        )}

        <div className="mt-5 space-y-4">
          {draft.questions.map((question, questionIndex) => (
            <section key={questionIndex} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 font-black text-violet-700">{questionIndex + 1}</span>
                <select value={question.questionType} onChange={(event) => { const questionType = event.target.value as QuestionType; updateQuestion(questionIndex, { ...blankQuestion(questionType), prompt: question.prompt, helpText: question.helpText, required: question.required }); }} className="h-9 rounded-xl border border-slate-200 px-2 font-bold text-slate-600">{Object.entries(QUESTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <div className="ml-auto flex gap-1"><button onClick={() => moveQuestion(questionIndex, -1)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ArrowUp size={15} /></button><button onClick={() => moveQuestion(questionIndex, 1)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ArrowDown size={15} /></button><button onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, index) => index !== questionIndex) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={15} /></button></div>
              </div>
              <Input value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder="Question" className="mt-3 h-11 rounded-2xl font-bold" />
              <Input value={question.helpText} onChange={(event) => updateQuestion(questionIndex, { helpText: event.target.value })} placeholder="Optional help text" className="mt-2 rounded-xl" />
              <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(questionIndex, { required: event.target.checked })} /> Required</label>
              {question.questionType === "rating" && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><Input type="number" value={question.config.min ?? 1} onChange={(event) => updateQuestion(questionIndex, { config: { ...question.config, min: Number(event.target.value) } })} /><Input type="number" value={question.config.max ?? 5} onChange={(event) => updateQuestion(questionIndex, { config: { ...question.config, max: Number(event.target.value) } })} /><Input value={question.config.minLabel ?? ""} onChange={(event) => updateQuestion(questionIndex, { config: { ...question.config, minLabel: event.target.value } })} placeholder="Low label" /><Input value={question.config.maxLabel ?? ""} onChange={(event) => updateQuestion(questionIndex, { config: { ...question.config, maxLabel: event.target.value } })} placeholder="High label" /></div>}
              {OPTION_TYPES.has(question.questionType) && <div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="rounded-2xl bg-slate-50 p-3"><div className="flex gap-2"><Input value={option.label} onChange={(event) => updateOption(questionIndex, optionIndex, { label: event.target.value })} placeholder={`Option ${optionIndex + 1}`} /><button onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} className="text-red-500"><Trash2 size={15} /></button></div>{question.questionType === "picture_choice" && <Input value={option.imageUrl} onChange={(event) => updateOption(questionIndex, optionIndex, { imageUrl: event.target.value })} placeholder="HTTPS image URL" className="mt-2" />}{draft.surveyType === "personality" && draft.outcomes.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{draft.outcomes.map((outcome) => <label key={outcome.outcomeKey} className="flex items-center gap-1 text-xs font-bold text-slate-500">{outcome.title}<Input type="number" value={option.scoreWeights[outcome.outcomeKey] ?? 0} onChange={(event) => updateOption(questionIndex, optionIndex, { scoreWeights: { ...option.scoreWeights, [outcome.outcomeKey]: Number(event.target.value) } })} className="h-7 w-16" /></label>)}</div>}</div>)}<button onClick={() => updateQuestion(questionIndex, { options: [...question.options, { label: `Option ${question.options.length + 1}`, imageUrl: "", scoreWeights: {} }] })} className="text-sm font-black text-violet-600"><Plus size={14} className="inline" /> Add choice</button></div>}
            </section>
          ))}
        </div>
        <button onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-4 font-black text-violet-700 hover:bg-violet-100"><Plus size={18} /> Add Question</button>
      </div>
    </div>
  );
}
