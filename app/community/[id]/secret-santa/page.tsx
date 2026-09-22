"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, DollarSign, ExternalLink, Gift, Loader2, LockKeyhole, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AvailableParticipant = { id: string; name: string; avatar: string; color: string };
type Assignment = {
  id: string;
  communityParticipantId: string;
  name: string;
  avatar: string;
  color: string;
  giftIdeas: string | null;
  wishListUrl: string | null;
};
type ExchangeParticipant = Assignment & {
  isMine: boolean;
  assignment: Assignment | null;
};
type Exchange = {
  id: string;
  title: string;
  eventDate: string | null;
  signupDeadline: string | null;
  budgetCents: number | null;
  instructions: string | null;
  status: "signup" | "drawn" | "closed";
  preventSameHousehold: boolean;
  drawnAt: string | null;
  participants: ExchangeParticipant[];
};

const EMPTY_FORM = {
  title: "Gift Exchange",
  eventDate: "",
  signupDeadline: "",
  budget: "25",
  instructions: "",
  preventSameHousehold: true,
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function money(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function SecretSantaPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const [groupName, setGroupName] = useState("Community");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<AvailableParticipant[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [joinPeople, setJoinPeople] = useState<Record<string, string>>({});
  const [joinIdeas, setJoinIdeas] = useState<Record<string, string>>({});
  const [joinUrls, setJoinUrls] = useState<Record<string, string>>({});
  const [editingWishes, setEditingWishes] = useState<Record<string, { giftIdeas: string; wishListUrl: string }>>({});

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [exchangeRes, groupRes] = await Promise.all([
        fetch(`/api/community/secret-santa?groupId=${encodeURIComponent(groupId)}`),
        fetch(`/api/community/groups?id=${encodeURIComponent(groupId)}`),
      ]);
      const data = await exchangeRes.json().catch(() => null);
      if (!exchangeRes.ok) {
        toast.error(data?.error ?? "Could not load Gift Exchange");
        return;
      }
      setExchanges(data.exchanges ?? []);
      setAvailableParticipants(data.availableParticipants ?? []);
      setCanManage(Boolean(data.canManage));
      setIsOwner(Boolean(data.isOwner));
      if (groupRes.ok) {
        const group = await groupRes.json().catch(() => null);
        if (group?.name) setGroupName(group.name);
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const activeExchanges = useMemo(() => exchanges.filter((exchange) => exchange.status !== "closed"), [exchanges]);
  const closedExchanges = useMemo(() => exchanges.filter((exchange) => exchange.status === "closed"), [exchanges]);

  async function createExchange() {
    if (!form.title.trim()) return toast.error("Give the exchange a title");
    setSaving("create");
    try {
      const res = await fetch("/api/community/secret-santa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, groupId, eventDate: toIso(form.eventDate), signupDeadline: toIso(form.signupDeadline) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error ?? "Could not create exchange");
      setForm(EMPTY_FORM);
      setShowCreate(false);
      toast.success("Gift Exchange sign-ups are open");
      await load();
    } finally {
      setSaving(null);
    }
  }

  async function act(exchangeId: string, action: string, values: Record<string, unknown> = {}) {
    setSaving(`${action}:${exchangeId}`);
    try {
      const res = await fetch("/api/community/secret-santa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: exchangeId, action, ...values }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error ?? "Could not update the exchange");
      const success = action === "draw" ? "Names drawn — assignments are now private" : action === "join" || action === "join-self" ? "Added to the exchange" : "Exchange updated";
      toast.success(success);
      await load();
    } finally {
      setSaving(null);
    }
  }

  async function join(exchange: Exchange) {
    const communityParticipantId = joinPeople[exchange.id] ?? "";
    if (!communityParticipantId) return toast.error("Choose a participant");
    await act(exchange.id, "join", {
      communityParticipantId,
      giftIdeas: joinIdeas[exchange.id] ?? "",
      wishListUrl: joinUrls[exchange.id] ?? "",
    });
    setJoinPeople((current) => ({ ...current, [exchange.id]: "" }));
    setJoinIdeas((current) => ({ ...current, [exchange.id]: "" }));
    setJoinUrls((current) => ({ ...current, [exchange.id]: "" }));
  }

  async function joinSelf(exchange: Exchange) {
    await act(exchange.id, "join-self", {
      giftIdeas: joinIdeas[exchange.id] ?? "",
      wishListUrl: joinUrls[exchange.id] ?? "",
    });
    setJoinIdeas((current) => ({ ...current, [exchange.id]: "" }));
    setJoinUrls((current) => ({ ...current, [exchange.id]: "" }));
  }

  async function emailConcealedMatches(exchange: Exchange) {
    setSaving(`email-matches:${exchange.id}`);
    try {
      const res = await fetch("/api/community/secret-santa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: exchange.id, action: "email-matches" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error ?? "Could not email the concealed match list");
      toast.success(data?.sent ? "Concealed match list emailed" : "Email is not configured yet");
    } finally {
      setSaving(null);
    }
  }

  async function draw(exchange: Exchange) {
    if (!window.confirm(`Draw names for ${exchange.participants.length} participants? The roster cannot be changed afterward.`)) return;
    await act(exchange.id, "draw");
  }

  async function removeExchange(exchange: Exchange) {
    if (!window.confirm(`Delete “${exchange.title}” and all of its sign-ups?`)) return;
    setSaving(`delete:${exchange.id}`);
    try {
      const res = await fetch(`/api/community/secret-santa?id=${encodeURIComponent(exchange.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error ?? "Could not delete exchange");
      toast.success("Exchange deleted");
      await load();
    } finally {
      setSaving(null);
    }
  }

  function eligiblePeople(exchange: Exchange) {
    const enrolled = new Set(exchange.participants.map((participant) => participant.communityParticipantId));
    return availableParticipants.filter((participant) => !enrolled.has(participant.id));
  }

  function wishDraft(participant: ExchangeParticipant) {
    return editingWishes[participant.id] ?? {
      giftIdeas: participant.giftIdeas ?? "",
      wishListUrl: participant.wishListUrl ?? "",
    };
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-violet-50 via-white to-amber-50 p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-amber-500 p-5 text-white shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <Link href={`/community/${groupId}`} className="rounded-2xl bg-white/15 p-2 backdrop-blur hover:bg-white/25" aria-label="Back to community">
              <ArrowLeft size={21} />
            </Link>
            <Sparkles className="opacity-70" size={30} />
          </div>
          <div className="mt-8 max-w-2xl">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-rose-100">{groupName}</p>
            <h1 className="flex items-center gap-3 text-3xl font-black sm:text-5xl"><Gift size={42} /> Gift Exchange</h1>
            <p className="mt-3 max-w-xl font-semibold text-white/85">Open sign-ups, draw fair matches, and keep every recipient a surprise until exchange day.</p>
          </div>
          {canManage && (
            <button type="button" onClick={() => setShowCreate((value) => !value)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-rose-600 shadow-sm hover:bg-rose-50">
              <Plus size={18} /> New exchange
            </button>
          )}
        </header>

        {showCreate && (
          <section className="mb-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-800">Create a gift exchange</h2>
              <p className="text-sm font-semibold text-slate-500">Members can enroll their family participants until you draw names.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="ss-title">Exchange title</Label><Input id="ss-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
              <div><Label htmlFor="ss-date">Exchange date</Label><Input id="ss-date" type="datetime-local" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></div>
              <div><Label htmlFor="ss-deadline">Sign-up deadline</Label><Input id="ss-deadline" type="datetime-local" value={form.signupDeadline} onChange={(event) => setForm({ ...form, signupDeadline: event.target.value })} /></div>
              <div><Label htmlFor="ss-budget">Budget (USD)</Label><Input id="ss-budget" type="number" min="0" step="1" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></div>
              <label className="flex items-center gap-3 self-end rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-800">
                <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={form.preventSameHousehold} onChange={(event) => setForm({ ...form, preventSameHousehold: event.target.checked })} />
                Match outside the same household
              </label>
              <div className="sm:col-span-2"><Label htmlFor="ss-instructions">Notes or rules</Label><Textarea id="ss-instructions" rows={3} placeholder="Theme, gift rules, where to meet…" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" disabled={saving === "create"} onClick={createExchange} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 font-black text-white hover:bg-rose-600 disabled:opacity-50">
                {saving === "create" ? <Loader2 size={18} className="animate-spin" /> : <Gift size={18} />} Open sign-ups
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-600">Cancel</button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-500" size={34} /></div>
        ) : activeExchanges.length === 0 ? (
          <section className="rounded-3xl border-2 border-dashed border-rose-200 bg-white/80 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-3xl">🎁</div>
            <h2 className="text-xl font-black text-slate-800">No active gift exchange yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">{canManage ? "Create an exchange for any occasion." : "A community manager can open the next exchange."}</p>
          </section>
        ) : (
          <div className="space-y-6">
            {activeExchanges.map((exchange) => {
              const eligible = eligiblePeople(exchange);
              const mine = exchange.participants.filter((participant) => participant.isMine);
              return (
                <section key={exchange.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-emerald-50 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${exchange.status === "drawn" ? "bg-emerald-600 text-white" : "bg-rose-500 text-white"}`}>{exchange.status === "drawn" ? "Names drawn" : "Sign-ups open"}</span>
                          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500"><Users size={13} /> {exchange.participants.length}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">{exchange.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-slate-500">
                          {exchange.eventDate && <span className="flex items-center gap-1"><CalendarDays size={15} /> Exchange date: {formatDate(exchange.eventDate)}</span>}
                          {exchange.budgetCents !== null && <span className="flex items-center gap-1"><DollarSign size={15} /> {money(exchange.budgetCents)} budget</span>}
                          {exchange.preventSameHousehold && <span className="flex items-center gap-1"><LockKeyhole size={15} /> Different households</span>}
                        </div>
                        {exchange.instructions && <p className="mt-3 whitespace-pre-wrap text-sm font-semibold text-slate-600">{exchange.instructions}</p>}
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-2">
                          {exchange.status === "signup" && <button type="button" onClick={() => draw(exchange)} disabled={Boolean(saving) || exchange.participants.length < 3} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} /> Draw names</button>}
                          {exchange.status === "drawn" && <button type="button" onClick={() => act(exchange.id, "close")} disabled={Boolean(saving)} className="rounded-2xl bg-slate-700 px-4 py-2.5 text-sm font-black text-white">Close</button>}
                          {isOwner && exchange.status === "drawn" && <button type="button" onClick={() => emailConcealedMatches(exchange)} disabled={Boolean(saving)} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"><LockKeyhole size={16} /> Email matches</button>}
                          <button type="button" onClick={() => removeExchange(exchange)} disabled={Boolean(saving)} className="rounded-2xl bg-white p-2.5 text-slate-400 hover:text-rose-600" aria-label="Delete exchange"><Trash2 size={18} /></button>
                        </div>
                      )}
                    </div>
                    {exchange.status === "signup" && exchange.signupDeadline && <p className="mt-3 text-xs font-black text-rose-600">Sign up by {formatDate(exchange.signupDeadline)}</p>}
                  </div>

                  <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
                    <div>
                      <h3 className="mb-3 font-black text-slate-800">{exchange.status === "drawn" ? "Your private assignment" : "Your sign-ups"}</h3>
                      {mine.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No one from your household is signed up yet.</p> : (
                        <div className="space-y-3">
                          {mine.map((participant) => {
                            const draft = wishDraft(participant);
                            return (
                              <div key={participant.id} className="rounded-2xl border border-slate-100 p-4">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${participant.color}22` }}>{participant.avatar}</span>
                                  <div className="min-w-0 flex-1"><p className="font-black text-slate-800">{participant.name}</p><p className="text-xs font-bold text-slate-400">{exchange.status === "drawn" ? "Giving to…" : "Signed up"}</p></div>
                                  {exchange.status === "signup" && <button type="button" onClick={() => act(exchange.id, "leave", { participantId: participant.id })} className="p-2 text-slate-300 hover:text-rose-500" aria-label={`Remove ${participant.name}`}><Trash2 size={17} /></button>}
                                </div>
                                {exchange.status === "drawn" && participant.assignment && (
                                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Keep it secret</p>
                                    <p className="mt-1 text-xl font-black text-emerald-900">{participant.assignment.avatar} {participant.assignment.name}</p>
                                    {participant.assignment.giftIdeas && <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-emerald-800"><strong>Gift ideas:</strong> {participant.assignment.giftIdeas}</p>}
                                    {participant.assignment.wishListUrl && <a href={participant.assignment.wishListUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-black text-emerald-700 hover:underline">Open wish list <ExternalLink size={14} /></a>}
                                  </div>
                                )}
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-xs font-black text-slate-500">Edit {participant.name}&apos;s gift ideas</summary>
                                  <div className="mt-3 grid gap-2">
                                    <Textarea rows={2} placeholder="Favorite things, sizes, interests…" value={draft.giftIdeas} onChange={(event) => setEditingWishes((current) => ({ ...current, [participant.id]: { ...draft, giftIdeas: event.target.value } }))} />
                                    <Input type="url" placeholder="Optional wish list link" value={draft.wishListUrl} onChange={(event) => setEditingWishes((current) => ({ ...current, [participant.id]: { ...draft, wishListUrl: event.target.value } }))} />
                                    <button type="button" onClick={() => act(exchange.id, "update-wishes", { participantId: participant.id, ...draft })} className="justify-self-start rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-white">Save ideas</button>
                                  </div>
                                </details>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {exchange.status === "signup" && (
                        <div className="mt-4 rounded-2xl bg-rose-50 p-4">
                          <h4 className="mb-3 text-sm font-black text-rose-900">Add yourself or someone from your household</h4>
                          <div className="grid gap-2">
                            <Select value={joinPeople[exchange.id] || "none"} onValueChange={(value) => setJoinPeople((current) => ({ ...current, [exchange.id]: !value || value === "none" ? "" : value }))}>
                              <SelectTrigger><SelectValue placeholder="Choose participant" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">Choose participant</SelectItem>{eligible.map((person) => <SelectItem key={person.id} value={person.id}>{person.avatar} {person.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Textarea rows={2} placeholder="Gift ideas, sizes, favorite colors…" value={joinIdeas[exchange.id] ?? ""} onChange={(event) => setJoinIdeas((current) => ({ ...current, [exchange.id]: event.target.value }))} />
                            <Input type="url" placeholder="Optional wish list URL" value={joinUrls[exchange.id] ?? ""} onChange={(event) => setJoinUrls((current) => ({ ...current, [exchange.id]: event.target.value }))} />
                            <button type="button" onClick={() => join(exchange)} disabled={Boolean(saving)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-600 disabled:opacity-50"><Plus size={16} /> Join exchange</button>
                            <button type="button" onClick={() => joinSelf(exchange)} disabled={Boolean(saving)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"><Plus size={16} /> Add me</button>
                          </div>
                        </div>
                      )}
                      {exchange.status === "signup" && availableParticipants.length === 0 && (
                        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Use <strong>Add me</strong> to join yourself, or add family members under <Link href={`/community/${groupId}#participants`} className="font-black underline">Group Participants</Link>.</p>
                      )}
                    </div>

                    <aside>
                      <h3 className="mb-3 flex items-center gap-2 font-black text-slate-800"><Users size={17} /> Participant list</h3>
                      <div className="space-y-2">
                        {exchange.participants.map((participant) => <div key={participant.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"><span>{participant.avatar}</span><span className="min-w-0 flex-1 truncate text-sm font-black text-slate-700">{participant.name}</span>{participant.isMine && <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600"><Check size={12} /> Yours</span>}</div>)}
                        {exchange.participants.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-400">Waiting for the first sign-up.</p>}
                      </div>
                      {exchange.status === "signup" && exchange.participants.length < 3 && <p className="mt-3 text-xs font-bold text-slate-400">At least 3 people are needed before names can be drawn.</p>}
                      {exchange.status === "drawn" && <p className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><LockKeyhole size={15} className="mt-0.5 shrink-0" /> Each assignment is visible only to that participant&apos;s household.</p>}
                    </aside>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {closedExchanges.length > 0 && (
          <details className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-black text-slate-600">Past exchanges ({closedExchanges.length})</summary>
            <div className="mt-4 space-y-2">{closedExchanges.map((exchange) => <div key={exchange.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span className="font-black text-slate-700">{exchange.title}</span><span className="text-xs font-bold text-slate-400">{exchange.participants.length} participants</span></div>)}</div>
          </details>
        )}
      </div>
    </main>
  );
}
