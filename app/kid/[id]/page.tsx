"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, ChevronRight, Lightbulb, Shield, BookOpen } from "lucide-react";
import { getLevelFromPoints, getLevelTitle, getPointsForNextLevel } from "@/lib/points";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface Chore {
  id: number;
  name: string;
  icon: string;
  color: string;
  pointsValue: number;
  requiresPhoto: boolean;
  instructions?: {
    steps: string;
    tips: string;
    safetyNotes: string;
  } | null;
}

interface Assignment {
  id: number;
  choreId: number;
  frequency: string;
  dueDate: string | null;
  chore: Chore;
  completions: { id: number; completedAt: string }[];
}

interface Member {
  id: number;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;
  level: number;
  age: number;
}

export default function KidPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedChore, setSelectedChore] = useState<Assignment | null>(null);
  const [instructionStep, setInstructionStep] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [activeCompletion, setActiveCompletion] = useState<number | null>(null);
  const [celebratePoints, setCelebratePoints] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [membersRes, assignRes] = await Promise.all([
      fetch("/api/members"),
      fetch(`/api/assignments?memberId=${id}`),
    ]);
    const members: Member[] = await membersRes.json();
    const found = members.find((m) => m.id === parseInt(id));
    setMember(found ?? null);
    setAssignments(await assignRes.json());
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function markDone(assignment: Assignment) {
    const res = await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id, memberId: parseInt(id) }),
    });
    const data = await res.json();
    setCelebratePoints(data.pointsEarned);
    setTimeout(() => setCelebratePoints(null), 3000);
    await loadData();

    if (assignment.chore.requiresPhoto) {
      setActiveCompletion(data.completion.id);
      setPhotoType("before");
      setShowPhoto(true);
    }
  }

  async function uploadPhoto(file: File, completionId: number, type: "before" | "after") {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    form.append("memberId", id);
    await fetch(`/api/completions/${completionId}/photo`, { method: "POST", body: form });
    toast.success(`${type === "before" ? "Before" : "After"} photo saved!`);
    if (type === "before") {
      setPhotoType("after");
    } else {
      setShowPhoto(false);
      setActiveCompletion(null);
    }
  }

  function openInstructions(assignment: Assignment) {
    setSelectedChore(assignment);
    setInstructionStep(0);
    setShowInstructions(true);
  }

  if (!member) return <div className="p-6 text-center text-slate-400 font-bold">Loading...</div>;

  const progress = getPointsForNextLevel(member.totalPoints);
  const dailyChores = assignments.filter((a) => a.frequency === "daily");
  const weeklyChores = assignments.filter((a) => a.frequency === "weekly");
  const specialChores = assignments.filter((a) => a.frequency === "one-time");

  const steps = selectedChore?.chore.instructions
    ? (JSON.parse(selectedChore.chore.instructions.steps) as string[])
    : [];
  const tips = selectedChore?.chore.instructions
    ? (JSON.parse(selectedChore.chore.instructions.tips) as string[])
    : [];
  const safetyNotes = selectedChore?.chore.instructions
    ? (JSON.parse(selectedChore.chore.instructions.safetyNotes) as string[])
    : [];

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Celebrate overlay */}
      <AnimatePresence>
        {celebratePoints && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-white rounded-full px-8 py-4 text-2xl font-black shadow-2xl"
          >
            🎉 +{celebratePoints} points!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/")} className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{member.avatar}</span>
            <div>
              <h1 className="text-2xl font-black text-slate-800">{member.name}&apos;s Chores</h1>
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: member.color }} className="text-white font-bold text-xs">
                  Lv.{getLevelFromPoints(member.totalPoints)} {getLevelTitle(getLevelFromPoints(member.totalPoints))}
                </Badge>
                <span className="text-slate-500 text-sm font-semibold">⭐ {member.totalPoints} pts</span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Level progress</span>
              <span>{progress.current}/{progress.next} XP</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Chore sections */}
      {assignments.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎈</div>
          <h2 className="text-xl font-bold text-slate-600">No chores assigned yet!</h2>
          <p className="text-slate-400 mt-1">Ask a parent to assign some chores.</p>
        </div>
      )}

      {[
        { label: "📋 Daily Chores", chores: dailyChores },
        { label: "📅 Weekly Chores", chores: weeklyChores },
        { label: "⭐ Special Tasks", chores: specialChores },
      ].map(({ label, chores }) =>
        chores.length === 0 ? null : (
          <div key={label} className="mb-8">
            <h2 className="text-lg font-black text-slate-700 mb-3">{label}</h2>
            <div className="space-y-3">
              {chores.map((assignment) => {
                const done = assignment.completions.length > 0;
                const hasInstructions = !!assignment.chore.instructions;

                return (
                  <motion.div
                    key={assignment.id}
                    layout
                    className="rounded-2xl p-4 shadow-sm relative overflow-hidden"
                    style={{
                      backgroundColor: done ? "#f0fdf4" : assignment.chore.color,
                      border: `2px solid ${done ? "#86efac" : assignment.chore.color + "88"}`,
                      opacity: done ? 0.75 : 1,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{assignment.chore.icon}</div>
                      <div className="flex-1">
                        <h3 className={`font-black text-slate-800 text-lg ${done ? "line-through text-slate-400" : ""}`}>
                          {assignment.chore.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-500">⭐ {assignment.chore.pointsValue} pts</span>
                          {assignment.chore.requiresPhoto && (
                            <span className="text-xs font-bold text-blue-500 flex items-center gap-1">
                              <Camera size={10} /> Photo required
                            </span>
                          )}
                          {assignment.dueDate && (
                            <span className="text-xs font-bold text-orange-500">
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {hasInstructions && !done && (
                          <button
                            onClick={() => openInstructions(assignment)}
                            className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md transition-shadow"
                            title="How to do this"
                          >
                            <BookOpen size={18} className="text-indigo-500" />
                          </button>
                        )}
                        {!done ? (
                          <button
                            onClick={() => markDone(assignment)}
                            className="bg-emerald-400 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 font-bold text-sm transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 size={16} /> Done!
                          </button>
                        ) : (
                          <div className="bg-emerald-100 text-emerald-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-1">
                            <CheckCircle2 size={16} /> Done ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* How To Instructions Modal */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              {selectedChore?.chore.icon} How to: {selectedChore?.chore.name}
            </DialogTitle>
          </DialogHeader>

          {steps.length > 0 && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-500">
                    Step {instructionStep + 1} of {steps.length}
                  </span>
                  <Progress value={((instructionStep + 1) / steps.length) * 100} className="w-32 h-2" />
                </div>
                <motion.div
                  key={instructionStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-indigo-50 rounded-2xl p-4 text-slate-800 font-bold text-lg"
                >
                  <span className="text-2xl font-black text-indigo-300 mr-3">{instructionStep + 1}.</span>
                  {steps[instructionStep]}
                </motion.div>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={instructionStep === 0}
                  onClick={() => setInstructionStep((s) => s - 1)}
                  className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2 font-bold disabled:opacity-30"
                >
                  ← Back
                </button>
                {instructionStep < steps.length - 1 ? (
                  <button
                    onClick={() => setInstructionStep((s) => s + 1)}
                    className="flex-1 bg-indigo-500 text-white rounded-xl py-2 font-bold flex items-center justify-center gap-1"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowInstructions(false);
                      markDone(selectedChore!);
                    }}
                    className="flex-1 bg-emerald-500 text-white rounded-xl py-2 font-bold"
                  >
                    I&apos;m Ready! 🚀
                  </button>
                )}
              </div>

              {tips.length > 0 && (
                <div className="mt-4 bg-yellow-50 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700">Tips</span>
                  </div>
                  {tips.map((tip, i) => (
                    <p key={i} className="text-sm text-yellow-800 font-semibold">• {tip}</p>
                  ))}
                </div>
              )}

              {safetyNotes.length > 0 && (
                <div className="mt-3 bg-red-50 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-red-700">Safety First</span>
                  </div>
                  {safetyNotes.map((note, i) => (
                    <p key={i} className="text-sm text-red-800 font-semibold">• {note}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {steps.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No instructions added yet.</p>
              <p className="text-sm">Ask a parent to add a guide!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo upload modal */}
      <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">
              📸 {photoType === "before" ? "Before" : "After"} Photo
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-500 font-semibold text-sm">
            Take a photo to show {photoType === "before" ? "the mess before you start" : "your great work"}!
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-violet-50 file:text-violet-700"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && activeCompletion) uploadPhoto(file, activeCompletion, photoType);
            }}
          />
          <button
            onClick={() => setShowPhoto(false)}
            className="w-full bg-slate-100 text-slate-600 rounded-xl py-2 font-bold text-sm"
          >
            Skip for now
          </button>
        </DialogContent>
      </Dialog>

      <div className="mt-8 text-center">
        <Link href="/" className="text-slate-400 font-semibold text-sm hover:text-slate-600">
          ← Back to Family Dashboard
        </Link>
      </div>
    </div>
  );
}
