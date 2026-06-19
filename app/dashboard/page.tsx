"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Compass,
  Gift,
  GraduationCap,
  ListChecks,
  MapPin,
  Settings,
  ShoppingCart,
  Star,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import { getLevelFromPoints, getLevelTitle, getPointsForNextLevel } from "@/lib/points";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TinyWeather } from "@/components/tiny-weather";

interface Assignment {
  id: number;
  completions: { id: number }[];
}

interface Member {
  id: number;
  name: string;
  age: number;
  role: string;
  avatar: string;
  color: string;
  totalPoints: number;
  level: number;
  assignments: Assignment[];
}

type GroceryItem = {
  id: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  checked?: boolean;
};

type GroceryList = {
  id: number;
  title: string;
  status: string;
  items: GroceryItem[];
};

type CommunityEventItem = {
  id: number;
  title: string;
  quantity: string | null;
  status: string;
  claimedBy?: { id: number; email: string } | null;
};

type CommunityEvent = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  items?: CommunityEventItem[];
};

type CommunityGroup = {
  id: number;
  name: string;
  groupType: string;
  location: string | null;
  currentMembership: { id: number; role: string } | null;
  events: CommunityEvent[];
  _count?: { members: number; events: number };
};

type DashboardEventItem = CommunityEventItem & {
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  groupId: number;
  groupName: string;
};

type EducationAssignment = {
  id: number;
  status: string;
  dueDate?: string | null;
  member: { id: number; name: string; avatar: string; color: string };
  set: { id: number; title: string; subject: string; mode: string };
};

type EducationProject = {
  id: number;
  status: string;
  member?: { id: number; name: string; avatar: string; color: string } | null;
};

const PARENT_ITEMS = [
  { href: "/parent/tasks", Icon: CheckCircle2, label: "Parent Tasks", desc: "Complete parent chores", color: "#14b8a6", bg: "#ccfbf1" },
  { href: "/parent/assign", Icon: CalendarDays, label: "Assign Chores", desc: "Plan daily and weekly work", color: "#34d399", bg: "#d1fae5" },
  { href: "/parent/chores", Icon: ListChecks, label: "Chore Library", desc: "Edit chores and instructions", color: "#60a5fa", bg: "#dbeafe" },
  { href: "/parent/academy", Icon: GraduationCap, label: "Education Academy", desc: "AI lessons, drills, and projects", color: "#2563eb", bg: "#dbeafe" },
  { href: "/parent/projects", Icon: Wrench, label: "House Projects", desc: "Track bigger jobs", color: "#f97316", bg: "#ffedd5" },
  { href: "/parent/wishlist", Icon: Gift, label: "Wish Lists", desc: "Review kid requests", color: "#f472b6", bg: "#fce7f3" },
];

const GROUP_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  church: { label: "Church", icon: "⛪", color: "#f59e0b", bg: "#fef3c7" },
  nonprofit: { label: "Non-profit", icon: "🤝", color: "#10b981", bg: "#d1fae5" },
  sports: { label: "Sports", icon: "🏀", color: "#f97316", bg: "#ffedd5" },
  school: { label: "School", icon: "🏫", color: "#3b82f6", bg: "#dbeafe" },
  hobby: { label: "Hobby", icon: "🎨", color: "#8b5cf6", bg: "#ede9fe" },
  neighborhood: { label: "Neighborhood", icon: "🏘️", color: "#14b8a6", bg: "#ccfbf1" },
  other: { label: "Community", icon: "👥", color: "#64748b", bg: "#f1f5f9" },
};

async function readJsonArray<T>(res: Response | null) {
  if (!res?.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data as T[] : [];
}

function amount(item: Pick<GroceryItem | CommunityEventItem, "quantity"> & { unit?: string | null }) {
  return [item.quantity, item.unit].filter(Boolean).join(" ");
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FamilyDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<CommunityGroup[]>([]);
  const [eventItems, setEventItems] = useState<DashboardEventItem[]>([]);
  const [educationAssignments, setEducationAssignments] = useState<EducationAssignment[]>([]);
  const [educationProjects, setEducationProjects] = useState<EducationProject[]>([]);
  const [educationSetCount, setEducationSetCount] = useState(0);
  const [educationEnabled, setEducationEnabled] = useState(false);
  const [groceryEnabled, setGroceryEnabled] = useState(false);
  const [communityEnabled, setCommunityEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      const data = await res.json().catch(() => null);
      const nextMembers = Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : null;
      if (!res.ok || !nextMembers) {
        setAuthRequired(res.status === 401);
        const msg = (data && typeof data === "object" && "error" in data && typeof data.error === "string")
          ? data.error
          : `HTTP ${res.status}`;
        setApiError(msg);
        setMembers([]);
        setGroceryLists([]);
        setCommunityGroups([]);
        setDiscoverGroups([]);
        setEventItems([]);
        setEducationAssignments([]);
        setEducationProjects([]);
        setEducationSetCount(0);
        setEducationEnabled(false);
        setLoading(false);
        return;
      }
      setAuthRequired(false);
      setApiError(null);
      setMembers(nextMembers);

      const pluginsRes = await fetch("/api/plugins");
      const pluginsData = pluginsRes.ok ? await pluginsRes.json().catch(() => null) : null;
      const activePluginKeys = new Set<string>(
        Array.isArray(pluginsData?.plugins)
          ? pluginsData.plugins.filter((plugin: { active?: boolean }) => plugin.active).map((plugin: { key: string }) => plugin.key)
          : []
      );
      const nextGroceryEnabled = activePluginKeys.has("grocery-pantry");
      const nextCommunityEnabled = activePluginKeys.has("community-events");
      const nextEducationEnabled = activePluginKeys.has("education-academy");
      setGroceryEnabled(nextGroceryEnabled);
      setCommunityEnabled(nextCommunityEnabled);
      setCalendarEnabled(activePluginKeys.has("family-calendar"));

      const [listsRes, groupsRes, discoverRes, educationRes] = await Promise.all([
        nextGroceryEnabled ? fetch("/api/groceries/lists?status=active") : Promise.resolve(null),
        nextCommunityEnabled ? fetch("/api/community/groups") : Promise.resolve(null),
        nextCommunityEnabled ? fetch("/api/community/groups?discover=true") : Promise.resolve(null),
        nextEducationEnabled ? fetch("/api/education/parent") : Promise.resolve(null),
      ]);
      const [nextLists, nextGroups, nextDiscoverGroups] = await Promise.all([
        readJsonArray<GroceryList>(listsRes),
        readJsonArray<CommunityGroup>(groupsRes),
        readJsonArray<CommunityGroup>(discoverRes),
      ]);
      const educationData = educationRes?.ok ? await educationRes.json().catch(() => null) : null;
      setGroceryLists(nextLists);
      setCommunityGroups(nextGroups);
      setDiscoverGroups(nextDiscoverGroups);
      setEducationEnabled(nextEducationEnabled && Boolean(educationData));
      setEducationAssignments(Array.isArray(educationData?.assignments) ? educationData.assignments : []);
      setEducationProjects(Array.isArray(educationData?.projects) ? educationData.projects : []);
      setEducationSetCount(Array.isArray(educationData?.sets) ? educationData.sets.length : 0);

      const detailedGroups = await Promise.all(
        nextGroups.slice(0, 8).map(async (group) => {
          const res = await fetch(`/api/community/groups?id=${group.id}`);
          const data = await res.json().catch(() => null);
          return res.ok && data && typeof data === "object" ? data as CommunityGroup : group;
        })
      );
      const now = Date.now() - 60 * 60 * 1000;
      const nextEventItems = detailedGroups.flatMap((group) =>
        group.events
          .filter((event) => new Date(event.date).getTime() >= now)
          .flatMap((event) =>
            (event.items ?? []).map((item) => ({
              ...item,
              eventId: event.id,
              eventTitle: event.title,
              eventDate: event.date,
              eventLocation: event.location,
              groupId: group.id,
              groupName: group.name,
            }))
          )
      )
        .sort((a, b) => {
          if (a.status === "claimed" && b.status !== "claimed") return 1;
          if (a.status !== "claimed" && b.status === "claimed") return -1;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        })
        .slice(0, 6);
      setEventItems(nextEventItems);
      setLoading(false);
    } catch (e) {
      setAuthRequired(false);
      setApiError(e instanceof Error ? e.message : String(e));
      setMembers([]);
      setGroceryLists([]);
      setCommunityGroups([]);
      setDiscoverGroups([]);
      setEventItems([]);
      setEducationAssignments([]);
      setEducationProjects([]);
      setEducationSetCount(0);
      setEducationEnabled(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    const params = new URLSearchParams(window.location.search);
    setTvMode(params.get("mode") === "tv");
  }, [loadMembers]);

  useEffect(() => {
    if (!tvMode) return;
    const interval = setInterval(loadMembers, 60000);
    return () => clearInterval(interval);
  }, [tvMode, loadMembers]);

  const kids = members.filter((m) => m.role === "child");
  const sorted = [...kids].sort((a, b) => b.totalPoints - a.totalPoints);
  const activeGroceryLists = groceryLists.filter((list) => list.status === "active");
  const groceryItemCount = activeGroceryLists.reduce((total, list) => total + list.items.length, 0);
  const remainingGroceryItemCount = activeGroceryLists.reduce(
    (total, list) => total + list.items.filter((item) => !item.checked).length,
    0
  );
  const publicGroupsToJoin = discoverGroups.filter((group) => !group.currentMembership);
  const openEducationAssignments = educationAssignments.filter((assignment) => assignment.status !== "completed" && assignment.status !== "archived");
  const openEducationProjects = educationProjects.filter((project) => project.status === "open");
  const academyByMember = new Map<number, { assignments: number; projects: number; completed: number }>();
  members.forEach((member) => academyByMember.set(member.id, { assignments: 0, projects: 0, completed: 0 }));
  educationAssignments.forEach((assignment) => {
    const summary = academyByMember.get(assignment.member.id);
    if (!summary) return;
    if (assignment.status === "completed") summary.completed += 1;
    if (assignment.status !== "completed" && assignment.status !== "archived") summary.assignments += 1;
  });
  openEducationProjects.forEach((project) => {
    const memberId = project.member?.id;
    if (!memberId) return;
    const summary = academyByMember.get(memberId);
    if (summary) summary.projects += 1;
  });

  return (
    <div className={`min-h-screen ${tvMode ? "p-12" : "p-4 sm:p-6"}`}>
      <div className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h1 className={`flex items-center gap-3 font-black text-slate-800 ${tvMode ? "text-6xl" : "text-3xl sm:text-4xl"}`}>
            <Image
              src="/logo.png"
              alt=""
              width={64}
              height={64}
              className={`shrink-0 rounded-2xl object-contain ${tvMode ? "h-16 w-16" : "h-10 w-10 sm:h-12 sm:w-12"}`}
            />
            <span>ChoresList</span>
          </h1>
          <p className="text-slate-500 font-semibold mt-1 text-sm sm:text-base">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {!tvMode && (
          <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
            <TinyWeather />
            {calendarEnabled && <Link
              href="/calendar"
              className="flex items-center gap-1.5 bg-white rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow text-sm sm:text-base"
            >
              <Calendar size={16} /> <span className="hidden sm:inline">Calendar</span>
            </Link>}
            {communityEnabled && <Link
              href="/community"
              className="flex items-center gap-1.5 bg-white rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow text-sm sm:text-base"
            >
              <Users size={16} /> <span className="hidden sm:inline">Community</span>
            </Link>}
            <Link
              href="/parent"
              className="flex items-center gap-1.5 bg-white rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow text-sm sm:text-base"
            >
              <Settings size={16} /> <span className="hidden sm:inline">Parent Panel</span>
            </Link>
          </div>
        )}
      </div>

      {authRequired ? (
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-sm">
          <div className="mb-3 text-5xl">🔒</div>
          <h2 className="mb-2 text-2xl font-black text-slate-800">Parent sign-in required</h2>
          <p className="mb-5 text-sm font-semibold text-slate-500">Sign in to view your family dashboard.</p>
          <Link
            href="/parent"
            className="inline-flex rounded-2xl bg-violet-500 px-6 py-3 font-black text-white transition-colors hover:bg-violet-600"
          >
            Sign In
          </Link>
        </div>
      ) : apiError && (
        <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-bold text-red-700 mb-1">⚠️ Couldn&apos;t load family members</p>
          <pre className="whitespace-pre-wrap break-words text-red-900 font-mono text-xs">{apiError}</pre>
          <p className="text-red-600 text-xs mt-2">
            Check that <code>DATABASE_URL</code> is set in your Hostinger env panel and that migrations have run.
          </p>
        </div>
      )}

      {kids.length === 0 && !apiError && !authRequired && !loading && (
        <div className="text-center py-24">
          <div className="text-8xl mb-6">👨‍👩‍👧‍👦</div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">No family members yet</h2>
          <p className="text-slate-500 mb-6">Head to the Parent Panel to add your kids!</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
            >
              ← Home
            </Link>
            <Link
              href="/parent"
              className="bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-600 transition-colors"
            >
              Set Up Family
            </Link>
          </div>
        </div>
      )}

      {!authRequired && !tvMode && !apiError && !loading && (
        <div className="mb-8 grid gap-5 xl:grid-cols-2">
          {educationEnabled && (
            <section className="rounded-3xl bg-white/80 p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 font-black text-slate-800">
                    <GraduationCap size={18} className="text-blue-600" /> Education Academy
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    {openEducationAssignments.length} open assignments · {openEducationProjects.length} open projects · {educationSetCount} lesson sets
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/parent/academy#lesson-builder" className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700">Create study set</Link>
                  <Link href="/parent/academy#assign-academy" className="rounded-xl bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-200">Assign work</Link>
                  <Link href="/parent/academy" className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-black text-blue-600 hover:text-blue-800">Manage <ArrowRight size={14} /></Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {members.map((member) => {
                  const academy = academyByMember.get(member.id) ?? { assignments: 0, projects: 0, completed: 0 };
                  return (
                    <Link
                      key={member.id}
                      href={`/kid/${member.id}/academy`}
                      className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 transition-colors hover:bg-blue-50"
                    >
                      <span className="text-2xl">{member.avatar}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black text-slate-800">{member.name}</span>
                        <span className="block truncate text-xs font-bold text-blue-500">
                          {academy.assignments} lessons · {academy.projects} projects · {academy.completed} passed
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-black text-slate-800">
                  <ClipboardList size={18} className="text-violet-500" /> Parent Items
                </h2>
                <p className="text-xs font-bold text-slate-400">Quick access to parent workflows</p>
              </div>
              <Link href="/parent" className="inline-flex items-center gap-1 text-sm font-black text-violet-500 hover:text-violet-700">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PARENT_ITEMS.filter((item) => item.href !== "/parent/academy" || educationEnabled).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3 transition-colors hover:bg-white"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: item.bg }}>
                    <item.Icon size={20} style={{ color: item.color }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-black text-slate-800">{item.label}</span>
                    <span className="block truncate text-xs font-bold text-slate-400">{item.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {groceryEnabled && <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-black text-slate-800">
                  <ShoppingCart size={18} className="text-emerald-500" /> Shopping List
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  {activeGroceryLists.length} active lists · {remainingGroceryItemCount}/{groceryItemCount} items left
                </p>
              </div>
              <Link href="/parent/groceries" className="inline-flex items-center gap-1 text-sm font-black text-emerald-500 hover:text-emerald-700">
                Open <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {activeGroceryLists.slice(0, 4).map((list) => {
                const remaining = list.items.filter((item) => !item.checked);
                return (
                  <Link
                    key={list.id}
                    href="/parent/groceries"
                    className="block rounded-2xl border border-slate-100 bg-white/70 p-3 transition-colors hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-800">{list.title}</p>
                        <p className="text-xs font-bold text-slate-400">{remaining.length} of {list.items.length} items remaining</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">{remaining.length === 0 ? "Done" : "Active"}</Badge>
                    </div>
                    {remaining[0] && (
                      <p className="mt-2 truncate text-sm font-semibold text-slate-500">
                        Next: {remaining[0].name}{amount(remaining[0]) ? ` · ${amount(remaining[0])}` : ""}
                      </p>
                    )}
                  </Link>
                );
              })}
              {activeGroceryLists.length === 0 && (
                <Link href="/parent/groceries" className="block rounded-2xl border border-dashed border-slate-200 p-5 text-center font-bold text-slate-400 hover:bg-white/70">
                  No active shopping lists. Create one in Groceries.
                </Link>
              )}
            </div>
          </section>}

          {communityEnabled && <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-black text-slate-800">
                  <CalendarDays size={18} className="text-orange-500" /> Event Items
                </h2>
                <p className="text-xs font-bold text-slate-400">Things requested for upcoming community events</p>
              </div>
              <Link href="/community" className="inline-flex items-center gap-1 text-sm font-black text-orange-500 hover:text-orange-700">
                Events <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {eventItems.map((item) => (
                <Link
                  key={`${item.eventId}-${item.id}`}
                  href={`/community/${item.groupId}?event=${item.eventId}`}
                  className="block rounded-2xl border border-slate-100 bg-white/70 p-3 transition-colors hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">{item.title}</p>
                      <p className="truncate text-xs font-bold text-slate-400">{item.groupName} · {item.eventTitle}</p>
                    </div>
                    <Badge className={item.status === "claimed" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                    <span>{formatShortDate(item.eventDate)}</span>
                    {item.quantity && <span>{item.quantity}</span>}
                    {item.eventLocation && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {item.eventLocation}</span>}
                  </p>
                </Link>
              ))}
              {eventItems.length === 0 && (
                <Link href="/community" className="block rounded-2xl border border-dashed border-slate-200 p-5 text-center font-bold text-slate-400 hover:bg-white/70">
                  No upcoming event items yet.
                </Link>
              )}
            </div>
          </section>}

          {communityEnabled && <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-black text-slate-800">
                  <Users size={18} className="text-violet-500" /> Communities
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  {communityGroups.length} joined · {publicGroupsToJoin.length} public to discover
                </p>
              </div>
              <Link href="/community" className="inline-flex items-center gap-1 text-sm font-black text-violet-500 hover:text-violet-700">
                Open <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {communityGroups.slice(0, 4).map((group) => {
                const meta = GROUP_META[group.groupType] ?? GROUP_META.other;
                return (
                  <Link
                    key={group.id}
                    href={`/community/${group.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3 transition-colors hover:bg-white"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: meta.bg }}>
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-black text-slate-800">{group.name}</span>
                      <span className="block truncate text-xs font-bold text-slate-400">
                        {meta.label} · {group._count?.members ?? 0} members · {group.events.length} upcoming
                      </span>
                    </span>
                    {group.location && <Compass size={16} className="shrink-0 text-slate-300" />}
                  </Link>
                );
              })}
              {communityGroups.length === 0 && (
                <Link href="/community" className="block rounded-2xl border border-dashed border-slate-200 p-5 text-center font-bold text-slate-400 hover:bg-white/70">
                  No joined communities yet. Create or join one.
                </Link>
              )}
            </div>
          </section>}
        </div>
      )}

      {!authRequired && sorted.length > 1 && (
        <div className="mb-8 bg-white/70 backdrop-blur rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-yellow-500" />
            <span className="font-bold text-slate-700">This Week&apos;s Leaderboard</span>
          </div>
          <div className="flex gap-6 overflow-x-auto">
            {sorted.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-black text-slate-400">#{i + 1}</span>
                <span className="text-2xl">{m.avatar}</span>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.totalPoints} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!authRequired && (
        <div
          className={`grid gap-6 ${
            tvMode
              ? "grid-cols-2 gap-10"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {kids.map((member, i) => {
            const progress = getPointsForNextLevel(member.totalPoints);
            const todayDone = member.assignments.filter((a) => a.completions.length > 0).length;
            const todayTotal = member.assignments.length;
            const allDone = todayTotal > 0 && todayDone === todayTotal;
            const academy = academyByMember.get(member.id) ?? { assignments: 0, projects: 0, completed: 0 };
            const academyOpen = academy.assignments + academy.projects;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
            >
              <Link href={`/kid/${member.id}`}>
                <div
                  className="rounded-3xl p-6 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer relative overflow-hidden"
                  style={{
                    backgroundColor: member.color + "22",
                    border: `2px solid ${member.color}55`,
                  }}
                >
                  {allDone && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-400 text-white font-bold text-xs">All Done! ✓</Badge>
                    </div>
                  )}
                  <div className={`text-center mb-4 ${tvMode ? "text-8xl" : "text-6xl"}`}>
                    {member.avatar}
                  </div>
                  <h2 className={`font-black text-slate-800 text-center mb-1 ${tvMode ? "text-4xl" : "text-2xl"}`}>
                    {member.name}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge style={{ backgroundColor: member.color }} className="text-white font-bold text-xs">
                      Lv.{getLevelFromPoints(member.totalPoints)}{" "}
                      {getLevelTitle(getLevelFromPoints(member.totalPoints))}
                    </Badge>
                    <span className="flex items-center gap-1 text-slate-600 font-semibold text-sm">
                      <Star size={14} className="text-yellow-500" fill="currentColor" />
                      {member.totalPoints}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                      <span>Level progress</span>
                      <span>{progress.current}/{progress.next} XP</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-500">Today</span>
                    <span style={{ color: allDone ? "#10b981" : "#6366f1" }}>
                      {todayDone}/{todayTotal} chores ✓
                    </span>
                  </div>
                  {educationEnabled && (
                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2 text-sm font-bold">
                      <span className="flex items-center gap-1 text-slate-500">
                        <GraduationCap size={15} className="text-blue-600" /> Academy
                      </span>
                      <span className={academyOpen > 0 ? "text-blue-600" : "text-emerald-600"}>
                        {academyOpen > 0 ? `${academyOpen} open` : "Clear"}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {tvMode && !authRequired && (
        <p className="text-center text-slate-400 mt-12 font-semibold">
          Tap a card to see your chores • Auto-refreshes every minute
        </p>
      )}
    </div>
  );
}
