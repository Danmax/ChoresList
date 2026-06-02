"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, RefreshCw, Star, UserCheck } from "lucide-react";
import { toast } from "sonner";

const ADULT_ROLES = new Set(["mom", "dad", "parent"]);

type Member = {
  id: number;
  name: string;
  avatar: string;
  color: string;
  role: string;
  totalPoints: number;
};

type Assignment = {
  id: number;
  frequency: string;
  dueDate: string | null;
  dayOfWeek: number | null;
  member: Member;
  chore: {
    id: number;
    name: string;
    icon: string;
    color: string;
    pointsValue: number;
    requiresPhoto: boolean;
  };
  completions: { id: number; completedAt: string }[];
};

function membersFromResponse(data: unknown) {
  if (Array.isArray(data)) return data as Member[];
  if (data && typeof data === "object" && "members" in data && Array.isArray((data as { members?: unknown }).members)) {
    return (data as { members: Member[] }).members;
  }
  return [];
}

function taskDateLabel(assignment: Assignment) {
  if (assignment.frequency === "weekly" && assignment.dayOfWeek !== null) {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][assignment.dayOfWeek];
  }
  if (assignment.dueDate) return new Date(assignment.dueDate).toLocaleDateString();
  return null;
}

export default function ParentTasksPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const adultMembers = useMemo(() => members.filter((member) => ADULT_ROLES.has(member.role)), [members]);
  const selectedMember = adultMembers.find((member) => String(member.id) === selectedMemberId) ?? adultMembers[0] ?? null;

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/members");
    const data = await res.json().catch(() => null);
    const nextMembers = membersFromResponse(data);
    setMembers(nextMembers);
    const adults = nextMembers.filter((member) => ADULT_ROLES.has(member.role));
    setSelectedMemberId((current) => current || (adults[0]?.id ? String(adults[0].id) : ""));
  }, []);

  const loadAssignments = useCallback(async (memberId: string) => {
    if (!memberId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/assignments?memberId=${memberId}`);
    const data = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(data)) {
      toast.error(data?.error ?? "Could not load parent tasks");
      setAssignments([]);
    } else {
      setAssignments(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadAssignments(selectedMemberId);
  }, [loadAssignments, selectedMemberId]);

  async function markDone(assignment: Assignment) {
    setCompletingId(assignment.id);
    try {
      const res = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not complete task");
        await loadAssignments(selectedMemberId);
        return;
      }

      toast.success(`+${data.pointsEarned} points`);
      if (assignment.chore.requiresPhoto) {
        toast.message("Photo proof can be added from the member task screen.");
      }
      await loadAssignments(selectedMemberId);
      await loadMembers();
    } finally {
      setCompletingId(null);
    }
  }

  const openCount = assignments.filter((assignment) => assignment.completions.length === 0).length;
  const doneCount = assignments.length - openCount;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm transition-shadow hover:shadow-md">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">✅ Parent Tasks</h1>
          <p className="text-sm font-semibold text-slate-500">Complete chores assigned to adult family members.</p>
        </div>
        <button
          type="button"
          onClick={() => loadAssignments(selectedMemberId)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {adultMembers.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <UserCheck size={42} className="mx-auto mb-3 text-slate-300" />
          <h2 className="mb-2 text-xl font-black text-slate-700">No parent profiles yet</h2>
          <p className="mb-5 text-sm font-semibold text-slate-500">Add a Mom, Dad, or Parent family member before assigning parent chores.</p>
          <Link href="/parent/members" className="inline-flex rounded-2xl bg-violet-500 px-5 py-3 font-black text-white hover:bg-violet-600">
            Manage Family Members
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {adultMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMemberId(String(member.id))}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition-colors ${
                  selectedMemberId === String(member.id) ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{member.avatar}</span>
                <span>{member.name}</span>
              </button>
            ))}
          </div>

          {selectedMember && (
            <div className="mb-5 rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedMember.avatar}</span>
                  <div>
                    <p className="font-black text-slate-800">{selectedMember.name}</p>
                    <p className="flex items-center gap-1 text-sm font-bold text-slate-400">
                      <Star size={13} className="fill-yellow-400 text-yellow-400" /> {selectedMember.totalPoints} pts
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 text-sm font-black">
                  <span className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-700">Open {openCount}</span>
                  <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">Done {doneCount}</span>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center font-bold text-slate-400">Loading parent tasks...</div>
          ) : assignments.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <div className="mb-3 text-5xl">📭</div>
              <h2 className="mb-1 text-xl font-black text-slate-700">No parent chores due</h2>
              <p className="mb-5 text-sm font-semibold text-slate-500">Assign chores to this parent profile to complete them here.</p>
              <Link href="/parent/assign" className="inline-flex rounded-2xl bg-emerald-500 px-5 py-3 font-black text-white hover:bg-emerald-600">
                Assign Chores
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const done = assignment.completions.length > 0;
                const dateLabel = taskDateLabel(assignment);

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-3xl bg-white p-4 shadow-sm ${done ? "opacity-70" : ""}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                        style={{ backgroundColor: done ? "#dcfce7" : assignment.chore.color }}
                      >
                        {assignment.chore.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-lg font-black text-slate-800 ${done ? "line-through text-slate-400" : ""}`}>
                          {assignment.chore.name}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-black">
                          <span className="rounded-lg bg-slate-100 px-2 py-1 capitalize text-slate-600">{assignment.frequency}</span>
                          {dateLabel && <span className="rounded-lg bg-orange-50 px-2 py-1 text-orange-600">{dateLabel}</span>}
                          <span className="rounded-lg bg-violet-50 px-2 py-1 text-violet-600">+{assignment.chore.pointsValue} pts</span>
                          {assignment.chore.requiresPhoto && (
                            <span className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-blue-600">
                              <Camera size={12} /> Photo
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={done || completingId === assignment.id}
                        onClick={() => markDone(assignment)}
                        className="flex min-w-32 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-black text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        <CheckCircle2 size={18} />
                        {done ? "Done" : completingId === assignment.id ? "Saving" : "Done"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
