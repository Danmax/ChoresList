"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Images, LoaderCircle, RefreshCw } from "lucide-react";
import { ParentPageHeader } from "@/components/parent-management-shell";

type Post = { id: string; title: string; sceneId: string; createdAt: string; member: { id: string; name: string } };

export default function ParentFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const load = useCallback(async (cursor?: string) => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError("");
    try {
      const response = await fetch(`/api/coloring/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.posts)) throw new Error(data?.error ?? "Could not load the family feed. Please try again.");
      setPosts((previous) => cursor ? [...previous, ...data.posts.filter((post: Post) => !previous.some((item) => item.id === post.id))] : data.posts);
      setNextCursor(data.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the family feed. Please try again.");
    } finally { busy.current = false; setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <>
    <ParentPageHeader title="Family Feed" description="A little gallery of the creations your children share with you." actions={
      <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh feed</button>
    } />
    <div className="space-y-5 p-4 sm:p-6">
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Shared privately with parents who have access to each child.</p>
      {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}<button type="button" disabled={loading} className="ml-3 underline" onClick={() => void load()}>Try again</button></div>}
      {loading && posts.length === 0 && <p role="status" className="flex items-center justify-center gap-2 py-12 text-slate-500"><LoaderCircle className="animate-spin" size={20} />Loading creations…</p>}
      {!loading && !error && posts.length === 0 && <div className="rounded-3xl border border-dashed border-emerald-200 bg-white px-6 py-14 text-center">
        <Images size={42} className="mx-auto mb-4 text-emerald-500" /><h2 className="text-xl font-black text-slate-800">Their next masterpiece goes here</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">After coloring a picture, your child can tap “Finish picture” and “Share with parents” to add it to this feed.</p>
        <Link href="/parent/games" className="mt-5 inline-block rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Open games</Link>
      </div>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => <article key={post.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <a href={`/api/coloring/feed/${post.id}`} target="_blank" rel="noreferrer" aria-label={`View ${post.title} by ${post.member.name}`} className="block bg-amber-50 p-3">
            <img src={`/api/coloring/feed/${post.id}`} alt={`${post.title}, colored by ${post.member.name}`} loading="lazy" className="aspect-[4/3] w-full rounded-xl bg-white object-contain" />
          </a>
          <div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{post.member.name} shared a picture</p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-800">{post.title}</h2>
            <time dateTime={post.createdAt} className="mt-2 block text-xs text-slate-500">{new Date(post.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
            <a href={`/api/coloring/feed/${post.id}`} download={`${post.title.replace(/[^a-z0-9-]/gi, "-")}.webp`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><Download size={16} />Keep a copy</a>
          </div>
        </article>)}
      </div>
      {nextCursor && <div className="text-center"><button type="button" disabled={loading} onClick={() => void load(nextCursor)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">{loading ? "Loading…" : "Load more pictures"}</button></div>}
    </div>
  </>;
}
