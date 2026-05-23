"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Wand2, BookOpen, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CHORE_CATEGORIES } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [newChore, setNewChore] = useState({ name: "", icon: "✅", color: "#e0e7ff", ageMin: 6, ageMax: 18, pointsValue: 10, category: "other", requiresPhoto: false });

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

  async function addChore() {
    if (!newChore.name) { toast.error("Name required"); return; }
    await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChore),
    });
    toast.success("Chore added!");
    setShowNewChore(false);
    setNewChore({ name: "", icon: "✅", color: "#e0e7ff", ageMin: 6, ageMax: 18, pointsValue: 10, category: "other", requiresPhoto: false });
    load();
  }

  async function deleteChore(id: number) {
    if (!confirm("Delete this chore?")) return;
    await fetch(`/api/chores?id=${id}`, { method: "DELETE" });
    toast.success("Chore deleted");
    load();
  }

  const filtered = filterCat === "all" ? chores : chores.filter((c) => c.category === filterCat);

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-3xl font-black text-slate-800 flex-1">📋 Chore Library</h1>
        <button
          onClick={() => setShowNewChore(true)}
          className="flex items-center gap-2 bg-blue-500 text-white rounded-2xl px-4 py-2.5 font-bold hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} /> New Chore
        </button>
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
            className="rounded-2xl p-4 bg-white shadow-sm flex items-center gap-4"
            style={{ borderLeft: `4px solid ${chore.color}` }}
          >
            <div className="text-3xl">{chore.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-800">{chore.name}</span>
                {chore.instructions && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs font-bold">Has Guide ✓</Badge>
                )}
              </div>
              <div className="flex gap-3 mt-1 text-xs font-semibold text-slate-500">
                <span>Ages {chore.ageMin}–{chore.ageMax}</span>
                <span>⭐ {chore.pointsValue} pts</span>
                <span>{CHORE_CATEGORIES.find((c) => c.value === chore.category)?.icon} {chore.category}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openInstructions(chore)}
                className="flex items-center gap-1 bg-indigo-50 text-indigo-600 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-indigo-100 transition-colors"
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
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Add New Chore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20">
                <Label className="font-bold">Icon</Label>
                <Input
                  value={newChore.icon}
                  onChange={(e) => setNewChore((p) => ({ ...p, icon: e.target.value }))}
                  className="rounded-xl mt-1 text-center text-2xl"
                  maxLength={2}
                />
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
    </div>
  );
}
