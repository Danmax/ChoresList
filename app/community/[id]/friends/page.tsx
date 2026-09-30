"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Gamepad2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { OnlineChessLobby, type OnlineChessMatch } from "@/components/online-chess-lobby";

type Profile = { parentId?: string; displayName: string; avatar: string; bio?: string | null; isDiscoverable: boolean; childSocialEnabled: boolean };
type Connection = { id: string; requesterParentId: string; recipientParentId: string; status: string };
type Friendship = { id: string; requesterParentId: string; recipientParentId: string; childAId: string; childBId: string; status: string };
type Child = { id: string; name: string; avatar: string; color: string };

export default function CommunityFriendsPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [myChildren, setMyChildren] = useState<Child[]>([]);
  const [householdParentIds, setHouseholdParentIds] = useState<string[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<Record<string, Child[]>>({});
  const [chessMatches, setChessMatches] = useState<OnlineChessMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/community/social?groupId=${encodeURIComponent(groupId)}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) toast.error(data?.error ?? "Could not load social play");
    else { setProfile(data.profile); setProfiles(data.profiles ?? []); setConnections(data.connections ?? []); setFriendships(data.friendships ?? []); setMyChildren(data.myChildren ?? []); setHouseholdParentIds(data.householdParentIds ?? []); setChildrenByParent(data.childrenByParent ?? {}); setChessMatches(data.chessMatches ?? []); }
    setLoading(false);
  }, [groupId]);
  useEffect(() => { load(); }, [load]);
  async function action(body: Record<string, unknown>) {
    const res = await fetch("/api/community/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, ...body }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not save"); return; }
    await load();
  }
  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const res = await fetch("/api/community/social", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, ...profile }) });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) return toast.error(data?.error ?? "Could not update profile");
    setProfile(data.profile); toast.success("Social-play settings saved"); await load();
  }
  function requestFriend(parentId: string) {
    const theirChildren = childrenByParent[parentId] ?? [];
    if (!myChildren[0] || !theirChildren[0]) return toast.error("Select a connected parent with an eligible child first");
    void action({ action: "friend-request", parentId, myChildId: myChildren[0].id, friendChildId: theirChildren[0].id });
  }
  if (loading) return <div className="p-6 text-center font-bold text-slate-400">Loading social play…</div>;
  if (!profile) return <div className="p-6 text-center font-bold text-slate-400">Social play is available to group members.</div>;

  return <main className="mx-auto max-w-5xl p-4 sm:p-6">
    <Link href={`/community/${groupId}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold text-slate-600 shadow-sm"><ArrowLeft size={17}/> Community</Link>
    <div className="mt-5 rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-800 p-6 text-white shadow-lg"><div className="flex gap-4"><ShieldCheck className="mt-1 shrink-0" size={28}/><div><h1 className="text-3xl font-black">Parent connections &amp; play</h1><p className="mt-2 max-w-2xl font-semibold text-violet-100">Parents and children in your household are already connected. For other households, parents connect first and approve every child friendship. Chess is private and has no chat.</p></div></div></div>
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm"><h2 className="font-black text-slate-800">Your group profile</h2><p className="mt-1 text-sm font-semibold text-slate-500">Only active members of this group can see it. Never include contact details or child information.</p><div className="mt-4 grid gap-3 sm:grid-cols-[5rem_1fr]"><input aria-label="Avatar" value={profile.avatar} maxLength={32} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-center text-xl"/><div className="grid gap-3 sm:grid-cols-2"><input value={profile.displayName} maxLength={80} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 font-bold" placeholder="Parent display name"/><input value={profile.bio ?? ""} maxLength={280} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2" placeholder="A short, parent-friendly intro"/></div></div><label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={profile.isDiscoverable} onChange={(e) => setProfile({ ...profile, isDiscoverable: e.target.checked })}/> Let other group parents find and request a connection</label><label className="mt-3 flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={profile.childSocialEnabled} onChange={(e) => setProfile({ ...profile, childSocialEnabled: e.target.checked })}/> Allow me to approve child friendships and private games</label><button type="button" disabled={saving} onClick={saveProfile} className="mt-4 rounded-xl bg-violet-700 px-4 py-2 font-black text-white disabled:opacity-50">Save settings</button></section>
    <section className="mt-6"><h2 className="flex items-center gap-2 text-xl font-black text-slate-800"><Users size={21}/> Parents in this group</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{profiles.map((item) => { const connection = connections.find((c) => c.requesterParentId === item.parentId || c.recipientParentId === item.parentId); const isFamilyParent = Boolean(item.parentId && householdParentIds.includes(item.parentId)); return <article key={item.parentId} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex gap-3"><span className="text-3xl">{item.avatar}</span><div><h3 className="font-black text-slate-800">{item.displayName}</h3>{item.bio && <p className="mt-1 text-sm font-semibold text-slate-500">{item.bio}</p>}</div></div>{isFamilyParent ? <p className="mt-4 text-sm font-black text-emerald-700">Family · already connected</p> : connection ? <p className="mt-4 text-sm font-black text-violet-700">{connection.status === "active" ? "Connected" : connection.status === "pending" ? "Connection requested" : connection.status}</p> : <button onClick={() => void action({ action: "connect", parentId: item.parentId })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-800"><UserPlus size={16}/> Request connection</button>}</article>; })}{profiles.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-400">No other parents have opted in yet.</p>}</div></section>
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-800">Requests needing your approval</h2><div className="mt-3 space-y-3">{connections.filter((item) => item.status === "pending" && item.recipientParentId === profile.parentId).map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl bg-amber-50 p-3 text-sm font-bold"><span>A parent connection request is waiting.</span><button onClick={() => void action({ action: "connection-status", id: item.id, status: "active" })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-white"><Check size={15}/> Accept</button></div>)}{friendships.filter((item) => item.status === "pending" && item.recipientParentId === profile.parentId).map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl bg-amber-50 p-3 text-sm font-bold"><span>A child friendship request is waiting.</span><button onClick={() => void action({ action: "friendship-status", id: item.id, status: "active" })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-white"><Check size={15}/> Approve</button></div>)}{!connections.some((item) => item.status === "pending" && item.recipientParentId === profile.parentId) && !friendships.some((item) => item.status === "pending" && item.recipientParentId === profile.parentId) && <p className="text-sm font-semibold text-slate-400">Nothing waiting for approval.</p>}</div></section>
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black text-slate-800"><Gamepad2 size={21}/> Child friendships</h2><p className="mt-1 text-sm font-semibold text-slate-500">Siblings and family members in your household are already connected—choose a family opponent in Chess Quest to play together. For another household, this first release defaults to each parent’s first eligible child; the server verifies both parents, both children, and the active group.</p>{myChildren.length > 1 && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-800">Family play ready: {myChildren.map((child) => child.name).join(", ")}</p>}<div className="mt-3 space-y-3">{connections.filter((item) => item.status === "active").map((item) => { const otherId = item.requesterParentId === profile.parentId ? item.recipientParentId : item.requesterParentId; if (householdParentIds.includes(otherId)) return null; return <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3"><span className="text-sm font-bold">Connected parent · {childrenByParent[otherId]?.length ?? 0} eligible child profile(s)</span><button onClick={() => requestFriend(otherId)} disabled={!profile.childSocialEnabled} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50">Request child friendship</button></div>; })}</div></section>
    <OnlineChessLobby groupId={groupId} friendships={friendships} myChildren={myChildren} childrenByParent={childrenByParent} matches={chessMatches} onRefresh={load} />
  </main>;
}
