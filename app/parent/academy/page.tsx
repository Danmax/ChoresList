"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, ClipboardList, GraduationCap, Plus, Trophy, Wand2 } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: string;
};

type Material = {
  id: string;
  prompt: string;
  answer: string;
  choices?: string[] | null;
};

type MaterialSet = {
  id: string;
  title: string;
  subject: string;
  mode: string;
  passingScore: number;
  pointsReward: number;
  materials: Material[];
  _count?: { assignments: number };
};

type Assignment = {
  id: string;
  title: string;
  status: string;
  passingScore: number;
  pointsReward: number;
  dueDate?: string | null;
  member: Pick<Member, "id" | "name" | "avatar" | "color">;
  set: Pick<MaterialSet, "id" | "title" | "subject" | "mode">;
  attempts: { id: string; score: number; passed: boolean; completedAt: string }[];
};

type Project = {
  id: string;
  title: string;
  subject: string;
  status: string;
  pointsReward: number;
  dueDate?: string | null;
  member?: Pick<Member, "id" | "name" | "avatar" | "color"> | null;
};

const SUBJECTS = [
  { value: "sight-words", label: "Sight Words" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "facts", label: "Facts" },
  { value: "history", label: "History" },
  { value: "metrics", label: "Metrics" },
  { value: "trivia", label: "Lightning Trivia" },
  { value: "exercise", label: "Real-Life Exercise" },
];

const MODES = [
  { value: "flashcards", label: "Flashcards" },
  { value: "lightning", label: "Lightning" },
  { value: "drill", label: "Drill" },
  { value: "exam", label: "Exam" },
  { value: "real-life", label: "Real-Life" },
];

const DEFAULT_SET = {
  title: "",
  subject: "vocabulary",
  mode: "drill",
  passingScore: 85,
  pointsReward: 10,
  description: "",
  materialsText: "apple | a fruit\nmeasure 1 meter | 100 centimeters",
};

const DEFAULT_ASSIGNMENT = {
  memberId: "",
  setId: "",
  title: "",
  dueDate: "",
};

const DEFAULT_PROJECT = {
  memberId: "",
  title: "",
  subject: "project",
  description: "",
  rubric: "",
  dueDate: "",
  pointsReward: 25,
};

function subjectLabel(subject: string) {
  return SUBJECTS.find((item) => item.value === subject)?.label ?? subject;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date";
}

export default function ParentAcademyPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [sets, setSets] = useState<MaterialSet[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [setDraft, setSetDraft] = useState(DEFAULT_SET);
  const [assignmentDraft, setAssignmentDraft] = useState(DEFAULT_ASSIGNMENT);
  const [projectDraft, setProjectDraft] = useState(DEFAULT_PROJECT);
  const [lessonPrompt, setLessonPrompt] = useState("");
  const [lessonItemCount, setLessonItemCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [loadError, setLoadError] = useState("");

  const activeAssignments = useMemo(() => assignments.filter((assignment) => assignment.status !== "archived"), [assignments]);
  const completedCount = activeAssignments.filter((assignment) => assignment.status === "completed").length;
  const passRate = activeAssignments.length ? Math.round((completedCount / activeAssignments.length) * 100) : 0;

  const load = useCallback(async () => {
    const res = await fetch("/api/education/parent");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLoadError(data?.error ?? "Could not load Education Academy");
      setLoading(false);
      return;
    }
    setMembers(Array.isArray(data.members) ? data.members : []);
    setSets(Array.isArray(data.sets) ? data.sets : []);
    setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    setProjects(Array.isArray(data.projects) ? data.projects : []);
    setLoadError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>, success: string, savingKey: string) {
    setSaving(savingKey);
    try {
      const res = await fetch("/api/education/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save academy item");
        return false;
      }
      toast.success(success);
      await load();
      return true;
    } finally {
      setSaving("");
    }
  }

  async function createSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await post(setDraft, "Material set created", "set");
    if (ok) setSetDraft(DEFAULT_SET);
  }

  async function generateLessonDraft() {
    if (lessonPrompt.trim().length < 4) {
      toast.error("Describe the lesson topic first");
      return;
    }

    setSaving("lesson-ai");
    try {
      const res = await fetch("/api/education/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: lessonPrompt, itemCount: lessonItemCount }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not draft lesson");
        return;
      }
      setSetDraft((current) => ({ ...current, ...data.draft }));
      toast.success("Lesson draft filled in");
    } finally {
      setSaving("");
    }
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedSet = sets.find((set) => String(set.id) === assignmentDraft.setId);
    const ok = await post(
      {
        action: "assignment",
        ...assignmentDraft,
        title: assignmentDraft.title || selectedSet?.title || "Academy work",
        passingScore: selectedSet?.passingScore ?? 85,
        pointsReward: selectedSet?.pointsReward ?? 10,
      },
      "Assignment created",
      "assignment"
    );
    if (ok) setAssignmentDraft(DEFAULT_ASSIGNMENT);
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await post({ action: "project", ...projectDraft }, "Project created", "project");
    if (ok) setProjectDraft(DEFAULT_PROJECT);
  }

  async function completeProject(project: Project) {
    setSaving(`project-${project.id}`);
    try {
      const res = await fetch("/api/education/parent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "project", id: project.id, status: "completed" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not complete project");
        return;
      }
      toast.success("Project completed");
      await load();
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading academy...</div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <Link href="/parent" className="mb-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm">
          <ArrowLeft size={18} /> Parent Panel
        </Link>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-800">Merit Education Academy</h1>
          <p className="mt-2 font-semibold text-slate-500">{loadError}</p>
          <Link href="/parent/settings" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700">
            Open Feature Plugins
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parent" className="rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800 sm:text-3xl">
              <GraduationCap className="text-blue-600" /> Merit Education Academy
            </h1>
            <p className="text-sm font-semibold text-slate-500">Assign drills, exams, flashcards, real-life exercises, and projects to any family member.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white px-4 py-2 shadow-sm">
            <p className="text-xl font-black text-slate-800">{sets.length}</p>
            <p className="text-xs font-black uppercase text-slate-400">Sets</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-2 shadow-sm">
            <p className="text-xl font-black text-slate-800">{activeAssignments.length}</p>
            <p className="text-xs font-black uppercase text-slate-400">Assigned</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-2 shadow-sm">
            <p className="text-xl font-black text-slate-800">{passRate}%</p>
            <p className="text-xs font-black uppercase text-slate-400">Complete</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BookOpenCheck size={20} className="text-blue-600" />
              <h2 className="font-black text-slate-800">Material Sets</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sets.map((set) => (
                <div key={set.id} className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-800">{set.title}</h3>
                      <p className="text-sm font-semibold text-slate-500">{subjectLabel(set.subject)} · {set.mode} · {set.materials.length} items</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">{set.passingScore}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                    <span className="rounded-full bg-white px-2 py-1">{set.pointsReward} pts</span>
                    <span className="rounded-full bg-white px-2 py-1">{set._count?.assignments ?? 0} assignments</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {set.materials.slice(0, 3).map((material) => (
                      <p key={material.id} className="truncate text-sm font-semibold text-slate-500">{material.prompt} → {material.answer}</p>
                    ))}
                  </div>
                </div>
              ))}
              {sets.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-slate-100 p-6 text-center font-bold text-slate-400">Create the first lesson set to start assigning academy work.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              <h2 className="font-black text-slate-800">Assignments & Results</h2>
            </div>
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const latest = assignment.attempts[0];
                return (
                  <div key={assignment.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl">{assignment.member.avatar}</span>
                        <h3 className="font-black text-slate-800">{assignment.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase ${assignment.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {assignment.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {assignment.member.name} · {subjectLabel(assignment.set.subject)} · Due {formatDate(assignment.dueDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-600">Pass {assignment.passingScore}%</span>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-600">{assignment.pointsReward} pts</span>
                      {latest && (
                        <span className={`rounded-full px-3 py-1 text-sm font-black ${latest.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          Last {latest.score}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {assignments.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-slate-100 p-6 text-center font-bold text-slate-400">No academy assignments yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy size={20} className="text-blue-600" />
              <h2 className="font-black text-slate-800">Projects</h2>
            </div>
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-black text-slate-800">{project.title}</h3>
                    <p className="text-sm font-semibold text-slate-500">
                      {project.member ? `${project.member.avatar} ${project.member.name} · ` : ""}{project.subject} · Due {formatDate(project.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-600">{project.status}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-600">{project.pointsReward} pts</span>
                    {project.status === "submitted" && (
                      <button
                        onClick={() => completeProject(project)}
                        disabled={saving === `project-${project.id}`}
                        className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-slate-100 p-6 text-center font-bold text-slate-400">No education projects yet.</p>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section id="lesson-builder" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Wand2 size={18} className="text-blue-600" />
              <h2 className="font-black text-slate-800">Build Lesson with AI</h2>
            </div>
            <div className="space-y-3">
              <textarea
                value={lessonPrompt}
                onChange={(e) => setLessonPrompt(e.target.value)}
                placeholder="Topic, age, and goal. Example: 10 third-grade questions about fractions with real-life food examples"
                rows={4}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300"
              />
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-black uppercase text-slate-400">Cards</p>
                  <p className="font-black text-slate-700">{lessonItemCount} items</p>
                </div>
                <input
                  type="number"
                  min={4}
                  max={24}
                  value={lessonItemCount}
                  onChange={(e) => setLessonItemCount(Math.min(24, Math.max(4, Number(e.target.value) || 10)))}
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300"
                />
              </div>
              <button
                type="button"
                onClick={generateLessonDraft}
                disabled={saving === "lesson-ai"}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 font-black text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <Wand2 size={18} /> {saving === "lesson-ai" ? "Building..." : "Draft Lesson"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              <h2 className="font-black text-slate-800">Load Daily Material</h2>
            </div>
            <form onSubmit={createSet} className="space-y-3">
              <input value={setDraft.title} onChange={(e) => setSetDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Set title" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <div className="grid grid-cols-2 gap-2">
                <select value={setDraft.subject} onChange={(e) => setSetDraft((d) => ({ ...d, subject: e.target.value }))} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300">
                  {SUBJECTS.map((subject) => <option key={subject.value} value={subject.value}>{subject.label}</option>)}
                </select>
                <select value={setDraft.mode} onChange={(e) => setSetDraft((d) => ({ ...d, mode: e.target.value }))} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300">
                  {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
              </div>
              <textarea value={setDraft.description} onChange={(e) => setSetDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Lesson description" rows={3} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={1} max={100} value={setDraft.passingScore} onChange={(e) => setSetDraft((d) => ({ ...d, passingScore: Number(e.target.value) }))} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
                <input type="number" min={0} value={setDraft.pointsReward} onChange={(e) => setSetDraft((d) => ({ ...d, pointsReward: Number(e.target.value) }))} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              </div>
              <textarea value={setDraft.materialsText} onChange={(e) => setSetDraft((d) => ({ ...d, materialsText: e.target.value }))} rows={7} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm outline-none focus:border-blue-300" />
              <p className="text-xs font-bold text-slate-400">Format: prompt | answer | optional choices | optional explanation</p>
              <button disabled={saving === "set"} className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 font-black text-white hover:bg-blue-700 disabled:opacity-40">
                {saving === "set" ? "Saving..." : "Create Material Set"}
              </button>
            </form>
          </section>

          <section id="assign-academy" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-black text-slate-800">Assign Academy Work</h2>
            <p className="mb-4 text-xs font-bold text-slate-400">Assign a drill, flashcard set, exam, or exercise to any family member.</p>
            <form onSubmit={createAssignment} className="space-y-3">
              <select value={assignmentDraft.memberId} onChange={(e) => setAssignmentDraft((d) => ({ ...d, memberId: e.target.value }))} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300">
                <option value="">Choose family member</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name} · {member.role}</option>)}
              </select>
              <select value={assignmentDraft.setId} onChange={(e) => setAssignmentDraft((d) => ({ ...d, setId: e.target.value }))} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300">
                <option value="">Choose material set</option>
                {sets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}
              </select>
              <input value={assignmentDraft.title} onChange={(e) => setAssignmentDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Optional assignment title" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <input type="date" value={assignmentDraft.dueDate} onChange={(e) => setAssignmentDraft((d) => ({ ...d, dueDate: e.target.value }))} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <button disabled={saving === "assignment" || !assignmentDraft.memberId || !assignmentDraft.setId} className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 font-black text-white hover:bg-blue-700 disabled:opacity-40">
                Assign
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black text-slate-800">Create Project</h2>
            <form onSubmit={createProject} className="space-y-3">
              <select value={projectDraft.memberId} onChange={(e) => setProjectDraft((d) => ({ ...d, memberId: e.target.value }))} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300">
                <option value="">Choose family member</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name} · {member.role}</option>)}
              </select>
              <input value={projectDraft.title} onChange={(e) => setProjectDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Project title" className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <textarea value={projectDraft.description} onChange={(e) => setProjectDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Real-life exercise or project directions" rows={3} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <textarea value={projectDraft.rubric} onChange={(e) => setProjectDraft((d) => ({ ...d, rubric: e.target.value }))} placeholder="Completion rubric" rows={3} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={projectDraft.dueDate} onChange={(e) => setProjectDraft((d) => ({ ...d, dueDate: e.target.value }))} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
                <input type="number" min={0} value={projectDraft.pointsReward} onChange={(e) => setProjectDraft((d) => ({ ...d, pointsReward: Number(e.target.value) }))} className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-blue-300" />
              </div>
              <button disabled={saving === "project" || !projectDraft.memberId || !projectDraft.title} className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 font-black text-white hover:bg-blue-700 disabled:opacity-40">
                Create Project
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
