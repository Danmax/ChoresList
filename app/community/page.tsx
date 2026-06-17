"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Compass, MapPin, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CommunityRole = "owner" | "manager" | "member";

type CommunityGroup = {
  id: string;
  name: string;
  groupType: string;
  description: string | null;
  location: string | null;
  visibility: string;
  currentMembership: { id: string; parentId: string; role: CommunityRole } | null;
  events: { id: string; title: string; date: string; location: string | null }[];
  _count?: { members: number; events: number };
};

type CurrentEvent = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  date: string;
  location: string | null;
};

const GROUP_TYPES = [
  { value: "church", label: "Church", icon: "⛪", color: "#f59e0b", bg: "#fef3c7" },
  { value: "nonprofit", label: "Non-profit", icon: "🤝", color: "#10b981", bg: "#d1fae5" },
  { value: "sports", label: "Sports Team", icon: "🏀", color: "#f97316", bg: "#ffedd5" },
  { value: "school", label: "School/Class", icon: "🏫", color: "#3b82f6", bg: "#dbeafe" },
  { value: "hobby", label: "Hobby Group", icon: "🎨", color: "#8b5cf6", bg: "#ede9fe" },
  { value: "neighborhood", label: "Neighborhood", icon: "🏘️", color: "#14b8a6", bg: "#ccfbf1" },
  { value: "other", label: "Other", icon: "👥", color: "#64748b", bg: "#f1f5f9" },
];

const BLANK_GROUP = {
  name: "",
  groupType: "church",
  description: "",
  location: "",
  visibility: "private",
};

function typeMeta(type: string) {
  return GROUP_TYPES.find((groupType) => groupType.value === type) ?? GROUP_TYPES[GROUP_TYPES.length - 1];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CommunityPage() {
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<CommunityGroup[]>([]);
  const [form, setForm] = useState(BLANK_GROUP);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [joinedRes, discoverRes] = await Promise.all([
        fetch("/api/community/groups"),
        fetch("/api/community/groups?discover=true"),
      ]);
      const joinedData = await joinedRes.json().catch(() => []);
      const discoverData = await discoverRes.json().catch(() => []);
      if (!joinedRes.ok) {
        setError(joinedData?.error ?? "Could not load community groups");
        setGroups([]);
        setDiscoverGroups([]);
        return;
      }
      setError("");
      setGroups(Array.isArray(joinedData) ? joinedData : []);
      setDiscoverGroups(Array.isArray(discoverData) ? discoverData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const publicGroupsToJoin = useMemo(
    () => discoverGroups.filter((group) => !group.currentMembership && group.visibility === "public"),
    [discoverGroups]
  );

  const currentEvents = useMemo(() => {
    const byId = new Map<string, CurrentEvent>();
    [...groups, ...discoverGroups].forEach((group) => {
      group.events.forEach((event) => {
        byId.set(event.id, {
          id: event.id,
          groupId: group.id,
          groupName: group.name,
          title: event.title,
          date: event.date,
          location: event.location,
        });
      });
    });
    return [...byId.values()]
      .filter((event) => new Date(event.date).getTime() >= Date.now() - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [groups, discoverGroups]);

  async function createGroup() {
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    const res = await fetch("/api/community/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not create group");
      return;
    }
    toast.success("Community group created");
    setForm(BLANK_GROUP);
    setShowCreate(false);
    await load();
  }

  async function joinGroup(groupId: string) {
    const res = await fetch("/api/community/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not join group");
      return;
    }
    toast.success("Joined community group");
    await load();
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/dashboard" className="self-start rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">👥 Community</h1>
          <p className="text-sm font-semibold text-slate-500">Create groups, host events, RSVP, and coordinate what people bring.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((current) => !current)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-bold text-white transition-colors hover:bg-violet-600"
        >
          <Plus size={18} /> New Group
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-lg font-black text-slate-800">Create a community group</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label className="text-sm font-bold">Group name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Sunday Potluck Crew"
                className="mt-1 rounded-2xl"
              />
            </div>
            <div>
              <Label className="text-sm font-bold">Type</Label>
              <Select value={form.groupType} onValueChange={(value) => setForm((current) => ({ ...current, groupType: value ?? "other" }))}>
                <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map((groupType) => (
                    <SelectItem key={groupType.value} value={groupType.value}>{groupType.icon} {groupType.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold">Location</Label>
              <Input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Tampa, FL"
                className="mt-1 rounded-2xl"
              />
            </div>
            <div>
              <Label className="text-sm font-bold">Visibility</Label>
              <Select value={form.visibility} onValueChange={(value) => setForm((current) => ({ ...current, visibility: value ?? "private" }))}>
                <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public discovery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label className="text-sm font-bold">Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Who this group is for and what you organize together."
                className="mt-1 rounded-2xl"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={createGroup}
            className="mt-4 rounded-2xl bg-slate-800 px-5 py-2.5 font-black text-white transition-colors hover:bg-slate-700"
          >
            Create Group
          </button>
        </div>
      )}

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays size={18} className="text-violet-500" />
          <h2 className="font-black text-slate-800">Current Events</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {currentEvents.map((event) => (
            <Link key={event.id} href={`/community/${event.groupId}?event=${event.id}`} className="rounded-3xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">{event.groupName}</p>
              <p className="mt-1 font-black text-slate-800">{event.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(event.date)}</p>
              {event.location && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-400"><MapPin size={12} /> {event.location}</p>}
            </Link>
          ))}
          {currentEvents.length === 0 && !loading && (
            <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-slate-400 md:col-span-2 xl:col-span-3">
              No current community events.
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-violet-500" />
          <h2 className="font-black text-slate-800">Your Groups</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const meta = typeMeta(group.groupType);
            return (
              <Link key={group.id} href={`/community/${group.id}`} className="block">
                <div className="h-full rounded-3xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md" style={{ backgroundColor: meta.bg, border: `2px solid ${meta.color}44` }}>
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${meta.color}22` }}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-black text-slate-800">{group.name}</h3>
                      <p className="text-xs font-black uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</p>
                    </div>
                  </div>
                  {group.description && <p className="mb-3 line-clamp-2 text-sm font-semibold text-slate-600">{group.description}</p>}
                  <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-full bg-white/70 px-2 py-1">{group.currentMembership?.role ?? "member"}</span>
                    <span className="rounded-full bg-white/70 px-2 py-1">{group._count?.members ?? 0} members</span>
                    <span className="rounded-full bg-white/70 px-2 py-1">{group._count?.events ?? 0} events</span>
                  </div>
                  {group.events[0] && (
                    <div className="mt-4 rounded-2xl bg-white/70 p-3">
                      <p className="flex items-center gap-1 text-xs font-black text-slate-500"><CalendarDays size={13} /> Next event</p>
                      <p className="font-black text-slate-800">{group.events[0].title}</p>
                      <p className="text-xs font-bold text-slate-500">{formatDate(group.events[0].date)}</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          {groups.length === 0 && !loading && (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm md:col-span-2 xl:col-span-3">
              <div className="mb-3 text-6xl">👥</div>
              <p className="font-black text-slate-700">No community groups yet</p>
              <p className="text-sm font-semibold text-slate-400">Create one or join a public group below.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Compass size={18} className="text-emerald-500" />
          <h2 className="font-black text-slate-800">Public Groups</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {publicGroupsToJoin.map((group) => {
            const meta = typeMeta(group.groupType);
            return (
              <div key={group.id} className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800">{group.name}</p>
                    <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</p>
                    {group.location && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-400"><MapPin size={12} /> {group.location}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => joinGroup(group.id)}
                    className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-600"
                  >
                    Join
                  </button>
                </div>
              </div>
            );
          })}
          {publicGroupsToJoin.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-slate-400 md:col-span-2 xl:col-span-3">
              No public groups to join right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
