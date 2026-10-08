"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Camera, Check, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ParentPageHeader } from "@/components/parent-management-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CHORE_CATEGORIES } from "@/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FREQUENCY_LABELS: Record<string, string> = {
  daily: "📋 Daily",
  weekly: "📅 Weekly",
  monthly: "🗓️ Monthly",
  "one-time": "⭐ Special / One-time",
};

interface Member { id: string; name: string; avatar: string; color: string; age: number; role: string }
interface Chore { id: string; name: string; icon: string; ageMin: number; ageMax: number; pointsValue: number; requiresPhoto: boolean; category: string; description?: string | null }
interface Assignment {
  id: string;
  choreId: string;
  memberId: string;
  frequency: string;
  dueDate: string | null;
  dayOfWeek: number | null;
  monthlyCompletionTarget: number;
  chore: Chore;
  member: Member;
  completions?: { id: string }[];
}
interface TeenProposal { id: string; title: string; description?: string | null; icon: string; frequency: string; member: Member; createdAt: string }

const AGE_GROUPS = [
  { id: "little", label: "Little helpers", detail: "Ages 3–5", min: 3, max: 5 },
  { id: "kids", label: "Kids", detail: "Ages 6–8", min: 6, max: 8 },
  { id: "tweens", label: "Tweens", detail: "Ages 9–12", min: 9, max: 12 },
  { id: "teens", label: "Teens", detail: "Ages 13–18", min: 13, max: 18 },
];

function ageGroupFor(member: Member) {
  if (["mom", "dad", "parent", "grandparent"].includes(member.role)) return { id: "adults", label: "Adults" };
  return AGE_GROUPS.find((group) => member.age >= group.min && member.age <= group.max) ?? { id: "other", label: "Other ages" };
}

function categoryLabel(category: string) {
  const match = CHORE_CATEGORIES.find((item) => item.value === category);
  return match ? `${match.icon} ${match.label}` : category.replace(/-/g, " ");
}

function isDueToday(assignment: Assignment) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (assignment.frequency === "daily") return true;
  if (assignment.frequency === "weekly") return assignment.dayOfWeek === today.getDay();
  if (!assignment.dueDate) return false;
  const due = new Date(assignment.dueDate);
  if (assignment.frequency === "monthly") return today.getDate() <= due.getDate();
  return assignment.frequency === "one-time" && due >= today;
}

export default function AssignPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [completionAssignment, setCompletionAssignment] = useState<Assignment | null>(null);
  const [completionProofPhoto, setCompletionProofPhoto] = useState<File | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [teenProposals, setTeenProposals] = useState<TeenProposal[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [choreSearch, setChoreSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({
    memberId: "", targetMode: "member" as "member" | "age-group", ageGroupId: "", choreIds: [] as string[], frequency: "daily", dueDate: "", dayOfWeeks: ["1"], monthlyCompletionTarget: 1, allowDuplicateDaily: false,
  });

  const load = useCallback(async () => {
    const [mRes, cRes, aRes, proposalRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/chores"),
      fetch("/api/assignments?scope=all"),
      fetch("/api/teen-tasks"),
    ]);
    const [membersData, choresData, assignmentsData, proposalsData] = await Promise.all([
      mRes.json().catch(() => []),
      cRes.json().catch(() => []),
      aRes.json().catch(() => []),
      proposalRes.json().catch(() => []),
    ]);
    const nextMembers = Array.isArray(membersData) ? membersData : Array.isArray(membersData?.members) ? membersData.members : [];
    if (!Array.isArray(membersData) && !Array.isArray(membersData?.members)) toast.error(membersData.error ?? "Could not load members");
    setMembers(nextMembers);
    setChores(Array.isArray(choresData) ? choresData : []);
    setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    setTeenProposals(Array.isArray(proposalsData) ? proposalsData.filter((proposal) => proposal.status === "pending") : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function reviewTeenTask(proposal: TeenProposal, action: "approve" | "decline") {
    setReviewingId(proposal.id);
    try {
      const response = await fetch("/api/teen-tasks", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposal.id, action, frequency: proposal.frequency, pointsValue: 20 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return toast.error(data.error ?? "Could not review task request");
      toast.success(action === "approve" ? `${proposal.title} added to ${proposal.member.name}'s list` : "Task request declined");
      await load();
    } finally { setReviewingId(null); }
  }

  async function assign() {
    if (targetMemberIds.length === 0 || form.choreIds.length === 0) { toast.error("Select a member or age group and at least one chore"); return; }
    if (form.frequency === "weekly" && form.dayOfWeeks.length === 0) {
      toast.error("Choose at least one weekday");
      return;
    }
    setIsAssigning(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: targetMemberIds,
          choreIds: form.choreIds,
          frequency: form.frequency,
          dueDate: form.dueDate || null,
          dayOfWeeks: form.frequency === "weekly" ? form.dayOfWeeks.map(Number) : [],
          monthlyCompletionTarget: form.monthlyCompletionTarget,
          allowDuplicateDaily: form.allowDuplicateDaily,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not assign chores");
        return;
      }
      const created = Array.isArray(data?.assignments) ? data.assignments.length : 0;
      toast.success(`${created || form.choreIds.length} ${created === 1 ? "assignment" : "assignments"} created${data?.skippedCount ? ` · ${data.skippedCount} age-mismatched choice${data.skippedCount === 1 ? "" : "s"} skipped` : ""}`);
      setOpen(false);
      load();
    } finally {
      setIsAssigning(false);
    }
  }

  async function unassign(id: string) {
    await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
    toast.success("Assignment removed");
    load();
  }

  async function complete(assignment: Assignment, proofPhoto?: File | null) {
    if (assignment.chore.requiresPhoto && !proofPhoto) {
      toast.error("Add a proof photo before completing this chore");
      return;
    }

    setCompletingId(assignment.id);
    const res = await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id, withPhoto: assignment.chore.requiresPhoto && !!proofPhoto }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCompletingId(null);
      return toast.error(data?.error ?? "Could not complete chore");
    }
    if (assignment.chore.requiresPhoto && proofPhoto && data.completion?.id) {
      const uploaded = await uploadPhoto(proofPhoto, data.completion.id);
      if (!uploaded) {
        setCompletingId(null);
        return;
      }
    }
    toast.success(`${assignment.member.name} earned ${data.pointsEarned} points`);
    setCompletionAssignment(null);
    setCompletionProofPhoto(null);
    setCompletingId(null);
    load();
  }

  async function uploadPhoto(file: File, completionId: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("type", "after");
    const res = await fetch(`/api/completions/${completionId}/photo`, { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not save photo");
      return false;
    }
    toast.success("Proof photo saved");
    return true;
  }

  const filteredAssignments = selectedMember
    ? assignments.filter((a) => a.memberId === selectedMember)
    : assignments;

  const selectedMemberObj = members.find((m) => m.id === form.memberId);
  const selectedAgeGroup = AGE_GROUPS.find((group) => group.id === form.ageGroupId);
  const targetMembers = form.targetMode === "age-group"
    ? members.filter((member) => !["mom", "dad", "parent", "grandparent"].includes(member.role) && selectedAgeGroup && member.age >= selectedAgeGroup.min && member.age <= selectedAgeGroup.max)
    : selectedMemberObj ? [selectedMemberObj] : [];
  const targetMemberIds = targetMembers.map((member) => member.id);
  const availableChores = targetMembers.length > 0
    ? chores.filter((chore) => targetMembers.some((member) => {
        const adult = ["parent", "mom", "dad", "grandparent"].includes(member.role);
        return adult || (chore.ageMin <= member.age && chore.ageMax >= member.age);
      }))
    : chores;
  const visibleChores = availableChores.filter((chore) => {
    const query = choreSearch.trim().toLowerCase();
    return (!query || `${chore.name} ${chore.description ?? ""} ${chore.category}`.toLowerCase().includes(query)) && (categoryFilter === "all" || chore.category === categoryFilter);
  });
  const assignmentGroups = useMemo(() => {
    const grouped = new Map<string, Map<string, Assignment[]>>();
    for (const assignment of filteredAssignments) {
      const ageGroup = ageGroupFor(assignment.member).label;
      const category = assignment.chore.category ?? "other";
      if (!grouped.has(ageGroup)) grouped.set(ageGroup, new Map());
      const categories = grouped.get(ageGroup)!;
      categories.set(category, [...(categories.get(category) ?? []), assignment]);
    }
    return [...grouped.entries()].map(([ageGroup, categories]) => ({ ageGroup, categories: [...categories.entries()] }));
  }, [filteredAssignments]);

  function resetForm() {
    setForm({ memberId: "", targetMode: "member", ageGroupId: "", choreIds: [], frequency: "daily", dueDate: "", dayOfWeeks: ["1"], monthlyCompletionTarget: 1, allowDuplicateDaily: false });
    setChoreSearch("");
    setCategoryFilter("all");
  }

  function toggleChore(choreId: string) {
    setForm((previous) => ({
      ...previous,
      choreIds: previous.choreIds.includes(choreId)
        ? previous.choreIds.filter((id) => id !== choreId)
        : [...previous.choreIds, choreId],
    }));
  }

  function toggleWeeklyDay(day: string) {
    setForm((previous) => {
      const selected = previous.dayOfWeeks.includes(day)
        ? previous.dayOfWeeks.filter((value) => value !== day)
        : [...previous.dayOfWeeks, day].sort((a, b) => Number(a) - Number(b));
      return { ...previous, dayOfWeeks: selected };
    });
  }

  return (
    <>
      <ParentPageHeader
        title="Assignments"
        description="Plan recurring and one-time chore work across the household."
        actions={
          <>
            <button
              type="button"
              onClick={load}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={18} /> Refresh
            </button>
            <button
              onClick={() => { resetForm(); setOpen(true); }}
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700"
            >
              <Plus size={18} /> Assign Chore
            </button>
          </>
        }
      />

      {/* Member filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMember("")}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${!selectedMember ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Everyone
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMember(String(m.id))}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${selectedMember === String(m.id) ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {m.avatar} {m.name}
          </button>
        ))}
      </div>

      {teenProposals.length > 0 && <section className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4"><div className="mb-3"><h2 className="font-black text-amber-900">Teen task approvals</h2><p className="text-sm font-semibold text-amber-800">Approve to create the task and add it to the teen’s chore list.</p></div><div className="space-y-2">{teenProposals.map((proposal) => <div key={proposal.id} className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center"><span className="text-2xl">{proposal.icon}</span><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{proposal.title} <span className="font-semibold text-slate-500">for {proposal.member.name}</span></p><p className="text-xs font-semibold text-slate-500">{proposal.frequency}{proposal.description ? ` · ${proposal.description}` : ""}</p></div><div className="flex gap-2"><button disabled={reviewingId === proposal.id} onClick={() => void reviewTeenTask(proposal, "approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Approve</button><button disabled={reviewingId === proposal.id} onClick={() => void reviewTeenTask(proposal, "decline")} className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-40">Decline</button></div></div>)}</div></section>}

      {filteredAssignments.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-bold text-slate-500">No chores assigned yet</p>
        </div>
      )}

      <div className="space-y-6">
        {assignmentGroups.map((ageGroup) => <section key={ageGroup.ageGroup}>
          <div className="mb-2 flex items-center gap-2"><h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{ageGroup.ageGroup}</h2><span className="h-px flex-1 bg-slate-200" /></div>
          <div className="space-y-4">{ageGroup.categories.map(([category, categoryAssignments]) => <div key={category}>
            <h3 className="mb-2 text-xs font-black text-slate-400">{categoryLabel(category)}</h3>
            <div className="space-y-2">{categoryAssignments.map((a) => (
          <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
            <div className="text-3xl">{a.chore.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-800">{a.chore.name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 mt-1">
                <span>{a.member.avatar} {a.member.name}</span>
                <span className="capitalize">{a.frequency}</span>
                {a.frequency === "weekly" && a.dayOfWeek !== null && (
                  <span>{DAYS[a.dayOfWeek]}</span>
                )}
                {a.frequency === "monthly" && a.dueDate && (
                  <span>By day {new Date(a.dueDate).getDate()} · {a.completions?.length ?? 0}/{a.monthlyCompletionTarget} this month</span>
                )}
                {a.frequency === "one-time" && a.dueDate && (
                  <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                )}
                <span>⭐ {a.chore.pointsValue} pts</span>
                {a.chore.requiresPhoto && <span className="inline-flex items-center gap-1 text-blue-600"><Camera size={12} /> Photo</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isDueToday(a) && (
                <button
                  type="button"
                  disabled={(a.completions?.length ?? 0) >= (a.frequency === "monthly" ? a.monthlyCompletionTarget : 1) || completingId === a.id}
                  onClick={() => {
                    if (a.chore.requiresPhoto) {
                      setCompletionAssignment(a);
                      setCompletionProofPhoto(null);
                    } else {
                      complete(a);
                    }
                  }}
                  className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {(a.completions?.length ?? 0) >= (a.frequency === "monthly" ? a.monthlyCompletionTarget : 1) ? "Completed" : completingId === a.id ? "Saving" : a.frequency === "monthly" ? "Complete" : "Complete Today"}
                </button>
              )}
              <button onClick={() => unassign(a.id)} className="p-1 text-red-400 transition-colors hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}</div></div>)}</div>
        </section>)}
      </div>

      <Dialog
        open={!!completionAssignment}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCompletionAssignment(null);
            setCompletionProofPhoto(null);
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Complete {completionAssignment?.chore.name}</DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-blue-700">
              <Camera size={16} /> Proof attachment required
            </div>
            <label className="block cursor-pointer rounded-xl bg-white px-3 py-2 text-center text-sm font-black text-blue-700 shadow-sm">
              {completionProofPhoto ? completionProofPhoto.name : "Choose an image or file"}
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(event) => setCompletionProofPhoto(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => completionAssignment && complete(completionAssignment, completionProofPhoto)}
            disabled={!completionAssignment || !completionProofPhoto || completingId === completionAssignment.id}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-black text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            <Check size={18} /> {completingId ? "Saving…" : "Complete chore"}
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Assign Chores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold">Assignment group</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => setForm((p) => ({ ...p, targetMode: "member", ageGroupId: "", choreIds: [] }))} className={`rounded-lg px-3 py-2 text-sm font-black ${form.targetMode === "member" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>One person</button>
                <button type="button" onClick={() => setForm((p) => ({ ...p, targetMode: "age-group", memberId: "", choreIds: [] }))} className={`rounded-lg px-3 py-2 text-sm font-black ${form.targetMode === "age-group" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Age group</button>
              </div>
            </div>
            {form.targetMode === "member" ? <div>
              <Label className="font-bold">Family Member</Label>
              <Select value={form.memberId} onValueChange={(v) => setForm((p) => ({ ...p, memberId: v ?? "", choreIds: [] }))}>
                <SelectTrigger className="mt-1 w-full rounded-xl">
                  <span className={`flex flex-1 items-center gap-1.5 truncate text-left ${selectedMemberObj ? "" : "text-slate-400"}`}>
                    {selectedMemberObj ? `${selectedMemberObj.avatar} ${selectedMemberObj.name}` : "Select a family member"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.avatar} {m.name}
                      {m.role === "child" ? ` (age ${m.age})` : ` — ${m.role}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> : <div>
              <Label className="font-bold">Age group</Label>
              <Select value={form.ageGroupId} onValueChange={(v) => setForm((p) => ({ ...p, ageGroupId: v ?? "", choreIds: [] }))}>
                <SelectTrigger className="mt-1 w-full rounded-xl"><span className={`flex flex-1 text-left ${selectedAgeGroup ? "" : "text-slate-400"}`}>{selectedAgeGroup ? `${selectedAgeGroup.label} · ${selectedAgeGroup.detail}` : "Select an age group"}</span></SelectTrigger>
                <SelectContent>{AGE_GROUPS.map((group) => <SelectItem key={group.id} value={group.id}>{group.label} · {group.detail}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-1 text-xs font-semibold text-slate-500">{targetMembers.length ? `${targetMembers.length} child${targetMembers.length === 1 ? "" : "ren"} selected: ${targetMembers.map((member) => member.name).join(", ")}` : "Choose an age group to add every child in it."}</p>
            </div>}
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label className="font-bold">Chores</Label>
                {visibleChores.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm((previous) => ({
                      ...previous,
                      choreIds: previous.choreIds.length === visibleChores.length
                        ? []
                        : visibleChores.map((chore) => chore.id),
                    }))}
                    className="text-xs font-black text-emerald-600 hover:text-emerald-700"
                  >
                    {form.choreIds.length === visibleChores.length ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px]"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><Input value={choreSearch} onChange={(event) => setChoreSearch(event.target.value)} placeholder="Search chores…" className="rounded-xl pl-9" /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><option value="all">All categories</option>{CHORE_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.icon} {category.label}</option>)}</select></div>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                {visibleChores.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm font-semibold text-slate-400">
                    {targetMembers.length ? "No matching chores found" : "Select a person or age group first"}
                  </p>
                ) : visibleChores.map((chore) => {
                  const selected = form.choreIds.includes(chore.id);
                  return (
                    <button
                      key={chore.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => toggleChore(chore.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-transparent bg-white hover:border-slate-200"
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                        selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                      }`}>
                        {selected && <Check size={14} strokeWidth={4} />}
                      </span>
                      <span className="text-2xl" aria-hidden="true">{chore.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black text-slate-700">{chore.name}</span>
                        <span className="block text-xs font-semibold text-slate-400">{categoryLabel(chore.category)} · ⭐ {chore.pointsValue} points · ages {chore.ageMin}–{chore.ageMax}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs font-bold text-slate-500">
                {form.choreIds.length === 0 ? "Choose one or more chores" : `${form.choreIds.length} selected`}
              </p>
            </div>
            <div>
              <Label className="font-bold">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((p) => ({ ...p, frequency: v ?? "daily" }))}>
                <SelectTrigger className="mt-1 w-full rounded-xl">
                  <span className="flex flex-1 items-center gap-1.5 truncate text-left">
                    {FREQUENCY_LABELS[form.frequency] ?? form.frequency}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📋 Daily</SelectItem>
                  <SelectItem value="weekly">📅 Weekly</SelectItem>
                  <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                  <SelectItem value="one-time">⭐ Special / One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.frequency === "daily" && <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900"><input type="checkbox" checked={form.allowDuplicateDaily} onChange={(event) => setForm((p) => ({ ...p, allowDuplicateDaily: event.target.checked }))} className="mt-0.5 accent-amber-600" /><span><strong className="block">Add another daily copy</strong>Normally, an existing daily chore is protected from duplicates. Only enable this if the same chore genuinely needs to appear twice each day.</span></label>}
            {form.frequency === "weekly" && (
              <div>
                <Label className="font-bold">Days of Week</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {DAYS.map((day, index) => {
                    const value = String(index);
                    const selected = form.dayOfWeeks.includes(value);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeeklyDay(value)}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition-colors ${
                          selected
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {form.frequency === "monthly" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                <Label className="font-bold">Monthly Date</Label>
                <Input type="date" value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="font-bold">Times per month</Label>
                  <Input type="number" min={1} max={31} value={form.monthlyCompletionTarget}
                    onChange={(e) => setForm((p) => ({ ...p, monthlyCompletionTarget: Math.max(1, Number(e.target.value) || 1) }))}
                    className="rounded-xl mt-1" />
                </div>
                <p className="sm:col-span-2 text-xs font-semibold text-slate-400">Available from the 1st through the selected day each month.</p>
              </div>
            )}
            {form.frequency === "one-time" && (
              <div>
                <Label className="font-bold">Due Date</Label>
                <Input type="date" value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="rounded-xl mt-1" />
              </div>
            )}
            <button
              onClick={assign}
              disabled={isAssigning}
              className="w-full bg-emerald-500 text-white rounded-xl py-3 font-black hover:bg-emerald-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAssigning
                ? "Assigning…"
                : form.choreIds.length > 0
                  ? `Assign ${form.choreIds.length} ${form.choreIds.length === 1 ? "Chore" : "Chores"}`
                  : "Assign Chores"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
