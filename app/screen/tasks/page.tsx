"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, BookOpen, CalendarDays, Camera, CheckCircle2, Download, Gift, GraduationCap, Heart, ListPlus, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, Star, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPLETION_EMOJIS, WISH_CATEGORIES, WISH_EMOJIS } from "@/types";

type Device = {
  id: string;
  name: string;
  mode: string;
  member: { id: string; name: string; avatar: string } | null;
};

type Assignment = {
  id: string;
  frequency: string;
  dueDate: string | null;
  member: {
    id: string;
    name: string;
    avatar: string;
    color: string;
    totalPoints: number;
    level: number;
  };
  chore: {
    id: string;
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
  };
  completions: { id: string; completedAt: string; reactionEmoji?: string | null }[];
};

type ChoreGuide = {
  title: string;
  icon: string;
  steps: string[];
  tips: string[];
  safetyNotes: string[];
};

type CatalogMember = { id: string; name: string; avatar: string; color: string };
type CatalogChore = {
  id: string;
  name: string;
  icon: string;
  color: string;
  pointsValue: number;
  category: string;
  requiresPhoto: boolean;
};

type DashboardData = {
  members: { id: string; name: string; avatar: string; totalPoints: number; level: number }[];
  education: { id: string; memberId: string; title: string; dueDate: string | null; status: string; pointsReward: number; member: { name: string; avatar: string }; set: { subject: string; mode: string; _count: { materials: number } }; attempts: { score: number; passed: boolean }[] }[];
  projects: { id: string; title: string; dueDate: string | null; status: string; pointsReward: number; member: { name: string; avatar: string } | null }[];
  rewards: { id: string; rewardTitle: string; rewardEmoji: string; status: string; member: { name: string; avatar: string }; project: { title: string } }[];
  badges: { id: string; member: { name: string; avatar: string }; badge: { title: string; icon: string; description: string | null; xpReward: number }; group: { name: string } | null }[];
  classes: { id: string; title: string; eventType: string; date: string; location: string | null; group: { name: string }; classPlan: { lessonTitle: string; objectives: string | null; homework: string | null; badge: { title: string; icon: string } | null } | null }[];
  potlucks: { id: string; title: string; date: string; location: string | null; group: { name: string }; items: { id: string; title: string; quantity: string | null; note: string | null; status: string }[] }[];
};

const MOODS = [
  { value: "great", label: "Great", icon: "😄" },
  { value: "good", label: "Good", icon: "🙂" },
  { value: "okay", label: "Okay", icon: "😐" },
  { value: "sad", label: "Sad", icon: "😢" },
  { value: "frustrated", label: "Frustrated", icon: "😤" },
  { value: "tired", label: "Tired", icon: "😴" },
  { value: "overwhelmed", label: "Overwhelmed", icon: "😣" },
];

type Filter = "open" | "all" | "done";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function TaskScreenPage() {
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showWish, setShowWish] = useState(false);
  const [wishMemberId, setWishMemberId] = useState("");
  const [wish, setWish] = useState({ title: "", category: "toy", emoji: "🎮", note: "" });
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [catalogMembers, setCatalogMembers] = useState<CatalogMember[]>([]);
  const [catalogChores, setCatalogChores] = useState<CatalogChore[]>([]);
  const [taskMemberId, setTaskMemberId] = useState("");
  const [taskChoreId, setTaskChoreId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [activeCompletionId, setActiveCompletionId] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<ChoreGuide | null>(null);
  const [reactionAssignment, setReactionAssignment] = useState<Assignment | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [moodMemberId, setMoodMemberId] = useState("");
  const [mood, setMood] = useState("okay");
  const [moodNote, setMoodNote] = useState("");
  const [savingMood, setSavingMood] = useState(false);

  const load = useCallback(async () => {
    const [sessionRes, tasksRes, dashboardRes] = await Promise.all([
      fetch("/api/device/session"),
      fetch("/api/kid-device/tasks"),
      fetch("/api/kid-device/dashboard"),
    ]);

    if (sessionRes.status === 401 || tasksRes.status === 401) {
      router.replace("/pair");
      return;
    }

    if (sessionRes.ok) setDevice(await sessionRes.json());
    if (tasksRes.ok) setAssignments(await tasksRes.json());
    if (dashboardRes.ok) {
      const data = await dashboardRes.json();
      setDashboard(data);
      setMoodMemberId((current) => current || data.members?.[0]?.id || "");
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (device?.mode === "member" && device.member) {
      setWishMemberId(String(device.member.id));
    }
  }, [device]);

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

  async function markDone(assignment: Assignment, reactionEmoji: string) {
    setCompletingId(assignment.id);
    setReactionAssignment(null);
    try {
      const res = await fetch("/api/kid-device/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, reactionEmoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not complete task");
        await load();
        return;
      }
      toast.success(`+${data.pointsEarned} points`);
      if (assignment.chore.requiresPhoto && data.completion?.id) {
        setActiveCompletionId(data.completion.id);
        setPhotoType("before");
        setShowPhoto(true);
      }
      await load();
    } finally {
      setCompletingId(null);
    }
  }

  async function uploadPhoto(file: File, completionId: string, type: "before" | "after") {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);

    const res = await fetch(`/api/kid-device/completions/${completionId}/photo`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not save photo");
      return;
    }

    toast.success(`${type === "before" ? "Before" : "After"} photo saved`);
    if (type === "before") {
      setPhotoType("after");
    } else {
      setShowPhoto(false);
      setActiveCompletionId(null);
    }
  }

  function openWish() {
    setWish({ title: "", category: "toy", emoji: "🎮", note: "" });
    setWishMemberId(device?.mode === "member" && device.member ? String(device.member.id) : "");
    setShowWish(true);
  }

  async function openTaskPicker() {
    setCatalogLoading(true);
    setShowTaskPicker(true);
    try {
      const res = await fetch("/api/kid-device/tasks?catalog=1");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not load tasks");
        setShowTaskPicker(false);
        return;
      }
      setCatalogMembers(data.members ?? []);
      setCatalogChores(data.chores ?? []);
      const defaultMemberId =
        device?.mode === "member" && device.member
          ? String(device.member.id)
          : data.members?.[0]?.id
            ? String(data.members[0].id)
            : "";
      setTaskMemberId(defaultMemberId);
      setTaskChoreId(data.chores?.[0]?.id ? String(data.chores[0].id) : "");
    } finally {
      setCatalogLoading(false);
    }
  }

  function selectWishCategory(category: string) {
    const meta = WISH_CATEGORIES.find((item) => item.value === category);
    setWish((previous) => ({
      ...previous,
      category,
      emoji: WISH_EMOJIS[category]?.[0] ?? meta?.emoji ?? "🎁",
    }));
  }

  async function addWish() {
    if (!wishMemberId) {
      toast.error("Choose who this wish is for");
      return;
    }
    if (!wish.title.trim()) {
      toast.error("Add what you want");
      return;
    }

    const res = await fetch("/api/kid-device/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: wishMemberId, ...wish }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not add wish");
      return;
    }

    toast.success("Added to wish list");
    setShowWish(false);
  }

  async function addOneTimeTask() {
    if (!taskMemberId) {
      toast.error("Choose who this task is for");
      return;
    }
    if (!taskChoreId) {
      toast.error("Choose a task");
      return;
    }

    setAddingTask(true);
    try {
      const res = await fetch("/api/kid-device/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: taskMemberId, choreId: taskChoreId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add task");
        return;
      }

      toast.success("Task added for today");
      setShowTaskPicker(false);
      await load();
    } finally {
      setAddingTask(false);
    }
  }

  async function installApp() {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  async function logout() {
    if (!window.confirm("Unpair this device? It will need a new pairing code before it can show tasks again.")) return;
    await fetch("/api/device/session", { method: "DELETE" });
    router.replace("/pair");
  }

  async function saveMood() {
    if (!moodMemberId) return toast.error("Choose who is checking in");
    setSavingMood(true);
    try {
      const res = await fetch("/api/kid-device/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: moodMemberId, mood, note: moodNote }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return toast.error(data?.error ?? "Could not save check-in");
      setMoodNote("");
      toast.success("Check-in saved privately");
    } finally {
      setSavingMood(false);
    }
  }

  function parseGuideList(value?: string | null) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
    } catch {
      return [];
    }
  }

  function openGuide(assignment: Assignment) {
    const instructions = assignment.chore.instructions;
    if (!instructions) return;
    setActiveGuide({
      title: assignment.chore.name,
      icon: assignment.chore.icon,
      steps: parseGuideList(instructions.steps),
      tips: parseGuideList(instructions.tips),
      safetyNotes: parseGuideList(instructions.safetyNotes),
    });
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
              <button
                type="button"
                onClick={openWish}
                className="flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-700 transition-colors hover:bg-amber-200"
              >
                <Gift size={16} /> Add Wish
              </button>
              <button
                type="button"
                onClick={installApp}
                className="flex items-center gap-2 rounded-2xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-700 transition-colors hover:bg-blue-200"
              >
                <Download size={16} /> Install
              </button>
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

        {dashboard && (
          <div className="mb-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <DashboardPanel icon={<GraduationCap size={20} />} title="Education Assignments" color="blue">
              {dashboard.education.filter((item) => item.set.mode !== "drill").map((item) => (
                <DashboardRow key={item.id} icon={item.member.avatar} title={item.title} detail={`${item.set.mode} · ${item.set._count.materials} questions · +${item.pointsReward} pts${item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleDateString()}` : ""}`} />
              ))}
              {dashboard.education.filter((item) => item.set.mode !== "drill").length === 0 && <EmptyRow text="No education assignments" />}
            </DashboardPanel>

            <DashboardPanel icon={<Sparkles size={20} />} title="Practice Drills" color="violet">
              {dashboard.education.filter((item) => item.set.mode === "drill").map((item) => (
                <DashboardRow key={item.id} icon="⚡" title={`${item.member.avatar} ${item.title}`} detail={`${item.set.subject} · ${item.set._count.materials} questions${item.attempts[0] ? ` · last score ${item.attempts[0].score}%` : ""}`} />
              ))}
              {dashboard.education.filter((item) => item.set.mode === "drill").length === 0 && <EmptyRow text="No practice drills" />}
            </DashboardPanel>

            <DashboardPanel icon={<CalendarDays size={20} />} title="Classes & Practices" color="emerald">
              {dashboard.classes.map((item) => (
                <DashboardRow key={item.id} icon={item.eventType === "practice" ? "🏃" : "🏫"} title={item.classPlan?.lessonTitle || item.title} detail={`${item.group.name} · ${new Date(item.date).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${item.location ? ` · ${item.location}` : ""}`} />
              ))}
              {dashboard.classes.length === 0 && <EmptyRow text="No upcoming classes or practices" />}
            </DashboardPanel>

            <DashboardPanel icon={<Gift size={20} />} title="Rewards" color="amber">
              {dashboard.rewards.map((item) => <DashboardRow key={item.id} icon={item.rewardEmoji} title={`${item.member.avatar} ${item.rewardTitle}`} detail={`${item.status} · earned from ${item.project.title}`} />)}
              {dashboard.rewards.length === 0 && <EmptyRow text="No reward tickets yet" />}
            </DashboardPanel>

            <DashboardPanel icon={<Award size={20} />} title="Badges" color="pink">
              {dashboard.badges.map((item) => <DashboardRow key={item.id} icon={item.badge.icon} title={`${item.member.avatar} ${item.badge.title}`} detail={`${item.group?.name ?? "Household badge"} · +${item.badge.xpReward} XP`} />)}
              {dashboard.badges.length === 0 && <EmptyRow text="No badges earned yet" />}
            </DashboardPanel>

            <DashboardPanel icon={<Utensils size={20} />} title="Potluck Items to Bring" color="orange">
              {dashboard.potlucks.flatMap((event) => event.items.map((item) => (
                <DashboardRow key={item.id} icon="🥘" title={`${item.quantity ? `${item.quantity} ` : ""}${item.title}`} detail={`${event.title} · ${new Date(event.date).toLocaleDateString()}${event.location ? ` · ${event.location}` : ""}`} />
              )))}
              {dashboard.potlucks.length === 0 && <EmptyRow text="No assigned or claimed potluck items" />}
            </DashboardPanel>

            <section className="rounded-3xl bg-white p-4 shadow-sm lg:col-span-2 xl:col-span-3">
              <h2 className="flex items-center gap-2 font-black text-slate-800"><Heart size={20} className="text-rose-500" /> How are you feeling?</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">This check-in is private. The note is optional.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {device?.mode !== "member" && (
                  <select value={moodMemberId} onChange={(event) => setMoodMemberId(event.target.value)} className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-bold text-slate-700">
                    {dashboard.members.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name}</option>)}
                  </select>
                )}
                {MOODS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setMood(item.value)} className={`rounded-xl px-3 py-2 text-sm font-black ${mood === item.value ? "bg-rose-100 text-rose-700 ring-2 ring-rose-300" : "bg-slate-50 text-slate-600"}`}>{item.icon} {item.label}</button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input value={moodNote} maxLength={1000} onChange={(event) => setMoodNote(event.target.value)} placeholder="Optional note: What happened, or what would help?" className="rounded-xl" />
                <button type="button" onClick={saveMood} disabled={savingMood || !moodMemberId} className="rounded-xl bg-rose-500 px-5 py-2.5 font-black text-white disabled:opacity-50">{savingMood ? "Saving…" : "Save Check-in"}</button>
              </div>
            </section>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="divide-y divide-slate-100 md:hidden">
            {visibleAssignments.map((assignment) => {
              const done = assignment.completions.length > 0;
              const reactionEmoji = assignment.completions[0]?.reactionEmoji;
              return (
                <div key={assignment.id} className={`p-4 ${done ? "bg-emerald-50/50 text-slate-400" : "text-slate-800"}`}>
                  {device?.mode !== "member" && (
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-500">
                      <span className="text-2xl">{assignment.member.avatar}</span>
                      <span>{assignment.member.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" /> {assignment.member.totalPoints} pts
                      </span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: done ? "#dcfce7" : assignment.chore.color }}>
                      {assignment.chore.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg font-black ${done ? "line-through" : ""}`}>{assignment.chore.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize text-slate-600">{assignment.frequency}</span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">+{assignment.chore.pointsValue} pts</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${done ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-700"}`}>
                          {done && (reactionEmoji ? <span>{reactionEmoji}</span> : <CheckCircle2 size={14} />)} {done ? "Done" : "Open"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assignment.chore.requiresPhoto && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-500">
                            <Camera size={12} /> Photos
                          </span>
                        )}
                        {assignment.chore.instructions && (
                          <button
                            type="button"
                            onClick={() => openGuide(assignment)}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600 hover:bg-indigo-100"
                          >
                            <BookOpen size={12} /> Guide
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={done || completingId === assignment.id}
                    onClick={() => setReactionAssignment(assignment)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-base font-black text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <CheckCircle2 size={19} />
                    {done ? "Done" : completingId === assignment.id ? "Saving" : "Mark Done"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
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
                  const reactionEmoji = assignment.completions[0]?.reactionEmoji;
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
                            {assignment.chore.requiresPhoto && (
                              <p className="flex items-center gap-1 text-xs font-bold text-blue-500">
                                <Camera size={12} /> Before/after photos
                              </p>
                            )}
                            {assignment.chore.instructions && (
                              <button
                                type="button"
                                onClick={() => openGuide(assignment)}
                                className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600 hover:bg-indigo-100"
                              >
                                <BookOpen size={12} /> Guide
                              </button>
                            )}
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
                          {done && (reactionEmoji ? <span>{reactionEmoji}</span> : <CheckCircle2 size={15} />)} {done ? "Done" : "Open"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          disabled={done || completingId === assignment.id}
                          onClick={() => setReactionAssignment(assignment)}
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

      <Dialog open={showWish} onOpenChange={setShowWish}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Add Wish</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {device?.mode !== "member" && (
              <div>
                <Label className="font-bold text-slate-600">Child</Label>
                <select
                  value={wishMemberId}
                  onChange={(event) => setWishMemberId(event.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-bold text-slate-700 outline-none focus:border-amber-300"
                >
                  <option value="">Choose child</option>
                  {Array.from(new Map(assignments.map((assignment) => [assignment.member.id, assignment.member])).values()).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.avatar} {member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="font-bold text-slate-600">Category</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {WISH_CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => selectWishCategory(category.value)}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-black transition-colors ${
                      wish.category === category.value
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {category.emoji} {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-bold text-slate-600">Emoji</Label>
              <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-slate-50 p-2">
                {(WISH_EMOJIS[wish.category] ?? []).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setWish((previous) => ({ ...previous, emoji }))}
                    className={`rounded-xl p-1.5 text-2xl transition-colors ${wish.emoji === emoji ? "bg-white ring-2 ring-amber-300" : "hover:bg-white"}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-bold text-slate-600">I want...</Label>
              <Input
                value={wish.title}
                onChange={(event) => setWish((previous) => ({ ...previous, title: event.target.value }))}
                className="mt-1 rounded-xl font-bold"
                placeholder="LEGO set, shoes, movie night..."
              />
            </div>

            <div>
              <Label className="font-bold text-slate-600">Note</Label>
              <Input
                value={wish.note}
                onChange={(event) => setWish((previous) => ({ ...previous, note: event.target.value }))}
                className="mt-1 rounded-xl"
                placeholder="Optional"
              />
            </div>

            <button
              type="button"
              onClick={addWish}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-black text-white transition-colors hover:bg-amber-600"
            >
              <Plus size={18} /> Add Wish
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeGuide} onOpenChange={(open) => !open && setActiveGuide(null)}>
        <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">
              {activeGuide?.icon} {activeGuide?.title} Guide
            </DialogTitle>
          </DialogHeader>
          {activeGuide && (
            <div className="space-y-5">
              {activeGuide.steps.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    <BookOpen size={18} className="text-indigo-500" />
                    <h3 className="font-black">Steps</h3>
                  </div>
                  <ol className="space-y-2">
                    {activeGuide.steps.map((step, index) => (
                      <li key={`${step}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {activeGuide.tips.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    <Sparkles size={18} className="text-amber-500" />
                    <h3 className="font-black">Tips</h3>
                  </div>
                  <div className="space-y-2">
                    {activeGuide.tips.map((tip, index) => (
                      <p key={`${tip}-${index}`} className="rounded-2xl bg-amber-50 p-3 font-bold text-amber-800">
                        {tip}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {activeGuide.safetyNotes.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <h3 className="font-black">Safety</h3>
                  </div>
                  <div className="space-y-2">
                    {activeGuide.safetyNotes.map((note, index) => (
                      <p key={`${note}-${index}`} className="rounded-2xl bg-emerald-50 p-3 font-bold text-emerald-800">
                        {note}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {activeGuide.steps.length === 0 && activeGuide.tips.length === 0 && activeGuide.safetyNotes.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-center font-bold text-slate-500">
                  This guide does not have steps yet.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskPicker} onOpenChange={setShowTaskPicker}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Add One-Time Task</DialogTitle>
          </DialogHeader>

          {catalogLoading ? (
            <div className="py-8 text-center text-sm font-bold text-slate-500">Loading tasks...</div>
          ) : (
            <div className="space-y-4">
              {device?.mode !== "member" && (
                <div>
                  <Label className="font-bold text-slate-600">Child</Label>
                  <select
                    value={taskMemberId}
                    onChange={(event) => setTaskMemberId(event.target.value)}
                    className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-bold text-slate-700 outline-none focus:border-emerald-300"
                  >
                    <option value="">Choose child</option>
                    {catalogMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.avatar} {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="font-bold text-slate-600">Existing task</Label>
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-2">
                  {catalogChores.map((chore) => (
                    <button
                      key={chore.id}
                      type="button"
                      onClick={() => setTaskChoreId(String(chore.id))}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                        taskChoreId === String(chore.id)
                          ? "border-emerald-300 bg-white"
                          : "border-transparent hover:bg-white"
                      }`}
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={{ backgroundColor: chore.color }}
                      >
                        {chore.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-800">{chore.name}</span>
                        <span className="text-xs font-bold text-slate-400">+{chore.pointsValue} points</span>
                      </span>
                    </button>
                  ))}
                  {catalogChores.length === 0 && (
                    <p className="py-8 text-center text-sm font-bold text-slate-400">No existing tasks found.</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={addOneTimeTask}
                disabled={addingTask || catalogChores.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-black text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <ListPlus size={18} /> {addingTask ? "Adding" : "Add for Today"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">
              {photoType === "before" ? "Before" : "After"} Photo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm font-semibold text-slate-500">
            Take a {photoType} photo for this completed task.
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-blue-700"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && activeCompletionId) uploadPhoto(file, activeCompletionId, photoType);
            }}
          />
          <button
            type="button"
            onClick={() => setShowPhoto(false)}
            className="w-full rounded-xl bg-slate-100 py-2 text-sm font-bold text-slate-600"
          >
            Skip for now
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reactionAssignment} onOpenChange={(open) => !open && setReactionAssignment(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">How did it go?</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-semibold text-slate-500">
            Pick an emoji for {reactionAssignment?.chore.name}.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {COMPLETION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={!reactionAssignment || completingId === reactionAssignment.id}
                onClick={() => reactionAssignment && markDone(reactionAssignment, emoji)}
                className="rounded-2xl bg-slate-50 p-3 text-3xl transition-all hover:scale-105 hover:bg-emerald-50 disabled:opacity-50"
                aria-label={`Complete with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInstallHelp} onOpenChange={setShowInstallHelp}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Install App</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm font-semibold text-slate-600">
            <p>On iPhone or iPad, use Share, then Add to Home Screen.</p>
            <p>On Android or desktop Chrome, use the browser menu, then Install app.</p>
            <p>The installed shortcut opens this kids task board.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PANEL_COLORS = {
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  pink: "bg-pink-50 text-pink-700",
  orange: "bg-orange-50 text-orange-700",
};

function DashboardPanel({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: keyof typeof PANEL_COLORS; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-white p-4 shadow-sm">
    <h2 className={`flex items-center gap-2 rounded-2xl px-3 py-2 font-black ${PANEL_COLORS[color]}`}>{icon} {title}</h2>
    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">{children}</div>
  </section>;
}

function DashboardRow({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="flex gap-3 rounded-2xl bg-slate-50 p-3">
    <span className="text-2xl">{icon}</span>
    <div className="min-w-0"><p className="font-black text-slate-700">{title}</p><p className="text-xs font-bold text-slate-400">{detail}</p></div>
  </div>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="p-4 text-center text-sm font-bold text-slate-400">{text}</p>;
}
