"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Member { id: number; name: string; avatar: string; color: string; age: number; role: string }
interface Chore { id: number; name: string; icon: string; ageMin: number; ageMax: number; pointsValue: number }
interface Assignment {
  id: number;
  choreId: number;
  memberId: number;
  frequency: string;
  dueDate: string | null;
  dayOfWeek: number | null;
  chore: Chore;
  member: Member;
}

export default function AssignPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    memberId: "", choreId: "", frequency: "daily", dueDate: "", dayOfWeeks: ["1"],
  });

  const load = useCallback(async () => {
    const [mRes, cRes, aRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/chores"),
      fetch("/api/assignments?scope=all"),
    ]);
    setMembers(await mRes.json());
    setChores(await cRes.json());
    setAssignments(await aRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function assign() {
    if (!form.memberId || !form.choreId) { toast.error("Select member and chore"); return; }
    if (form.frequency === "weekly" && form.dayOfWeeks.length === 0) {
      toast.error("Choose at least one weekday");
      return;
    }
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: parseInt(form.memberId),
        choreId: parseInt(form.choreId),
        frequency: form.frequency,
        dueDate: form.dueDate || null,
        dayOfWeeks: form.frequency === "weekly" ? form.dayOfWeeks.map(Number) : [],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not assign chore");
      return;
    }
    toast.success("Chore assigned!");
    setOpen(false);
    load();
  }

  async function unassign(id: number) {
    await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
    toast.success("Assignment removed");
    load();
  }

  const filteredAssignments = selectedMember
    ? assignments.filter((a) => a.memberId === parseInt(selectedMember))
    : assignments;

  const selectedMemberObj = members.find((m) => m.id === parseInt(form.memberId));
  const availableChores = selectedMemberObj
    ? chores.filter((c) => {
        const isParent = selectedMemberObj.role === "parent" || selectedMemberObj.role === "mom" || selectedMemberObj.role === "dad";
        return isParent ? true : c.ageMin <= selectedMemberObj.age && c.ageMax >= selectedMemberObj.age;
      })
    : chores;

  function resetForm() {
    setForm({ memberId: "", choreId: "", frequency: "daily", dueDate: "", dayOfWeeks: ["1"] });
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
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">📅 Assign Chores</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
        <button
          type="button"
          onClick={load}
          className="flex items-center justify-center gap-2 bg-white text-slate-600 rounded-2xl px-3 sm:px-4 py-2.5 font-bold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={18} /> Refresh
        </button>
        <button
          onClick={() => { resetForm(); setOpen(true); }}
          className="flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-2xl px-3 sm:px-4 py-2.5 font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus size={18} /> Assign Chore
        </button>
        </div>
      </div>

      {/* Member filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setSelectedMember("")}
          className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${!selectedMember ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
        >
          Everyone
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMember(String(m.id))}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-1 ${selectedMember === String(m.id) ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
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
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              </div>
            </div>
            <button onClick={() => unassign(a.id)} className="self-end text-red-400 hover:text-red-600 p-1 transition-colors sm:self-auto">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Assign a Chore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold">Family Member</Label>
              <Select value={form.memberId} onValueChange={(v) => setForm((p) => ({ ...p, memberId: v ?? "", choreId: "" }))}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Select a family member" />
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
              <Label className="font-bold">Chore</Label>
              <Select value={form.choreId} onValueChange={(v) => setForm((p) => ({ ...p, choreId: v ?? "" }))}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Select a chore" />
                </SelectTrigger>
                <SelectContent>
                  {availableChores.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.icon} {c.name} (⭐{c.pointsValue})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((p) => ({ ...p, frequency: v ?? "daily" }))}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
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
              className="w-full bg-emerald-500 text-white rounded-xl py-3 font-black hover:bg-emerald-600 transition-colors"
            >
              Assign Chore
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
