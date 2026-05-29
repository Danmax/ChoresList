"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Wand2, BookOpen, ChevronRight, Trash2, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CHORE_CATEGORIES, CHORE_EMOJIS, CHORE_TEMPLATES_BY_AGE } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Instructions {
  steps: string[];
  tips: string[];
  safetyNotes: string[];
}

interface Chore {
  id: number;
  name: string;
  icon: string;
  color: string;
  ageMin: number;
  ageMax: number;
  pointsValue: number;
  category: string;
  requiresPhoto: boolean;
  instructions?: { steps: string; tips: string; safetyNotes: string } | null;
}

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [filterCat, setFilterCat] = useState("all");
  const [editingInstructions, setEditingInstructions] = useState<Chore | null>(null);
  const [instructions, setInstructions] = useState<Instructions>({ steps: [], tips: [], safetyNotes: [] });
  const [generating, setGenerating] = useState(false);
  const [showNewChore, setShowNewChore] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newChore, setNewChore] = useState({ name: "", description: "", icon: "✅", color: "#e0e7ff", ageMin: 6, ageMax: 18, pointsValue: 10, category: "other", requiresPhoto: false });
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<"new" | "edit" | null>(null);
  const [chorePrompt, setChorePrompt] = useState("");
  const [draftingChore, setDraftingChore] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/chores");
    setChores(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function openInstructions(chore: Chore) {
    setEditingInstructions(chore);
    if (chore.instructions) {
      setInstructions({
        steps: JSON.parse(chore.instructions.steps),
        tips: JSON.parse(chore.instructions.tips),
        safetyNotes: JSON.parse(chore.instructions.safetyNotes),
      });
    } else {
      setInstructions({ steps: [], tips: [], safetyNotes: [] });
    }
  }

  async function generateInstructions(chore: Chore) {
    setGenerating(true);
    setInstructions({ steps: [], tips: [], safetyNotes: [] });
    let accumulated = "";

    try {
      const res = await fetch(`/api/chores/${chore.id}/instructions`, { method: "POST" });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Show raw streaming text as it comes in
        try {
          const parsed = JSON.parse(accumulated);
          setInstructions({
            steps: parsed.steps ?? [],
            tips: parsed.tips ?? [],
            safetyNotes: parsed.safetyNotes ?? [],
          });
        } catch {
          // Still accumulating — not valid JSON yet
        }
      }
      toast.success("Instructions generated!");
    } finally {
      setGenerating(false);
    }
  }

  async function saveInstructions() {
    if (!editingInstructions) return;
    await fetch(`/api/chores/${editingInstructions.id}/instructions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(instructions),
    });
    toast.success("Instructions saved!");
    setEditingInstructions(null);
    load();
  }

  async function saveEditChore() {
    if (!editingChore || !editingChore.name) { toast.error("Name required"); return; }
    await fetch("/api/chores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingChore),
    });
    toast.success("Chore updated!");
    setEditingChore(null);
    load();
  }

  async function addChore() {
    if (!newChore.name) { toast.error("Name required"); return; }
    await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChore),
    });
    toast.success("Chore added!");
    setShowNewChore(false);
    setNewChore({ name: "", description: "", icon: "✅", color: "#e0e7ff", ageMin: 6, ageMax: 18, pointsValue: 10, category: "other", requiresPhoto: false });
    setChorePrompt("");
    load();
  }

  async function generateChoreDraft() {
    if (chorePrompt.trim().length < 4) {
      toast.error("Describe the chore first");
      return;
    }
    setDraftingChore(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "chore", prompt: chorePrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not draft chore");
        return;
      }
      setNewChore((p) => ({ ...p, ...data.draft }));
      toast.success("Chore draft filled in");
    } finally {
      setDraftingChore(false);
    }
  }

  async function addTemplateGroup(group: typeof CHORE_TEMPLATES_BY_AGE[number]) {
    const existingNames = new Set(chores.map((chore) => chore.name.toLowerCase()));
    const templates = group.chores.filter((chore) => !existingNames.has(chore.name.toLowerCase()));
    if (templates.length === 0) {
      toast.info("Those templates are already in your library");
      return;
    }

    await Promise.all(
      templates.map((template) =>
        fetch("/api/chores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...template,
            ageMin: group.ageMin,
            ageMax: group.ageMax,
            requiresPhoto: false,
          }),
        })
      )
    );

    toast.success(`Added ${templates.length} ${group.label} chores`);
    setShowTemplates(false);
    load();
  }

  async function deleteChore(id: number) {
    if (!confirm("Delete this chore?")) return;
    await fetch(`/api/chores?id=${id}`, { method: "DELETE" });
    toast.success("Chore deleted");
    load();
  }

  async function adjustPoints(chore: Chore, delta: number) {
    const next = Math.min(200, Math.max(5, chore.pointsValue + delta));
    if (next === chore.pointsValue) return;
    await fetch("/api/chores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...chore, pointsValue: next }),
    });
    load();
  }

  const filtered = filterCat === "all" ? chores : chores.filter((c) => c.category === filterCat);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">📋 Chore Library</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center justify-center gap-2 bg-violet-500 text-white rounded-2xl px-3 sm:px-4 py-2.5 font-bold hover:bg-violet-600 transition-colors"
        >
          <Sparkles size={18} /> Quick Start
        </button>
        <button
          onClick={() => setShowNewChore(true)}
          className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-2xl px-3 sm:px-4 py-2.5 font-bold hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} /> New Chore
        </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${filterCat === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          All
        </button>
        {CHORE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCat(c.value)}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${filterCat === c.value ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((chore) => (
          <div
            key={chore.id}
            className="rounded-2xl p-4 bg-white shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            style={{ borderLeft: `4px solid ${chore.color}` }}
          >
            <div className="text-3xl">{chore.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-800">{chore.name}</span>
                {chore.instructions && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs font-bold">Has Guide ✓</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs font-semibold text-slate-500 items-center">
                <span>Ages {chore.ageMin}–{chore.ageMax}</span>
                <span className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); adjustPoints(chore, -5); }}
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 flex items-center justify-center font-black transition-colors"
                  >−</button>
                  <span className="font-black text-violet-600">⭐ {chore.pointsValue} pts</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); adjustPoints(chore, 5); }}
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 flex items-center justify-center font-black transition-colors"
                  >+</button>
                </span>
                <span>{CHORE_CATEGORIES.find((c) => c.value === chore.category)?.icon} {chore.category}</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <button
                onClick={() => setEditingChore({ ...chore })}
                className="flex flex-1 items-center justify-center gap-1 bg-slate-50 text-slate-600 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-slate-100 transition-colors sm:flex-none"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => openInstructions(chore)}
                className="flex flex-1 items-center justify-center gap-1 bg-indigo-50 text-indigo-600 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-indigo-100 transition-colors sm:flex-none"
              >
                <BookOpen size={14} /> Guide
              </button>
              <button
                onClick={() => deleteChore(chore.id)}
                className="text-red-400 hover:text-red-600 p-1.5 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Instructions Editor Dialog */}
      <Dialog open={!!editingInstructions} onOpenChange={(o) => !o && setEditingInstructions(null)}>
        <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              {editingInstructions?.icon} {editingInstructions?.name} — Step-by-Step Guide
            </DialogTitle>
          </DialogHeader>

          <button
            onClick={() => editingInstructions && generateInstructions(editingInstructions)}
            disabled={generating}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-2xl py-3 font-black hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Wand2 size={18} />
            {generating ? "Generating with AI..." : "Generate with AI ✨"}
          </button>

          {generating && (
            <div className="text-center text-slate-400 font-semibold text-sm animate-pulse">
              Claude is writing step-by-step instructions...
            </div>
          )}

          {instructions.steps.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label className="font-black text-base mb-2 block">Steps</Label>
                <div className="space-y-2">
                  {instructions.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="font-black text-violet-400 mt-2.5 w-6 shrink-0">{i + 1}.</span>
                      <input
                        value={step}
                        onChange={(e) => {
                          const steps = [...instructions.steps];
                          steps[i] = e.target.value;
                          setInstructions((p) => ({ ...p, steps }));
                        }}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <button
                        onClick={() => setInstructions((p) => ({ ...p, steps: p.steps.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600 mt-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setInstructions((p) => ({ ...p, steps: [...p.steps, ""] }))}
                  className="mt-2 text-sm text-violet-500 font-bold hover:text-violet-700"
                >
                  + Add step
                </button>
              </div>

              <div>
                <Label className="font-black text-base mb-2 block">💡 Tips</Label>
                <div className="space-y-2">
                  {instructions.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={tip}
                        onChange={(e) => {
                          const tips = [...instructions.tips];
                          tips[i] = e.target.value;
                          setInstructions((p) => ({ ...p, tips }));
                        }}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                      <button
                        onClick={() => setInstructions((p) => ({ ...p, tips: p.tips.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setInstructions((p) => ({ ...p, tips: [...p.tips, ""] }))}
                  className="mt-2 text-sm text-yellow-600 font-bold hover:text-yellow-800"
                >
                  + Add tip
                </button>
              </div>

              <div>
                <Label className="font-black text-base mb-2 block">🛡️ Safety Notes</Label>
                <div className="space-y-2">
                  {instructions.safetyNotes.map((note, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={note}
                        onChange={(e) => {
                          const notes = [...instructions.safetyNotes];
                          notes[i] = e.target.value;
                          setInstructions((p) => ({ ...p, safetyNotes: notes }));
                        }}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <button
                        onClick={() => setInstructions((p) => ({ ...p, safetyNotes: p.safetyNotes.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setInstructions((p) => ({ ...p, safetyNotes: [...p.safetyNotes, ""] }))}
                  className="mt-2 text-sm text-red-500 font-bold hover:text-red-700"
                >
                  + Add safety note
                </button>
              </div>

              <button
                onClick={saveInstructions}
                className="w-full bg-emerald-500 text-white rounded-2xl py-3 font-black hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight size={18} /> Save Instructions
              </button>
            </div>
          )}

          {!generating && instructions.steps.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <p className="font-semibold">Click &ldquo;Generate with AI&rdquo; to create instructions,</p>
              <p className="text-sm">or add steps manually below.</p>
              <button
                onClick={() => setInstructions((p) => ({ ...p, steps: [""] }))}
                className="mt-3 text-violet-500 font-bold text-sm hover:text-violet-700"
              >
                + Add steps manually
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Chore Dialog */}
      <Dialog open={showNewChore} onOpenChange={setShowNewChore}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Add New Chore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-violet-50 p-3">
              <Label className="font-bold text-violet-800">Prompt</Label>
              <Textarea
                value={chorePrompt}
                onChange={(e) => setChorePrompt(e.target.value)}
                placeholder="Example: Create a chore for a 9 year old to tidy the living room before bedtime"
                className="mt-1 min-h-20 resize-none rounded-xl bg-white"
              />
              <button
                type="button"
                onClick={generateChoreDraft}
                disabled={draftingChore || chorePrompt.trim().length < 4}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white hover:bg-violet-600 disabled:opacity-50"
              >
                <Wand2 size={16} /> {draftingChore ? "Filling fields..." : "Fill Fields with AI"}
              </button>
            </div>
            <div className="flex gap-3">
              <div className="w-20">
                <Label className="font-bold">Icon</Label>
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === "new" ? null : "new")}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  {newChore.icon}
                </button>
              </div>
              <div className="flex-1">
                <Label className="font-bold">Name</Label>
                <Input
                  value={newChore.name}
                  onChange={(e) => setNewChore((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Chore name"
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="font-bold">Description</Label>
              <Textarea
                value={newChore.description}
                onChange={(e) => setNewChore((p) => ({ ...p, description: e.target.value }))}
                placeholder="What should this chore cover?"
                className="rounded-xl mt-1 resize-none"
                rows={2}
              />
            </div>
            {showEmojiPicker === "new" && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl max-h-40 overflow-y-auto border border-slate-200">
                {CHORE_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setNewChore((p) => ({ ...p, icon: e })); setShowEmojiPicker(null); }}
                    className={`text-2xl p-1.5 rounded-xl hover:bg-white transition-colors ${newChore.icon === e ? "bg-violet-100 ring-2 ring-violet-400" : ""}`}
                  >{e}</button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="font-bold">Age Min</Label>
                <Input type="number" value={newChore.ageMin} min={2} max={18}
                  onChange={(e) => setNewChore((p) => ({ ...p, ageMin: parseInt(e.target.value) }))}
                  className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="font-bold">Age Max</Label>
                <Input type="number" value={newChore.ageMax} min={2} max={18}
                  onChange={(e) => setNewChore((p) => ({ ...p, ageMax: parseInt(e.target.value) }))}
                  className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="font-bold">Points</Label>
                <Input type="number" value={newChore.pointsValue} min={1} max={100}
                  onChange={(e) => setNewChore((p) => ({ ...p, pointsValue: parseInt(e.target.value) }))}
                  className="rounded-xl mt-1" />
              </div>
            </div>
            <div>
              <Label className="font-bold">Category</Label>
              <Select value={newChore.category} onValueChange={(v) => setNewChore((p) => ({ ...p, category: v ?? "other" }))}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHORE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={addChore}
              className="w-full bg-blue-500 text-white rounded-xl py-3 font-black hover:bg-blue-600 transition-colors"
            >
              Add Chore
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Start Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Child Quick Start Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {CHORE_TEMPLATES_BY_AGE.map((group) => (
              <div key={group.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-800">{group.label}</h3>
                    <p className="text-xs font-bold text-slate-400">{group.chores.length} ready-to-add chores</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTemplateGroup(group)}
                    className="rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white hover:bg-violet-600"
                  >
                    Add Set
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.chores.map((chore) => (
                    <div key={chore.name} className="rounded-xl bg-white p-3">
                      <p className="font-black text-slate-700">{chore.icon} {chore.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {CHORE_CATEGORIES.find((category) => category.value === chore.category)?.icon} {chore.category} • ⭐ {chore.pointsValue}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Chore Dialog */}
      <Dialog open={!!editingChore} onOpenChange={(o) => !o && setEditingChore(null)}>
        <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Chore</DialogTitle>
          </DialogHeader>
          {editingChore && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-20">
                  <Label className="font-bold">Icon</Label>
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === "edit" ? null : "edit")}
                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    {editingChore.icon}
                  </button>
                </div>
                <div className="flex-1">
                  <Label className="font-bold">Name</Label>
                  <Input
                    value={editingChore.name}
                    onChange={(e) => setEditingChore((p) => p && ({ ...p, name: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
              {showEmojiPicker === "edit" && (
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl max-h-40 overflow-y-auto border border-slate-200">
                  {CHORE_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => { setEditingChore((p) => p && ({ ...p, icon: e })); setShowEmojiPicker(null); }}
                      className={`text-2xl p-1.5 rounded-xl hover:bg-white transition-colors ${editingChore.icon === e ? "bg-violet-100 ring-2 ring-violet-400" : ""}`}
                    >{e}</button>
                  ))}
                </div>
              )}
              <div>
                <Label className="font-bold">Card Color</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="color"
                    value={editingChore.color}
                    onChange={(e) => setEditingChore((p) => p && ({ ...p, color: e.target.value }))}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-slate-500">{editingChore.color}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="font-bold">Age Min</Label>
                  <Input type="number" value={editingChore.ageMin} min={2} max={18}
                    onChange={(e) => setEditingChore((p) => p && ({ ...p, ageMin: parseInt(e.target.value) }))}
                    className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="font-bold">Age Max</Label>
                  <Input type="number" value={editingChore.ageMax} min={2} max={18}
                    onChange={(e) => setEditingChore((p) => p && ({ ...p, ageMax: parseInt(e.target.value) }))}
                    className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="font-bold">Points</Label>
                  <Input type="number" value={editingChore.pointsValue} min={1} max={100}
                    onChange={(e) => setEditingChore((p) => p && ({ ...p, pointsValue: parseInt(e.target.value) }))}
                    className="rounded-xl mt-1" />
                </div>
              </div>
              <div>
                <Label className="font-bold">Category</Label>
                <Select
                  value={editingChore.category}
                  onValueChange={(v) => setEditingChore((p) => p && ({ ...p, category: v ?? "other" }))}
                >
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHORE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-requires-photo"
                  checked={editingChore.requiresPhoto}
                  onChange={(e) => setEditingChore((p) => p && ({ ...p, requiresPhoto: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <Label htmlFor="edit-requires-photo" className="font-bold cursor-pointer">
                  📸 Requires before/after photo proof
                </Label>
              </div>
              <button
                onClick={saveEditChore}
                className="w-full bg-slate-800 text-white rounded-xl py-3 font-black hover:bg-slate-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
