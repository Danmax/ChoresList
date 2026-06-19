"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, CheckCircle2, Edit3, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_LABELS, type StoredSurvey } from "@/components/community-surveys/types";

type AnswerState = { textValue?: string; numberValue?: number; optionIds?: string[] };
type SubmissionResult = { outcome?: { title: string; description: string | null; imageUrl: string | null } | null };

export default function TakeSurveyPage() {
  const { id: groupId, surveyId } = useParams<{ id: string; surveyId: string }>();
  const router = useRouter();
  const [survey, setSurvey] = useState<StoredSurvey | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<SubmissionResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/community/surveys?surveyId=${encodeURIComponent(surveyId)}`);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Could not load survey"); return; }
    setSurvey(data.survey);
    setCanManage(data.canManage);
    setHasSubmitted(data.hasSubmitted);
    setPreviousSubmission(data.submission);
  }, [surveyId]);

  useEffect(() => { void load(); }, [load]);

  function setAnswer(questionId: string, patch: AnswerState) {
    setAnswers((current) => ({ ...current, [questionId]: { ...current[questionId], ...patch } }));
  }

  function toggleOption(questionId: string, optionId: string, ranked = false) {
    const selected = answers[questionId]?.optionIds ?? [];
    const next = selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
    setAnswer(questionId, { optionIds: ranked ? next : next });
  }

  async function action(action: "publish" | "close" | "reopen") {
    const res = await fetch("/api/community/surveys", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyId, action }) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Could not update survey"); return; }
    toast.success(action === "publish" ? "Survey published" : action === "close" ? "Survey closed" : "Survey reopened");
    await load();
  }

  async function submit() {
    setSubmitting(true);
    try {
      const payload = survey?.questions.map((question) => ({ questionId: question.id, ...answers[question.id] })) ?? [];
      const res = await fetch("/api/community/surveys/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyId, answers: payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit survey");
      setResult(data.submission);
      setHasSubmitted(true);
      toast.success("Response submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit survey");
    } finally {
      setSubmitting(false);
    }
  }

  if (!survey) return <div className="min-h-screen p-6 text-center font-bold text-slate-400">Loading survey...</div>;
  const shownResult = result ?? previousSubmission;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center gap-3"><Link href={`/community/${groupId}/surveys`} className="rounded-2xl bg-white p-2.5 text-slate-600 shadow-sm"><ArrowLeft size={19} /></Link><div className="flex-1" />{canManage && survey._count.submissions === 0 && <Link href={`/community/${groupId}/surveys/${surveyId}/edit`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-black text-slate-600 shadow-sm"><Edit3 size={16} /> Edit</Link>}{canManage && survey.status === "draft" && <button onClick={() => action("publish")} className="rounded-2xl bg-emerald-500 px-4 py-2 font-black text-white">Publish</button>}{canManage && survey.status === "published" && <button onClick={() => action("close")} className="rounded-2xl bg-amber-100 px-4 py-2 font-black text-amber-700">Close</button>}{canManage && survey.status === "closed" && <button onClick={() => action("reopen")} className="rounded-2xl bg-emerald-100 px-4 py-2 font-black text-emerald-700">Reopen</button>}{canManage && survey.status !== "draft" && <Link href={`/community/${groupId}/surveys/${surveyId}/report`} className="inline-flex items-center gap-2 rounded-2xl bg-violet-100 px-4 py-2 font-black text-violet-700"><BarChart3 size={16} /> Report</Link>}</div>

        <header className="rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 p-6 text-white shadow-sm">
          <div className="flex flex-wrap gap-2 text-xs font-black uppercase"><span className="rounded-full bg-white/20 px-2 py-1">{survey.surveyType}</span><span className="rounded-full bg-white/20 px-2 py-1">{survey.responseMode}</span><span className="rounded-full bg-white/20 px-2 py-1">{survey.status}</span></div>
          <h1 className="mt-4 text-3xl font-black">{survey.title}</h1>
          {survey.description && <p className="mt-2 font-semibold text-violet-100">{survey.description}</p>}
          <p className="mt-4 flex items-center gap-2 text-sm font-bold text-violet-100"><Lock size={15} /> {survey.responseMode === "anonymous" ? "Your identity is not stored with this response." : "Your response is recorded with your account."}</p>
        </header>

        {survey.status === "draft" ? <div className="mt-5 rounded-3xl bg-amber-50 p-6 text-center font-bold text-amber-700">This is a draft. Publish it when it is ready for members.</div> : hasSubmitted ? (
          <div className="mt-5 rounded-3xl bg-white p-8 text-center shadow-sm"><CheckCircle2 size={48} className="mx-auto text-emerald-500" /><h2 className="mt-3 text-2xl font-black text-slate-800">Response submitted</h2>{shownResult?.outcome && <div className="mx-auto mt-5 max-w-lg rounded-3xl bg-violet-50 p-6">{shownResult.outcome.imageUrl && <img src={shownResult.outcome.imageUrl} alt="" className="mx-auto mb-4 h-36 w-36 rounded-3xl object-cover" />}<p className="text-sm font-black uppercase text-violet-500">Your result</p><h3 className="mt-1 text-2xl font-black text-violet-800">{shownResult.outcome.title}</h3><p className="mt-2 font-semibold text-violet-700">{shownResult.outcome.description}</p></div>}{survey.showAggregateResults && <Link href={`/community/${groupId}/surveys/${surveyId}/report`} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white"><BarChart3 size={17} /> View Results</Link>}</div>
        ) : survey.status === "closed" ? <div className="mt-5 rounded-3xl bg-amber-50 p-6 text-center font-bold text-amber-700">This survey is closed.</div> : (
          <div className="mt-5 space-y-4">
            {survey.questions.map((question, index) => {
              const answer = answers[question.id] ?? {};
              const config = question.config ?? {};
              const min = Number(config.min) || 1;
              const max = Number(config.max) || 5;
              return <section key={question.id} className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-violet-500">Question {index + 1} · {QUESTION_LABELS[question.questionType]}</p><h2 className="mt-1 text-lg font-black text-slate-800">{question.prompt}{question.required && <span className="text-red-500"> *</span>}</h2>{question.helpText && <p className="mt-1 text-sm font-semibold text-slate-500">{question.helpText}</p>}
                {question.questionType === "short_text" && <Input value={answer.textValue ?? ""} onChange={(event) => setAnswer(question.id, { textValue: event.target.value })} className="mt-4 h-11 rounded-2xl" />}
                {question.questionType === "long_text" && <Textarea value={answer.textValue ?? ""} onChange={(event) => setAnswer(question.id, { textValue: event.target.value })} className="mt-4 min-h-32 rounded-2xl" />}
                {question.questionType === "rating" && <div className="mt-4"><div className="flex flex-wrap gap-2">{Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((value) => <button key={value} onClick={() => setAnswer(question.id, { numberValue: value })} className={`grid h-11 w-11 place-items-center rounded-xl font-black ${answer.numberValue === value ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-600"}`}>{value}</button>)}</div><div className="mt-2 flex justify-between text-xs font-bold text-slate-400"><span>{config.minLabel}</span><span>{config.maxLabel}</span></div></div>}
                {question.questionType === "dropdown" && <select value={answer.optionIds?.[0] ?? ""} onChange={(event) => setAnswer(question.id, { optionIds: event.target.value ? [event.target.value] : [] })} className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 font-semibold"><option value="">Choose an answer</option>{question.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>}
                {["single_choice", "yes_no", "most_likely"].includes(question.questionType) && <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <button key={option.id} onClick={() => setAnswer(question.id, { optionIds: [option.id] })} className={`rounded-2xl border-2 p-3 text-left font-bold ${answer.optionIds?.[0] === option.id ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-100 text-slate-600"}`}>{option.label}</button>)}</div>}
                {question.questionType === "picture_choice" && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{question.options.map((option) => <button key={option.id} onClick={() => setAnswer(question.id, { optionIds: [option.id] })} className={`overflow-hidden rounded-2xl border-2 text-left ${answer.optionIds?.[0] === option.id ? "border-violet-400 bg-violet-50" : "border-slate-100"}`}>{option.imageUrl ? <img src={option.imageUrl} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center bg-slate-100 text-3xl">🖼️</div>}<span className="block p-3 font-bold text-slate-700">{option.label}</span></button>)}</div>}
                {["multiple_choice", "ranking"].includes(question.questionType) && <div className="mt-4 space-y-2">{question.options.map((option) => { const position = answer.optionIds?.indexOf(option.id) ?? -1; return <button key={option.id} onClick={() => toggleOption(question.id, option.id, question.questionType === "ranking")} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left font-bold ${position >= 0 ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-100 text-slate-600"}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-sm">{question.questionType === "ranking" && position >= 0 ? position + 1 : position >= 0 ? "✓" : ""}</span>{option.label}</button>; })}</div>}
              </section>;
            })}
            <button onClick={submit} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 font-black text-white hover:bg-emerald-600 disabled:opacity-50"><Send size={18} /> {submitting ? "Submitting..." : "Submit Response"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
