"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Copy, Mail, MapPin, Pencil, Plus, QrCode, Save, Share2, Trash2, UserPlus, Users, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CommunityRole = "owner" | "manager" | "member";
type RsvpStatus = "going" | "maybe" | "not-going";

type ParentRef = { id: string; email: string };
type StarterItem = { title: string; quantity: string; note: string };
type LocationSuggestion = {
  id: string;
  label: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};
type CommunityMember = { id: string; parentId: string; role: CommunityRole; parent: ParentRef };
type CommunityItem = {
  id: string;
  title: string;
  quantity: string | null;
  note: string | null;
  status: string;
  claimNote: string | null;
  assignedTo: ParentRef | null;
  claimedBy: ParentRef | null;
};
type CommunityRsvp = {
  id: string;
  parentId: string;
  status: RsvpStatus;
  guests: number;
  note: string | null;
  parent: ParentRef;
};
type CommunityEvent = {
  id: string;
  title: string;
  eventType: string;
  date: string;
  endDate: string | null;
  allDay: boolean;
  location: string | null;
  imageUrl: string | null;
  visibility: string;
  notes: string | null;
  publicInviteUrl: string | null;
  rsvps: CommunityRsvp[];
  items: CommunityItem[];
};
type CommunityGroup = {
  id: string;
  name: string;
  groupType: string;
  description: string | null;
  location: string | null;
  visibility: string;
  groupInviteUrl: string | null;
  currentParentId: string | null;
  currentMembership: { role: CommunityRole; parentId: string } | null;
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
  imageUrl: "",
  visibility: "private",
  notes: "",
};

type CommunityEventForm = typeof BLANK_EVENT;

const BLANK_MEMBER = { email: "", role: "member" as CommunityRole };
const BLANK_INVITE = { email: "" };
const BLANK_ITEM = { title: "", quantity: "", note: "", assignedToParentId: "" };
const BLANK_GROUP_FORM = {
  name: "",
  groupType: "other",
  description: "",
  location: "",
  visibility: "private",
};
const COMMON_POTLUCK_ITEMS: StarterItem[] = [
  { title: "Main dish", quantity: "2 trays", note: "Enough to share" },
  { title: "Side dish", quantity: "2 bowls", note: "" },
  { title: "Dessert", quantity: "1 tray", note: "" },
  { title: "Drinks", quantity: "24 pack", note: "Water or juice" },
  { title: "Plates", quantity: "1 pack", note: "" },
  { title: "Napkins", quantity: "1 pack", note: "" },
  { title: "Utensils", quantity: "1 pack", note: "" },
];

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

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const groupId = params.id;
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [eventForm, setEventForm] = useState(BLANK_EVENT);
  const [editEventForm, setEditEventForm] = useState<CommunityEventForm>(BLANK_EVENT);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState(BLANK_MEMBER);
  const [eventInviteForms, setEventInviteForms] = useState<Record<string, typeof BLANK_INVITE>>({});
  const [invitingEventId, setInvitingEventId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState(BLANK_GROUP_FORM);
  const [editingGroup, setEditingGroup] = useState(false);
  const [itemForms, setItemForms] = useState<Record<string, typeof BLANK_ITEM>>({});
  const [eventPrompt, setEventPrompt] = useState("");
  const [draftingEvent, setDraftingEvent] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [starterItems, setStarterItems] = useState<StarterItem[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [origin, setOrigin] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const eventId = new URLSearchParams(window.location.search).get("event");
      const query = new URLSearchParams({ id: groupId });
      if (eventId) query.set("event", eventId);
      const res = await fetch(`/api/community/groups?${query.toString()}`);
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

  useEffect(() => {
    setOrigin(window.location.origin);
    const eventId = new URLSearchParams(window.location.search).get("event");
    if (eventId) setSelectedEventId(eventId);
  }, []);

  useEffect(() => {
    if (!group || !selectedEventId) return;
    window.setTimeout(() => {
      document.getElementById(`event-${selectedEventId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [group, selectedEventId]);

  useEffect(() => {
    if (!group || editingGroup) return;
    setGroupForm({
      name: group.name,
      groupType: group.groupType,
      description: group.description ?? "",
      location: group.location ?? "",
      visibility: group.visibility,
    });
  }, [group, editingGroup]);

  useEffect(() => {
    const query = eventForm.location.trim();
    if (query.length < 4 || query === selectedLocation) {
      setLocationSuggestions([]);
      setLocationStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLocationStatus("loading");
      try {
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`/api/locations?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Address lookup failed");
        const data = (await res.json()) as { results?: LocationSuggestion[] };
        setLocationSuggestions(Array.isArray(data.results) ? data.results : []);
        setLocationStatus("idle");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setLocationSuggestions([]);
        setLocationStatus("error");
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [eventForm.location, selectedLocation]);

  const role = group?.currentMembership?.role ?? null;
  const canManage = role ? ROLE_RANK[role] >= ROLE_RANK.manager : false;
  const isOwner = role === "owner";
  const canParticipate = Boolean(role);
  const meta = group ? groupMeta(group.groupType) : GROUP_TYPE_META.other;

  function eventSharePath(eventId: string) {
    return `/community/${groupId}?event=${eventId}`;
  }

  function eventShareUrl(eventId: string) {
    const path = eventSharePath(eventId);
    return origin ? `${origin}${path}` : path;
  }

  function eventQrUrl(eventId: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(eventShareUrl(eventId))}`;
  }

  function groupQrUrl() {
    if (!group?.groupInviteUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(group.groupInviteUrl)}`;
  }

  const upcomingEvents = useMemo(
    () => [...(group?.events ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [group?.events]
  );

  async function copyEventLink(eventId: string) {
    await navigator.clipboard.writeText(eventShareUrl(eventId));
    toast.success("Event link copied");
  }

  async function copyGroupInviteLink() {
    if (!group?.groupInviteUrl) return;
    await navigator.clipboard.writeText(group.groupInviteUrl);
    toast.success("Group invite link copied");
  }

  async function shareGroupInvite() {
    if (!group?.groupInviteUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: `Join ${group.name}`,
        text: `Create an account and join ${group.name} on ChoresList.`,
        url: group.groupInviteUrl,
      });
      return;
    }
    await copyGroupInviteLink();
  }

  async function shareEvent(event: CommunityEvent) {
    const url = eventShareUrl(event.id);
    if (navigator.share) {
      await navigator.share({
        title: event.title,
        text: `Join ${event.title} with ${group?.name ?? "our community group"}.`,
        url,
      });
      return;
    }
    await copyEventLink(event.id);
  }

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

  async function emailGroupInvite() {
    if (!memberForm.email.trim()) {
      toast.error("Email is required");
      return;
    }
    const res = await fetch("/api/community/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, ...memberForm }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not email invite");
      return;
    }
    toast.success(data?.sent ? "Invite email sent" : "Invite link created");
    if (data?.inviteUrl) await navigator.clipboard.writeText(data.inviteUrl);
    setMemberForm(BLANK_MEMBER);
  }

  async function emailEventInvite(event: CommunityEvent) {
    const form = eventInviteForms[event.id] ?? BLANK_INVITE;
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    setInvitingEventId(event.id);
    try {
      const res = await fetch("/api/community/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, eventId: event.id, email: form.email, role: "member" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not email invite");
        return;
      }
      toast.success(data?.sent ? "Invite email sent" : "Invite link created");
      if (data?.inviteUrl) await navigator.clipboard.writeText(data.inviteUrl);
      setEventInviteForms((current) => ({ ...current, [event.id]: BLANK_INVITE }));
    } finally {
      setInvitingEventId(null);
    }
  }

  function startEditingGroup() {
    if (!group) return;
    setGroupForm({
      name: group.name,
      groupType: group.groupType,
      description: group.description ?? "",
      location: group.location ?? "",
      visibility: group.visibility,
    });
    setEditingGroup(true);
  }

  async function updateGroup() {
    if (!group) return;
    if (!groupForm.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    const res = await fetch("/api/community/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: group.id, ...groupForm }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not update group");
      return;
    }
    toast.success("Community group updated");
    setEditingGroup(false);
    await load();
  }

  async function generateEventDraft() {
    if (eventPrompt.trim().length < 4) {
      toast.error("Describe the event first");
      return;
    }
    setDraftingEvent(true);
    try {
      const res = await fetch("/api/community/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: eventPrompt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not draft event");
        return;
      }

      const draft = data.draft ?? {};
      setEventForm((current) => ({
        ...current,
        title: draft.title ?? current.title,
        eventType: draft.eventType ?? current.eventType,
        date: draft.date || current.date,
        endDate: draft.endDate || current.endDate,
        location: draft.location ?? current.location,
        notes: draft.notes ?? current.notes,
      }));
      setSelectedLocation(draft.location ?? "");
      setStarterItems(Array.isArray(draft.items) ? draft.items : []);
      toast.success("Event draft filled in");
    } finally {
      setDraftingEvent(false);
    }
  }

  async function uploadCommunityEventImage(file: File, target: "create" | "edit" = "create") {
    setImageUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/community/image", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not upload image");
        return;
      }
      if (target === "edit") {
        setEditEventForm((current) => ({ ...current, imageUrl: data.path }));
      } else {
        setEventForm((current) => ({ ...current, imageUrl: data.path }));
      }
      toast.success("Image optimized");
    } finally {
      setImageUploading(false);
    }
  }

  function addCommonPotluckItems() {
    setStarterItems((current) => {
      const existing = new Set(current.map((item) => item.title.toLowerCase()));
      const next = COMMON_POTLUCK_ITEMS.filter((item) => !existing.has(item.title.toLowerCase()));
      return [...current, ...next];
    });
  }

  async function createEvent() {
    if (!eventForm.title.trim() || !eventForm.date) {
      toast.error("Event title and date are required");
      return;
    }
    const res = await fetch("/api/community/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, ...eventForm, endDate: eventForm.endDate || null, items: starterItems }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not create event");
      return;
    }
    toast.success("Event created");
    setEventForm(BLANK_EVENT);
    setEventPrompt("");
    setStarterItems([]);
    setSelectedLocation("");
    setLocationSuggestions([]);
    setShowCreateEvent(false);
    await load();
  }

  function startEditingEvent(event: CommunityEvent) {
    setEditingEventId(event.id);
    setEditEventForm({
      title: event.title,
      eventType: event.eventType,
      date: toDateTimeLocal(event.date),
      endDate: toDateTimeLocal(event.endDate),
      location: event.location ?? "",
      imageUrl: event.imageUrl ?? "",
      visibility: event.visibility,
      notes: event.notes ?? "",
    });
  }

  async function updateEvent() {
    if (!editingEventId) return;
    if (!editEventForm.title.trim() || !editEventForm.date) {
      toast.error("Event title and date are required");
      return;
    }
    const res = await fetch("/api/community/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingEventId,
        ...editEventForm,
        endDate: editEventForm.endDate || null,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not update event");
      return;
    }
    toast.success("Event updated");
    setEditingEventId(null);
    setEditEventForm(BLANK_EVENT);
    await load();
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/community/events?id=${eventId}`, { method: "DELETE" });
    toast.success("Event deleted");
    await load();
  }

  async function rsvp(eventId: string, status: RsvpStatus) {
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

  async function addItem(eventId: string) {
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
        assignedToParentId: form.assignedToParentId || null,
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

  async function claimItem(itemId: string) {
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

  async function unclaimItem(itemId: string) {
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

  async function deleteItem(itemId: string) {
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
            {canManage && (
              <button
                type="button"
                onClick={startEditingGroup}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-600 shadow-sm hover:shadow-md"
              >
                <Pencil size={17} /> Edit Group
              </button>
            )}
          </>
        )}
      </div>

      {group && (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {canManage && editingGroup && (
              <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-black text-slate-800">Edit Community Group</h2>
                  <button
                    type="button"
                    onClick={() => setEditingGroup(false)}
                    className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-bold">Group name</Label>
                    <Input
                      value={groupForm.name}
                      onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                      className="mt-1 rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Type</Label>
                    <Select
                      value={groupForm.groupType}
                      onValueChange={(value) => setGroupForm((current) => ({ ...current, groupType: value ?? "other" }))}
                    >
                      <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(GROUP_TYPE_META).map(([value, item]) => (
                          <SelectItem key={value} value={value}>{item.icon} {item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Location</Label>
                    <Input
                      value={groupForm.location}
                      onChange={(event) => setGroupForm((current) => ({ ...current, location: event.target.value }))}
                      placeholder="City, venue, or meeting area"
                      className="mt-1 rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Visibility</Label>
                    <Select
                      value={groupForm.visibility}
                      onValueChange={(value) => setGroupForm((current) => ({ ...current, visibility: value ?? "private" }))}
                    >
                      <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public discovery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-bold">Description</Label>
                    <Textarea
                      value={groupForm.description}
                      onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Who this group is for and what you organize together."
                      className="mt-1 rounded-2xl"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={updateGroup}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 font-black text-white hover:bg-emerald-600"
                >
                  <Save size={17} /> Save Changes
                </button>
              </div>
            )}
            {canManage && (
              <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-black text-slate-800"><CalendarDays size={18} className="text-violet-500" /> Events</h2>
                  <button
                    type="button"
                    onClick={() => setShowCreateEvent((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white hover:bg-violet-600"
                  >
                    {showCreateEvent ? <X size={17} /> : <Plus size={17} />}
                    {showCreateEvent ? "Close Form" : "Create Event"}
                  </button>
                </div>
                {showCreateEvent && (
                  <>
                <div className="mt-4 mb-4 rounded-2xl bg-violet-50 p-3">
                  <Label className="text-sm font-bold text-violet-800">AI event prompt</Label>
                  <Textarea
                    value={eventPrompt}
                    onChange={(event) => setEventPrompt(event.target.value)}
                    placeholder="Example: Church potluck next Friday at 6pm at 123 Main St. Add common things people should bring."
                    className="mt-1 min-h-20 resize-none rounded-xl bg-white"
                  />
                  <button
                    type="button"
                    onClick={generateEventDraft}
                    disabled={draftingEvent || eventPrompt.trim().length < 4}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white hover:bg-violet-600 disabled:opacity-50"
                  >
                    <Wand2 size={16} />
                    {draftingEvent ? "Filling fields..." : "Fill Event with AI"}
                  </button>
                </div>
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
                  <div>
                    <Label className="text-sm font-bold">Visibility</Label>
                    <Select value={eventForm.visibility} onValueChange={(value) => setEventForm((current) => ({ ...current, visibility: value ?? "private" }))}>
                      <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public event link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-bold">Location</Label>
                    <div className="relative mt-1">
                      <Input
                        value={eventForm.location}
                        onChange={(event) => {
                          setSelectedLocation("");
                          setEventForm((current) => ({ ...current, location: event.target.value }));
                        }}
                        placeholder={group.location ?? "Start typing an address..."}
                        autoComplete="off"
                        className="rounded-2xl pr-9"
                      />
                      <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      {(locationStatus === "loading" || locationStatus === "error" || locationSuggestions.length > 0) && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg">
                          {locationStatus === "loading" && (
                            <p className="px-3 py-2 text-sm font-bold text-slate-400">Looking up addresses...</p>
                          )}
                          {locationStatus === "error" && (
                            <p className="px-3 py-2 text-sm font-bold text-red-400">Address lookup is unavailable</p>
                          )}
                          {locationStatus !== "loading" &&
                            locationSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLocation(suggestion.label);
                                  setEventForm((current) => ({ ...current, location: suggestion.label }));
                                  setLocationSuggestions([]);
                                }}
                                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-violet-50"
                              >
                                <MapPin size={15} className="mt-0.5 shrink-0 text-violet-400" />
                                <span className="min-w-0">
                                  <span className="block text-sm font-black text-slate-700">{suggestion.label}</span>
                                  <span className="block truncate text-xs font-semibold text-slate-400">{suggestion.fullAddress}</span>
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-bold">Notes</Label>
                    <Textarea value={eventForm.notes} onChange={(event) => setEventForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Details, instructions, or RSVP notes." className="mt-1 rounded-2xl" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-bold">Event image</Label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={imageUploading}
                      className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-violet-700 disabled:opacity-60"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadCommunityEventImage(file);
                        event.currentTarget.value = "";
                      }}
                    />
                    {imageUploading && <p className="mt-1 text-xs font-bold text-slate-400">Optimizing image...</p>}
                    {eventForm.imageUrl.startsWith("/uploads/") && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-100">
                        <img src={eventForm.imageUrl} alt="" className="h-40 w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-slate-800">Starter items</p>
                    <button
                      type="button"
                      onClick={addCommonPotluckItems}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-50"
                    >
                      Add common potluck items
                    </button>
                  </div>
                  {starterItems.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {starterItems.map((item, index) => (
                        <span key={`${item.title}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                          {item.title}{item.quantity ? ` · ${item.quantity}` : ""}
                          <button
                            type="button"
                            onClick={() => setStarterItems((current) => current.filter((_, i) => i !== index))}
                            className="text-red-300 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-400">AI or the common-items button can prefill potluck supplies here.</p>
                  )}
                </div>
                <button type="button" onClick={createEvent} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white hover:bg-violet-600">
                  <Plus size={17} /> Create Event
                </button>
                  </>
                )}
              </div>
            )}

            {upcomingEvents.map((event) => {
              const counts = rsvpCounts(event);
              const myRsvp = event.rsvps.find((rsvpItem) => rsvpItem.parentId === group.currentParentId);
              const eMeta = eventMeta(event.eventType);
              const itemForm = itemForms[event.id] ?? BLANK_ITEM;
              const inviteForm = eventInviteForms[event.id] ?? BLANK_INVITE;
              const shareUrl = eventShareUrl(event.id);
              return (
                <div
                  key={event.id}
                  id={`event-${event.id}`}
                  className={`scroll-mt-5 rounded-3xl bg-white p-4 shadow-sm sm:p-5 ${selectedEventId === event.id ? "ring-2 ring-violet-200" : ""}`}
                >
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
                      {event.imageUrl?.startsWith("/uploads/") && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                          <img src={event.imageUrl} alt="" className="max-h-80 w-full object-cover" />
                        </div>
                      )}
                      {event.notes && <p className="mt-2 text-sm font-semibold text-slate-500">{event.notes}</p>}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditingEvent(event)} className="self-start rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => deleteEvent(event.id)} className="self-start rounded-xl bg-red-50 p-2 text-red-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-4 grid gap-3 rounded-2xl bg-violet-50 p-3 lg:grid-cols-[1fr_150px]">
                    <div className="min-w-0">
                      <p className="mb-1 flex items-center gap-2 text-sm font-black text-violet-900"><Share2 size={15} /> Share event</p>
                      <p className="truncate rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">{shareUrl}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyEventLink(event.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          <Copy size={14} /> Copy URL
                        </button>
                        <button
                          type="button"
                          onClick={() => shareEvent(event)}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-black text-white hover:bg-violet-600"
                        >
                          <Share2 size={14} /> Share
                        </button>
                      </div>
                      {canManage && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <div className="relative">
                            <Input
                              type="email"
                              value={inviteForm.email}
                              onChange={(input) => setEventInviteForms((current) => ({ ...current, [event.id]: { email: input.target.value } }))}
                              placeholder="Invite by email"
                              className="rounded-xl bg-white pl-9"
                            />
                            <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                          <button
                            type="button"
                            onClick={() => emailEventInvite(event)}
                            disabled={invitingEventId === event.id || !inviteForm.email.trim()}
                            className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            {invitingEventId === event.id ? "Sending..." : "Email Invite"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 lg:flex-col">
                      <QrCode size={18} className="text-violet-500 lg:hidden" />
                      <img src={eventQrUrl(event.id)} alt={`${event.title} QR code`} className="h-28 w-28 rounded-xl bg-white object-contain" />
                      <p className="text-xs font-black text-slate-500 lg:text-center">Scan to open</p>
                    </div>
                  </div>

                  {canManage && editingEventId === event.id && (
                    <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="font-black text-violet-900">Edit event</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(null);
                            setEditEventForm(BLANK_EVENT);
                          }}
                          className="rounded-xl bg-white p-2 text-slate-500 hover:bg-slate-100"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label className="text-sm font-bold">Title</Label>
                          <Input
                            value={editEventForm.title}
                            onChange={(input) => setEditEventForm((current) => ({ ...current, title: input.target.value }))}
                            className="mt-1 rounded-2xl bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold">Type</Label>
                          <Select
                            value={editEventForm.eventType}
                            onValueChange={(value) => setEditEventForm((current) => ({ ...current, eventType: value ?? "other" }))}
                          >
                            <SelectTrigger className="mt-1 rounded-2xl bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EVENT_TYPES.map((eventType) => (
                                <SelectItem key={eventType.value} value={eventType.value}>{eventType.icon} {eventType.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-bold">Starts</Label>
                          <Input
                            type="datetime-local"
                            value={editEventForm.date}
                            onChange={(input) => setEditEventForm((current) => ({ ...current, date: input.target.value }))}
                            className="mt-1 rounded-2xl bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold">Ends optional</Label>
                          <Input
                            type="datetime-local"
                            value={editEventForm.endDate}
                            onChange={(input) => setEditEventForm((current) => ({ ...current, endDate: input.target.value }))}
                            className="mt-1 rounded-2xl bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold">Visibility</Label>
                          <Select
                            value={editEventForm.visibility}
                            onValueChange={(value) => setEditEventForm((current) => ({ ...current, visibility: value ?? "private" }))}
                          >
                            <SelectTrigger className="mt-1 rounded-2xl bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="public">Public event link</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-bold">Location</Label>
                          <Input
                            value={editEventForm.location}
                            onChange={(input) => setEditEventForm((current) => ({ ...current, location: input.target.value }))}
                            className="mt-1 rounded-2xl bg-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-bold">Notes</Label>
                          <Textarea
                            value={editEventForm.notes}
                            onChange={(input) => setEditEventForm((current) => ({ ...current, notes: input.target.value }))}
                            className="mt-1 rounded-2xl bg-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-bold">Event image</Label>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={imageUploading}
                            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-violet-700 disabled:opacity-60"
                            onChange={(input) => {
                              const file = input.target.files?.[0];
                              if (file) uploadCommunityEventImage(file, "edit");
                              input.currentTarget.value = "";
                            }}
                          />
                          {editEventForm.imageUrl.startsWith("/uploads/") && (
                            <div className="mt-2 overflow-hidden rounded-2xl border border-violet-100">
                              <img src={editEventForm.imageUrl} alt="" className="h-40 w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={updateEvent}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 font-black text-white hover:bg-emerald-600"
                      >
                        <Save size={17} /> Save Event
                      </button>
                    </div>
                  )}

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
                    ) : event.publicInviteUrl ? (
                      <a
                        href={event.publicInviteUrl}
                        className="inline-flex items-center justify-center rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white hover:bg-violet-600"
                      >
                        Sign in to RSVP and claim items
                      </a>
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

            {canManage && group.groupInviteUrl && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 font-black text-slate-800"><QrCode size={18} className="text-violet-500" /> Group Join QR</h2>
                <div className="rounded-2xl bg-violet-50 p-3">
                  <img src={groupQrUrl()} alt={`${group.name} join QR code`} className="mx-auto h-52 w-52 rounded-xl bg-white p-2 object-contain" />
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Scan to create a parent account or sign in, then join this group as a member.
                </p>
                <p className="mt-2 truncate rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{group.groupInviteUrl}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="button"
                    onClick={copyGroupInviteLink}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-2.5 font-black text-slate-700 hover:bg-slate-200"
                  >
                    <Copy size={16} /> Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={shareGroupInvite}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 py-2.5 font-black text-white hover:bg-violet-600"
                  >
                    <Share2 size={16} /> Share
                  </button>
                </div>
              </div>
            )}

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
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <button type="button" onClick={addMember} className="rounded-2xl bg-emerald-500 py-2.5 font-black text-white hover:bg-emerald-600">
                      Add Existing
                    </button>
                    <button type="button" onClick={emailGroupInvite} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 py-2.5 font-black text-white hover:bg-violet-600">
                      <Mail size={16} /> Email Invite
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
