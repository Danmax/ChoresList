"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";

type Device = {
  id: number;
  name: string;
  mode: string;
  member: { id: number; name: string; avatar: string } | null;
};

type Assignment = {
  id: number;
  frequency: string;
  dueDate: string | null;
  member: {
    id: number;
    name: string;
    avatar: string;
    color: string;
    totalPoints: number;
    level: number;
  };
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

type Filter = "open" | "all" | "done";

export default function TaskScreenPage() {
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [sessionRes, tasksRes] = await Promise.all([
      fetch("/api/device/session"),
      fetch("/api/kid-device/tasks"),
    ]);

    if (sessionRes.status === 401 || tasksRes.status === 401) {
      router.replace("/pair");
      return;
    }

    if (sessionRes.ok) setDevice(await sessionRes.json());
    if (tasksRes.ok) setAssignments(await tasksRes.json());
    setLastUpdated(new Date());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const done = assignment.completions.length > 0;
      if (filter === "open") return !done;
      if (filter === "done") return done;
      return true;
    });
  }, [assignments, filter]);

  const stats = useMemo(() => {
    const done = assignments.filter((assignment) => assignment.completions.length > 0).length;
    return { done, total: assignments.length, open: assignments.length - done };
  }, [assignments]);

  async function markDone(assignment: Assignment) {
    setCompletingId(assignment.id);
    try {
      const res = await fetch("/api/kid-device/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not complete task");
        await load();
        return;
      }
      toast.success(`+${data.pointsEarned} points`);
      await load();
    } finally {
      setCompletingId(null);
    }
  }

  async function logout() {
    await fetch("/api/device/session", { method: "DELETE" });
    router.replace("/pair");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading tasks...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 sm:text-4xl">
                {device?.mode === "member" && device.member ? `${device.member.avatar} ${device.member.name}'s Tasks` : "Kids Task Board"}
              </h1>
              <p className="text-sm font-bold text-slate-400">
                {device?.name}
                {lastUpdated ? ` • Updated ${lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "open", label: `Open ${stats.open}` },
                { value: "all", label: `All ${stats.total}` },
                { value: "done", label: `Done ${stats.done}` },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as Filter)}
                  className={`rounded-2xl px-4 py-2 text-sm font-black transition-colors ${
                    filter === option.value
                      ? "bg-violet-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={load}
                className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-slate-200"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-500 transition-colors hover:bg-red-100"
              >
                <LogOut size={16} /> Unpair
              </button>
            </div>
          </div>
        </header>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-100 text-xs font-black uppercase text-slate-500">
                <tr>
                  {device?.mode !== "member" && <th className="px-4 py-4">Child</th>}
                  <th className="px-4 py-4">Task</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Points</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleAssignments.map((assignment) => {
                  const done = assignment.completions.length > 0;
                  return (
                    <tr key={assignment.id} className={done ? "bg-emerald-50/50 text-slate-400" : "text-slate-800"}>
                      {device?.mode !== "member" && (
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{assignment.member.avatar}</span>
                            <div>
                              <p className="font-black">{assignment.member.name}</p>
                              <p className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                <Star size={12} className="fill-yellow-400 text-yellow-400" /> {assignment.member.totalPoints} pts
                              </p>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: done ? "#dcfce7" : assignment.chore.color }}>
                            {assignment.chore.icon}
                          </span>
                          <div>
                            <p className={`text-lg font-black ${done ? "line-through" : ""}`}>{assignment.chore.name}</p>
                            {assignment.chore.requiresPhoto && <p className="text-xs font-bold text-blue-500">Photo task</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black capitalize text-slate-600">
                          {assignment.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-lg font-black">+{assignment.chore.pointsValue}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black ${
                          done ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"
                        }`}>
                          {done && <CheckCircle2 size={15} />} {done ? "Done" : "Open"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled={done || completingId === assignment.id}
                          onClick={() => markDone(assignment)}
                          className="inline-flex min-w-28 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-base font-black text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          <CheckCircle2 size={19} />
                          {done ? "Done" : completingId === assignment.id ? "Saving" : "Done"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleAssignments.length === 0 && (
            <div className="py-16 text-center">
              <div className="mb-3 text-6xl">✅</div>
              <p className="text-xl font-black text-slate-600">No tasks here</p>
              <p className="text-sm font-semibold text-slate-400">Try another filter or check back later.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
