"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Member = { id: string; name: string; avatar: string; color: string };
type CheckIn = { id: string; mood: string; note: string | null; supportRequested: boolean; createdAt: string; member: Member };

const MOODS = [
  { value: "great", label: "Great", icon: "😄" },
  { value: "good", label: "Good", icon: "🙂" },
  { value: "okay", label: "Okay", icon: "😐" },
  { value: "low", label: "Low", icon: "😔" },
  { value: "overwhelmed", label: "Overwhelmed", icon: "😣" },
];

export default function WellbeingPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [form, setForm] = useState({ memberId: "", mood: "okay", note: "", supportRequested: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [membersRes, checkInsRes] = await Promise.all([fetch("/api/members"), fetch("/api/wellbeing/check-ins")]);
    const membersData = await membersRes.json().catch(() => []);
    const nextMembers = Array.isArray(membersData) ? membersData : Array.isArray(membersData?.members) ? membersData.members : [];
    setMembers(nextMembers);
    setForm((current) => ({ ...current, memberId: current.memberId || nextMembers[0]?.id || "" }));
    if (checkInsRes.ok) setCheckIns(await checkInsRes.json());
    else toast.error((await checkInsRes.json().catch(() => null))?.error ?? "Could not load private check-ins");
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.memberId) return toast.error("Choose a family member");
    setSaving(true);
    const res = await fetch("/api/wellbeing/check-ins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) return toast.error(data?.error ?? "Could not save check-in");
    setCheckIns((current) => [data, ...current]);
    setForm((current) => ({ ...current, note: "", supportRequested: false }));
  }

  async function remove(id: string) {
    const res = await fetch(`/api/wellbeing/check-ins?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete check-in");
    setCheckIns((current) => current.filter((item) => item.id !== id));
  }

  return <main className="mx-auto min-h-screen max-w-4xl p-4 sm:p-6">
    <Link href="/parent" className="mb-5 inline-flex items-center gap-2 font-black text-slate-500"><ArrowLeft size={18} /> Parent Panel</Link>
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800"><HeartHandshake className="text-pink-500" /> Emotional Wellbeing</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">Private household check-ins. They never affect points, badges, reports, or leaderboards.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="font-bold text-slate-600">Family member
          <select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3">
            {members.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name}</option>)}
          </select>
        </label>
        <label className="font-bold text-slate-600">How are they feeling?
          <select value={form.mood} onChange={(event) => setForm({ ...form, mood: event.target.value })} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3">
            {MOODS.map((mood) => <option key={mood.value} value={mood.value}>{mood.icon} {mood.label}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-3 block font-bold text-slate-600">Private note
        <textarea value={form.note} maxLength={1000} onChange={(event) => setForm({ ...form, note: event.target.value })} className="mt-1 min-h-24 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3" placeholder="What would help right now?" />
      </label>
      <label className="mt-3 flex items-center gap-2 font-bold text-slate-600"><input type="checkbox" checked={form.supportRequested} onChange={(event) => setForm({ ...form, supportRequested: event.target.checked })} /> Follow-up support requested</label>
      <button type="button" onClick={save} disabled={saving || !form.memberId} className="mt-4 rounded-2xl bg-pink-500 px-5 py-2.5 font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save private check-in"}</button>
    </section>
    <section className="mt-5 space-y-3">
      {checkIns.map((checkIn) => {
        const mood = MOODS.find((item) => item.value === checkIn.mood);
        return <article key={checkIn.id} className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-800">{checkIn.member.avatar} {checkIn.member.name} · {mood?.icon} {mood?.label ?? checkIn.mood}</p><p className="text-xs font-bold text-slate-400">{new Date(checkIn.createdAt).toLocaleString()}</p></div><button type="button" onClick={() => remove(checkIn.id)} aria-label="Delete check-in" className="text-slate-300 hover:text-red-500"><Trash2 size={17} /></button></div>
          {checkIn.note && <p className="mt-3 whitespace-pre-wrap text-sm font-semibold text-slate-600">{checkIn.note}</p>}
          {checkIn.supportRequested && <p className="mt-3 rounded-xl bg-pink-50 px-3 py-2 text-sm font-black text-pink-700">Follow-up support requested</p>}
        </article>;
      })}
    </section>
  </main>;
}
