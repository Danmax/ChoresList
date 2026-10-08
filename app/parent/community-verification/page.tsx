"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ParentPageHeader } from "@/components/parent-management-shell";

type Group = { id: string; name: string; groupType: string; description: string | null; location: string | null; organizationDomain: string | null; createdAt: string; creator: { email: string; emailVerified: boolean; displayName: string | null } };

export default function CommunityVerificationPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/community/verification", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error ?? "You are not authorized to review public organizations."); setGroups([]); }
    else { setError(""); setGroups(data.groups ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function review(groupId: string, action: "approve" | "reject") {
    setBusy(groupId);
    const response = await fetch("/api/community/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, action }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) toast.error(data?.error ?? "Could not save review");
    else { toast.success(action === "approve" ? "Organization verified" : "Organization declined"); await load(); }
    setBusy("");
  }
  return <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6"><ParentPageHeader title="Public organization verification" description="Review public businesses, organizations, churches, and other official establishments before they can be discovered or joined." actions={<button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-black"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />
    {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 font-semibold text-amber-900">{error}<p className="mt-2 text-sm">Configure `COMMUNITY_VERIFICATION_ADMIN_EMAILS` with the reviewer’s account email to enable this queue.</p></div> : loading ? <p className="py-16 text-center font-bold text-slate-400">Loading verification queue…</p> : groups.length === 0 ? <div className="rounded-3xl bg-white p-12 text-center shadow-sm"><ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-3 text-xl font-black text-slate-800">All caught up</h2><p className="mt-1 text-sm font-semibold text-slate-500">There are no public organizations awaiting review.</p></div> : <div className="space-y-4">{groups.map((group) => <article key={group.id} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-800">{group.name}</h2><p className="mt-1 text-sm font-bold text-violet-600">{group.groupType} · {group.location ?? "No location supplied"}</p>{group.description && <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">{group.description}</p>}<p className="mt-3 text-xs font-bold text-slate-500">Representative: {group.creator.displayName ?? group.creator.email} · {group.creator.email} {group.creator.emailVerified ? "✓ email verified" : "· email unverified"}</p><p className="mt-1 text-xs font-bold text-slate-500">Claimed domain: {group.organizationDomain ?? "Not supplied"}</p></div><div className="flex gap-2"><button disabled={busy === group.id} onClick={() => void review(group.id, "reject")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700"><XCircle className="h-4 w-4" /> Decline</button><button disabled={busy === group.id} onClick={() => void review(group.id, "approve")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" /> Verify</button></div></div></article>)}</div>}</main>;
}
