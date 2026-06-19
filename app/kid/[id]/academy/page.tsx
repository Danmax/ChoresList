"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, GraduationCap, Send, Zap } from "lucide-react";
import { toast } from "sonner";
import { choicesForDisplay } from "@/lib/education";

type Material = {
  id: string;
  prompt: string;
  answer: string;
  choices?: string[] | null;
  explanation?: string | null;
};

type Assignment = {
  id: string;
  title: string;
  status: string;
  passingScore: number;
  pointsReward: number;
  dueDate?: string | null;
  set: {
    id: string;
    title: string;
    subject: string;
    mode: string;
    materials: Material[];
  };
  attempts: { id: string; score: number; passed: boolean; completedAt: string }[];
};

type Project = {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  rubric?: string | null;
  status: string;
  pointsReward: number;
  dueDate?: string | null;
};

type Member = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;
};

type Result = {
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  passingScore: number;
  pointsAwarded: number;
  answers: {
    materialId: string;
    prompt: string;
    answer: string;
    correctAnswer: string;
    correct: boolean;
    explanation?: string | null;
  }[];
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date";
}

function answerValue(answers: Record<string, string>, materialId: string) {
  return answers[materialId] ?? "";
}

export default function KidAcademyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const memberId = id;
  const [member, setMember] = useState<Member | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/education/kid?memberId=${memberId}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLoadError(data?.error ?? "Could not load academy work");
      setLoading(false);
      return;
    }
    const nextAssignments = Array.isArray(data.assignments) ? data.assignments : [];
    setMember(data.member ?? null);
    setAssignments(nextAssignments);
    setProjects(Array.isArray(data.projects) ? data.projects : []);
    setSelectedId((current) => current ?? nextAssignments.find((assignment: Assignment) => assignment.status !== "completed")?.id ?? nextAssignments[0]?.id ?? null);
    setLoadError("");
    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => assignments.find((assignment) => assignment.id === selectedId) ?? null, [assignments, selectedId]);
  const activeAssignments = assignments.filter((assignment) => assignment.status !== "completed");
  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed");

  function selectAssignment(assignment: Assignment) {
    setSelectedId(assignment.id);
    setAnswers({});
    setFlipped({});
    setResult(null);
  }

  function setAnswer(materialId: string, value: string) {
    setAnswers((previous) => ({ ...previous, [materialId]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/education/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selected.id,
          memberId,
          answers: selected.set.materials.map((material) => ({ materialId: material.id, answer: answerValue(answers, material.id) })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not submit academy work");
        return;
      }
      setResult(data);
      toast.success(data.passed ? `Passed with ${data.score}%` : `Score: ${data.score}%`);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function submitProject(project: Project) {
    setSaving(true);
    try {
      const res = await fetch("/api/education/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not submit project");
        return;
      }
      toast.success("Project submitted for parent review");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading academy...</div>;
  }

  if (loadError || !member) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <button onClick={() => router.push(`/kid/${id}`)} className="mb-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm">
          <ArrowLeft size={18} /> Back
        </button>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-800">Academy</h1>
          <p className="mt-2 font-semibold text-slate-500">{loadError || "Member not found"}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <button onClick={() => router.push(`/kid/${id}`)} className="mt-1 shrink-0 rounded-2xl bg-white p-2 shadow-sm hover:shadow-md">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{member.avatar}</span>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-black text-slate-800 sm:text-2xl">
                <GraduationCap className="text-blue-600" /> {member.name}&apos;s Academy
              </h1>
              <p className="text-sm font-semibold text-slate-500">Pass with {selected?.passingScore ?? 85}% or higher to master the assignment.</p>
            </div>
          </div>
        </div>
        <Link href={`/kid/${id}`} className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
          Chores
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-black text-slate-800">Today&apos;s Work</h2>
            <div className="space-y-2">
              {activeAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  onClick={() => selectAssignment(assignment)}
                  className={`block w-full rounded-2xl p-3 text-left font-bold transition-colors ${selectedId === assignment.id ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-blue-50"}`}
                >
                  <span className="block">{assignment.title}</span>
                  <span className={`text-xs ${selectedId === assignment.id ? "text-blue-100" : "text-slate-400"}`}>
                    {assignment.set.mode} · {assignment.set.materials.length} cards · {formatDate(assignment.dueDate)}
                  </span>
                </button>
              ))}
              {activeAssignments.length === 0 && (
                <p className="rounded-2xl border-2 border-dashed border-slate-100 p-4 text-center font-bold text-slate-400">No academy work assigned.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-black text-slate-800">Completed</h2>
            <div className="space-y-2">
              {completedAssignments.slice(0, 6).map((assignment) => (
                <button key={assignment.id} onClick={() => selectAssignment(assignment)} className="block w-full rounded-2xl bg-emerald-50 p-3 text-left">
                  <span className="flex items-center gap-2 font-black text-emerald-700"><CheckCircle2 size={16} /> {assignment.title}</span>
                  <span className="text-xs font-bold text-emerald-500">Best recent score: {assignment.attempts[0]?.score ?? 0}%</span>
                </button>
              ))}
              {completedAssignments.length === 0 && <p className="text-sm font-bold text-slate-400">Nothing completed yet.</p>}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-black text-slate-800">Projects</h2>
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.id} className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-black text-slate-800">{project.title}</p>
                  <p className="text-xs font-bold text-slate-500">Due {formatDate(project.dueDate)} · {project.pointsReward} pts</p>
                  {project.description && <p className="mt-2 text-sm font-semibold text-slate-500">{project.description}</p>}
                  <button disabled={saving} onClick={() => submitProject(project)} className="mt-3 rounded-2xl bg-blue-600 px-3 py-1.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40">
                    Submit for Review
                  </button>
                </div>
              ))}
              {projects.length === 0 && <p className="text-sm font-bold text-slate-400">No projects assigned.</p>}
            </div>
          </section>
        </aside>

        <main className="rounded-3xl bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="py-16 text-center">
              <div className="mb-4 text-6xl">🎓</div>
              <h2 className="text-xl font-black text-slate-700">No assignment selected</h2>
              <p className="text-slate-400">Choose academy work from the left.</p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{selected.title}</h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {selected.set.title} · {selected.set.mode} · Pass {selected.passingScore}% · Earn {selected.pointsReward} pts
                  </p>
                </div>
                {selected.set.mode === "lightning" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-black text-yellow-700">
                    <Zap size={16} /> Lightning
                  </span>
                )}
              </div>

              {result && (
                <section className={`mb-5 rounded-3xl p-5 ${result.passed ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <h3 className={`text-xl font-black ${result.passed ? "text-emerald-700" : "text-amber-700"}`}>
                    {result.passed ? "Passed" : "Keep Practicing"} · {result.score}%
                  </h3>
                  <p className="mt-1 font-semibold text-slate-600">
                    {result.correctCount}/{result.totalCount} correct · Passing grade {result.passingScore}%{result.pointsAwarded ? ` · +${result.pointsAwarded} points` : ""}
                  </p>
                  {!result.passed && (
                    <div className="mt-4 space-y-2">
                      {result.answers.filter((answer) => !answer.correct).map((answer) => (
                        <div key={answer.materialId} className="rounded-2xl bg-white p-3 text-sm">
                          <p className="font-black text-slate-800">{answer.prompt}</p>
                          <p className="font-semibold text-red-500">Your answer: {answer.answer || "blank"}</p>
                          <p className="font-semibold text-emerald-600">Correct: {answer.correctAnswer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <form onSubmit={submit} className="space-y-4">
                {selected.set.materials.map((material, index) => {
                  const choices = choicesForDisplay(material.id, material.choices, material.answer);
                  return (
                    <section key={material.id} className="rounded-3xl border-2 border-slate-100 bg-slate-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-blue-500">Card {index + 1}</p>
                          <h3 className="text-lg font-black text-slate-800">{material.prompt}</h3>
                        </div>
                        {selected.set.mode === "flashcards" && (
                          <button type="button" onClick={() => setFlipped((state) => ({ ...state, [material.id]: !state[material.id] }))} className="rounded-2xl bg-white px-3 py-1.5 text-sm font-black text-blue-600 shadow-sm">
                            {flipped[material.id] ? "Hide" : "Flip"}
                          </button>
                        )}
                      </div>
                      {flipped[material.id] && (
                        <div className="mb-3 rounded-2xl bg-white p-3 font-black text-emerald-700">
                          {material.answer}
                        </div>
                      )}
                      {choices.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {choices.map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => setAnswer(material.id, choice)}
                              className={`rounded-2xl border-2 px-3 py-2 text-left font-bold ${answerValue(answers, material.id) === choice ? "border-blue-500 bg-blue-50 text-blue-700" : "border-white bg-white text-slate-600"}`}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          value={answerValue(answers, material.id)}
                          onChange={(event) => setAnswer(material.id, event.target.value)}
                          placeholder={selected.set.mode === "real-life" ? "Describe what you completed" : "Type your answer"}
                          className="w-full rounded-2xl border-2 border-white bg-white px-3 py-2 font-semibold outline-none focus:border-blue-300"
                        />
                      )}
                    </section>
                  );
                })}

                <button disabled={saving || selected.status === "completed"} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-40">
                  <Send size={18} /> {selected.status === "completed" ? "Already Passed" : saving ? "Submitting..." : "Submit Academy Work"}
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
