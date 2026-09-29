"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { toast } from "sonner";

type Notification = { id: string; type: string; title: string; body: string | null; url: string | null; scheduledFor: string; readAt: string | null };

function when(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    const res = await fetch("/api/notifications"); const data = await res.json().catch(() => null);
    if (!res.ok) return toast.error(data?.error ?? "Could not load notifications");
    setItems(data.notifications ?? []); setUnread(data.unread ?? 0);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function update(body: Record<string, unknown>) {
    const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return toast.error("Could not update notification");
    await load();
  }
  return <main><div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5"><div><h1 className="flex items-center gap-2 text-3xl font-black text-slate-950"><Bell/> Notifications</h1><p className="mt-1 text-sm font-semibold text-slate-500">Community activity, invitations, reminders, and game updates.</p></div>{unread > 0 && <button onClick={() => void update({ action: "read-all" })} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"><CheckCheck size={17}/> Mark {unread} read</button>}</div><section className="space-y-3">{items.map((item) => { const card = <div className={`flex gap-3 rounded-2xl border p-4 ${item.readAt ? "border-slate-200 bg-white" : "border-violet-200 bg-violet-50"}`}><Circle size={12} className={`mt-1 shrink-0 ${item.readAt ? "fill-slate-200 text-slate-200" : "fill-violet-600 text-violet-600"}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-black text-slate-800">{item.title}</h2><time className="text-xs font-bold text-slate-400">{when(item.scheduledFor)}</time></div>{item.body && <p className="mt-1 text-sm font-semibold text-slate-600">{item.body}</p>}<button onClick={() => void update({ id: item.id, read: !item.readAt })} className="mt-3 text-xs font-black text-violet-700">{item.readAt ? "Mark unread" : "Mark read"}</button></div></div>; return item.url ? <Link key={item.id} href={item.url} onClick={() => { if (!item.readAt) void update({ id: item.id, read: true }); }}>{card}</Link> : <div key={item.id}>{card}</div>; })}{items.length === 0 && <div className="rounded-3xl bg-white p-10 text-center shadow-sm"><Bell className="mx-auto text-slate-300" size={34}/><p className="mt-3 font-black text-slate-600">You’re all caught up.</p><p className="mt-1 text-sm font-semibold text-slate-400">Upcoming event reminders will appear here when they are due.</p></div>}</section></main>;
}
