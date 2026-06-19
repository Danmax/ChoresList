"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Plus, Users } from "lucide-react";
import { toast } from "sonner";

type SurveyListItem = {
  id: string;
  title: string;
  description: string | null;
  surveyType: string;
  responseMode: string;
  status: string;
  hasSubmitted: boolean;
  closesAt: string | null;
  _count: { questions: number; submissions: number };
};

export default function CommunitySurveysPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/surveys?groupId=${encodeURIComponent(groupId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load surveys");
      setSurveys(data.surveys);
      setCanManage(data.canManage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load surveys");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href={`/community/${groupId}`} className="rounded-2xl bg-white p-2.5 text-slate-600 shadow-sm"><ArrowLeft size={20} /></Link>
          <div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-2xl font-black text-slate-800"><ClipboardList className="text-violet-500" /> Surveys & Polls</h1><p className="font-semibold text-slate-500">Share feedback, vote, or discover a personalized result.</p></div>
          {canManage && <Link href={`/community/${groupId}/surveys/new`} className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white"><Plus size={17} /> Create Survey</Link>}
        </div>

        {loading ? <p className="py-20 text-center font-bold text-slate-400">Loading surveys...</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            {surveys.map((survey) => (
              <article key={survey.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2 text-xs font-black uppercase"><span className="rounded-full bg-violet-100 px-2 py-1 text-violet-700">{survey.surveyType}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">{survey.responseMode}</span><span className={`rounded-full px-2 py-1 ${survey.status === "published" ? "bg-emerald-100 text-emerald-700" : survey.status === "closed" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{survey.status}</span></div><h2 className="mt-3 text-lg font-black text-slate-800">{survey.title}</h2></div>{survey.hasSubmitted && <CheckCircle2 className="shrink-0 text-emerald-500" />}</div>
                {survey.description && <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-500">{survey.description}</p>}
                <div className="mt-4 flex gap-4 text-sm font-bold text-slate-400"><span>{survey._count.questions} questions</span><span className="flex items-center gap-1"><Users size={14} /> {survey._count.submissions} responses</span></div>
                <div className="mt-4 flex flex-wrap gap-2"><Link href={`/community/${groupId}/surveys/${survey.id}`} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-white">{survey.status === "draft" ? "Review" : survey.hasSubmitted ? "View" : "Take Survey"}</Link>{canManage && survey.status !== "draft" && <Link href={`/community/${groupId}/surveys/${survey.id}/report`} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600"><BarChart3 size={15} /> Report</Link>}</div>
              </article>
            ))}
            {surveys.length === 0 && <div className="rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center md:col-span-2"><ClipboardList size={38} className="mx-auto text-slate-300" /><p className="mt-3 font-black text-slate-500">No surveys yet</p><p className="text-sm font-semibold text-slate-400">{canManage ? "Create a survey or AI-generate a poll to get started." : "A manager can publish the first survey."}</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}
