"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, RotateCcw, Send, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_LABELS, type QuestionType } from "./types";

type AnswerState = { textValue?: string; numberValue?: number; optionIds?: string[] };
type PublicQuestion = { id: string; questionType: QuestionType; prompt: string; helpText: string | null; required: boolean; config: { min?: number; max?: number; minLabel?: string; maxLabel?: string } | null; options: Array<{ id: string; label: string; imageUrl: string | null }> };
type PublicSurveyData = { id: string; title: string; description: string | null; surveyType: string; status: string; opensAt: string | null; closesAt: string | null; allowMultipleSubmissions: boolean; allowResultSharing: boolean; groupName: string; questions: PublicQuestion[] };
type Submission = { shareToken: string | null; outcome: { title: string; description: string | null; imageUrl: string | null } | null };

export function PublicSurvey({ token }: { token: string }) {
  const [survey, setSurvey] = useState<PublicSurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/surveys/${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load survey");
    setSurvey(data.survey);
    setHasSubmitted(data.hasSubmitted);
    setSubmission(data.submission);
  }, [token]);

  useEffect(() => {
    load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [load]);

  function setAnswer(questionId: string, patch: AnswerState) {
    setAnswers((current) => ({ ...current, [questionId]: { ...current[questionId], ...patch } }));
  }

  function toggleOption(questionId: string, optionId: string) {
    const selected = answers[questionId]?.optionIds ?? [];
    setAnswer(questionId, { optionIds: selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId] });
  }

  async function submit() {
    if (!survey) return;
    setSubmitting(true);
    try {
      const payload = survey.questions.map((question) => ({ questionId: question.id, ...answers[question.id] }));
      const res = await fetch(`/api/public/surveys/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit survey");
      setSubmission(data.submission);
      setHasSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit survey");
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setAnswers({});
    setSubmission(null);
    setHasSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <div className="min-h-screen p-8 text-center font-bold text-slate-400">Loading survey...</div>;
  if (!survey) return <div className="min-h-screen p-8 text-center font-bold text-slate-500">This survey is not available.</div>;

  const now = Date.now();
  const unavailable = survey.status === "closed" || (survey.opensAt && new Date(survey.opensAt).getTime() > now) || (survey.closesAt && new Date(survey.closesAt).getTime() <= now);
  const shareUrl = submission?.shareToken ? `${window.location.origin}/survey-results/${submission.shareToken}` : "";
  const shareText = submission?.outcome ? `I got “${submission.outcome.title}” on ${survey.title}. Discover your result with ChoresList!` : "";

  return <main className="min-h-screen p-4 sm:p-8"><div className="mx-auto max-w-3xl">
    <header className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white shadow-lg sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-violet-100">Public {survey.surveyType} · {survey.groupName}</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">{survey.title}</h1>{survey.description && <p className="mt-3 text-lg font-semibold text-violet-100">{survey.description}</p>}<p className="mt-5 text-sm font-bold text-violet-100">No account required. Your response is anonymous.</p></header>

    {hasSubmitted ? <section className="mt-5 rounded-3xl bg-white p-7 text-center shadow-sm sm:p-9"><CheckCircle2 size={48} className="mx-auto text-emerald-500" /><h2 className="mt-3 text-2xl font-black text-slate-800">Response submitted</h2>{submission?.outcome && <div className="mx-auto mt-5 max-w-lg rounded-3xl bg-violet-50 p-6">{submission.outcome.imageUrl && <img src={submission.outcome.imageUrl} alt={submission.outcome.title} className="mx-auto mb-4 aspect-video w-full rounded-2xl object-cover" />}<p className="text-xs font-black uppercase text-violet-500">Your result</p><h3 className="mt-1 text-3xl font-black text-violet-800">{submission.outcome.title}</h3>{submission.outcome.description && <p className="mt-2 font-semibold text-violet-700">{submission.outcome.description}</p>}</div>}{shareUrl && <div className="mt-5"><p className="flex items-center justify-center gap-2 font-black text-slate-600"><Share2 size={17} /> Share your result</p><div className="mt-3 flex flex-wrap justify-center gap-2"><button onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => toast.success("Link copied"))} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"><Copy size={14} /> Copy</button><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white">Facebook</a><a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">X</a></div></div>}<div className="mt-6 flex flex-wrap justify-center gap-2">{survey.allowMultipleSubmissions && <button onClick={retake} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2.5 font-black text-emerald-700"><RotateCcw size={17} /> Try Again</button>}<Link href="/parent?signup=1" className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 font-black text-white"><UserPlus size={17} /> Create an account</Link></div></section>
    : unavailable ? <div className="mt-5 rounded-3xl bg-amber-50 p-6 text-center font-bold text-amber-700">This survey is not currently accepting responses.</div>
    : <div className="mt-5 space-y-4">{survey.questions.map((question, index) => { const answer = answers[question.id] ?? {}; const config = question.config ?? {}; const min = Number(config.min) || 1; const max = Number(config.max) || 5; return <section key={question.id} className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-violet-500">Question {index + 1} · {QUESTION_LABELS[question.questionType]}</p><h2 className="mt-1 text-lg font-black text-slate-800">{question.prompt}{question.required && <span className="text-red-500"> *</span>}</h2>{question.helpText && <p className="mt-1 text-sm font-semibold text-slate-500">{question.helpText}</p>}
      {question.questionType === "short_text" && <Input value={answer.textValue ?? ""} onChange={(event) => setAnswer(question.id, { textValue: event.target.value })} className="mt-4 h-11 rounded-2xl" />}
      {question.questionType === "long_text" && <Textarea value={answer.textValue ?? ""} onChange={(event) => setAnswer(question.id, { textValue: event.target.value })} className="mt-4 min-h-32 rounded-2xl" />}
      {question.questionType === "rating" && <div className="mt-4"><div className="flex flex-wrap gap-2">{Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((value) => <button key={value} onClick={() => setAnswer(question.id, { numberValue: value })} className={`grid h-11 w-11 place-items-center rounded-xl font-black ${answer.numberValue === value ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-600"}`}>{value}</button>)}</div><div className="mt-2 flex justify-between text-xs font-bold text-slate-400"><span>{config.minLabel}</span><span>{config.maxLabel}</span></div></div>}
      {question.questionType === "dropdown" && <select value={answer.optionIds?.[0] ?? ""} onChange={(event) => setAnswer(question.id, { optionIds: event.target.value ? [event.target.value] : [] })} className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 font-semibold"><option value="">Choose an answer</option>{question.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>}
      {["single_choice", "yes_no", "most_likely"].includes(question.questionType) && <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <button key={option.id} onClick={() => setAnswer(question.id, { optionIds: [option.id] })} className={`rounded-2xl border-2 p-3 text-left font-bold ${answer.optionIds?.[0] === option.id ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-100 text-slate-600"}`}>{option.label}</button>)}</div>}
      {question.questionType === "picture_choice" && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{question.options.map((option) => <button key={option.id} onClick={() => setAnswer(question.id, { optionIds: [option.id] })} className={`overflow-hidden rounded-2xl border-2 text-left ${answer.optionIds?.[0] === option.id ? "border-violet-400 bg-violet-50" : "border-slate-100"}`}>{option.imageUrl ? <img src={option.imageUrl} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center bg-slate-100 text-3xl">🖼️</div>}<span className="block p-3 font-bold text-slate-700">{option.label}</span></button>)}</div>}
      {["multiple_choice", "ranking"].includes(question.questionType) && <div className="mt-4 space-y-2">{question.options.map((option) => { const position = answer.optionIds?.indexOf(option.id) ?? -1; return <button key={option.id} onClick={() => toggleOption(question.id, option.id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left font-bold ${position >= 0 ? "border-violet-400 bg-violet-50 text-violet-800" : "border-slate-100 text-slate-600"}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-sm">{question.questionType === "ranking" && position >= 0 ? position + 1 : position >= 0 ? "✓" : ""}</span>{option.label}</button>; })}</div>}
    </section>; })}<button onClick={submit} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 font-black text-white disabled:opacity-50"><Send size={18} /> {submitting ? "Submitting..." : "Submit Response"}</button></div>}
  </div></main>;
}
