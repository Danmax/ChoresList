"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EVENT_TYPE_META, type EventType } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FamilyEvent {
  id: number;
  title: string;
  eventType: EventType;
  date: string;
  endDate?: string | null;
  allDay: boolean;
  recurring: string;
  notes?: string | null;
  color: string;
  icon: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    eventType: "other" as EventType,
    date: "",
    allDay: true,
    recurring: "none",
    notes: "",
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/events?month=${month}&year=${year}`);
    setEvents(await res.json());
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function openNewEvent(dateStr?: string) {
    const d = dateStr ?? `${year}-${String(month).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setForm({ title: "", eventType: "other", date: d, allDay: true, recurring: "none", notes: "" });
    setOpen(true);
  }

  async function saveEvent() {
    if (!form.title || !form.date) { toast.error("Title and date required"); return; }
    const meta = EVENT_TYPE_META[form.eventType];
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        color: meta.color,
        icon: meta.icon,
      }),
    });
    toast.success("Event added!");
    setOpen(false);
    load();
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    toast.success("Event removed");
    load();
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsOnDay(day: number): FamilyEvent[] {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date.startsWith(dateStr));
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.date.startsWith(selectedDate))
    : [];

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
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

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h2 className="text-xl font-black text-slate-800">{MONTHS[month - 1]} {year}</h2>
        <button onClick={nextMonth} className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden mb-6">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-black text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[80px] border-b border-r border-slate-50" />;
            const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsOnDay(day);

            return (
              <div
                key={i}
                className="min-h-[80px] border-b border-r border-slate-50 p-1 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedDate(selectedDate === dateStr ? "" : dateStr)}
              >
                <div className={`text-sm font-black mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-violet-500 text-white" : "text-slate-700"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="text-xs font-bold truncate rounded-md px-1 py-0.5 text-white"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.icon} {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs font-bold text-slate-400">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="mb-6">
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
                <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: e.color + "22" }}
                  >
                    {e.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-800">{e.title}</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      {EVENT_TYPE_META[e.eventType]?.label} {e.recurring !== "none" && `• Repeats ${e.recurring}`}
                    </p>
                    {e.notes && <p className="text-sm text-slate-500 mt-1">{e.notes}</p>}
                  </div>
                  <button onClick={() => deleteEvent(e.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event type legend */}
      <div className="bg-white/70 rounded-3xl p-4 shadow-sm">
        <h3 className="font-black text-slate-700 mb-3 text-sm">Event Types</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-1 text-xs font-bold text-slate-600">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: meta.color }} />
              {meta.icon} {meta.label}
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
          <div className="space-y-4">
            <div>
              <Label className="font-bold">Event Type</Label>
              <Select
                value={form.eventType}
                onValueChange={(v) => setForm((p) => ({ ...p, eventType: v as EventType }))}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.icon} {meta.label}</SelectItem>
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
            <div>
              <Label className="font-bold">Repeats</Label>
              <Select value={form.recurring} onValueChange={(v) => setForm((p) => ({ ...p, recurring: v ?? "none" }))}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
