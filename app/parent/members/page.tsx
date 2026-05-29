"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Save, ClipboardList, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AVATAR_OPTIONS, KID_COLORS, PARENT_AVATARS, STARTER_CHORE_TEMPLATES_BY_AGE, type StarterChoreFrequency, type StarterChoreTemplate } from "@/types";
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

type MembersResponse = Member[] | { members?: Member[]; currentParent?: { id: number; email: string } };

function membersFromResponse(data: unknown) {
  if (Array.isArray(data)) return data as Member[];
  if (data && typeof data === "object" && "members" in data && Array.isArray((data as { members?: unknown }).members)) {
    return (data as { members: Member[] }).members;
  }
  return null;
}

function currentParentEmailFromResponse(data: unknown) {
  if (!data || typeof data !== "object" || !("currentParent" in data)) return "";
  const currentParent = (data as { currentParent?: { email?: unknown } }).currentParent;
  return typeof currentParent?.email === "string" ? currentParent.email : "";
}

type SavedMember = Member & { id: number };

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

function starterBandForAge(age?: number) {
  const safeAge = Number(age);
  return STARTER_CHORE_TEMPLATES_BY_AGE.find((band) => safeAge >= band.ageMin && safeAge <= band.ageMax) ?? STARTER_CHORE_TEMPLATES_BY_AGE[0];
}

function defaultStarterSelection(age?: number) {
  const band = starterBandForAge(age);
  const selected = new Set<string>();
  (["daily", "weekly", "monthly"] as StarterChoreFrequency[]).forEach((frequency) => {
    const limit = frequency === "daily" ? band.dailyLimit : frequency === "weekly" ? band.weeklyLimit : band.monthlyLimit;
    band.chores.filter((chore) => chore.frequency === frequency).slice(0, limit).forEach((chore) => selected.add(chore.name));
  });
  return selected;
}

function nextDateForMonthly() {
  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentParentEmail, setCurrentParentEmail] = useState("");
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [assignStarter, setAssignStarter] = useState(true);
  const [starterSelection, setStarterSelection] = useState<Set<string>>(defaultStarterSelection(8));

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      const data = await res.json().catch(() => null);
      const nextMembers = membersFromResponse(data);
      if (!res.ok || !nextMembers) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : `Could not load members (HTTP ${res.status})`;
        setLoadError(message);
        setMembers([]);
        return;
      }
      setLoadError("");
      setMembers(nextMembers);
      setCurrentParentEmail(currentParentEmailFromResponse(data));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load members");
      setMembers([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing({ name: "", age: 8, birthdayMonth: null, birthdayDay: null, role: "child", avatar: "🧒", color: KID_COLORS[0] });
    setAssignStarter(true);
    setStarterSelection(defaultStarterSelection(8));
    setOpen(true);
  }

  function openEdit(m: Member) {
    setEditing({ ...m });
    setAssignStarter(false);
    setOpen(true);
  }

  function updateAge(age: number) {
    setEditing((p) => ({ ...p!, age }));
    if (!editing?.id) {
      setStarterSelection(defaultStarterSelection(age));
    }
  }

  function toggleStarter(name: string) {
    setStarterSelection((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function ensureChore(template: StarterChoreTemplate, ageMin: number, ageMax: number) {
    const res = await fetch("/api/chores");
    const existing = await res.json().catch(() => []);
    if (Array.isArray(existing)) {
      const match = existing.find((chore) => chore.name?.toLowerCase() === template.name.toLowerCase());
      if (match?.id) return match.id as number;
    }

    const createRes = await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        description: template.description,
        icon: template.icon,
        color: "#ede9fe",
        ageMin,
        ageMax,
        pointsValue: template.pointsValue,
        category: template.category,
        requiresPhoto: false,
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) throw new Error(created.error ?? `Could not create ${template.name}`);
    return created.id as number;
  }

  async function assignStarterTasks(member: SavedMember) {
    const band = starterBandForAge(member.age);
    const selectedTemplates = band.chores.filter((chore) => starterSelection.has(chore.name));
    if (selectedTemplates.length === 0) return;

    const weeklyDays = [1, 3, 5];
    let weeklyIndex = 0;

    for (const template of selectedTemplates) {
      const choreId = await ensureChore(template, band.ageMin, band.ageMax);
      const body =
        template.frequency === "weekly"
          ? { memberId: member.id, choreId, frequency: "weekly", dayOfWeeks: [weeklyDays[weeklyIndex++ % weeklyDays.length]] }
          : template.frequency === "monthly"
            ? { memberId: member.id, choreId, frequency: "monthly", dueDate: nextDateForMonthly() }
            : { memberId: member.id, choreId, frequency: "daily" };

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Could not assign ${template.name}`);
    }
  }

  async function save() {
    if (!editing?.name || !editing.age) {
      toast.error("Name and age are required");
      return;
    }
    if (editing.id) {
      const res = await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not update member");
        return;
      }
      toast.success("Member updated!");
    } else {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const member = await res.json();
      if (!res.ok) {
        toast.error(member.error ?? "Could not add member");
        return;
      }
      if (assignStarter && editing.role === "child") {
        await assignStarterTasks(member);
        toast.success("Member added with starter chores!");
      } else {
        toast.success("Member added!");
      }
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
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">👨‍👩‍👧‍👦 Family Members</h1>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-violet-500 text-white rounded-2xl px-4 py-2.5 font-bold hover:bg-violet-600 transition-colors sm:w-auto"
        >
          <Plus size={18} /> Add Member
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="rounded-3xl p-5 bg-white shadow-sm flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
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
              {m.role !== "child" && currentParentEmail && (
                <p className="text-slate-400 text-xs font-bold">Signed in as {currentParentEmail}</p>
              )}
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

      {loadError && (
        <div className="rounded-3xl border-2 border-red-100 bg-red-50 p-5 text-sm">
          <p className="font-black text-red-700">Could not load family members</p>
          <p className="mt-1 break-words font-semibold text-red-600">{loadError}</p>
          {loadError.includes("Database migrations") && (
            <p className="mt-2 font-semibold text-red-600">Run `npm run db:deploy`, then reload this page.</p>
          )}
        </div>
      )}

      {members.length === 0 && !loadError && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-bold text-slate-600">No family members yet</h2>
          <p className="text-slate-400 mt-1">Add your kids to get started!</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">{editing?.id ? "Edit Member" : "Add Family Member"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Role selector */}
              <div>
                <Label className="font-bold mb-2 block">Who is this?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(editing.id && editing.role === "child" ? ROLE_OPTIONS.filter((r) => r.value === "child") : ROLE_OPTIONS).map((r) => (
                    <button
                      key={r.value}
                      disabled={Boolean(editing.id && editing.role === "child" && r.value !== "child")}
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
                {editing.id && editing.role === "child" && (
                  <p className="mt-2 text-xs font-bold text-slate-400">Child profiles stay child profiles. Invite adults from the Parent Panel for parent account access.</p>
                )}
                {!editing.id && editing.role !== "child" && (
                  <p className="mt-2 text-xs font-bold text-slate-400">This creates an adult family profile only. Parent login access is added with Invite Family.</p>
                )}
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
                      onChange={(e) => updateAge(parseInt(e.target.value))}
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

              {!editing.id && editing.role === "child" && (
                <div className="rounded-2xl bg-violet-50 p-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={assignStarter}
                      onChange={(event) => setAssignStarter(event.target.checked)}
                      className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
                    />
                    <span className="flex items-center gap-1 text-sm font-black text-violet-800">
                      <Sparkles size={15} /> Assign starter chores
                    </span>
                  </label>
                  {assignStarter && (
                    <div className="mt-3 space-y-3">
                      {(() => {
                        const band = starterBandForAge(editing.age);
                        return (
                          <>
                            <div>
                              <p className="text-sm font-black text-slate-800">{band.label}</p>
                              <p className="text-xs font-bold text-slate-500">
                                Choose up to {band.dailyLimit} daily, {band.weeklyLimit} weekly, and {band.monthlyLimit} monthly tasks.
                              </p>
                            </div>
                            {(["daily", "weekly", "monthly"] as StarterChoreFrequency[]).map((frequency) => {
                              const limit = frequency === "daily" ? band.dailyLimit : frequency === "weekly" ? band.weeklyLimit : band.monthlyLimit;
                              const templates = band.chores.filter((chore) => chore.frequency === frequency);
                              const selectedCount = templates.filter((chore) => starterSelection.has(chore.name)).length;
                              return (
                                <div key={frequency}>
                                  <p className="mb-1 text-xs font-black uppercase text-slate-400">
                                    {frequency} {selectedCount}/{limit}
                                  </p>
                                  <div className="space-y-1.5">
                                    {templates.map((template) => {
                                      const checked = starterSelection.has(template.name);
                                      const disabled = !checked && selectedCount >= limit;
                                      return (
                                        <button
                                          key={template.name}
                                          type="button"
                                          disabled={disabled}
                                          onClick={() => toggleStarter(template.name)}
                                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors disabled:opacity-40 ${
                                            checked ? "bg-white text-violet-800 ring-2 ring-violet-200" : "bg-violet-100/60 text-slate-600 hover:bg-white"
                                          }`}
                                        >
                                          <span>{checked ? "✓" : ""}</span>
                                          <span className="text-lg">{template.icon}</span>
                                          <span className="min-w-0 flex-1 truncate">{template.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                            <div>
                              <p className="mb-1 text-xs font-black uppercase text-slate-400">Life skills</p>
                              <ul className="space-y-1 text-xs font-bold text-slate-500">
                                {band.lifeSkills.map((skill) => (
                                  <li key={skill}>• {skill}</li>
                                ))}
                              </ul>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
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
