"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Link as LinkIcon,
  FileText,
  ImageIcon,
  CloudSun,
  CloudRain,
  Navigation,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EVENT_TYPE_META, type EventType } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ParentPinGate } from "@/components/parent-pin-gate";

type RecurringMode = "none" | "weekly" | "monthly";
type RecurringEndMode = "never" | "date" | "count";
type ViewMode = "month" | "week" | "day";

interface FamilyEvent {
  id: number;
  title: string;
  eventType: EventType;
  date: string;
  endDate?: string | null;
  allDay: boolean;
  recurring: string;
  recurringEndDate?: string | null;
  recurringCount?: number | null;
  location?: string | null;
  meetingUrl?: string | null;
  rsvpUrl?: string | null;
  flyerUrl?: string | null;
  registrationUrl?: string | null;
  registrationNotes?: string | null;
  resources?: string | null;
  notes?: string | null;
  color: string;
  icon: string;
}

type DisplayEvent = FamilyEvent & { _seriesId: number; _isOccurrence: boolean };

interface WeatherForecast {
  fetchedAt: string;
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    windGusts: number;
    cloudCover: number;
    precipitationProbability: number;
    weatherCode: number;
  };
  daily: {
    date: string;
    weatherCode: number;
    temperatureMax: number;
    temperatureMin: number;
    precipitationProbability: number;
  }[];
}

interface LocationSuggestion {
  id: string;
  label: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS_FULL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const DURATION_PRESETS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
  { label: "4 hours", minutes: 240 },
  { label: "6 hours", minutes: 360 },
];

const MAX_EXPAND = 520;
const WEATHER_CACHE_KEY = "calendar-local-weather-v2";
const WEATHER_CACHE_MS = 30 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function utcDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function localDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function eventDateKey(e: { allDay: boolean; date: string }) {
  return e.allDay ? utcDateKey(e.date) : localDateKey(e.date);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function eventTimeLabel(e: { allDay: boolean; date: string; endDate?: string | null }) {
  if (e.allDay) return null;
  const start = formatTime(e.date);
  if (!e.endDate) return start;
  return `${start} – ${formatTime(e.endDate)}`;
}

function eventStartMillis(e: { allDay: boolean; date: string }) {
  if (e.allDay) return -1;
  return new Date(e.date).getTime();
}

function startOfWeek(d: Date) {
  const result = new Date(d);
  const dow = result.getDay();
  result.setDate(result.getDate() - dow);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(d: Date, n: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function addMonths(d: Date, n: number) {
  const result = new Date(d);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function expandOccurrences(events: FamilyEvent[], windowStart: Date, windowEnd: Date): DisplayEvent[] {
  const out: DisplayEvent[] = [];

  for (const e of events) {
    const recurring = (e.recurring ?? "none") as RecurringMode;

    if (recurring === "none") {
      out.push({ ...e, _seriesId: e.id, _isOccurrence: false });
      continue;
    }

    const start = new Date(e.date);
    const seriesEnd = e.recurringEndDate ? new Date(e.recurringEndDate) : null;
    const maxCount = e.recurringCount && e.recurringCount > 0 ? e.recurringCount : MAX_EXPAND;
    const duration = e.endDate ? new Date(e.endDate).getTime() - start.getTime() : 0;

    for (let i = 0; i < maxCount && i < MAX_EXPAND; i++) {
      const occStart = recurring === "weekly" ? addDays(start, 7 * i) : addMonths(start, i);
      if (seriesEnd && occStart.getTime() > seriesEnd.getTime()) break;
      if (occStart.getTime() > windowEnd.getTime()) break;

      const occEnd = e.endDate ? new Date(occStart.getTime() + duration) : null;
      const occDateKey = e.allDay ? utcDateKey(occStart.toISOString()) : localDateKey(occStart.toISOString());
      const windowStartKey = `${windowStart.getFullYear()}-${pad(windowStart.getMonth() + 1)}-${pad(windowStart.getDate())}`;
      if (occDateKey < windowStartKey) continue;

      out.push({
        ...e,
        date: occStart.toISOString(),
        endDate: occEnd ? occEnd.toISOString() : null,
        _seriesId: e.id,
        _isOccurrence: i > 0,
      });
    }
  }

  return out;
}

function meta(eventType: string) {
  return EVENT_TYPE_META[eventType as EventType];
}

function weatherSummary(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storms";
  return "Forecast";
}

function weatherDescription(code: number) {
  if (code === 0) return "Sunny";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzling";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Raining";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowing";
  if ([95, 96, 99].includes(code)) return "Stormy";
  return "Current weather";
}

function formatTemperature(value: number) {
  return `${Math.round(value)}°`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function isValidForecast(value: WeatherForecast) {
  return (
    Number.isFinite(value.current?.temperature) &&
    Number.isFinite(value.current?.feelsLike) &&
    Number.isFinite(value.current?.humidity) &&
    Number.isFinite(value.current?.cloudCover) &&
    Number.isFinite(value.current?.windSpeed) &&
    Array.isArray(value.daily)
  );
}

export default function CalendarPage() {
  return (
    <ParentPinGate>
      <CalendarContent />
    </ParentPinGate>
  );
}

function CalendarContent() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(today);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [form, setForm] = useState({
    title: "",
    eventType: "other" as EventType,
    date: "",
    allDay: true,
    startTime: "18:00",
    durationMinutes: 60,
    recurring: "none" as RecurringMode,
    recurringEndMode: "never" as RecurringEndMode,
    recurringEndDate: "",
    recurringCount: 4,
    location: "",
    meetingUrl: "",
    rsvpUrl: "",
    flyerUrl: "",
    registrationUrl: "",
    registrationNotes: "",
    resources: "",
    notes: "",
  });

  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;

  const load = useCallback(async () => {
    const res = await fetch(`/api/events?month=${month}&year=${year}`);
    setEvents(await res.json());
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const query = form.location.trim();
    if (!open || query.length < 4 || query === selectedLocation) {
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
  }, [form.location, open, selectedLocation]);

  const windowRange = useMemo(() => {
    if (view === "month") {
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59),
      };
    }
    if (view === "week") {
      const s = startOfWeek(anchor);
      return { start: s, end: addDays(s, 7) };
    }
    const d = new Date(anchor);
    d.setHours(0, 0, 0, 0);
    return { start: d, end: addDays(d, 1) };
  }, [view, anchor, month, year]);

  const expanded: DisplayEvent[] = useMemo(
    () => expandOccurrences(events, windowRange.start, windowRange.end),
    [events, windowRange]
  );

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, DisplayEvent[]>();
    for (const e of expanded) {
      const key = eventDateKey(e);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => eventStartMillis(a) - eventStartMillis(b));
    }
    return map;
  }, [expanded]);

  function openNewEvent(dateStr?: string) {
    const d = dateStr ?? dateInputValue(anchor);
    setForm({
      title: "",
      eventType: "other",
      date: d,
      allDay: true,
      startTime: "18:00",
      durationMinutes: 60,
      recurring: "none",
      recurringEndMode: "never",
      recurringEndDate: "",
      recurringCount: 4,
      location: "",
      meetingUrl: "",
      rsvpUrl: "",
      flyerUrl: "",
      registrationUrl: "",
      registrationNotes: "",
      resources: "",
      notes: "",
    });
    setSelectedLocation("");
    setLocationSuggestions([]);
    setLocationStatus("idle");
    setOpen(true);
  }

  async function saveEvent() {
    if (!form.title || !form.date) {
      toast.error("Title and date required");
      return;
    }
    if (!form.allDay && form.durationMinutes <= 0) {
      toast.error("Duration must be at least 1 minute");
      return;
    }
    if (form.recurring !== "none" && form.recurringEndMode === "date" && !form.recurringEndDate) {
      toast.error("Pick a date for the recurring end");
      return;
    }
    if (form.recurring !== "none" && form.recurringEndMode === "count" && form.recurringCount < 1) {
      toast.error("Number of times must be at least 1");
      return;
    }

    const eMeta = meta(form.eventType);
    const [y, mo, d] = form.date.split("-").map(Number);

    let startIso: string;
    let endIso: string | null;
    if (form.allDay) {
      startIso = new Date(Date.UTC(y, mo - 1, d)).toISOString();
      endIso = null;
    } else {
      const [hh, mm] = form.startTime.split(":").map(Number);
      const start = new Date(y, mo - 1, d, hh, mm, 0);
      startIso = start.toISOString();
      endIso = new Date(start.getTime() + form.durationMinutes * 60_000).toISOString();
    }

    let recurringEndDateIso: string | null = null;
    let recurringCount: number | null = null;
    if (form.recurring !== "none") {
      if (form.recurringEndMode === "date" && form.recurringEndDate) {
        const [ry, rmo, rd] = form.recurringEndDate.split("-").map(Number);
        recurringEndDateIso = new Date(Date.UTC(ry, rmo - 1, rd, 23, 59, 59)).toISOString();
      } else if (form.recurringEndMode === "count") {
        recurringCount = form.recurringCount;
      }
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        eventType: form.eventType,
        date: startIso,
        endDate: endIso,
        allDay: form.allDay,
        recurring: form.recurring,
        recurringEndDate: recurringEndDateIso,
        recurringCount,
        location: form.location,
        meetingUrl: form.meetingUrl,
        rsvpUrl: form.rsvpUrl,
        flyerUrl: form.flyerUrl,
        registrationUrl: form.registrationUrl,
        registrationNotes: form.registrationNotes,
        resources: form.resources,
        notes: form.notes,
        color: eMeta.color,
        icon: eMeta.icon,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Could not add event");
      return;
    }
    toast.success("Event added!");
    setOpen(false);
    load();
  }

  async function uploadEventImage(file: File) {
    setImageUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/events/image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not upload image");
        return;
      }
      setForm((p) => ({ ...p, flyerUrl: data.path }));
      toast.success("Image optimized");
    } finally {
      setImageUploading(false);
    }
  }

  async function deleteEvent(displayEvent: DisplayEvent) {
    const targetId = displayEvent._seriesId;
    if (displayEvent._isOccurrence || displayEvent.recurring !== "none") {
      const confirmed = window.confirm("This will delete the entire recurring series. Continue?");
      if (!confirmed) return;
    }
    await fetch(`/api/events?id=${targetId}`, { method: "DELETE" });
    toast.success("Event removed");
    load();
  }

  function navigate(direction: -1 | 1) {
    if (view === "month") {
      setAnchor(addMonths(anchor, direction));
    } else if (view === "week") {
      setAnchor(addDays(anchor, 7 * direction));
    } else {
      setAnchor(addDays(anchor, direction));
    }
    setSelectedDate("");
  }

  function goToday() {
    setAnchor(new Date());
    setSelectedDate("");
  }

  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[month - 1]} ${year}`;
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      const left = `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()}`;
      const right = sameMonth
        ? `${e.getDate()}, ${e.getFullYear()}`
        : `${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`;
      return `${left} – ${right}`;
    }
    return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, anchor, month, year]);

  const selectedEvents = selectedDate ? eventsByDayKey.get(selectedDate) ?? [] : [];

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-3xl font-black text-slate-800 flex-1">📅 Family Calendar</h1>
        <button
          onClick={() => openNewEvent()}
          className="flex items-center gap-2 bg-violet-500 text-white rounded-2xl px-4 py-2.5 font-bold hover:bg-violet-600 transition-colors"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* View tabs + nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1 shadow-sm">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-xl px-3 py-1.5 text-sm font-black capitalize transition-colors ${
                view === v ? "bg-violet-500 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v === "day" ? "Day agenda" : v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="bg-white rounded-xl px-3 py-1.5 text-sm font-black text-slate-600 shadow-sm hover:shadow-md">
            Today
          </button>
          <button onClick={() => navigate(-1)} className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-lg font-black text-slate-800 min-w-[10rem] text-center">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      <WeatherWidget />

      {view === "month" && (
        <MonthGrid
          year={year}
          month={month}
          today={today}
          eventsByDayKey={eventsByDayKey}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(selectedDate === d ? "" : d)}
          onOpenEvent={setSelectedEvent}
        />
      )}

      {view === "week" && (
        <WeekGrid
          anchor={anchor}
          today={today}
          eventsByDayKey={eventsByDayKey}
          onOpenNew={(d) => openNewEvent(d)}
          onDeleteEvent={deleteEvent}
          onOpenEvent={setSelectedEvent}
        />
      )}

      {view === "day" && (
        <DayAgenda
          anchor={anchor}
          eventsByDayKey={eventsByDayKey}
          onOpenNew={(d) => openNewEvent(d)}
          onDeleteEvent={deleteEvent}
          onOpenEvent={setSelectedEvent}
        />
      )}

      {/* Selected day events (month view) */}
      {view === "month" && selectedDate && (
        <div className="mt-6">
          <h2 className="font-black text-slate-700 mb-3">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h2>
          {selectedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-slate-400 font-semibold">No events this day</p>
              <button onClick={() => openNewEvent(selectedDate)} className="mt-2 text-violet-500 font-bold text-sm hover:text-violet-700">
                + Add event
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <EventRow key={`${e._seriesId}-${e.date}`} e={e} onOpen={() => setSelectedEvent(e)} onDelete={() => deleteEvent(e)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event type legend */}
      <div className="bg-white/70 rounded-3xl p-4 shadow-sm mt-6">
        <h3 className="font-black text-slate-700 mb-3 text-sm">Event Types</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([key, m]) => (
            <div key={key} className="flex items-center gap-1 text-xs font-bold text-slate-600">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: m.color }} />
              {m.icon} {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Add Family Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="font-bold">Event Type</Label>
              <Select
                value={form.eventType}
                onValueChange={(v) => setForm((p) => ({ ...p, eventType: (v ?? "other") as EventType }))}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([key, m]) => (
                    <SelectItem key={key} value={key}>{m.icon} {m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={EVENT_TYPE_META[form.eventType]?.label ?? "Event name"}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="font-bold">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="rounded-xl mt-1"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm((p) => ({ ...p, allDay: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
              />
              <span className="text-sm font-bold text-slate-700">All day</span>
            </label>

            {!form.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold">Start time</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold">Duration</Label>
                  <Select
                    value={String(form.durationMinutes)}
                    onValueChange={(v) => setForm((p) => ({ ...p, durationMinutes: parseInt(v ?? "60", 10) || 60 }))}
                  >
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_PRESETS.map((d) => (
                        <SelectItem key={d.minutes} value={String(d.minutes)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label className="font-bold">Repeats</Label>
              <Select
                value={form.recurring}
                onValueChange={(v) => setForm((p) => ({ ...p, recurring: ((v ?? "none") as RecurringMode) }))}
              >
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recurring !== "none" && (
              <div className="rounded-2xl bg-slate-50 p-3 space-y-3">
                <p className="text-sm font-black text-slate-700">Ends</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recurringEndMode"
                      checked={form.recurringEndMode === "never"}
                      onChange={() => setForm((p) => ({ ...p, recurringEndMode: "never" }))}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-400"
                    />
                    <span className="text-sm font-bold text-slate-600">Never</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recurringEndMode"
                      checked={form.recurringEndMode === "date"}
                      onChange={() => setForm((p) => ({ ...p, recurringEndMode: "date" }))}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-400"
                    />
                    <span className="text-sm font-bold text-slate-600">On date</span>
                    {form.recurringEndMode === "date" && (
                      <Input
                        type="date"
                        value={form.recurringEndDate}
                        onChange={(e) => setForm((p) => ({ ...p, recurringEndDate: e.target.value }))}
                        className="rounded-xl ml-2 max-w-[170px]"
                      />
                    )}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recurringEndMode"
                      checked={form.recurringEndMode === "count"}
                      onChange={() => setForm((p) => ({ ...p, recurringEndMode: "count" }))}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-400"
                    />
                    <span className="text-sm font-bold text-slate-600">After</span>
                    {form.recurringEndMode === "count" && (
                      <>
                        <Input
                          type="number"
                          min={1}
                          max={520}
                          value={form.recurringCount}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, recurringCount: Math.max(1, parseInt(e.target.value || "1", 10) || 1) }))
                          }
                          className="rounded-xl ml-2 w-20"
                        />
                        <span className="text-sm font-bold text-slate-600">times</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            <div>
              <Label className="font-bold">Location</Label>
              <div className="relative mt-1">
                <Input
                  value={form.location}
                  onChange={(e) => {
                    setSelectedLocation("");
                    setForm((p) => ({ ...p, location: e.target.value }));
                  }}
                  placeholder="Start typing an address..."
                  autoComplete="off"
                  className="rounded-xl pr-9"
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
                            setForm((p) => ({ ...p, location: suggestion.label }));
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

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="font-bold">Meeting link</Label>
                <Input
                  type="url"
                  value={form.meetingUrl}
                  onChange={(e) => setForm((p) => ({ ...p, meetingUrl: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="font-bold">RSVP link</Label>
                <Input
                  type="url"
                  value={form.rsvpUrl}
                  onChange={(e) => setForm((p) => ({ ...p, rsvpUrl: e.target.value }))}
                  placeholder="https://..."
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="font-bold">Flyer link</Label>
                <Input
                  type="url"
                  value={form.flyerUrl}
                  onChange={(e) => setForm((p) => ({ ...p, flyerUrl: e.target.value }))}
                  placeholder="https://..."
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="font-bold">Flyer image</Label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={imageUploading}
                  className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-violet-700 disabled:opacity-60"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadEventImage(file);
                    event.currentTarget.value = "";
                  }}
                />
                {imageUploading && <p className="mt-1 text-xs font-bold text-slate-400">Optimizing image...</p>}
                {form.flyerUrl.startsWith("/uploads/") && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-slate-100">
                    <img src={form.flyerUrl} alt="" className="h-36 w-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <Label className="font-bold">Registration link</Label>
                <Input
                  type="url"
                  value={form.registrationUrl}
                  onChange={(e) => setForm((p) => ({ ...p, registrationUrl: e.target.value }))}
                  placeholder="https://..."
                  className="rounded-xl mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="font-bold">Registration details</Label>
              <Textarea
                value={form.registrationNotes}
                onChange={(e) => setForm((p) => ({ ...p, registrationNotes: e.target.value }))}
                placeholder="Cost, deadline, what to bring..."
                className="rounded-xl mt-1 resize-none"
                rows={2}
              />
            </div>

            <div>
              <Label className="font-bold">Resources</Label>
              <Textarea
                value={form.resources}
                onChange={(e) => setForm((p) => ({ ...p, resources: e.target.value }))}
                placeholder="Links, supply list, leader contact..."
                className="rounded-xl mt-1 resize-none"
                rows={2}
              />
            </div>

            <div>
              <Label className="font-bold">Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any details..."
                className="rounded-xl mt-1 resize-none"
                rows={2}
              />
            </div>
            <button
              onClick={saveEvent}
              className="w-full bg-violet-500 text-white rounded-xl py-3 font-black hover:bg-violet-600 transition-colors"
            >
              Add to Calendar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <EventDetailsDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={(event) => {
          setSelectedEvent(null);
          deleteEvent(event);
        }}
      />
    </div>
  );
}

function WeatherWidget() {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const loadWeather = useCallback((force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as WeatherForecast;
          if (isValidForecast(parsed) && Date.now() - new Date(parsed.fetchedAt).getTime() < WEATHER_CACHE_MS) {
            setForecast(parsed);
            setStatus("idle");
            return;
          }
          localStorage.removeItem(WEATHER_CACHE_KEY);
        }
      } catch {
        localStorage.removeItem(WEATHER_CACHE_KEY);
      }
      setStatus("idle");
      setError("");
      return;
    }

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Location is not available in this browser");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            current:
              "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m",
            hourly: "precipitation_probability",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            temperature_unit: "fahrenheit",
            wind_speed_unit: "mph",
            precipitation_unit: "inch",
            timezone: "auto",
            forecast_days: "5",
          });
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
          if (!res.ok) throw new Error("Could not load weather");
          const data = await res.json();
          const nextForecast: WeatherForecast = {
            fetchedAt: new Date().toISOString(),
            current: {
              temperature: data.current.temperature_2m,
              feelsLike: data.current.apparent_temperature,
              humidity: data.current.relative_humidity_2m ?? 0,
              precipitation: data.current.precipitation ?? 0,
              windSpeed: data.current.wind_speed_10m,
              windGusts: data.current.wind_gusts_10m ?? 0,
              cloudCover: data.current.cloud_cover ?? 0,
              precipitationProbability: data.hourly?.precipitation_probability?.[0] ?? 0,
              weatherCode: data.current.weather_code,
            },
            daily: data.daily.time.map((date: string, index: number) => ({
              date,
              weatherCode: data.daily.weather_code[index],
              temperatureMax: data.daily.temperature_2m_max[index],
              temperatureMin: data.daily.temperature_2m_min[index],
              precipitationProbability: data.daily.precipitation_probability_max[index] ?? 0,
            })),
          };

          setForecast(nextForecast);
          localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(nextForecast));
          setStatus("idle");
        } catch {
          setStatus("error");
          setError("Weather is unavailable right now");
        }
      },
      () => {
        setStatus("error");
        setError("Allow location to show local weather");
      },
      { enableHighAccuracy: false, maximumAge: WEATHER_CACHE_MS, timeout: 10_000 }
    );
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  return (
    <div className="mb-4 rounded-3xl bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <CloudSun size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-800">Local Weather</h2>
              <Navigation size={13} className="text-slate-400" />
            </div>
            {forecast ? (
              <p className="text-sm font-bold text-slate-500">
                {weatherDescription(forecast.current.weatherCode)} · Feels like {formatTemperature(forecast.current.feelsLike)}
              </p>
            ) : (
              <p className="text-sm font-bold text-slate-500">
                {status === "loading" ? "Finding your forecast..." : error || "Use location for local forecast"}
              </p>
            )}
          </div>
        </div>

        {forecast && (
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-4xl lg:grid-cols-7">
            <div className="rounded-2xl bg-sky-50 p-3">
              <p className="text-xs font-black uppercase text-sky-500">Now</p>
              <p className="text-3xl font-black text-slate-800">{formatTemperature(forecast.current.temperature)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{weatherDescription(forecast.current.weatherCode)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Humidity</p>
              <p className="text-2xl font-black text-slate-800">{formatPercent(forecast.current.humidity)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{formatPercent(forecast.current.cloudCover)} clouds</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Rain</p>
              <p className="text-2xl font-black text-slate-800">{formatPercent(forecast.current.precipitationProbability)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{forecast.current.precipitation.toFixed(2)} in now</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Wind</p>
              <p className="text-2xl font-black text-slate-800">{Math.round(forecast.current.windSpeed)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">gust {Math.round(forecast.current.windGusts)} mph</p>
            </div>
            {forecast.daily.slice(0, 3).map((day) => (
              <div key={day.date} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className="mt-1 text-sm font-black text-slate-700">{weatherSummary(day.weatherCode)}</p>
                <p className="text-sm font-bold text-slate-500">
                  {formatTemperature(day.temperatureMax)} / {formatTemperature(day.temperatureMin)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-400">
                  <CloudRain size={12} /> {Math.round(day.precipitationProbability)}%
                </p>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => loadWeather(true)}
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
          {forecast ? "Refresh" : "Use Location"}
        </button>
      </div>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  today,
  eventsByDayKey,
  selectedDate,
  onSelectDate,
  onOpenEvent,
}: {
  year: number;
  month: number;
  today: Date;
  eventsByDayKey: Map<string, DisplayEvent[]>;
  selectedDate: string;
  onSelectDate: (key: string) => void;
  onOpenEvent: (e: DisplayEvent) => void;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_LABELS_FULL.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-black text-slate-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[80px] border-b border-r border-slate-50" />;
          const isToday =
            day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
          const dateStr = `${year}-${pad(month)}-${pad(day)}`;
          const dayEvents = eventsByDayKey.get(dateStr) ?? [];
          const isSelected = selectedDate === dateStr;

          return (
            <div
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[80px] border-b border-r border-slate-50 p-1 cursor-pointer transition-colors ${
                isSelected ? "bg-violet-50" : "hover:bg-slate-50"
              }`}
            >
              <div
                className={`text-sm font-black mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? "bg-violet-500 text-white" : "text-slate-700"
                }`}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const time = eventTimeLabel(e);
                  return (
                    <div
                      key={`${e._seriesId}-${e.date}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenEvent(e);
                      }}
                      className="text-xs font-bold truncate rounded-md px-1 py-0.5 text-white"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.icon} {time ? `${time.split(" – ")[0]} ` : ""}
                      {e.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs font-bold text-slate-400">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor,
  today,
  eventsByDayKey,
  onOpenNew,
  onDeleteEvent,
  onOpenEvent,
}: {
  anchor: Date;
  today: Date;
  eventsByDayKey: Map<string, DisplayEvent[]>;
  onOpenNew: (dateStr: string) => void;
  onDeleteEvent: (e: DisplayEvent) => void;
  onOpenEvent: (e: DisplayEvent) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
      {days.map((d) => {
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const dayEvents = eventsByDayKey.get(key) ?? [];
        const isToday =
          d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        return (
          <div key={key} className="bg-white rounded-2xl shadow-sm p-3 min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-2 ${isToday ? "text-violet-600" : "text-slate-700"}`}>
                <span className="text-xs font-black uppercase">{DAY_LABELS_FULL[d.getDay()]}</span>
                <span
                  className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-violet-500 text-white" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <button
                onClick={() => onOpenNew(key)}
                className="text-violet-400 hover:text-violet-600 text-lg font-black leading-none"
                title="Add event"
              >
                +
              </button>
            </div>
            <div className="flex-1 space-y-1.5">
              {dayEvents.length === 0 ? (
                <p className="text-xs font-bold text-slate-300">No events</p>
              ) : (
                dayEvents.map((e) => {
                  const time = eventTimeLabel(e);
                  return (
                    <div
                      key={`${e._seriesId}-${e.date}`}
                      onClick={() => onOpenEvent(e)}
                      className="rounded-xl p-2 text-xs font-bold flex items-start gap-1 group cursor-pointer hover:shadow-sm"
                      style={{ backgroundColor: e.color + "22", color: "#0f172a" }}
                    >
                      <span className="text-base leading-none">{e.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{e.title}</p>
                        {time && <p className="text-[10px] font-bold text-slate-500">{time}</p>}
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteEvent(e);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayAgenda({
  anchor,
  eventsByDayKey,
  onOpenNew,
  onDeleteEvent,
  onOpenEvent,
}: {
  anchor: Date;
  eventsByDayKey: Map<string, DisplayEvent[]>;
  onOpenNew: (dateStr: string) => void;
  onDeleteEvent: (e: DisplayEvent) => void;
  onOpenEvent: (e: DisplayEvent) => void;
}) {
  const key = `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-${pad(anchor.getDate())}`;
  const dayEvents = eventsByDayKey.get(key) ?? [];

  return (
    <div className="bg-white rounded-3xl shadow-sm p-4">
      {dayEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 font-semibold mb-3">No events scheduled</p>
          <button
            onClick={() => onOpenNew(key)}
            className="bg-violet-500 text-white rounded-xl px-4 py-2 font-bold hover:bg-violet-600"
          >
            + Add Event
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((e) => (
            <EventRow key={`${e._seriesId}-${e.date}`} e={e} onOpen={() => onOpenEvent(e)} onDelete={() => onDeleteEvent(e)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ e, onOpen, onDelete }: { e: DisplayEvent; onOpen?: () => void; onDelete: () => void }) {
  const time = eventTimeLabel(e);
  const m = meta(e.eventType);
  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3 border border-slate-50 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: e.color + "22" }}
      >
        {e.icon}
      </div>
      <div className="flex-1">
        <p className="font-black text-slate-800">
          {e.title}
          {e._isOccurrence && <span className="ml-2 text-xs font-bold text-slate-400">↻</span>}
        </p>
        <p className="text-xs font-bold text-slate-500 mt-0.5">
          {time ? `${time} • ` : ""}
          {m?.label}
          {e.recurring !== "none" && ` • Repeats ${e.recurring}`}
        </p>
        {e.location && (
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
            <MapPin size={12} /> {e.location}
          </p>
        )}
        {e.notes && <p className="text-sm text-slate-500 mt-1">{e.notes}</p>}
        {(e.meetingUrl || e.rsvpUrl || e.flyerUrl || e.registrationUrl) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {e.meetingUrl && <EventLink href={e.meetingUrl} label="Meeting" />}
            {e.rsvpUrl && <EventLink href={e.rsvpUrl} label="RSVP" />}
            {e.flyerUrl && <EventLink href={e.flyerUrl} label="Flyer" />}
            {e.registrationUrl && <EventLink href={e.registrationUrl} label="Register" />}
          </div>
        )}
        {e.flyerUrl?.startsWith("/uploads/") && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
            <img src={e.flyerUrl} alt="" className="h-36 w-full object-cover" />
          </div>
        )}
        {e.registrationNotes && (
          <p className="mt-2 flex items-start gap-1 text-xs font-semibold text-slate-500">
            <FileText size={12} className="mt-0.5 shrink-0" /> {e.registrationNotes}
          </p>
        )}
        {e.resources && <p className="mt-1 text-xs font-semibold text-slate-500">{e.resources}</p>}
      </div>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="text-red-400 hover:text-red-600 p-1 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function EventDetailsDialog({
  event,
  onClose,
  onDelete,
}: {
  event: DisplayEvent | null;
  onClose: () => void;
  onDelete: (event: DisplayEvent) => void;
}) {
  const time = event ? eventTimeLabel(event) : null;
  const m = event ? meta(event.eventType) : null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-black">{event?.icon} {event?.title}</DialogTitle>
        </DialogHeader>
        {event && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ backgroundColor: event.color + "22" }}>
              <p className="text-sm font-black text-slate-700">
                {m?.label}
                {time ? ` • ${time}` : event.allDay ? " • All day" : ""}
                {event.recurring !== "none" ? ` • Repeats ${event.recurring}` : ""}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              {event.location && (
                <p className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-600">
                  <MapPin size={15} /> {event.location}
                </p>
              )}
            </div>

            {event.notes && <DetailBlock title="Event details" value={event.notes} />}
            {event.flyerUrl?.startsWith("/uploads/") && (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <img src={event.flyerUrl} alt="" className="max-h-80 w-full object-cover" />
              </div>
            )}
            {event.registrationNotes && <DetailBlock title="Registration details" value={event.registrationNotes} />}
            {event.resources && <DetailBlock title="Resources" value={event.resources} />}

            {(event.meetingUrl || event.rsvpUrl || event.flyerUrl || event.registrationUrl) && (
              <div className="flex flex-wrap gap-2">
                {event.meetingUrl && <EventLink href={event.meetingUrl} label="Meeting link" />}
                {event.rsvpUrl && <EventLink href={event.rsvpUrl} label="RSVP" />}
                {event.flyerUrl && <EventLink href={event.flyerUrl} label="Flyer" />}
                {event.registrationUrl && <EventLink href={event.registrationUrl} label="Register" />}
              </div>
            )}

            <button
              type="button"
              onClick={() => onDelete(event)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 font-black text-red-500 hover:bg-red-100"
            >
              <Trash2 size={16} /> Delete Event
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-400">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-600">{value}</p>
    </div>
  );
}

function EventLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 hover:bg-slate-200"
      onClick={(event) => event.stopPropagation()}
    >
      {href.startsWith("/uploads/") ? <ImageIcon size={12} /> : <LinkIcon size={12} />} {label}
    </a>
  );
}
