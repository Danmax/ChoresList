"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CommunityRole = "owner" | "manager" | "member";
type RsvpStatus = "going" | "maybe" | "not-going";

type ParentRef = { id: number; email: string };
type CommunityMember = { id: number; parentId: number; role: CommunityRole; parent: ParentRef };
type CommunityItem = {
  id: number;
  title: string;
  quantity: string | null;
  note: string | null;
  status: string;
  claimNote: string | null;
  assignedTo: ParentRef | null;
  claimedBy: ParentRef | null;
};
type CommunityRsvp = {
  id: number;
  parentId: number;
  status: RsvpStatus;
  guests: number;
  note: string | null;
  parent: ParentRef;
};
type CommunityEvent = {
  id: number;
  title: string;
  eventType: string;
  date: string;
  endDate: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  rsvps: CommunityRsvp[];
  items: CommunityItem[];
};
type CommunityGroup = {
  id: number;
  name: string;
  groupType: string;
  description: string | null;
  location: string | null;
  visibility: string;
  currentParentId: number;
  currentMembership: { role: CommunityRole; parentId: number } | null;
  members: CommunityMember[];
  events: CommunityEvent[];
};

const ROLE_RANK: Record<CommunityRole, number> = { member: 1, manager: 2, owner: 3 };

const GROUP_TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  church: { label: "Church", icon: "⛪", color: "#f59e0b", bg: "#fef3c7" },
  nonprofit: { label: "Non-profit", icon: "🤝", color: "#10b981", bg: "#d1fae5" },
  sports: { label: "Sports Team", icon: "🏀", color: "#f97316", bg: "#ffedd5" },
  school: { label: "School/Class", icon: "🏫", color: "#3b82f6", bg: "#dbeafe" },
  hobby: { label: "Hobby Group", icon: "🎨", color: "#8b5cf6", bg: "#ede9fe" },
  neighborhood: { label: "Neighborhood", icon: "🏘️", color: "#14b8a6", bg: "#ccfbf1" },
  other: { label: "Other", icon: "👥", color: "#64748b", bg: "#f1f5f9" },
};

const EVENT_TYPES = [
  { value: "potluck", label: "Potluck", icon: "🍲" },
  { value: "service", label: "Service", icon: "🤝" },
  { value: "practice", label: "Practice", icon: "🏃" },
  { value: "meeting", label: "Meeting", icon: "🗣️" },
  { value: "game", label: "Game", icon: "🏆" },
  { value: "class", label: "Class", icon: "📚" },
  { value: "social", label: "Social", icon: "🎉" },
  { value: "other", label: "Other", icon: "📅" },
];

const BLANK_EVENT = {
  title: "",
  eventType: "potluck",
  date: "",
  endDate: "",
  location: "",
  notes: "",
};

const BLANK_MEMBER = { email: "", role: "member" as CommunityRole };
const BLANK_ITEM = { title: "", quantity: "", note: "", assignedToParentId: "" };

function eventMeta(type: string) {
  return EVENT_TYPES.find((eventType) => eventType.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

function groupMeta(type: string) {
  return GROUP_TYPE_META[type] ?? GROUP_TYPE_META.other;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function emailName(email?: string | null) {
  return email ? email.split("@")[0] : "Someone";
}

function rsvpCounts(event: CommunityEvent) {
  return {
    going: event.rsvps.filter((rsvp) => rsvp.status === "going").length,
    maybe: event.rsvps.filter((rsvp) => rsvp.status === "maybe").length,
    no: event.rsvps.filter((rsvp) => rsvp.status === "not-going").length,
  };
}

export default function CommunityGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = Number.parseInt(params.id, 10);
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [eventForm, setEventForm] = useState(BLANK_EVENT);
  const [memberForm, setMemberForm] = useState(BLANK_MEMBER);
  const [itemForms, setItemForms] = useState<Record<number, typeof BLANK_ITEM>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/community/groups?id=${groupId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load community group");
        setGroup(null);
        return;
      }
      setGroup(data);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const role = group?.currentMembership?.role ?? null;
  const canManage = role ? ROLE_RANK[role] >= ROLE_RANK.manager : false;
  const isOwner = role === "owner";
  const canParticipate = Boolean(role);
  const meta = group ? groupMeta(group.groupType) : GROUP_TYPE_META.other;

  const upcomingEvents = useMemo(
    () => [...(group?.events ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [group?.events]
  );

  async function joinGroup() {
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

  async function addMember() {
    if (!memberForm.email.trim()) {
      toast.error("Email is required");
      return;
    }
    const res = await fetch("/api/community/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, ...memberForm }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not add member");
      return;
    }
    toast.success("Member added");
    setMemberForm(BLANK_MEMBER);
    await load();
  }

  async function createEvent() {
    if (!eventForm.title.trim() || !eventForm.date) {
      toast.error("Event title and date are required");
      return;
    }
    const res = await fetch("/api/community/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, ...eventForm, endDate: eventForm.endDate || null }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not create event");
      return;
    }
    toast.success("Event created");
    setEventForm(BLANK_EVENT);
    await load();
  }

  async function deleteEvent(eventId: number) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/community/events?id=${eventId}`, { method: "DELETE" });
    toast.success("Event deleted");
    await load();
  }

  async function rsvp(eventId: number, status: RsvpStatus) {
    const res = await fetch("/api/community/rsvps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not RSVP");
      return;
    }
    await load();
  }

  async function addItem(eventId: number) {
    const form = itemForms[eventId] ?? BLANK_ITEM;
    if (!form.title.trim()) {
      toast.error("Item title is required");
      return;
    }
    const res = await fetch("/api/community/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        title: form.title,
        quantity: form.quantity,
        note: form.note,
        assignedToParentId: form.assignedToParentId ? Number.parseInt(form.assignedToParentId, 10) : null,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not add item");
      return;
    }
    setItemForms((current) => ({ ...current, [eventId]: BLANK_ITEM }));
    await load();
  }

  async function claimItem(itemId: number) {
    const res = await fetch("/api/community/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, action: "claim" }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not claim item");
      return;
    }
    await load();
  }

  async function unclaimItem(itemId: number) {
    const res = await fetch("/api/community/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, action: "unclaim" }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not unclaim item");
      return;
    }
    await load();
  }

  async function deleteItem(itemId: number) {
    await fetch(`/api/community/items?id=${itemId}`, { method: "DELETE" });
    await load();
  }

  if (!group && !loading) {
    return (
      <div className="min-h-screen p-6">
        <Link href="/community" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm">
          <ArrowLeft size={18} /> Community
        </Link>
        <div className="py-20 text-center">
          <div className="mb-3 text-6xl">👥</div>
          <p className="font-black text-slate-700">Community group not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start">
        <Link href="/community" className="self-start rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        {group && (
          <>
            <div className="flex min-w-0 flex-1 gap-4 rounded-3xl p-5 shadow-sm" style={{ backgroundColor: meta.bg, border: `2px solid ${meta.color}44` }}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${meta.color}22` }}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">{group.name}</h1>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-white/70 px-2 py-1" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="rounded-full bg-white/70 px-2 py-1 text-slate-500">{group.visibility}</span>
                  {role && <span className="rounded-full bg-white/70 px-2 py-1 text-slate-500">{role}</span>}
                </div>
                {group.description && <p className="mt-3 text-sm font-semibold text-slate-600">{group.description}</p>}
                {group.location && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-500"><MapPin size={15} /> {group.location}</p>}
              </div>
            </div>
            {!role && group.visibility === "public" && (
              <button
                type="button"
                onClick={joinGroup}
                className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-white hover:bg-emerald-600"
              >
                Join Group
              </button>
            )}
          </>
        )}
      </div>

      {group && (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {canManage && (
              <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 flex items-center gap-2 font-black text-slate-800"><CalendarDays size={18} className="text-violet-500" /> New Event</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-bold">Title</Label>
                    <Input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} placeholder="Community potluck" className="mt-1 rounded-2xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Type</Label>
                    <Select value={eventForm.eventType} onValueChange={(value) => setEventForm((current) => ({ ...current, eventType: value ?? "other" }))}>
                      <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((eventType) => <SelectItem key={eventType.value} value={eventType.value}>{eventType.icon} {eventType.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Starts</Label>
                    <Input type="datetime-local" value={eventForm.date} onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} className="mt-1 rounded-2xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Ends optional</Label>
                    <Input type="datetime-local" value={eventForm.endDate} onChange={(event) => setEventForm((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 rounded-2xl" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-bold">Location</Label>
                    <Input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} placeholder={group.location ?? "Where is it happening?"} className="mt-1 rounded-2xl" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-bold">Notes</Label>
                    <Textarea value={eventForm.notes} onChange={(event) => setEventForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Details, instructions, or RSVP notes." className="mt-1 rounded-2xl" />
                  </div>
                </div>
                <button type="button" onClick={createEvent} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white hover:bg-violet-600">
                  <Plus size={17} /> Create Event
                </button>
              </div>
            )}

            {upcomingEvents.map((event) => {
              const counts = rsvpCounts(event);
              const myRsvp = event.rsvps.find((rsvpItem) => rsvpItem.parentId === group.currentParentId);
              const eMeta = eventMeta(event.eventType);
              const itemForm = itemForms[event.id] ?? BLANK_ITEM;
              return (
                <div key={event.id} className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{eMeta.icon}</span>
                        <div>
                          <h2 className="text-xl font-black text-slate-800">{event.title}</h2>
                          <p className="text-sm font-bold text-slate-400">{formatDate(event.date)}</p>
                        </div>
                      </div>
                      {event.location && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-500"><MapPin size={15} /> {event.location}</p>}
                      {event.notes && <p className="mt-2 text-sm font-semibold text-slate-500">{event.notes}</p>}
                    </div>
                    {canManage && (
                      <button type="button" onClick={() => deleteEvent(event.id)} className="self-start rounded-xl bg-red-50 p-2 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="mb-4 rounded-2xl bg-slate-50 p-3">
                    <div className="mb-3 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{counts.going} going</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{counts.maybe} maybe</span>
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">{counts.no} not going</span>
                    </div>
                    {canParticipate ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          ["going", "Going", "bg-emerald-500 hover:bg-emerald-600"],
                          ["maybe", "Maybe", "bg-amber-500 hover:bg-amber-600"],
                          ["not-going", "Can't Go", "bg-slate-500 hover:bg-slate-600"],
                        ].map(([value, label, classes]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => rsvp(event.id, value as RsvpStatus)}
                            className={`rounded-xl px-3 py-2 text-sm font-black text-white ${classes} ${myRsvp?.status === value ? "ring-2 ring-offset-2 ring-slate-300" : ""}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">Join the group to RSVP.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 font-black text-slate-800">Items to bring</h3>
                    {canManage && (
                      <div className="mb-3 grid gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_100px_1fr_160px_auto]">
                        <Input value={itemForm.title} onChange={(input) => setItemForms((current) => ({ ...current, [event.id]: { ...itemForm, title: input.target.value } }))} placeholder="Mac and cheese" className="rounded-xl bg-white" />
                        <Input value={itemForm.quantity} onChange={(input) => setItemForms((current) => ({ ...current, [event.id]: { ...itemForm, quantity: input.target.value } }))} placeholder="Qty" className="rounded-xl bg-white" />
                        <Input value={itemForm.note} onChange={(input) => setItemForms((current) => ({ ...current, [event.id]: { ...itemForm, note: input.target.value } }))} placeholder="Notes" className="rounded-xl bg-white" />
                        <Select value={itemForm.assignedToParentId} onValueChange={(value) => setItemForms((current) => ({ ...current, [event.id]: { ...itemForm, assignedToParentId: value === "none" ? "" : (value ?? "") } }))}>
                          <SelectTrigger className="rounded-xl bg-white"><SelectValue placeholder="Assign" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Anyone</SelectItem>
                            {group.members.map((member) => <SelectItem key={member.parentId} value={String(member.parentId)}>{emailName(member.parent.email)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button type="button" onClick={() => addItem(event.id)} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-black text-white hover:bg-slate-700">Add</button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {event.items.map((item) => {
                        const isMine = item.claimedBy?.id === group.currentParentId;
                        return (
                          <div key={item.id} className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center ${item.claimedBy ? "border-emerald-100 bg-emerald-50" : "border-slate-100 bg-white"}`}>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-slate-800">{item.title}</p>
                              <p className="text-xs font-bold text-slate-400">
                                {[item.quantity, item.note, item.assignedTo ? `Assigned to ${emailName(item.assignedTo.email)}` : null].filter(Boolean).join(" · ")}
                              </p>
                              {item.claimedBy && (
                                <p className="mt-1 text-xs font-black text-emerald-700">
                                  <CheckCircle2 size={13} className="mr-1 inline" /> Claimed by {emailName(item.claimedBy.email)}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {canParticipate && !item.claimedBy && (
                                <button type="button" onClick={() => claimItem(item.id)} className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-600">Claim</button>
                              )}
                              {canParticipate && item.claimedBy && (isMine || canManage) && (
                                <button type="button" onClick={() => unclaimItem(item.id)} className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-300">Unclaim</button>
                              )}
                              {canManage && (
                                <button type="button" onClick={() => deleteItem(item.id)} className="text-red-300 hover:text-red-500"><Trash2 size={15} /></button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {event.items.length === 0 && (
                        <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">
                          No items requested yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <div className="mb-3 text-6xl">📅</div>
                <p className="font-black text-slate-700">No events yet</p>
                <p className="text-sm font-semibold text-slate-400">{canManage ? "Create the first event for this group." : "A manager can add the first event."}</p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-black text-slate-800"><Users size={18} className="text-violet-500" /> Members</h2>
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-700">{emailName(member.parent.email)}</p>
                      <p className="truncate text-xs font-bold text-slate-400">{member.parent.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500">{member.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {canManage && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 font-black text-slate-800"><UserPlus size={18} className="text-emerald-500" /> Add Member</h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-bold">Parent account email</Label>
                    <Input value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} placeholder="parent@example.com" className="mt-1 rounded-2xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Role</Label>
                    <Select value={memberForm.role} onValueChange={(value) => setMemberForm((current) => ({ ...current, role: (value ?? "member") as CommunityRole }))}>
                      <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        {isOwner && <SelectItem value="manager">Manager</SelectItem>}
                        {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <button type="button" onClick={addMember} className="w-full rounded-2xl bg-emerald-500 py-2.5 font-black text-white hover:bg-emerald-600">
                    Add Member
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
