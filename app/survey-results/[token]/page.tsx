import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Share2, Sparkles, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ token: string }> };

const getSharedResult = cache(async (token: string) => {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return prisma.communitySurveySubmission.findFirst({
    where: {
      shareToken: token,
      outcomeId: { not: null },
      survey: { allowResultSharing: true, surveyType: "personality" },
    },
    select: {
      outcome: { select: { title: true, description: true, imageUrl: true } },
      survey: { select: { title: true, description: true, group: { select: { name: true } } } },
    },
  });
});

function absoluteImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return undefined;
  try {
    return new URL(imageUrl, process.env.PUBLIC_BASE_URL).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await getSharedResult(token);
  if (!result?.outcome) return { title: "Shared quiz result | ChoresList" };
  const title = `${result.outcome.title} — ${result.survey.title}`;
  const description = result.outcome.description || `See this ${result.survey.title} personality quiz result on ChoresList.`;
  const image = absoluteImage(result.outcome.imageUrl);
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "website", ...(image ? { images: [{ url: image, alt: result.outcome.title }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function SharedSurveyResultPage({ params }: PageProps) {
  const { token } = await params;
  const result = await getSharedResult(token);
  if (!result?.outcome) notFound();

  const sharePath = `/survey-results/${token}`;
  const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
  const shareUrl = `${baseUrl}${sharePath}`;
  const shareText = `Check out the “${result.outcome.title}” result from ${result.survey.title} on ChoresList.`;

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-violet-100">
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-6 py-8 text-center text-white sm:px-10">
          <p className="text-xs font-black uppercase tracking-widest text-violet-100">Shared personality quiz result</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{result.survey.title}</h1>
          <p className="mt-2 font-semibold text-violet-100">Created by {result.survey.group.name}</p>
        </div>

        <section className="p-6 text-center sm:p-10">
          {result.outcome.imageUrl && <img src={result.outcome.imageUrl} alt={result.outcome.title} className="mx-auto aspect-video w-full max-w-lg rounded-3xl object-cover shadow-sm" />}
          <p className="mt-6 text-sm font-black uppercase tracking-wider text-violet-500">Their result</p>
          <h2 className="mt-1 text-4xl font-black text-slate-800">{result.outcome.title}</h2>
          {result.outcome.description && <p className="mx-auto mt-4 max-w-xl text-lg font-semibold leading-8 text-slate-600">{result.outcome.description}</p>}

          <div className="mt-8 rounded-3xl bg-gradient-to-br from-violet-50 to-emerald-50 p-6">
            <Sparkles className="mx-auto text-violet-500" />
            <h3 className="mt-3 text-2xl font-black text-slate-800">Bring your family and community together</h3>
            <p className="mx-auto mt-2 max-w-lg font-semibold leading-7 text-slate-600">Create quizzes, coordinate chores and events, and keep your household organized with ChoresList.</p>
            <Link href="/parent?signup=1" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white shadow-sm hover:bg-violet-700"><UserPlus size={18} /> Sign up free</Link>
          </div>

          {shareUrl && <div className="mt-7"><p className="flex items-center justify-center gap-2 text-sm font-black text-slate-500"><Share2 size={16} /> Share this result</p><div className="mt-3 flex flex-wrap justify-center gap-2"><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Facebook</a><a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">X</a><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white">LinkedIn</a></div></div>}
        </section>
      </div>
    </main>
  );
}
