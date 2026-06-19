"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BarChart3, MessageSquareText, Star, Users } from "lucide-react";
import { toast } from "sonner";

type ReportQuestion = {
  id: string;
  prompt: string;
  questionType: string;
  responseCount: number;
  optionCounts: Array<{ id: string; label: string; imageUrl: string | null; count: number }>;
  average: number | null;
  textResponses: string[];
};

type Report = {
  survey: { title: string; description: string | null; responseMode: string; status: string };
  submissionCount: number;
  questions: ReportQuestion[];
  outcomeCounts: Array<{ id: string; title: string; description: string | null; count: number }>;
  recordedResponses: Array<{ id: string; respondent: string; submittedAt: string; outcome: { title: string } | null }>;
  canManage: boolean;
};

export default function SurveyReportPage() {
  const { id: groupId, surveyId } = useParams<{ id: string; surveyId: string }>();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/community/surveys/reports?surveyId=${encodeURIComponent(surveyId)}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => { if (!ok) throw new Error(data.error ?? "Could not load report"); setReport(data); })
      .catch((error) => toast.error(error.message));
  }, [surveyId]);

  if (!report) return <div className="min-h-screen p-6 text-center font-bold text-slate-400">Loading report...</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3"><Link href={`/community/${groupId}/surveys/${surveyId}`} className="rounded-2xl bg-white p-2.5 text-slate-600 shadow-sm"><ArrowLeft size={19} /></Link><div><p className="text-xs font-black uppercase text-violet-500">Survey report</p><h1 className="text-2xl font-black text-slate-800">{report.survey.title}</h1></div></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-3xl bg-violet-500 p-5 text-white"><Users /><p className="mt-4 text-3xl font-black">{report.submissionCount}</p><p className="font-bold text-violet-100">Responses</p></div><div className="rounded-3xl bg-white p-5 shadow-sm"><BarChart3 className="text-emerald-500" /><p className="mt-4 text-3xl font-black text-slate-800">{report.questions.length}</p><p className="font-bold text-slate-500">Questions</p></div><div className="rounded-3xl bg-white p-5 shadow-sm"><Star className="text-amber-500" /><p className="mt-4 text-xl font-black capitalize text-slate-800">{report.survey.responseMode}</p><p className="font-bold text-slate-500">Response mode</p></div></div>

        {report.outcomeCounts.length > 0 && <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm"><h2 className="font-black text-slate-800">Result distribution</h2><div className="mt-4 space-y-3">{report.outcomeCounts.map((outcome) => { const percent = report.submissionCount ? Math.round(outcome.count / report.submissionCount * 100) : 0; return <div key={outcome.id}><div className="mb-1 flex justify-between font-bold text-slate-600"><span>{outcome.title}</span><span>{outcome.count} · {percent}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>}

        <div className="mt-5 space-y-4">{report.questions.map((question, index) => <section key={question.id} className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-violet-500">Question {index + 1}</p><h2 className="mt-1 text-lg font-black text-slate-800">{question.prompt}</h2><p className="text-sm font-semibold text-slate-400">{question.responseCount} responses</p>{question.average !== null && <div className="mt-4 inline-flex items-baseline gap-2 rounded-2xl bg-amber-50 px-4 py-3"><span className="text-3xl font-black text-amber-600">{question.average.toFixed(1)}</span><span className="font-bold text-amber-700">average rating</span></div>}{question.optionCounts.length > 0 && <div className="mt-4 space-y-3">{question.optionCounts.map((option) => { const percent = question.responseCount ? Math.round(option.count / question.responseCount * 100) : 0; return <div key={option.id}><div className="mb-1 flex justify-between text-sm font-bold text-slate-600"><span>{option.label}</span><span>{option.count} · {percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} /></div></div>; })}</div>}{question.textResponses.length > 0 && <div className="mt-4 space-y-2">{question.textResponses.map((text, textIndex) => <blockquote key={textIndex} className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600"><MessageSquareText size={16} className="mt-0.5 shrink-0 text-violet-400" />{text}</blockquote>)}</div>}</section>)}</div>

        {report.recordedResponses.length > 0 && <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm"><h2 className="font-black text-slate-800">Recorded respondents</h2><div className="mt-3 divide-y divide-slate-100">{report.recordedResponses.map((response) => <div key={response.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-bold text-slate-700">{response.respondent}</p>{response.outcome && <p className="text-sm font-semibold text-violet-500">{response.outcome.title}</p>}</div><time className="text-xs font-bold text-slate-400">{new Date(response.submittedAt).toLocaleString()}</time></div>)}</div></section>}
      </div>
    </div>
  );
}
