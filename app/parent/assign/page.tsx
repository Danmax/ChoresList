"use client";

import { useEffect, useState, useCallback } from "react";
import { Camera, Check, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ParentPageHeader } from "@/components/parent-management-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FREQUENCY_LABELS: Record<string, string> = {
  daily: "📋 Daily",
  weekly: "📅 Weekly",
  monthly: "🗓️ Monthly",
  "one-time": "⭐ Special / One-time",
};

interface Member { id: string; name: string; avatar: string; color: string; age: number; role: string }
interface Chore { id: string; name: string; icon: string; ageMin: number; ageMax: number; pointsValue: number; requiresPhoto: boolean }
interface Assignment {
  id: string;
  choreId: string;
  memberId: string;
  frequency: string;
  dueDate: string | null;
  dayOfWeek: number | null;
  chore: Chore;
  member: Member;
  completions?: { id: string }[];
}

function isDueToday(assignment: Assignment) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (assignment.frequency === "daily") return true;
  if (assignment.frequency === "weekly") return assignment.dayOfWeek === today.getDay();
  if (!assignment.dueDate) return false;
  const due = new Date(assignment.dueDate);
  if (assignment.frequency === "monthly") return due.getDate() === today.getDate();
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
  const [form, setForm] = useState({
    memberId: "", choreIds: [] as string[], frequency: "daily", dueDate: "", dayOfWeeks: ["1"],
  });

  const load = useCallback(async () => {
    const [mRes, cRes, aRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/chores"),
      fetch("/api/assignments?scope=all"),
    ]);
    const [membersData, choresData, assignmentsData] = await Promise.all([
      mRes.json().catch(() => []),
      cRes.json().catch(() => []),
      aRes.json().catch(() => []),
    ]);
    const nextMembers = Array.isArray(membersData) ? membersData : Array.isArray(membersData?.members) ? membersData.members : [];
    if (!Array.isArray(membersData) && !Array.isArray(membersData?.members)) toast.error(membersData.error ?? "Could not load members");
    setMembers(nextMembers);
    setChores(Array.isArray(choresData) ? choresData : []);
    setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function assign() {
    if (!form.memberId || form.choreIds.length === 0) { toast.error("Select a member and at least one chore"); return; }
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
          memberId: form.memberId,
          choreIds: form.choreIds,
          frequency: form.frequency,
          dueDate: form.dueDate || null,
          dayOfWeeks: form.frequency === "weekly" ? form.dayOfWeeks.map(Number) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not assign chores");
        return;
      }
      toast.success(`${form.choreIds.length} ${form.choreIds.length === 1 ? "chore" : "chores"} assigned!`);
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
  const availableChores = selectedMemberObj
    ? chores.filter((c) => {
        const isParent = selectedMemberObj.role === "parent" || selectedMemberObj.role === "mom" || selectedMemberObj.role === "dad" || selectedMemberObj.role === "grandparent";
        return isParent ? true : c.ageMin <= selectedMemberObj.age && c.ageMax >= selectedMemberObj.age;
      })
    : chores;

  function resetForm() {
    setForm({ memberId: "", choreIds: [], frequency: "daily", dueDate: "", dayOfWeeks: ["1"] });
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

      {filteredAssignments.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-bold text-slate-500">No chores assigned yet</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredAssignments.map((a) => (
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
                  <span>Day {new Date(a.dueDate).getDate()}</span>
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
                  disabled={(a.completions?.length ?? 0) > 0 || completingId === a.id}
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
                  {(a.completions?.length ?? 0) > 0 ? "Completed" : completingId === a.id ? "Saving" : "Complete Today"}
                </button>
              )}
              <button onClick={() => unassign(a.id)} className="p-1 text-red-400 transition-colors hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
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
              <Camera size={16} /> Proof photo required
            </div>
            <label className="block cursor-pointer rounded-xl bg-white px-3 py-2 text-center text-sm font-black text-blue-700 shadow-sm">
              {completionProofPhoto ? completionProofPhoto.name : "Choose or take photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
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
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label className="font-bold">Chores</Label>
                {availableChores.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm((previous) => ({
                      ...previous,
                      choreIds: previous.choreIds.length === availableChores.length
                        ? []
                        : availableChores.map((chore) => chore.id),
                    }))}
                    className="text-xs font-black text-emerald-600 hover:text-emerald-700"
                  >
                    {form.choreIds.length === availableChores.length ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                {availableChores.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm font-semibold text-slate-400">
                    {form.memberId ? "No age-appropriate chores available" : "Select a family member first"}
                  </p>
                ) : availableChores.map((chore) => {
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
                        <span className="block text-xs font-semibold text-slate-400">⭐ {chore.pointsValue} points</span>
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
              <div>
                <Label className="font-bold">Monthly Date</Label>
                <Input type="date" value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="rounded-xl mt-1" />
                <p className="mt-1 text-xs font-semibold text-slate-400">This repeats every month on the selected day number.</p>
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
