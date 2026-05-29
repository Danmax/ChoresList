"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Save, ClipboardList } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AVATAR_OPTIONS, KID_COLORS, PARENT_AVATARS } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_OPTIONS = [
  { value: "child", label: "👦 Child" },
  { value: "mom", label: "👩 Mom" },
  { value: "dad", label: "👨 Dad" },
  { value: "parent", label: "🧑 Parent" },
];

interface Member {
  id: number;
  name: string;
  age: number;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  role: string;
  avatar: string;
  color: string;
  totalPoints: number;
  level: number;
}

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function daysInMonth(month?: number | null) {
  return month ? new Date(2024, month, 0).getDate() : 31;
}

function birthdayLabel(member: Pick<Member, "birthdayMonth" | "birthdayDay">) {
  if (!member.birthdayMonth || !member.birthdayDay) return null;
  const month = MONTH_OPTIONS.find((option) => option.value === member.birthdayMonth)?.label;
  if (!month) return null;
  return `${month} ${member.birthdayDay}`;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/members");
    setMembers(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing({ name: "", age: 8, birthdayMonth: null, birthdayDay: null, role: "child", avatar: "🧒", color: KID_COLORS[0] });
    setOpen(true);
  }

  function openEdit(m: Member) {
    setEditing({ ...m });
    setOpen(true);
  }

  async function save() {
    if (!editing?.name || !editing.age) {
      toast.error("Name and age are required");
      return;
    }
    if (editing.id) {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      toast.success("Member updated!");
    } else {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      toast.success("Member added!");
    }
    setOpen(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Remove this family member and all their chore data?")) return;
    await fetch(`/api/members?id=${id}`, { method: "DELETE" });
    toast.success("Member removed");
    load();
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-3xl font-black text-slate-800 flex-1">👨‍👩‍👧‍👦 Family Members</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-violet-500 text-white rounded-2xl px-4 py-2.5 font-bold hover:bg-violet-600 transition-colors"
        >
          <Plus size={18} /> Add Member
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="rounded-3xl p-5 bg-white shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            style={{ border: `2px solid ${m.color}44` }}
            onClick={() => openEdit(m)}
          >
            <div className="text-5xl">{m.avatar}</div>
            <div className="flex-1">
              <p className="font-black text-slate-800 text-lg">{m.name}</p>
              <p className="text-slate-400 font-semibold text-sm capitalize">
                {ROLE_OPTIONS.find((r) => r.value === m.role)?.label ?? m.role}
                {m.role === "child" || m.role === "parent" ? ` • Age ${m.age}` : ""}
              </p>
              {birthdayLabel(m) && (
                <p className="text-slate-400 text-xs font-bold">🎂 {birthdayLabel(m)}</p>
              )}
              <p className="text-slate-500 text-sm font-semibold">⭐ {m.totalPoints} pts • Lv.{m.level}</p>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <Link
                href={`/kid/${m.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <ClipboardList size={13} /> Tasks
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-bold text-slate-600">No family members yet</h2>
          <p className="text-slate-400 mt-1">Add your kids to get started!</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">{editing?.id ? "Edit Member" : "Add Family Member"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Role selector */}
              <div>
                <Label className="font-bold mb-2 block">Who is this?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setEditing((p) => ({ ...p!, role: r.value }))}
                      className={`py-2 px-3 rounded-xl font-bold text-sm transition-all border-2 ${
                        editing.role === r.value
                          ? "bg-violet-100 border-violet-400 text-violet-700"
                          : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-bold">Name</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p!, name: e.target.value }))}
                  placeholder={editing.role === "mom" ? "Mom's name" : editing.role === "dad" ? "Dad's name" : "Child's name"}
                  className="rounded-xl mt-1"
                />
              </div>

              {(editing.role === "child" || editing.role === "parent") && (
                <div className="space-y-3">
                  <div>
                    <Label className="font-bold">Age</Label>
                    <Input
                      type="number"
                      value={editing.age ?? 8}
                      min={2}
                      max={99}
                      onChange={(e) => setEditing((p) => ({ ...p!, age: parseInt(e.target.value) }))}
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Birthday</Label>
                    <div className="mt-1 grid grid-cols-[1fr_6rem] gap-2">
                      <select
                        value={editing.birthdayMonth ?? ""}
                        onChange={(e) => {
                          const birthdayMonth = e.target.value ? parseInt(e.target.value, 10) : null;
                          setEditing((p) => {
                            const maxDay = daysInMonth(birthdayMonth);
                            const currentDay = p?.birthdayDay ?? null;
                            return {
                              ...p!,
                              birthdayMonth,
                              birthdayDay: birthdayMonth ? (currentDay && currentDay <= maxDay ? currentDay : 1) : null,
                            };
                          });
                        }}
                        className="h-8 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                      <select
                        value={editing.birthdayDay ?? ""}
                        disabled={!editing.birthdayMonth}
                        onChange={(e) => setEditing((p) => ({ ...p!, birthdayDay: e.target.value ? parseInt(e.target.value, 10) : null }))}
                        className="h-8 w-full rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300 disabled:opacity-50"
                      >
                        <option value="">Day</option>
                        {Array.from({ length: daysInMonth(editing.birthdayMonth) }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="font-bold mb-2 block">Avatar</Label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 rounded-xl border border-slate-100 bg-slate-50">
                  {(editing.role === "mom" || editing.role === "dad" || editing.role === "parent"
                    ? PARENT_AVATARS
                    : AVATAR_OPTIONS
                  ).map((a) => (
                    <button
                      key={a}
                      onClick={() => setEditing((p) => ({ ...p!, avatar: a }))}
                      className={`text-2xl p-1.5 rounded-xl transition-all ${
                        editing.avatar === a
                          ? "bg-violet-100 ring-2 ring-violet-400 scale-110"
                          : "hover:bg-white"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-bold mb-2 block">Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {KID_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditing((p) => ({ ...p!, color: c }))}
                      className={`w-8 h-8 rounded-full transition-all ${
                        editing.color === c ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={save}
                className="w-full bg-violet-500 text-white rounded-xl py-3 font-black flex items-center justify-center gap-2 hover:bg-violet-600 transition-colors"
              >
                <Save size={18} /> Save Member
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
