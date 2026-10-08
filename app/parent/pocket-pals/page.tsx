"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, PawPrint, RefreshCw, Route, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { ParentPageHeader } from "@/components/parent-management-shell";

type Member = { id: string; name: string; avatar: string; role?: string };
type Caregiver = { memberId: string; role: string; member: Member };
type Activity = { id: string; type: string; createdAt: string; actorMember: Member | null };
type Pal = { id: string; serialNumber: string; appearance: { baseColor?: string; accentColor?: string; pattern?: string; texture?: string; eyeColor?: string } | null; state: { name: string; species: string; bond: number; xp: number; adoptedAt: number }; member: Member; caregivers: Caregiver[]; activities: Activity[] };

function activityLabel(type: string) {
  return ({ adopted: "Adopted", transferred: "Moved to a new guardian", caregiver_added: "Caregiver added", caregiver_removed: "Caregiver removed" } as Record<string, string>)[type] ?? `Care: ${type.replaceAll("-", " ")}`;
}

export default function PocketPalManagementPage() {
  const [pals, setPals] = useState<Pal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [transferTo, setTransferTo] = useState<Record<string, string>>({});
  const [caregiverTo, setCaregiverTo] = useState<Record<string, string>>({});
  const [keepCaregiver, setKeepCaregiver] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/parent/pocket-pals", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn’t load Pocket Pals.");
      setPals(data.pals); setMembers(data.members);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t load Pocket Pals."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function change(palId: string, action: string, memberId: string, extra: Record<string, unknown> = {}) {
    if (!memberId) return toast.error("Choose a family member first.");
    setBusy(`${action}-${palId}`);
    try {
      const response = await fetch("/api/parent/pocket-pals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ palId, action, memberId, ...extra }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn’t update this Pal.");
      toast.success(action === "transfer" ? "Pocket Pal transferred." : action === "add-caregiver" ? "Caregiver approved." : "Caregiver removed.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t update this Pal."); }
    finally { setBusy(""); }
  }

  return <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
    <ParentPageHeader title="Pocket Pal family" description="Move a Pal safely, invite trusted co-carers, and keep every little story intact." />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
      <span><Heart className="mr-2 inline h-4 w-4 fill-rose-400 text-rose-400" />Transfers preserve each Pal’s serial, appearance, inventory, progress, and history.</span>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-black shadow-sm"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
    </div>
    {loading ? <p className="py-16 text-center font-bold text-slate-500">Finding the family’s Pals…</p> : pals.length === 0 ? <section className="rounded-3xl border-2 border-dashed border-rose-200 bg-white p-12 text-center"><PawPrint className="mx-auto h-10 w-10 text-rose-400" /><h2 className="mt-3 text-xl font-black text-slate-800">No Pocket Pals yet</h2><p className="mt-2 text-sm font-semibold text-slate-500">A family member can adopt one from their Games screen.</p><Link href="/parent/games" className="mt-5 inline-flex rounded-xl bg-rose-500 px-4 py-2 font-black text-white">Open game settings</Link></section> : <div className="grid gap-5 lg:grid-cols-2">{pals.map((pal) => {
      const appearance = pal.appearance ?? {};
      const eligible = members.filter((member) => member.id !== pal.member.id);
      return <article key={pal.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><header className="flex items-start gap-3 bg-gradient-to-r from-rose-50 to-amber-50 p-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-3xl shadow-sm">{({ dog: "🐶", cat: "🐱", monkey: "🐒", "guinea-pig": "🐹" } as Record<string, string>)[pal.state.species] ?? "🐾"}</span><div className="min-w-0 flex-1"><h2 className="text-xl font-black text-slate-800">{pal.state.name}</h2><p className="text-xs font-bold uppercase tracking-wide text-rose-500">{pal.serialNumber}</p><p className="mt-1 text-xs font-semibold text-slate-500">{[appearance.baseColor, appearance.pattern, appearance.texture, appearance.eyeColor].filter(Boolean).join(" · ")}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">Lv {1 + Math.floor(pal.state.xp / 60)}</span></header>
        <div className="space-y-5 p-5"><section><p className="text-xs font-black uppercase tracking-wide text-slate-400">Primary guardian</p><p className="mt-1 font-bold text-slate-700">{pal.member.avatar} {pal.member.name}</p></section>
          <section><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Approved care team</p><Users className="h-4 w-4 text-slate-400" /></div><div className="mt-2 flex flex-wrap gap-2">{pal.caregivers.map((caregiver) => <span key={caregiver.memberId} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{caregiver.member.avatar} {caregiver.member.name} <em className="not-italic text-slate-400">{caregiver.role}</em>{caregiver.memberId !== pal.member.id && <button aria-label={`Remove ${caregiver.member.name}`} disabled={busy !== ""} onClick={() => void change(pal.id, "remove-caregiver", caregiver.memberId)} className="ml-1 text-rose-500">×</button>}</span>)}</div><div className="mt-3 flex gap-2"><select aria-label={`Add caregiver for ${pal.state.name}`} value={caregiverTo[pal.id] ?? ""} onChange={(event) => setCaregiverTo((previous) => ({ ...previous, [pal.id]: event.target.value }))} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold"><option value="">Add a family caregiver…</option>{members.filter((member) => !pal.caregivers.some((caregiver) => caregiver.memberId === member.id)).map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name}</option>)}</select><button disabled={busy !== "" || !caregiverTo[pal.id]} onClick={() => void change(pal.id, "add-caregiver", caregiverTo[pal.id])} className="rounded-xl bg-slate-800 px-3 text-sm font-black text-white"><UserPlus className="h-4 w-4" /></button></div></section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-sm font-black text-amber-900"><Route className="h-4 w-4" /> Move {pal.state.name}</div><div className="mt-2 flex gap-2"><select aria-label={`New guardian for ${pal.state.name}`} value={transferTo[pal.id] ?? ""} onChange={(event) => setTransferTo((previous) => ({ ...previous, [pal.id]: event.target.value }))} className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold"><option value="">Choose new guardian…</option>{eligible.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name}</option>)}</select><button disabled={busy !== "" || !transferTo[pal.id]} onClick={() => void change(pal.id, "transfer", transferTo[pal.id], { keepPreviousCaregiver: Boolean(keepCaregiver[pal.id]) })} className="rounded-xl bg-amber-500 px-3 text-sm font-black text-white">Move</button></div><label className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-900"><input type="checkbox" checked={Boolean(keepCaregiver[pal.id])} onChange={(event) => setKeepCaregiver((previous) => ({ ...previous, [pal.id]: event.target.checked }))} /> Keep {pal.member.name} as a co-carer</label></section>
          <section><p className="text-xs font-black uppercase tracking-wide text-slate-400">Recent story</p><ol className="mt-2 space-y-1.5">{pal.activities.slice(0, 4).map((activity) => <li key={activity.id} className="flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">{activityLabel(activity.type)}{activity.actorMember ? ` · ${activity.actorMember.name}` : ""}</span><time className="shrink-0 text-slate-400">{new Date(activity.createdAt).toLocaleDateString()}</time></li>)}</ol></section>
        </div></article>;
    })}</div>}
  </main>;
}
