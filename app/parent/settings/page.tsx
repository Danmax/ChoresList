"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, Save, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIME_ZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "UTC", label: "UTC" },
];

type Settings = {
  name: string;
  timeZone: string;
  parentEmail: string;
  googleCalendarEnabled: boolean;
  googleCalendarId: string;
  googleCalendarSyncAssignments: boolean;
  googleCalendarSyncEvents: boolean;
  emailNotificationsEnabled: boolean;
  emailDailySummary: boolean;
  emailWeeklyReport: boolean;
  privacyShowKidPoints: boolean;
  privacyAllowKidWishlist: boolean;
  privacyStoreCompletionPhotos: boolean;
  privacyAnalyticsOptIn: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  name: "",
  timeZone: "America/New_York",
  parentEmail: "",
  googleCalendarEnabled: false,
  googleCalendarId: "",
  googleCalendarSyncAssignments: false,
  googleCalendarSyncEvents: true,
  emailNotificationsEnabled: true,
  emailDailySummary: false,
  emailWeeklyReport: true,
  privacyShowKidPoints: true,
  privacyAllowKidWishlist: true,
  privacyStoreCompletionPhotos: true,
  privacyAnalyticsOptIn: false,
};

export default function ParentSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/parent/settings");
    if (!res.ok) {
      toast.error("Could not load household settings");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSettings({
      ...DEFAULT_SETTINGS,
      ...data,
      googleCalendarId: data.googleCalendarId ?? "",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save settings");
        return;
      }
      setSettings((previous) => ({ ...previous, ...data, googleCalendarId: data.googleCalendarId ?? "" }));
      toast.success("Settings saved");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    if (!window.confirm("Permanently delete this household account and all family data? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete account");
        setDeleting(false);
        return;
      }
      toast.success("Account deleted");
      router.replace("/parent");
    } catch {
      toast.error("Could not delete account");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parent" className="rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">Household Settings</h1>
            <p className="text-sm font-semibold text-slate-500">{settings.parentEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex w-fit items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
        >
          <Save size={18} /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-800">Family</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Family name</span>
              <input
                value={settings.name}
                onChange={(event) => update("name", event.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-300"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Timezone</span>
              <select
                value={settings.timeZone}
                onChange={(event) => update("timeZone", event.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-300"
              >
                {TIME_ZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>{zone.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-orange-100 p-3 text-orange-600">
              <CalendarDays size={22} />
            </div>
            <h2 className="font-black text-slate-800">Google Calendar</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Enable Google Calendar integration" checked={settings.googleCalendarEnabled} onChange={(value) => update("googleCalendarEnabled", value)} />
            <Toggle label="Sync chore assignments" checked={settings.googleCalendarSyncAssignments} onChange={(value) => update("googleCalendarSyncAssignments", value)} />
            <Toggle label="Sync family calendar events" checked={settings.googleCalendarSyncEvents} onChange={(value) => update("googleCalendarSyncEvents", value)} />
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Google calendar ID</span>
              <input
                value={settings.googleCalendarId}
                onChange={(event) => update("googleCalendarId", event.target.value)}
                placeholder="primary or family-calendar-id"
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-orange-300"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <Mail size={22} />
            </div>
            <h2 className="font-black text-slate-800">Email Notifications</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle label="Enable email notifications" checked={settings.emailNotificationsEnabled} onChange={(value) => update("emailNotificationsEnabled", value)} />
            <Toggle label="Daily summary" checked={settings.emailDailySummary} onChange={(value) => update("emailDailySummary", value)} />
            <Toggle label="Weekly report" checked={settings.emailWeeklyReport} onChange={(value) => update("emailWeeklyReport", value)} />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <Shield size={22} />
            </div>
            <h2 className="font-black text-slate-800">Privacy</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Show points on kid screens" checked={settings.privacyShowKidPoints} onChange={(value) => update("privacyShowKidPoints", value)} />
            <Toggle label="Allow kids to add wish list items" checked={settings.privacyAllowKidWishlist} onChange={(value) => update("privacyAllowKidWishlist", value)} />
            <Toggle label="Store completion photos" checked={settings.privacyStoreCompletionPhotos} onChange={(value) => update("privacyStoreCompletionPhotos", value)} />
            <Toggle label="Opt in to product analytics" checked={settings.privacyAnalyticsOptIn} onChange={(value) => update("privacyAnalyticsOptIn", value)} />
          </div>
        </section>

        <section className="rounded-3xl border-2 border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 text-red-600">
              <Trash2 size={22} />
            </div>
            <div>
              <h2 className="font-black text-red-600">Delete Account</h2>
              <p className="text-sm font-semibold text-slate-500">This permanently removes the household, parents, kids, tasks, points, photos, and settings.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-sm font-bold text-slate-600">Type DELETE to confirm</span>
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-red-100 bg-red-50 px-3 py-2 font-semibold text-red-700 outline-none focus:border-red-300"
              />
            </label>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting || deleteConfirm !== "DELETE"}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-2.5 font-black text-white transition-colors hover:bg-red-600 disabled:opacity-40"
            >
              <Trash2 size={18} /> {deleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-violet-500"
      />
    </label>
  );
}
