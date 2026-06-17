"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_CATEGORIES, PROJECT_EMOJIS, REWARD_PRESETS } from "@/types";

interface Member { id: string; name: string; avatar: string; color: string; role: string }
interface Project {
  id: string; title: string; description: string | null; category: string;
  emoji: string; rewardTitle: string; rewardEmoji: string; pointsBonus: number;
  assignedTo: string | null; status: string; dueDate: string | null;
  assignee: Member | null;
  tickets: { id: string; member: Member; status: string }[];
}

const BLANK = {
  title: "", description: "", category: "repair", emoji: "🔧",
  rewardTitle: "", rewardEmoji: "🎫", pointsBonus: 50, assignedTo: "", dueDate: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [completedById, setCompletedById] = useState<string>("");
  const [form, setForm] = useState(BLANK);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState("open");

  const load = useCallback(async () => {
    const [pRes, mRes] = await Promise.all([fetch("/api/projects"), fetch("/api/members")]);
    if (pRes.ok) setProjects(await pRes.json());
    if (mRes.ok) {
      const data = await mRes.json().catch(() => []);
      setMembers(Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.title.trim() || !form.rewardTitle.trim()) {
      toast.error("Title and reward are required");
      return;
    }
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
        pointsBonus: Number(form.pointsBonus),
      }),
    });
    toast.success("Project created!");
    setOpen(false);
    setForm(BLANK);
    load();
  }

  async function completeProject() {
    if (!completingProject || !completedById) { toast.error("Select who completed it"); return; }
    const res = await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: completingProject.id, status: "completed", completedById }),
    });
    if (!res.ok) { toast.error("Could not mark complete"); return; }
    const data = await res.json();
    const member = members.find((m) => m.id === completedById);
    toast.success(`🎫 Reward ticket earned by ${member?.name ?? ""}! Check Reward Tickets to redeem.`);
    setCompletingProject(null);
    setCompletedById("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    toast.success("Project removed");
    load();
  }

  const displayed = projects.filter((p) => filterStatus === "all" ? true : p.status === filterStatus);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow shrink-0">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">🔧 House Projects</h1>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-orange-500 text-white rounded-2xl px-3 sm:px-4 py-2.5 font-bold hover:bg-orange-600 transition-colors text-sm sm:text-base"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[["open","Open"],["completed","Done"],["all","All"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${filterStatus === v ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
          >{l}</button>
        ))}
      </div>

      <div className="space-y-4">
        {displayed.map((p) => (
          <div key={p.id} className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-slate-800 text-base">{p.title}</p>
                  {p.status === "completed" && (
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✅ Done</span>
                  )}
                </div>
                {p.description && <p className="text-slate-500 text-sm mt-0.5">{p.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2 text-xs font-semibold">
                  <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg">
                    {PROJECT_CATEGORIES.find((c) => c.value === p.category)?.emoji} {p.category}
                  </span>
                  <span className="bg-violet-50 text-violet-600 px-2 py-1 rounded-lg">
                    ⭐ +{p.pointsBonus} pts
                  </span>
                  {p.assignee && (
                    <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg">
                      {p.assignee.avatar} {p.assignee.name}
                    </span>
                  )}
                  {p.dueDate && (
                    <span className="bg-red-50 text-red-500 px-2 py-1 rounded-lg">
                      📅 {new Date(p.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {/* Reward ticket preview */}
                <div className="mt-3 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-3 py-2">
                  <span className="text-xl">{p.rewardEmoji}</span>
                  <span className="font-black text-amber-700 text-sm">Reward: {p.rewardTitle}</span>
                </div>
                {/* Completed tickets */}
                {p.tickets.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {p.tickets.map((t) => (
                      <span key={t.id} className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.status === "redeemed" ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600"}`}>
                        {t.member.avatar} {t.member.name} {t.status === "redeemed" ? "✓ redeemed" : "🎫 earned"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {p.status === "open" && (
                  <button
                    onClick={() => { setCompletingProject(p); setCompletedById(p.assignedTo ? String(p.assignedTo) : ""); }}
                    className="flex items-center gap-1 bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-xs font-black hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle2 size={13} /> Done
                  </button>
                )}
                <button onClick={() => remove(p.id)} className="text-red-300 hover:text-red-500 transition-colors self-end">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔨</div>
            <p className="font-bold text-slate-500">No projects yet — add something to fix or build!</p>
          </div>
        )}
      </div>

      {/* Mark Complete Dialog */}
      <Dialog open={!!completingProject} onOpenChange={(o) => !o && setCompletingProject(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">
              {completingProject?.emoji} Who completed this?
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-500 font-semibold text-sm">{completingProject?.title}</p>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="font-bold mb-2 block">Completed by</Label>
              <div className="grid grid-cols-2 gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setCompletedById(String(m.id))}
                    className={`flex items-center gap-2 p-3 rounded-xl font-bold transition-all border-2 ${
                      completedById === String(m.id)
                        ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                        : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-2xl">{m.avatar}</span>
                    <span className="text-sm">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {completedById && completingProject && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm font-semibold text-amber-700">
                🎫 This will generate a <strong>{completingProject.rewardEmoji} {completingProject.rewardTitle}</strong> reward ticket
                {completingProject.pointsBonus > 0 && ` and award +${completingProject.pointsBonus} bonus points`}.
              </div>
            )}
            <button
              onClick={completeProject}
              disabled={!completedById}
              className="w-full bg-emerald-500 text-white rounded-xl py-3 font-black hover:bg-emerald-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} /> Mark Complete & Issue Ticket
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">New House Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Emoji + Title */}
            <div className="flex gap-3">
              <div className="w-16 shrink-0">
                <Label className="font-bold text-sm">Icon</Label>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  {form.emoji}
                </button>
              </div>
              <div className="flex-1">
                <Label className="font-bold text-sm">Project Title</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Fix leaky faucet, Paint fence…" className="rounded-xl mt-1" />
              </div>
            </div>
            {showEmojiPicker && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl max-h-36 overflow-y-auto border border-slate-200">
                {PROJECT_EMOJIS.map((e) => (
                  <button key={e} onClick={() => { setForm((p) => ({ ...p, emoji: e })); setShowEmojiPicker(false); }}
                    className={`text-2xl p-1.5 rounded-xl hover:bg-white transition-colors ${form.emoji === e ? "bg-violet-100 ring-2 ring-violet-400" : ""}`}
                  >{e}</button>
                ))}
              </div>
            )}

            <div>
              <Label className="font-bold text-sm">Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What needs to be done?" className="rounded-xl mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold text-sm">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v ?? "other" }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold text-sm">Bonus Points</Label>
                <Input type="number" value={form.pointsBonus} min={0} max={500}
                  onChange={(e) => setForm((p) => ({ ...p, pointsBonus: parseInt(e.target.value) || 0 }))}
                  className="rounded-xl mt-1" />
              </div>
            </div>

            <div>
              <Label className="font-bold text-sm">Assign To (optional)</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm((p) => ({ ...p, assignedTo: v === "anyone" ? "" : (v ?? "") }))}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Anyone in the family" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anyone">👨‍👩‍👧‍👦 Anyone</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.avatar} {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-bold text-sm">Due Date (optional)</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="rounded-xl mt-1" />
            </div>

            {/* Reward */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <Label className="font-black text-amber-700 block">🎫 Reward Ticket</Label>
              <div className="grid grid-cols-2 gap-2">
                {REWARD_PRESETS.map((r) => (
                  <button
                    key={r.title}
                    onClick={() => { setForm((p) => ({ ...p, rewardTitle: r.title, rewardEmoji: r.emoji })); setShowRewardPicker(false); }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl font-bold text-sm text-left transition-all border-2 ${form.rewardTitle === r.title ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-white border-transparent text-slate-600 hover:bg-amber-50"}`}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <span className="leading-tight text-xs">{r.title}</span>
                  </button>
                ))}
              </div>
              <div>
                <Label className="font-bold text-sm text-amber-700">Custom reward</Label>
                <Input value={form.rewardTitle}
                  onChange={(e) => setForm((p) => ({ ...p, rewardTitle: e.target.value }))}
                  placeholder="Or type your own reward…"
                  className="rounded-xl mt-1 bg-white" />
              </div>
            </div>

            <button onClick={save}
              className="w-full bg-orange-500 text-white rounded-xl py-3 font-black hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Create Project
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
